// Test what happens when browser visits with partner code
async function testFrontendTracking() {
  console.log('Testing frontend tracking flow for partner code NOVOSIM...\n');
  
  // Step 1: Try affiliate endpoint (as the frontend does)
  console.log('1. Testing affiliate endpoint with NOVOSIM:');
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
  if (affiliateResponse.ok) {
    console.log('   ✓ NOVOSIM is being tracked as AFFILIATE code (this is the problem!)');
  } else {
    console.log('   ✗ Not found in affiliates (expected)');
  }
  
  // Step 2: Check if NOVOSIM exists in affiliates table
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);
  
  try {
    const { stdout } = await execAsync(`npx tsx -e "
      import { db } from './server/db';
      import { affiliates, affiliateCodes } from './shared/schema';
      import { eq } from 'drizzle-orm';
      
      Promise.all([
        db.select().from(affiliates).where(eq(affiliates.code, 'NOVOSIM')),
        db.select().from(affiliateCodes).where(eq(affiliateCodes.code, 'NOVOSIM'))
      ]).then(([affiliates, codes]) => {
        if (affiliates.length > 0) console.log('Found in affiliates table!');
        if (codes.length > 0) console.log('Found in affiliate_codes table!');
        if (affiliates.length === 0 && codes.length === 0) console.log('NOT found in affiliate tables');
        process.exit(0);
      });
    "`);
    console.log('\n2. Database check:', stdout.trim());
  } catch (error) {
    console.log('   Error checking database');
  }
  
  process.exit(0);
}

testFrontendTracking();
