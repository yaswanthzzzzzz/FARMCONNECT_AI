import { describe, expect, it } from "vitest";
import { validateCoordinates } from "@shared/location";
import type { BuyerRequirementRecord, FarmerListingRecord } from "@shared/types";
import { toPublicFarmerListing } from "./repositories/farmerListingRepository";
import { createFarmerListingSchema } from "./services/farmerListingService";
import { createBuyerRequirementSchema } from "./services/buyerService";
import { estimateDistance } from "./services/distanceService";
import { estimateCollectiveTransport } from "./services/collectiveTransportService";
import { rankBuyerMatches } from "./services/matchingService";

const baseListing: FarmerListingRecord = {
  id: 9,
  farmerKey: "farmer-private",
  crop: "Tomatoes",
  quantityKg: 500,
  location: "Khed, Pune",
  city: "Khed",
  district: "Pune",
  state: "Maharashtra",
  latitude: 18.8333,
  longitude: 73.8833,
  locationSource: "gps",
  minimumPricePerKg: 20,
  status: "active",
  createdAt: "2026-09-10T00:00:00.000Z",
};

const baseRequirement: BuyerRequirementRecord = {
  id: 4,
  buyerKey: "buyer-private",
  crop: "Tomatoes",
  requiredQuantityKg: 500,
  location: "Pune",
  city: "Pune",
  district: "Pune",
  state: "Maharashtra",
  latitude: 18.5204,
  longitude: 73.8567,
  locationSource: "gps",
  offeredPricePerKg: 24,
  status: "active",
  createdAt: "2026-09-10T00:00:00.000Z",
};

describe("Phase 6 location intelligence", () => {
  it("validates coordinates and rejects invalid ranges", () => {
    expect(validateCoordinates({ latitude: 18.52, longitude: 73.86 })).toEqual({ latitude: 18.52, longitude: 73.86 });
    expect(() => validateCoordinates({ latitude: 91, longitude: 73 })).toThrow(/geographic range/);
    expect(() => validateCoordinates({ latitude: 18, longitude: -181 })).toThrow(/geographic range/);
  });

  it("accepts GPS coordinates only as a complete validated pair", () => {
    expect(createFarmerListingSchema.safeParse({ ...baseListing, id: undefined, farmerKey: undefined, latitude: 18, longitude: 73, locationSource: "gps" }).success).toBe(true);
    expect(createFarmerListingSchema.safeParse({ crop: "Tomatoes", quantityKg: 500, location: "Pune", city: "Pune", district: "Pune", state: "Maharashtra", latitude: 18, locationSource: "gps", minimumPricePerKg: 20 }).success).toBe(false);
    expect(createBuyerRequirementSchema.safeParse({ crop: "Tomatoes", requiredQuantityKg: 500, location: "Pune", city: "Pune", district: "Pune", state: "Maharashtra", latitude: 18, longitude: 73, locationSource: "gps", offeredPricePerKg: 24 }).success).toBe(true);
  });

  it("prioritizes explicit coordinates, then mapping, then unavailable", () => {
    const coordinateDistance = estimateDistance(baseListing, baseRequirement);
    expect(coordinateDistance.source).toBe("coordinates");
    expect(coordinateDistance.sourceLabel).toBe("Distance based on GPS coordinates");

    const mappedDistance = estimateDistance({ city: "Khed", district: "Pune", state: "Maharashtra" }, { city: "Pune", district: "Pune", state: "Maharashtra" });
    expect(mappedDistance.source).toBe("demo-mapping");
    expect(mappedDistance.sourceLabel).toBe("Distance estimated from location mapping");

    const unavailable = estimateDistance({ city: "Unknown village", district: "Unknown", state: "Maharashtra" }, { city: "Another village", district: "Unknown", state: "Maharashtra" });
    expect(unavailable.source).toBe("unavailable");
    expect(unavailable.sourceLabel).toBe("Distance unavailable");
  });

  it("strips exact farmer coordinates from public listing responses", () => {
    const publicListing = toPublicFarmerListing(baseListing);
    expect(publicListing).not.toHaveProperty("latitude");
    expect(publicListing).not.toHaveProperty("longitude");
    expect(publicListing.locationSource).toBe("gps");
  });

  it("feeds coordinate distance into existing deterministic matching", () => {
    const result = rankBuyerMatches(baseListing, [{ id: "buyer", name: "Buyer", buyerType: "wholesaler", location: { city: "Pune", district: "Pune", state: "Maharashtra", latitude: 18.5204, longitude: 73.8567 }, requiredCrop: "Tomatoes", requiredQuantityKg: 500, offeredPricePerKg: 24, verified: true, initials: "B" }]);
    expect(result[0]?.distance.source).toBe("coordinates");
    expect(result[0]?.distance.distanceKm).toBeGreaterThan(0);
  });

  it("labels transport unavailable without claiming a route or price", () => {
    const result = estimateCollectiveTransport([{ listing: baseListing, distanceKm: 10_000, distanceSource: "unavailable", estimatedIndividualTransportCost: 0, compatible: true, compatibilityReason: "", availableQuantityKg: 500 }], [{ farmerListingId: baseListing.id, farmerKey: baseListing.farmerKey, contributedQuantityKg: 500, minimumPricePerKg: 20, distanceKm: 10_000, estimatedTransportCost: 0, contributionOutcome: 10_000, sequence: 1 }]);
    expect(result.method).toBe("unavailable");
    expect(result.sourceLabel).toBe("Distance unavailable");
    expect(result.totalCost).toBe(0);
  });
});
