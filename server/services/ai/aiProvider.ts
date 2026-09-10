import type { AIContext } from "./aiContext";

export type AIMessage = { role: "user" | "assistant"; content: string };

export type AIResponse = {
  answer: string;
  source: "ai" | "deterministic";
  provider?: string;
  model?: string;
  generatedAt: string;
};

export interface AIProvider {
  readonly name: string;
  readonly model?: string;
  explain(context: AIContext, message: string): Promise<string>;
}
