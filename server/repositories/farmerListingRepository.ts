import { desc, eq } from "drizzle-orm";
import { farmerListings } from "../../drizzle/schema";
import { demoFarmers } from "@shared/demoData";
import type { CreateFarmerListingInput, FarmerListing } from "@shared/types";
import { getDb } from "../db";

let nextFallbackId = 2;
const fallbackListings: FarmerListing[] = [
  {
    id: 1,
    farmerKey: "demo-farmer-krishna",
    crop: demoFarmers[0].primaryCrop,
    quantityKg: demoFarmers[0].availableQuantityKg,
    location: "Khed, Pune",
    city: demoFarmers[0].location.city,
    district: demoFarmers[0].location.district,
    state: demoFarmers[0].location.state,
    minimumPricePerKg: demoFarmers[0].expectedPricePerKg,
    status: "active",
    createdAt: new Date("2026-09-01T08:00:00.000Z").toISOString(),
  },
];

function toDomain(row: typeof farmerListings.$inferSelect): FarmerListing {
  return {
    id: row.id,
    farmerKey: row.farmerKey,
    crop: row.crop as FarmerListing["crop"],
    quantityKg: row.quantityKg,
    location: row.location,
    city: row.city,
    district: row.district,
    state: row.state,
    minimumPricePerKg: row.minimumPricePerKg,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

export const farmerListingRepository = {
  async getById(id: number, farmerKey = "demo-farmer-krishna"): Promise<FarmerListing | undefined> {
    const db = await getDb();
    if (!db) return fallbackListings.find(listing => listing.id === id && listing.farmerKey === farmerKey);

    const rows = await db.select().from(farmerListings).where(eq(farmerListings.id, id));
    const row = rows.find(candidate => candidate.farmerKey === farmerKey);
    return row ? toDomain(row) : fallbackListings.find(listing => listing.id === id && listing.farmerKey === farmerKey);
  },

  async list(farmerKey = "demo-farmer-krishna"): Promise<FarmerListing[]> {
    const db = await getDb();
    if (!db) return fallbackListings.filter(listing => listing.farmerKey === farmerKey);

    const rows = await db.select().from(farmerListings).where(eq(farmerListings.farmerKey, farmerKey)).orderBy(desc(farmerListings.createdAt));
    return rows.length ? rows.map(toDomain) : fallbackListings.filter(listing => listing.farmerKey === farmerKey);
  },

  async create(input: CreateFarmerListingInput): Promise<FarmerListing> {
    const farmerKey = input.farmerKey ?? "demo-farmer-krishna";
    const db = await getDb();
    if (!db) {
      const listing: FarmerListing = {
        id: nextFallbackId++,
        farmerKey,
        crop: input.crop,
        quantityKg: input.quantityKg,
        location: input.location,
        city: input.city,
        district: input.district,
        state: input.state,
        minimumPricePerKg: input.minimumPricePerKg,
        status: "active",
        createdAt: new Date().toISOString(),
      };
      fallbackListings.unshift(listing);
      return listing;
    }

    const result = await db.insert(farmerListings).values({
      farmerKey,
      crop: input.crop,
      quantityKg: input.quantityKg,
      location: input.location,
      city: input.city,
      district: input.district,
      state: input.state,
      minimumPricePerKg: input.minimumPricePerKg,
      status: "active",
    });
    const insertedId = Number(result[0].insertId);
    const rows = await db.select().from(farmerListings).where(eq(farmerListings.id, insertedId));
    const inserted = rows.find(row => row.id === insertedId);
    if (!inserted) throw new Error("Created farmer listing could not be read back");
    return toDomain(inserted);
  },
};
