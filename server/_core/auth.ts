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
