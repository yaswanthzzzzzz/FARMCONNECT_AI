import type { Express, Request, Response } from "express";
import { marketPriceQuerySchema, marketPriceService } from "../services/marketPriceService";

export function registerMarketPriceRoutes(app: Express) {
  app.get("/api/market-prices", async (req: Request, res: Response, next) => {
    try {
      const parsed = marketPriceQuerySchema.safeParse({ crop: req.query.crop, location: req.query.location });
      if (!parsed.success) {
        res.status(400).json({ code: "VALIDATION_ERROR", message: "Provide a supported crop and a location of at least two characters.", issues: parsed.error.issues.map(issue => ({ path: issue.path, message: issue.message })) });
        return;
      }
      res.json(await marketPriceService.getReference(parsed.data));
    } catch (error) {
      next(error);
    }
  });
}
