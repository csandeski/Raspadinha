import bcrypt from 'bcrypt';
import { db } from './server/db';
import { partners, affiliates } from './shared/schema';
import { eq } from 'drizzle-orm';

async function testPartnerLogin() {
  try {
    console.log('Verificando parceiro...');
    
    // Buscar parceiro
    const [partner] = await db.select()
      .from(partners)
      .where(eq(partners.email, 'partner1755810339358@test.com'))
      .limit(1);
    
    if (!partner) {
      console.log('Parceiro não encontrado!');
      
      // Primeiro, buscar ou criar um afiliado
      const [affiliate] = await db.select()
        .from(affiliates)
        .limit(1);
      
      if (!affiliate) {
        console.log('Nenhum afiliado encontrado! Criando afiliado de teste...');
        const affiliatePassword = await bcrypt.hash('Test123456', 10);
        const [newAffiliate] = await db.insert(affiliates).values({
          name: 'Afiliado Teste',
          email: 'affiliate-test@test.com',
          password: affiliatePassword,
          code: 'AFFILIATE' + Date.now().toString().slice(-6),
          commissionRate: '20.00',
          commissionType: 'percentage'
        }).returning();
        console.log('Afiliado criado:', newAffiliate.id);
      }
      
      // Buscar novamente o afiliado
      const [existingAffiliate] = await db.select()
        .from(affiliates)
        .limit(1);
      
      // Criar parceiro para teste
      const password = 'Test123456';
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const [newPartner] = await db.insert(partners).values({
        affiliateId: existingAffiliate.id,
        name: 'Parceiro Teste',
        email: 'partner1755810339358@test.com',
        password: hashedPassword,
        code: 'PARTNER' + Date.now().toString().slice(-6),
        commissionRate: '10.00',
        commissionType: 'percentage'
      }).returning();
      
      console.log('Parceiro criado:', {
        id: newPartner.id,
        email: newPartner.email,
        code: newPartner.code
      });
      console.log('Senha:', password);
    } else {
      console.log('Parceiro encontrado:', {
        id: partner.id,
        email: partner.email,
        code: partner.code,
        affiliateId: partner.affiliateId
      });
      
      // Atualizar senha para garantir
      const newPassword = 'Test123456';
      const newHashedPassword = await bcrypt.hash(newPassword, 10);
      
      await db.update(partners)
        .set({ password: newHashedPassword })
        .where(eq(partners.id, partner.id));
      
      console.log('Senha atualizada para:', newPassword);
    }
    
    // Testar login
    console.log('\nTestando login...');
    const response = await fetch('http://localhost:5000/api/partner/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'partner1755810339358@test.com',
        password: 'Test123456'
      })
    });
    
    const result = await response.json();
    if (response.ok) {
      console.log('Login bem-sucedido!');
      console.log('Token:', result.token?.substring(0, 20) + '...');
    } else {
      console.error('Erro no login:', result.error);
    }
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    process.exit(0);
  }
}

testPartnerLogin();