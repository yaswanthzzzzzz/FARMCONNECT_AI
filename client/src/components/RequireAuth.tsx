import { useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import { LoadingPanel } from "@/components/farmconnect/DesignSystem";
import { useAuth } from "@/_core/hooks/useAuth";

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (loading || user || typeof window === "undefined") return;
    const returnTo = `${window.location.pathname}${window.location.search}`;
    navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  }, [loading, navigate, user]);

  if (loading || !user) {
    return <div className="container py-10 sm:py-14"><LoadingPanel label="Restoring your FarmConnect session…" /></div>;
  }

  return <>{children}</>;
}
