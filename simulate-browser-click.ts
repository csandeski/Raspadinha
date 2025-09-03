// Simulate what the browser does when visiting with partner link
async function simulateBrowserClick() {
  console.log('🌐 Simulating browser visit: /?ref=NOVOSIM\n');
  
  // This is exactly what affiliate-tracker.ts does
  const code = 'NOVOSIM';
  
  // First try affiliate
  console.log('1. Browser tries affiliate tracking...');
  const affiliateResponse = await fetch('http://localhost:5000/api/affiliate/track-click', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: code,
      url: 'http://mania-brasil.com/?ref=NOVOSIM',
      userAgent: 'Mozilla/5.0 Browser'
    })
  });
  
  console.log('   Response:', affiliateResponse.status);
  
  // If affiliate fails, try partner (as per our updated affiliate-tracker.ts)
  if (!affiliateResponse.ok) {
    console.log('2. Affiliate failed, trying partner tracking...');
    const partnerResponse = await fetch('http://localhost:5000/api/partner/track-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: code,
        ipAddress: '',
        userAgent: 'Mozilla/5.0 Browser',
        referrer: 'https://social-media.com'
      })
    });
    
    console.log('   Partner response:', partnerResponse.status);
    if (partnerResponse.ok) {
      console.log('   ✅ Partner click tracked successfully!');
    }
  } else {
    console.log('   ⚠️ Code was tracked as affiliate (unexpected)');
  }
  
  process.exit(0);
}

simulateBrowserClick();
