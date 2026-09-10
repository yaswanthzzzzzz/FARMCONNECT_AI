import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, Leaf, LogIn, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { ActionButton } from "@/components/farmconnect/DesignSystem";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Farmer", href: "/farmer" },
  { label: "Buyer", href: "/buyer" },
  { label: "How it works", href: "/how-it-works" },
  { label: "About", href: "/about" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const isActive = (href: string) => href === "/" ? location === "/" : location.startsWith(href);
  const loginHref = location.startsWith("/login") ? "/login" : `/login?returnTo=${encodeURIComponent(`${location}${window.location.search}`)}`;

  return <div className="min-h-screen bg-[#fbfcf8] text-[#18332a]">
    <header className="sticky top-0 z-40 border-b border-[#e6ede1]/90 bg-[#fbfcf8]/95 backdrop-blur-xl">
      <div className="container flex h-[72px] items-center justify-between gap-5">
        <Link href="/" className="flex items-center gap-3" onClick={() => setMenuOpen(false)}>
          <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#1b5e3c] text-[#e4f3cc] shadow-[0_8px_18px_rgba(27,94,60,0.2)]"><Leaf size={21} strokeWidth={2.5} /></span>
          <span><span className="block text-[15px] font-bold tracking-[-0.02em] text-[#18332a]">FarmConnect <span className="text-[#6b8f60]">AI</span></span><span className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8b9c8e] sm:block">Smarter paths to market</span></span>
        </Link>
        <nav aria-label="Primary navigation" className="hidden items-center gap-1 lg:flex">{navItems.map(item => <Link key={item.href} href={item.href} className={`rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${isActive(item.href) ? "bg-[#eff8e9] text-[#1b5e3c]" : "text-[#66786a] hover:bg-[#f1f6ee] hover:text-[#1b5e3c]"}`}>{item.label}</Link>)}</nav>
        <div className="hidden items-center gap-3 lg:flex">{user ? <><span className="max-w-[150px] truncate text-xs font-semibold text-[#718274]">{user.name || user.email || "Signed in"}</span><button type="button" onClick={() => void logout()} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#426650] hover:text-[#1b5e3c]"><LogOut size={14} /> Sign out</button></> : <Link href={loginHref} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#426650] hover:text-[#1b5e3c]"><LogIn size={15} /> Log in</Link>}<Link href="/farmer/produce" className="text-sm font-semibold text-[#426650] hover:text-[#1b5e3c]">List produce</Link><ActionButton href={user ? "/farmer" : loginHref} size="sm">Open workspace <ArrowRight size={15} /></ActionButton></div>
        <button aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)} className="rounded-full p-2.5 text-[#294c38] hover:bg-[#eff8e9] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#cfe8b2] lg:hidden">{menuOpen ? <X size={22} /> : <Menu size={22} />}</button>
      </div>
      {menuOpen && <div className="border-t border-[#e6ede1] bg-[#fbfcf8] px-4 py-4 lg:hidden"><nav aria-label="Mobile navigation" className="container flex flex-col gap-1">{navItems.map(item => <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className={`rounded-2xl px-4 py-3 text-sm font-semibold ${isActive(item.href) ? "bg-[#eff8e9] text-[#1b5e3c]" : "text-[#66786a]"}`}>{item.label}</Link>)}<div className="mt-3 border-t border-[#e6ede1] pt-3"><Link href="/farmer/produce" onClick={() => setMenuOpen(false)} className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold text-[#426650]">List produce <ArrowRight size={16} /></Link>{user ? <button type="button" onClick={() => { setMenuOpen(false); void logout(); }} className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold text-[#426650]">Sign out <LogOut size={16} /></button> : <Link href={loginHref} onClick={() => setMenuOpen(false)} className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold text-[#426650]">Log in with Google <LogIn size={16} /></Link>}<ActionButton href={user ? "/farmer" : loginHref} className="mt-2 w-full" onClick={() => setMenuOpen(false)}>Open workspace <ArrowRight size={15} /></ActionButton></div></nav></div>}
    </header>
    <main>{children}</main>
    <footer className="border-t border-[#e6ede1] bg-white">
      <div className="container grid gap-8 py-10 sm:grid-cols-[1.3fr_1fr_1fr] sm:py-14"><div><div className="mb-3 flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1b5e3c] text-[#e4f3cc]"><Leaf size={16} /></span><span className="font-bold text-[#18332a]">FarmConnect AI</span></div><p className="max-w-xs text-sm leading-6 text-[#718274]">Helping farmers choose the smartest selling path — not just find a buyer.</p></div><div><div className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[#8b9c8e]">Explore</div><div className="flex flex-col items-start gap-2 text-sm text-[#5f7465]"><Link href="/farmer">Farmer workspace</Link><Link href="/buyer">Buyer workspace</Link><Link href="/how-it-works">How it works</Link></div></div><div><div className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[#8b9c8e]">Transparent by design</div><p className="text-sm leading-6 text-[#718274]">Deterministic decisions, visible factors, explainable recommendations.</p></div></div>
      <div className="container flex flex-col gap-2 border-t border-[#edf1eb] py-5 text-xs text-[#8b9c8e] sm:flex-row sm:items-center sm:justify-between"><span>Built for the next generation of Indian agriculture.</span><span>Market data is labeled live or demo with source and timestamp</span></div>
    </footer>
  </div>;
}
