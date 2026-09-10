import type { AggregationExplanationInput } from "@shared/types";
import { invokeLLM } from "../_core/llm";
import { ENV } from "../_core/env";

const explanationSchema = {
  name: "aggregation_explanation",
  strict: true,
  schema: {
    type: "object",
    properties: { explanation: { type: "string" } },
    required: ["explanation"],
    additionalProperties: false,
  },
};

function deterministicExplanation(input: AggregationExplanationInput) {
  const { plan, requirement } = input;
  if (plan.fulfilmentType === "partial") {
    return `This plan identifies ${plan.plannedQuantityKg.toLocaleString("en-IN")} kg of compatible ${requirement.crop} supply for a ${plan.requiredQuantityKg.toLocaleString("en-IN")} kg requirement. It is labelled partial fulfilment because ${plan.remainingQuantityKg.toLocaleString("en-IN")} kg remains uncovered. The estimate uses ${plan.contributingFarmerCount} contributing farms and ₹${plan.transportCost.toLocaleString("en-IN")} of collective logistics.`;
  }
  return `This plan fulfils ${plan.plannedQuantityKg.toLocaleString("en-IN")} kg using ${plan.contributingFarmerCount} compatible farms and ranked highest because it reaches full fulfilment with an estimated net outcome of ₹${plan.estimatedNetOutcome.toLocaleString("en-IN")} after ₹${plan.transportCost.toLocaleString("en-IN")} of collective logistics.`;
}

function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map(part => typeof part === "string" ? part : (part as { text?: string }).text ?? "").join(" ");
  return "";
}

export const aggregationExplanationService = {
  fallback(input: AggregationExplanationInput) {
    return { text: deterministicExplanation(input), source: "deterministic" as const };
  },

  async explain(input: AggregationExplanationInput, allowModel = true) {
    const fallback = this.fallback(input);
    if (!allowModel || !ENV.forgeApiKey) return fallback;
    try {
      const result = await invokeLLM({
        model: "gpt-5-mini",
        maxTokens: 300,
        responseFormat: { type: "json_schema", json_schema: explanationSchema },
        messages: [
          { role: "system", content: "Explain a deterministic agricultural fulfilment recommendation in plain, concise language. Use only the supplied facts. Never recalculate, rank, invent numbers, or imply farmer acceptance." },
          { role: "user", content: JSON.stringify(input) },
        ],
      });
      const raw = extractText(result.choices[0]?.message?.content);
      const parsed = JSON.parse(raw) as { explanation?: unknown };
      if (typeof parsed.explanation !== "string" || parsed.explanation.trim().length < 20 || parsed.explanation.length > 600) return fallback;
      return { text: parsed.explanation.trim(), source: "openai" as const };
    } catch (error) {
      console.warn("[Aggregation explanation] Falling back to deterministic explanation:", error instanceof Error ? error.message : error);
      return fallback;
    }
  },
};
