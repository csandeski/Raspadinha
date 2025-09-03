import { db } from './server/db';
import { partnerCodes, partners } from './shared/schema';
import { eq } from 'drizzle-orm';

async function checkPartnerSession() {
  try {
    // Check all partners
    const allPartners = await db.select().from(partners);
    console.log('All partners:', allPartners.map(p => ({ id: p.id, name: p.name, email: p.email })));
    
    // Check all partner codes
    const allCodes = await db.select().from(partnerCodes);
    console.log('\nAll partner codes in database:');
    allCodes.forEach(code => {
      console.log(`- ID: ${code.id}, Partner: ${code.partnerId}, Code: ${code.code}`);
    });
    
    // Check codes for partner ID 11 (from login response)
    const partner11Codes = await db.select()
      .from(partnerCodes)
      .where(eq(partnerCodes.partnerId, 11));
    console.log('\nCodes for partner ID 11:', partner11Codes);
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

checkPartnerSession();
