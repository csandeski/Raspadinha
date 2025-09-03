async function testFixedTracking() {
  console.log('🧪 Testing fixed click tracking for partner code NOVOSIM...\n');
  
  // Get initial click count
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);
  
  const getClickCount = async () => {
    const { stdout } = await execAsync(`npx tsx -e "
      import { db } from './server/db';
      import { partnerCodes } from './shared/schema';
      import { eq } from 'drizzle-orm';
      
      db.select()
        .from(partnerCodes)
        .where(eq(partnerCodes.code, 'NOVOSIM'))
        .then(codes => {
          if (codes.length > 0) {
            console.log(codes[0].clickCount || 0);
          }
          process.exit(0);
        });
    "`);
    return parseInt(stdout.trim()) || 0;
  };
  
  const beforeClick = await getClickCount();
  console.log('Initial click count:', beforeClick);
  
  // Step 1: Try affiliate endpoint (should now return 404)
  console.log('\n1. Testing affiliate endpoint with NOVOSIM:');
  const affiliateResponse = await fetch('http://localhost:5000/api/affiliate/track-click', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: 'NOVOSIM',
      url: 'http://mania-brasil.com/?ref=NOVOSIM',
      userAgent: 'Mozilla/5.0'
    })
  });
  
  console.log('   Affiliate response:', affiliateResponse.status);
  if (affiliateResponse.status === 404) {
    console.log('   ✓ Correctly returned 404 (not found in affiliates)');
    
    // Step 2: Try partner endpoint
    console.log('\n2. Now tracking with partner endpoint:');
    const partnerResponse = await fetch('http://localhost:5000/api/partner/track-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: 'NOVOSIM',
        ipAddress: '',
        userAgent: 'Mozilla/5.0',
        referrer: 'https://test.com'
      })
    });
    
    console.log('   Partner response:', partnerResponse.status);
    if (partnerResponse.ok) {
      console.log('   ✓ Partner click tracked successfully!');
    }
  }
  
  // Check if click count increased
  const afterClick = await getClickCount();
  console.log('\n3. Final click count:', afterClick);
  
  if (afterClick > beforeClick) {
    console.log('   ✅ SUCCESS: Click count increased from', beforeClick, 'to', afterClick);
  } else {
    console.log('   ❌ PROBLEM: Click count did not increase');
  }
  
  process.exit(0);
}

testFixedTracking();
