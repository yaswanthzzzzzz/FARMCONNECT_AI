export const LOCATION_SOURCES = ["gps", "manual", "demo", "unavailable"] as const;
export type LocationSource = (typeof LOCATION_SOURCES)[number];

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export function isValidLatitude(latitude: number) {
  return Number.isFinite(latitude) && latitude >= -90 && latitude <= 90;
}

export function isValidLongitude(longitude: number) {
  return Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
}

export function validateCoordinates(input: Coordinates): Coordinates {
  if (!isValidLatitude(input.latitude) || !isValidLongitude(input.longitude)) {
    throw new Error("Location coordinates are outside the valid geographic range.");
  }
  return {
    latitude: Math.round(input.latitude * 1_000_000) / 1_000_000,
    longitude: Math.round(input.longitude * 1_000_000) / 1_000_000,
  };
}

export function locationSourceLabel(source: LocationSource) {
  switch (source) {
    case "gps": return "Distance based on GPS coordinates";
    case "manual": return "Distance estimated from manually entered location";
    case "demo": return "Distance estimated from location mapping";
    case "unavailable": return "Distance unavailable";
  }
}
