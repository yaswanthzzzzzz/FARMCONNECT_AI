import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
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
import { updateUserRole } from "./db";
import { assertSameOrigin } from "./_core/auth";
import { authenticatePassword, loginCredentialsSchema, registerCredentialsSchema, registerPasswordAccount } from "./services/passwordAuthService";
import { sdk } from "./_core/sdk";
import { demoService } from "./services/demoService";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    register: publicProcedure.input(registerCredentialsSchema).mutation(async ({ ctx, input }) => {
      assertSameOrigin(ctx.req);
      const user = await registerPasswordAccount(input, ctx.req.ip || "unknown");
      const sessionToken = await sdk.createApplicationSession(user.identityKey, { name: user.name || "", expiresInMs: ONE_YEAR_MS });
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...getSessionCookieOptions(ctx.req), maxAge: ONE_YEAR_MS });
      return user;
    }),
    login: publicProcedure.input(loginCredentialsSchema).mutation(async ({ ctx, input }) => {
      assertSameOrigin(ctx.req);
      try {
        const user = await authenticatePassword(input, ctx.req.ip || "unknown");
        const sessionToken = await sdk.createApplicationSession(user.identityKey, { openId: user.openId ?? undefined, name: user.name || "", expiresInMs: ONE_YEAR_MS });
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...getSessionCookieOptions(ctx.req), maxAge: ONE_YEAR_MS });
        return user;
      } catch {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid username or password." });
      }
    }),
    setRole: protectedProcedure.input(z.object({ role: z.enum(["farmer", "buyer"]) })).mutation(async ({ ctx, input }) => {
      await updateUserRole(ctx.user.identityKey, input.role);
      return { ...ctx.user, role: input.role };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  market: router({
    demoSnapshot: publicProcedure.query(() => marketService.getDemoSnapshot()),
  }),
  demo: router({
    explore: publicProcedure.input(z.object({
      farmerIndex: z.number().int().min(0).max(20).default(0),
      buyerIndex: z.number().int().min(0).max(20).default(0),
      farmerQuantity: z.number().int().positive().max(100000).optional(),
      buyerQuantity: z.number().int().positive().max(100000).optional(),
    })).query(({ input }) => demoService.explore(input)),
  }),
  farmer: router({
    listings: protectedProcedure.query(({ ctx }) => farmerListingService.list(ctx.user.identityKey)),
    createListing: protectedProcedure.input(createFarmerListingSchema).mutation(({ ctx, input }) => farmerListingService.create({ ...input, farmerKey: ctx.user.identityKey })),
  }),
  matches: router({
    calculate: protectedProcedure.input(matchRequestSchema).mutation(({ ctx, input }) => matchService.calculate({ ...input, farmerKey: ctx.user.identityKey })),
  }),
  buyer: router({
    requirements: protectedProcedure.query(({ ctx }) => buyerService.listRequirements(ctx.user.identityKey)),
    createRequirement: protectedProcedure.input(createBuyerRequirementSchema).mutation(({ ctx, input }) => buyerService.create({ ...input, buyerKey: ctx.user.identityKey })),
    matches: protectedProcedure.input(z.object({ requirementId: z.number().int().positive() })).query(({ ctx, input }) => buyerService.calculate(input.requirementId, ctx.user.identityKey)),
    aggregationPlans: protectedProcedure.input(z.object({ requirementId: z.number().int().positive(), constraints: aggregationConstraintsSchema.optional() })).query(({ ctx, input }) => aggregationService.evaluateByRequirementId(input.requirementId, ctx.user.identityKey, input.constraints, true)),
    saveAggregationPlan: protectedProcedure.input(z.object({ requirementId: z.number().int().positive(), planIndex: z.number().int().nonnegative().max(4).optional() })).mutation(async ({ ctx, input }) => {
      const evaluation = await aggregationService.evaluateByRequirementId(input.requirementId, ctx.user.identityKey, undefined, false);
      const plan = [evaluation.recommendedPlan, ...evaluation.alternatives.map(alternative => alternative.plan)].filter(Boolean)[input.planIndex ?? 0];
      if (!plan) throw new Error("No calculated aggregation plan is available to save.");
      return aggregationService.persistSelectedPlan(input.requirementId, ctx.user.identityKey, plan);
    }),
  }),
  marketPrices: router({
    reference: publicProcedure.input(marketPriceQuerySchema).query(({ input }) => marketPriceService.getReference(input)),
  }),
});

export type AppRouter = typeof appRouter;
