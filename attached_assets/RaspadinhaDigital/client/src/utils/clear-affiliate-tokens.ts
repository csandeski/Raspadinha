// Utility to clear affiliate tokens
export function clearAffiliateTokens() {
  localStorage.removeItem('affiliateToken');
  localStorage.removeItem('affiliateRememberMe');
  
  // Also clear from session storage if any
  sessionStorage.removeItem('affiliateToken');
  sessionStorage.removeItem('affiliateRememberMe');
  
  console.log('Affiliate tokens cleared');
}

// Execute immediately if there's an expired token
if (typeof window !== 'undefined') {
  const token = localStorage.getItem('affiliateToken');
  
  // If there's a token but the page is showing auth errors, clear it
  if (token && window.location.pathname.includes('/afiliados')) {
    // Check if token might be expired by looking at recent errors
    const lastAuthError = sessionStorage.getItem('lastAuthError');
    if (lastAuthError === '401') {
      clearAffiliateTokens();
      sessionStorage.removeItem('lastAuthError');
    }
  }
}