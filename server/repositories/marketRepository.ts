import { demoBuyers, demoFarmers, demoMarketSnapshot } from "@shared/demoData";
import type { BuyerProfile, DemoMarketSnapshot, FarmerProfile } from "@shared/types";

/**
 * Demo repository for Phase 1. Production persistence can replace this module
 * without changing page or service contracts.
 */
export const marketRepository = {
  async listFarmers(): Promise<FarmerProfile[]> {
    return demoFarmers;
  },

  async listBuyers(): Promise<BuyerProfile[]> {
    return demoBuyers;
  },

  async getSnapshot(): Promise<DemoMarketSnapshot> {
    return demoMarketSnapshot;
  },
};
