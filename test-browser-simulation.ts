// Simulate what happens when a user visits the site with a partner link
async function simulateBrowserVisit() {
  try {
    console.log('🌐 Simulating browser visit with partner link: /?ref=NOVOSIM\n');
    
    // Simulate the browser tracking the click as the affiliate-tracker.ts would do
    console.log('1. Browser attempts affiliate tracking first...');
    const affiliateResponse = await fetch('http://localhost:5000/api/affiliate/track-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: 'NOVOSIM',
        url: 'http://mania-brasil.com/?ref=NOVOSIM',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      })
    });
    
    console.log('   Affiliate endpoint response:', affiliateResponse.status);
    
    // If affiliate tracking fails, try partner tracking
    if (!affiliateResponse.ok) {
      console.log('2. Code not found in affiliates, trying partner tracking...');
      
      const partnerResponse = await fetch('http://localhost:5000/api/partner/track-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: 'NOVOSIM',
          ipAddress: '',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          referrer: 'https://social-media.com/partner-link'
        })
      });
      
      console.log('   Partner endpoint response:', partnerResponse.status);
      
      if (partnerResponse.ok) {
        console.log('   ✓ Partner click tracked successfully!');
      } else {
        const error = await partnerResponse.json();
        console.log('   ❌ Partner tracking failed:', error);
      }
    } else {
      console.log('   ✓ Tracked as affiliate code');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

simulateBrowserVisit();
