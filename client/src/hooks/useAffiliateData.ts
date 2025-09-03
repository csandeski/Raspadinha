import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { REALTIME_CONFIG } from "@/lib/affiliate-realtime-config";
import { handleAffiliateAuthError, hasAffiliateToken } from "@/utils/affiliate-auth-handler";

// Custom hook for real-time affiliate data fetching
export function useAffiliateInfo() {
  const hasToken = hasAffiliateToken();
  
  return useQuery({
    queryKey: ["/api/affiliate/info"],
    staleTime: 0, // Always fetch fresh data
    gcTime: 1000, // Keep in cache for 1 second only
    refetchInterval: hasToken ? REALTIME_CONFIG.DASHBOARD_REFRESH : false, // Only refetch if token exists
    refetchOnWindowFocus: hasToken,
    refetchOnMount: true,
    refetchOnReconnect: hasToken,
    enabled: hasToken, // Disable query if no valid token
    retry: false, // Never retry - prevents loops
  });
}

export function useAffiliateEarnings() {
  const token = localStorage.getItem('affiliateToken');
  const hasToken = !!token;
  
  return useQuery({
    queryKey: ["/api/affiliate/earnings"],
    staleTime: 0, // Always fetch fresh data
    gcTime: 1000, // Keep in cache for 1 second only
    refetchInterval: hasToken ? REALTIME_CONFIG.EARNINGS_REFRESH : false, // Only refetch if token exists
    refetchOnWindowFocus: hasToken,
    refetchOnMount: true,
    refetchOnReconnect: hasToken,
    enabled: hasToken,
    retry: false, // Don't retry on errors
  });
}

export function useAffiliateDashboardStats() {
  const token = localStorage.getItem('affiliateToken');
  const hasToken = !!token;
  
  return useQuery({
    queryKey: ["/api/affiliate/dashboard/stats"],
    queryFn: hasToken ? async () => {
      const response = await fetch('/api/affiliate/dashboard/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    } : undefined,
    staleTime: 0,
    gcTime: 1000,
    refetchInterval: hasToken ? REALTIME_CONFIG.DASHBOARD_REFRESH : false, // Only refetch if token exists
    refetchOnWindowFocus: hasToken,
    refetchOnMount: true,
    refetchOnReconnect: hasToken,
    enabled: hasToken,
    retry: false, // Don't retry on errors
  });
}

export function useAffiliatePerformance() {
  const token = localStorage.getItem('affiliateToken');
  const hasToken = !!token;
  
  return useQuery({
    queryKey: ["/api/affiliate/dashboard/performance"],
    queryFn: hasToken ? async () => {
      const response = await fetch('/api/affiliate/dashboard/performance', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch performance');
      return response.json();
    } : undefined,
    staleTime: 0,
    gcTime: 1000,
    refetchInterval: hasToken ? REALTIME_CONFIG.DASHBOARD_REFRESH : false, // Only refetch if token exists
    refetchOnWindowFocus: hasToken,
    refetchOnMount: true,
    refetchOnReconnect: hasToken,
    enabled: hasToken,
    retry: false, // Don't retry on errors
  });
}

// Memoized level calculation
export function useAffiliateLevelInfo(approvedEarnings: number) {
  return useMemo(() => {
    const levels = [
      { name: "Bronze", min: 0, max: 5000, rate: 40, color: "from-orange-600 to-orange-700" },
      { name: "Prata", min: 5000, max: 20000, rate: 45, color: "from-gray-400 to-gray-500" },
      { name: "Ouro", min: 20000, max: 50000, rate: 50, color: "from-yellow-500 to-yellow-600" },
      { name: "Platina", min: 50000, max: 100000, rate: 60, color: "from-cyan-400 to-cyan-500" },
      { name: "Diamante", min: 100000, max: null, rate: 70, color: "from-purple-400 to-purple-500" }
    ];

    let currentLevel = levels[0] || { name: "Bronze", min: 0, max: 5000, rate: 40, color: "from-orange-600 to-orange-700" };
    let nextLevel: typeof levels[0] | null = levels[1] || null;
    
    for (let i = 0; i < levels.length; i++) {
      const level = levels[i];
      if (level && approvedEarnings >= level.min && (level.max === null || approvedEarnings < level.max)) {
        currentLevel = level;
        nextLevel = i < levels.length - 1 ? levels[i + 1] || null : null;
        break;
      }
    }

    const progressToNext = nextLevel 
      ? ((approvedEarnings - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100
      : 100;

    return {
      currentLevel,
      nextLevel,
      progressToNext: Math.min(100, Math.max(0, progressToNext))
    };
  }, [approvedEarnings]);
}

// Debounced search hook
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}