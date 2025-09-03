import { db } from './server/db';
import { partnerCodes } from './shared/schema';

async function listAllCodes() {
  try {
    const allCodes = await db.select().from(partnerCodes).orderBy(partnerCodes.id);
    console.log('All partner codes in database:');
    allCodes.forEach(code => {
      console.log(`ID: ${code.id}, PartnerID: ${code.partnerId}, Code: ${code.code}, Created: ${code.createdAt}`);
    });
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

listAllCodes();
