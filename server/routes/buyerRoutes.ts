import type { Express, Request, Response } from "express";
import { createBuyerRequirementSchema, buyerService } from "../services/buyerService";
import { requireAuthenticatedUser } from "../_core/auth";

function numeric(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) return Number(value);
  return value;
}

function payloadFromRequest(req: Request) {
  return { ...req.body, requiredQuantityKg: numeric(req.body?.requiredQuantityKg), offeredPricePerKg: numeric(req.body?.offeredPricePerKg) };
}

export function registerBuyerRoutes(app: Express) {
  app.get("/api/buyers/requirements", async (req, res, next) => {
    try {
      const user = await requireAuthenticatedUser(req);
      res.json({ requirements: await buyerService.listRequirements(user.openId) });
    } catch (error) { next(error); }
  });

  app.post("/api/buyers/requirements", async (req: Request, res: Response, next) => {
    try {
      const user = await requireAuthenticatedUser(req);
      const parsed = createBuyerRequirementSchema.safeParse(payloadFromRequest(req));
      if (!parsed.success) {
        res.status(400).json({ code: "VALIDATION_ERROR", message: "Please correct the highlighted requirement fields.", issues: parsed.error.issues.map(issue => ({ path: issue.path, message: issue.message })) });
        return;
      }
      res.status(201).json({ requirement: await buyerService.create({ ...parsed.data, buyerKey: user.openId }) });
    } catch (error) { next(error); }
  });

  app.get("/api/buyers/requirements/:id/matches", async (req, res, next) => {
    try {
      const user = await requireAuthenticatedUser(req);
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ code: "VALIDATION_ERROR", message: "Requirement id must be a positive integer." }); return; }
      res.json(await buyerService.calculate(id, user.openId));
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) { res.status(404).json({ code: "REQUIREMENT_NOT_FOUND", message: error.message }); return; }
      next(error);
    }
  });
}
