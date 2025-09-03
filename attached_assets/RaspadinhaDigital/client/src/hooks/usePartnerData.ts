import { useQuery } from "@tanstack/react-query";

// Partner Info Hook
export function usePartnerInfo() {
  const token = localStorage.getItem('partnerToken');
  
  return useQuery({
    queryKey: ['/api/partner/info'],
    enabled: !!token,
    retry: false,
    queryFn: async () => {
      const response = await fetch('/api/partner/info', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('partnerToken');
          window.location.href = '/parceiros-login';
          throw new Error('Unauthorized');
        }
        throw new Error('Failed to fetch partner info');
      }
      
      return response.json();
    },
  });
}

// Partner Earnings Hook
export function usePartnerEarnings() {
  const token = localStorage.getItem('partnerToken');
  
  return useQuery({
    queryKey: ['/api/partner/earnings'],
    enabled: !!token,
    retry: false,
    queryFn: async () => {
      const response = await fetch('/api/partner/earnings', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('partnerToken');
          window.location.href = '/parceiros-login';
          throw new Error('Unauthorized');
        }
        throw new Error('Failed to fetch earnings');
      }
      
      return response.json();
    },
  });
}

// Partner Dashboard Stats Hook
export function usePartnerDashboardStats() {
  const token = localStorage.getItem('partnerToken');
  
  return useQuery({
    queryKey: ['/api/partner/dashboard-stats'],
    enabled: !!token,
    retry: false,
    refetchInterval: 30000, // Refresh every 30 seconds
    queryFn: async () => {
      const response = await fetch('/api/partner/dashboard-stats', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('partnerToken');
          window.location.href = '/parceiros-login';
          throw new Error('Unauthorized');
        }
        throw new Error('Failed to fetch stats');
      }
      
      return response.json();
    },
  });
}

// Partner Performance Hook
export function usePartnerPerformance() {
  const token = localStorage.getItem('partnerToken');
  
  return useQuery({
    queryKey: ['/api/partner/performance'],
    enabled: !!token,
    retry: false,
    queryFn: async () => {
      const response = await fetch('/api/partner/performance', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('partnerToken');
          window.location.href = '/parceiros-login';
          throw new Error('Unauthorized');
        }
        throw new Error('Failed to fetch performance data');
      }
      
      return response.json();
    },
  });
}

// Partner Level Info Calculator (Partners don't have levels, but we'll return static values)
export function usePartnerLevelInfo(approvedEarnings: number) {
  // Partners don't have levels, return default values
  return {
    currentLevel: 'Parceiro',
    nextLevel: null,
    progressToNext: 100,
    minEarnings: 0,
    maxEarnings: 0
  };
}