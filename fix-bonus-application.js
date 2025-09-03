import { db } from './server/db.js';
import { deposits, wallets, users } from './shared/schema.js';
import { eq, sql } from 'drizzle-orm';

async function fixBonusApplication() {
  console.log("🔧 Aplicando bônus manualmente para o usuário...\n");
  
  try {
    // Verificar usuário
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, 98));
    
    console.log("👤 Usuário:");
    console.log(`   Nome: ${user.name}`);
    console.log(`   Cupom aplicado: ${user.couponApplied === 1 ? 'SIM' : 'NÃO'}`);
    console.log(`   Cupom: ${user.currentCoupon}`);
    
    // Aplicar bônus diretamente
    if (user.couponApplied === 1 && user.currentCoupon === 'SORTE') {
      const [wallet] = await db.select()
        .from(wallets)
        .where(eq(wallets.userId, 98));
      
      console.log("\n💰 Carteira atual:");
      console.log(`   Saldo: R$ ${wallet.balance}`);
      console.log(`   Raspadinhas bônus: ${wallet.scratchBonus}`);
      
      // Adicionar 45 raspadinhas de bônus
      const newBonus = wallet.scratchBonus + 45;
      
      await db.update(wallets)
        .set({ scratchBonus: newBonus })
        .where(eq(wallets.userId, 98));
      
      // Remover cupom do usuário (já foi usado)
      await db.update(users)
        .set({ 
          couponApplied: 0, 
          currentCoupon: null 
        })
        .where(eq(users.id, 98));
      
      console.log("\n✅ Bônus aplicado com sucesso!");
      console.log(`   Novas raspadinhas bônus: ${newBonus}`);
      console.log(`   Cupom removido do usuário`);
    } else {
      console.log("\n⚠️ Usuário não tem cupom SORTE aplicado");
    }
    
  } catch (error) {
    console.error("❌ Erro:", error);
  }
  
  process.exit(0);
}

fixBonusApplication();
