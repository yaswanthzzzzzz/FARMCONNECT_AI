import type { User } from "../../../drizzle/schema";
import type { AIMessage } from "./aiProvider";
import { farmerListingRepository } from "../../repositories/farmerListingRepository";
import { buyerRequirementRepository } from "../../repositories/buyerRequirementRepository";
import { matchService } from "../matchService";
import { buyerService } from "../buyerService";
import { aggregationService } from "../aggregationService";
import { marketPriceService } from "../marketPriceService";
import { demoService } from "../demoService";

export type AIRequestInput = {
  mode: "farmer" | "buyer" | "demo";
  listingId?: number;
  requirementId?: number;
  demoFarmerIndex?: number;
  demoBuyerIndex?: number;
  message: string;
  messages?: AIMessage[];
};

export type AIContext = {
  mode: AIRequestInput["mode"];
  role: "farmer" | "buyer";
  facts: Record<string, unknown>;
};

function marketFacts(reference: Awaited<ReturnType<typeof marketPriceService.getReference>>) {
  return {
    status: reference.status,
    crop: reference.crop,
    location: reference.location,
    minPrice: reference.status === "unavailable" ? undefined : reference.minPrice,
    modalPrice: reference.status === "unavailable" ? undefined : reference.modalPrice,
    maxPrice: reference.status === "unavailable" ? undefined : reference.maxPrice,
    unit: reference.unit,
    source: reference.source,
    observedAt: reference.observedAt,
    message: reference.message,
  };
}

function safeMessage(message: string) {
  return message.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 1200);
}

export async function buildAIContext(input: AIRequestInput, user?: User | null): Promise<AIContext> {
  if (input.mode === "demo") {
    const data = await demoService.explore({ farmerIndex: input.demoFarmerIndex ?? 0, buyerIndex: input.demoBuyerIndex ?? 0 });
    const plan = data.aggregation.recommendedPlan;
    return {
      mode: "demo",
      role: "farmer",
      facts: {
        demoOnly: true,
        farmer: { name: data.selectedFarmer.name, crop: data.selectedFarmer.primaryCrop, quantityKg: data.listing.quantityKg, location: data.selectedFarmer.location.city, expectedPricePerKg: data.listing.minimumPricePerKg },
        buyer: { name: data.selectedBuyer.name, crop: data.requirement.crop, requiredQuantityKg: data.requirement.requiredQuantityKg, location: data.selectedBuyer.location.city, offeredPricePerKg: data.requirement.offeredPricePerKg },
        matches: data.matches.matches.map(match => ({ buyer: match.buyer.name, distanceKm: match.distance.distanceKm, estimatedTransportCost: match.estimatedTransportCost, estimatedNetOutcome: match.estimatedNetOutcome, matchScore: match.matchScore, recommendation: match.recommendation, tradeoff: match.explanationData.tradeoffNote })),
        aggregation: plan ? { fulfilmentType: plan.fulfilmentType, requiredQuantityKg: plan.requiredQuantityKg, plannedQuantityKg: plan.plannedQuantityKg, remainingQuantityKg: plan.remainingQuantityKg, contributingFarmerCount: plan.contributingFarmerCount, transportCost: plan.transportCost, estimatedNetOutcome: plan.estimatedNetOutcome } : undefined,
        marketReference: data.aggregation.marketReference ? marketFacts(data.aggregation.marketReference) : undefined,
      },
    };
  }

  if (!user || !["farmer", "buyer"].includes(user.role)) throw new Error("A selected farmer or buyer role is required.");
  if (input.mode !== user.role) throw new Error("The requested AI context does not match the authenticated role.");

  if (input.mode === "farmer") {
    if (!input.listingId) throw new Error("A saved farmer listing is required.");
    const listing = await farmerListingRepository.getById(input.listingId, user.identityKey);
    if (!listing) throw new Error("Farmer listing was not found.");
    const matches = await matchService.calculate({ listingId: input.listingId, farmerKey: user.identityKey });
    const market = await marketPriceService.getReference({ crop: listing.crop, location: listing.location });
    return {
      mode: "farmer",
      role: "farmer",
      facts: {
        listing: { crop: listing.crop, quantityKg: listing.quantityKg, location: listing.city, minimumPricePerKg: listing.minimumPricePerKg, locationSource: listing.locationSource },
        matches: matches.matches.map(match => ({ buyer: match.buyer.name, offeredPricePerKg: match.buyer.offeredPricePerKg, matchedQuantityKg: match.matchedQuantityKg, distanceKm: match.distance.distanceKm, estimatedTransportCost: match.estimatedTransportCost, grossRevenue: match.grossRevenue, estimatedNetOutcome: match.estimatedNetOutcome, matchScore: match.matchScore, recommendation: match.recommendation, tradeoff: match.explanationData.tradeoffNote })),
        marketReference: marketFacts(market),
      },
    };
  }

  if (!input.requirementId) throw new Error("A saved buyer requirement is required.");
  const requirement = await buyerRequirementRepository.getById(input.requirementId, user.identityKey);
  if (!requirement) throw new Error("Buyer requirement was not found.");
  const matches = await buyerService.calculate(input.requirementId, user.identityKey);
  const aggregation = await aggregationService.evaluateByRequirementId(input.requirementId, user.identityKey, undefined, false);
  return {
    mode: "buyer",
    role: "buyer",
    facts: {
      requirement: { crop: requirement.crop, requiredQuantityKg: requirement.requiredQuantityKg, location: requirement.city, offeredPricePerKg: requirement.offeredPricePerKg, locationSource: requirement.locationSource },
      compatibleSupplyKg: matches.totalCompatibleSupplyKg,
      aggregationAvailable: matches.aggregationAvailable,
      matches: matches.matches.filter(match => match.compatible).map(match => ({ farmer: match.farmer.name, location: match.farmer.location.city, availableQuantityKg: match.availableQuantityKg, matchedQuantityKg: match.matchedQuantityKg, distanceKm: match.distanceKm, estimatedTransportCost: match.estimatedTransportCost, expectedPricePerKg: match.expectedPricePerKg, compatibilityReason: match.compatibilityReason })),
      aggregation: aggregation.recommendedPlan ? { fulfilmentType: aggregation.recommendedPlan.fulfilmentType, requiredQuantityKg: aggregation.recommendedPlan.requiredQuantityKg, plannedQuantityKg: aggregation.recommendedPlan.plannedQuantityKg, remainingQuantityKg: aggregation.recommendedPlan.remainingQuantityKg, contributingFarmerCount: aggregation.recommendedPlan.contributingFarmerCount, transportCost: aggregation.recommendedPlan.transportCost, estimatedNetOutcome: aggregation.recommendedPlan.estimatedNetOutcome } : undefined,
      marketReference: aggregation.marketReference ? marketFacts(aggregation.marketReference) : undefined,
    },
  };
}

export function sanitizeQuestion(input: string) {
  return safeMessage(input);
}
