import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { passwordCredentials, type InsertPasswordCredential, type InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';
import { randomUUID } from "node:crypto";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for OAuth upsert");
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values: InsertUser = {
      openId: user.openId,
      identityKey: user.identityKey ?? user.openId,
    };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByIdentityKey(identityKey: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.identityKey, identityKey)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserRole(identityKey: string, role: "farmer" | "buyer") {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot persist role: database not available");
    return;
  }
  await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.identityKey, identityKey));
}

export async function getPasswordCredentialByUsername(usernameNormalized: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select({ credential: passwordCredentials, identityKey: users.identityKey })
    .from(passwordCredentials)
    .innerJoin(users, eq(passwordCredentials.userId, users.id))
    .where(eq(passwordCredentials.usernameNormalized, usernameNormalized))
    .limit(1);
  const row = result[0];
  return row ? { ...row.credential, identityKey: row.identityKey } : undefined;
}

export async function updatePasswordLogin(credentialId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(passwordCredentials).set({ lastPasswordLoginAt: new Date() }).where(eq(passwordCredentials.id, credentialId));
}

export async function createPasswordUser(input: Pick<InsertPasswordCredential, "usernameNormalized" | "usernameDisplay" | "passwordHash">) {
  const db = await getDb();
  if (!db) throw new Error("Password authentication requires database configuration.");
  return db.transaction(async tx => {
    const identityKey = `user_${randomUUID()}`;
    const userResult = await tx.insert(users).values({ openId: null, identityKey, loginMethod: "password", role: "user" });
    const userId = Number(userResult[0].insertId);
    await tx.insert(passwordCredentials).values({ ...input, userId });
    const created = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!created[0]) throw new Error("Password account could not be created.");
    return created[0];
  });
}
