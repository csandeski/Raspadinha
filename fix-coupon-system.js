import { db } from './server/db.js';
import { users, coupons, couponUses, wallets } from './shared/schema.js';
import { eq, and, isNotNull } from 'drizzle-orm';

async function fixCouponSystem() {
  console.log("🔧 Corrigindo sistema de cupons...\n");
  
  try {
    // 1. Verificar cupom SORTE
    const [sorteCoupon] = await db.select()
      .from(coupons)
      .where(eq(coupons.code, 'SORTE'));
    
    if (!sorteCoupon) {
      console.log("❌ Cupom SORTE não existe. Criando...");
      
      await db.insert(coupons).values({
        code: 'SORTE',
        description: 'Bônus de boas-vindas - 45 raspadinhas',
        bonusType: 'scratch_cards',
        bonusAmount: '45',
        minDeposit: '15.00',
        isActive: true,
        usageLimit: 1000,
        usageCount: 0
      });
      
      console.log("✅ Cupom SORTE criado com 45 raspadinhas de bônus");
    } else {
      // Atualizar cupom existente
      await db.update(coupons)
        .set({
          bonusAmount: '45',
          bonusType: 'scratch_cards',
          minDeposit: '15.00',
          isActive: true
        })
        .where(eq(coupons.code, 'SORTE'));
      
      console.log("✅ Cupom SORTE atualizado:");
      console.log(`   Tipo: scratch_cards`);
      console.log(`   Bônus: 45 raspadinhas`);
      console.log(`   Depósito mínimo: R$ 15.00`);
    }
    
    // 2. Verificar cupom TESTE2025
    const [teste2025Coupon] = await db.select()
      .from(coupons)
      .where(eq(coupons.code, 'TESTE2025'));
    
    if (!teste2025Coupon) {
      console.log("\n❌ Cupom TESTE2025 não existe. Criando...");
      
      await db.insert(coupons).values({
        code: 'TESTE2025',
        description: 'Código de teste - 10 raspadinhas',
        bonusType: 'scratch_cards',
        bonusAmount: '10',
        minDeposit: '15.00',
        isActive: true,
        usageLimit: 1000,
        usageCount: 0
      });
      
      console.log("✅ Cupom TESTE2025 criado com 10 raspadinhas de bônus");
    } else {
      // Atualizar cupom existente
      await db.update(coupons)
        .set({
          bonusAmount: '10',
          bonusType: 'scratch_cards',
          minDeposit: '15.00',
          isActive: true
        })
        .where(eq(coupons.code, 'TESTE2025'));
      
      console.log("\n✅ Cupom TESTE2025 atualizado:");
      console.log(`   Tipo: scratch_cards`);
      console.log(`   Bônus: 10 raspadinhas`);
      console.log(`   Depósito mínimo: R$ 15.00`);
    }
    
    // 3. Listar usuários com cupons aplicados mas sem bônus
    console.log("\n📊 Verificando usuários com cupons aplicados...");
    
    const usersWithCoupons = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      couponApplied: users.couponApplied,
      currentCoupon: users.currentCoupon
    })
    .from(users)
    .where(and(
      eq(users.couponApplied, 1),
      isNotNull(users.currentCoupon)
    ));
    
    console.log(`\nEncontrados ${usersWithCoupons.length} usuários com cupons aplicados`);
    
    // 4. Verificar se eles receberam o bônus
    let needsFixCount = 0;
    for (const user of usersWithCoupons) {
      // Verificar se o cupom já foi usado
      const uses = await db.select()
        .from(couponUses)
        .where(eq(couponUses.userId, user.id));
      
      const [wallet] = await db.select()
        .from(wallets)
        .where(eq(wallets.userId, user.id));
      
      if (uses.length === 0 && wallet && wallet.scratchBonus === 0) {
        needsFixCount++;
        console.log(`\n⚠️ Usuário ${user.name} (ID: ${user.id}) tem cupom ${user.currentCoupon} mas sem bônus`);
      }
    }
    
    if (needsFixCount > 0) {
      console.log(`\n🔍 Total de ${needsFixCount} usuários precisam ter o bônus aplicado`);
      console.log("Para aplicar o bônus, eles precisam fazer um novo depósito");
      console.log("O sistema agora está corrigido e aplicará o bônus automaticamente");
    } else {
      console.log("\n✅ Todos os usuários com cupons já receberam seus bônus!");
    }
    
    // 5. Verificar a configuração dos cupons
    console.log("\n📋 Configuração atual dos cupons:");
    const allCoupons = await db.select()
      .from(coupons)
      .where(eq(coupons.isActive, true));
    
    for (const coupon of allCoupons) {
      console.log(`\n🎟️ ${coupon.code}:`);
      console.log(`   Descrição: ${coupon.description}`);
      console.log(`   Tipo: ${coupon.bonusType}`);
      console.log(`   Bônus: ${coupon.bonusAmount}`);
      console.log(`   Depósito mínimo: R$ ${coupon.minDeposit}`);
      console.log(`   Usos: ${coupon.usageCount}/${coupon.usageLimit || 'ilimitado'}`);
    }
    
  } catch (error) {
    console.error("❌ Erro:", error);
  }
  
  process.exit(0);
}

fixCouponSystem();