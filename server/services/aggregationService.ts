import type { AggregationCandidate, AggregationConstraints, AggregationEvaluationResponse, AggregationExplanationInput, AggregationPlan, BuyerRequirementRecord } from "@shared/types";
import { buyerRequirementRepository, toPublicBuyerRequirement } from "../repositories/buyerRequirementRepository";
import { farmerListingRepository } from "../repositories/farmerListingRepository";
import { aggregationPlanRepository } from "../repositories/aggregationPlanRepository";
import { estimateDistance } from "./distanceService";
import { estimateTransportCost, demoTransportConfig } from "./transportService";
import { marketPriceService } from "./marketPriceService";
import { evaluateAggregation } from "./aggregationEngine";
import { estimateCollectiveTransport } from "./collectiveTransportService";
import { aggregationExplanationService } from "./aggregationExplanationService";

function toLocation(city: string, district: string, state: string, latitude?: number, longitude?: number) {
  return { city, district, state, latitude, longitude };
}

function inputForExplanation(plan: AggregationPlan, requirement: BuyerRequirementRecord): AggregationExplanationInput {
  return {
    plan,
    requirement,
    contributions: plan.contributions,
    marketReference: plan.marketReference,
  };
}

async function loadCandidates(requirement: BuyerRequirementRecord): Promise<AggregationCandidate[]> {
  const listings = await farmerListingRepository.listActiveForAggregation();
  return listings.map(listing => {
    try {
      const distance = estimateDistance(toLocation(listing.city, listing.district, listing.state, listing.latitude, listing.longitude), toLocation(requirement.city, requirement.district, requirement.state, requirement.latitude, requirement.longitude));
      const compatible = listing.status === "active" && listing.crop === requirement.crop && listing.quantityKg > 0 && listing.minimumPricePerKg <= requirement.offeredPricePerKg;
      return {
        listing,
        distanceKm: distance.distanceKm,
        distanceSource: distance.source,
        estimatedIndividualTransportCost: distance.source === "unavailable" ? 0 : estimateTransportCost(distance.distanceKm, demoTransportConfig),
        compatible,
        compatibilityReason: compatible ? "Crop, price and location are compatible." : listing.crop !== requirement.crop ? `Crop mismatch: listing offers ${listing.crop}.` : listing.minimumPricePerKg > requirement.offeredPricePerKg ? `Farmer minimum is ₹${listing.minimumPricePerKg}/kg.` : "Listing is not currently available.",
        availableQuantityKg: listing.quantityKg,
      };
    } catch {
      return {
        listing,
        distanceKm: Number.POSITIVE_INFINITY,
        distanceSource: "unavailable" as const,
        estimatedIndividualTransportCost: 0,
        compatible: false,
        compatibilityReason: "Location estimate unavailable for this listing.",
        availableQuantityKg: listing.quantityKg,
      };
    }
  });
}

export const aggregationService = {
  async evaluate(requirement: BuyerRequirementRecord, constraints?: AggregationConstraints, allowModelExplanation = true): Promise<AggregationEvaluationResponse> {
    const marketReference = await marketPriceService.getReference({ crop: requirement.crop, location: requirement.location });
    const candidates = await loadCandidates(requirement);
    const plans = evaluateAggregation({
      requirement,
      candidates,
      constraints,
      marketReference,
      transportFor: estimateCollectiveTransport,
    });
    const recommendedPlan = plans[0];
    const explanation = recommendedPlan ? await aggregationExplanationService.explain(inputForExplanation(recommendedPlan, requirement), allowModelExplanation) : { text: "No deterministic collective fulfilment plan is available for the current requirement and active supply.", source: "deterministic" as const };
    return {
      requirement: toPublicBuyerRequirement(requirement),
      recommendedPlan,
      alternatives: plans.slice(1).map(plan => ({ plan, rankingReasons: plan.rankingReasons })),
      candidateCount: candidates.filter(candidate => candidate.compatible).length,
      marketReference,
      logisticsMethod: recommendedPlan?.logistics.method ?? "demo-logistics",
      logisticsLabel: recommendedPlan?.logistics.sourceLabel ?? "No logistics estimate available",
      explanation,
      message: recommendedPlan
        ? recommendedPlan.fulfilmentType === "full" ? "A full collective fulfilment path was calculated deterministically." : "Only partial fulfilment is currently available; the remaining quantity is clearly shown."
        : "No compatible collective fulfilment plan is available for this requirement.",
    };
  },

  async evaluateByRequirementId(requirementId: number, buyerKey = "demo-buyer-sahyadri", constraints?: AggregationConstraints, allowModelExplanation = true) {
    const requirement = await buyerRequirementRepository.getById(requirementId, buyerKey);
    if (!requirement) throw new Error("Buyer requirement was not found.");
    return this.evaluate(requirement, constraints, allowModelExplanation);
  },

  async persistSelectedPlan(requirementId: number, buyerKey: string, plan: AggregationPlan) {
    const requirement = await buyerRequirementRepository.getById(requirementId, buyerKey);
    if (!requirement) throw new Error("Buyer requirement was not found.");
    if (plan.requirementId !== requirement.id) throw new Error("Plan does not belong to this buyer requirement.");
    return aggregationPlanRepository.create(plan, buyerKey);
  },

  async getSavedPlan(planId: number, buyerKey: string) {
    return aggregationPlanRepository.getById(planId, buyerKey);
  },
};

export { loadCandidates };
