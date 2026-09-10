import { z } from "zod";
import { ENV } from "../_core/env";
import { estimateDistance, type LocationLike } from "./distanceService";

export const routeLocationSchema = z.object({
  label: z.string().trim().min(2).max(255),
  city: z.string().trim().min(2).max(128),
  district: z.string().trim().min(2).max(128),
  state: z.string().trim().min(2).max(128),
  latitude: z.number().finite().min(-90).max(90).optional(),
  longitude: z.number().finite().min(-180).max(180).optional(),
}).superRefine((value, context) => {
  if ((value.latitude === undefined) !== (value.longitude === undefined)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["latitude"], message: "Latitude and longitude must be provided together." });
  }
});

export const routeRequestSchema = z.object({ origin: routeLocationSchema, destination: routeLocationSchema });
export type RouteLocation = z.infer<typeof routeLocationSchema>;
export type RouteSource = "ROUTING_PROVIDER" | "GPS" | "DEMO_MAPPING" | "STRAIGHT_LINE_ESTIMATE" | "UNAVAILABLE";
export type RouteConfidence = "high" | "medium" | "low" | "unavailable";
export type RouteResult = {
  distanceKm: number;
  durationMinutes?: number;
  routeAvailable: boolean;
  source: RouteSource;
  calculatedAt: string;
  confidence: RouteConfidence;
  originLabel: string;
  destinationLabel: string;
  summary: string;
};

export type RouteProvider = {
  readonly name: string;
  route(input: { origin: RouteLocation; destination: RouteLocation; signal: AbortSignal }): Promise<Pick<RouteResult, "distanceKm" | "durationMinutes" | "summary"> | undefined>;
};

function validProviderResult(result: Pick<RouteResult, "distanceKm" | "durationMinutes" | "summary"> | undefined) {
  if (!result || typeof result.distanceKm !== "number" || !Number.isFinite(result.distanceKm) || result.distanceKm < 0) return undefined;
  if (result.durationMinutes !== undefined && (typeof result.durationMinutes !== "number" || !Number.isFinite(result.durationMinutes) || result.durationMinutes < 0)) return undefined;
  return {
    distanceKm: Math.round(result.distanceKm * 10) / 10,
    durationMinutes: result.durationMinutes,
    summary: typeof result.summary === "string" ? result.summary.slice(0, 240) : "Configured routing provider estimate.",
  };
}

type ProviderPayload = { distanceKm?: unknown; durationMinutes?: unknown; summary?: unknown };

class ConfiguredRouteProvider implements RouteProvider {
  readonly name = "configured-routing-provider";
  constructor(private readonly endpoint: string, private readonly apiKey: string) {}

  async route(input: { origin: RouteLocation; destination: RouteLocation; signal: AbortSignal }) {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}) },
      body: JSON.stringify({
        origin: { label: input.origin.label, city: input.origin.city, district: input.origin.district, state: input.origin.state, latitude: input.origin.latitude, longitude: input.origin.longitude },
        destination: { label: input.destination.label, city: input.destination.city, district: input.destination.district, state: input.destination.state, latitude: input.destination.latitude, longitude: input.destination.longitude },
      }),
      signal: input.signal,
    });
    if (!response.ok) return undefined;
    const payload = await response.json() as ProviderPayload;
    const distanceKm = typeof payload.distanceKm === "number" && Number.isFinite(payload.distanceKm) && payload.distanceKm >= 0 ? payload.distanceKm : undefined;
    if (distanceKm === undefined) return undefined;
    const durationMinutes = typeof payload.durationMinutes === "number" && Number.isFinite(payload.durationMinutes) && payload.durationMinutes >= 0 ? payload.durationMinutes : undefined;
    return { distanceKm: Math.round(distanceKm * 10) / 10, durationMinutes, summary: typeof payload.summary === "string" ? payload.summary.slice(0, 240) : "Configured routing provider estimate." };
  }
}

function fallbackRoute(origin: RouteLocation, destination: RouteLocation): RouteResult {
  const distance = estimateDistance(origin as LocationLike, destination as LocationLike);
  const source: RouteSource = distance.source === "coordinates" ? "STRAIGHT_LINE_ESTIMATE" : distance.source === "demo-mapping" ? "DEMO_MAPPING" : "UNAVAILABLE";
  const available = source !== "UNAVAILABLE";
  return {
    distanceKm: available ? distance.distanceKm : 0,
    routeAvailable: false,
    source,
    calculatedAt: new Date().toISOString(),
    confidence: source === "STRAIGHT_LINE_ESTIMATE" ? "medium" : source === "DEMO_MAPPING" ? "low" : "unavailable",
    originLabel: origin.label,
    destinationLabel: destination.label,
    summary: source === "UNAVAILABLE" ? "Route information is unavailable, so transport cannot be estimated reliably." : source === "DEMO_MAPPING" ? "Distance uses the existing demo location mapping; this is not a live road route." : "Distance uses a straight-line geographic estimate; this is not a live road route or travel-time estimate.",
  };
}

export class RouteService {
  constructor(private readonly provider?: RouteProvider, private readonly timeoutMs = 4500) {}

  async getRoute(origin: RouteLocation, destination: RouteLocation): Promise<RouteResult> {
    const fallback = fallbackRoute(origin, destination);
    if (!this.provider) return fallback;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const result = validProviderResult(await this.provider.route({ origin, destination, signal: controller.signal }));
      if (!result) return fallback;
      return { ...result, routeAvailable: true, source: "ROUTING_PROVIDER", calculatedAt: new Date().toISOString(), confidence: "high", originLabel: origin.label, destinationLabel: destination.label };
    } catch {
      return fallback;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function configuredProvider(): RouteProvider | undefined {
  if (!ENV.routeProviderUrl) return undefined;
  try {
    const endpoint = new URL(ENV.routeProviderUrl);
    if (endpoint.protocol !== "https:") return undefined;
    return new ConfiguredRouteProvider(endpoint.toString(), ENV.routeProviderApiKey);
  } catch {
    return undefined;
  }
}

export const routeService = new RouteService(configuredProvider());
export { fallbackRoute };
