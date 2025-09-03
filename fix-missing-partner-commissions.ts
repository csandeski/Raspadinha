import { db } from './server/db';
import { users, deposits, partners, affiliates, partnerConversions, affiliateConversions, partnersWallet, partnersWalletTransactions, affiliatesWallet, affiliatesWalletTransactions } from './shared/schema';
import { eq, and, sql, isNull } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

async function fixMissingPartnerCommissions() {
  console.log('\n=== FIXING MISSING PARTNER COMMISSIONS ===\n');
  
  try {
    // Get all users with partnerId
    const partnerUsers = await db.select()
      .from(users)
      .where(sql`partner_id IS NOT NULL`);
    
    console.log(`Found ${partnerUsers.length} users registered through partners\n`);
    
    for (const user of partnerUsers) {
      console.log(`\nProcessing user #${user.id} - ${user.name} (partnerId: ${user.partnerId})`);
      
      // Get partner details
      const [partner] = await db.select()
        .from(partners)
        .where(eq(partners.id, user.partnerId!))
        .limit(1);
      
      if (!partner) {
        console.log(`  ⚠️ Partner not found for ID ${user.partnerId}`);
        continue;
      }
      
      console.log(`  Partner: ${partner.name} (${partner.code})`);
      
      // Get affiliate details
      const [affiliate] = await db.select()
        .from(affiliates)
        .where(eq(affiliates.id, partner.affiliateId))
        .limit(1);
      
      if (!affiliate) {
        console.log(`  ⚠️ Affiliate not found for ID ${partner.affiliateId}`);
        continue;
      }
      
      console.log(`  Affiliate: ${affiliate.name}`);
      
      // Get completed deposits for this user
      const userDeposits = await db.select()
        .from(deposits)
        .where(and(
          eq(deposits.userId, user.id),
          eq(deposits.status, 'completed')
        ));
      
      console.log(`  Found ${userDeposits.length} completed deposits`);
      
      for (const deposit of userDeposits) {
        const depositAmount = parseFloat(deposit.amount);
        console.log(`\n  Processing deposit #${deposit.id} - R$${depositAmount.toFixed(2)}`);
        
        // Check if commission already exists
        const [existingPartnerConv] = await db.select()
          .from(partnerConversions)
          .where(and(
            eq(partnerConversions.userId, user.id),
            eq(partnerConversions.conversionValue, deposit.amount)
          ))
          .limit(1);
        
        if (existingPartnerConv) {
          console.log(`    Commission already exists (ID: ${existingPartnerConv.id})`);
          continue;
        }
        
        // Calculate TOTAL commission based on affiliate's configuration
        let totalCommission: number;
        
        // Affiliate has 85% custom rate
        if (affiliate.customCommissionRate && parseFloat(affiliate.customCommissionRate) > 0) {
          totalCommission = depositAmount * parseFloat(affiliate.customCommissionRate) / 100;
          console.log(`    Using affiliate custom rate: ${affiliate.customCommissionRate}% = R$${totalCommission.toFixed(2)}`);
        } else if (affiliate.commissionType === 'fixed') {
          totalCommission = parseFloat(affiliate.fixedCommissionAmount || '7.00');
          console.log(`    Using affiliate fixed: R$${totalCommission.toFixed(2)}`);
        } else {
          const rate = parseFloat(affiliate.currentLevelRate || '40.00');
          totalCommission = depositAmount * rate / 100;
          console.log(`    Using affiliate percentage: ${rate}% = R$${totalCommission.toFixed(2)}`);
        }
        
        // Calculate partner's share
        let partnerCommission: number;
        if (partner.commissionType === 'fixed') {
          partnerCommission = parseFloat(partner.fixedCommissionAmount || '3.00');
          console.log(`    Partner gets fixed: R$${partnerCommission.toFixed(2)}`);
        } else {
          const partnerRate = parseFloat(partner.commissionRate || '5.00');
          partnerCommission = depositAmount * partnerRate / 100;
          console.log(`    Partner gets percentage: ${partnerRate}% = R$${partnerCommission.toFixed(2)}`);
        }
        
        // Partner cannot receive more than the total commission
        if (partnerCommission > totalCommission) {
          partnerCommission = totalCommission * 0.5;
          console.log(`    Partner commission limited to 50% of total: R$${partnerCommission.toFixed(2)}`);
        }
        
        // Calculate affiliate's share
        const affiliateCommission = Math.max(0, totalCommission - partnerCommission);
        
        console.log(`    === COMMISSION SPLIT ===`);
        console.log(`    Total: R$${totalCommission.toFixed(2)}`);
        console.log(`    Partner: R$${partnerCommission.toFixed(2)}`);
        console.log(`    Affiliate: R$${affiliateCommission.toFixed(2)}`);
        
        // Create partner conversion
        await db.insert(partnerConversions).values({
          partnerId: partner.id,
          affiliateId: partner.affiliateId,
          userId: user.id,
          type: 'commission' as any, // Add type field
          conversionType: 'deposit',
          conversionValue: deposit.amount,
          partnerCommission: partnerCommission.toFixed(2),
          affiliateCommission: affiliateCommission.toFixed(2),
          commissionRate: partner.commissionType === 'percentage' ? partner.commissionRate : null,
          status: 'completed',
          createdAt: deposit.completedAt || deposit.createdAt
        });
        console.log(`    ✅ Partner conversion created`);
        
        // Update partner earnings
        await db.update(partners)
          .set({
            totalEarnings: sql`COALESCE(${partners.totalEarnings}, 0) + ${partnerCommission}`,
            approvedEarnings: sql`COALESCE(${partners.approvedEarnings}, 0) + ${partnerCommission}`,
            totalDeposits: sql`COALESCE(${partners.totalDeposits}, 0) + 1`
          })
          .where(eq(partners.id, partner.id));
        console.log(`    ✅ Partner earnings updated`);
        
        // Update or create partner wallet
        let [partnerWallet] = await db.select()
          .from(partnersWallet)
          .where(eq(partnersWallet.partnerId, partner.id));
        
        if (!partnerWallet) {
          // Create wallet
          [partnerWallet] = await db.insert(partnersWallet).values({
            partnerId: partner.id,
            balance: partnerCommission.toFixed(2),
            totalEarned: partnerCommission.toFixed(2),
            totalWithdrawn: '0.00',
            lastTransactionAt: new Date()
          }).returning();
          console.log(`    ✅ Partner wallet created`);
        } else {
          // Update wallet
          await db.update(partnersWallet)
            .set({
              balance: sql`COALESCE(${partnersWallet.balance}, 0) + ${partnerCommission}`,
              totalEarned: sql`COALESCE(${partnersWallet.totalEarned}, 0) + ${partnerCommission}`,
              lastTransactionAt: new Date()
            })
            .where(eq(partnersWallet.partnerId, partner.id));
          console.log(`    ✅ Partner wallet updated`);
        }
        
        // Create wallet transaction
        await db.insert(partnersWalletTransactions).values({
          partnerId: partner.id,
          type: 'commission' as const,
          amount: partnerCommission.toFixed(2),
          balanceBefore: partnerWallet.balance,
          balanceAfter: (parseFloat(partnerWallet.balance) + partnerCommission).toFixed(2),
          description: `Comissão de depósito - Usuário #${user.id}`,
          referenceId: 0,
          status: 'completed' as const,
          createdAt: deposit.completedAt || deposit.createdAt
        });
        console.log(`    ✅ Partner wallet transaction created`);
        
        // Create affiliate conversion for their share
        await db.insert(affiliateConversions).values({
          affiliateId: partner.affiliateId,
          userId: user.id,
          conversionType: 'deposit',
          conversionValue: deposit.amount,
          commission: affiliateCommission.toFixed(2),
          commissionRate: affiliate.customCommissionRate || affiliate.currentLevelRate,
          status: 'completed',
          notes: `Partner share: R$${partnerCommission.toFixed(2)}`,
          createdAt: deposit.completedAt || deposit.createdAt
        });
        console.log(`    ✅ Affiliate conversion created`);
        
        // Update affiliate earnings
        await db.update(affiliates)
          .set({
            totalEarnings: sql`COALESCE(${affiliates.totalEarnings}, 0) + ${affiliateCommission}`,
            approvedEarnings: sql`COALESCE(${affiliates.approvedEarnings}, 0) + ${affiliateCommission}`
          })
          .where(eq(affiliates.id, partner.affiliateId));
        console.log(`    ✅ Affiliate earnings updated`);
        
        // Update or create affiliate wallet
        let [affiliateWallet] = await db.select()
          .from(affiliatesWallet)
          .where(eq(affiliatesWallet.affiliateId, partner.affiliateId));
        
        if (!affiliateWallet) {
          // Create wallet
          [affiliateWallet] = await db.insert(affiliatesWallet).values({
            affiliateId: partner.affiliateId,
            balance: affiliateCommission.toFixed(2),
            totalEarned: affiliateCommission.toFixed(2),
            totalWithdrawn: '0.00',
            lastTransactionAt: new Date()
          }).returning();
          console.log(`    ✅ Affiliate wallet created`);
        } else {
          // Update wallet
          await db.update(affiliatesWallet)
            .set({
              balance: sql`COALESCE(${affiliatesWallet.balance}, 0) + ${affiliateCommission}`,
              totalEarned: sql`COALESCE(${affiliatesWallet.totalEarned}, 0) + ${affiliateCommission}`,
              lastTransactionAt: new Date()
            })
            .where(eq(affiliatesWallet.affiliateId, partner.affiliateId));
          console.log(`    ✅ Affiliate wallet updated`);
        }
        
        // Create affiliate wallet transaction
        await db.insert(affiliatesWalletTransactions).values({
          affiliateId: partner.affiliateId,
          type: 'commission' as const,
          amount: affiliateCommission.toFixed(2),
          balanceBefore: affiliateWallet.balance,
          balanceAfter: (parseFloat(affiliateWallet.balance) + affiliateCommission).toFixed(2),
          description: `Comissão (parceiro) - Usuário #${user.id}`,
          referenceId: 0,
          status: 'completed' as const,
          createdAt: deposit.completedAt || deposit.createdAt
        });
        console.log(`    ✅ Affiliate wallet transaction created`);
      }
    }
    
    console.log('\n=== COMMISSION FIX COMPLETED ===\n');
    
    // Show summary
    const allPartners = await db.select()
      .from(partners)
      .where(sql`total_earnings > 0`);
    
    console.log('Partner Earnings Summary:');
    for (const p of allPartners) {
      console.log(`  ${p.name}: R$${p.totalEarnings || '0.00'}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

fixMissingPartnerCommissions();