import { useEffect } from "react";
import { ArrowRight, CheckCircle2, Leaf, LogOut, ShieldCheck } from "lucide-react";
import { Link, useLocation } from "wouter";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { ActionButton, AlertBanner, BadgePill, LoadingPanel, Surface } from "@/components/farmconnect/DesignSystem";

function safeReturnTo(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export default function Login() {
  const { user, loading, error, logout } = useAuth();
  const [, navigate] = useLocation();
  const returnTo = safeReturnTo(new URLSearchParams(window.location.search).get("returnTo"));

  useEffect(() => {
    if (!loading && user) navigate(returnTo);
  }, [loading, navigate, returnTo, user]);

  if (loading) return <div className="container flex min-h-[60vh] items-center justify-center py-12"><LoadingPanel label="Restoring your secure FarmConnect session…" /></div>;

  return <div className="container grid min-h-[calc(100vh-72px)] items-center gap-8 py-10 sm:py-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16"><div className="max-w-xl"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-[#1b5e3c] text-[#e4f3cc] shadow-[0_8px_18px_rgba(27,94,60,0.2)]"><Leaf size={22} /></span><div><div className="text-sm font-bold text-[#18332a]">FarmConnect <span className="text-[#6b8f60]">AI</span></div><div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8b9c8e]">Smarter paths to market</div></div></div><div className="mt-10 text-xs font-bold uppercase tracking-[0.16em] text-[#6b8f60]">Secure workspace access</div><h1 className="mt-3 max-w-lg text-4xl font-bold tracking-[-0.06em] text-[#18332a] sm:text-5xl">Choose a smarter path to market.</h1><p className="mt-5 max-w-lg text-base leading-7 text-[#5f7465]">Connect your FarmConnect workspace to the selling or sourcing decisions that matter — with clear ownership, transparent factors and no black-box handoffs.</p><div className="mt-8 grid gap-3 text-sm text-[#496454] sm:grid-cols-2"><div className="flex items-start gap-3"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[#6f9b63]" />Your listings and requirements stay tied to your account.</div><div className="flex items-start gap-3"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#6f9b63]" />Secure session handling through the configured OAuth provider.</div></div></div><Surface className="mx-auto w-full max-w-md p-7 sm:p-9"><div className="text-xs font-bold uppercase tracking-[0.15em] text-[#6b8f60]">Continue securely</div><h2 className="mt-3 text-2xl font-bold tracking-[-0.04em] text-[#18332a]">Enter your workspace</h2><p className="mt-2 text-sm leading-6 text-[#718274]">Use the configured Google sign-in to continue. FarmConnect never handles your OAuth password or private credentials.</p>{error && <div className="mt-6"><AlertBanner tone="warning">Authentication could not be completed. The session may have expired or the sign-in was cancelled. Please try again.</AlertBanner></div>}<button type="button" onClick={() => startLogin(returnTo)} className="mt-7 flex w-full items-center justify-center gap-3 rounded-2xl bg-[#1b5e3c] px-5 py-3.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(27,94,60,0.18)] transition hover:bg-[#164d31] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#cfe8b2]"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-[#1b5e3c]">G</span>Continue with Google <ArrowRight size={16} /></button><div className="mt-7 border-t border-[#edf1eb] pt-6"><div className="text-xs font-bold uppercase tracking-[0.13em] text-[#8a9a8d]">After sign-in</div><div className="mt-3 grid gap-2 text-sm text-[#5f7465]"><Link href="/farmer" className="flex items-center justify-between rounded-xl bg-[#f7fbf3] px-4 py-3 font-semibold hover:bg-[#eff8e9]">Farmer workspace <ArrowRight size={15} /></Link><Link href="/buyer" className="flex items-center justify-between rounded-xl bg-[#f7fbf3] px-4 py-3 font-semibold hover:bg-[#eff8e9]">Buyer workspace <ArrowRight size={15} /></Link></div><p className="mt-3 text-xs leading-5 text-[#819086]">Choose the workspace that matches your role. This choice only guides navigation; ownership is always derived from your authenticated account.</p></div>{user && <button type="button" onClick={() => void logout()} className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-[#718274] hover:text-[#1b5e3c]"><LogOut size={14} /> Sign out</button>}</Surface></div>;
}
