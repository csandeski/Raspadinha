import { db } from './server/db.ts';
import { deposits, affiliateConversions, users, affiliatesWallet, affiliates, wallets } from './shared/schema.ts';
import { eq, desc } from 'drizzle-orm';

async function setupAndTest() {
  console.log('=== CONFIGURANDO E TESTANDO COMISSÃO AUTOMÁTICA ===\n');
  
  try {
    // 1. Buscar um afiliado ativo
    const activeAffiliates = await db.select()
      .from(affiliates)
      .where(eq(affiliates.isActive, true))
      .limit(1);
    
    if (activeAffiliates.length === 0) {
      console.log('❌ Nenhum afiliado ativo encontrado');
      return;
    }
    
    const affiliate = activeAffiliates[0];
    console.log(`✅ Afiliado encontrado: ${affiliate.name} (ID: ${affiliate.id})`);
    console.log(`   - Tipo de comissão: ${affiliate.commissionType}`);
    console.log(`   - Taxa: ${affiliate.commissionType === 'percentage' ? affiliate.currentLevelRate + '%' : 'R$ ' + affiliate.fixedCommissionAmount}\n`);
    
    // 2. Criar um usuário de teste com afiliado
    const testEmail = `teste${Date.now()}@test.com`;
    const testUser = await db.insert(users).values({
      name: 'Usuário Teste Comissão',
      email: testEmail,
      phone: '11999999999',
      password: 'teste123',
      affiliateId: affiliate.id // Associar o afiliado
    }).returning();
    
    console.log(`✅ Usuário de teste criado:`);
    console.log(`   - ID: ${testUser[0].id}`);
    console.log(`   - Email: ${testUser[0].email}`);
    console.log(`   - Afiliado ID: ${testUser[0].affiliateId}\n`);
    
    // 2.5. Criar carteira para o usuário
    await db.insert(wallets).values({
      userId: testUser[0].id,
      balance: '0.00',
      scratchBonus: 0,
      totalWagered: '0.00'
    });
    console.log(`✅ Carteira criada para o usuário\n`);
    
    // 3. Criar um depósito pendente para este usuário
    const transactionId = `TEST-${Date.now()}`;
    const depositAmount = '100.00';
    const displayId = Math.floor(Math.random() * 900000) + 100000; // Gerar display_id numérico único
    
    const newDeposit = await db.insert(deposits).values({
      userId: testUser[0].id,
      displayId: displayId,
      transactionId: transactionId,
      amount: depositAmount,
      pixCode: 'TEST-PIX-CODE',
      status: 'pending',
      paymentProvider: 'ironpay'
    }).returning();
    
    console.log(`✅ Depósito pendente criado:`);
    console.log(`   - ID: ${newDeposit[0].id}`);
    console.log(`   - Transaction ID: ${transactionId}`);
    console.log(`   - Valor: R$ ${depositAmount}\n`);
    
    // 4. Buscar comissões do afiliado ANTES
    const commissionsBefore = await db.select()
      .from(affiliateConversions)
      .where(eq(affiliateConversions.affiliateId, affiliate.id));
    
    const completedBefore = commissionsBefore.filter(c => c.status === 'completed').length;
    
    console.log(`📊 Comissões ANTES da confirmação:`);
    console.log(`   - Aprovadas: ${completedBefore}`);
    console.log(`   - Total: ${commissionsBefore.length}\n`);
    
    // 5. Simular webhook de confirmação
    console.log('🚀 Simulando confirmação de pagamento via webhook...\n');
    
    const response = await fetch('http://localhost:5000/api/webhook/pix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactionId: transactionId,
        status: 'paid',
        payment_status: 'PAID',
        amount: depositAmount
      })
    });
    
    const result = await response.json();
    console.log(`   Webhook processado: ${result.success ? '✅ Sucesso' : '❌ Falha'}\n`);
    
    // 6. Aguardar processamento
    console.log('⏳ Aguardando 2 segundos...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 7. Buscar comissões DEPOIS
    const commissionsAfter = await db.select()
      .from(affiliateConversions)
      .where(eq(affiliateConversions.affiliateId, affiliate.id));
    
    const completedAfter = commissionsAfter.filter(c => c.status === 'completed').length;
    
    console.log(`📊 Comissões DEPOIS da confirmação:`);
    console.log(`   - Aprovadas: ${completedAfter} (${completedAfter > completedBefore ? '+' + (completedAfter - completedBefore) : '0'})`);
    console.log(`   - Total: ${commissionsAfter.length}\n`);
    
    // 8. Verificar a nova comissão
    const newCommission = commissionsAfter.find(c => 
      c.userId === testUser[0].id &&
      c.status === 'completed'
    );
    
    if (newCommission) {
      console.log('✅ SUCESSO! Comissão aprovada automaticamente:');
      console.log(`   - ID: ${newCommission.id}`);
      console.log(`   - Valor da comissão: R$ ${newCommission.commission}`);
      console.log(`   - Status: ${newCommission.status}`);
      console.log(`   - Taxa: ${newCommission.commissionRate ? newCommission.commissionRate + '%' : 'Fixa'}`);
      
      // Calcular valor esperado
      let expectedCommission;
      if (affiliate.commissionType === 'percentage') {
        const rate = parseFloat(affiliate.currentLevelRate || '0');
        expectedCommission = (parseFloat(depositAmount) * rate / 100).toFixed(2);
      } else {
        expectedCommission = affiliate.fixedCommissionAmount;
      }
      
      console.log(`   - Valor esperado: R$ ${expectedCommission}`);
      console.log(`   - Valor correto: ${newCommission.commission === expectedCommission ? '✅ Sim' : '❌ Não'}`);
    } else {
      console.log('❌ FALHA! Nenhuma comissão foi criada/aprovada');
    }
    
    // 9. Verificar carteira do afiliado
    const wallet = await db.select()
      .from(affiliatesWallet)
      .where(eq(affiliatesWallet.affiliateId, affiliate.id))
      .limit(1);
    
    if (wallet[0]) {
      console.log(`\n💰 Carteira do afiliado:`);
      console.log(`   - Saldo disponível: R$ ${wallet[0].balance}`);
      console.log(`   - Total ganho: R$ ${wallet[0].totalEarned}`);
    }
    
    // 10. Verificar status do depósito
    const updatedDeposit = await db.select()
      .from(deposits)
      .where(eq(deposits.id, newDeposit[0].id))
      .limit(1);
    
    console.log(`\n📦 Status do depósito:`);
    console.log(`   - Status: ${updatedDeposit[0].status}`);
    console.log(`   - ${updatedDeposit[0].status === 'completed' ? '✅ Depósito confirmado' : '❌ Depósito não confirmado'}`);
    
    // 11. Limpar dados de teste
    console.log('\n🧹 Limpando dados de teste...');
    
    // Deletar comissão de teste
    if (newCommission) {
      await db.delete(affiliateConversions)
        .where(eq(affiliateConversions.id, newCommission.id));
    }
    
    // Deletar depósito de teste
    await db.delete(deposits)
      .where(eq(deposits.id, newDeposit[0].id));
    
    // Deletar usuário de teste
    await db.delete(users)
      .where(eq(users.id, testUser[0].id));
    
    console.log('✅ Dados de teste removidos');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    console.error(error);
  }
  
  console.log('\n=== FIM DO TESTE ===');
  process.exit(0);
}

// Executar teste
setupAndTest();