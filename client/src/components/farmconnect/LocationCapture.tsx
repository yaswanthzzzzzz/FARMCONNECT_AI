import { LocateFixed, Loader2, MapPin, RotateCcw } from "lucide-react";
import { useState } from "react";
import type { LocationSource } from "@shared/types";
import { validateCoordinates } from "@shared/location";

export type CapturedLocation = {
  latitude?: number;
  longitude?: number;
  source: LocationSource;
};

type LocationCaptureProps = {
  source: LocationSource;
  onChange: (location: CapturedLocation) => void;
};

function messageForError(error: GeolocationPositionError) {
  if (error.code === error.PERMISSION_DENIED) return "Location permission was denied. You can retry or continue with a manually entered location.";
  if (error.code === error.POSITION_UNAVAILABLE) return "Your device could not determine a location. Check your signal or use a manual location.";
  if (error.code === error.TIMEOUT) return "Location took too long to respond. Retry when you have a clearer signal or use a manual location.";
  return "Location could not be determined. Use a manual location instead.";
}

export default function LocationCapture({ source, onChange }: LocationCaptureProps) {
  const [status, setStatus] = useState<"idle" | "requesting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setStatus("error");
      setMessage("This browser does not support device location. Continue with a manual location.");
      onChange({ source: "unavailable" });
      return;
    }
    setStatus("requesting");
    setMessage("Requesting your location…");
    navigator.geolocation.getCurrentPosition(
      position => {
        try {
          const coordinates = validateCoordinates({ latitude: position.coords.latitude, longitude: position.coords.longitude });
          onChange({ ...coordinates, source: "gps" });
          setStatus("success");
          setMessage("GPS location ready. Exact coordinates are used privately for estimates.");
        } catch {
          onChange({ source: "unavailable" });
          setStatus("error");
          setMessage("The device returned invalid coordinates. Use a manual location or retry.");
        }
      },
      error => {
        onChange({ source: "unavailable" });
        setStatus("error");
        setMessage(messageForError(error));
      },
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 10_000 },
    );
  }

  function useManualLocation() {
    onChange({ source: "manual" });
    setStatus("idle");
    setMessage("Manual location selected. Your city and district will be used for the estimate.");
  }

  return (
    <div className="rounded-2xl border border-[#dfe9d9] bg-[#f7fbf3] p-4" data-testid="location-capture">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[#39704d]"><MapPin size={16} /></span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-[#294c38]">Location intelligence</div>
          <p className="mt-1 text-xs leading-5 text-[#718274]">Use GPS only when you choose it. Exact coordinates are never shown to other users.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={useCurrentLocation} disabled={status === "requesting"} className="inline-flex items-center gap-2 rounded-xl bg-[#1b5e3c] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#164d31] disabled:opacity-60">
              {status === "requesting" ? <Loader2 size={14} className="animate-spin" /> : <LocateFixed size={14} />}
              {status === "requesting" ? "Requesting location…" : status === "success" ? "Refresh current location" : "Use my current location"}
            </button>
            <button type="button" onClick={useManualLocation} className="inline-flex items-center gap-2 rounded-xl border border-[#b8cfaa] bg-white px-3 py-2 text-xs font-bold text-[#39704d] transition hover:border-[#6b9c5d]">
              <RotateCcw size={14} /> Use manually entered location
            </button>
          </div>
          {message && <p role="status" className={`mt-3 text-xs leading-5 ${status === "error" ? "text-[#9b4c3d]" : "text-[#5f7465]"}`}>{message}</p>}
          {source === "demo" && <p className="mt-2 text-xs text-[#718274]">This demo record uses location mapping, not live GPS.</p>}
        </div>
      </div>
    </div>
  );
}
