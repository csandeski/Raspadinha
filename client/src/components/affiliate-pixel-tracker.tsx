import { useEffect, useState } from 'react';
import { FacebookPixel } from './facebook-pixel';

export function AffiliatePixelTracker() {
  const [pixelId, setPixelId] = useState<string>('');

  useEffect(() => {
    // Get ref parameter from URL
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    
    if (!refCode) {
      return;
    }


    // Fetch pixel ID for this affiliate code
    const fetchPixelId = async () => {
      try {
        const response = await fetch(`/api/public/affiliate-pixel/${refCode}`);
        if (response.ok) {
          const data = await response.json();
          if (data.pixelId) {
            setPixelId(data.pixelId);
          }
        }
      } catch (error) {
        // Silently handle error
      }
    };

    fetchPixelId();
  }, []);

  // Only render FacebookPixel if we have a pixel ID
  if (!pixelId) {
    return null;
  }

  return <FacebookPixel pixelId={pixelId} />;
}