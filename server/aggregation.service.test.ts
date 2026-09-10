import { describe, expect, it } from "vitest";
import { aggregationService } from "./services/aggregationService";

describe("aggregation service", () => {
  it("calculates the demo full fulfilment path for the default buyer requirement", async () => {
    const base = await aggregationService.evaluateByRequirementId(1, "demo-buyer-sahyadri", undefined, false);
    const result = await aggregationService.evaluate({ ...base.requirement, requiredQuantityKg: 10000 }, undefined, false);
    expect(result.requirement.crop).toBe("Tomatoes");
    expect(result.recommendedPlan).toMatchObject({ fulfilmentType: "full", plannedQuantityKg: 10000, fulfilmentPercent: 100 });
    expect(result.recommendedPlan?.contributions).toHaveLength(5);
    expect(result.logisticsLabel).toMatch(/estimate/);
    expect(result.explanation.source).toBe("deterministic");
  });

  it("returns a structured not-found error for an invalid buyer requirement", async () => {
    await expect(aggregationService.evaluateByRequirementId(999999, "demo-buyer-sahyadri", undefined, false)).rejects.toThrow("not found");
  });

  it("persists and retrieves a proposed plan without implying farmer acceptance", async () => {
    const result = await aggregationService.evaluateByRequirementId(1, "demo-buyer-sahyadri", undefined, false);
    expect(result.recommendedPlan).toBeDefined();
    const saved = await aggregationService.persistSelectedPlan(1, "demo-buyer-sahyadri", result.recommendedPlan!);
    expect(saved.status).toBe("proposed");
    expect(saved.contributions.length).toBeGreaterThan(0);
    expect(await aggregationService.getSavedPlan(saved.id!, "wrong-buyer")).toBeUndefined();
    expect(await aggregationService.getSavedPlan(saved.id!, "demo-buyer-sahyadri")).toMatchObject({ id: saved.id, requirementId: 1 });
  });
});
