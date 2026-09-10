import type { DemoLocation, DistanceEstimate } from "@shared/types";
import { isValidLatitude, isValidLongitude, locationSourceLabel } from "@shared/location";

type LocationLike = Pick<DemoLocation, "city" | "district" | "state"> & Partial<Pick<DemoLocation, "latitude" | "longitude">>;
const UNAVAILABLE_DISTANCE_PENALTY_KM = 10_000;

const demoCoordinates: Record<string, { latitude: number; longitude: number }> = {
  pune: { latitude: 18.5204, longitude: 73.8567 },
  "pimpri-chinchwad": { latitude: 18.6298, longitude: 73.7997 },
  khed: { latitude: 18.8333, longitude: 73.8833 },
  lonavala: { latitude: 18.7546, longitude: 73.4062 },
  nashik: { latitude: 19.9975, longitude: 73.7898 },
  baramati: { latitude: 18.1517, longitude: 74.5777 },
  mumbai: { latitude: 19.076, longitude: 72.8777 },
};

function keyFor(location: LocationLike) {
  return location.city.trim().toLowerCase().replace(/\s+/g, "-");
}

export function resolveLocationCoordinates(location: LocationLike) {
  if (typeof location.latitude === "number" && typeof location.longitude === "number" && isValidLatitude(location.latitude) && isValidLongitude(location.longitude)) {
    return { latitude: location.latitude, longitude: location.longitude, source: "coordinates" as const };
  }
  const mapped = demoCoordinates[keyFor(location)] ?? demoCoordinates[location.district.trim().toLowerCase().replace(/\s+/g, "-")];
  if (!mapped) return undefined;
  return { ...mapped, source: "demo-mapping" as const };
}

export function haversineDistanceKm(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }) {
  const earthRadiusKm = 6371;
  const radians = (degrees: number) => degrees * (Math.PI / 180);
  const deltaLatitude = radians(to.latitude - from.latitude);
  const deltaLongitude = radians(to.longitude - from.longitude);
  const latitudeA = radians(from.latitude);
  const latitudeB = radians(to.latitude);
  const value = Math.sin(deltaLatitude / 2) ** 2 + Math.sin(deltaLongitude / 2) ** 2 * Math.cos(latitudeA) * Math.cos(latitudeB);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function estimateDistance(from: LocationLike, to: LocationLike): DistanceEstimate {
  const fromCoordinates = resolveLocationCoordinates(from);
  const toCoordinates = resolveLocationCoordinates(to);
  if (!fromCoordinates || !toCoordinates) {
    return {
      distanceKm: UNAVAILABLE_DISTANCE_PENALTY_KM,
      source: "unavailable",
      sourceLabel: locationSourceLabel("unavailable"),
      isEstimate: true,
    };
  }
  const source = fromCoordinates.source === "coordinates" && toCoordinates.source === "coordinates" ? "coordinates" : "demo-mapping";
  return {
    distanceKm: Math.round(haversineDistanceKm(fromCoordinates, toCoordinates) * 10) / 10,
    source,
    sourceLabel: locationSourceLabel(source === "coordinates" ? "gps" : "demo"),
    isEstimate: true,
  };
}
