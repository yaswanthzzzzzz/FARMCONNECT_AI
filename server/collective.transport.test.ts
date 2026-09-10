import { describe, expect, it } from "vitest";
import type { AggregationCandidate, AggregationPlanContribution } from "@shared/types";
import { estimateCollectiveTransport } from "./services/collectiveTransportService";

function candidate(id: number, distanceKm: number, source: AggregationCandidate["distanceSource"] = "coordinates"): AggregationCandidate {
  return {
    listing: { id, farmerKey: `farmer-${id}`, crop: "Tomatoes", quantityKg: 5000, location: "Pune", city: "Pune", district: "Pune", state: "Maharashtra", minimumPricePerKg: 20, status: "active", createdAt: "2026-09-10T00:00:00.000Z" },
    distanceKm,
    distanceSource: source,
    estimatedIndividualTransportCost: Math.round(distanceKm * 70),
    compatible: true,
    compatibilityReason: "compatible",
    availableQuantityKg: 5000,
  };
}

function contribution(id: number, quantity: number): AggregationPlanContribution {
  return { farmerListingId: id, farmerKey: `farmer-${id}`, contributedQuantityKg: quantity, minimumPricePerKg: 20, distanceKm: 0, estimatedTransportCost: 0, contributionOutcome: quantity * 20, sequence: id };
}

describe("collective transport model", () => {
  it("labels coordinate-based shared transport and exposes cost allocation", () => {
    const result = estimateCollectiveTransport([candidate(1, 10), candidate(2, 20)], [contribution(1, 3000), contribution(2, 2000)]);
    expect(result.method).toBe("coordinate-estimate");
    expect(result.sharedTransportOpportunity).toBe(true);
    expect(result.totalCost).toBeGreaterThan(0);
    expect(result.costAllocation).toHaveLength(2);
  });

  it("labels demo logistics when any distance is demo-mapped", () => {
    const result = estimateCollectiveTransport([candidate(1, 10, "demo-mapping")], [contribution(1, 1000)]);
    expect(result.method).toBe("demo-logistics");
    expect(result.sourceLabel).toBe("Demo logistics estimate");
  });

  it("rejects quantities above configured vehicle capacity", () => {
    expect(() => estimateCollectiveTransport([candidate(1, 10), candidate(2, 20), candidate(3, 30)], [contribution(1, 5000), contribution(2, 5000), contribution(3, 5000)])).toThrow(/capacity/);
  });
});
