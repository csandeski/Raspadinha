import { db } from './server/db.js';
import { deposits, users, wallets } from './shared/schema.js';
import { eq, and } from 'drizzle-orm';

async function simulatePaymentDirectly() {
  console.log("🎯 Simulando pagamento diretamente para usuário com cupom SORTE...\n");
  
  try {
    // Buscar um usuário com cupom SORTE e depósito pendente ou completed
    const [user] = await db.select()
      .from(users)
      .where(and(
        eq(users.id, 98), // teste utm
        eq(users.couponApplied, 1)
      ));
    
    if (!user) {
      console.log("❌ Usuário não encontrado");
      return;
    }
    
    console.log(`👤 Usuário: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Cupom: ${user.currentCoupon}`);
    
    // Buscar último depósito
    const [deposit] = await db.select()
      .from(deposits)
      .where(eq(deposits.userId, user.id))
      .orderBy(deposits.createdAt)
      .limit(1);
    
    if (!deposit) {
      console.log("❌ Nenhum depósito encontrado");
      return;
    }
    
    console.log(`\n💳 Depósito: ${deposit.transactionId}`);
    console.log(`   Valor: R$ ${deposit.amount}`);
    console.log(`   Status atual: ${deposit.status}`);
    
    // Buscar carteira antes
    const [walletBefore] = await db.select()
      .from(wallets)
      .where(eq(wallets.userId, user.id));
    
    console.log(`\n📊 Antes da simulação:`);
    console.log(`   Saldo: R$ ${walletBefore.balance}`);
    console.log(`   Raspadinhas bônus: ${walletBefore.scratchBonus}`);
    
    // Fazer a requisição de simulação
    const response = await fetch('http://localhost:5000/api/webhook/pix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactionId: deposit.transactionId,
        status: 'paid',
        amount: parseFloat(deposit.amount) * 100 // Em centavos
      })
    });
    
    if (response.ok) {
      console.log("\n✅ Webhook processado");
      
      // Buscar carteira depois
      const [walletAfter] = await db.select()
        .from(wallets)
        .where(eq(wallets.userId, user.id));
      
      console.log(`\n📊 Depois da simulação:`);
      console.log(`   Saldo: R$ ${walletAfter.balance}`);
      console.log(`   Raspadinhas bônus: ${walletAfter.scratchBonus}`);
      
      const bonusAdded = walletAfter.scratchBonus - walletBefore.scratchBonus;
      if (bonusAdded > 0) {
        console.log(`\n🎉 SUCESSO! Foram adicionadas ${bonusAdded} raspadinhas de bônus!`);
      } else {
        console.log(`\n⚠️ Nenhum bônus foi adicionado`);
      }
    } else {
      console.log("❌ Erro no webhook");
    }
    
  } catch (error) {
    console.error("❌ Erro:", error);
  }
  
  process.exit(0);
}

simulatePaymentDirectly();
