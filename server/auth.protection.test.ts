import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const anonymousContext: TrpcContext = {
  user: null,
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
};

const authenticatedContext: TrpcContext = {
  user: {
    id: 7,
    openId: "new-google-user",
    name: "New Google User",
    email: "new@example.com",
    loginMethod: "google",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
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

  it("allows an authenticated account to select a persistent workspace role", async () => {
    const caller = appRouter.createCaller(authenticatedContext);
    const farmer = await caller.auth.setRole({ role: "farmer" });
    expect(farmer.openId).toBe("new-google-user");
    expect(farmer.role).toBe("farmer");
  });
});
