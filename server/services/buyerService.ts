import { z } from "zod";
import type { BuyerMatchResponse, BuyerRequirement, BuyerSupplyMatch, CreateBuyerRequirementInput, FarmerProfile } from "@shared/types";
import { marketRepository } from "../repositories/marketRepository";
import { buyerRequirementRepository } from "../repositories/buyerRequirementRepository";
import { estimateDistance } from "./distanceService";
import { estimateTransportCost, demoTransportConfig } from "./transportService";

const cropValues = ["Tomatoes", "Onions", "Potatoes", "Wheat", "Rice"] as const;

export const createBuyerRequirementSchema = z.object({
  buyerKey: z.string().min(1).optional(),
  crop: z.enum(cropValues),
  requiredQuantityKg: z.number().int().positive().max(1000000),
  location: z.string().trim().min(2).max(255),
  city: z.string().trim().min(2).max(128),
  district: z.string().trim().min(2).max(128),
  state: z.string().trim().min(2).max(128),
  offeredPricePerKg: z.number().int().positive().max(100000),
});

export function parseBuyerLocation(location: string, city: string, district: string, state: string) {
  void location;
  return { city, district, state };
}

function buildSupplyMatch(requirement: BuyerRequirement, farmer: FarmerProfile): BuyerSupplyMatch {
  const distance = estimateDistance(parseBuyerLocation(requirement.location, requirement.city, requirement.district, requirement.state), farmer.location);
  const compatible = farmer.primaryCrop === requirement.crop && farmer.expectedPricePerKg <= requirement.offeredPricePerKg;
  const matchedQuantityKg = compatible ? Math.min(farmer.availableQuantityKg, requirement.requiredQuantityKg) : 0;
  const estimatedTransportCost = estimateTransportCost(distance.distanceKm, demoTransportConfig);
  const compatibilityReason = farmer.primaryCrop !== requirement.crop
    ? `Crop mismatch: farmer offers ${farmer.primaryCrop}.`
    : farmer.expectedPricePerKg > requirement.offeredPricePerKg
      ? `Price gap: farmer expects ₹${farmer.expectedPricePerKg}/kg.`
      : `${matchedQuantityKg.toLocaleString()} kg can contribute at the offered price.`;
  return { farmer, compatible, distanceKm: distance.distanceKm, distanceSource: distance.source, estimatedTransportCost, availableQuantityKg: farmer.availableQuantityKg, matchedQuantityKg, expectedPricePerKg: farmer.expectedPricePerKg, potentialAggregation: compatible && farmer.availableQuantityKg < requirement.requiredQuantityKg, compatibilityReason };
}

export function calculateBuyerMatches(requirement: BuyerRequirement, farmers: FarmerProfile[]): BuyerMatchResponse {
  const matches = farmers.map(farmer => buildSupplyMatch(requirement, farmer)).sort((a, b) => Number(b.compatible) - Number(a.compatible) || b.matchedQuantityKg - a.matchedQuantityKg || a.distanceKm - b.distanceKm);
  const compatibleMatches = matches.filter(match => match.compatible);
  const totalCompatibleSupplyKg = compatibleMatches.reduce((sum, match) => sum + match.availableQuantityKg, 0);
  const aggregationAvailable = compatibleMatches.length > 1 || (compatibleMatches.length > 0 && totalCompatibleSupplyKg < requirement.requiredQuantityKg);
  return {
    requirement,
    matches,
    totalCompatibleSupplyKg,
    aggregationAvailable,
    message: compatibleMatches.length ? `${compatibleMatches.length} compatible farmer supply profile${compatibleMatches.length === 1 ? "" : "s"} found.` : "No compatible farmer supply found for this requirement yet.",
  };
}

export const buyerService = {
  async listRequirements(buyerKey?: string) { return buyerRequirementRepository.list(buyerKey); },
  async create(input: CreateBuyerRequirementInput) { return buyerRequirementRepository.create(input); },
  async calculate(requirementId: number, buyerKey?: string): Promise<BuyerMatchResponse> {
    const requirement = await buyerRequirementRepository.getById(requirementId, buyerKey);
    if (!requirement) throw new Error("Buyer requirement was not found.");
    return calculateBuyerMatches(requirement, await marketRepository.listFarmers());
  },
};
