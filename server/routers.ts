import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { farmerListingService, createFarmerListingSchema } from "./services/farmerListingService";
import { marketService } from "./services/marketService";
import { matchRequestSchema, matchService } from "./services/matchService";
import { createBuyerRequirementSchema, buyerService } from "./services/buyerService";
import { marketPriceQuerySchema, marketPriceService } from "./services/marketPriceService";
import { aggregationService } from "./services/aggregationService";
import { aggregationConstraintsSchema } from "./routes/aggregationRoutes";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  market: router({
    demoSnapshot: publicProcedure.query(() => marketService.getDemoSnapshot()),
  }),
  farmer: router({
    listings: protectedProcedure.query(({ ctx }) => farmerListingService.list(ctx.user.openId)),
    createListing: protectedProcedure.input(createFarmerListingSchema).mutation(({ ctx, input }) => farmerListingService.create({ ...input, farmerKey: ctx.user.openId })),
  }),
  matches: router({
    calculate: protectedProcedure.input(matchRequestSchema).mutation(({ ctx, input }) => matchService.calculate({ ...input, farmerKey: ctx.user.openId })),
  }),
  buyer: router({
    requirements: protectedProcedure.query(({ ctx }) => buyerService.listRequirements(ctx.user.openId)),
    createRequirement: protectedProcedure.input(createBuyerRequirementSchema).mutation(({ ctx, input }) => buyerService.create({ ...input, buyerKey: ctx.user.openId })),
    matches: protectedProcedure.input(z.object({ requirementId: z.number().int().positive() })).query(({ ctx, input }) => buyerService.calculate(input.requirementId, ctx.user.openId)),
    aggregationPlans: protectedProcedure.input(z.object({ requirementId: z.number().int().positive(), constraints: aggregationConstraintsSchema.optional() })).query(({ ctx, input }) => aggregationService.evaluateByRequirementId(input.requirementId, ctx.user.openId, input.constraints, true)),
    saveAggregationPlan: protectedProcedure.input(z.object({ requirementId: z.number().int().positive(), planIndex: z.number().int().nonnegative().max(4).optional() })).mutation(async ({ ctx, input }) => {
      const evaluation = await aggregationService.evaluateByRequirementId(input.requirementId, ctx.user.openId, undefined, false);
      const plan = [evaluation.recommendedPlan, ...evaluation.alternatives.map(alternative => alternative.plan)].filter(Boolean)[input.planIndex ?? 0];
      if (!plan) throw new Error("No calculated aggregation plan is available to save.");
      return aggregationService.persistSelectedPlan(input.requirementId, ctx.user.openId, plan);
    }),
  }),
  marketPrices: router({
    reference: publicProcedure.input(marketPriceQuerySchema).query(({ input }) => marketPriceService.getReference(input)),
  }),
});

export type AppRouter = typeof appRouter;
