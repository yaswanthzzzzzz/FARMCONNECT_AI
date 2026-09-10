import type { Express, Request, Response } from "express";
import { z } from "zod";
import { requireAuthenticatedUser } from "../_core/auth";
import { farmerListingRepository } from "../repositories/farmerListingRepository";
import { buyerRequirementRepository } from "../repositories/buyerRequirementRepository";
import { matchService } from "../services/matchService";
import { loadCandidates } from "../services/aggregationService";
import { demoTransportConfig, estimateTransportCost } from "../services/transportService";
import { routeService } from "../services/routeService";
import { resolveLocationCoordinates } from "../services/distanceService";

const querySchema = z.object({
  role: z.enum(["farmer", "buyer"]),
  listingId: z.coerce.number().int().positive().optional(),
  buyerId: z.string().trim().min(1).max(128).optional(),
  requirementId: z.coerce.number().int().positive().optional(),
  farmerListingId: z.coerce.number().int().positive().optional(),
}).superRefine((value, context) => {
  if (value.role === "farmer" && (!value.listingId || !value.buyerId)) context.addIssue({ code: z.ZodIssueCode.custom, message: "Farmer route requires listingId and buyerId." });
  if (value.role === "buyer" && (!value.requirementId || !value.farmerListingId)) context.addIssue({ code: z.ZodIssueCode.custom, message: "Buyer route requires requirementId and farmerListingId." });
});

function safeLocation(label: string, city: string, district: string, state: string, latitude?: number, longitude?: number) {
  return { label, city, district, state, latitude, longitude };
}

export function registerLogisticsRoutes(app: Express) {
  app.get("/api/logistics/route", async (req: Request, res: Response, next) => {
    try {
      const user = await requireAuthenticatedUser(req);
      const parsed = querySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({ code: "VALIDATION_ERROR", message: "Provide a valid owned route context.", issues: parsed.error.issues.map(issue => ({ path: issue.path, message: issue.message })) });
        return;
      }
      if (parsed.data.role !== user.role) {
        res.status(403).json({ code: "FORBIDDEN", message: "This route context does not match the authenticated role." });
        return;
      }

      let origin;
      let destination;
      if (parsed.data.role === "farmer") {
        const listing = await farmerListingRepository.getById(parsed.data.listingId!, user.identityKey);
        if (!listing) {
          res.status(404).json({ code: "LISTING_NOT_FOUND", message: "Farmer listing was not found." });
          return;
        }
        const match = (await matchService.calculate({ listingId: listing.id, farmerKey: user.identityKey })).matches.find(item => item.buyer.id === parsed.data.buyerId);
        if (!match) {
          res.status(404).json({ code: "BUYER_NOT_FOUND", message: "The requested buyer is not a compatible result for this listing." });
          return;
        }
        origin = safeLocation(listing.location, listing.city, listing.district, listing.state, listing.latitude, listing.longitude);
        destination = safeLocation(`${match.buyer.name} · ${match.buyer.location.city}`, match.buyer.location.city, match.buyer.location.district, match.buyer.location.state, match.buyer.location.latitude, match.buyer.location.longitude);
      } else {
        const requirement = await buyerRequirementRepository.getById(parsed.data.requirementId!, user.identityKey);
        if (!requirement) {
          res.status(404).json({ code: "REQUIREMENT_NOT_FOUND", message: "Buyer requirement was not found." });
          return;
        }
        const candidates = await loadCandidates(requirement);
        const candidate = candidates.find(item => item.listing.id === parsed.data.farmerListingId && item.compatible);
        if (!candidate) {
          res.status(404).json({ code: "FARMER_NOT_FOUND", message: "The requested farmer listing is not a compatible supply result." });
          return;
        }
        const coordinates = resolveLocationCoordinates(candidate.listing);
        origin = safeLocation(candidate.listing.location, candidate.listing.city, candidate.listing.district, candidate.listing.state, coordinates?.latitude, coordinates?.longitude);
        destination = safeLocation(requirement.location, requirement.city, requirement.district, requirement.state, requirement.latitude, requirement.longitude);
      }

      const route = await routeService.getRoute(origin, destination);
      const estimatedTransportCost = route.distanceKm > 0 ? estimateTransportCost(route.distanceKm, demoTransportConfig) : 0;
      res.json({ route, transport: { estimatedCost: estimatedTransportCost, source: route.routeAvailable ? "route-provider estimate" : route.source === "UNAVAILABLE" ? "unavailable" : "existing deterministic distance estimate", assumption: `${demoTransportConfig.costPerKm}/km demo transport assumption` } });
    } catch (error) {
      next(error);
    }
  });
}
