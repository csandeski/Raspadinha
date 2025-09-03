import { db } from './server/db';
import { partnerCodes } from './shared/schema';
import { eq } from 'drizzle-orm';

async function testClickTracking() {
  try {
    // Check current click count for NOVOSIM
    const [beforeClick] = await db.select()
      .from(partnerCodes)
      .where(eq(partnerCodes.code, 'NOVOSIM'));
    
    console.log('Before click - Code: NOVOSIM, Click Count:', beforeClick?.clickCount || 0);
    
    // Simulate a click
    console.log('\nSimulating click on NOVOSIM...');
    const response = await fetch('http://localhost:5000/api/partner/track-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: 'NOVOSIM',
        ipAddress: '192.168.1.1',
        userAgent: 'Test Browser',
        referrer: 'https://test.com'
      })
    });
    
    const result = await response.json();
    console.log('API Response:', response.status, result);
    
    // Check updated click count
    const [afterClick] = await db.select()
      .from(partnerCodes)
      .where(eq(partnerCodes.code, 'NOVOSIM'));
    
    console.log('\nAfter click - Code: NOVOSIM, Click Count:', afterClick?.clickCount || 0);
    
    if ((afterClick?.clickCount || 0) > (beforeClick?.clickCount || 0)) {
      console.log('✅ Click count increased!');
    } else {
      console.log('❌ Click count did NOT increase');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

testClickTracking();
