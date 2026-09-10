import { z } from "zod";
import type { Crop, MarketPriceReference } from "@shared/types";
import { ENV } from "../_core/env";

const cropValues = ["Tomatoes", "Onions", "Potatoes", "Wheat", "Rice"] as const;
export const marketPriceQuerySchema = z.object({ crop: z.enum(cropValues), location: z.string().trim().min(2).max(128) });
export type MarketPriceQuery = z.infer<typeof marketPriceQuerySchema>;

const demoReferences: Record<Crop, { minPrice: number; maxPrice: number; modalPrice: number }> = {
  Tomatoes: { minPrice: 22, maxPrice: 26, modalPrice: 24 },
  Onions: { minPrice: 25, maxPrice: 31, modalPrice: 28 },
  Potatoes: { minPrice: 18, maxPrice: 24, modalPrice: 21 },
  Wheat: { minPrice: 29, maxPrice: 36, modalPrice: 32 },
  Rice: { minPrice: 34, maxPrice: 42, modalPrice: 38 },
};

function unavailable(crop: Crop, location: string, message: string): MarketPriceReference {
  const now = new Date().toISOString();
  return { crop, location, minPrice: 0, maxPrice: 0, modalPrice: 0, unit: "INR/kg", source: "Official mandi source", observedAt: now, retrievedAt: now, isLive: false, status: "unavailable", message };
}

function demo(crop: Crop, location: string): MarketPriceReference {
  const values = demoReferences[crop];
  const observedAt = "2026-09-09T00:00:00+05:30";
  return { crop, location, ...values, unit: "INR/kg", source: "AGMARKNET / official mandi reference (demo fallback)", observedAt, retrievedAt: new Date().toISOString(), isLive: false, status: "demo", message: "Market reference — demo data. This is indicative context, not a live quote or price guarantee." };
}

function normalizeUpstreamRecord(record: Record<string, unknown>, crop: Crop, location: string): MarketPriceReference | undefined {
  const number = (...keys: string[]) => {
    for (const key of keys) {
      const value = record[key];
      const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value.replace(/[^0-9.]/g, "")) : NaN;
      if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
  };
  const minPrice = number("min_price", "minPrice", "minimum_price");
  const maxPrice = number("max_price", "maxPrice", "maximum_price");
  const modalPrice = number("modal_price", "modalPrice", "modal");
  if (minPrice === undefined || maxPrice === undefined || modalPrice === undefined) return undefined;
  const observedAt = String(record.arrival_date ?? record.observedAt ?? record.date ?? new Date().toISOString());
  return { crop, location, minPrice, maxPrice, modalPrice, unit: "INR/kg", source: String(record.source ?? "AGMARKNET / data.gov.in"), observedAt, retrievedAt: new Date().toISOString(), isLive: true, status: "live", message: "Live official market reference. Indicative only; not a guaranteed selling price." };
}

async function fetchOfficialReference(query: MarketPriceQuery): Promise<MarketPriceReference | undefined> {
  if (!ENV.marketPriceApiUrl) return undefined;
  const url = new URL(ENV.marketPriceApiUrl);
  url.searchParams.set("crop", query.crop);
  url.searchParams.set("location", query.location);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetch(url, { headers: ENV.marketPriceApiKey ? { "x-api-key": ENV.marketPriceApiKey, "api-key": ENV.marketPriceApiKey } : undefined, signal: controller.signal });
    if (!response.ok) return undefined;
    const payload = await response.json() as { records?: Record<string, unknown>[] } | Record<string, unknown>;
    const records = Array.isArray((payload as { records?: Record<string, unknown>[] }).records) ? (payload as { records: Record<string, unknown>[] }).records : [payload as Record<string, unknown>];
    return records.map(record => normalizeUpstreamRecord(record, query.crop, query.location)).find(Boolean);
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}

export const marketPriceService = {
  async getReference(query: MarketPriceQuery) {
    const official = await fetchOfficialReference(query);
    if (official) return official;
    const knownLocation = /pune|nashik|mumbai|baramati|pimpri|khed/i.test(query.location);
    return knownLocation ? demo(query.crop, query.location) : unavailable(query.crop, query.location, "Live market price unavailable for this location, and no demo reference is configured.");
  },
};
