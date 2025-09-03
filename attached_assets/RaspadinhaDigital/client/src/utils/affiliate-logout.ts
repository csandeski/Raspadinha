import { queryClient } from "@/lib/queryClient";

/**
 * Complete logout function for affiliate panel
 * Ensures all data is cleared and user is redirected properly
 */
export function performAffiliateLogout(showToast = true) {
  // Step 1: Cancel all active queries immediately
  queryClient.cancelQueries();
  
  // Step 2: Clear React Query cache
  queryClient.clear();
  queryClient.invalidateQueries();
  
  // Step 3: Remove ALL authentication data from localStorage
  const keysToRemove = [
    'affiliateToken',
    'affiliateRememberMe',
    'affiliateData',
    'affiliateInfo',
    'affiliateTokenPersistent',  // IMPORTANT: Remove persistent token
    'affiliateEmailPersistent'   // IMPORTANT: Remove persistent email
  ];
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
  });
  
  // Step 4: Clear ALL sessionStorage
  sessionStorage.clear();
  
  // Step 5: Clear any cookies (if used)
  document.cookie.split(";").forEach(function(c) { 
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
  });
  
  // Step 6: Toast will be shown if needed by the calling component
  
  // Step 7: Force hard redirect to auth page (not landing page)
  // Using replace to prevent back button from returning to protected pages
  window.location.replace("/afiliados/auth");
}