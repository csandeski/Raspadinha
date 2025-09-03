// Compare how affiliate and partner clicks are tracked
async function compareTracking() {
  console.log('📊 Comparing Affiliate vs Partner Click Tracking\n');
  
  // Test affiliate tracking
  console.log('1. Testing AFFILIATE code (FAB14) tracking:');
  const affiliateResp = await fetch('http://localhost:5000/api/affiliate/track-click', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: 'FAB14',
      url: 'http://test.com',
      userAgent: 'Test'
    })
  });
  console.log('   Response:', affiliateResp.status, affiliateResp.ok ? '✓' : '✗');
  
  // Test partner tracking
  console.log('\n2. Testing PARTNER code (NOVOSIM) tracking:');
  const partnerResp = await fetch('http://localhost:5000/api/partner/track-click', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: 'NOVOSIM',
      ipAddress: '',
      userAgent: 'Test',
      referrer: 'test'
    })
  });
  console.log('   Response:', partnerResp.status, partnerResp.ok ? '✓' : '✗');
  
  process.exit(0);
}

compareTracking();
