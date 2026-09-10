import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Leaf, Loader2, LogOut, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { AlertBanner, LoadingPanel, Surface } from "@/components/farmconnect/DesignSystem";

function safeReturnTo(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export default function Login() {
  const { user, loading, error, logout } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const returnTo = safeReturnTo(new URLSearchParams(window.location.search).get("returnTo"));

  useEffect(() => {
    if (!loading && user && user.role !== "user") navigate(user.role === "buyer" ? "/buyer" : user.role === "farmer" ? "/farmer" : returnTo);
  }, [loading, navigate, returnTo, user]);

  const [pendingRole, setPendingRole] = useState<"farmer" | "buyer" | null>(null);
  const setRole = trpc.auth.setRole.useMutation({
    onSuccess: async data => {
      await utils.auth.me.invalidate();
      navigate(data.role === "buyer" ? "/buyer" : "/farmer");
    },
    onSettled: () => setPendingRole(null),
  });
  const chooseRole = (role: "farmer" | "buyer") => {
    setPendingRole(role);
    setRole.mutate({ role });
  };

  if (loading) return <div className="container flex min-h-[60vh] items-center justify-center py-12"><LoadingPanel label="Restoring your secure FarmConnect session…" /></div>;

  if (user && user.role === "user") return <div className="container grid min-h-[calc(100vh-72px)] items-center py-10 sm:py-16"><Surface className="mx-auto w-full max-w-md p-7 sm:p-9"><div className="text-xs font-bold uppercase tracking-[0.15em] text-[#6b8f60]">Your FarmConnect workspace</div><h2 className="mt-3 text-2xl font-bold tracking-[-0.04em] text-[#18332a]">How will you use FarmConnect?</h2><p className="mt-2 text-sm leading-6 text-[#718274]">Choose a role once. We’ll save it to your account and restore the same workspace the next time you sign in.</p><div className="mt-7 grid gap-3"><button type="button" disabled={setRole.isPending} onClick={() => chooseRole("farmer")} className="flex items-center justify-between rounded-2xl border border-[#dfe9d9] bg-[#f7fbf3] p-4 text-left transition hover:border-[#9fc58d] hover:bg-[#eff8e9] disabled:opacity-60"><span><span className="block font-bold text-[#18332a]">Farmer</span><span className="mt-1 block text-sm text-[#718274]">List your produce and find the smartest selling path.</span></span>{pendingRole === "farmer" ? <Loader2 className="animate-spin text-[#1b5e3c]" size={18} /> : <ArrowRight className="text-[#6b8f60]" size={18} />}</button><button type="button" disabled={setRole.isPending} onClick={() => chooseRole("buyer")} className="flex items-center justify-between rounded-2xl border border-[#dfe9d9] bg-[#f7fbf3] p-4 text-left transition hover:border-[#9fc58d] hover:bg-[#eff8e9] disabled:opacity-60"><span><span className="block font-bold text-[#18332a]">Buyer</span><span className="mt-1 block text-sm text-[#718274]">Find supply and plan the best fulfilment path.</span></span>{pendingRole === "buyer" ? <Loader2 className="animate-spin text-[#1b5e3c]" size={18} /> : <ArrowRight className="text-[#6b8f60]" size={18} />}</button></div>{setRole.error && <div className="mt-5"><AlertBanner tone="warning">We couldn’t save your role. Please try again.</AlertBanner></div>}</Surface></div>;

  return <div className="container grid min-h-[calc(100vh-72px)] items-center gap-8 py-10 sm:py-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16"><div className="max-w-xl"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-[#1b5e3c] text-[#e4f3cc] shadow-[0_8px_18px_rgba(27,94,60,0.2)]"><Leaf size={22} /></span><div><div className="text-sm font-bold text-[#18332a]">FarmConnect <span className="text-[#6b8f60]">AI</span></div><div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8b9c8e]">Smarter paths to market</div></div></div><div className="mt-10 text-xs font-bold uppercase tracking-[0.16em] text-[#6b8f60]">Secure workspace access</div><h1 className="mt-3 max-w-lg text-4xl font-bold tracking-[-0.06em] text-[#18332a] sm:text-5xl">Choose a smarter path to market.</h1><p className="mt-5 max-w-lg text-base leading-7 text-[#5f7465]">Connect your FarmConnect workspace to the selling or sourcing decisions that matter — with clear ownership, transparent factors and no black-box handoffs.</p><div className="mt-8 grid gap-3 text-sm text-[#496454] sm:grid-cols-2"><div className="flex items-start gap-3"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[#6f9b63]" />Your listings and requirements stay tied to your account.</div><div className="flex items-start gap-3"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#6f9b63]" />Secure session handling through the configured OAuth provider.</div></div></div><Surface className="mx-auto w-full max-w-md p-7 sm:p-9"><div className="text-xs font-bold uppercase tracking-[0.15em] text-[#6b8f60]">Continue securely</div><h2 className="mt-3 text-2xl font-bold tracking-[-0.04em] text-[#18332a]">Enter your workspace</h2><p className="mt-2 text-sm leading-6 text-[#718274]">Use the configured Google sign-in to continue. FarmConnect never handles your OAuth password or private credentials.</p>{error && <div className="mt-6"><AlertBanner tone="warning">Authentication could not be completed. The session may have expired or the sign-in was cancelled. Please try again.</AlertBanner></div>}<button type="button" onClick={() => startLogin(returnTo)} className="mt-7 flex w-full items-center justify-center gap-3 rounded-2xl bg-[#1b5e3c] px-5 py-3.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(27,94,60,0.18)] transition hover:bg-[#164d31] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#cfe8b2]"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-[#1b5e3c]">G</span>Continue with Google <ArrowRight size={16} /></button><p className="mt-5 text-center text-xs leading-5 text-[#819086]">Returning users go directly to their saved workspace. New users choose a role after their first sign-in.</p>{user && <button type="button" onClick={() => void logout()} className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-[#718274] hover:text-[#1b5e3c]"><LogOut size={14} /> Sign out</button>}</Surface></div>;
}
