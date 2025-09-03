// Affiliate tracking system
const AFFILIATE_REF_KEY = 'affiliate_ref';
const AFFILIATE_REF_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

interface AffiliateData {
  code: string;
  timestamp: number;
  source?: string;
  medium?: string;
  campaign?: string;
}

export class AffiliateTracker {
  // Save affiliate reference to localStorage with expiry
  static saveAffiliateRef(code: string, utmParams?: URLSearchParams): void {
    const data: AffiliateData = {
      code: code.toUpperCase(),
      timestamp: Date.now(),
      source: utmParams?.get('utm_source') || undefined,
      medium: utmParams?.get('utm_medium') || undefined,
      campaign: utmParams?.get('utm_campaign') || undefined
    };
    
    localStorage.setItem(AFFILIATE_REF_KEY, JSON.stringify(data));
    console.log('Affiliate reference saved:', code);
  }

  // Get saved affiliate reference if still valid
  static getAffiliateRef(): string | null {
    const stored = localStorage.getItem(AFFILIATE_REF_KEY);
    if (!stored) return null;

    try {
      const data: AffiliateData = JSON.parse(stored);
      const now = Date.now();
      
      // Check if expired (30 days)
      if (now - data.timestamp > AFFILIATE_REF_EXPIRY) {
        localStorage.removeItem(AFFILIATE_REF_KEY);
        return null;
      }
      
      return data.code;
    } catch {
      localStorage.removeItem(AFFILIATE_REF_KEY);
      return null;
    }
  }

  // Get full affiliate data
  static getAffiliateData(): AffiliateData | null {
    const stored = localStorage.getItem(AFFILIATE_REF_KEY);
    if (!stored) return null;

    try {
      const data: AffiliateData = JSON.parse(stored);
      const now = Date.now();
      
      if (now - data.timestamp > AFFILIATE_REF_EXPIRY) {
        localStorage.removeItem(AFFILIATE_REF_KEY);
        return null;
      }
      
      return data;
    } catch {
      localStorage.removeItem(AFFILIATE_REF_KEY);
      return null;
    }
  }

  // Clear affiliate reference
  static clearAffiliateRef(): void {
    localStorage.removeItem(AFFILIATE_REF_KEY);
  }

  // Initialize tracking from URL on page load
  static initFromURL(isAuthenticated: boolean = false): void {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    
    // If user is authenticated, clean URL immediately
    if (isAuthenticated) {
      let needsClean = false;
      
      if (params.has('ref')) {
        params.delete('ref');
        needsClean = true;
      }
      if (params.has('utm_source')) {
        params.delete('utm_source');
        needsClean = true;
      }
      if (params.has('utm_medium')) {
        params.delete('utm_medium');
        needsClean = true;
      }
      if (params.has('utm_campaign')) {
        params.delete('utm_campaign');
        needsClean = true;
      }
      
      if (needsClean) {
        const newSearch = params.toString();
        const newURL = window.location.pathname + (newSearch ? `?${newSearch}` : '');
        window.history.replaceState({}, '', newURL);
      }
      return;
    }
    
    // For non-authenticated users, save ref if present
    if (ref) {
      this.saveAffiliateRef(ref, params);
      
      // Track the click for this affiliate
      this.trackClick(ref);
      
      // Only clean URL on non-critical pages
      // Keep ?ref on home, login, register pages
      const criticalPaths = ['/', '/register', '/login', '/landing'];
      const currentPath = window.location.pathname;
      
      if (!criticalPaths.includes(currentPath)) {
        // Clean URL without losing other params
        params.delete('ref');
        params.delete('utm_source');
        params.delete('utm_medium');
        params.delete('utm_campaign');
        
        const newSearch = params.toString();
        const newURL = window.location.pathname + (newSearch ? `?${newSearch}` : '');
        
        // Update URL without reload
        window.history.replaceState({}, '', newURL);
      }
    }
  }

  // Add ref parameter to URL if we have one saved
  static appendRefToURL(url: string): string {
    const ref = this.getAffiliateRef();
    if (!ref) return url;
    
    try {
      const urlObj = new URL(url, window.location.origin);
      // Only add to critical pages
      const criticalPaths = ['/', '/register', '/login', '/landing'];
      
      if (criticalPaths.includes(urlObj.pathname)) {
        urlObj.searchParams.set('ref', ref);
      }
      
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  // Persist ref parameter across navigation (only for non-authenticated users)
  static persistRef(isAuthenticated: boolean = false): void {
    // If user is authenticated, clean URL from ref and UTM params
    if (isAuthenticated) {
      const params = new URLSearchParams(window.location.search);
      let needsClean = false;
      
      // Remove affiliate and UTM parameters
      if (params.has('ref')) {
        params.delete('ref');
        needsClean = true;
      }
      if (params.has('utm_source')) {
        params.delete('utm_source');
        needsClean = true;
      }
      if (params.has('utm_medium')) {
        params.delete('utm_medium');
        needsClean = true;
      }
      if (params.has('utm_campaign')) {
        params.delete('utm_campaign');
        needsClean = true;
      }
      
      if (needsClean) {
        const newSearch = params.toString();
        const newURL = window.location.pathname + (newSearch ? `?${newSearch}` : '');
        window.history.replaceState({}, '', newURL);
      }
      return;
    }
    
    // Only persist ref for non-authenticated users on critical pages
    const ref = this.getAffiliateRef();
    if (!ref) return;
    
    const params = new URLSearchParams(window.location.search);
    const currentRef = params.get('ref');
    
    // Add ref to URL if missing and on critical page
    const criticalPaths = ['/', '/register', '/login', '/landing'];
    if (!currentRef && criticalPaths.includes(window.location.pathname)) {
      params.set('ref', ref);
      const newURL = window.location.pathname + '?' + params.toString();
      window.history.replaceState({}, '', newURL);
    }
  }

  // Track click for affiliate or partner
  static async trackClick(code: string): Promise<void> {
    try {
      // First try to track as affiliate code
      const affiliateResponse = await fetch('/api/affiliate/track-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code,
          url: window.location.href,
          userAgent: navigator.userAgent
        })
      });
      
      // If affiliate tracking fails (code not found), try partner tracking
      if (!affiliateResponse.ok) {
        await fetch('/api/partner/track-click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: code,
            ipAddress: '',
            userAgent: navigator.userAgent,
            referrer: document.referrer
          })
        });
      }
    } catch (error) {
      console.error('Failed to track click:', error);
    }
  }
}

// Note: Initialization is now handled in App.tsx with authentication status
// No auto-initialization here to avoid conflicts