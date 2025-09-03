import { db } from './server/db';
import { partnerCodes, partners } from './shared/schema';
import { eq } from 'drizzle-orm';

async function verifyClicks() {
  try {
    // Get partner with ID 2 (Parceiro Master)
    const [partner] = await db.select().from(partners).where(eq(partners.id, 2));
    console.log('Partner found:', partner?.name, '- Email:', partner?.email);
    
    // Get all partner codes
    const codes = await db.select().from(partnerCodes).orderBy(partnerCodes.id);
    console.log('\n📊 Partner codes with click counts:');
    codes.forEach(code => {
      console.log(`  Code: ${code.code} | Clicks: ${code.clickCount} | Partner ID: ${code.partnerId}`);
    });
    
    // Track another click to see if count increases
    console.log('\n🔄 Simulating another click on NOVOSIM...');
    const beforeClick = codes.find(c => c.code === 'NOVOSIM');
    
    const clickResponse = await fetch('http://localhost:5000/api/partner/track-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: 'NOVOSIM',
        ipAddress: '192.168.1.200',
        userAgent: 'Test Browser',
        referrer: 'https://test.com',
        url: '/?ref=NOVOSIM'
      })
    });
    
    if (clickResponse.ok) {
      // Check updated count
      const [afterClick] = await db.select()
        .from(partnerCodes)
        .where(eq(partnerCodes.code, 'NOVOSIM'));
      
      console.log('\n✅ Click tracking results:');
      console.log(`  Before: ${beforeClick?.clickCount || 0} clicks`);
      console.log(`  After: ${afterClick?.clickCount || 0} clicks`);
      
      if ((afterClick?.clickCount || 0) > (beforeClick?.clickCount || 0)) {
        console.log('  🎉 Click count increased successfully!');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

verifyClicks();
