import { ArrowRight, CheckCircle2, Leaf, MapPin, ShieldCheck, Sprout, Users } from "lucide-react";
import { Link } from "wouter";
import { demoMarketSnapshot } from "@/data/demoData";
import { ActionButton, BadgePill, Eyebrow, PageHeader, Surface } from "@/components/farmconnect/DesignSystem";
import { trpc } from "@/lib/trpc";

export default function Demo() {
  const snapshotQuery = trpc.market.demoSnapshot.useQuery();
  const snapshot = snapshotQuery.data ?? demoMarketSnapshot;

  return <div className="container py-8 sm:py-12">
    <div className="mb-8 flex flex-col gap-4 border border-[#e6d7b9] bg-[#fff9ea] p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f3dfaa] text-[#856117]"><ShieldCheck size={18} /></span><div><div className="text-xs font-bold uppercase tracking-[0.16em] text-[#856117]">DEMO MODE · SAMPLE DATA</div><p className="mt-1 text-sm leading-6 text-[#6f5b31]">Read-only walkthrough. No account, writes, or persistent changes are available here.</p></div></div>
      <Link href="/login" className="inline-flex shrink-0 items-center gap-2 text-sm font-bold text-[#856117] hover:text-[#5f481c]">Return to sign in <ArrowRight size={15} /></Link>
    </div>

    <PageHeader eyebrow="DEMO / SAMPLE DATA" title="Explore FarmConnect without an account." description="Review representative farmer supply, buyer demand, and the transparent factors FarmConnect considers. This walkthrough uses sample data only and cannot create or change records." />

    <div className="mt-8 grid gap-5 sm:grid-cols-3">
      <Surface className="p-5"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eff8e9] text-[#39704d]"><Sprout size={18} /></span><div><div className="text-2xl font-bold text-[#18332a]">{snapshot.farmers.length}</div><div className="text-xs text-[#819087]">sample farmer profiles</div></div></div></Surface>
      <Surface className="p-5"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#edf5f8] text-[#2f6680]"><Users size={18} /></span><div><div className="text-2xl font-bold text-[#18332a]">{snapshot.buyers.length}</div><div className="text-xs text-[#819087]">sample buyer profiles</div></div></div></Surface>
      <Surface className="p-5"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f4eee3] text-[#b9653e]"><Leaf size={18} /></span><div><div className="text-2xl font-bold text-[#18332a]">{snapshot.supportedCrops.length}</div><div className="text-xs text-[#819087]">sample supported crops</div></div></div></Surface>
    </div>

    <div className="mt-10 grid gap-8 lg:grid-cols-2">
      <Surface className="p-6 sm:p-7"><div className="flex items-center justify-between gap-3"><Eyebrow icon={<Sprout size={14} />}>DEMO · SAMPLE FARMERS</Eyebrow><BadgePill tone="amber">Read-only</BadgePill></div><div className="mt-5 space-y-3">{snapshot.farmers.map(farmer => <div key={farmer.id} className="rounded-2xl border border-[#e5ecdf] bg-[#f7fbf3] p-4"><div className="flex items-start justify-between gap-3"><div><div className="font-bold text-[#294c38]">{farmer.name}</div><div className="mt-1 flex items-center gap-1.5 text-xs text-[#718274]"><MapPin size={12} />{farmer.village}, {farmer.location.city}</div></div><span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#6b8f60]">Sample</span></div><div className="mt-4 grid grid-cols-3 gap-2 text-xs"><div><div className="text-[#819087]">Crop</div><div className="mt-1 font-bold text-[#294c38]">{farmer.primaryCrop}</div></div><div><div className="text-[#819087]">Available</div><div className="mt-1 font-bold text-[#294c38]">{farmer.availableQuantityKg.toLocaleString()} kg</div></div><div><div className="text-[#819087]">Expected</div><div className="mt-1 font-bold text-[#28623f]">₹{farmer.expectedPricePerKg}/kg</div></div></div></div>)}</div></Surface>

      <Surface className="p-6 sm:p-7"><div className="flex items-center justify-between gap-3"><Eyebrow icon={<Users size={14} />}>DEMO · SAMPLE BUYERS</Eyebrow><BadgePill tone="amber">Read-only</BadgePill></div><div className="mt-5 space-y-3">{snapshot.buyers.map(buyer => <div key={buyer.id} className="rounded-2xl border border-[#e5ecdf] bg-[#f7fbf3] p-4"><div className="flex items-start justify-between gap-3"><div><div className="font-bold text-[#294c38]">{buyer.name}</div><div className="mt-1 flex items-center gap-1.5 text-xs text-[#718274]"><MapPin size={12} />{buyer.location.city} · {buyer.buyerType}</div></div><span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#6b8f60]">Sample</span></div><div className="mt-4 grid grid-cols-3 gap-2 text-xs"><div><div className="text-[#819087]">Needs</div><div className="mt-1 font-bold text-[#294c38]">{buyer.requiredCrop}</div></div><div><div className="text-[#819087]">Quantity</div><div className="mt-1 font-bold text-[#294c38]">{buyer.requiredQuantityKg.toLocaleString()} kg</div></div><div><div className="text-[#819087]">Offers</div><div className="mt-1 font-bold text-[#28623f]">₹{buyer.offeredPricePerKg}/kg</div></div></div></div>)}</div></Surface>
    </div>

    <Surface className="mt-8 border-l-4 border-l-[#b9653e] p-6 sm:p-7"><div className="flex items-start gap-3"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[#b9653e]" /><div><div className="text-xs font-bold uppercase tracking-[0.15em] text-[#a75c38]">DEMO MODE · NO WRITE OPERATIONS</div><h2 className="mt-2 text-xl font-bold text-[#18332a]">What you can explore</h2><p className="mt-2 text-sm leading-7 text-[#5f7465]">This page presents sample supply, sample demand, and reference context only. Creating listings, creating requirements, saving aggregation plans, and modifying persistent data are intentionally unavailable. Sign in with Google when the configured OAuth environment is available to use the protected workspaces.</p><div className="mt-5 flex flex-wrap gap-3"><ActionButton href="/how-it-works" variant="secondary">Read how it works <ArrowRight size={15} /></ActionButton><ActionButton href="/" variant="secondary">Back to home <ArrowRight size={15} /></ActionButton></div></div></div></Surface>

    <p className="mt-6 text-center text-xs text-[#819087]">{snapshot.lastUpdatedLabel} · DEMO / SAMPLE DATA · Read-only walkthrough</p>
  </div>;
}
