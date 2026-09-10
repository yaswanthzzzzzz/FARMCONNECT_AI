import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { MapPin } from "lucide-react";

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return <div className="space-y-2"><label className="block text-sm font-semibold text-[#294c38]">{label}</label>{children}{error ? <p className="text-xs text-[#b6493b]">{error}</p> : hint ? <p className="text-xs text-[#819086]">{hint}</p> : null}</div>;
}

const fieldClass = "w-full rounded-2xl border border-[#dce7d8] bg-white px-4 py-3 text-sm text-[#18332a] outline-none transition-colors placeholder:text-[#a0aea3] focus:border-[#6b9b57] focus:ring-4 focus:ring-[#eff8e9]";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldClass} ${props.className ?? ""}`} />;
}

export function NumberInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input type="number" min={0} {...props} className={`${fieldClass} ${props.className ?? ""}`} />;
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${fieldClass} appearance-none ${props.className ?? ""}`} />;
}

export function SearchableCropInput({ value, onChange, options, id = "crop-options" }: { value: string; onChange: (value: string) => void; options: string[]; id?: string }) {
  return <>
    <input list={id} value={value} onChange={event => onChange(event.target.value)} placeholder="Search or choose a crop" aria-label="Crop" className={fieldClass} />
    <datalist id={id}>{options.map(option => <option key={option} value={option} />)}</datalist>
  </>;
}

export function LocationInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <div className="relative"><MapPin size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#73927a]" /><TextInput {...props} className={`pl-10 ${props.className ?? ""}`} /></div>;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${fieldClass} min-h-28 resize-y ${props.className ?? ""}`} />;
}
