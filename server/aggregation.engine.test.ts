import { describe, expect, it } from "vitest";
import type { AggregationCandidate, BuyerRequirement } from "@shared/types";
import { evaluateAggregation, filterAggregationCandidates } from "./services/aggregationEngine";
import { estimateCollectiveTransport } from "./services/collectiveTransportService";

const requirement: BuyerRequirement = {
  id: 99,
  buyerKey: "buyer-test",
  crop: "Tomatoes",
  requiredQuantityKg: 10000,
  location: "Pimpri-Chinchwad, Maharashtra",
  city: "Pimpri-Chinchwad",
  district: "Pune",
  state: "Maharashtra",
  offeredPricePerKg: 24,
  status: "active",
  createdAt: "2026-09-10T00:00:00.000Z",
};

function candidate(id: number, quantityKg: number, overrides: Partial<AggregationCandidate["listing"]> = {}, distanceKm = 10): AggregationCandidate {
  const listing = { id, farmerKey: `farmer-${id}`, crop: "Tomatoes" as const, quantityKg, location: "Pune", city: "Pune", district: "Pune", state: "Maharashtra", minimumPricePerKg: 20, status: "active" as const, createdAt: "2026-09-10T00:00:00.000Z", ...overrides };
  return { listing, distanceKm, distanceSource: "coordinates", estimatedIndividualTransportCost: distanceKm * 70, compatible: true, compatibilityReason: "compatible", availableQuantityKg: quantityKg };
}

function plans(candidates: AggregationCandidate[], constraints = {}) {
  return evaluateAggregation({ requirement, candidates, constraints, transportFor: estimateCollectiveTransport });
}

describe("deterministic aggregation engine", () => {
  it("filters crop, inactive, zero-quantity, price-incompatible and distant listings", () => {
    const result = filterAggregationCandidates([
      candidate(1, 1000),
      candidate(2, 1000, { crop: "Onions" }),
      candidate(3, 0),
      candidate(4, 1000, { status: "archived" }),
      candidate(5, 1000, { minimumPricePerKg: 25 }),
      candidate(6, 1000, {}, 600),
    ], requirement);
    expect(result.map(item => item.listing.id)).toEqual([1]);
  });

  it("finds exact full fulfilment across multiple farmers without overfill", () => {
    const result = plans([candidate(1, 700), candidate(2, 1000), candidate(3, 2500), candidate(4, 3000), candidate(5, 2800)]);
    expect(result[0]).toMatchObject({ fulfilmentType: "full", plannedQuantityKg: 10000, remainingQuantityKg: 0, fulfilmentPercent: 100, contributingFarmerCount: 5, unnecessaryOverfillKg: 0 });
    expect(result[0]?.contributions.reduce((sum, item) => sum + item.contributedQuantityKg, 0)).toBe(10000);
  });

  it("returns a clearly partial plan when full fulfilment is impossible", () => {
    const result = plans([candidate(1, 2500), candidate(2, 1900), candidate(3, 2000)]);
    expect(result[0]).toMatchObject({ fulfilmentType: "partial", plannedQuantityKg: 6400, remainingQuantityKg: 3600, fulfilmentPercent: 64 });
  });

  it("prefers better net outcome over a higher nominal price when logistics are worse", () => {
    const result = plans([candidate(1, 6000, { minimumPricePerKg: 20 }, 5), candidate(2, 6000, { minimumPricePerKg: 23 }, 100)]);
    expect(result[0]?.contributions.map(item => item.farmerListingId)).toContain(1);
    expect(result[0]?.estimatedNetOutcome).toBeGreaterThan(result[1]?.estimatedNetOutcome ?? -Infinity);
  });

  it("keeps stable listing-id ordering on identical plans and honors combination limits", () => {
    const input = [candidate(1, 1000), candidate(2, 1000), candidate(3, 1000), candidate(4, 1000)];
    const first = plans(input, { maxCombinations: 2 });
    const second = plans(input, { maxCombinations: 2 });
    expect(first).toEqual(second);
    expect(first.length).toBeGreaterThan(0);
  });

  it("rejects invalid buyer quantity and price", () => {
    expect(() => evaluateAggregation({ requirement: { ...requirement, requiredQuantityKg: 0 }, candidates: [], transportFor: estimateCollectiveTransport })).toThrow();
    expect(() => evaluateAggregation({ requirement: { ...requirement, offeredPricePerKg: -1 }, candidates: [], transportFor: estimateCollectiveTransport })).toThrow();
  });
});
