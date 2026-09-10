import { useState } from "react";
import { Info, Loader2, Send, Sparkles } from "lucide-react";
import { BadgePill, Surface } from "./DesignSystem";

type Props = {
  mode: "farmer" | "buyer" | "demo";
  listingId?: number;
  requirementId?: number;
  demoFarmerIndex?: number;
  demoBuyerIndex?: number;
  title?: string;
  description?: string;
  suggestions?: string[];
};

type Response = { answer: string; source: "ai" | "deterministic"; provider?: string; model?: string };

const defaultSuggestions = {
  farmer: ["Why was this buyer recommended?", "How does distance affect my outcome?", "Explain the market reference"],
  buyer: ["Why are these farmers matched?", "Can this requirement be fulfilled?", "Explain the logistics"],
  demo: ["Show me how FarmConnect decides", "Why is this path recommended?", "Explain aggregation simply"],
};

export function ContextualAI({ mode, listingId, requirementId, demoFarmerIndex, demoBuyerIndex, title = "Ask FarmConnect", description = "Get a plain-language explanation of the deterministic result.", suggestions }: Props) {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<Response | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const prompts = suggestions ?? defaultSuggestions[mode];

  async function ask(nextQuestion = question) {
    const message = nextQuestion.trim();
    if (!message || loading) return;
    setLoading(true);
    setError("");
    setQuestion(message);
    try {
      const result = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, listingId, requirementId, demoFarmerIndex, demoBuyerIndex, message }),
      });
      const payload = await result.json() as Response & { message?: string };
      if (!result.ok) throw new Error(payload.message ?? "FarmConnect Intelligence is unavailable right now.");
      setResponse(payload);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "FarmConnect Intelligence is unavailable right now.");
    } finally {
      setLoading(false);
    }
  }

  return <Surface className="border-l-4 border-l-[#7da260] bg-[#fbfdf8] p-5 sm:p-6"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#eaf5df] text-[#4f8848]"><Sparkles size={18} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><div className="text-xs font-bold uppercase tracking-[0.15em] text-[#6b8f60]">FarmConnect Intelligence</div><BadgePill tone={mode === "demo" ? "amber" : "green"}>{mode === "demo" ? "Demo-safe" : "Contextual help"}</BadgePill></div><h2 className="mt-2 text-xl font-bold tracking-[-0.03em] text-[#18332a]">{title}</h2><p className="mt-1 text-sm leading-6 text-[#718274]">{description}</p></div></div><div className="mt-5 flex flex-wrap gap-2">{prompts.map(prompt => <button key={prompt} type="button" onClick={() => void ask(prompt)} className="rounded-full border border-[#dbe9d4] bg-white px-3 py-2 text-left text-xs font-semibold text-[#39704d] transition hover:border-[#aace94] hover:bg-[#f2f9ec]">{prompt}</button>)}</div><div className="mt-4 flex gap-2"><input value={question} onChange={event => setQuestion(event.target.value)} onKeyDown={event => { if (event.key === "Enter") void ask(); }} maxLength={1200} placeholder="Ask about this result…" aria-label="Ask FarmConnect" className="min-w-0 flex-1 rounded-xl border border-[#dfeadd] bg-white px-3 py-2.5 text-sm text-[#294c38] outline-none ring-[#aace94] placeholder:text-[#9aab9f] focus:ring-2" /><button type="button" onClick={() => void ask()} disabled={loading || !question.trim()} aria-label="Ask question" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#28623f] text-white transition hover:bg-[#1b5e3c] disabled:cursor-not-allowed disabled:opacity-50">{loading ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}</button></div>{response && <div className="mt-4 rounded-2xl border border-[#dbe9d4] bg-white p-4"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#6b8f60]"><Info size={13} />{response.source === "ai" ? `AI explanation · ${response.provider ?? "provider"}` : "Deterministic explanation"}</div><p className="mt-2 text-sm leading-6 text-[#405d49]">{response.answer}</p></div>}{error && <div role="alert" className="mt-4 rounded-2xl border border-[#f0dfb6] bg-[#fffaf0] p-4 text-sm leading-6 text-[#765f2c]">{error} The deterministic FarmConnect workflow remains available.</div>}<p className="mt-4 text-[11px] leading-5 text-[#819086]">FarmConnect Intelligence explains application results. Matching, quantities, ranking, logistics and prices remain deterministic.</p></Surface>;
}
