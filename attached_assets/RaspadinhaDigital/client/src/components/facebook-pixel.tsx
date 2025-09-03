import { useEffect } from 'react';
import { useLocation } from 'wouter';

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

export const FacebookPixel = () => {
  const [location] = useLocation();

  useEffect(() => {
    // Initialize Facebook Pixel
    if (!window.fbq) {
      (function(f: any, b: any, e: any, v: any, n: any, t: any, s: any) {
        if (f.fbq) return;
        n = f.fbq = function() {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n;
        n.push = n;
        n.loaded = !0;
        n.version = '2.0';
        n.queue = [];
        t = b.createElement(e);
        t.async = !0;
        t.src = v;
        s = b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t, s);
      })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      
      window.fbq('init', '660691210359898');
      window.fbq('track', 'PageView');
    }
  }, []);

  useEffect(() => {
    // Track ViewContent for game pages
    if (window.fbq) {
      if (location.includes('/game-minigame-') || location.includes('/game-premio-')) {
        window.fbq('track', 'ViewContent', {
          content_type: 'game',
          content_name: location
        });
      }
    }
  }, [location]);

  return (
    <>
      {/* Noscript fallback */}
      <noscript>
        <img 
          height="1" 
          width="1" 
          style={{ display: 'none' }}
          src="https://www.facebook.com/tr?id=660691210359898&ev=PageView&noscript=1"
          alt=""
        />
      </noscript>
    </>
  );
};