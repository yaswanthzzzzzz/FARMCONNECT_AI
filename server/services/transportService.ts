import type { TransportConfig } from "@shared/types";

export const demoTransportConfig: TransportConfig = {
  costPerKm: 70,
  loadFactor: 1,
  currency: "INR",
};

export function estimateTransportCost(distanceKm: number, config: TransportConfig = demoTransportConfig) {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) throw new Error("Distance must be a non-negative number.");
  if (!Number.isFinite(config.costPerKm) || config.costPerKm < 0) throw new Error("Transport cost per km must be non-negative.");
  if (!Number.isFinite(config.loadFactor) || config.loadFactor <= 0) throw new Error("Transport load factor must be greater than zero.");
  return Math.round(distanceKm * config.costPerKm * config.loadFactor);
}
