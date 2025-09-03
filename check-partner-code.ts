import { db } from './server/db';
import { partnerCodes } from './shared/schema';

async function checkPartnerCodes() {
  try {
    const codes = await db.select().from(partnerCodes);
    console.log('Partner codes in database:', codes);
    
    if (codes.length > 0) {
      console.log('\nChecking specific code NOVOTES:');
      const novotes = await db.select()
        .from(partnerCodes)
        .where(eq(partnerCodes.code, 'NOVOTES'));
      console.log('NOVOTES result:', novotes);
    }
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

import { eq } from 'drizzle-orm';
checkPartnerCodes();
