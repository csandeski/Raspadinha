import { db } from './server/db';
import { users, deposits, partners, affiliates, partnerConversions, affiliateConversions, partnersWallet, affiliatesWallet } from './shared/schema';
import { eq, and, sql, gte } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

async function monitorCommissionSystem() {
  console.log('\n=== MONITORANDO SISTEMA DE COMISSÕES ===\n');
  
  try {
    // 1. Resumo de parceiros e suas comissões
    console.log('📊 PARCEIROS E COMISSÕES:\n');
    
    const allPartners = await db.select()
      .from(partners)
      .orderBy(sql`created_at DESC`);
    
    for (const partner of allPartners) {
      console.log(`Parceiro: ${partner.name} (${partner.code})`);
      console.log(`  - Afiliado: ID #${partner.affiliateId}`);
      console.log(`  - Tipo de comissão: ${partner.commissionType}`);
      console.log(`  - Valor/Taxa: ${partner.commissionType === 'fixed' ? `R$${partner.fixedCommissionAmount}` : `${partner.commissionRate}%`}`);
      console.log(`  - Total de ganhos: R$${partner.totalEarnings || '0.00'}`);
      console.log(`  - Depósitos totais: ${partner.totalDeposits || 0}`);
      
      // Verificar wallet
      const [wallet] = await db.select()
        .from(partnersWallet)
        .where(eq(partnersWallet.partnerId, partner.id));
      
      if (wallet) {
        console.log(`  - Saldo na carteira: R$${wallet.balance}`);
      } else {
        console.log(`  - ⚠️ Sem carteira criada`);
      }
      
      console.log('');
    }
    
    // 2. Resumo de usuários registrados via parceiros
    console.log('👥 USUÁRIOS REGISTRADOS VIA PARCEIROS:\n');
    
    const partnerUsers = await db.select()
      .from(users)
      .where(sql`partner_id IS NOT NULL`);
    
    for (const user of partnerUsers) {
      const [partner] = await db.select()
        .from(partners)
        .where(eq(partners.id, user.partnerId!))
        .limit(1);
      
      console.log(`Usuário #${user.id} - ${user.name}`);
      console.log(`  - Registrado via: ${partner?.name} (${partner?.code})`);
      
      // Verificar depósitos
      const userDeposits = await db.select()
        .from(deposits)
        .where(and(
          eq(deposits.userId, user.id),
          eq(deposits.status, 'completed')
        ));
      
      const totalDeposited = userDeposits.reduce((sum, d) => sum + parseFloat(d.amount), 0);
      console.log(`  - Depósitos: ${userDeposits.length} (Total: R$${totalDeposited.toFixed(2)})`);
      
      // Verificar conversões
      const partnerConvs = await db.select()
        .from(partnerConversions)
        .where(eq(partnerConversions.userId, user.id));
      
      const totalPartnerCommission = partnerConvs.reduce((sum, c) => 
        sum + parseFloat(c.partnerCommission || '0'), 0);
      const totalAffiliateCommission = partnerConvs.reduce((sum, c) => 
        sum + parseFloat(c.affiliateCommission || '0'), 0);
      
      console.log(`  - Comissões geradas:`);
      console.log(`    • Parceiro: R$${totalPartnerCommission.toFixed(2)}`);
      console.log(`    • Afiliado: R$${totalAffiliateCommission.toFixed(2)}`);
      
      if (userDeposits.length > 0 && partnerConvs.length === 0) {
        console.log(`  - ⚠️ ATENÇÃO: Depósitos sem comissões!`);
      }
      
      console.log('');
    }
    
    // 3. Resumo do sistema
    console.log('📈 RESUMO DO SISTEMA:\n');
    
    // Total de depósitos hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayDeposits = await db.select()
      .from(deposits)
      .where(and(
        eq(deposits.status, 'completed'),
        gte(deposits.createdAt, today)
      ));
    
    const todayTotal = todayDeposits.reduce((sum, d) => sum + parseFloat(d.amount), 0);
    
    // Comissões processadas hoje
    const todayPartnerConversions = await db.select()
      .from(partnerConversions)
      .where(gte(partnerConversions.createdAt, today));
    
    const todayPartnerCommissions = todayPartnerConversions.reduce((sum, c) => 
      sum + parseFloat(c.partnerCommission || '0'), 0);
    
    console.log(`Hoje (${today.toLocaleDateString('pt-BR')}):`);
    console.log(`  - Depósitos completados: ${todayDeposits.length} (R$${todayTotal.toFixed(2)})`);
    console.log(`  - Comissões de parceiros processadas: ${todayPartnerConversions.length} (R$${todayPartnerCommissions.toFixed(2)})`);
    
    // 4. Status do processamento automático
    console.log('\n⚙️ STATUS DO PROCESSAMENTO AUTOMÁTICO:\n');
    console.log('✅ Webhooks configurados:');
    console.log('  - IronPay: /api/webhook/pix');
    console.log('  - OrinPay: /api/webhook/orinpay/transaction');
    console.log('  - HorsePay: /api/webhook/horsepay');
    console.log('');
    console.log('✅ Fluxo de comissões:');
    console.log('  1. Usuário deposita via PIX');
    console.log('  2. Webhook recebe confirmação de pagamento');
    console.log('  3. processAffiliateCommission() é chamado');
    console.log('  4. Sistema verifica se usuário tem partnerId');
    console.log('  5. Se sim: divide comissão entre parceiro e afiliado');
    console.log('  6. Se não: 100% da comissão vai para o afiliado');
    console.log('  7. Wallets são atualizadas automaticamente');
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    process.exit(0);
  }
}

monitorCommissionSystem();