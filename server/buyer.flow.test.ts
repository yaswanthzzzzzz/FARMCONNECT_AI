import { describe, expect, it } from "vitest";
import { demoFarmers } from "@shared/demoData";
import type { BuyerRequirement } from "@shared/types";
import { calculateBuyerMatches, createBuyerRequirementSchema } from "./services/buyerService";

const requirement: BuyerRequirement = {
  id: 10,
  buyerKey: "demo-buyer-sahyadri",
  crop: "Tomatoes",
  requiredQuantityKg: 1000,
  location: "Pimpri-Chinchwad, Maharashtra",
  city: "Pimpri-Chinchwad",
  district: "Pune",
  state: "Maharashtra",
  offeredPricePerKg: 24,
  status: "active",
  createdAt: "2026-09-09T00:00:00.000Z",
};

describe("buyer flow", () => {
  it("finds compatible farmer supply and surfaces partial fulfilment aggregation", () => {
    const result = calculateBuyerMatches(requirement, demoFarmers);
    expect(result.matches).toHaveLength(3);
    expect(result.matches[0]?.farmer.id).toBe("farmer-krishna");
    expect(result.matches[0]?.compatible).toBe(true);
    expect(result.matches[0]?.matchedQuantityKg).toBe(850);
    expect(result.totalCompatibleSupplyKg).toBe(850);
    expect(result.aggregationAvailable).toBe(true);
  });

  it("rejects invalid buyer requirement input", () => {
    const result = createBuyerRequirementSchema.safeParse({ crop: "Tomatoes", requiredQuantityKg: 0, location: "Pune", city: "Pune", district: "Pune", state: "Maharashtra", offeredPricePerKg: -1 });
    expect(result.success).toBe(false);
  });
});
