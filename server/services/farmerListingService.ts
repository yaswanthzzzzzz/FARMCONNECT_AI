import { z } from "zod";
import type { CreateFarmerListingInput } from "@shared/types";
import { farmerListingRepository } from "../repositories/farmerListingRepository";

export const createFarmerListingSchema = z.object({
  farmerKey: z.string().min(1).max(128).optional(),
  crop: z.enum(["Tomatoes", "Onions", "Potatoes", "Wheat", "Rice"]),
  quantityKg: z.number().finite().int().positive("Quantity must be greater than 0 kg."),
  location: z.string().trim().min(2, "Add a farm location."),
  city: z.string().trim().min(2, "Add a city."),
  district: z.string().trim().min(2, "Add a district."),
  state: z.string().trim().min(2, "Add a state."),
  latitude: z.number().finite().min(-90).max(90).optional(),
  longitude: z.number().finite().min(-180).max(180).optional(),
  locationSource: z.enum(["gps", "manual", "demo", "unavailable"]).default("manual"),
  minimumPricePerKg: z.number().finite().int().positive("Minimum price must be greater than ₹0/kg."),
}).superRefine((value, context) => {
  if ((value.latitude === undefined) !== (value.longitude === undefined)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["latitude"], message: "Latitude and longitude must be provided together." });
  }
  if (value.locationSource === "gps" && value.latitude === undefined) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["locationSource"], message: "GPS location requires valid coordinates." });
  }
});

export type CreateFarmerListingPayload = z.infer<typeof createFarmerListingSchema>;

export const farmerListingService = {
  async list(farmerKey?: string) {
    return farmerListingRepository.list(farmerKey);
  },

  async create(input: CreateFarmerListingInput) {
    const validated = createFarmerListingSchema.parse(input);
    return farmerListingRepository.create(validated);
  },
};
