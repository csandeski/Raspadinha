import { db } from './server/db';
import { partnerCodes } from './shared/schema';
import { eq } from 'drizzle-orm';

async function testUpdatedTracking() {
  console.log('🧪 Testing updated partner click tracking...\n');
  
  // Get initial click count
  const [beforeCode] = await db.select()
    .from(partnerCodes)
    .where(eq(partnerCodes.code, 'NOVOSIM'));
  
  const beforeCount = beforeCode?.clickCount || 0;
  console.log('Before - Click Count:', beforeCount);
  
  // Simulate click
  console.log('\nSimulating click...');
  const response = await fetch('http://localhost:5000/api/partner/track-click', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: 'NOVOSIM',
      ipAddress: '192.168.1.100',
      userAgent: 'Test Browser Updated',
      referrer: 'https://test-updated.com'
    })
  });
  
  console.log('Response:', response.status, response.ok ? '✓' : '✗');
  
  // Get updated click count
  const [afterCode] = await db.select()
    .from(partnerCodes)
    .where(eq(partnerCodes.code, 'NOVOSIM'));
  
  const afterCount = afterCode?.clickCount || 0;
  console.log('\nAfter - Click Count:', afterCount);
  
  if (afterCount > beforeCount) {
    console.log('✅ SUCCESS: Click tracking is working! Count increased from', beforeCount, 'to', afterCount);
  } else {
    console.log('❌ FAILED: Click count did not increase');
  }
  
  process.exit(0);
}

testUpdatedTracking();
