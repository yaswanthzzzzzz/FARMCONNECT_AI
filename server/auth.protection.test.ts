import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const anonymousContext: TrpcContext = {
  user: null,
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
};

describe("authenticated workspace procedures", () => {
  it("reject anonymous farmer and buyer workspace reads", async () => {
    const caller = appRouter.createCaller(anonymousContext);
    await expect(caller.farmer.listings()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.buyer.requirements()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("reject anonymous matching and aggregation operations", async () => {
    const caller = appRouter.createCaller(anonymousContext);
    await expect(caller.matches.calculate({ listingId: 1 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.buyer.matches({ requirementId: 1 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.buyer.aggregationPlans({ requirementId: 1 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
