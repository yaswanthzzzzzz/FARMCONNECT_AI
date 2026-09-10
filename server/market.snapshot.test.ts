import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(): TrpcContext {
  return {
    user: undefined,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("market.demoSnapshot", () => {
  it("returns shared demo farmers, buyers, and supported crops", async () => {
    const result = await appRouter.createCaller(createContext()).market.demoSnapshot();

    expect(result.farmers.length).toBeGreaterThan(0);
    expect(result.buyers.length).toBeGreaterThan(0);
    expect(result.supportedCrops).toContain("Tomatoes");
    expect(result.lastUpdatedLabel).toContain("Demo data");
  });
});
