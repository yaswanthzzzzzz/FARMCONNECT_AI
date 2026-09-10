import type { AIContext } from "./aiContext";
import type { AIMessage, AIProvider, AIResponse } from "./aiProvider";
import { OpenRouterProvider } from "./openRouterProvider";

function money(value: unknown) {
  return typeof value === "number" ? `₹${value.toLocaleString("en-IN")}` : "an unavailable amount";
}

function deterministicFallback(context: AIContext, question: string): string {
  const facts = context.facts as Record<string, any>;
  const lower = question.toLowerCase();
  if (context.mode === "demo") {
    const recommended = facts.matches?.find((match: any) => match.recommendation === "recommended") ?? facts.matches?.[0];
    if (lower.includes("market")) return facts.marketReference?.status === "demo" ? "The market figures shown are demo/reference data, not a live quote or guaranteed selling price." : "A current market reference is unavailable in this demo context.";
    if (lower.includes("distance") || lower.includes("transport")) return recommended ? `${recommended.buyer} is shown with a ${recommended.distanceKm} km estimated distance and ${money(recommended.estimatedTransportCost)} transport estimate. These deterministic estimates help explain the trade-off; they do not change the recommendation.` : "Distance and transport context is unavailable for this demo selection.";
    if (facts.aggregation) return `FarmConnect calculates this demo aggregation from compatible sample supply. The plan covers ${facts.aggregation.plannedQuantityKg.toLocaleString("en-IN")} of ${facts.aggregation.requiredQuantityKg.toLocaleString("en-IN")} kg and uses ${facts.aggregation.contributingFarmerCount} sample farmer contribution${facts.aggregation.contributingFarmerCount === 1 ? "" : "s"}.`;
    return recommended ? `${recommended.buyer} is currently recommended by the deterministic demo calculation, which considers compatibility, quantity, distance, transport, and estimated net outcome.` : "The demo has no compatible recommendation for this selection.";
  }
  if (context.role === "farmer") {
    const recommended = facts.matches?.find((match: any) => match.recommendation === "recommended") ?? facts.matches?.[0];
    if (lower.includes("market")) return facts.marketReference?.status === "demo" ? "The market reference is demo data and should be treated as indicative context, not today's guaranteed price." : facts.marketReference?.status === "unavailable" ? "A current market reference is unavailable for this listing, so it is not used as a live price claim." : `The live market reference is ${facts.marketReference.modalPrice} ${facts.marketReference.unit} from ${facts.marketReference.source}.`;
    if (lower.includes("distance") || lower.includes("transport")) return recommended ? `${recommended.buyer} is estimated at ${recommended.distanceKm} km with ${money(recommended.estimatedTransportCost)} transport. FarmConnect keeps this logistics estimate visible when comparing outcomes.` : "Distance and transport context is unavailable for the current matching result.";
    return recommended ? `${recommended.buyer} is currently ranked highest by the deterministic matching engine. Its estimated net outcome is ${money(recommended.estimatedNetOutcome)} after estimated transport; the AI explains this result but does not recalculate or change it.` : "No compatible buyer recommendation is currently available.";
  }
  const plan = facts.aggregation;
  if (lower.includes("market")) return facts.marketReference?.status === "demo" ? "The market reference is demo/reference data, not a live quote or price guarantee." : facts.marketReference?.status === "unavailable" ? "A current market reference is unavailable for this requirement." : `The market reference is ${facts.marketReference.modalPrice} ${facts.marketReference.unit} from ${facts.marketReference.source}. It is context only.`;
  if (plan) return `The deterministic aggregation plan covers ${plan.plannedQuantityKg.toLocaleString("en-IN")} of ${plan.requiredQuantityKg.toLocaleString("en-IN")} kg using ${plan.contributingFarmerCount} compatible farmer contribution${plan.contributingFarmerCount === 1 ? "" : "s"}. Estimated shared transport is ${money(plan.transportCost)}. AI explains this plan and cannot alter farmer selection or quantities.`;
  return facts.matches?.length ? `FarmConnect found ${facts.matches.length} compatible farmer profile${facts.matches.length === 1 ? "" : "s"} with ${facts.compatibleSupplyKg.toLocaleString("en-IN")} kg of compatible supply. The deterministic engine remains the source of truth for fulfilment.` : "No compatible farmer supply is currently available for this requirement.";
}

export class AIService {
  constructor(private readonly provider: AIProvider = new OpenRouterProvider()) {}

  fallback(context: AIContext, question: string): AIResponse {
    return { answer: deterministicFallback(context, question), source: "deterministic", generatedAt: new Date().toISOString() };
  }

  async explain(context: AIContext, question: string): Promise<AIResponse> {
    const fallback = this.fallback(context, question);
    try {
      const answer = await this.provider.explain(context, question);
      if (answer.trim().length < 10 || answer.length > 1600) return fallback;
      return { answer, source: "ai", provider: this.provider.name, model: this.provider.model, generatedAt: new Date().toISOString() };
    } catch {
      return fallback;
    }
  }

  async chat(context: AIContext, messages: AIMessage[]): Promise<AIResponse> {
    const question = messages.filter(message => message.role === "user").at(-1)?.content ?? "Explain this FarmConnect result.";
    return this.explain(context, question);
  }
}

export const aiService = new AIService();
export { deterministicFallback };
