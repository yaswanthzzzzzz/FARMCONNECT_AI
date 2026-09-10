import { describe, expect, it } from "vitest";
import { routeLocationSchema, RouteService, fallbackRoute, type RouteProvider } from "./services/routeService";

const pune = { label: "Pune origin", city: "Pune", district: "Pune", state: "Maharashtra", latitude: 18.5204, longitude: 73.8567 };
const nashik = { label: "Nashik destination", city: "Nashik", district: "Nashik", state: "Maharashtra", latitude: 19.9975, longitude: 73.7898 };
const unknown = { label: "Unknown origin", city: "Unknown City", district: "Unknown", state: "Maharashtra" };

class StubProvider implements RouteProvider {
  readonly name = "test-provider";
  constructor(private readonly behavior: "success" | "error" | "malformed" | "timeout") {}
  async route({ signal }: { origin: typeof pune; destination: typeof nashik; signal: AbortSignal }) {
    if (this.behavior === "error") throw new Error("provider failed");
    if (this.behavior === "malformed") return { distanceKm: "not-a-number" } as never;
    if (this.behavior === "timeout") {
      await new Promise<void>((resolve, reject) => {
        signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
      });
      return undefined;
    }
    return { distanceKm: 211.4, durationMinutes: 325, summary: "Test road route" };
  }
}

describe("route service", () => {
  it("returns a typed provider result when the configured provider succeeds", async () => {
    const result = await new RouteService(new StubProvider("success")).getRoute(pune, nashik);
    expect(result).toMatchObject({ distanceKm: 211.4, durationMinutes: 325, routeAvailable: true, source: "ROUTING_PROVIDER", confidence: "high" });
  });

  it("falls back when the provider errors, times out, or returns malformed data", async () => {
    for (const behavior of ["error", "malformed", "timeout"] as const) {
      const result = await new RouteService(new StubProvider(behavior), 20).getRoute(pune, nashik);
      expect(result.routeAvailable).toBe(false);
      expect(result.source).toBe("STRAIGHT_LINE_ESTIMATE");
      expect(result.summary).toContain("not a live road route");
    }
  });

  it("uses the existing demo mapping when coordinates are absent", () => {
    const result = fallbackRoute({ ...pune, latitude: undefined, longitude: undefined }, { ...nashik, latitude: undefined, longitude: undefined });
    expect(result.source).toBe("DEMO_MAPPING");
    expect(result.routeAvailable).toBe(false);
    expect(result.durationMinutes).toBeUndefined();
  });

  it("returns unavailable instead of inventing a route for unknown locations", () => {
    const result = fallbackRoute(unknown, { ...unknown, label: "Unknown destination" });
    expect(result).toMatchObject({ source: "UNAVAILABLE", routeAvailable: false, distanceKm: 0, confidence: "unavailable" });
  });

  it("rejects invalid coordinate pairs and ranges", () => {
    expect(routeLocationSchema.safeParse({ ...pune, latitude: 91 }).success).toBe(false);
    expect(routeLocationSchema.safeParse({ ...pune, latitude: 18, longitude: undefined }).success).toBe(false);
    expect(routeLocationSchema.safeParse({ ...pune, longitude: undefined }).success).toBe(false);
  });
});
