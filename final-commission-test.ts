import { db } from './server/db';
import { deposits, partners, affiliates, partnerConversions, partnersWallet, affiliatesWallet } from './shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

async function finalCommissionTest() {
  console.log('\n🚀 FINAL COMMISSION SYSTEM TEST 🚀\n');
  console.log('==========================================\n');
  
  try {
    // 1. Initial State Check
    console.log('📊 CHECKING INITIAL STATE:');
    console.log('---------------------------');
    
    const [partner] = await db.select()
      .from(partners)
      .where(eq(partners.id, 2));
    console.log(`Partner "${partner.name}":`);
    console.log(`  - Total Earnings: R$${partner.totalEarnings || '0.00'}`);
    console.log(`  - Approved Earnings: R$${partner.approvedEarnings || '0.00'}`);
    
    const [partnerWallet] = await db.select()
      .from(partnersWallet)
      .where(eq(partnersWallet.partnerId, 2));
    console.log(`  - Wallet Balance: R$${partnerWallet?.balance || '0.00'}`);
    
    const [affiliate] = await db.select()
      .from(affiliates)
      .where(eq(affiliates.id, 12));
    console.log(`\nAffiliate "${affiliate.name}":`);
    console.log(`  - Total Earnings: R$${affiliate.totalEarnings || '0.00'}`);
    console.log(`  - Approved Earnings: R$${affiliate.approvedEarnings || '0.00'}`);
    
    const [affiliateWallet] = await db.select()
      .from(affiliatesWallet)
      .where(eq(affiliatesWallet.affiliateId, 12));
    console.log(`  - Wallet Balance: R$${affiliateWallet?.balance || '0.00'}`);
    
    // 2. Create and approve test deposit
    console.log('\n💰 CREATING TEST DEPOSIT:');
    console.log('---------------------------');
    const userId = 143;
    const depositAmount = '250.00';
    const transactionId = 'FINAL_TEST_' + Date.now();
    const displayId = Math.floor(100000 + Math.random() * 900000);
    
    const [newDeposit] = await db.insert(deposits).values({
      userId,
      amount: depositAmount,
      status: 'pending',
      transactionId,
      displayId,
      provider: 'test',
      createdAt: new Date()
    }).returning();
    
    console.log(`  ✅ Deposit created: #${newDeposit.id}`);
    console.log(`  💵 Amount: R$${depositAmount}`);
    console.log(`  👤 User ID: ${userId}`);
    
    // 3. Approve payment
    console.log('\n⚙️ PROCESSING PAYMENT:');
    console.log('---------------------------');
    const response = await fetch('http://localhost:5000/api/test/approve-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactionId,
        depositId: newDeposit.id,
        amount: depositAmount
      })
    });
    
    const result = await response.json();
    console.log(`  ${result.success ? '✅' : '❌'} ${result.message}`);
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 4. Check commission creation
    console.log('\n📋 COMMISSION RESULTS:');
    console.log('---------------------------');
    
    const [latestConversion] = await db.select()
      .from(partnerConversions)
      .where(and(
        eq(partnerConversions.partnerId, 2),
        eq(partnerConversions.userId, userId)
      ))
      .orderBy(desc(partnerConversions.id))
      .limit(1);
    
    if (latestConversion) {
      console.log('  ✅ Commission created successfully!');
      console.log(`  💰 Partner commission: R$${latestConversion.partnerCommission}`);
      console.log(`  💰 Affiliate commission: R$${latestConversion.affiliateCommission}`);
      console.log(`  📊 Status: ${latestConversion.status}`);
    } else {
      console.log('  ❌ No commission found!');
    }
    
    // 5. Final state check
    console.log('\n📊 FINAL STATE:');
    console.log('---------------------------');
    
    const [partnerAfter] = await db.select()
      .from(partners)
      .where(eq(partners.id, 2));
    const [partnerWalletAfter] = await db.select()
      .from(partnersWallet)
      .where(eq(partnersWallet.partnerId, 2));
    
    console.log(`Partner "${partnerAfter.name}":`);
    console.log(`  - Total Earnings: R$${partnerAfter.totalEarnings || '0.00'}`);
    console.log(`  - Wallet Balance: R$${partnerWalletAfter?.balance || '0.00'}`);
    
    const [affiliateAfter] = await db.select()
      .from(affiliates)
      .where(eq(affiliates.id, 12));
    const [affiliateWalletAfter] = await db.select()
      .from(affiliatesWallet)
      .where(eq(affiliatesWallet.affiliateId, 12));
    
    console.log(`\nAffiliate "${affiliateAfter.name}":`);
    console.log(`  - Total Earnings: R$${affiliateAfter.totalEarnings || '0.00'}`);
    console.log(`  - Wallet Balance: R$${affiliateWalletAfter?.balance || '0.00'}`);
    
    // 6. Test API endpoints
    console.log('\n🌐 TESTING API ENDPOINTS:');
    console.log('---------------------------');
    
    // Get all conversions for the partner
    const allConversions = await db.select()
      .from(partnerConversions)
      .where(eq(partnerConversions.partnerId, 2));
    
    const totalPartnerCommissions = allConversions.reduce((sum, c) => 
      sum + parseFloat(c.partnerCommission || '0'), 0
    );
    
    console.log(`  📊 Total conversions: ${allConversions.length}`);
    console.log(`  💰 Total partner commissions: R$${totalPartnerCommissions.toFixed(2)}`);
    console.log(`  ✅ Database values match wallet: ${totalPartnerCommissions.toFixed(2) === partnerWalletAfter?.balance ? 'YES' : 'NO'}`);
    
    // 7. Summary
    console.log('\n==========================================');
    console.log('📈 TEST SUMMARY:');
    console.log('==========================================');
    
    const expectedPartner = 3.00; // Fixed R$3
    const expectedAffiliate = 250 * 0.85 - expectedPartner; // 85% - R$3
    
    console.log(`\nExpected values for R$${depositAmount} deposit:`);
    console.log(`  - Partner: R$${expectedPartner.toFixed(2)}`);
    console.log(`  - Affiliate: R$${expectedAffiliate.toFixed(2)}`);
    
    const actualPartnerIncrease = parseFloat(partnerWalletAfter?.balance || '0') - parseFloat(partnerWallet?.balance || '0');
    const actualAffiliateIncrease = parseFloat(affiliateAfter.totalEarnings || '0') - parseFloat(affiliate.totalEarnings || '0');
    
    console.log(`\nActual increases:`);
    console.log(`  - Partner: R$${actualPartnerIncrease.toFixed(2)}`);
    console.log(`  - Affiliate: R$${actualAffiliateIncrease.toFixed(2)}`);
    
    const partnerCorrect = Math.abs(actualPartnerIncrease - expectedPartner) < 0.01;
    const affiliateCorrect = Math.abs(actualAffiliateIncrease - expectedAffiliate) < 0.01;
    
    console.log(`\n🎯 RESULTS:`);
    console.log(`  Partner commission: ${partnerCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`);
    console.log(`  Affiliate commission: ${affiliateCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`);
    
    if (partnerCorrect && affiliateCorrect) {
      console.log('\n✅✅✅ ALL TESTS PASSED! SYSTEM IS WORKING CORRECTLY! ✅✅✅');
    } else {
      console.log('\n❌ SOME TESTS FAILED - CHECK THE VALUES ABOVE');
    }
    
  } catch (error) {
    console.error('\n❌ TEST ERROR:', error);
  } finally {
    process.exit(0);
  }
}

finalCommissionTest();