import type { Express, Request, Response } from "express";
import { createFarmerListingSchema, farmerListingService } from "../services/farmerListingService";
import { requireAuthenticatedUser } from "../_core/auth";

function numeric(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) return Number(value);
  return value;
}

function payloadFromRequest(req: Request) {
  return {
    ...req.body,
    quantityKg: numeric(req.body?.quantityKg),
    minimumPricePerKg: numeric(req.body?.minimumPricePerKg),
  };
}

export function registerFarmerRoutes(app: Express) {
  app.get("/api/farmers/listings", async (req, res, next) => {
    try {
      const user = await requireAuthenticatedUser(req);
      const listings = await farmerListingService.list(user.identityKey);
      res.json({ listings });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/farmers/listings", async (req: Request, res: Response, next) => {
    try {
      const user = await requireAuthenticatedUser(req);
      const parsed = createFarmerListingSchema.safeParse(payloadFromRequest(req));
      if (!parsed.success) {
        res.status(400).json({ code: "VALIDATION_ERROR", message: "Please correct the highlighted listing fields.", issues: parsed.error.issues.map(issue => ({ path: issue.path, message: issue.message })) });
        return;
      }
      const listing = await farmerListingService.create({ ...parsed.data, farmerKey: user.identityKey });
      res.status(201).json({ listing });
    } catch (error) {
      next(error);
    }
  });
}
