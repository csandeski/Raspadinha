import { useEffect } from "react";
import { useLocation } from "wouter";

export function AfiliadosClear() {
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    // Clear all affiliate data
    localStorage.removeItem('affiliateToken');
    localStorage.removeItem('affiliateRememberMe');
    sessionStorage.clear();
    
    // Redirect to auth page
    setLocation('/afiliados/auth');
  }, [setLocation]);
  
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-400">Limpando sessão...</p>
      </div>
    </div>
  );
}
