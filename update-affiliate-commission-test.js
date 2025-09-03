import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { affiliates } from './shared/schema.js';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client);

async function updateAffiliateCommission() {
  try {
    console.log('=== ATUALIZANDO COMISSÃO DO AFILIADO PARA TESTE ===\n');
    
    // Update affiliate ID 12 to have percentage commission for testing
    const result = await db.update(affiliates)
      .set({
        commissionType: 'percentage',
        customCommissionRate: '85',
        customFixedAmount: '10',
        currentLevelRate: '85'
      })
      .where(eq(affiliates.id, 12))
      .returning();
    
    if (result.length > 0) {
      console.log('✅ Afiliado atualizado com sucesso!');
      console.log('   • ID:', result[0].id);
      console.log('   • Nome:', result[0].name);
      console.log('   • Tipo de comissão:', result[0].commissionType);
      console.log('   • Taxa de comissão:', result[0].customCommissionRate + '%');
      console.log('   • Valor fixo:', 'R$ ' + result[0].customFixedAmount);
    } else {
      console.log('❌ Afiliado não encontrado');
    }
    
    await client.end();
  } catch (error) {
    console.error('❌ Erro ao atualizar afiliado:', error);
    await client.end();
    process.exit(1);
  }
}

updateAffiliateCommission();