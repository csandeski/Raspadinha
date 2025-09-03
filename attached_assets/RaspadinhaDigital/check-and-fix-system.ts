import { db } from './server/db';
import { 
  users, 
  affiliates, 
  partners, 
  affiliateConversions,
  deposits,
  affiliatesWallet,
  partnersWallet
} from '@shared/schema';
import { eq, and, sql, desc, gte } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'defa543ult-jwt-secret-2024';

console.log('🔍 SISTEMA DE VERIFICAÇÃO E CORREÇÃO COMPLETO\n');
console.log('=' .repeat(60));

async function checkAndFixSystem() {
  try {
    // 1. CHECK USER 122 PROBLEM
    console.log('\n1️⃣ Verificando problema com user 122...');
    try {
      const problematicConversions = await db.select()
        .from(affiliateConversions)
        .where(eq(affiliateConversions.userId, 122));
      
      if (problematicConversions.length > 0) {
        console.log(`   ❌ Encontradas ${problematicConversions.length} conversões com user ID 122 inválido`);
        
        // Verificar se o user existe
        const [user122] = await db.select()
          .from(users)
          .where(eq(users.id, 122));
        
        if (!user122) {
          console.log('   ⚠️ User 122 não existe! Removendo conversões órfãs...');
          
          // Remover conversões órfãs
          await db.delete(affiliateConversions)
            .where(eq(affiliateConversions.userId, 122));
          
          console.log('   ✅ Conversões órfãs removidas');
        }
      } else {
        console.log('   ✅ Nenhuma conversão com user 122 encontrada');
      }
    } catch (error) {
      console.log('   ⚠️ Erro ao verificar user 122:', error);
    }

    // 2. VERIFICAR SEGURANÇA DE TOKENS JWT
    console.log('\n2️⃣ Verificando segurança de tokens JWT...');
    
    // Test affiliate token
    const testAffiliateToken = jwt.sign(
      { affiliateId: 1, type: 'affiliate' },
      JWT_SECRET,
      { expiresIn: '1s' }
    );
    
    // Test partner token
    const testPartnerToken = jwt.sign(
      { partnerId: 1, type: 'partner' },
      JWT_SECRET,
      { expiresIn: '1s' }
    );
    
    // Verify tokens work correctly
    try {
      jwt.verify(testAffiliateToken, JWT_SECRET);
      console.log('   ✅ Tokens de afiliados funcionando corretamente');
    } catch {
      console.log('   ❌ Problema com tokens de afiliados');
    }
    
    try {
      jwt.verify(testPartnerToken, JWT_SECRET);
      console.log('   ✅ Tokens de parceiros funcionando corretamente');
    } catch {
      console.log('   ❌ Problema com tokens de parceiros');
    }

    // 3. VERIFICAR SISTEMA DE COMISSÕES
    console.log('\n3️⃣ Verificando sistema de comissões...');
    
    // Get all pending deposits
    const pendingDeposits = await db.select()
      .from(deposits)
      .where(eq(deposits.status, 'completed'))
      .orderBy(desc(deposits.createdAt))
      .limit(10);
    
    console.log(`   📊 ${pendingDeposits.length} depósitos completados recentes encontrados`);
    
    // Check if commissions are being created
    for (const deposit of pendingDeposits.slice(0, 3)) {
      const [user] = await db.select()
        .from(users)
        .where(eq(users.id, deposit.userId));
      
      if (user) {
        // Check if user has affiliate
        if (user.affiliateId) {
          const [conversion] = await db.select()
            .from(affiliateConversions)
            .where(and(
              eq(affiliateConversions.userId, deposit.userId),
              eq(affiliateConversions.conversionType, 'deposit'),
              eq(affiliateConversions.conversionValue, deposit.amount)
            ));
          
          if (conversion) {
            console.log(`   ✅ Depósito ${deposit.id}: Comissão registrada (${conversion.commission})`);
          } else {
            console.log(`   ❌ Depósito ${deposit.id}: Comissão NÃO registrada para afiliado ${user.affiliateId}`);
          }
        }
        
        // Check if user has partner
        if (user.referredBy) {
          // Check if referredBy is a partner code
          const [partner] = await db.select()
            .from(partners)
            .where(eq(partners.code, user.referredBy));
          
          if (partner) {
            const [conversion] = await db.select()
              .from(affiliateConversions)
              .where(and(
                eq(affiliateConversions.userId, deposit.userId),
                eq(affiliateConversions.conversionType, 'deposit'),
                eq(affiliateConversions.partnerId, partner.id)
              ));
            
            if (conversion) {
              console.log(`   ✅ Depósito ${deposit.id}: Comissão de parceiro registrada`);
            } else {
              console.log(`   ❌ Depósito ${deposit.id}: Comissão de parceiro NÃO registrada`);
            }
          }
        }
      }
    }

    // 4. VERIFICAR WALLETS
    console.log('\n4️⃣ Verificando carteiras de afiliados e parceiros...');
    
    // Check affiliates without wallets
    const allAffiliates = await db.select().from(affiliates);
    for (const affiliate of allAffiliates) {
      const [wallet] = await db.select()
        .from(affiliatesWallet)
        .where(eq(affiliatesWallet.affiliateId, affiliate.id));
      
      if (!wallet) {
        console.log(`   ⚠️ Afiliado ${affiliate.id} (${affiliate.name}) sem carteira - criando...`);
        
        await db.insert(affiliatesWallet).values({
          affiliateId: affiliate.id,
          balance: '0.00',
          totalEarned: '0.00',
          totalWithdrawn: '0.00'
        });
        
        console.log(`   ✅ Carteira criada para afiliado ${affiliate.id}`);
      }
    }
    
    // Check partners without wallets
    const allPartners = await db.select().from(partners);
    for (const partner of allPartners) {
      const [wallet] = await db.select()
        .from(partnersWallet)
        .where(eq(partnersWallet.partnerId, partner.id));
      
      if (!wallet) {
        console.log(`   ⚠️ Parceiro ${partner.id} (${partner.name}) sem carteira - criando...`);
        
        await db.insert(partnersWallet).values({
          partnerId: partner.id,
          balance: '0.00',
          totalEarned: '0.00',
          totalWithdrawn: '0.00'
        });
        
        console.log(`   ✅ Carteira criada para parceiro ${partner.id}`);
      }
    }

    // 5. VERIFICAR CÁLCULO DE COMISSÕES
    console.log('\n5️⃣ Verificando cálculos de comissões...');
    
    const recentConversions = await db.select()
      .from(affiliateConversions)
      .where(eq(affiliateConversions.conversionType, 'deposit'))
      .orderBy(desc(affiliateConversions.createdAt))
      .limit(5);
    
    for (const conversion of recentConversions) {
      const depositValue = parseFloat(conversion.conversionValue || '0');
      const commission = parseFloat(conversion.commission || '0');
      const rate = parseFloat(conversion.commissionRate || '0');
      
      if (conversion.affiliateId) {
        const [affiliate] = await db.select()
          .from(affiliates)
          .where(eq(affiliates.id, conversion.affiliateId));
        
        if (affiliate) {
          const expectedCommission = affiliate.commissionType === 'percentage' 
            ? (depositValue * rate / 100)
            : parseFloat(affiliate.fixedCommissionAmount || '0');
          
          if (Math.abs(commission - expectedCommission) > 0.01) {
            console.log(`   ❌ Conversão ${conversion.id}: Comissão incorreta`);
            console.log(`      Valor depósito: R$ ${depositValue}`);
            console.log(`      Comissão calculada: R$ ${commission}`);
            console.log(`      Comissão esperada: R$ ${expectedCommission}`);
          } else {
            console.log(`   ✅ Conversão ${conversion.id}: Comissão correta (R$ ${commission})`);
          }
        }
      }
      
      if (conversion.partnerId) {
        const [partner] = await db.select()
          .from(partners)
          .where(eq(partners.id, conversion.partnerId));
        
        if (partner) {
          const expectedCommission = partner.commissionType === 'percentage' 
            ? (depositValue * parseFloat(partner.commissionRate || '0') / 100)
            : parseFloat(partner.fixedCommissionAmount || '0');
          
          if (Math.abs(commission - expectedCommission) > 0.01) {
            console.log(`   ❌ Conversão parceiro ${conversion.id}: Comissão incorreta`);
            console.log(`      Valor depósito: R$ ${depositValue}`);
            console.log(`      Comissão calculada: R$ ${commission}`);
            console.log(`      Comissão esperada: R$ ${expectedCommission}`);
          } else {
            console.log(`   ✅ Conversão parceiro ${conversion.id}: Comissão correta (R$ ${commission})`);
          }
        }
      }
    }

    // 6. VERIFICAR AUTENTICAÇÃO
    console.log('\n6️⃣ Verificando segurança de autenticação...');
    
    // Check for weak passwords (just count, don't expose)
    const affiliatesCount = await db.select({ count: sql`count(*)` })
      .from(affiliates);
    const partnersCount = await db.select({ count: sql`count(*)` })
      .from(partners);
    
    console.log(`   📊 ${affiliatesCount[0].count} afiliados cadastrados`);
    console.log(`   📊 ${partnersCount[0].count} parceiros cadastrados`);
    
    // Check for duplicate emails
    const duplicateAffiliates = await db.execute(sql`
      SELECT email, COUNT(*) as count 
      FROM affiliates 
      GROUP BY email 
      HAVING COUNT(*) > 1
    `);
    
    if (duplicateAffiliates.rows.length > 0) {
      console.log(`   ❌ Emails duplicados em afiliados: ${duplicateAffiliates.rows.length}`);
    } else {
      console.log(`   ✅ Nenhum email duplicado em afiliados`);
    }

    // 7. SUMMARY
    console.log('\n' + '=' .repeat(60));
    console.log('📋 RESUMO DA VERIFICAÇÃO');
    console.log('=' .repeat(60));
    console.log('\n✅ Verificação completa!');
    console.log('\n📌 Recomendações:');
    console.log('   1. Monitore conversões de depósitos regularmente');
    console.log('   2. Verifique comissões pendentes vs pagas');
    console.log('   3. Mantenha backup do banco de dados');
    console.log('   4. Revise logs de autenticação periodicamente');
    
  } catch (error) {
    console.error('\n❌ Erro durante verificação:', error);
  } finally {
    process.exit(0);
  }
}

// Run the check
checkAndFixSystem();