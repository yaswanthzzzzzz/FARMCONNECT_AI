import type { AggregationCandidate, AggregationPlanContribution, CollectiveTransportEstimate } from "@shared/types";

export const collectiveTransportConfig = {
  fixedCollectionCost: 350,
  costPerKm: 70,
  vehicleCapacityKg: 12000,
  loadFactor: 1,
};

export function estimateCollectiveTransport(candidates: AggregationCandidate[], contributions: AggregationPlanContribution[]): CollectiveTransportEstimate {
  const totalQuantityKg = contributions.reduce((sum, contribution) => sum + contribution.contributedQuantityKg, 0);
  if (totalQuantityKg <= 0) throw new Error("Collective transport requires positive planned quantity.");
  if (totalQuantityKg > collectiveTransportConfig.vehicleCapacityKg) {
    throw new Error(`Collective quantity exceeds demo vehicle capacity of ${collectiveTransportConfig.vehicleCapacityKg.toLocaleString()} kg.`);
  }
  if (candidates.some(candidate => candidate.distanceSource === "unavailable")) {
    return {
      method: "unavailable",
      sourceLabel: "Distance unavailable",
      collectionLegs: [],
      deliveryDistanceKm: 0,
      deliveryCost: 0,
      sharedTransportOpportunity: contributions.length > 1,
      vehicleCapacityKg: collectiveTransportConfig.vehicleCapacityKg,
      loadFactor: collectiveTransportConfig.loadFactor,
      totalDistanceKm: 0,
      totalCost: 0,
      costAllocation: contributions.map(contribution => ({ listingId: contribution.farmerListingId, allocatedCost: 0 })),
      note: "Collective transport estimate is unavailable until all locations have a deterministic distance source.",
    };
  }

  const candidateById = new Map(candidates.map(candidate => [candidate.listing.id, candidate]));
  const collectionLegs = contributions.map(contribution => {
    const candidate = candidateById.get(contribution.farmerListingId);
    if (!candidate) throw new Error("A transport contribution is missing its candidate listing.");
    return {
      listingId: contribution.farmerListingId,
      distanceKm: candidate.distanceKm,
      estimatedCost: Math.round(candidate.distanceKm * collectiveTransportConfig.costPerKm),
    };
  });
  const deliveryDistanceKm = collectionLegs.length ? Math.max(...collectionLegs.map(leg => leg.distanceKm)) : 0;
  const totalDistanceKm = Math.round((collectionLegs.reduce((sum, leg) => sum + leg.distanceKm, 0) + deliveryDistanceKm) * 10) / 10;
  const deliveryCost = Math.round(deliveryDistanceKm * collectiveTransportConfig.costPerKm);
  const variableCollectionCost = collectionLegs.reduce((sum, leg) => sum + leg.estimatedCost, 0);
  const fixedCost = collectionLegs.length > 1 ? collectiveTransportConfig.fixedCollectionCost : 0;
  const totalCost = Math.round((variableCollectionCost + deliveryCost + fixedCost) * collectiveTransportConfig.loadFactor);
  const allocationBase = Math.max(variableCollectionCost + deliveryCost, 1);
  const costAllocation = contributions.map(contribution => {
    const candidate = candidateById.get(contribution.farmerListingId)!;
    const weight = candidate.distanceKm * contribution.contributedQuantityKg;
    return { listingId: contribution.farmerListingId, allocatedCost: Math.round((totalCost * weight) / Math.max(collectionLegs.reduce((sum, leg) => sum + leg.distanceKm * (contributions.find(item => item.farmerListingId === leg.listingId)?.contributedQuantityKg ?? 0), 0), allocationBase)) };
  });

  return {
    method: candidates.every(candidate => candidate.distanceSource === "coordinates") ? "coordinate-estimate" : "demo-logistics",
    sourceLabel: candidates.every(candidate => candidate.distanceSource === "coordinates") ? "Coordinate-based estimate" : "Demo logistics estimate",
    collectionLegs,
    deliveryDistanceKm,
    deliveryCost,
    sharedTransportOpportunity: contributions.length > 1,
    vehicleCapacityKg: collectiveTransportConfig.vehicleCapacityKg,
    loadFactor: collectiveTransportConfig.loadFactor,
    totalDistanceKm,
    totalCost,
    costAllocation,
    note: contributions.length > 1 ? "Shared transport opportunity; no live route or guaranteed saving is implied." : "Single-listing transport estimate; no live logistics quote is implied.",
  };
}
