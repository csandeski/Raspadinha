import { createContext, useContext, useEffect, useState } from "react";
import { apiRequest } from "./queryClient";
import { UTMData } from "./utm-tracking";
import { AffiliateTracker } from "./affiliate-tracker";

interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  balance: string;
  scratchBonus?: number;
  cpf?: string;
}

interface LoginData {
  email?: string;
  phone?: string;
  password: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

interface RegisterData {
  name: string;
  email: string;
  phone: string;
  password: string;
  cpf: string;
  isAdult: boolean;
  referralCode?: string;
  couponCode?: string;
  utmData?: UTMData | null;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      fetchUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const userData = await apiRequest("/api/auth/me", "GET");
      // Fetch balance data as well
      try {
        const balanceData = await apiRequest("/api/user/balance", "GET");
        setUser({
          ...userData,
          balance: balanceData.balance || "0.00",
          scratchBonus: balanceData.scratchBonus || 0
        });
      } catch {
        // If balance fetch fails, just set user data without balance
        setUser({
          ...userData,
          balance: userData.balance || "0.00",
          scratchBonus: userData.scratchBonus || 0
        });
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
      localStorage.removeItem("token");
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (loginData: LoginData) => {
    const data = await apiRequest("/api/auth/login", "POST", loginData);
    
    localStorage.setItem("token", data.token);
    
    // Immediately set the user to avoid 404 during transition
    setUser({ ...data.user, balance: "0.00", scratchBonus: 0 });
    
    // Then fetch updated user data with balance
    fetchUser(); // Don't await to avoid delay
  };

  const register = async (registerData: RegisterData) => {
    // Get affiliate code from tracker if not already provided
    const affiliateCode = registerData.referralCode || AffiliateTracker.getAffiliateRef();
    
    const dataToSend = {
      ...registerData,
      affiliateCode: affiliateCode // Always include affiliate code if available
    };
    
    const data = await apiRequest("/api/auth/register", "POST", dataToSend);
    
    localStorage.setItem("token", data.token);
    setUser({ ...data.user, balance: "0.00", scratchBonus: 0 });
    
    // Clear affiliate reference after successful registration
    if (affiliateCode) {
      AffiliateTracker.clearAffiliateRef();
    }
    
    // Fetch updated user data with balance
    await fetchUser();
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
