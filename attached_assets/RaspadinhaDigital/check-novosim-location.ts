import { db } from './server/db';
import { affiliates, affiliateCodes, partnerCodes, partners } from './shared/schema';
import { eq } from 'drizzle-orm';

async function checkNovosimLocation() {
  try {
    console.log('Checking where NOVOSIM code exists...\n');
    
    // Check in affiliates table
    const [affiliate] = await db.select()
      .from(affiliates)
      .where(eq(affiliates.code, 'NOVOSIM'));
    
    if (affiliate) {
      console.log('❌ FOUND in affiliates table! ID:', affiliate.id);
    }
    
    // Check in affiliate_codes table
    const [affiliateCode] = await db.select()
      .from(affiliateCodes)
      .where(eq(affiliateCodes.code, 'NOVOSIM'));
    
    if (affiliateCode) {
      console.log('❌ FOUND in affiliate_codes table! ID:', affiliateCode.id);
    }
    
    // Check in partner_codes table
    const [partnerCode] = await db.select()
      .from(partnerCodes)
      .where(eq(partnerCodes.code, 'NOVOSIM'));
    
    if (partnerCode) {
      console.log('✓ FOUND in partner_codes table! ID:', partnerCode.id, 'Partner ID:', partnerCode.partnerId);
    }
    
    // Check in partners table
    const [partner] = await db.select()
      .from(partners)
      .where(eq(partners.code, 'NOVOSIM'));
    
    if (partner) {
      console.log('? FOUND in partners table (old code field)! ID:', partner.id);
    }
    
    if (!affiliate && !affiliateCode && partnerCode) {
      console.log('\n✅ NOVOSIM should be tracked as PARTNER code');
    } else if (affiliate || affiliateCode) {
      console.log('\n❌ PROBLEM: NOVOSIM exists in both affiliate and partner tables!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

checkNovosimLocation();
