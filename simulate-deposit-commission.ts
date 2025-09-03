import { db } from './server/db';
import { users, deposits, partners, affiliates, partnerConversions, affiliateConversions, partnersWallet, affiliatesWallet } from './shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

// Import the commission processing functions from routes
async function simulateDepositCommission() {
  console.log('\n=== SIMULATING DEPOSIT COMMISSION FLOW ===\n');
  
  try {
    const userId = 143; // Novo Felipe
    const depositAmount = '100.00';
    
    // 1. Get user data
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    console.log('User Data:');
    console.log('- ID:', user.id);
    console.log('- Name:', user.name);
    console.log('- AffiliateId:', user.affiliateId);
    console.log('- PartnerId:', user.partnerId);
    console.log('');
    
    // 2. Check if user has partner
    if (user.partnerId) {
      console.log('✅ User has partnerId:', user.partnerId);
      
      // Get partner details
      const [partner] = await db.select()
        .from(partners)
        .where(eq(partners.id, user.partnerId))
        .limit(1);
      
      if (partner) {
        console.log('\nPartner Details:');
        console.log('- ID:', partner.id);
        console.log('- Name:', partner.name);
        console.log('- Code:', partner.code);
        console.log('- AffiliateId:', partner.affiliateId);
        console.log('- CommissionType:', partner.commissionType);
        console.log('- FixedAmount:', partner.fixedCommissionAmount);
        console.log('- IsActive:', partner.isActive);
        console.log('');
        
        // Get affiliate details
        const [affiliate] = await db.select()
          .from(affiliates)
          .where(eq(affiliates.id, partner.affiliateId))
          .limit(1);
        
        if (affiliate) {
          console.log('Affiliate Details:');
          console.log('- ID:', affiliate.id);
          console.log('- Name:', affiliate.name);
          console.log('- CommissionType:', affiliate.commissionType);
          console.log('- CustomRate:', affiliate.customCommissionRate);
          console.log('- IsActive:', affiliate.isActive);
          console.log('');
          
          // Calculate expected commissions
          console.log('=== EXPECTED COMMISSION CALCULATION ===');
          
          // Calculate total commission based on affiliate config
          let totalCommission = 0;
          if (affiliate.customCommissionRate && parseFloat(affiliate.customCommissionRate) > 0) {
            totalCommission = parseFloat(depositAmount) * parseFloat(affiliate.customCommissionRate) / 100;
            console.log(`Total commission (85% custom rate): R$${totalCommission.toFixed(2)}`);
          } else if (affiliate.commissionType === 'fixed') {
            totalCommission = parseFloat(affiliate.fixedCommissionAmount || '7.00');
            console.log(`Total commission (fixed): R$${totalCommission.toFixed(2)}`);
          } else {
            const rate = parseFloat(affiliate.currentLevelRate || '40.00');
            totalCommission = parseFloat(depositAmount) * rate / 100;
            console.log(`Total commission (${rate}%): R$${totalCommission.toFixed(2)}`);
          }
          
          // Calculate partner share
          let partnerCommission = 0;
          if (partner.commissionType === 'fixed') {
            partnerCommission = parseFloat(partner.fixedCommissionAmount || '3.00');
            console.log(`Partner commission (fixed): R$${partnerCommission.toFixed(2)}`);
          } else {
            const partnerRate = parseFloat(partner.commissionRate || '5.00');
            partnerCommission = parseFloat(depositAmount) * partnerRate / 100;
            console.log(`Partner commission (${partnerRate}%): R$${partnerCommission.toFixed(2)}`);
          }
          
          // Partner cannot get more than total
          if (partnerCommission > totalCommission) {
            partnerCommission = totalCommission * 0.5;
            console.log(`Partner commission limited to 50%: R$${partnerCommission.toFixed(2)}`);
          }
          
          // Calculate affiliate share
          const affiliateCommission = Math.max(0, totalCommission - partnerCommission);
          
          console.log('\n=== FINAL COMMISSION SPLIT ===');
          console.log(`Total: R$${totalCommission.toFixed(2)}`);
          console.log(`Partner gets: R$${partnerCommission.toFixed(2)}`);
          console.log(`Affiliate gets: R$${affiliateCommission.toFixed(2)}`);
          
          // 3. Simulate creating commissions
          console.log('\n=== SIMULATING COMMISSION CREATION ===');
          
          // Check if commissions already exist
          const existingPartnerConv = await db.select()
            .from(partnerConversions)
            .where(and(
              eq(partnerConversions.userId, userId),
              eq(partnerConversions.conversionValue, depositAmount)
            ))
            .limit(1);
          
          if (existingPartnerConv.length > 0) {
            console.log('⚠️ Partner commission already exists');
          } else {
            console.log('✅ Ready to create partner commission');
            
            // Actually create it
            try {
              const [newConv] = await db.insert(partnerConversions).values({
                partnerId: partner.id,
                affiliateId: partner.affiliateId,
                userId: userId,
                type: 'commission',
                conversionType: 'deposit',
                conversionValue: depositAmount,
                partnerCommission: partnerCommission.toFixed(2),
                affiliateCommission: affiliateCommission.toFixed(2),
                commissionRate: partner.commissionType === 'percentage' ? partner.commissionRate : null,
                status: 'completed',
                createdAt: new Date()
              }).returning();
              
              console.log('✅ Partner conversion created with ID:', newConv.id);
              
              // Update partner earnings
              await db.update(partners)
                .set({
                  totalEarnings: sql`COALESCE(${partners.totalEarnings}, 0) + ${partnerCommission}`,
                  approvedEarnings: sql`COALESCE(${partners.approvedEarnings}, 0) + ${partnerCommission}`,
                  totalDeposits: sql`COALESCE(${partners.totalDeposits}, 0) + 1`
                })
                .where(eq(partners.id, partner.id));
              
              console.log('✅ Partner earnings updated');
              
              // Update partner wallet
              const [wallet] = await db.select()
                .from(partnersWallet)
                .where(eq(partnersWallet.partnerId, partner.id));
              
              if (wallet) {
                await db.update(partnersWallet)
                  .set({
                    balance: sql`COALESCE(${partnersWallet.balance}, 0) + ${partnerCommission}`,
                    totalEarned: sql`COALESCE(${partnersWallet.totalEarned}, 0) + ${partnerCommission}`,
                    lastTransactionAt: new Date()
                  })
                  .where(eq(partnersWallet.partnerId, partner.id));
                console.log('✅ Partner wallet updated');
              } else {
                const [newWallet] = await db.insert(partnersWallet).values({
                  partnerId: partner.id,
                  balance: partnerCommission.toFixed(2),
                  totalEarned: partnerCommission.toFixed(2),
                  totalWithdrawn: '0.00',
                  lastTransactionAt: new Date()
                }).returning();
                console.log('✅ Partner wallet created');
              }
              
              // Create affiliate conversion
              await db.insert(affiliateConversions).values({
                affiliateId: partner.affiliateId,
                userId: userId,
                conversionType: 'deposit',
                conversionValue: depositAmount,
                commission: affiliateCommission.toFixed(2),
                commissionRate: affiliate.customCommissionRate || affiliate.currentLevelRate,
                status: 'completed',
                notes: `Partner share: R$${partnerCommission.toFixed(2)}`,
                createdAt: new Date()
              });
              
              console.log('✅ Affiliate conversion created');
              
              // Update affiliate earnings
              await db.update(affiliates)
                .set({
                  totalEarnings: sql`COALESCE(${affiliates.totalEarnings}, 0) + ${affiliateCommission}`,
                  approvedEarnings: sql`COALESCE(${affiliates.approvedEarnings}, 0) + ${affiliateCommission}`
                })
                .where(eq(affiliates.id, partner.affiliateId));
              
              console.log('✅ Affiliate earnings updated');
              
              console.log('\n✅✅✅ COMMISSION PROCESSING COMPLETE! ✅✅✅');
              
            } catch (error) {
              console.error('❌ Error creating commissions:', error);
            }
          }
          
        } else {
          console.log('❌ Affiliate not found');
        }
      } else {
        console.log('❌ Partner not found');
      }
    } else {
      console.log('❌ User has no partnerId');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

simulateDepositCommission();