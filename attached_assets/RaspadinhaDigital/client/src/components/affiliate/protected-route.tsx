import { useEffect, useState } from "react";
import { useLocation } from "wouter";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function AffiliateProtectedRoute({ children }: ProtectedRouteProps) {
  const [, setLocation] = useLocation();
  const [isChecking, setIsChecking] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Simple check - if no token, redirect
    const token = localStorage.getItem("affiliateToken");
    
    if (!token) {
      // No token, redirect immediately to auth page
      setLocation("/afiliados/auth");
    } else {
      // Has token - assume valid for now
      // Actual API calls will handle 401 errors
      setIsAuthenticated(true);
    }
    setIsChecking(false);
  }, [setLocation]);

  // Show loading state while checking authentication
  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="animate-pulse">
          <img 
            src="/logos/logomania.svg"
            alt="Carregando..."
            className="h-16 w-auto opacity-50"
          />
        </div>
      </div>
    );
  }

  // If not authenticated, don't render anything (redirect will happen)
  if (!isAuthenticated) {
    return null;
  }

  // User is authenticated, render the protected content
  return <>{children}</>;
}