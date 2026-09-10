import type {
  AggregationCandidate,
  AggregationConstraints,
  AggregationPlan,
  AggregationPlanContribution,
  BuyerRequirement,
  CollectiveTransportEstimate,
} from "@shared/types";

export const AGGREGATION_ALGORITHM_VERSION = "phase5-v1";

export type AggregationEngineInput = {
  requirement: Pick<BuyerRequirement, "id" | "crop" | "requiredQuantityKg" | "offeredPricePerKg">;
  candidates: AggregationCandidate[];
  constraints?: AggregationConstraints;
  transportFor: (candidateSubset: AggregationCandidate[], contributions: AggregationPlanContribution[]) => CollectiveTransportEstimate;
  marketReference?: AggregationPlan["marketReference"];
};

const defaultConstraints: Required<AggregationConstraints> = {
  maxCandidates: 18,
  maxCombinations: 4096,
  maxContributingFarmers: 12,
  maxDistanceKm: 500,
  minimumFulfilmentPercent: 1,
  allowPartial: true,
  quantityStepKg: 1,
};

function normalizeConstraints(input?: AggregationConstraints): Required<AggregationConstraints> {
  const merged = { ...defaultConstraints, ...input };
  return {
    maxCandidates: Math.max(1, Math.min(24, Math.floor(merged.maxCandidates))),
    maxCombinations: Math.max(1, Math.min(10000, Math.floor(merged.maxCombinations))),
    maxContributingFarmers: Math.max(1, Math.min(24, Math.floor(merged.maxContributingFarmers))),
    maxDistanceKm: Math.max(0, merged.maxDistanceKm),
    minimumFulfilmentPercent: Math.max(0, Math.min(100, merged.minimumFulfilmentPercent)),
    allowPartial: Boolean(merged.allowPartial),
    quantityStepKg: Math.max(1, Math.floor(merged.quantityStepKg)),
  };
}

function roundMoney(value: number) {
  return Math.round(value);
}

function roundQuantity(value: number, step: number) {
  return Math.max(0, Math.floor(value / step) * step);
}

function compareCandidateEfficiency(a: AggregationCandidate, b: AggregationCandidate) {
  const aEfficiency = (a.listing.minimumPricePerKg - a.estimatedIndividualTransportCost / Math.max(a.availableQuantityKg, 1));
  const bEfficiency = (b.listing.minimumPricePerKg - b.estimatedIndividualTransportCost / Math.max(b.availableQuantityKg, 1));
  return aEfficiency - bEfficiency || a.listing.id - b.listing.id;
}

function buildContributions(requirementQuantity: number, candidates: AggregationCandidate[], step: number): AggregationPlanContribution[] {
  let remaining = requirementQuantity;
  const sorted = candidates.slice().sort(compareCandidateEfficiency);
  const contributions: AggregationPlanContribution[] = [];
  for (const candidate of sorted) {
    if (remaining <= 0) break;
    const contributedQuantityKg = roundQuantity(Math.min(candidate.availableQuantityKg, remaining), step);
    if (contributedQuantityKg <= 0) continue;
    contributions.push({
      farmerListingId: candidate.listing.id,
      farmerKey: candidate.listing.farmerKey,
      contributedQuantityKg,
      minimumPricePerKg: candidate.listing.minimumPricePerKg,
      distanceKm: candidate.distanceKm,
      estimatedTransportCost: candidate.estimatedIndividualTransportCost,
      contributionOutcome: roundMoney(contributedQuantityKg * (candidate.listing.minimumPricePerKg)),
      sequence: contributions.length + 1,
    });
    remaining -= contributedQuantityKg;
  }
  return contributions;
}

function stableSubsetKey(contributions: AggregationPlanContribution[]) {
  return contributions.map(contribution => contribution.farmerListingId).sort((a, b) => a - b).join(",");
}

function comparePlans(a: AggregationPlan, b: AggregationPlan) {
  const aFull = a.fulfilmentType === "full" ? 1 : 0;
  const bFull = b.fulfilmentType === "full" ? 1 : 0;
  return bFull - aFull
    || b.fulfilmentPercent - a.fulfilmentPercent
    || b.estimatedNetOutcome - a.estimatedNetOutcome
    || a.transportCost - b.transportCost
    || a.unnecessaryOverfillKg - b.unnecessaryOverfillKg
    || a.contributingFarmerCount - b.contributingFarmerCount
    || a.totalDistanceKm - b.totalDistanceKm
    || stableSubsetKey(a.contributions).localeCompare(stableSubsetKey(b.contributions), undefined, { numeric: true });
}

function buildRankingReasons(plan: AggregationPlan, rank: number, best?: AggregationPlan) {
  const reasons = [
    plan.fulfilmentType === "full" ? "Reaches full buyer quantity" : `Covers ${plan.fulfilmentPercent}% of the requirement`,
    `${plan.contributingFarmerCount} contributing farmer${plan.contributingFarmerCount === 1 ? "" : "s"}`,
    `Estimated net outcome ₹${plan.estimatedNetOutcome.toLocaleString("en-IN")}`,
    `Collective transport estimate ₹${plan.transportCost.toLocaleString("en-IN")}`,
  ];
  if (rank === 1) reasons.unshift("Recommended by deterministic ranking");
  if (best && rank > 1) {
    if (plan.transportCost > best.transportCost) reasons.push(`Higher logistics estimate than the recommended plan by ₹${(plan.transportCost - best.transportCost).toLocaleString("en-IN")}`);
    if (plan.contributingFarmerCount > best.contributingFarmerCount) reasons.push("Uses more contributing farms");
  }
  return reasons;
}

export function filterAggregationCandidates(candidates: AggregationCandidate[], requirement: Pick<BuyerRequirement, "crop" | "offeredPricePerKg">, constraints?: AggregationConstraints) {
  const normalized = normalizeConstraints(constraints);
  return candidates
    .filter(candidate => candidate.compatible
      && candidate.listing.status === "active"
      && candidate.listing.crop === requirement.crop
      && candidate.availableQuantityKg > 0
      && candidate.listing.minimumPricePerKg <= requirement.offeredPricePerKg
      && Number.isFinite(candidate.distanceKm)
      && candidate.distanceKm <= normalized.maxDistanceKm)
    .sort((a, b) => a.listing.id - b.listing.id)
    .slice(0, normalized.maxCandidates);
}

export function evaluateAggregation(input: AggregationEngineInput): AggregationPlan[] {
  const constraints = normalizeConstraints(input.constraints);
  if (!Number.isInteger(input.requirement.requiredQuantityKg) || input.requirement.requiredQuantityKg <= 0) throw new Error("Required quantity must be a positive whole number.");
  if (!Number.isInteger(input.requirement.offeredPricePerKg) || input.requirement.offeredPricePerKg <= 0) throw new Error("Offered price must be a positive whole number.");

  const candidates = filterAggregationCandidates(input.candidates, input.requirement, constraints);
  const plans = new Map<string, AggregationPlan>();
  let evaluated = 0;

  const visit = (index: number, subset: AggregationCandidate[]) => {
    if (evaluated >= constraints.maxCombinations) return;
    if (subset.length > 0) {
      evaluated += 1;
      const contributions = buildContributions(input.requirement.requiredQuantityKg, subset.slice(0, constraints.maxContributingFarmers), constraints.quantityStepKg);
      const plannedQuantityKg = contributions.reduce((sum, contribution) => sum + contribution.contributedQuantityKg, 0);
      const fulfilmentPercent = Math.round((plannedQuantityKg / input.requirement.requiredQuantityKg) * 1000) / 10;
      if (plannedQuantityKg > 0 && fulfilmentPercent >= constraints.minimumFulfilmentPercent && (constraints.allowPartial || plannedQuantityKg >= input.requirement.requiredQuantityKg)) {
        const logistics = input.transportFor(subset, contributions);
        const grossRevenue = roundMoney(plannedQuantityKg * input.requirement.offeredPricePerKg);
        const plan: AggregationPlan = {
          requirementId: input.requirement.id,
          status: "proposed",
          fulfilmentType: plannedQuantityKg >= input.requirement.requiredQuantityKg ? "full" : "partial",
          requiredQuantityKg: input.requirement.requiredQuantityKg,
          plannedQuantityKg,
          remainingQuantityKg: Math.max(0, input.requirement.requiredQuantityKg - plannedQuantityKg),
          fulfilmentPercent,
          offeredPricePerKg: input.requirement.offeredPricePerKg,
          grossRevenue,
          transportCost: logistics.totalCost,
          estimatedNetOutcome: grossRevenue - logistics.totalCost,
          totalDistanceKm: logistics.totalDistanceKm,
          contributingFarmerCount: contributions.length,
          unnecessaryOverfillKg: Math.max(0, plannedQuantityKg - input.requirement.requiredQuantityKg),
          distanceMethod: subset.some(candidate => candidate.distanceSource === "unavailable") ? "unavailable" : subset.every(candidate => candidate.distanceSource === "coordinates") ? "coordinates" : "demo-mapping",
          logistics,
          contributions,
          rankingReasons: [],
          algorithmVersion: AGGREGATION_ALGORITHM_VERSION,
          marketReference: input.marketReference,
        };
        const key = stableSubsetKey(contributions);
        const current = plans.get(key);
        if (!current || comparePlans(plan, current) < 0) plans.set(key, plan);
      }
    }
    if (index >= candidates.length || subset.length >= constraints.maxContributingFarmers) return;
    for (let next = index; next < candidates.length && evaluated < constraints.maxCombinations; next += 1) {
      visit(next + 1, [...subset, candidates[next]]);
    }
  };

  visit(0, []);
  const sorted = Array.from(plans.values()).sort(comparePlans).slice(0, 5);
  const best = sorted[0];
  return sorted.map((plan, index) => ({ ...plan, rankingReasons: buildRankingReasons(plan, index + 1, best) }));
}
