export type UserRole = "farmer" | "buyer" | "admin";

export type Crop = "Tomatoes" | "Onions" | "Potatoes" | "Wheat" | "Rice";

export type DemoLocation = {
  city: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
};

export type FarmerProfile = {
  id: string;
  name: string;
  village: string;
  location: DemoLocation;
  primaryCrop: Crop;
  availableQuantityKg: number;
  expectedPricePerKg: number;
  verified: boolean;
  initials: string;
};

export type BuyerProfile = {
  id: string;
  name: string;
  buyerType: "wholesaler" | "retailer" | "processor" | "institution";
  location: DemoLocation;
  requiredCrop: Crop;
  requiredQuantityKg: number;
  offeredPricePerKg: number;
  verified: boolean;
  initials: string;
};

export type ProduceListingDraft = {
  crop: Crop;
  quantityKg: number;
  location: string;
  minimumPricePerKg: number;
};

export type FarmerListingStatus = "active" | "archived";

export type FarmerListing = {
  id: number;
  farmerKey: string;
  crop: Crop;
  quantityKg: number;
  location: string;
  city: string;
  district: string;
  state: string;
  minimumPricePerKg: number;
  status: FarmerListingStatus;
  createdAt: string;
};

export type CreateFarmerListingInput = {
  farmerKey?: string;
  crop: Crop;
  quantityKg: number;
  location: string;
  city: string;
  district: string;
  state: string;
  minimumPricePerKg: number;
};

export type DemoMarketSnapshot = {
  farmers: FarmerProfile[];
  buyers: BuyerProfile[];
  supportedCrops: Crop[];
  lastUpdatedLabel: string;
};

export type ApiErrorShape = {
  code: string;
  message: string;
  requestId?: string;
};

export type DistanceEstimate = {
  distanceKm: number;
  source: "coordinates" | "demo-mapping";
  isEstimate: true;
};

export type TransportConfig = {
  costPerKm: number;
  loadFactor: number;
  currency: "INR";
};

export type MatchExplanationData = {
  netOutcomeRank: number;
  priceRank: number;
  quantityFulfillmentPercent: number;
  logisticsEfficiencyPercent: number;
  matchedQuantityNote: string;
  tradeoffNote: string;
};

export type BuyerMatchResult = {
  buyer: BuyerProfile;
  compatible: true;
  matchedQuantityKg: number;
  distance: DistanceEstimate;
  grossRevenue: number;
  estimatedTransportCost: number;
  estimatedNetOutcome: number;
  quantityFulfillmentPercent: number;
  matchScore: number;
  recommendation: "recommended" | "alternative";
  explanationData: MatchExplanationData;
};

export type MatchResponse = {
  listing: FarmerListing;
  matches: BuyerMatchResult[];
  recommendedMatchId?: string;
  transportConfig: TransportConfig;
  message: string;
};

export type BuyerRequirementStatus = "active" | "archived";

export type BuyerRequirement = {
  id: number;
  buyerKey: string;
  crop: Crop;
  requiredQuantityKg: number;
  location: string;
  city: string;
  district: string;
  state: string;
  offeredPricePerKg: number;
  status: BuyerRequirementStatus;
  createdAt: string;
};

export type CreateBuyerRequirementInput = {
  buyerKey?: string;
  crop: Crop;
  requiredQuantityKg: number;
  location: string;
  city: string;
  district: string;
  state: string;
  offeredPricePerKg: number;
};

export type MarketPriceReference = {
  crop: Crop;
  location: string;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
  unit: "INR/kg";
  source: string;
  observedAt: string;
  retrievedAt: string;
  isLive: boolean;
  status: "live" | "demo" | "unavailable";
  message: string;
};

export type BuyerSupplyMatch = {
  farmer: FarmerProfile;
  compatible: boolean;
  distanceKm: number;
  distanceSource: "coordinates" | "demo-mapping";
  estimatedTransportCost: number;
  availableQuantityKg: number;
  matchedQuantityKg: number;
  expectedPricePerKg: number;
  potentialAggregation: boolean;
  compatibilityReason: string;
};

export type BuyerMatchResponse = {
  requirement: BuyerRequirement;
  matches: BuyerSupplyMatch[];
  totalCompatibleSupplyKg: number;
  aggregationAvailable: boolean;
  message: string;
};
