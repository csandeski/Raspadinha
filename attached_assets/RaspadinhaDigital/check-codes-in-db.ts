import { db } from './server/db';
import { partnerCodes } from './shared/schema';

async function checkCodes() {
  try {
    const allCodes = await db.select().from(partnerCodes).orderBy(partnerCodes.id);
    console.log('Total codes in database:', allCodes.length);
    console.log('\nAll partner codes:');
    allCodes.forEach(code => {
      console.log(`- ID: ${code.id}, Partner: ${code.partnerId}, Code: ${code.code}`);
    });
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

checkCodes();
