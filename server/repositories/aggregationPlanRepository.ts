import { and, desc, eq } from "drizzle-orm";
import { aggregationPlanContributions, aggregationPlans } from "../../drizzle/schema";
import type { AggregationPlan, AggregationPlanContribution, BuyerRequirement } from "@shared/types";
import { getDb } from "../db";

const fallbackPlans: AggregationPlan[] = [];
const fallbackPlanOwners = new Map<number, string>();
let nextFallbackId = 1;

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

function toContribution(row: typeof aggregationPlanContributions.$inferSelect): AggregationPlanContribution {
  return {
    id: row.id,
    planId: row.planId,
    farmerListingId: row.farmerListingId,
    farmerKey: row.farmerKey,
    contributedQuantityKg: row.contributedQuantityKg,
    minimumPricePerKg: row.minimumPricePerKg,
    distanceKm: row.distanceKm,
    estimatedTransportCost: row.estimatedTransportCost,
    contributionOutcome: row.contributionOutcome,
    sequence: row.sequence,
  };
}

function toPlan(row: typeof aggregationPlans.$inferSelect, contributions: AggregationPlanContribution[]): AggregationPlan {
  return {
    id: row.id,
    requirementId: row.requirementId,
    status: row.status,
    fulfilmentType: row.fulfilmentType,
    requiredQuantityKg: row.requiredQuantityKg,
    plannedQuantityKg: row.plannedQuantityKg,
    remainingQuantityKg: row.remainingQuantityKg,
    fulfilmentPercent: Math.round((row.plannedQuantityKg / Math.max(row.requiredQuantityKg, 1)) * 1000) / 10,
    offeredPricePerKg: row.offeredPricePerKg,
    grossRevenue: row.grossRevenue,
    transportCost: row.transportCost,
    estimatedNetOutcome: row.estimatedNetOutcome,
    totalDistanceKm: row.totalDistanceKm,
    contributingFarmerCount: contributions.length,
    unnecessaryOverfillKg: Math.max(0, row.plannedQuantityKg - row.requiredQuantityKg),
    distanceMethod: row.distanceMethod === "coordinates" ? "coordinates" : "demo-mapping",
    logistics: parseJson(row.logisticsSnapshot, {
      method: "demo-logistics", sourceLabel: "Demo logistics estimate", collectionLegs: [], deliveryDistanceKm: 0, deliveryCost: row.transportCost, sharedTransportOpportunity: contributions.length > 1, vehicleCapacityKg: 12000, loadFactor: 1, totalDistanceKm: row.totalDistanceKm, totalCost: row.transportCost, costAllocation: [], note: "Saved estimate",
    }),
    contributions,
    rankingReasons: [],
    algorithmVersion: row.algorithmVersion,
    marketReference: parseJson(row.marketReferenceSnapshot, undefined),
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt?.toISOString(),
  };
}

async function getContributions(planId: number) {
  const db = await getDb();
  if (!db) return fallbackPlans.find(plan => plan.id === planId)?.contributions ?? [];
  const rows = await db.select().from(aggregationPlanContributions).where(eq(aggregationPlanContributions.planId, planId)).orderBy(aggregationPlanContributions.sequence);
  return rows.map(toContribution);
}

export const aggregationPlanRepository = {
  async create(plan: AggregationPlan, buyerKey: string): Promise<AggregationPlan> {
    const db = await getDb();
    if (!db) {
      const saved = { ...plan, id: nextFallbackId++, status: "proposed" as const, createdAt: new Date().toISOString() };
      fallbackPlans.unshift(saved);
      fallbackPlanOwners.set(saved.id!, buyerKey);
      return saved;
    }
    const result = await db.insert(aggregationPlans).values({
      requirementId: plan.requirementId,
      buyerKey,
      status: "proposed",
      fulfilmentType: plan.fulfilmentType,
      requiredQuantityKg: plan.requiredQuantityKg,
      plannedQuantityKg: plan.plannedQuantityKg,
      remainingQuantityKg: plan.remainingQuantityKg,
      offeredPricePerKg: plan.offeredPricePerKg,
      grossRevenue: plan.grossRevenue,
      transportCost: plan.transportCost,
      estimatedNetOutcome: plan.estimatedNetOutcome,
      totalDistanceKm: Math.round(plan.totalDistanceKm),
      distanceMethod: plan.distanceMethod,
      logisticsSnapshot: JSON.stringify(plan.logistics),
      marketReferenceSnapshot: plan.marketReference ? JSON.stringify(plan.marketReference) : null,
      algorithmVersion: plan.algorithmVersion,
      expiresAt: plan.expiresAt ? new Date(plan.expiresAt) : null,
    });
    const planId = Number(result[0].insertId);
    await db.insert(aggregationPlanContributions).values(plan.contributions.map(contribution => ({
      planId,
      farmerListingId: contribution.farmerListingId,
      farmerKey: contribution.farmerKey,
      contributedQuantityKg: contribution.contributedQuantityKg,
      minimumPricePerKg: contribution.minimumPricePerKg,
      distanceKm: Math.round(contribution.distanceKm),
      estimatedTransportCost: contribution.estimatedTransportCost,
      contributionOutcome: contribution.contributionOutcome,
      sequence: contribution.sequence,
    })));
    const saved = await this.getById(planId, buyerKey);
    if (!saved) throw new Error("Saved aggregation plan could not be read back.");
    return saved;
  },

  async getById(id: number, buyerKey: string): Promise<AggregationPlan | undefined> {
    const db = await getDb();
    if (!db) return fallbackPlans.find(plan => plan.id === id && fallbackPlanOwners.get(plan.id!) === buyerKey);
    const rows = await db.select().from(aggregationPlans).where(and(eq(aggregationPlans.id, id), eq(aggregationPlans.buyerKey, buyerKey))).limit(1);
    const row = rows[0];
    return row ? toPlan(row, await getContributions(row.id)) : undefined;
  },

  async listForRequirement(requirement: Pick<BuyerRequirement, "id">, buyerKey: string): Promise<AggregationPlan[]> {
    const db = await getDb();
    if (!db) return fallbackPlans.filter(plan => plan.requirementId === requirement.id && fallbackPlanOwners.get(plan.id!) === buyerKey);
    const rows = await db.select().from(aggregationPlans).where(and(eq(aggregationPlans.requirementId, requirement.id), eq(aggregationPlans.buyerKey, buyerKey))).orderBy(desc(aggregationPlans.createdAt));
    return Promise.all(rows.map(async row => toPlan(row, await getContributions(row.id))));
  },
};
