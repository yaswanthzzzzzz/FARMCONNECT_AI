import { marketRepository } from "../repositories/marketRepository";

export const marketService = {
  async getDemoSnapshot() {
    return marketRepository.getSnapshot();
  },
};
