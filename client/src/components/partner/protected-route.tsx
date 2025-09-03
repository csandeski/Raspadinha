import { useEffect } from "react";
import { useLocation } from "wouter";

export function PartnerProtectedRoute({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const token = localStorage.getItem("partnerToken");
    if (!token) {
      setLocation("/parceiros");
    }
  }, [setLocation]);

  const token = localStorage.getItem("partnerToken");
  if (!token) {
    return null;
  }

  return <>{children}</>;
}