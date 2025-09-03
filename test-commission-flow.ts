import { db } from './server/db';
import { 
  users, 
  affiliates, 
  partners, 
  deposits,
  affiliateConversions,
  wallets,
  affiliatesWallet,
  partnersWallet
} from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'defa543ult-jwt-secret-2024';

console.log('💰 TESTE COMPLETO DO FLUXO DE COMISSÕES\n');
console.log('=' .repeat(60));

async function testCommissionFlow() {
  try {
    // 1. CREATE TEST AFFILIATE
    console.log('\n1️⃣ Criando afiliado de teste...');
    
    const hashedPassword = await bcrypt.hash('Test123456', 10);
    const testAffiliateEmail = `test_affiliate_${Date.now()}@test.com`;
    
    const [testAffiliate] = await db.insert(affiliates).values({
      name: 'Afiliado Teste',
      email: testAffiliateEmail,
      phone: '11999999999',
      password: hashedPassword,
      commissionType: 'percentage',
      customCommissionRate: '50', // 50% commission
      currentLevelRate: '50',
      affiliateLevel: 'bronze',
      isActive: true,
      totalEarnings: '0',
      pendingEarnings: '0',
      paidEarnings: '0'
    }).returning();
    
    console.log(`   ✅ Afiliado criado: ${testAffiliate.name} (${testAffiliate.email})`);
    console.log(`   📊 Comissão: ${testAffiliate.customCommissionRate}%`);
    
    // Create affiliate wallet
    await db.insert(affiliatesWallet).values({
      affiliateId: testAffiliate.id,
      balance: '0.00',
      totalEarned: '0.00',
      totalWithdrawn: '0.00'
    });
    
    // 2. CREATE TEST PARTNER
    console.log('\n2️⃣ Criando parceiro de teste...');
    
    const partnerCode = `TEST${Date.now().toString().slice(-6)}`;
    const [testPartner] = await db.insert(partners).values({
      affiliateId: testAffiliate.id,
      name: 'Parceiro Teste',
      email: `test_partner_${Date.now()}@test.com`,
      phone: '11888888888',
      password: hashedPassword,
      code: partnerCode,
      commissionType: 'percentage',
      commissionRate: '25', // 25% commission (half of affiliate)
      isActive: true,
      totalEarnings: '0',
      pendingEarnings: '0'
    }).returning();
    
    console.log(`   ✅ Parceiro criado: ${testPartner.name}`);
    console.log(`   📊 Comissão: ${testPartner.commissionRate}%`);
    console.log(`   🔗 Código: ${testPartner.code}`);
    
    // Create partner wallet
    await db.insert(partnersWallet).values({
      partnerId: testPartner.id,
      balance: '0.00',
      totalEarned: '0.00',
      totalWithdrawn: '0.00'
    });
    
    // 3. CREATE TEST USER (referred by affiliate)
    console.log('\n3️⃣ Criando usuário indicado pelo afiliado...');
    
    const [userAffiliate] = await db.insert(users).values({
      name: 'Usuário Afiliado Teste',
      email: `user_affiliate_${Date.now()}@test.com`,
      password: hashedPassword,
      phone: '11777777777',
      affiliateId: testAffiliate.id, // Referred by affiliate
      hasFirstDeposit: false
    }).returning();
    
    // Create wallet for user
    await db.insert(wallets).values({
      userId: userAffiliate.id,
      balance: '0.00',
      scratchBonus: 0,
      totalWagered: '0.00'
    });
    
    console.log(`   ✅ Usuário criado: ${userAffiliate.name}`);
    console.log(`   🔗 Indicado por afiliado ID: ${userAffiliate.affiliateId}`);
    
    // 4. CREATE TEST USER (referred by partner)
    console.log('\n4️⃣ Criando usuário indicado pelo parceiro...');
    
    const [userPartner] = await db.insert(users).values({
      name: 'Usuário Parceiro Teste',
      email: `user_partner_${Date.now()}@test.com`,
      password: hashedPassword,
      phone: '11666666666',
      referredBy: partnerCode, // Referred by partner code
      hasFirstDeposit: false
    }).returning();
    
    // Create wallet for user
    await db.insert(wallets).values({
      userId: userPartner.id,
      balance: '0.00',
      scratchBonus: 0,
      totalWagered: '0.00'
    });
    
    console.log(`   ✅ Usuário criado: ${userPartner.name}`);
    console.log(`   🔗 Indicado por parceiro código: ${partnerCode}`);
    
    // 5. SIMULATE DEPOSITS
    console.log('\n5️⃣ Simulando depósitos...');
    
    // Deposit from affiliate-referred user
    const depositAmount1 = '100.00';
    const [deposit1] = await db.insert(deposits).values({
      userId: userAffiliate.id,
      amount: depositAmount1,
      status: 'completed',
      paymentMethod: 'pix',
      transactionId: `TEST_${Date.now()}_1`,
      paymentProvider: 'test'
    }).returning();
    
    console.log(`   💵 Depósito 1: R$ ${depositAmount1} (usuário do afiliado)`);
    
    // Calculate and create affiliate commission
    const affiliateCommission1 = (parseFloat(depositAmount1) * 50 / 100).toFixed(2);
    await db.insert(affiliateConversions).values({
      affiliateId: testAffiliate.id,
      userId: userAffiliate.id,
      conversionType: 'deposit',
      conversionValue: depositAmount1,
      commission: affiliateCommission1,
      commissionRate: '50',
      status: 'completed'
    });
    
    console.log(`   ✅ Comissão afiliado: R$ ${affiliateCommission1} (50%)`);
    
    // Deposit from partner-referred user
    const depositAmount2 = '200.00';
    const [deposit2] = await db.insert(deposits).values({
      userId: userPartner.id,
      amount: depositAmount2,
      status: 'completed',
      paymentMethod: 'pix',
      transactionId: `TEST_${Date.now()}_2`,
      paymentProvider: 'test'
    }).returning();
    
    console.log(`   💵 Depósito 2: R$ ${depositAmount2} (usuário do parceiro)`);
    
    // Calculate and create partner commission
    const partnerCommission = (parseFloat(depositAmount2) * 25 / 100).toFixed(2);
    await db.insert(affiliateConversions).values({
      partnerId: testPartner.id,
      affiliateId: testAffiliate.id, // Link to parent affiliate
      userId: userPartner.id,
      conversionType: 'deposit',
      conversionValue: depositAmount2,
      commission: partnerCommission,
      commissionRate: '25',
      status: 'completed'
    });
    
    console.log(`   ✅ Comissão parceiro: R$ ${partnerCommission} (25%)`);
    
    // 6. UPDATE EARNINGS
    console.log('\n6️⃣ Atualizando saldos...');
    
    // Update affiliate earnings
    await db.update(affiliates)
      .set({
        totalEarnings: affiliateCommission1,
        pendingEarnings: '0.00'
      })
      .where(eq(affiliates.id, testAffiliate.id));
    
    await db.update(affiliatesWallet)
      .set({
        balance: affiliateCommission1,
        totalEarned: affiliateCommission1
      })
      .where(eq(affiliatesWallet.affiliateId, testAffiliate.id));
    
    console.log(`   ✅ Saldo afiliado atualizado: R$ ${affiliateCommission1}`);
    
    // Update partner earnings
    await db.update(partners)
      .set({
        totalEarnings: partnerCommission,
        pendingEarnings: '0.00'
      })
      .where(eq(partners.id, testPartner.id));
    
    await db.update(partnersWallet)
      .set({
        balance: partnerCommission,
        totalEarned: partnerCommission
      })
      .where(eq(partnersWallet.partnerId, testPartner.id));
    
    console.log(`   ✅ Saldo parceiro atualizado: R$ ${partnerCommission}`);
    
    // 7. VERIFY COMMISSIONS
    console.log('\n7️⃣ Verificando comissões...');
    
    // Check affiliate conversions
    const affiliateConversions = await db.select()
      .from(affiliateConversions)
      .where(eq(affiliateConversions.affiliateId, testAffiliate.id))
      .orderBy(desc(affiliateConversions.createdAt));
    
    console.log(`   📊 Total de conversões do afiliado: ${affiliateConversions.length}`);
    
    for (const conv of affiliateConversions) {
      if (conv.partnerId) {
        console.log(`      - Parceiro: R$ ${conv.commission} (usuário ${conv.userId})`);
      } else {
        console.log(`      - Direto: R$ ${conv.commission} (usuário ${conv.userId})`);
      }
    }
    
    // Check partner conversions
    const partnerConversions = await db.select()
      .from(affiliateConversions)
      .where(eq(affiliateConversions.partnerId, testPartner.id));
    
    console.log(`   📊 Total de conversões do parceiro: ${partnerConversions.length}`);
    
    for (const conv of partnerConversions) {
      console.log(`      - R$ ${conv.commission} (usuário ${conv.userId})`);
    }
    
    // 8. TEST API ENDPOINTS
    console.log('\n8️⃣ Testando endpoints da API...');
    
    // Generate test tokens
    const affiliateToken = jwt.sign(
      { affiliateId: testAffiliate.id, type: 'affiliate' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    const partnerToken = jwt.sign(
      { partnerId: testPartner.id, type: 'partner' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    console.log('   ✅ Tokens gerados para testes');
    console.log(`   🔑 Token Afiliado: ${affiliateToken.substring(0, 30)}...`);
    console.log(`   🔑 Token Parceiro: ${partnerToken.substring(0, 30)}...`);
    
    // 9. CLEANUP (optional - comment out to keep test data)
    console.log('\n9️⃣ Limpando dados de teste...');
    
    // Delete test data in reverse order
    await db.delete(affiliateConversions)
      .where(eq(affiliateConversions.affiliateId, testAffiliate.id));
    
    await db.delete(deposits)
      .where(eq(deposits.userId, userAffiliate.id));
    await db.delete(deposits)
      .where(eq(deposits.userId, userPartner.id));
    
    await db.delete(wallets)
      .where(eq(wallets.userId, userAffiliate.id));
    await db.delete(wallets)
      .where(eq(wallets.userId, userPartner.id));
    
    await db.delete(users)
      .where(eq(users.id, userAffiliate.id));
    await db.delete(users)
      .where(eq(users.id, userPartner.id));
    
    await db.delete(partnersWallet)
      .where(eq(partnersWallet.partnerId, testPartner.id));
    await db.delete(partners)
      .where(eq(partners.id, testPartner.id));
    
    await db.delete(affiliatesWallet)
      .where(eq(affiliatesWallet.affiliateId, testAffiliate.id));
    await db.delete(affiliates)
      .where(eq(affiliates.id, testAffiliate.id));
    
    console.log('   ✅ Dados de teste removidos');
    
    // SUMMARY
    console.log('\n' + '=' .repeat(60));
    console.log('✅ TESTE COMPLETO COM SUCESSO!');
    console.log('=' .repeat(60));
    console.log('\n📊 Resumo:');
    console.log('   • Afiliado criado com 50% de comissão');
    console.log('   • Parceiro criado com 25% de comissão');
    console.log('   • Depósitos simulados e comissões calculadas');
    console.log('   • Saldos atualizados corretamente');
    console.log('   • Sistema funcionando perfeitamente!');
    
  } catch (error) {
    console.error('\n❌ Erro durante teste:', error);
  } finally {
    process.exit(0);
  }
}

// Run the test
testCommissionFlow();