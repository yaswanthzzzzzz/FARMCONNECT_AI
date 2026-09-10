import { describe, expect, it } from "vitest";
import { demoBuyers } from "@shared/demoData";
import type { FarmerListing } from "@shared/types";
import { estimateDistance, haversineDistanceKm } from "./services/distanceService";
import { calculateGrossRevenue, calculateMatchScore, calculateMatchedQuantity, rankBuyerMatches } from "./services/matchingService";
import { demoTransportConfig, estimateTransportCost } from "./services/transportService";

const tomatoListing: FarmerListing = {
  id: 42,
  farmerKey: "demo-farmer-krishna",
  crop: "Tomatoes",
  quantityKg: 850,
  location: "Khed, Pune",
  city: "Khed",
  district: "Pune",
  state: "Maharashtra",
  minimumPricePerKg: 22,
  status: "active",
  createdAt: "2026-09-01T08:00:00.000Z",
};

describe("deterministic matching engine", () => {
  it("calculates geographic distance and same-location zero distance", () => {
    expect(haversineDistanceKm({ latitude: 18.52, longitude: 73.85 }, { latitude: 18.52, longitude: 73.85 })).toBe(0);
    const estimate = estimateDistance({ city: "Khed", district: "Pune", state: "Maharashtra" }, demoBuyers[0].location);
    expect(estimate.distanceKm).toBeGreaterThan(0);
    expect(estimate.source).toBe("demo-mapping");
    expect(estimate.isEstimate).toBe(true);
  });

  it("calculates transport, matched quantity, gross revenue, and net outcome deterministically", () => {
    expect(calculateMatchedQuantity(850, 1000)).toBe(850);
    expect(calculateMatchedQuantity(850, 600)).toBe(600);
    expect(calculateGrossRevenue(850, 24)).toBe(20400);
    expect(estimateTransportCost(10, demoTransportConfig)).toBe(700);
    expect(20400 - estimateTransportCost(10, demoTransportConfig)).toBe(19700);
  });

  it("keeps scoring transparent and bounded", () => {
    const score = calculateMatchScore({ netOutcome: 1000, maxNetOutcome: 1000, offeredPrice: 24, maxOfferedPrice: 26, quantityFulfillmentPercent: 100, distanceKm: 10, maxDistanceKm: 100 });
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("ranks the nearby buyer above the higher-price distant buyer by estimated net outcome", () => {
    const matches = rankBuyerMatches(tomatoListing, demoBuyers);
    expect(matches.length).toBe(2);
    expect(matches[0]?.buyer.id).toBe("buyer-sahyadri");
    expect(matches[0]?.buyer.offeredPricePerKg).toBe(24);
    expect(matches[1]?.buyer.offeredPricePerKg).toBe(26);
    expect(matches[0]!.estimatedNetOutcome).toBeGreaterThan(matches[1]!.estimatedNetOutcome);
    expect(matches[0]!.explanationData.tradeoffNote).toContain("offers ₹26/kg");
  });

  it("returns no match when crop or minimum price is incompatible", () => {
    const tooExpensive: FarmerListing = { ...tomatoListing, minimumPricePerKg: 30 };
    expect(rankBuyerMatches(tooExpensive, demoBuyers)).toHaveLength(0);
    const otherCrop: FarmerListing = { ...tomatoListing, crop: "Rice" };
    expect(rankBuyerMatches(otherCrop, demoBuyers)).toHaveLength(0);
  });
});
