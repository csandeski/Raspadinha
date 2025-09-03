// Test script to verify partner commission logic
import { db } from './server/db';
import { partners, partnerCodes, users } from './shared/schema';
import { eq } from 'drizzle-orm';

async function testPartnerCommission() {
  console.log('=== TESTING PARTNER COMMISSION SYSTEM ===\n');
  
  try {
    // Find the partner
    const [partner] = await db.select()
      .from(partners)
      .where(eq(partners.code, 'P9XR49E'))
      .limit(1);
    
    if (partner) {
      console.log('Partner found:');
      console.log('  ID:', partner.id);
      console.log('  Name:', partner.name);
      console.log('  Code:', partner.code);
      console.log('  Affiliate ID:', partner.affiliateId);
      console.log('  Commission Type:', partner.commissionType);
      console.log('  Commission Rate:', partner.commissionRate);
      console.log('  Fixed Amount:', partner.fixedCommissionAmount);
      console.log('  Total Earnings:', partner.totalEarnings);
      
      // Find users registered with partner codes
      const partnerUsers = await db.select()
        .from(users)
        .where(eq(users.referredBy, partner.code))
        .limit(5);
      
      console.log('\nUsers registered with partner code:', partnerUsers.length);
      
      if (partnerUsers.length > 0) {
        console.log('Example user:', {
          id: partnerUsers[0].id,
          name: partnerUsers[0].name,
          referredBy: partnerUsers[0].referredBy
        });
      }
    } else {
      console.log('No partner found with code P9XR49E');
    }
    
    // Check NOVOSIM partner
    const [novoPartner] = await db.select()
      .from(partnerCodes)
      .where(eq(partnerCodes.code, 'NOVOSIM'))
      .limit(1);
    
    if (novoPartner) {
      console.log('\n=== NOVOSIM Partner Code ===');
      console.log('  Partner ID:', novoPartner.partnerId);
      console.log('  Click Count:', novoPartner.clickCount);
      console.log('  Registration Count:', novoPartner.registrationCount);
      
      // Get the actual partner
      const [actualPartner] = await db.select()
        .from(partners)
        .where(eq(partners.id, novoPartner.partnerId))
        .limit(1);
      
      if (actualPartner) {
        console.log('  Partner Name:', actualPartner.name);
        console.log('  Commission Type:', actualPartner.commissionType);
        console.log('  Commission Value:', 
          actualPartner.commissionType === 'fixed' 
            ? `R$${actualPartner.fixedCommissionAmount}` 
            : `${actualPartner.commissionRate}%`
        );
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

testPartnerCommission();
