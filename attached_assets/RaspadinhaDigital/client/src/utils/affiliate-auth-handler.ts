import { queryClient } from "@/lib/queryClient";

// Utility to handle affiliate authentication errors
export function handleAffiliateAuthError() {
  // Clear all affiliate authentication data
  localStorage.removeItem('affiliateToken');
  localStorage.removeItem('affiliateRememberMe');
  sessionStorage.clear();
  
  // Clear React Query cache to stop all queries
  queryClient.clear();
  
  // Force redirect to auth page
  window.location.href = '/afiliados/auth';
}

// Check if we have a valid token
export function hasAffiliateToken(): boolean {
  const token = localStorage.getItem('affiliateToken');
  return !!token;
}