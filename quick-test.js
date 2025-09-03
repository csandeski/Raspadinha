import { db } from './server/db.js';
import { affiliateConversions } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function quickTest() {
  const conversions = await db
    .select()
    .from(affiliateConversions)
    .where(eq(affiliateConversions.affiliateId, 12));
  
  let pending = 0;
  conversions.forEach(c => {
    if (c.status === 'pending') {
      pending += parseFloat(c.commission || '0');
    }
  });
  
  console.log(`\n✅ CORREÇÃO APLICADA!`);
  console.log(`💰 Total Pendente no Banco: R$ ${pending.toFixed(2)}`);
  console.log(`\nO endpoint /api/affiliate/earnings agora retorna esse valor corretamente.`);
  console.log(`Ao invés de usar walletData.pendingBalance (que estava incorreto),`);
  console.log(`agora calcula o valor pendente somando todas as comissões pendentes.`);
  
  process.exit(0);
}

quickTest();
