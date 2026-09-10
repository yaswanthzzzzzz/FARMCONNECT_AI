import type { Express, Request, Response } from "express";
import { z } from "zod";
import type { AggregationConstraints } from "@shared/types";
import { aggregationService } from "../services/aggregationService";
import { requireAuthenticatedUser } from "../_core/auth";

export const aggregationConstraintsSchema = z.object({
  maxCandidates: z.number().int().positive().max(24).optional(),
  maxCombinations: z.number().int().positive().max(10000).optional(),
  maxContributingFarmers: z.number().int().positive().max(24).optional(),
  maxDistanceKm: z.number().finite().nonnegative().max(5000).optional(),
  minimumFulfilmentPercent: z.number().finite().min(0).max(100).optional(),
  allowPartial: z.boolean().optional(),
  quantityStepKg: z.number().int().positive().max(1000).optional(),
}) satisfies z.ZodType<AggregationConstraints>;

const buyerKeySchema = z.string().min(1).max(128).optional();

function numeric(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) return Number(value);
  return value;
}

function parseConstraints(value: unknown) {
  const parsed = aggregationConstraintsSchema.safeParse(value ?? {});
  if (!parsed.success) return undefined;
  return Object.fromEntries(Object.entries(parsed.data).filter(([, item]) => item !== undefined)) as AggregationConstraints;
}

export function registerAggregationRoutes(app: Express) {
  app.get("/api/buyers/requirements/:id/aggregation-plans", async (req: Request, res: Response, next) => {
    try {
      const user = await requireAuthenticatedUser(req);
      const requirementId = Number(req.params.id);
      if (!Number.isInteger(requirementId) || requirementId <= 0) {
        res.status(400).json({ code: "VALIDATION_ERROR", message: "Requirement id must be a positive integer." });
        return;
      }
      const constraints = parseConstraints({
        maxCandidates: numeric(req.query.maxCandidates),
        maxCombinations: numeric(req.query.maxCombinations),
        maxContributingFarmers: numeric(req.query.maxContributingFarmers),
        maxDistanceKm: numeric(req.query.maxDistanceKm),
      });
      res.json(await aggregationService.evaluateByRequirementId(requirementId, user.openId, constraints, true));
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        res.status(404).json({ code: "REQUIREMENT_NOT_FOUND", message: error.message });
        return;
      }
      next(error);
    }
  });

  app.post("/api/aggregation/evaluate", async (req: Request, res: Response, next) => {
    try {
      const user = await requireAuthenticatedUser(req);
      const parsed = z.object({ requirementId: z.number().int().positive(), buyerKey: z.string().min(1).max(128).optional(), constraints: aggregationConstraintsSchema.optional() }).safeParse({ ...req.body, requirementId: numeric(req.body?.requirementId) });
      if (!parsed.success) {
        res.status(400).json({ code: "VALIDATION_ERROR", message: "Provide a valid buyer requirement and aggregation constraints.", issues: parsed.error.issues.map(issue => ({ path: issue.path, message: issue.message })) });
        return;
      }
      res.json(await aggregationService.evaluateByRequirementId(parsed.data.requirementId, user.openId, parsed.data.constraints, true));
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        res.status(404).json({ code: "REQUIREMENT_NOT_FOUND", message: error.message });
        return;
      }
      next(error);
    }
  });

  app.post("/api/buyers/requirements/:id/aggregation-plans", async (req: Request, res: Response, next) => {
    try {
      const user = await requireAuthenticatedUser(req);
      const requirementId = Number(req.params.id);
      const parsed = z.object({ buyerKey: z.string().min(1).max(128).optional(), planIndex: z.number().int().nonnegative().max(4).optional() }).safeParse({ ...req.body, planIndex: req.body?.planIndex === undefined ? undefined : numeric(req.body.planIndex) });
      if (!Number.isInteger(requirementId) || requirementId <= 0 || !parsed.success) {
        res.status(400).json({ code: "VALIDATION_ERROR", message: "Provide a valid requirement id and optional plan index." });
        return;
      }
      const evaluation = await aggregationService.evaluateByRequirementId(requirementId, user.openId, undefined, false);
      const plan = [evaluation.recommendedPlan, ...evaluation.alternatives.map(alternative => alternative.plan)].filter(Boolean)[parsed.data.planIndex ?? 0];
      if (!plan) {
        res.status(422).json({ code: "NO_PLAN", message: "No calculated aggregation plan is available to save." });
        return;
      }
      const saved = await aggregationService.persistSelectedPlan(requirementId, user.openId, plan);
      res.status(201).json({ plan: saved, message: "Calculated plan saved as proposed. No farmer acceptance is implied." });
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        res.status(404).json({ code: "REQUIREMENT_NOT_FOUND", message: error.message });
        return;
      }
      next(error);
    }
  });

  app.get("/api/aggregation/plans/:id", async (req: Request, res: Response, next) => {
    try {
      const user = await requireAuthenticatedUser(req);
      const planId = Number(req.params.id);
      if (!Number.isInteger(planId) || planId <= 0) {
        res.status(400).json({ code: "VALIDATION_ERROR", message: "Plan id must be a positive integer." });
        return;
      }
      const plan = await aggregationService.getSavedPlan(planId, user.openId);
      if (!plan) {
        res.status(404).json({ code: "PLAN_NOT_FOUND", message: "Aggregation plan was not found." });
        return;
      }
      res.json({ plan });
    } catch (error) { next(error); }
  });
}
