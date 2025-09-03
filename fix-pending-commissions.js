import { db } from './server/db.ts';
import { affiliateConversions, affiliatesWallet, affiliates } from './shared/schema.ts';
import { eq, and } from 'drizzle-orm';

async function fixPendingCommissions() {
  console.log('=== CORRIGINDO COMISSÕES PENDENTES ===\n');
  
  try {
    // Buscar todas as comissões pendentes
    const pendingCommissions = await db
      .select()
      .from(affiliateConversions)
      .where(eq(affiliateConversions.status, 'pending'));
    
    console.log(`Encontradas ${pendingCommissions.length} comissões pendentes:\n`);
    
    for (const commission of pendingCommissions) {
      console.log(`Comissão ID ${commission.id}:`);
      console.log(`  - Afiliado ID: ${commission.affiliateId}`);
      console.log(`  - Valor: R$ ${commission.commission}`);
      console.log(`  - Status atual: ${commission.status}`);
      
      // Atualizar status para completed
      await db
        .update(affiliateConversions)
        .set({ status: 'completed' })
        .where(eq(affiliateConversions.id, commission.id));
      
      // Verificar se já existe crédito na carteira
      const walletTransactions = await db
        .select()
        .from(affiliatesWallet)
        .where(
          and(
            eq(affiliatesWallet.affiliateId, commission.affiliateId),
            eq(affiliatesWallet.referenceId, commission.id)
          )
        );
      
      if (walletTransactions.length === 0) {
        // Adicionar crédito na carteira
        await db.insert(affiliatesWallet).values({
          affiliateId: commission.affiliateId,
          type: 'commission',
          amount: commission.commission,
          status: 'completed',
          referenceId: commission.id,
          description: `Comissão aprovada - Depósito #${commission.userId}`
        });
        
        // Atualizar earnings do afiliado
        const affiliate = await db
          .select()
          .from(affiliates)
          .where(eq(affiliates.id, commission.affiliateId))
          .limit(1);
        
        if (affiliate.length > 0) {
          const currentApproved = parseFloat(affiliate[0].approvedEarnings || '0');
          const commissionAmount = parseFloat(commission.commission);
          const newApproved = currentApproved + commissionAmount;
          
          await db
            .update(affiliates)
            .set({
              approvedEarnings: newApproved.toFixed(2)
            })
            .where(eq(affiliates.id, commission.affiliateId));
          
          console.log(`  ✅ Comissão aprovada e creditada na carteira`);
          console.log(`  - Saldo anterior: R$ ${currentApproved.toFixed(2)}`);
          console.log(`  - Saldo novo: R$ ${newApproved.toFixed(2)}\n`);
        }
      } else {
        console.log(`  ⚠️ Já existe transação na carteira para esta comissão\n`);
      }
    }
    
    if (pendingCommissions.length === 0) {
      console.log('Nenhuma comissão pendente encontrada.');
    } else {
      console.log(`✅ ${pendingCommissions.length} comissões corrigidas com sucesso!`);
    }
    
  } catch (error) {
    console.error('Erro ao corrigir comissões:', error);
  } finally {
    process.exit(0);
  }
}

fixPendingCommissions();