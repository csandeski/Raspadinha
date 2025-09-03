import { db } from './server/db';
import { 
  users, 
  affiliates, 
  partners, 
  affiliateConversions,
  deposits,
  affiliatesWallet,
  partnersWallet,
  referralConfig
} from '@shared/schema';
import { eq, and, sql, desc, isNull, or } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔧 CORREÇÃO DO SISTEMA DE COMISSÕES\n');
console.log('=' .repeat(60));

async function fixCommissionSystem() {
  try {
    // 1. REMOVE INVALID USER CONVERSIONS
    console.log('\n1️⃣ Removendo conversões com usuários inválidos...');
    
    // Find conversions with non-existent users
    const invalidUserIds = [122, 128]; // Known problematic IDs
    
    for (const userId of invalidUserIds) {
      const conversionsToDelete = await db.select()
        .from(affiliateConversions)
        .where(eq(affiliateConversions.userId, userId));
      
      if (conversionsToDelete.length > 0) {
        console.log(`   Removendo ${conversionsToDelete.length} conversões com userId ${userId}`);
        
        await db.delete(affiliateConversions)
          .where(eq(affiliateConversions.userId, userId));
        
        console.log(`   ✅ Conversões removidas`);
      }
    }
    
    // 2. FIX COMMISSION CALCULATIONS
    console.log('\n2️⃣ Verificando e corrigindo cálculos de comissões...');
    
    // Get referral config
    const [config] = await db.select().from(referralConfig);
    console.log(`   Config: ${config.paymentType}, Valor: R$ ${config.paymentAmount}`);
    
    // Get recent deposits to check commissions
    const recentDeposits = await db.select({
      deposit: deposits,
      user: users
    })
      .from(deposits)
      .innerJoin(users, eq(deposits.userId, users.id))
      .where(eq(deposits.status, 'completed'))
      .orderBy(desc(deposits.createdAt))
      .limit(20);
    
    console.log(`   Verificando ${recentDeposits.length} depósitos recentes...`);
    
    let fixed = 0;
    let correct = 0;
    
    for (const { deposit, user } of recentDeposits) {
      // Check AFFILIATE commission
      if (user.affiliateId) {
        const [affiliate] = await db.select()
          .from(affiliates)
          .where(eq(affiliates.id, user.affiliateId));
        
        if (affiliate) {
          // Check if conversion exists
          const [conversion] = await db.select()
            .from(affiliateConversions)
            .where(and(
              eq(affiliateConversions.userId, deposit.userId),
              eq(affiliateConversions.conversionType, 'deposit'),
              eq(affiliateConversions.conversionValue, deposit.amount),
              eq(affiliateConversions.affiliateId, user.affiliateId)
            ));
          
          const depositValue = parseFloat(deposit.amount);
          let expectedCommission = 0;
          
          // Calculate expected commission
          if (affiliate.commissionType === 'percentage') {
            const rate = parseFloat(affiliate.customCommissionRate || affiliate.currentLevelRate || '40');
            expectedCommission = depositValue * rate / 100;
          } else {
            expectedCommission = parseFloat(affiliate.customFixedAmount || affiliate.fixedCommissionAmount || '10');
          }
          
          if (!conversion) {
            console.log(`   ❌ Faltando comissão afiliado para depósito ${deposit.id}`);
            
            // Create missing commission
            await db.insert(affiliateConversions).values({
              affiliateId: user.affiliateId,
              userId: deposit.userId,
              conversionType: 'deposit',
              conversionValue: deposit.amount,
              commission: expectedCommission.toFixed(2),
              commissionRate: affiliate.commissionType === 'percentage' 
                ? (affiliate.customCommissionRate || affiliate.currentLevelRate || '40')
                : null,
              status: deposit.status === 'completed' ? 'completed' : 'pending',
              createdAt: deposit.createdAt
            });
            
            fixed++;
            console.log(`      ✅ Comissão criada: R$ ${expectedCommission.toFixed(2)}`);
          } else {
            const actualCommission = parseFloat(conversion.commission || '0');
            if (Math.abs(actualCommission - expectedCommission) > 0.01) {
              console.log(`   ⚠️ Comissão incorreta no depósito ${deposit.id}`);
              console.log(`      Atual: R$ ${actualCommission}, Esperado: R$ ${expectedCommission}`);
              
              // Fix commission
              await db.update(affiliateConversions)
                .set({ 
                  commission: expectedCommission.toFixed(2),
                  commissionRate: affiliate.commissionType === 'percentage' 
                    ? (affiliate.customCommissionRate || affiliate.currentLevelRate || '40')
                    : null
                })
                .where(eq(affiliateConversions.id, conversion.id));
              
              fixed++;
              console.log(`      ✅ Comissão corrigida`);
            } else {
              correct++;
            }
          }
        }
      }
      
      // Check PARTNER commission  
      if (user.referredBy) {
        const [partner] = await db.select()
          .from(partners)
          .where(eq(partners.code, user.referredBy));
        
        if (partner) {
          // Check if conversion exists
          const [conversion] = await db.select()
            .from(affiliateConversions)
            .where(and(
              eq(affiliateConversions.userId, deposit.userId),
              eq(affiliateConversions.conversionType, 'deposit'),
              eq(affiliateConversions.conversionValue, deposit.amount),
              eq(affiliateConversions.partnerId, partner.id)
            ));
          
          const depositValue = parseFloat(deposit.amount);
          let expectedCommission = 0;
          
          // Calculate expected commission
          if (partner.commissionType === 'percentage') {
            const rate = parseFloat(partner.commissionRate || '10');
            expectedCommission = depositValue * rate / 100;
          } else {
            expectedCommission = parseFloat(partner.fixedCommissionAmount || '5');
          }
          
          if (!conversion) {
            console.log(`   ❌ Faltando comissão parceiro para depósito ${deposit.id}`);
            
            // Create missing commission
            await db.insert(affiliateConversions).values({
              partnerId: partner.id,
              affiliateId: partner.affiliateId, // Link to parent affiliate
              userId: deposit.userId,
              conversionType: 'deposit',
              conversionValue: deposit.amount,
              commission: expectedCommission.toFixed(2),
              commissionRate: partner.commissionType === 'percentage' 
                ? partner.commissionRate
                : null,
              status: deposit.status === 'completed' ? 'completed' : 'pending',
              createdAt: deposit.createdAt
            });
            
            fixed++;
            console.log(`      ✅ Comissão de parceiro criada: R$ ${expectedCommission.toFixed(2)}`);
          }
        }
      }
    }
    
    console.log(`\n   📊 Resultado: ${correct} corretas, ${fixed} corrigidas/criadas`);
    
    // 3. UPDATE WALLET BALANCES
    console.log('\n3️⃣ Atualizando saldos das carteiras...');
    
    // Update affiliate wallets
    const allAffiliates = await db.select().from(affiliates);
    
    for (const affiliate of allAffiliates) {
      // Calculate total earnings
      const conversions = await db.select()
        .from(affiliateConversions)
        .where(and(
          eq(affiliateConversions.affiliateId, affiliate.id),
          isNull(affiliateConversions.partnerId) // Only direct affiliate commissions
        ));
      
      let totalEarnings = 0;
      let pendingEarnings = 0;
      let completedEarnings = 0;
      
      for (const conv of conversions) {
        const amount = parseFloat(conv.commission || '0');
        if (conv.status === 'completed' || conv.status === 'paid') {
          completedEarnings += amount;
        } else if (conv.status === 'pending') {
          pendingEarnings += amount;
        }
        totalEarnings += amount;
      }
      
      // Update affiliate earnings
      await db.update(affiliates)
        .set({
          totalEarnings: completedEarnings.toFixed(2),
          pendingEarnings: pendingEarnings.toFixed(2),
          paidEarnings: '0.00' // Will be calculated from withdrawals
        })
        .where(eq(affiliates.id, affiliate.id));
      
      // Ensure wallet exists
      const [wallet] = await db.select()
        .from(affiliatesWallet)
        .where(eq(affiliatesWallet.affiliateId, affiliate.id));
      
      if (!wallet) {
        await db.insert(affiliatesWallet).values({
          affiliateId: affiliate.id,
          balance: completedEarnings.toFixed(2),
          totalEarned: completedEarnings.toFixed(2),
          totalWithdrawn: '0.00'
        });
        console.log(`   ✅ Carteira criada para afiliado ${affiliate.name}`);
      } else {
        await db.update(affiliatesWallet)
          .set({
            balance: completedEarnings.toFixed(2),
            totalEarned: completedEarnings.toFixed(2)
          })
          .where(eq(affiliatesWallet.affiliateId, affiliate.id));
      }
    }
    
    // Update partner wallets
    const allPartners = await db.select().from(partners);
    
    for (const partner of allPartners) {
      // Calculate total earnings
      const conversions = await db.select()
        .from(affiliateConversions)
        .where(eq(affiliateConversions.partnerId, partner.id));
      
      let totalEarnings = 0;
      let pendingEarnings = 0;
      let completedEarnings = 0;
      
      for (const conv of conversions) {
        const amount = parseFloat(conv.commission || '0');
        if (conv.status === 'completed' || conv.status === 'paid') {
          completedEarnings += amount;
        } else if (conv.status === 'pending') {
          pendingEarnings += amount;
        }
        totalEarnings += amount;
      }
      
      // Update partner earnings
      await db.update(partners)
        .set({
          totalEarnings: completedEarnings.toFixed(2),
          pendingEarnings: pendingEarnings.toFixed(2)
        })
        .where(eq(partners.id, partner.id));
      
      // Ensure wallet exists
      const [wallet] = await db.select()
        .from(partnersWallet)
        .where(eq(partnersWallet.partnerId, partner.id));
      
      if (!wallet) {
        await db.insert(partnersWallet).values({
          partnerId: partner.id,
          balance: completedEarnings.toFixed(2),
          totalEarned: completedEarnings.toFixed(2),
          totalWithdrawn: '0.00'
        });
        console.log(`   ✅ Carteira criada para parceiro ${partner.name}`);
      } else {
        await db.update(partnersWallet)
          .set({
            balance: completedEarnings.toFixed(2),
            totalEarned: completedEarnings.toFixed(2)
          })
          .where(eq(partnersWallet.partnerId, partner.id));
      }
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('✅ SISTEMA DE COMISSÕES CORRIGIDO COM SUCESSO!');
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.error('\n❌ Erro durante correção:', error);
  } finally {
    process.exit(0);
  }
}

// Run the fix
fixCommissionSystem();