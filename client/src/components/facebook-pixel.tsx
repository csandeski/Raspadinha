import { useEffect } from 'react';

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

interface FacebookPixelProps {
  pixelId: string;
}

export function FacebookPixel({ pixelId }: FacebookPixelProps) {
  useEffect(() => {
    if (!pixelId) return;

    // Security validation: Ensure pixel ID is safe
    const sanitizedPixelId = pixelId.replace(/[^0-9]/g, '');
    
    // Security check: Only proceed if pixel ID is purely numeric and valid length
    if (sanitizedPixelId !== pixelId || !/^\d{15,16}$/.test(sanitizedPixelId)) {
      console.error('[Security] Invalid Facebook Pixel ID format detected');
      return;
    }
    
    // Additional security: Check for suspicious patterns
    if (/^0+$/.test(sanitizedPixelId) || 
        /^(\d)\1+$/.test(sanitizedPixelId) ||
        sanitizedPixelId === '123456789012345' ||
        sanitizedPixelId === '1234567890123456') {
      console.error('[Security] Suspicious Facebook Pixel ID pattern detected');
      return;
    }

    // Check if pixel is already loaded
    if (window.fbq) {
      return;
    }

    // Facebook Pixel Code - Using sanitized ID for security
    const script = document.createElement('script');
    script.innerHTML = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      
      fbq('init', '${sanitizedPixelId}');
      fbq('track', 'PageView');
    `;

    document.head.appendChild(script);

  }, [pixelId]);

  return (
    <>
      {/* Noscript fallback */}
      <noscript>
        <img 
          height="1" 
          width="1" 
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${pixelId.replace(/[^0-9]/g, '')}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}

// Helper functions to track events
export const trackFBEvent = (event: string, data?: any) => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', event, data);
  }
};

// Track registration conversion
export const trackRegistration = (value?: number, currency?: string) => {
  trackFBEvent('CompleteRegistration', {
    value: value || 0,
    currency: currency || 'BRL',
    content_name: 'User Registration'
  });
};

// Track deposit conversion
export const trackPurchase = (value: number, currency: string = 'BRL') => {
  trackFBEvent('Purchase', {
    value: value,
    currency: currency,
    content_name: 'Deposit'
  });
};

// Track lead event (when user shows interest)
export const trackLead = () => {
  trackFBEvent('Lead', {
    content_name: 'Affiliate Link Click'
  });
};

// Track when user views content
export const trackViewContent = (contentName: string) => {
  trackFBEvent('ViewContent', {
    content_name: contentName
  });
};

// Track initiate checkout (starts deposit process)
export const trackInitiateCheckout = (value?: number) => {
  trackFBEvent('InitiateCheckout', {
    value: value || 0,
    currency: 'BRL',
    content_name: 'Start Deposit'
  });
};