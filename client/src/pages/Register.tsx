import { useState } from "react";
import { ArrowLeft, ArrowRight, Leaf, Loader2, ShieldCheck } from "lucide-react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { AlertBanner, Surface } from "@/components/farmconnect/DesignSystem";

export default function Register() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const register = trpc.auth.register.useMutation({
    onSuccess: user => {
      utils.auth.me.setData(undefined, user);
      navigate("/login");
    },
  });
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    register.mutate({ username, password, confirmPassword });
  };

  return <div className="container grid min-h-[calc(100vh-72px)] items-center gap-8 py-10 sm:py-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16"><div className="max-w-xl"><Link href="/login" className="inline-flex items-center gap-2 text-sm font-bold text-[#496454] hover:text-[#1b5e3c]"><ArrowLeft size={16} /> Back to sign in</Link><div className="mt-10 flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-[#1b5e3c] text-[#e4f3cc] shadow-[0_8px_18px_rgba(27,94,60,0.2)]"><Leaf size={22} /></span><div><div className="text-sm font-bold text-[#18332a]">FarmConnect <span className="text-[#6b8f60]">AI</span></div><div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8b9c8e]">Smarter paths to market</div></div></div><div className="mt-10 text-xs font-bold uppercase tracking-[0.16em] text-[#6b8f60]">Create your workspace</div><h1 className="mt-3 max-w-lg text-4xl font-bold tracking-[-0.06em] text-[#18332a] sm:text-5xl">Start with a smarter path to market.</h1><p className="mt-5 max-w-lg text-base leading-7 text-[#5f7465]">Create a FarmConnect account with a username and protected password. You’ll choose whether you’re working as a farmer or buyer next.</p><div className="mt-8 flex items-start gap-3 text-sm text-[#496454]"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#6f9b63]" />Your password is stored as a one-way Argon2id hash and is never placed in your session.</div></div><Surface className="mx-auto w-full max-w-md p-7 sm:p-9"><div className="text-xs font-bold uppercase tracking-[0.15em] text-[#6b8f60]">New account</div><h2 className="mt-3 text-2xl font-bold tracking-[-0.04em] text-[#18332a]">Create your workspace</h2><p className="mt-2 text-sm leading-6 text-[#718274]">Use 3–32 letters, numbers, or underscores for your username. Email is not required.</p>{register.error && <div className="mt-6"><AlertBanner tone="warning">{register.error.message}</AlertBanner></div>}<form onSubmit={submit} className="mt-7 space-y-4"><label className="block text-sm font-semibold text-[#496454]">Username<input required minLength={3} maxLength={32} pattern="[A-Za-z0-9_]+" autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} className="mt-2 w-full rounded-xl border border-[#dfe9d9] bg-white px-3.5 py-3 text-[#18332a] outline-none focus:border-[#6f9b63] focus:ring-4 focus:ring-[#eff8e9]" /></label><label className="block text-sm font-semibold text-[#496454]">Password<input required minLength={10} maxLength={256} type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-[#dfe9d9] bg-white px-3.5 py-3 text-[#18332a] outline-none focus:border-[#6f9b63] focus:ring-4 focus:ring-[#eff8e9]" /><span className="mt-1 block text-xs font-normal text-[#819086]">At least 10 characters.</span></label><label className="block text-sm font-semibold text-[#496454]">Confirm Password<input required minLength={10} maxLength={256} type="password" autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-[#dfe9d9] bg-white px-3.5 py-3 text-[#18332a] outline-none focus:border-[#6f9b63] focus:ring-4 focus:ring-[#eff8e9]" /></label><button type="submit" disabled={register.isPending} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1b5e3c] px-5 py-3.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(27,94,60,0.18)] transition hover:bg-[#164d31] disabled:opacity-60">{register.isPending && <Loader2 size={16} className="animate-spin" />}Create Account <ArrowRight size={16} /></button></form><p className="mt-5 text-center text-sm text-[#718274]">Already have an account? <Link href="/login" className="font-bold text-[#1b5e3c] hover:underline">Sign in</Link></p></Surface></div>;
}
