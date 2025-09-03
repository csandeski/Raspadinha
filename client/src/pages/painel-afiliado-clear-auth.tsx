import { useEffect } from "react";
import { useLocation } from "wouter";

// Emergency auth clear page
export function PainelAfiliadoClearAuth() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Clear all affiliate tokens
    localStorage.removeItem('affiliateToken');
    localStorage.removeItem('affiliateRememberMe');
    sessionStorage.clear();
    
    // Redirect to auth page
    setTimeout(() => {
      setLocation('/afiliados/auth');
    }, 100);
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <p className="text-white">Limpando autenticação...</p>
      </div>
    </div>
  );
}