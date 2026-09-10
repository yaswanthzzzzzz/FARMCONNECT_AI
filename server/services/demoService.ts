import { demoBuyers, demoFarmers } from "@shared/demoData";
import type { BuyerRequirementRecord, FarmerListingRecord } from "@shared/types";
import { estimateDistance } from "./distanceService";
import { estimateTransportCost, demoTransportConfig } from "./transportService";
import { buildMatchResponse } from "./matchingService";
import { evaluateAggregation } from "./aggregationEngine";
import { estimateCollectiveTransport } from "./collectiveTransportService";
import { marketPriceService } from "./marketPriceService";

const demoNow = "2026-01-01T00:00:00.000Z";

function farmerListing(index: number, quantityOverride?: number): FarmerListingRecord {
  const farmer = demoFarmers[index] ?? demoFarmers[0]!;
  return {
    id: 1000 + index,
    farmerKey: farmer.id,
    crop: farmer.primaryCrop,
    quantityKg: quantityOverride ?? farmer.availableQuantityKg,
    location: `${farmer.village}, ${farmer.location.city}, ${farmer.location.state}`,
    city: farmer.location.city,
    district: farmer.location.district,
    state: farmer.location.state,
    latitude: farmer.location.latitude,
    longitude: farmer.location.longitude,
    locationSource: "demo",
    minimumPricePerKg: farmer.expectedPricePerKg,
    status: "active",
    createdAt: demoNow,
  };
}

function buyerRequirement(index: number, quantityOverride?: number): BuyerRequirementRecord {
  const buyer = demoBuyers[index] ?? demoBuyers[0]!;
  return {
    id: 2000 + index,
    buyerKey: buyer.id,
    crop: buyer.requiredCrop,
    requiredQuantityKg: quantityOverride ?? buyer.requiredQuantityKg,
    location: `${buyer.location.city}, ${buyer.location.state}`,
    city: buyer.location.city,
    district: buyer.location.district,
    state: buyer.location.state,
    latitude: buyer.location.latitude,
    longitude: buyer.location.longitude,
    locationSource: "demo",
    offeredPricePerKg: buyer.offeredPricePerKg,
    status: "active",
    createdAt: demoNow,
  };
}

function buildCandidates(requirement: BuyerRequirementRecord) {
  return demoFarmers.map((_, index) => {
    const listing = farmerListing(index);
    const distance = estimateDistance({ city: listing.city, district: listing.district, state: listing.state, latitude: listing.latitude, longitude: listing.longitude }, { city: requirement.city, district: requirement.district, state: requirement.state, latitude: requirement.latitude, longitude: requirement.longitude });
    const compatible = listing.crop === requirement.crop && listing.minimumPricePerKg <= requirement.offeredPricePerKg;
    return {
      listing,
      distanceKm: distance.distanceKm,
      distanceSource: distance.source,
      estimatedIndividualTransportCost: distance.source === "unavailable" ? 0 : estimateTransportCost(distance.distanceKm, demoTransportConfig),
      compatible,
      compatibilityReason: compatible ? "Crop, price and location are compatible in demo data." : listing.crop !== requirement.crop ? `Crop mismatch: listing offers ${listing.crop}.` : `Farmer minimum is ₹${listing.minimumPricePerKg}/kg.`,
      availableQuantityKg: listing.quantityKg,
    };
  });
}

export const demoService = {
  async explore(input: { farmerIndex: number; buyerIndex: number; farmerQuantity?: number; buyerQuantity?: number }) {
    const farmerIndex = Math.max(0, Math.min(demoFarmers.length - 1, input.farmerIndex));
    const buyerIndex = Math.max(0, Math.min(demoBuyers.length - 1, input.buyerIndex));
    const listing = farmerListing(farmerIndex, input.farmerQuantity);
    const requirement = buyerRequirement(buyerIndex, input.buyerQuantity);
    const matches = buildMatchResponse(listing, demoBuyers);
    const supply = demoFarmers.map((farmer, index) => {
      const candidate = buildCandidates(requirement)[index]!;
      const matchedQuantityKg = candidate.compatible ? Math.min(candidate.availableQuantityKg, requirement.requiredQuantityKg) : 0;
      return {
        farmer,
        compatible: candidate.compatible,
        distanceKm: candidate.distanceKm,
        distanceSource: candidate.distanceSource,
        estimatedTransportCost: candidate.estimatedIndividualTransportCost,
        availableQuantityKg: candidate.availableQuantityKg,
        matchedQuantityKg,
        expectedPricePerKg: candidate.listing.minimumPricePerKg,
        potentialAggregation: candidate.compatible && matchedQuantityKg < requirement.requiredQuantityKg,
        compatibilityReason: candidate.compatibilityReason,
      };
    });
    const marketReference = await marketPriceService.getReference({ crop: requirement.crop, location: requirement.location });
    const candidates = buildCandidates(requirement);
    const plans = evaluateAggregation({ requirement, candidates, marketReference, transportFor: estimateCollectiveTransport });
    const recommendedPlan = plans[0];
    return {
      snapshot: { farmers: demoFarmers, buyers: demoBuyers, supportedCrops: ["Tomatoes", "Onions", "Potatoes", "Wheat", "Rice"] as const, lastUpdatedLabel: "Demo data · deterministic walkthrough" },
      selectedFarmer: demoFarmers[farmerIndex],
      selectedBuyer: demoBuyers[buyerIndex],
      listing: matches.listing,
      requirement,
      matches,
      supply,
      aggregation: { recommendedPlan, alternatives: plans.slice(1), candidateCount: candidates.filter(candidate => candidate.compatible).length, marketReference },
      transportConfig: demoTransportConfig,
    };
  },
};
