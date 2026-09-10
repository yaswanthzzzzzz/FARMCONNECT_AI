import { useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Leaf, Loader2, Save } from "lucide-react";
import { Link } from "wouter";
import { ActionButton, AlertBanner, BadgePill, Eyebrow, PageHeader, Surface } from "@/components/farmconnect/DesignSystem";
import { Field, LocationInput, NumberInput, SearchableCropInput, TextInput } from "@/components/farmconnect/FormControls";
import MarketReferenceCard from "@/components/farmconnect/MarketReferenceCard";
import { trpc } from "@/lib/trpc";
import type { Crop, FarmerListing } from "@shared/types";

const crops: Crop[] = ["Tomatoes", "Onions", "Potatoes", "Wheat", "Rice"];

export default function ProduceListing() {
  const [crop, setCrop] = useState<string>("Tomatoes");
  const [quantity, setQuantity] = useState("850");
  const [location, setFarmLocation] = useState("Khed, Pune");
  const [city, setCity] = useState("Pune");
  const [district, setDistrict] = useState("Pune");
  const [state, setState] = useState("Maharashtra");
  const [minimumPrice, setMinimumPrice] = useState("22");
  const [validationError, setValidationError] = useState("");
  const [apiError, setApiError] = useState("");
  const [createdListing, setCreatedListing] = useState<FarmerListing | null>(null);

  const createListing = trpc.farmer.createListing.useMutation({
    onSuccess: listing => {
      setCreatedListing(listing);
      setApiError("");
    },
    onError: error => {
      setApiError(error.message || "We could not save your listing. Please try again.");
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedQuantity = Number(quantity);
    const parsedPrice = Number(minimumPrice);
    const normalizedCrop = crop.trim() as Crop;
    if (!crops.includes(normalizedCrop)) {
      setValidationError("Choose a crop from the available list.");
      return;
    }
    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      setValidationError("Quantity must be a whole number greater than 0 kg.");
      return;
    }
    if (!Number.isInteger(parsedPrice) || parsedPrice <= 0) {
      setValidationError("Minimum price must be a whole number greater than ₹0/kg.");
      return;
    }
    if ([location, city, district, state].some(value => value.trim().length < 2)) {
      setValidationError("Add your farm location, city, district and state.");
      return;
    }
    setValidationError("");
    setApiError("");
    setCreatedListing(null);
    createListing.mutate({
      crop: normalizedCrop,
      quantityKg: parsedQuantity,
      location: location.trim(),
      city: city.trim(),
      district: district.trim(),
      state: state.trim(),
      minimumPricePerKg: parsedPrice,
    });
  }

  return <div className="container py-10 sm:py-14"><Link href="/farmer" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#66806d] hover:text-[#1b5e3c]"><ArrowLeft size={15} /> Back to farmer workspace</Link><PageHeader eyebrow="Farmer flow · Step 1" title="Tell us what you’re taking to market." description="Your listing is saved to the FarmConnect backend with the location detail needed for future distance estimation." /><div className="grid gap-7 lg:grid-cols-[1.1fr_0.9fr] lg:items-start"><Surface className="p-6 sm:p-8"><div className="mb-7 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eff8e9] text-[#39704d]"><Leaf size={19} /></span><div><h2 className="font-bold text-[#18332a]">Produce details</h2><p className="text-xs text-[#819086]">Fields marked by the form are required for a complete listing.</p></div></div><form onSubmit={handleSubmit} className="space-y-5" noValidate><Field label="What are you selling?" hint="Search or choose one supported crop."><SearchableCropInput value={crop} onChange={setCrop} options={crops} /></Field><Field label="Available quantity" hint="Use the quantity that can be delivered for this opportunity."><div className="relative"><NumberInput aria-label="Available quantity in kilograms" value={quantity} onChange={event => setQuantity(event.target.value)} placeholder="850" step="1" /><span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#819086]">kg</span></div></Field><Field label="Farm location" hint="Add a village or market-yard level location."><LocationInput aria-label="Farm location" value={location} onChange={event => setFarmLocation(event.target.value)} placeholder="e.g. Khed, Pune" /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="City"><TextInput aria-label="City" value={city} onChange={event => setCity(event.target.value)} placeholder="Pune" /></Field><Field label="District"><TextInput aria-label="District" value={district} onChange={event => setDistrict(event.target.value)} placeholder="Pune" /></Field></div><Field label="State"><TextInput aria-label="State" value={state} onChange={event => setState(event.target.value)} placeholder="Maharashtra" /></Field><Field label="Minimum acceptable price" hint="This is your price floor, not a promise of the final selling price."><div className="relative"><span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#819086]">₹</span><NumberInput aria-label="Minimum acceptable price per kilogram" value={minimumPrice} onChange={event => setMinimumPrice(event.target.value)} className="pl-9" placeholder="22" step="1" /><span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#819086]">/ kg</span></div></Field><MarketReferenceCard crop={crops.includes(crop as Crop) ? crop as Crop : undefined} location={location} expectedPrice={Number(minimumPrice) > 0 ? Number(minimumPrice) : undefined} />{validationError && <AlertBanner tone="warning">{validationError}</AlertBanner>}{apiError && <AlertBanner tone="warning">{apiError}</AlertBanner>}<ActionButton type="submit" size="lg" className="w-full" disabled={createListing.isPending}>{createListing.isPending ? <><Loader2 size={17} className="animate-spin" /> Saving listing…</> : <><Save size={17} /> Save produce listing</>}</ActionButton></form></Surface><div className="space-y-5">{createdListing ? <Surface className="p-6" accent><Eyebrow icon={<CheckCircle2 size={14} />}>Listing created</Eyebrow><div className="flex items-start justify-between gap-4"><div><h2 className="text-2xl font-bold tracking-[-0.04em] text-[#18332a]">Your produce is ready.</h2><p className="mt-2 text-sm leading-6 text-[#5f7465]">We saved this listing to your farmer history. You can now move into the smart-buyer flow.</p></div><BadgePill tone="green">Active</BadgePill></div><div className="mt-6 grid gap-3 rounded-2xl bg-white p-4 sm:grid-cols-2"><div><div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#8a9a8d]">Crop</div><div className="mt-1 font-semibold text-[#294c38]">{createdListing.crop}</div></div><div><div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#8a9a8d]">Quantity</div><div className="mt-1 font-semibold text-[#294c38]">{createdListing.quantityKg.toLocaleString()} kg</div></div><div><div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#8a9a8d]">Location</div><div className="mt-1 font-semibold text-[#294c38]">{createdListing.location}</div></div><div><div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#8a9a8d]">Minimum price</div><div className="mt-1 font-semibold text-[#28623f]">₹{createdListing.minimumPricePerKg}/kg</div></div></div><ActionButton href={`/matches?listingId=${createdListing.id}&status=ready`} className="mt-5 w-full">Find smart buyers <ArrowRight size={16} /></ActionButton><Link href="/farmer" className="mt-3 flex justify-center text-sm font-semibold text-[#66806d] hover:text-[#1b5e3c]">View listing history</Link></Surface> : <Surface className="p-6" accent><Eyebrow icon={<CheckCircle2 size={14} />}>What happens after save</Eyebrow><div className="space-y-4"><div className="flex gap-3"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1b5e3c] text-xs font-bold text-white">1</span><div><div className="text-sm font-bold text-[#294c38]">Your listing is persisted</div><p className="mt-1 text-xs leading-5 text-[#718274]">Your crop, quantity, structured location and price floor become part of your listing history.</p></div></div><div className="flex gap-3"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#b8cfaa] text-xs font-bold text-[#6b8f60]">2</span><div><div className="text-sm font-bold text-[#294c38]">Find smart buyers</div><p className="mt-1 text-xs leading-5 text-[#718274]">The matching route is live and compares full selling outcomes.</p></div></div></div></Surface>}<div className="rounded-[24px] border border-[#e5ecdf] bg-white p-6"><h3 className="font-bold text-[#18332a]">The FarmConnect promise</h3><p className="mt-2 text-sm leading-6 text-[#718274]">We will never treat the highest price as the only answer. The goal is a better outcome for your farm.</p><Link href="/how-it-works" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#1b5e3c]">Read the method <ArrowRight size={15} /></Link></div></div></div></div>;
}
