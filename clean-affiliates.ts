import { db } from "./server/db";
import { affiliates, affiliateCodes, affiliateClicks, affiliateConversions, affiliatePayouts, affiliatesWallet, affiliatesWalletTransactions, users } from "./shared/schema";
import { eq, ne, sql } from "drizzle-orm";
import bcrypt from "bcrypt";

async function cleanAffiliates() {
  console.log('\n=== LIMPANDO AFILIADOS ===\n');
  
  try {
    // Primeiro, vamos verificar quantos afiliados existem
    const allAffiliates = await db.select().from(affiliates);
    console.log(`Total de afiliados encontrados: ${allAffiliates.length}`);
    
    if (allAffiliates.length > 0) {
      // Deletar todos os dados relacionados aos afiliados que serão removidos
      console.log('\nDeletando dados relacionados...');
      
      // Primeiro, obter todas as carteiras que serão deletadas
      const walletsToDelete = await db.select().from(affiliatesWallet).where(ne(affiliatesWallet.affiliateId, 1));
      
      if (walletsToDelete.length > 0) {
        // Deletar todas as transações das carteiras que serão removidas
        for (const wallet of walletsToDelete) {
          await db.delete(affiliatesWalletTransactions).where(eq(affiliatesWalletTransactions.walletId, wallet.id));
        }
        console.log('✓ Transações de carteiras deletadas');
      }
      
      // Deletar todos os códigos de afiliados exceto do afiliado ID 1
      await db.delete(affiliateCodes).where(ne(affiliateCodes.affiliateId, 1));
      console.log('✓ Códigos de afiliados deletados');
      
      // Deletar todos os cliques exceto do afiliado ID 1
      await db.delete(affiliateClicks).where(ne(affiliateClicks.affiliateId, 1));
      console.log('✓ Cliques de afiliados deletados');
      
      // Deletar todas as conversões exceto do afiliado ID 1  
      await db.delete(affiliateConversions).where(ne(affiliateConversions.affiliateId, 1));
      console.log('✓ Conversões de afiliados deletadas');
      
      // Deletar todos os pagamentos exceto do afiliado ID 1
      await db.delete(affiliatePayouts).where(ne(affiliatePayouts.affiliateId, 1));
      console.log('✓ Pagamentos de afiliados deletados');
      
      // Deletar todas as carteiras de afiliados exceto do afiliado ID 1
      await db.delete(affiliatesWallet).where(ne(affiliatesWallet.affiliateId, 1));
      console.log('✓ Carteiras de afiliados deletadas');
      
      // Limpar o affiliate_id dos usuários que referenciam afiliados que serão deletados
      await db.update(users)
        .set({ affiliateId: null })
        .where(ne(users.affiliateId, 1));
      console.log('✓ Referências de afiliados removidas dos usuários');
      
      // Deletar todos os afiliados exceto o ID 1
      await db.delete(affiliates).where(ne(affiliates.id, 1));
      console.log('✓ Afiliados deletados (exceto ID 1)');
    }
    
    // Verificar se existe o afiliado ID 1
    const [existingAffiliate] = await db.select().from(affiliates).where(eq(affiliates.id, 1));
    
    if (existingAffiliate) {
      // Atualizar o afiliado existente com nova senha
      const hashedPassword = await bcrypt.hash('afiliado123', 10);
      await db.update(affiliates)
        .set({
          name: 'Afiliado Master',
          email: 'afiliado@maniabrasil.com',
          password: hashedPassword,
          phone: '11999999999',
          cpf: '07325503601',
          code: 'MASTER',
          isActive: true,
          commissionRate: 50, // 50% de comissão
          totalClicks: 0,
          totalRegistrations: 0,
          totalDeposits: 0,
          paidEarnings: '0.00',
          approvedEarnings: '0.00'
        })
        .where(eq(affiliates.id, 1));
      console.log('\n✓ Afiliado ID 1 atualizado');
    } else {
      // Criar novo afiliado se não existir
      const hashedPassword = await bcrypt.hash('afiliado123', 10);
      await db.insert(affiliates).values({
        name: 'Afiliado Master',
        email: 'afiliado@maniabrasil.com',
        password: hashedPassword,
        phone: '11999999999',
        cpf: '07325503601',
        code: 'MASTER',
        isActive: true,
        commissionRate: 50,
        totalClicks: 0,
        totalRegistrations: 0,
        totalDeposits: 0,
        paidEarnings: '0.00',
        approvedEarnings: '0.00'
      });
      console.log('\n✓ Afiliado Master criado');
    }
    
    console.log('\n=== AFILIADO CONFIGURADO COM SUCESSO ===');
    console.log('\n📧 Email: afiliado@maniabrasil.com');
    console.log('🔑 Senha: afiliado123');
    console.log('💰 Comissão: 50%');
    console.log('\n🔗 Acesse em: /painel/afiliados');
    
  } catch (error: any) {
    console.error('Erro:', error.message);
  }
  
  process.exit(0);
}

cleanAffiliates();