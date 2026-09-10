import { z } from "zod";
import type { FarmerListing, MatchResponse } from "@shared/types";
import { farmerListingRepository } from "../repositories/farmerListingRepository";
import { marketRepository } from "../repositories/marketRepository";
import { buildMatchResponse } from "./matchingService";

const directListingSchema = z.object({
  id: z.number().int().positive(),
  farmerKey: z.string().min(1),
  crop: z.enum(["Tomatoes", "Onions", "Potatoes", "Wheat", "Rice"]),
  quantityKg: z.number().int().positive(),
  location: z.string().min(2),
  city: z.string().min(2),
  district: z.string().min(2),
  state: z.string().min(2),
  latitude: z.number().finite().min(-90).max(90).optional(),
  longitude: z.number().finite().min(-180).max(180).optional(),
  locationSource: z.enum(["gps", "manual", "demo", "unavailable"]).default("manual"),
  minimumPricePerKg: z.number().int().positive(),
  status: z.enum(["active", "archived"]),
  createdAt: z.string(),
});

export const matchRequestSchema = z.object({
  listingId: z.number().int().positive().optional(),
  farmerKey: z.string().min(1).optional(),
  listing: directListingSchema.optional(),
}).refine(input => Boolean(input.listingId || input.listing), { message: "Provide a listingId or a complete farmer listing." });

export type MatchRequest = z.infer<typeof matchRequestSchema>;

export async function resolveListing(input: MatchRequest): Promise<FarmerListing> {
  if (input.listing) return input.listing;
  const listing = await farmerListingRepository.getById(input.listingId!, input.farmerKey);
  if (!listing) throw new Error("Farmer listing was not found.");
  return listing;
}

export const matchService = {
  async calculate(input: MatchRequest): Promise<MatchResponse> {
    const listing = await resolveListing(input);
    const buyers = await marketRepository.listBuyers();
    return buildMatchResponse(listing, buyers);
  },
};
