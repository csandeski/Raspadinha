import { db } from './server/db';
import { deposits, users, partners, affiliates, partnerConversions, partnersWallet, affiliatesWallet } from './shared/schema';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

async function testCommissionCreation() {
  console.log('\n=== TESTING COMMISSION CREATION ===\n');
  
  try {
    const userId = 143; // Novo Felipe (registered via partner)
    const depositAmount = '200.00';
    const transactionId = 'TEST_COMMISSION_' + Date.now();
    
    // 1. Show initial state
    console.log('📊 INITIAL STATE:');
    
    // Check partner wallet
    const [partnerWalletBefore] = await db.select()
      .from(partnersWallet)
      .where(eq(partnersWallet.partnerId, 2));
    console.log('Partner wallet balance BEFORE: R$', partnerWalletBefore?.balance || '0.00');
    
    // Check affiliate wallet
    const [affiliateWalletBefore] = await db.select()
      .from(affiliatesWallet)
      .where(eq(affiliatesWallet.affiliateId, 12));
    console.log('Affiliate wallet balance BEFORE: R$', affiliateWalletBefore?.balance || '0.00');
    
    // 2. Create test deposit
    console.log('\n📝 Creating test deposit...');
    const displayId = Math.floor(100000 + Math.random() * 900000); // Generate random 6-digit display ID
    const [newDeposit] = await db.insert(deposits).values({
      userId,
      amount: depositAmount,
      status: 'pending',
      transactionId,
      displayId,
      provider: 'test',
      createdAt: new Date()
    }).returning();
    
    console.log('Deposit created: ID', newDeposit.id);
    
    // 3. Approve payment via API
    console.log('\n✅ Approving payment via API...');
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
    console.log('API Response:', result.message);
    
    // 4. Wait a bit for processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 5. Check results
    console.log('\n📊 FINAL STATE:');
    
    // Check partner wallet after
    const [partnerWalletAfter] = await db.select()
      .from(partnersWallet)
      .where(eq(partnersWallet.partnerId, 2));
    console.log('Partner wallet balance AFTER: R$', partnerWalletAfter?.balance || '0.00');
    
    // Check affiliate wallet after
    const [affiliateWalletAfter] = await db.select()
      .from(affiliatesWallet)
      .where(eq(affiliatesWallet.affiliateId, 12));
    console.log('Affiliate wallet balance AFTER: R$', affiliateWalletAfter?.balance || '0.00');
    
    // Check partner conversions
    const conversions = await db.select()
      .from(partnerConversions)
      .where(eq(partnerConversions.partnerId, 2));
    
    console.log('\n📋 PARTNER CONVERSIONS:');
    console.log('Total conversions:', conversions.length);
    
    const totalPartnerCommission = conversions.reduce((sum, c) => 
      sum + parseFloat(c.partnerCommission || '0'), 0
    );
    const totalAffiliateCommission = conversions.reduce((sum, c) => 
      sum + parseFloat(c.affiliateCommission || '0'), 0
    );
    
    console.log('Total partner commission: R$', totalPartnerCommission.toFixed(2));
    console.log('Total affiliate commission: R$', totalAffiliateCommission.toFixed(2));
    
    // Calculate expected values
    console.log('\n🧮 EXPECTED VALUES (for R$200 deposit):');
    const expectedTotal = 200 * 0.85; // 85% commission
    const expectedPartner = 3.00; // Fixed R$3
    const expectedAffiliate = expectedTotal - expectedPartner;
    
    console.log('Expected total commission: R$', expectedTotal.toFixed(2));
    console.log('Expected partner: R$', expectedPartner.toFixed(2));
    console.log('Expected affiliate: R$', expectedAffiliate.toFixed(2));
    
    // Test partner earnings API
    console.log('\n🌐 TESTING PARTNER EARNINGS API:');
    const loginRes = await fetch('http://localhost:5000/api/partner/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'parceiro@test.com',
        password: 'CRIEIAGORA123'
      })
    });
    
    const cookie = loginRes.headers.get('set-cookie');
    
    const earningsRes = await fetch('http://localhost:5000/api/partner/earnings', {
      headers: { 'Cookie': cookie || '' }
    });
    
    const earnings = await earningsRes.json();
    console.log('API Response:');
    console.log('- Total Earnings:', earnings.totalEarnings);
    console.log('- Approved Earnings:', earnings.approvedEarnings);
    console.log('- Available Balance:', earnings.availableBalance);
    
    console.log('\n✅✅✅ TEST COMPLETE! ✅✅✅');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

testCommissionCreation();