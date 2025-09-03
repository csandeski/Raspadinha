import { db } from './server/db';
import { users, deposits, partners, affiliates, partnerConversions, affiliateConversions, partnersWallet, partnersWalletTransactions, affiliatesWallet, affiliatesWalletTransactions } from './shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

async function testPartnerCommissionFlow() {
  console.log('\n=== TESTING PARTNER COMMISSION FLOW ===\n');
  
  try {
    // 1. Get test partner and affiliate
    const [partner] = await db.select()
      .from(partners)
      .where(eq(partners.id, 2)) // Parceiro Master
      .limit(1);
    
    if (!partner) {
      console.error('Partner not found');
      return;
    }
    
    console.log('✅ Partner found:', {
      id: partner.id,
      name: partner.name,
      code: partner.code,
      affiliateId: partner.affiliateId,
      commissionType: partner.commissionType,
      commissionRate: partner.commissionRate,
      fixedCommissionAmount: partner.fixedCommissionAmount
    });
    
    // 2. Get affiliate
    const [affiliate] = await db.select()
      .from(affiliates)
      .where(eq(affiliates.id, partner.affiliateId))
      .limit(1);
    
    console.log('✅ Affiliate found:', {
      id: affiliate.id,
      name: affiliate.name,
      commissionType: affiliate.commissionType,
      customCommissionRate: affiliate.customCommissionRate,
      customFixedAmount: affiliate.customFixedAmount
    });
    
    // 3. Get users registered through this partner
    const partnerUsers = await db.select()
      .from(users)
      .where(eq(users.partnerId, partner.id));
    
    console.log(`\n✅ Found ${partnerUsers.length} users registered through partner\n`);
    
    for (const user of partnerUsers) {
      console.log(`User #${user.id} - ${user.name}:`);
      
      // 4. Get deposits from this user
      const userDeposits = await db.select()
        .from(deposits)
        .where(and(
          eq(deposits.userId, user.id),
          eq(deposits.status, 'completed')
        ));
      
      console.log(`  - ${userDeposits.length} completed deposits`);
      
      // 5. Check partner conversions
      const partnerConvs = await db.select()
        .from(partnerConversions)
        .where(eq(partnerConversions.userId, user.id));
      
      console.log(`  - ${partnerConvs.length} partner conversions`);
      
      // 6. Check affiliate conversions
      const affiliateConvs = await db.select()
        .from(affiliateConversions)
        .where(eq(affiliateConversions.userId, user.id));
      
      console.log(`  - ${affiliateConvs.length} affiliate conversions`);
      
      // Calculate expected vs actual commissions
      let expectedPartnerCommission = 0;
      let expectedAffiliateCommission = 0;
      
      for (const deposit of userDeposits) {
        const depositAmount = parseFloat(deposit.amount);
        
        // Calculate expected partner commission
        if (partner.commissionType === 'fixed') {
          expectedPartnerCommission += parseFloat(partner.fixedCommissionAmount || '3.00');
        } else {
          expectedPartnerCommission += depositAmount * parseFloat(partner.commissionRate || '5.00') / 100;
        }
        
        // Calculate expected affiliate commission (based on 85% rate)
        const totalAffiliateCommission = depositAmount * 0.85; // 85% rate
        const affiliateShare = Math.max(0, totalAffiliateCommission - expectedPartnerCommission);
        expectedAffiliateCommission += affiliateShare;
      }
      
      // Calculate actual commissions received
      const actualPartnerCommission = partnerConvs.reduce((sum, conv) => 
        sum + parseFloat(conv.partnerCommission || '0'), 0);
      
      const actualAffiliateCommission = affiliateConvs.reduce((sum, conv) => 
        sum + parseFloat(conv.commission || '0'), 0);
      
      console.log(`  Expected commissions:`);
      console.log(`    - Partner: R$${expectedPartnerCommission.toFixed(2)}`);
      console.log(`    - Affiliate: R$${expectedAffiliateCommission.toFixed(2)}`);
      console.log(`  Actual commissions:`);
      console.log(`    - Partner: R$${actualPartnerCommission.toFixed(2)}`);
      console.log(`    - Affiliate: R$${actualAffiliateCommission.toFixed(2)}`);
      
      if (actualPartnerCommission === 0 && userDeposits.length > 0) {
        console.log(`  ⚠️ WARNING: User has deposits but no partner commissions!`);
      }
    }
    
    // 7. Check partner wallet
    const [partnerWallet] = await db.select()
      .from(partnersWallet)
      .where(eq(partnersWallet.partnerId, partner.id));
    
    if (partnerWallet) {
      console.log('\n✅ Partner Wallet:', {
        balance: partnerWallet.balance,
        totalEarned: partnerWallet.totalEarned,
        totalWithdrawn: partnerWallet.totalWithdrawn
      });
      
      // Get recent transactions
      const recentTransactions = await db.select()
        .from(partnersWalletTransactions)
        .where(eq(partnersWalletTransactions.partnerId, partner.id))
        .orderBy(sql`created_at DESC`)
        .limit(5);
      
      console.log(`\n📊 Recent Partner Wallet Transactions:`);
      for (const tx of recentTransactions) {
        console.log(`  - ${tx.type}: R$${tx.amount} - ${tx.description}`);
      }
    } else {
      console.log('\n⚠️ No partner wallet found!');
    }
    
    // 8. Check affiliate wallet
    const [affiliateWallet] = await db.select()
      .from(affiliatesWallet)
      .where(eq(affiliatesWallet.affiliateId, affiliate.id));
    
    if (affiliateWallet) {
      console.log('\n✅ Affiliate Wallet:', {
        balance: affiliateWallet.balance,
        totalEarned: affiliateWallet.totalEarned,
        totalWithdrawn: affiliateWallet.totalWithdrawn
      });
    }
    
    // 9. Summary
    console.log('\n=== COMMISSION FLOW SUMMARY ===');
    console.log(`Partner ${partner.name} (${partner.code}):`);
    console.log(`  - Total Earnings: R$${partner.totalEarnings || '0.00'}`);
    console.log(`  - Approved Earnings: R$${partner.approvedEarnings || '0.00'}`);
    console.log(`  - Wallet Balance: R$${partnerWallet?.balance || '0.00'}`);
    
    console.log(`\nAffiliate ${affiliate.name}:`);
    console.log(`  - Total Earnings: R$${affiliate.totalEarnings || '0.00'}`);
    console.log(`  - Approved Earnings: R$${affiliate.approvedEarnings || '0.00'}`);
    console.log(`  - Wallet Balance: R$${affiliateWallet?.balance || '0.00'}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

testPartnerCommissionFlow();