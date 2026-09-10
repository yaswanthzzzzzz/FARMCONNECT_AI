import type { Express, Request, Response } from "express";
import { z } from "zod";
import { requireAuthenticatedUser, assertSameOrigin } from "../_core/auth";
import { aiService } from "../services/ai/aiService";
import { buildAIContext, sanitizeQuestion } from "../services/ai/aiContext";

const requestSchema = z.object({
  mode: z.enum(["farmer", "buyer", "demo"]),
  listingId: z.number().int().positive().optional(),
  requirementId: z.number().int().positive().optional(),
  demoFarmerIndex: z.number().int().min(0).max(2).optional(),
  demoBuyerIndex: z.number().int().min(0).max(3).optional(),
  message: z.string().trim().min(3).max(1200),
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(1200) })).max(6).optional(),
});

const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;

function allowed(key: string) {
  const now = Date.now();
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (current.count >= MAX_REQUESTS) return false;
  current.count += 1;
  return true;
}

export function registerAIRoutes(app: Express) {
  app.post("/api/ai/chat", async (req: Request, res: Response, next) => {
    try {
      assertSameOrigin(req);
      if (JSON.stringify(req.body ?? {}).length > 24_000) {
        res.status(413).json({ code: "REQUEST_TOO_LARGE", message: "AI request is too large." });
        return;
      }
      const parsed = requestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ code: "VALIDATION_ERROR", message: "Provide a supported AI question and context.", issues: parsed.error.issues.map(issue => ({ path: issue.path, message: issue.message })) });
        return;
      }
      const user = parsed.data.mode === "demo" ? null : await requireAuthenticatedUser(req);
      const rateKey = user?.identityKey ?? req.ip ?? "anonymous-demo";
      if (!allowed(rateKey)) {
        res.status(429).json({ code: "RATE_LIMITED", message: "Please wait before asking FarmConnect again." });
        return;
      }
      const context = await buildAIContext({ ...parsed.data, message: sanitizeQuestion(parsed.data.message) }, user);
      const response = parsed.data.messages?.length
        ? await aiService.chat(context, parsed.data.messages)
        : await aiService.explain(context, sanitizeQuestion(parsed.data.message));
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  });
}
