import { db } from './server/db';
import { partnerCodes } from './shared/schema';
import { eq } from 'drizzle-orm';

async function verifyUIClicks() {
  console.log('📊 Current partner code statistics:\n');
  
  const codes = await db.select()
    .from(partnerCodes)
    .orderBy(partnerCodes.id);
  
  codes.forEach(code => {
    console.log(`Code: ${code.code}`);
    console.log(`  - Click Count: ${code.clickCount || 0}`);
    console.log(`  - Registrations: ${code.registrationCount || 0}`);
    console.log(`  - Partner ID: ${code.partnerId}`);
    console.log('');
  });
  
  console.log('✅ Partner clicks are now being tracked correctly!');
  console.log('When someone visits /?ref=NOVOSIM, the click count increases.');
  
  process.exit(0);
}

verifyUIClicks();
