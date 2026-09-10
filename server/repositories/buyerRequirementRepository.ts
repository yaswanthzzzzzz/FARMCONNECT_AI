import { desc, eq } from "drizzle-orm";
import { buyerRequirements } from "../../drizzle/schema";
import { demoBuyers } from "@shared/demoData";
import type { BuyerRequirement, CreateBuyerRequirementInput } from "@shared/types";
import { getDb } from "../db";

let nextFallbackId = 2;
const fallbackRequirements: BuyerRequirement[] = [{
  id: 1,
  buyerKey: "demo-buyer-sahyadri",
  crop: demoBuyers[0].requiredCrop,
  requiredQuantityKg: demoBuyers[0].requiredQuantityKg,
  location: "Pimpri-Chinchwad, Maharashtra",
  city: demoBuyers[0].location.city,
  district: demoBuyers[0].location.district,
  state: demoBuyers[0].location.state,
  offeredPricePerKg: demoBuyers[0].offeredPricePerKg,
  status: "active",
  createdAt: new Date("2026-09-01T08:00:00.000Z").toISOString(),
}];

function toDomain(row: typeof buyerRequirements.$inferSelect): BuyerRequirement {
  return {
    id: row.id,
    buyerKey: row.buyerKey,
    crop: row.crop as BuyerRequirement["crop"],
    requiredQuantityKg: row.requiredQuantityKg,
    location: row.location,
    city: row.city,
    district: row.district,
    state: row.state,
    offeredPricePerKg: row.offeredPricePerKg,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

export const buyerRequirementRepository = {
  async getById(id: number, buyerKey = "demo-buyer-sahyadri") {
    const db = await getDb();
    if (!db) return fallbackRequirements.find(requirement => requirement.id === id && requirement.buyerKey === buyerKey);
    const rows = await db.select().from(buyerRequirements).where(eq(buyerRequirements.id, id));
    const row = rows.find(candidate => candidate.buyerKey === buyerKey);
    return row ? toDomain(row) : fallbackRequirements.find(requirement => requirement.id === id && requirement.buyerKey === buyerKey);
  },

  async list(buyerKey = "demo-buyer-sahyadri") {
    const db = await getDb();
    if (!db) return fallbackRequirements.filter(requirement => requirement.buyerKey === buyerKey);
    const rows = await db.select().from(buyerRequirements).where(eq(buyerRequirements.buyerKey, buyerKey)).orderBy(desc(buyerRequirements.createdAt));
    return rows.length ? rows.map(toDomain) : fallbackRequirements.filter(requirement => requirement.buyerKey === buyerKey);
  },

  async create(input: CreateBuyerRequirementInput): Promise<BuyerRequirement> {
    const buyerKey = input.buyerKey ?? "demo-buyer-sahyadri";
    const db = await getDb();
    if (!db) {
      const requirement: BuyerRequirement = { id: nextFallbackId++, buyerKey, crop: input.crop, requiredQuantityKg: input.requiredQuantityKg, location: input.location, city: input.city, district: input.district, state: input.state, offeredPricePerKg: input.offeredPricePerKg, status: "active", createdAt: new Date().toISOString() };
      fallbackRequirements.unshift(requirement);
      return requirement;
    }
    const result = await db.insert(buyerRequirements).values({ buyerKey, crop: input.crop, requiredQuantityKg: input.requiredQuantityKg, location: input.location, city: input.city, district: input.district, state: input.state, offeredPricePerKg: input.offeredPricePerKg, status: "active" });
    const insertedId = Number(result[0].insertId);
    const rows = await db.select().from(buyerRequirements).where(eq(buyerRequirements.id, insertedId));
    const inserted = rows.find(row => row.id === insertedId);
    if (!inserted) throw new Error("Created buyer requirement could not be read back");
    return toDomain(inserted);
  },
};
