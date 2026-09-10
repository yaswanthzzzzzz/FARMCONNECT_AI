import type { Express, Request, Response } from "express";
import { matchRequestSchema, matchService } from "../services/matchService";
import { requireAuthenticatedUser } from "../_core/auth";

export function registerMatchRoutes(app: Express) {
  app.post("/api/matches", async (req: Request, res: Response, next) => {
    try {
      const user = await requireAuthenticatedUser(req);
      const body = { ...req.body, listingId: typeof req.body?.listingId === "string" ? Number(req.body.listingId) : req.body?.listingId };
      const parsed = matchRequestSchema.safeParse(body);
      if (!parsed.success) {
        res.status(400).json({ code: "VALIDATION_ERROR", message: "Provide a valid saved farmer listing for matching.", issues: parsed.error.issues.map(issue => ({ path: issue.path, message: issue.message })) });
        return;
      }
      res.status(200).json(await matchService.calculate({ ...parsed.data, farmerKey: user.openId }));
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        res.status(404).json({ code: "LISTING_NOT_FOUND", message: error.message });
        return;
      }
      next(error);
    }
  });
}
