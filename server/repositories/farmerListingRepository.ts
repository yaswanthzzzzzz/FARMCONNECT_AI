import { desc, eq } from "drizzle-orm";
import { farmerListings } from "../../drizzle/schema";
import { demoFarmers } from "@shared/demoData";
import type { CreateFarmerListingInput, FarmerListing, FarmerListingRecord } from "@shared/types";
import { getDb } from "../db";

let nextFallbackId = 2;
const fallbackListings: FarmerListingRecord[] = [
  {
    id: 1,
    farmerKey: "demo-farmer-krishna",
    crop: demoFarmers[0].primaryCrop,
    quantityKg: demoFarmers[0].availableQuantityKg,
    location: "Khed, Pune",
    city: demoFarmers[0].location.city,
    district: demoFarmers[0].location.district,
    state: demoFarmers[0].location.state,
    latitude: demoFarmers[0].location.latitude,
    longitude: demoFarmers[0].location.longitude,
    locationSource: "demo",
    minimumPricePerKg: demoFarmers[0].expectedPricePerKg,
    status: "active",
    createdAt: new Date("2026-09-01T08:00:00.000Z").toISOString(),
  },
];

const aggregationFallbackListings: FarmerListingRecord[] = [
  ...fallbackListings,
  { id: 2, farmerKey: "demo-aggregation-pimpri", crop: "Tomatoes", quantityKg: 1000, location: "Pimpri-Chinchwad, Pune", city: "Pimpri-Chinchwad", district: "Pune", state: "Maharashtra", locationSource: "demo", minimumPricePerKg: 22, status: "active", createdAt: "2026-09-01T08:10:00.000Z" },
  { id: 3, farmerKey: "demo-aggregation-pune", crop: "Tomatoes", quantityKg: 2500, location: "Pune, Maharashtra", city: "Pune", district: "Pune", state: "Maharashtra", locationSource: "demo", minimumPricePerKg: 23, status: "active", createdAt: "2026-09-01T08:20:00.000Z" },
  { id: 4, farmerKey: "demo-aggregation-baramati", crop: "Tomatoes", quantityKg: 3000, location: "Baramati, Pune", city: "Baramati", district: "Pune", state: "Maharashtra", locationSource: "demo", minimumPricePerKg: 21, status: "active", createdAt: "2026-09-01T08:30:00.000Z" },
  { id: 5, farmerKey: "demo-aggregation-lonavala", crop: "Tomatoes", quantityKg: 2800, location: "Lonavala, Pune", city: "Lonavala", district: "Pune", state: "Maharashtra", locationSource: "demo", minimumPricePerKg: 22, status: "active", createdAt: "2026-09-01T08:40:00.000Z" },
];

export function toPublicFarmerListing(record: FarmerListingRecord): FarmerListing {
  const { latitude: _latitude, longitude: _longitude, ...publicListing } = record;
  return publicListing;
}

function toDomain(row: typeof farmerListings.$inferSelect): FarmerListingRecord {
  return {
    id: row.id,
    farmerKey: row.farmerKey,
    crop: row.crop as FarmerListingRecord["crop"],
    quantityKg: row.quantityKg,
    location: row.location,
    city: row.city,
    district: row.district,
    state: row.state,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    locationSource: row.locationSource as FarmerListingRecord["locationSource"],
    minimumPricePerKg: row.minimumPricePerKg,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

export const farmerListingRepository = {
  async getById(id: number, farmerKey = "demo-farmer-krishna"): Promise<FarmerListingRecord | undefined> {
    const db = await getDb();
    if (!db) return fallbackListings.find(listing => listing.id === id && listing.farmerKey === farmerKey);
    const rows = await db.select().from(farmerListings).where(eq(farmerListings.id, id));
    const row = rows.find(candidate => candidate.farmerKey === farmerKey);
    return row ? toDomain(row) : fallbackListings.find(listing => listing.id === id && listing.farmerKey === farmerKey);
  },

  async list(farmerKey = "demo-farmer-krishna"): Promise<FarmerListing[]> {
    const db = await getDb();
    if (!db) return fallbackListings.filter(listing => listing.farmerKey === farmerKey).map(toPublicFarmerListing);
    const rows = await db.select().from(farmerListings).where(eq(farmerListings.farmerKey, farmerKey)).orderBy(desc(farmerListings.createdAt));
    return (rows.length ? rows.map(toDomain) : fallbackListings.filter(listing => listing.farmerKey === farmerKey)).map(toPublicFarmerListing);
  },

  async listActiveForAggregation(): Promise<FarmerListingRecord[]> {
    const db = await getDb();
    if (!db) return aggregationFallbackListings.filter(listing => listing.status === "active");
    const rows = await db.select().from(farmerListings).where(eq(farmerListings.status, "active"));
    return rows.length ? rows.map(toDomain) : aggregationFallbackListings.filter(listing => listing.status === "active");
  },

  async create(input: CreateFarmerListingInput): Promise<FarmerListing> {
    const farmerKey = input.farmerKey ?? "demo-farmer-krishna";
    const record: FarmerListingRecord = {
      id: nextFallbackId++,
      farmerKey,
      crop: input.crop,
      quantityKg: input.quantityKg,
      location: input.location,
      city: input.city,
      district: input.district,
      state: input.state,
      latitude: input.latitude,
      longitude: input.longitude,
      locationSource: input.locationSource ?? "manual",
      minimumPricePerKg: input.minimumPricePerKg,
      status: "active",
      createdAt: new Date().toISOString(),
    };
    const db = await getDb();
    if (!db) {
      fallbackListings.unshift(record);
      return toPublicFarmerListing(record);
    }
    const result = await db.insert(farmerListings).values({
      farmerKey,
      crop: input.crop,
      quantityKg: input.quantityKg,
      location: input.location,
      city: input.city,
      district: input.district,
      state: input.state,
      latitude: input.latitude,
      longitude: input.longitude,
      locationSource: input.locationSource ?? "manual",
      minimumPricePerKg: input.minimumPricePerKg,
      status: "active",
    });
    const insertedId = Number(result[0].insertId);
    const rows = await db.select().from(farmerListings).where(eq(farmerListings.id, insertedId));
    const inserted = rows.find(row => row.id === insertedId);
    if (!inserted) throw new Error("Created farmer listing could not be read back");
    return toPublicFarmerListing(toDomain(inserted));
  },
};
