import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { createFarmerListingSchema } from "./services/farmerListingService";
import type { TrpcContext } from "./_core/context";

function createContext(): TrpcContext {
  return {
    user: undefined,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("farmer listings", () => {
  it("rejects zero and negative listing values", () => {
    const result = createFarmerListingSchema.safeParse({
      crop: "Tomatoes",
      quantityKg: 0,
      location: "Khed, Pune",
      city: "Pune",
      district: "Pune",
      state: "Maharashtra",
      minimumPricePerKg: -1,
    });

    expect(result.success).toBe(false);
  });

  it("returns farmer listing history through the typed router", async () => {
    const result = await appRouter.createCaller(createContext()).farmer.listings();

    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toMatchObject({ crop: "Tomatoes", status: "active" });
  });
});
