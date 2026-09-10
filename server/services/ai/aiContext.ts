import type { User } from "../../../drizzle/schema";
import type { AIMessage } from "./aiProvider";
import { farmerListingRepository } from "../../repositories/farmerListingRepository";
import { buyerRequirementRepository } from "../../repositories/buyerRequirementRepository";
import { matchService } from "../matchService";
import { buyerService } from "../buyerService";
import { aggregationService } from "../aggregationService";
import { marketPriceService } from "../marketPriceService";
import { demoService } from "../demoService";
import { routeService, type RouteResult } from "../routeService";

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

function routeFacts(route: RouteResult) {
  return {
    distanceKm: route.distanceKm,
    durationMinutes: route.durationMinutes,
    routeAvailable: route.routeAvailable,
    source: route.source,
    confidence: route.confidence,
    summary: route.summary,
    origin: route.originLabel,
    destination: route.destinationLabel,
  };
}

function safeMessage(message: string) {
  return message.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 1200);
}

export async function buildAIContext(input: AIRequestInput, user?: User | null): Promise<AIContext> {
  if (input.mode === "demo") {
    const data = await demoService.explore({ farmerIndex: input.demoFarmerIndex ?? 0, buyerIndex: input.demoBuyerIndex ?? 0 });
    const plan = data.aggregation.recommendedPlan;
    const selectedFarmerLocation = { label: data.listing.location, city: data.listing.city, district: data.listing.district, state: data.listing.state, latitude: data.selectedFarmer.location.latitude, longitude: data.selectedFarmer.location.longitude };
    const selectedBuyerLocation = { label: data.requirement.location, city: data.requirement.city, district: data.requirement.district, state: data.requirement.state, latitude: data.requirement.latitude, longitude: data.requirement.longitude };
    const route = await routeService.getRoute(selectedFarmerLocation, selectedBuyerLocation);
    return {
      mode: "demo",
      role: "farmer",
      facts: {
        demoOnly: true,
        farmer: { name: data.selectedFarmer.name, crop: data.selectedFarmer.primaryCrop, quantityKg: data.listing.quantityKg, location: data.selectedFarmer.location.city, expectedPricePerKg: data.listing.minimumPricePerKg },
        buyer: { name: data.selectedBuyer.name, crop: data.requirement.crop, requiredQuantityKg: data.requirement.requiredQuantityKg, location: data.selectedBuyer.location.city, offeredPricePerKg: data.requirement.offeredPricePerKg },
        route: routeFacts(route),
        matches: data.matches.matches.map(match => ({ buyer: match.buyer.name, distanceKm: match.distance.distanceKm, estimatedTransportCost: match.estimatedTransportCost, estimatedNetOutcome: match.estimatedNetOutcome, matchScore: match.matchScore, recommendation: match.recommendation, tradeoff: match.explanationData.tradeoffNote })),
        aggregation: plan ? { fulfilmentType: plan.fulfilmentType, requiredQuantityKg: plan.requiredQuantityKg, plannedQuantityKg: plan.plannedQuantityKg, remainingQuantityKg: plan.remainingQuantityKg, contributingFarmerCount: plan.contributingFarmerCount, transportCost: plan.transportCost, estimatedNetOutcome: plan.estimatedNetOutcome, logistics: { collectionLegs: plan.logistics.collectionLegs.length, deliveryDistanceKm: plan.logistics.deliveryDistanceKm, totalDistanceKm: plan.logistics.totalDistanceKm, source: plan.logistics.sourceLabel } } : undefined,
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
    const recommended = matches.matches[0];
    const route = recommended ? await routeService.getRoute(
      { label: listing.location, city: listing.city, district: listing.district, state: listing.state, latitude: listing.latitude, longitude: listing.longitude },
      { label: `${recommended.buyer.name} · ${recommended.buyer.location.city}`, city: recommended.buyer.location.city, district: recommended.buyer.location.district, state: recommended.buyer.location.state, latitude: recommended.buyer.location.latitude, longitude: recommended.buyer.location.longitude },
    ) : undefined;
    return {
      mode: "farmer",
      role: "farmer",
      facts: {
        listing: { crop: listing.crop, quantityKg: listing.quantityKg, location: listing.city, minimumPricePerKg: listing.minimumPricePerKg, locationSource: listing.locationSource },
        route: route ? routeFacts(route) : undefined,
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
  const firstCompatible = matches.matches.find(match => match.compatible);
  const route = firstCompatible ? await routeService.getRoute(
    { label: `${firstCompatible.farmer.name} · ${firstCompatible.farmer.location.city}`, city: firstCompatible.farmer.location.city, district: firstCompatible.farmer.location.district, state: firstCompatible.farmer.location.state, latitude: firstCompatible.farmer.location.latitude, longitude: firstCompatible.farmer.location.longitude },
    { label: requirement.location, city: requirement.city, district: requirement.district, state: requirement.state, latitude: requirement.latitude, longitude: requirement.longitude },
  ) : undefined;
  return {
    mode: "buyer",
    role: "buyer",
    facts: {
      requirement: { crop: requirement.crop, requiredQuantityKg: requirement.requiredQuantityKg, location: requirement.city, offeredPricePerKg: requirement.offeredPricePerKg, locationSource: requirement.locationSource },
      route: route ? routeFacts(route) : undefined,
      compatibleSupplyKg: matches.totalCompatibleSupplyKg,
      aggregationAvailable: matches.aggregationAvailable,
      matches: matches.matches.filter(match => match.compatible).map(match => ({ farmer: match.farmer.name, location: match.farmer.location.city, availableQuantityKg: match.availableQuantityKg, matchedQuantityKg: match.matchedQuantityKg, distanceKm: match.distanceKm, estimatedTransportCost: match.estimatedTransportCost, expectedPricePerKg: match.expectedPricePerKg, compatibilityReason: match.compatibilityReason })),
      aggregation: aggregation.recommendedPlan ? { fulfilmentType: aggregation.recommendedPlan.fulfilmentType, requiredQuantityKg: aggregation.recommendedPlan.requiredQuantityKg, plannedQuantityKg: aggregation.recommendedPlan.plannedQuantityKg, remainingQuantityKg: aggregation.recommendedPlan.remainingQuantityKg, contributingFarmerCount: aggregation.recommendedPlan.contributingFarmerCount, transportCost: aggregation.recommendedPlan.transportCost, estimatedNetOutcome: aggregation.recommendedPlan.estimatedNetOutcome, logistics: { collectionLegs: aggregation.recommendedPlan.logistics.collectionLegs.length, deliveryDistanceKm: aggregation.recommendedPlan.logistics.deliveryDistanceKm, totalDistanceKm: aggregation.recommendedPlan.logistics.totalDistanceKm, source: aggregation.recommendedPlan.logistics.sourceLabel } } : undefined,
      marketReference: aggregation.marketReference ? marketFacts(aggregation.marketReference) : undefined,
    },
  };
}

export function sanitizeQuestion(input: string) {
  return safeMessage(input);
}
