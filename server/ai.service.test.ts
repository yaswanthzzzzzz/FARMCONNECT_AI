import { describe, expect, it } from "vitest";
import { AIService } from "./services/ai/aiService";
import { buildAIContext } from "./services/ai/aiContext";
import type { AIContext } from "./services/ai/aiContext";
import type { AIProvider } from "./services/ai/aiProvider";
import { OpenRouterProvider } from "./services/ai/openRouterProvider";
import { demoService } from "./services/demoService";

const farmerContext: AIContext = {
  mode: "farmer",
  role: "farmer",
  facts: {
    listing: { crop: "Tomatoes", quantityKg: 850, location: "Pune", minimumPricePerKg: 22 },
    matches: [{ buyer: "Sahyadri Fresh Markets", estimatedNetOutcome: 19000, estimatedTransportCost: 500, distanceKm: 12, recommendation: "recommended" }],
    marketReference: { status: "demo", message: "Demo market reference" },
  },
};

class StubProvider implements AIProvider {
  readonly name = "stub";
  readonly model = "test-model";
  constructor(private readonly result: string | Error) {}
  async explain() {
    if (this.result instanceof Error) throw this.result;
    return this.result;
  }
}

describe("Phase 8 AI service", () => {
  it("uses deterministic fallback when the provider is unavailable", async () => {
    const service = new AIService(new StubProvider(new Error("provider unavailable")));
    const response = await service.explain(farmerContext, "Why was this buyer recommended?");
    expect(response.source).toBe("deterministic");
    expect(response.answer).toContain("Sahyadri Fresh Markets");
    expect(response.answer).toContain("deterministic");
  });

  it("falls back when OpenRouter has no server-side key", async () => {
    const service = new AIService(new OpenRouterProvider(""));
    const response = await service.explain(farmerContext, "Explain my result");
    expect(response.source).toBe("deterministic");
    expect(response.provider).toBeUndefined();
  });

  it("returns a typed provider response when the provider succeeds", async () => {
    const service = new AIService(new StubProvider("The result is explained from the supplied facts."));
    const response = await service.explain(farmerContext, "Explain my result");
    expect(response).toMatchObject({ source: "ai", provider: "stub", model: "test-model", answer: "The result is explained from the supplied facts." });
    expect(response.generatedAt).toBeTruthy();
  });

  it("rejects malformed provider output and falls back", async () => {
    const service = new AIService(new StubProvider("too short"));
    const response = await service.explain(farmerContext, "Explain my result");
    expect(response.source).toBe("deterministic");
    expect(response.answer).toContain("Sahyadri Fresh Markets");
  });

  it("builds demo context without exact coordinates", async () => {
    const context = await buildAIContext({ mode: "demo", demoFarmerIndex: 0, demoBuyerIndex: 0, message: "Explain this path" });
    const serialized = JSON.stringify(context);
    expect(context.mode).toBe("demo");
    expect(context.facts.marketReference).toMatchObject({ status: "demo" });
    expect(serialized).not.toContain("18.52");
    expect(serialized).not.toContain("73.86");
  });

  it("keeps deterministic demo matching and aggregation unchanged when AI is called", async () => {
    const before = await demoService.explore({ farmerIndex: 0, buyerIndex: 0 });
    await buildAIContext({ mode: "demo", demoFarmerIndex: 0, demoBuyerIndex: 0, message: "Explain aggregation" });
    const after = await demoService.explore({ farmerIndex: 0, buyerIndex: 0 });
    expect(after.matches.matches.map(match => [match.buyer.id, match.matchScore, match.estimatedNetOutcome])).toEqual(before.matches.matches.map(match => [match.buyer.id, match.matchScore, match.estimatedNetOutcome]));
    expect(after.aggregation.recommendedPlan?.plannedQuantityKg).toBe(before.aggregation.recommendedPlan?.plannedQuantityKg);
    expect(after.aggregation.recommendedPlan?.estimatedNetOutcome).toBe(before.aggregation.recommendedPlan?.estimatedNetOutcome);
  });
});
