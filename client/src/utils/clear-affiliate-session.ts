// Clear all affiliate session data
export function clearAffiliateSession() {
  // Clear all localStorage items
  localStorage.removeItem('affiliateToken');
  localStorage.removeItem('affiliateRememberMe');
  
  // Clear sessionStorage
  sessionStorage.clear();
  
  // Force redirect to auth page
  window.location.href = '/afiliados/auth';
}
