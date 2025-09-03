import { db } from './server/db';
import { users, affiliateCodes } from './shared/schema';
import { eq } from 'drizzle-orm';

async function updateUserAffiliateCode() {
  try {
    const affiliateId = 15; // teste2@afiliado.com
    
    console.log('Atualizando código de afiliado do usuário de teste...\n');
    
    // Check if user 76 exists
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, 76));
    
    if (user) {
      console.log(`Usuário encontrado: ${user.name} (ID: ${user.id})`);
      console.log(`Código de afiliado atual: ${user.affiliateCode || 'Nenhum'}`);
      
      // Update user to have affiliate code TESTE2025
      await db
        .update(users)
        .set({ affiliateCode: 'TESTE2025' })
        .where(eq(users.id, 76));
      
      console.log('✅ Código atualizado para: TESTE2025');
      
      // Update affiliate_codes statistics
      await db
        .update(affiliateCodes)
        .set({ 
          totalRegistrations: 1,
          totalDeposits: 16,
          totalClicks: 10
        })
        .where(eq(affiliateCodes.code, 'TESTE2025'));
      
      console.log('✅ Estatísticas do código atualizadas');
      
      // Verify the update
      const [updatedUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, 76));
      
      console.log(`\nVerificação:`);
      console.log(`Usuário: ${updatedUser.name}`);
      console.log(`Código de afiliado: ${updatedUser.affiliateCode}`);
      console.log(`Data de cadastro: ${new Date(updatedUser.createdAt).toLocaleString('pt-BR')}`);
      
    } else {
      console.log('Usuário ID 76 não encontrado.');
    }
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    process.exit();
  }
}

updateUserAffiliateCode();
