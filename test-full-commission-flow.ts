import { db } from './server/db';
import { deposits, users, partners, affiliates, partnerConversions, partnersWallet } from './shared/schema';
import { eq, desc } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

async function testFullCommissionFlow() {
  console.log('\n=== TESTING FULL COMMISSION FLOW ===\n');
  
  try {
    // 1. Create a new test deposit for user 143 (Novo Felipe - registered via partner)
    const userId = 143;
    const depositAmount = '150.00';
    const transactionId = 'TEST_' + Date.now();
    
    console.log('1️⃣ Creating test deposit...');
    const [newDeposit] = await db.insert(deposits).values({
      userId,
      amount: depositAmount,
      status: 'pending',
      transactionId,
      provider: 'ironpay',
      createdAt: new Date()
    }).returning();
    
    console.log(`✅ Deposit created: ID ${newDeposit.id}, Amount R$${depositAmount}`);
    
    // 2. Simulate payment approval via test endpoint
    console.log('\n2️⃣ Simulating payment approval...');
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
    console.log('Approval result:', result.message);
    
    // 3. Check if commissions were created
    console.log('\n3️⃣ Checking commission creation...');
    
    // Check partner conversions
    const [partnerConv] = await db.select()
      .from(partnerConversions)
      .where(eq(partnerConversions.userId, userId))
      .orderBy(desc(partnerConversions.id))
      .limit(1);
    
    if (partnerConv) {
      console.log('\n✅ Partner commission created:');
      console.log('- Partner Commission: R$', partnerConv.partnerCommission);
      console.log('- Affiliate Commission: R$', partnerConv.affiliateCommission);
      console.log('- Status:', partnerConv.status);
      
      // Check partner wallet
      const [partnerWallet] = await db.select()
        .from(partnersWallet)
        .where(eq(partnersWallet.partnerId, partnerConv.partnerId))
        .limit(1);
      
      console.log('\n📊 Partner wallet balance: R$', partnerWallet?.balance || '0.00');
      
      // Check partner earnings
      const [partner] = await db.select()
        .from(partners)
        .where(eq(partners.id, partnerConv.partnerId))
        .limit(1);
      
      console.log('📊 Partner total earnings: R$', partner?.totalEarnings || '0.00');
      
      // Check affiliate earnings
      const [affiliate] = await db.select()
        .from(affiliates)
        .where(eq(affiliates.id, partnerConv.affiliateId))
        .limit(1);
      
      console.log('📊 Affiliate total earnings: R$', affiliate?.totalEarnings || '0.00');
      
    } else {
      console.log('❌ No partner commission found!');
    }
    
    // 4. Test the earnings API endpoint
    console.log('\n4️⃣ Testing partner earnings API...');
    
    // Get partner session (using partner 2)
    const partnerId = 2;
    const [partnerEarnings] = await db.select()
      .from(partners)
      .where(eq(partners.id, partnerId))
      .limit(1);
    
    console.log('\n📈 Partner earnings from database:');
    console.log('- Total Earnings: R$', partnerEarnings?.totalEarnings || '0.00');
    console.log('- Approved Earnings: R$', partnerEarnings?.approvedEarnings || '0.00');
    
    // Count all partner conversions
    const allConversions = await db.select()
      .from(partnerConversions)
      .where(eq(partnerConversions.partnerId, partnerId));
    
    const totalFromConversions = allConversions.reduce((sum, c) => 
      sum + parseFloat(c.partnerCommission || '0'), 0
    );
    
    console.log('- Total from conversions table: R$', totalFromConversions.toFixed(2));
    console.log('- Number of conversions:', allConversions.length);
    
    console.log('\n✅✅✅ TEST COMPLETE! ✅✅✅');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

testFullCommissionFlow();