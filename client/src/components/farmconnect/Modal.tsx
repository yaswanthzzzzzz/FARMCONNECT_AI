import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKeyDown);
    closeButtonRef.current?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);
  if (!open) return null;
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#18332a]/40 p-4 backdrop-blur-sm sm:items-center" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><div role="dialog" aria-modal="true" aria-labelledby="farmconnect-modal-title" className="w-full max-w-lg rounded-[26px] border border-[#e1ecd9] bg-white p-6 shadow-2xl sm:p-7"><div className="flex items-start justify-between gap-4"><h2 id="farmconnect-modal-title" className="text-xl font-bold tracking-[-0.04em] text-[#18332a]">{title}</h2><button ref={closeButtonRef} type="button" aria-label={`Close ${title}`} onClick={onClose} className="rounded-full p-2 text-[#718274] hover:bg-[#eff8e9] hover:text-[#1b5e3c] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#cfe8b2]"><X size={18} /></button></div><div className="mt-5">{children}</div></div></div>;
}
