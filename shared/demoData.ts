import type { BuyerProfile, DemoMarketSnapshot, FarmerProfile } from "@shared/types";

export const demoFarmers: FarmerProfile[] = [
  { id: "farmer-krishna", name: "Krishna Patil", village: "Khed", location: { city: "Pune", district: "Pune", state: "Maharashtra", latitude: 18.52, longitude: 73.86 }, primaryCrop: "Tomatoes", availableQuantityKg: 850, expectedPricePerKg: 22, verified: true, initials: "KP" },
  { id: "farmer-sunita", name: "Sunita Devi", village: "Nashik Road", location: { city: "Nashik", district: "Nashik", state: "Maharashtra", latitude: 19.99, longitude: 73.79 }, primaryCrop: "Onions", availableQuantityKg: 1200, expectedPricePerKg: 27, verified: true, initials: "SD" },
  { id: "farmer-ramesh", name: "Ramesh Yadav", village: "Baramati", location: { city: "Baramati", district: "Pune", state: "Maharashtra", latitude: 18.15, longitude: 74.58 }, primaryCrop: "Wheat", availableQuantityKg: 2400, expectedPricePerKg: 31, verified: false, initials: "RY" },
];

export const demoBuyers: BuyerProfile[] = [
  { id: "buyer-sahyadri", name: "Sahyadri Fresh Markets", buyerType: "wholesaler", location: { city: "Pimpri-Chinchwad", district: "Pune", state: "Maharashtra", latitude: 18.63, longitude: 73.80 }, requiredCrop: "Tomatoes", requiredQuantityKg: 1000, offeredPricePerKg: 24, verified: true, initials: "SF" },
  { id: "buyer-greenbasket", name: "GreenBasket Retail", buyerType: "retailer", location: { city: "Lonavala", district: "Pune", state: "Maharashtra", latitude: 18.7546, longitude: 73.4062 }, requiredCrop: "Tomatoes", requiredQuantityKg: 1000, offeredPricePerKg: 26, verified: true, initials: "GB" },
  { id: "buyer-annapurna", name: "Annapurna Foods Co-op", buyerType: "processor", location: { city: "Nashik", district: "Nashik", state: "Maharashtra", latitude: 19.99, longitude: 73.79 }, requiredCrop: "Onions", requiredQuantityKg: 2000, offeredPricePerKg: 29, verified: true, initials: "AF" },
  { id: "buyer-midday", name: "Midday Kitchens Network", buyerType: "institution", location: { city: "Pune", district: "Pune", state: "Maharashtra", latitude: 18.52, longitude: 73.86 }, requiredCrop: "Wheat", requiredQuantityKg: 1500, offeredPricePerKg: 33, verified: false, initials: "MK" },
];

export const demoMarketSnapshot: DemoMarketSnapshot = { farmers: demoFarmers, buyers: demoBuyers, supportedCrops: ["Tomatoes", "Onions", "Potatoes", "Wheat", "Rice"], lastUpdatedLabel: "Demo data · refreshed for walkthrough" };
