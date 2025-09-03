import { db } from './server/db';
import { deposits, affiliateConversions } from './shared/schema';
import { desc } from 'drizzle-orm';

async function monitor() {
  try {
    console.log('=== ÚLTIMOS DEPÓSITOS ===\n');
    
    const lastDeposits = await db.select()
      .from(deposits)
      .orderBy(desc(deposits.createdAt))
      .limit(5);
    
    for (const dep of lastDeposits) {
      console.log(`Depósito ID ${dep.id}:`);
      console.log(`  Usuário: ${dep.userId}`);
      console.log(`  Valor: R$ ${dep.amount}`);
      console.log(`  Status: ${dep.status}`);
      console.log(`  Transaction ID: ${dep.transactionId}`);
      console.log(`  Criado: ${dep.createdAt}`);
      console.log('---');
    }
    
    console.log('\n=== COMISSÕES RECENTES ===\n');
    
    const lastCommissions = await db.select()
      .from(affiliateConversions)
      .orderBy(desc(affiliateConversions.createdAt))
      .limit(5);
    
    for (const comm of lastCommissions) {
      console.log(`Comissão ID ${comm.id}:`);
      console.log(`  Usuário: ${comm.userId}`);
      console.log(`  Valor Depósito: R$ ${comm.conversionValue}`);
      console.log(`  Comissão: R$ ${comm.commission}`);
      console.log(`  Status: ${comm.status}`);
      console.log(`  Criado: ${comm.createdAt}`);
      console.log('---');
    }
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    process.exit();
  }
}

monitor();
