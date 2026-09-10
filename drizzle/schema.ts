import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const farmerListings = mysqlTable("farmerListings", {
  id: int("id").autoincrement().primaryKey(),
  farmerKey: varchar("farmerKey", { length: 128 }).notNull().default("demo-farmer-krishna"),
  crop: varchar("crop", { length: 64 }).notNull(),
  quantityKg: int("quantityKg").notNull(),
  location: varchar("location", { length: 255 }).notNull(),
  city: varchar("city", { length: 128 }).notNull(),
  district: varchar("district", { length: 128 }).notNull(),
  state: varchar("state", { length: 128 }).notNull(),
  minimumPricePerKg: int("minimumPricePerKg").notNull(),
  status: mysqlEnum("status", ["active", "archived"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FarmerListing = typeof farmerListings.$inferSelect;
export type InsertFarmerListing = typeof farmerListings.$inferInsert;

export const buyerRequirements = mysqlTable("buyerRequirements", {
  id: int("id").autoincrement().primaryKey(),
  buyerKey: varchar("buyerKey", { length: 128 }).notNull().default("demo-buyer-sahyadri"),
  crop: varchar("crop", { length: 64 }).notNull(),
  requiredQuantityKg: int("requiredQuantityKg").notNull(),
  location: varchar("location", { length: 255 }).notNull(),
  city: varchar("city", { length: 128 }).notNull(),
  district: varchar("district", { length: 128 }).notNull(),
  state: varchar("state", { length: 128 }).notNull(),
  offeredPricePerKg: int("offeredPricePerKg").notNull(),
  status: mysqlEnum("status", ["active", "archived"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BuyerRequirementRow = typeof buyerRequirements.$inferSelect;
export type InsertBuyerRequirement = typeof buyerRequirements.$inferInsert;

export const aggregationPlans = mysqlTable("aggregationPlans", {
  id: int("id").autoincrement().primaryKey(),
  requirementId: int("requirementId").notNull(),
  buyerKey: varchar("buyerKey", { length: 128 }).notNull(),
  status: mysqlEnum("status", ["proposed", "selected", "expired", "cancelled"]).default("proposed").notNull(),
  fulfilmentType: mysqlEnum("fulfilmentType", ["full", "partial"]).notNull(),
  requiredQuantityKg: int("requiredQuantityKg").notNull(),
  plannedQuantityKg: int("plannedQuantityKg").notNull(),
  remainingQuantityKg: int("remainingQuantityKg").notNull(),
  offeredPricePerKg: int("offeredPricePerKg").notNull(),
  grossRevenue: int("grossRevenue").notNull(),
  transportCost: int("transportCost").notNull(),
  estimatedNetOutcome: int("estimatedNetOutcome").notNull(),
  totalDistanceKm: int("totalDistanceKm").notNull(),
  distanceMethod: varchar("distanceMethod", { length: 64 }).notNull(),
  logisticsSnapshot: text("logisticsSnapshot").notNull(),
  marketReferenceSnapshot: text("marketReferenceSnapshot"),
  algorithmVersion: varchar("algorithmVersion", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"),
});

export type AggregationPlanRow = typeof aggregationPlans.$inferSelect;
export type InsertAggregationPlan = typeof aggregationPlans.$inferInsert;

export const aggregationPlanContributions = mysqlTable("aggregationPlanContributions", {
  id: int("id").autoincrement().primaryKey(),
  planId: int("planId").notNull(),
  farmerListingId: int("farmerListingId").notNull(),
  farmerKey: varchar("farmerKey", { length: 128 }).notNull(),
  contributedQuantityKg: int("contributedQuantityKg").notNull(),
  minimumPricePerKg: int("minimumPricePerKg").notNull(),
  distanceKm: int("distanceKm").notNull(),
  estimatedTransportCost: int("estimatedTransportCost").notNull(),
  contributionOutcome: int("contributionOutcome").notNull(),
  sequence: int("sequence").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AggregationPlanContributionRow = typeof aggregationPlanContributions.$inferSelect;
export type InsertAggregationPlanContribution = typeof aggregationPlanContributions.$inferInsert;
