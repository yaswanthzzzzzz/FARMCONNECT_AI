import type { BuyerMatchResult, BuyerProfile, FarmerListingRecord, MatchResponse, TransportConfig } from "@shared/types";
import { estimateDistance } from "./distanceService";
import { demoTransportConfig, estimateTransportCost } from "./transportService";
import { toPublicFarmerListing } from "../repositories/farmerListingRepository";

export function calculateMatchedQuantity(farmerQuantityKg: number, buyerRequiredQuantityKg: number) {
  if (!Number.isFinite(farmerQuantityKg) || farmerQuantityKg <= 0) throw new Error("Farmer quantity must be greater than zero.");
  if (!Number.isFinite(buyerRequiredQuantityKg) || buyerRequiredQuantityKg <= 0) throw new Error("Buyer quantity must be greater than zero.");
  return Math.min(farmerQuantityKg, buyerRequiredQuantityKg);
}

export function calculateGrossRevenue(matchedQuantityKg: number, offeredPricePerKg: number) {
  if (matchedQuantityKg < 0 || offeredPricePerKg < 0) throw new Error("Financial inputs cannot be negative.");
  return Math.round(matchedQuantityKg * offeredPricePerKg);
}

export function calculateMatchScore(input: { netOutcome: number; maxNetOutcome: number; offeredPrice: number; maxOfferedPrice: number; quantityFulfillmentPercent: number; distanceKm: number; maxDistanceKm: number }) {
  const netComponent = input.maxNetOutcome > 0 ? input.netOutcome / input.maxNetOutcome : 0;
  const priceComponent = input.maxOfferedPrice > 0 ? input.offeredPrice / input.maxOfferedPrice : 0;
  const quantityComponent = Math.min(1, Math.max(0, input.quantityFulfillmentPercent / 100));
  const logisticsComponent = input.maxDistanceKm > 0 ? 1 - Math.min(1, input.distanceKm / input.maxDistanceKm) : 1;

  // Transparent weights: net outcome 45%, price 15%, quantity fulfilment 20%, logistics 20%.
  // Net outcome is intentionally the largest component so a high price cannot win by itself.
  return Math.round((netComponent * 0.45 + priceComponent * 0.15 + quantityComponent * 0.2 + logisticsComponent * 0.2) * 1000) / 10;
}

function money(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

function matchedQuantityNote(farmer: FarmerListingRecord, buyer: BuyerProfile, matchedQuantityKg: number) {
  if (buyer.requiredQuantityKg < farmer.quantityKg) return `Buyer needs ${buyer.requiredQuantityKg.toLocaleString()} kg; this match uses that amount from your ${farmer.quantityKg.toLocaleString()} kg listing.`;
  if (buyer.requiredQuantityKg > farmer.quantityKg) return `Partial fulfilment: buyer needs ${buyer.requiredQuantityKg.toLocaleString()} kg; this match uses your full ${matchedQuantityKg.toLocaleString()} kg listing.`;
  return `Exact quantity fit at ${matchedQuantityKg.toLocaleString()} kg.`;
}

export function rankBuyerMatches(farmer: FarmerListingRecord, buyers: BuyerProfile[], transportConfig: TransportConfig = demoTransportConfig): BuyerMatchResult[] {
  const candidates = buyers.filter(buyer => buyer.requiredCrop === farmer.crop && buyer.offeredPricePerKg >= farmer.minimumPricePerKg && buyer.requiredQuantityKg > 0);
  if (!candidates.length) return [];

  const preliminary = candidates.map(buyer => {
    const distance = estimateDistance(farmer, buyer.location);
    const matchedQuantityKg = calculateMatchedQuantity(farmer.quantityKg, buyer.requiredQuantityKg);
    const grossRevenue = calculateGrossRevenue(matchedQuantityKg, buyer.offeredPricePerKg);
    const estimatedTransportCost = distance.source === "unavailable" ? 0 : estimateTransportCost(distance.distanceKm, transportConfig);
    const estimatedNetOutcome = grossRevenue - estimatedTransportCost;
    const quantityFulfillmentPercent = Math.round((matchedQuantityKg / buyer.requiredQuantityKg) * 1000) / 10;
    return { buyer, distance, matchedQuantityKg, grossRevenue, estimatedTransportCost, estimatedNetOutcome, quantityFulfillmentPercent };
  });

  const maxNetOutcome = Math.max(...preliminary.map(item => item.estimatedNetOutcome), 0);
  const maxOfferedPrice = Math.max(...preliminary.map(item => item.buyer.offeredPricePerKg), 0);
  const maxDistanceKm = Math.max(...preliminary.map(item => item.distance.distanceKm), 0);
  const sorted = preliminary.map(item => ({ ...item, matchScore: calculateMatchScore({ netOutcome: item.estimatedNetOutcome, maxNetOutcome, offeredPrice: item.buyer.offeredPricePerKg, maxOfferedPrice, quantityFulfillmentPercent: item.quantityFulfillmentPercent, distanceKm: item.distance.distanceKm, maxDistanceKm }) })).sort((a, b) => b.matchScore - a.matchScore || b.estimatedNetOutcome - a.estimatedNetOutcome);
  const highestPrice = sorted.reduce((best, current) => current.buyer.offeredPricePerKg > best.buyer.offeredPricePerKg ? current : best, sorted[0]);
  const highestNet = sorted[0];

  return sorted.map((item, index) => {
    const netRank = sorted.findIndex(candidate => candidate.estimatedNetOutcome === item.estimatedNetOutcome) + 1;
    const priceRank = sorted.slice().sort((a, b) => b.buyer.offeredPricePerKg - a.buyer.offeredPricePerKg).findIndex(candidate => candidate.buyer.id === item.buyer.id) + 1;
    const tradeoffNote = item.buyer.id === highestNet.buyer.id && highestPrice.buyer.id !== highestNet.buyer.id
      ? `Although ${highestPrice.buyer.name} offers ${money(highestPrice.buyer.offeredPricePerKg)}/kg, ${item.buyer.name} is closer and the estimated transport is ${money(item.estimatedTransportCost)} versus ${money(highestPrice.estimatedTransportCost)}, producing the better estimated net outcome.`
      : `${item.buyer.name} balances price, quantity fulfilment and estimated logistics for this listing.`;
    const result: BuyerMatchResult = {
      buyer: item.buyer,
      compatible: true,
      matchedQuantityKg: item.matchedQuantityKg,
      distance: item.distance,
      grossRevenue: item.grossRevenue,
      estimatedTransportCost: item.estimatedTransportCost,
      estimatedNetOutcome: item.estimatedNetOutcome,
      quantityFulfillmentPercent: item.quantityFulfillmentPercent,
      matchScore: item.matchScore,
      recommendation: index === 0 ? "recommended" : "alternative",
      explanationData: {
        netOutcomeRank: netRank,
        priceRank,
        quantityFulfillmentPercent: item.quantityFulfillmentPercent,
        logisticsEfficiencyPercent: Math.round((1 - (maxDistanceKm > 0 ? item.distance.distanceKm / maxDistanceKm : 0)) * 1000) / 10,
        matchedQuantityNote: matchedQuantityNote(farmer, item.buyer, item.matchedQuantityKg),
        tradeoffNote,
      },
    };
    return result;
  });
}

export function buildMatchResponse(farmer: FarmerListingRecord, buyers: BuyerProfile[], transportConfig: TransportConfig = demoTransportConfig): MatchResponse {
  const matches = rankBuyerMatches(farmer, buyers, transportConfig);
  return {
    listing: toPublicFarmerListing(farmer),
    matches,
    recommendedMatchId: matches[0]?.buyer.id,
    transportConfig,
    message: matches.length ? `${matches.length} compatible selling path${matches.length === 1 ? "" : "s"} calculated from deterministic estimates.` : "No buyers currently meet the crop and minimum-price requirements.",
  };
}
