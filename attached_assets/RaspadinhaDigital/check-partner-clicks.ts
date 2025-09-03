// Check partner clicks data
import { db } from './server/db';
import { partnerCodes, partnerClicks, partners } from './shared/schema';
import { eq } from 'drizzle-orm';

async function checkClicks() {
  console.log('=== CHECKING PARTNER CLICKS ===\n');
  
  try {
    // 1. Check partner codes
    const codes = await db.select().from(partnerCodes);
    console.log('Partner Codes:');
    for (const code of codes) {
      console.log(`  ${code.code}: clickCount=${code.clickCount}, registrations=${code.registrationCount}`);
    }
    
    // 2. Check partner clicks table
    const clicks = await db.select().from(partnerClicks).limit(10);
    console.log('\nRecent Partner Clicks:', clicks.length);
    for (const click of clicks.slice(0, 3)) {
      console.log(`  Code: ${click.code}, Partner ID: ${click.partnerId}, Time: ${click.createdAt}`);
    }
    
    // 3. Check partners total clicks
    const partnersList = await db.select().from(partners);
    console.log('\nPartners Total Clicks:');
    for (const partner of partnersList) {
      console.log(`  ${partner.name}: totalClicks=${partner.totalClicks}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

checkClicks();
