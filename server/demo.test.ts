import { describe, expect, it } from "vitest";
import { demoService } from "./services/demoService";

describe("guest demo calculations", () => {
  it("returns deterministic farmer matches, estimates, and aggregation without a database", async () => {
    const result = await demoService.explore({ farmerIndex: 0, buyerIndex: 0, farmerQuantity: 850, buyerQuantity: 1000 });
    expect(result.selectedFarmer?.name).toBe("Krishna Patil");
    expect(result.selectedBuyer?.name).toBe("Sahyadri Fresh Markets");
    expect(result.matches.matches.length).toBeGreaterThan(0);
    expect(result.matches.matches[0]?.distance.source).toBe("coordinates");
    expect(result.matches.matches[0]?.estimatedTransportCost).toBeGreaterThan(0);
    expect(result.aggregation.recommendedPlan?.plannedQuantityKg).toBe(850);
    expect(result.aggregation.recommendedPlan?.contributions[0]?.farmerKey).toBe("farmer-krishna");
    expect(result.aggregation.marketReference?.status).toBe("demo");
  });

  it("supports temporary quantity changes and crop-specific buyer views", async () => {
    const result = await demoService.explore({ farmerIndex: 1, buyerIndex: 2, farmerQuantity: 1500, buyerQuantity: 1800 });
    expect(result.requirement.crop).toBe("Onions");
    expect(result.requirement.requiredQuantityKg).toBe(1800);
    expect(result.listing.quantityKg).toBe(1500);
    expect(result.supply.some(item => item.compatible && item.farmer.name === "Sunita Devi")).toBe(true);
    expect(result.snapshot.lastUpdatedLabel).toContain("deterministic");
  });
});
