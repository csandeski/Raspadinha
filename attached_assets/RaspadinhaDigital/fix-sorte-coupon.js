import { db } from './server/db.js';
import { coupons } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function fixSorteCoupon() {
  console.log("🔧 Corrigindo cupom SORTE...\n");
  
  try {
    // Atualizar o cupom SORTE para ter bônus de raspadinhas
    const [updatedCoupon] = await db.update(coupons)
      .set({
        bonusAmount: '45', // 45 raspadinhas de bônus para depósitos de R$ 80
        minDeposit: '15.00', // Depósito mínimo
        bonusType: 'scratch_cards',
        description: 'Bônus de boas-vindas'
      })
      .where(eq(coupons.code, 'SORTE'))
      .returning();
    
    if (updatedCoupon) {
      console.log("✅ Cupom SORTE atualizado:");
      console.log(`   Tipo: ${updatedCoupon.bonusType}`);
      console.log(`   Bônus: ${updatedCoupon.bonusAmount} raspadinhas`);
      console.log(`   Depósito mínimo: R$ ${updatedCoupon.minDeposit}`);
    } else {
      console.log("❌ Cupom SORTE não encontrado");
    }
    
  } catch (error) {
    console.error("❌ Erro:", error);
  }
  
  process.exit(0);
}

fixSorteCoupon();
