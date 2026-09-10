import type { Request } from "express";
import type { AuthenticatedUser } from "./sdk";
import { sdk } from "./sdk";
import { UnauthorizedError } from "@shared/_core/errors";

export async function requireAuthenticatedUser(req: Request): Promise<AuthenticatedUser> {
  try {
    return await sdk.authenticateRequest(req);
  } catch {
    throw UnauthorizedError("Authentication is required for this workspace.");
  }
}

export function assertSameOrigin(req: Request) {
  const origin = req.headers.origin;
  if (!origin) return;
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol = typeof forwardedProto === "string" ? forwardedProto.split(",")[0]?.trim() || req.protocol : req.protocol;
  const expected = `${protocol}://${req.get("host")}`;
  if (origin !== expected) throw UnauthorizedError("Invalid request origin.");
}
