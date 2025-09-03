// Professional UTM tracking utilities

export interface UTMData {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
  utm_content: string;
  utm_src: string;
  landing_page: string;
}

export function getStoredUTMData(): UTMData | null {
  try {
    // First check sessionStorage (current session)
    const sessionData = sessionStorage.getItem('current_utm_data');
    if (sessionData) {
      return JSON.parse(sessionData);
    }
    
    // Then check localStorage (persistent data)
    const persistentData = localStorage.getItem('raspadinha_utm_data');
    if (persistentData) {
      // Check if data is not too old (30 days)
      const timestamp = localStorage.getItem('raspadinha_utm_timestamp');
      if (timestamp) {
        const age = Date.now() - parseInt(timestamp);
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        
        if (age < thirtyDaysMs) {
          return JSON.parse(persistentData);
        } else {
          // Data is too old, remove it
          localStorage.removeItem('raspadinha_utm_data');
          localStorage.removeItem('raspadinha_utm_timestamp');
        }
      }
    }
    
    // Finally check if UTM data was captured on page load
    if (window.RASPADINHA_UTM && Object.values(window.RASPADINHA_UTM).some(v => v)) {
      return window.RASPADINHA_UTM;
    }
    
    return null;
  } catch (error) {
    console.error('Error retrieving UTM data:', error);
    return null;
  }
}

export function clearStoredUTMData(): void {
  sessionStorage.removeItem('current_utm_data');
  localStorage.removeItem('raspadinha_utm_data');
  localStorage.removeItem('raspadinha_utm_timestamp');
}

// Declare global window property
declare global {
  interface Window {
    RASPADINHA_UTM?: UTMData;
  }
}

// Track conversion events to Facebook Pixel
export function trackFacebookEvent(eventName: string, parameters?: Record<string, any>) {
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('track', eventName, parameters);
  }
}