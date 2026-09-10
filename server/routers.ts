import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { farmerListingService, createFarmerListingSchema } from "./services/farmerListingService";
import { marketService } from "./services/marketService";
import { matchRequestSchema, matchService } from "./services/matchService";
import { createBuyerRequirementSchema, buyerService } from "./services/buyerService";
import { marketPriceQuerySchema, marketPriceService } from "./services/marketPriceService";

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
    listings: publicProcedure.input(z.object({ farmerKey: z.string().optional() }).optional()).query(({ input }) => farmerListingService.list(input?.farmerKey)),
    createListing: publicProcedure.input(createFarmerListingSchema).mutation(({ input }) => farmerListingService.create(input)),
  }),
  matches: router({
    calculate: publicProcedure.input(matchRequestSchema).mutation(({ input }) => matchService.calculate(input)),
  }),
  buyer: router({
    requirements: publicProcedure.input(z.object({ buyerKey: z.string().optional() }).optional()).query(({ input }) => buyerService.listRequirements(input?.buyerKey)),
    createRequirement: publicProcedure.input(createBuyerRequirementSchema).mutation(({ input }) => buyerService.create(input)),
    matches: publicProcedure.input(z.object({ requirementId: z.number().int().positive(), buyerKey: z.string().optional() })).query(({ input }) => buyerService.calculate(input.requirementId, input.buyerKey)),
  }),
  marketPrices: router({
    reference: publicProcedure.input(marketPriceQuerySchema).query(({ input }) => marketPriceService.getReference(input)),
  }),
});

export type AppRouter = typeof appRouter;
