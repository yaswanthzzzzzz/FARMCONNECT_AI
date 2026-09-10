import { describe, expect, it } from "vitest";
import { marketPriceQuerySchema, marketPriceService } from "./services/marketPriceService";
import { ENV } from "./_core/env";

describe("market price reference service", () => {
  it("returns clearly labeled demo context for a known Indian market location when live source is unavailable", async () => {
    const reference = await marketPriceService.getReference({ crop: "Tomatoes", location: "Pune" });
    expect(reference.status).toBe("demo");
    expect(reference.isLive).toBe(false);
    expect(reference.source).toContain("AGMARKNET");
    expect(reference.message).toContain("demo data");
    expect(reference.observedAt).toBeTruthy();
    expect(reference.retrievedAt).toBeTruthy();
  });

  it("returns an unavailable state instead of inventing a price for an unknown location", async () => {
    const reference = await marketPriceService.getReference({ crop: "Tomatoes", location: "Unknown Mandi" });
    expect(reference.status).toBe("unavailable");
    expect(reference.isLive).toBe(false);
    expect(reference.minPrice).toBe(0);
  });

  it("validates crop and location at the query boundary", () => {
    expect(marketPriceQuerySchema.safeParse({ crop: "Invalid", location: "Pune" }).success).toBe(false);
    expect(marketPriceQuerySchema.safeParse({ crop: "Tomatoes", location: "" }).success).toBe(false);
  });

  it("falls back when the configured market provider URL is malformed", async () => {
    const previousUrl = ENV.marketPriceApiUrl;
    ENV.marketPriceApiUrl = "not-a-url";
    try {
      const reference = await marketPriceService.getReference({ crop: "Tomatoes", location: "Pune" });
      expect(reference.status).toBe("demo");
      expect(reference.isLive).toBe(false);
    } finally {
      ENV.marketPriceApiUrl = previousUrl;
    }
  });
});
