import type { ReactNode } from "react";
import { CheckCircle2, ChevronRight, Info, Loader2, MapPin, Sparkles } from "lucide-react";

type ButtonProps = {
  children: ReactNode;
  href?: string;
  variant?: "primary" | "secondary" | "ghost" | "dark";
  size?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
};

const buttonBase = "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#cfe8b2] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50";

export function ActionButton({ children, href, variant = "primary", size = "md", className = "", onClick, type = "button", disabled }: ButtonProps) {
  const variants = {
    primary: "bg-[#1b5e3c] !text-white shadow-[0_8px_24px_rgba(27,94,60,0.18)] hover:-translate-y-0.5 hover:bg-[#154b30]",
    secondary: "border border-[#b9c8af] bg-white text-[#18332a] shadow-sm hover:-translate-y-0.5 hover:border-[#1b5e3c] hover:bg-[#f7fbf4]",
    ghost: "text-[#456252] hover:bg-[#eff6e9] hover:text-[#1b5e3c]",
    dark: "bg-[#18332a] !text-white shadow-sm hover:-translate-y-0.5 hover:bg-[#10251e]",
  };
  const sizes = { sm: "px-3.5 py-2 text-xs", md: "px-5 py-3 text-sm", lg: "px-6 py-3.5 text-sm" };
  const classes = `${buttonBase} ${variants[variant]} ${sizes[size]} ${className}`;
  if (href) return <a href={href} className={classes}>{children}</a>;
  return <button type={type} onClick={onClick} disabled={disabled} className={classes}>{children}</button>;
}

export function Surface({ children, className = "", accent = false }: { children: ReactNode; className?: string; accent?: boolean }) {
  return <section className={`${accent ? "border-[#cfe8b2] bg-[#f7fbf3]" : "border-[#e5ecdf] bg-white"} rounded-[24px] border shadow-[0_12px_40px_rgba(33,65,40,0.06)] ${className}`}>{children}</section>;
}

export function Eyebrow({ children, icon = <Sparkles size={14} /> }: { children: ReactNode; icon?: ReactNode }) {
  return <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#cfe8b2] bg-[#eff8e9] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#39704d]">{icon}{children}</div>;
}

export function StatCard({ label, value, hint, tone = "green" }: { label: string; value: string; hint: string; tone?: "green" | "amber" | "blue" }) {
  const tones = { green: "bg-[#eff8e9] text-[#1b5e3c]", amber: "bg-[#fff6dc] text-[#966c12]", blue: "bg-[#edf5f8] text-[#2f6680]" };
  return <div className="rounded-[20px] border border-[#e5ecdf] bg-white p-5 shadow-[0_8px_24px_rgba(33,65,40,0.05)] transition-transform duration-200 hover:-translate-y-1"><div className="mb-4 flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#718274]">{label}</span><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${tones[tone]}`}>{tone}</span></div><div className="text-2xl font-bold tracking-tight text-[#18332a]">{value}</div><p className="mt-1 text-xs text-[#718274]">{hint}</p></div>;
}

export function BadgePill({ children, tone = "neutral" }: { children: ReactNode; tone?: "green" | "amber" | "neutral" | "blue" }) {
  const tones = { green: "bg-[#e7f4df] text-[#28623f]", amber: "bg-[#fff4d5] text-[#956d16]", neutral: "bg-[#f1f4ef] text-[#64736a]", blue: "bg-[#eaf3f6] text-[#2f6680]" };
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${tones[tone]}`}>{children}</span>;
}

export function AlertBanner({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "success" | "warning" }) {
  const styles = { info: "border-[#cfe3eb] bg-[#f2f8fa] text-[#2f6680]", success: "border-[#cfe8b2] bg-[#f2faed] text-[#28623f]", warning: "border-[#f2dfaa] bg-[#fffaf0] text-[#856117]" };
  const icons = { info: <Info size={16} />, success: <CheckCircle2 size={16} />, warning: <Info size={16} /> };
  return <div role="status" className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm leading-6 ${styles[tone]}`}>{icons[tone]}<span>{children}</span></div>;
}

export function LoadingPanel({ label = "Loading your workspace…" }: { label?: string }) {
  return <div className="flex items-center justify-center gap-3 rounded-[24px] border border-dashed border-[#cfe0c7] bg-[#fbfdf9] px-6 py-16 text-sm text-[#5c7464]"><Loader2 className="animate-spin" size={18} />{label}</div>;
}

export function EmptyPanel({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return <div className="rounded-[24px] border border-dashed border-[#cfe0c7] bg-[#fbfdf9] px-6 py-12 text-center"><div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eff8e9] text-[#39704d]"><Sparkles size={20} /></div><h3 className="font-semibold text-[#18332a]">{title}</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#718274]">{message}</p>{action && <div className="mt-5">{action}</div>}</div>;
}

export function LocationLine({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center gap-1.5 text-xs text-[#718274]"><MapPin size={13} />{children}</span>;
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between"><div>{eyebrow && <div className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[#6b8f60]">{eyebrow}</div>}<h1 className="max-w-3xl text-3xl font-bold tracking-[-0.04em] text-[#18332a] sm:text-4xl">{title}</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-[#66786a]">{description}</p></div>{action && <div className="shrink-0">{action}</div>}</div>;
}

export function LinkRow({ href, children, note }: { href: string; children: ReactNode; note?: string }) {
  return <a href={href} className="group flex items-center justify-between gap-4 rounded-2xl border border-transparent px-3 py-3 transition-colors hover:border-[#dce9d5] hover:bg-[#f7fbf4]"><span><span className="block text-sm font-semibold text-[#294c38] group-hover:text-[#1b5e3c]">{children}</span>{note && <span className="mt-1 block text-xs text-[#819086]">{note}</span>}</span><ChevronRight size={17} className="text-[#9db2a1] transition-transform group-hover:translate-x-1 group-hover:text-[#1b5e3c]" /></a>;
}
