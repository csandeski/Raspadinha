// Real-time update configuration for affiliate panel
export const REALTIME_CONFIG = {
  // Refetch intervals in milliseconds
  DASHBOARD_REFRESH: 5000,      // 5 seconds for dashboard stats
  EARNINGS_REFRESH: 5000,        // 5 seconds for earnings updates
  NETWORK_REFRESH: 5000,         // 5 seconds for network updates
  LINKS_REFRESH: 5000,           // 5 seconds for link stats
  WITHDRAWALS_REFRESH: 5000,     // 5 seconds for withdrawal status
  NOTIFICATIONS_REFRESH: 3000,   // 3 seconds for notifications
  
  // Query options for real-time updates
  queryOptions: {
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    staleTime: 0, // Always fetch fresh data
    cacheTime: 1000, // Keep cache for 1 second only
  }
};

// Hook to use real-time config with React Query
export function useRealtimeQuery(queryKey: any[], queryFn?: any, refreshInterval: number = REALTIME_CONFIG.DASHBOARD_REFRESH) {
  return {
    queryKey,
    queryFn,
    refetchInterval: refreshInterval,
    ...REALTIME_CONFIG.queryOptions
  };
}