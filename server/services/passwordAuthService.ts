import argon2 from "argon2";
import { z } from "zod";
import { getPasswordCredentialByUsername, getUserByIdentityKey, updatePasswordLogin, createPasswordUser } from "../db";
import { enforceCredentialRateLimit } from "../_core/rateLimit";

const RESERVED_USERNAMES = new Set(["admin", "administrator", "api", "farmer", "buyer", "demo", "support", "system", "root"]);
const COMMON_PASSWORDS = new Set(["password", "password123", "1234567890", "qwertyuiop", "letmein123", "welcome123"]);

// TODO(Phase 5.7): add verified-email or support-mediated password reset with hashed, single-use tokens.

export const usernameSchema = z.string().trim().min(3).max(32).regex(/^[A-Za-z0-9_]+$/, "Use 3–32 letters, numbers, or underscores.");
export const passwordSchema = z.string().min(10, "Use at least 10 characters.").max(256);
export const registerCredentialsSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).superRefine((input, ctx) => {
  if (input.password !== input.confirmPassword) ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "Passwords do not match." });
});
export const loginCredentialsSchema = z.object({ username: usernameSchema, password: z.string().min(1).max(256) });

export function normalizeUsername(username: string) {
  const normalized = username.trim().toLowerCase();
  if (RESERVED_USERNAMES.has(normalized)) throw new Error("That username is reserved.");
  return normalized;
}

function validatePassword(password: string) {
  if (COMMON_PASSWORDS.has(password.toLowerCase())) throw new Error("Choose a less common password.");
}

export async function registerPasswordAccount(input: z.infer<typeof registerCredentialsSchema>, rateLimitKey: string) {
  const parsed = registerCredentialsSchema.parse(input);
  const usernameNormalized = normalizeUsername(parsed.username);
  validatePassword(parsed.password);
  enforceCredentialRateLimit(`register:${rateLimitKey}`);
  const passwordHash = await argon2.hash(parsed.password, { type: argon2.argon2id });
  try {
    return await createPasswordUser({ usernameNormalized, usernameDisplay: parsed.username.trim(), passwordHash });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error && String((error as { code?: unknown }).code) === "ER_DUP_ENTRY") {
      throw new Error("That username is already in use.");
    }
    throw error;
  }
}

export async function authenticatePassword(input: z.infer<typeof loginCredentialsSchema>, rateLimitKey: string) {
  const parsed = loginCredentialsSchema.parse(input);
  const usernameNormalized = normalizeUsername(parsed.username);
  enforceCredentialRateLimit(rateLimitKey);
  const credential = await getPasswordCredentialByUsername(usernameNormalized);
  if (!credential || credential.disabledAt) throw new Error("Invalid username or password.");
  const valid = await argon2.verify(credential.passwordHash, parsed.password).catch(() => false);
  if (!valid) throw new Error("Invalid username or password.");
  const user = await getUserByIdentityKey(credential.identityKey);
  if (!user) throw new Error("Invalid username or password.");
  await updatePasswordLogin(credential.id);
  return user;
}
