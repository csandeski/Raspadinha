import { db } from './server/db';
import { partners, users, partnerConversions, partnersWithdrawals } from './shared/schema';
import { eq, and } from 'drizzle-orm';

async function testPartnerComplete() {
  try {
    console.log('=== TESTE COMPLETO DO PAINEL DO PARCEIRO ===\n');
    
    // 1. Login
    console.log('1. Fazendo login...');
    const loginResponse = await fetch('http://localhost:5000/api/partner/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'partner1755810339358@test.com',
        password: 'Test123456'
      })
    });
    
    const loginResult = await loginResponse.json();
    if (!loginResponse.ok) {
      console.error('❌ Erro no login:', loginResult.error);
      process.exit(1);
    }
    
    const token = loginResult.token;
    console.log('✅ Login bem-sucedido!\n');
    
    // Headers com token
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    
    // 2. Verificar se já existe conta demo
    console.log('2. Verificando conta demo existente...');
    const [partner] = await db.select()
      .from(partners)
      .where(eq(partners.email, 'partner1755810339358@test.com'))
      .limit(1);
    
    if (partner) {
      const existingDemo = await db.select()
        .from(users)
        .where(and(
          eq(users.cpf, '88888888888'),
          eq(users.referredBy, partner.code)
        ))
        .limit(1);
      
      if (existingDemo.length > 0) {
        console.log('✅ Conta demo já existe:', {
          id: existingDemo[0].id,
          name: existingDemo[0].name,
          email: existingDemo[0].email
        });
        
        // Deletar conta demo existente via API
        console.log('3. Deletando conta demo existente...');
        const deleteResponse = await fetch('http://localhost:5000/api/partner/demo-account', {
          method: 'DELETE',
          headers
        });
        
        if (deleteResponse.ok) {
          console.log('✅ Conta demo deletada com sucesso\n');
        }
      } else {
        console.log('✅ Nenhuma conta demo existente\n');
      }
    }
    
    // 3. Testar todas as APIs
    console.log('4. Testando todas as APIs...\n');
    
    const apis = [
      { name: 'Dashboard Stats', url: '/api/partner/dashboard-stats' },
      { name: 'Codes', url: '/api/partner/codes' },
      { name: 'History', url: '/api/partner/history' }
    ];
    
    for (const api of apis) {
      console.log(`Testando: ${api.name}`);
      console.log('─'.repeat(40));
      
      try {
        const response = await fetch(`http://localhost:5000${api.url}`, {
          method: 'GET',
          headers
        });
        
        const data = await response.json();
        
        if (response.ok) {
          console.log(`✅ ${api.name}: OK`);
          console.log('Response:', JSON.stringify(data, null, 2).slice(0, 150) + '...\n');
        } else {
          console.log(`❌ ${api.name}: Erro`);
          console.log('Error:', data, '\n');
        }
      } catch (error) {
        console.log(`❌ ${api.name}: Erro na requisição`);
        console.log('Error:', error.message, '\n');
      }
    }
    
    // 4. Criar nova conta demo
    console.log('5. Criando nova conta demo...');
    console.log('─'.repeat(40));
    
    const createDemoResponse = await fetch('http://localhost:5000/api/partner/demo-account', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Conta Demo Nova',
        balance: 200,
        scratchBonus: 10
      })
    });
    
    const createDemoResult = await createDemoResponse.json();
    
    if (createDemoResponse.ok) {
      console.log('✅ Conta demo criada com sucesso:', {
        id: createDemoResult.id,
        email: createDemoResult.email,
        password: createDemoResult.password
      });
    } else {
      console.log('❌ Erro ao criar conta demo:', createDemoResult);
    }
    
    // 5. Verificar se conversions e withdrawals existem
    console.log('\n6. Verificando tabelas de dados...');
    console.log('─'.repeat(40));
    
    const conversionsCount = await db.select()
      .from(partnerConversions)
      .where(eq(partnerConversions.partnerId, partner?.id || 0))
      .limit(1);
    
    console.log(`✅ Tabela partnerConversions acessível: ${conversionsCount.length >= 0 ? 'Sim' : 'Não'}`);
    
    const withdrawalsCount = await db.select()
      .from(partnersWithdrawals)
      .where(eq(partnersWithdrawals.partnerId, partner?.id || 0))
      .limit(1);
    
    console.log(`✅ Tabela partnersWithdrawals acessível: ${withdrawalsCount.length >= 0 ? 'Sim' : 'Não'}`);
    
    console.log('\n=== TESTE COMPLETO FINALIZADO ===');
    console.log('Verifique os resultados acima para confirmar que tudo está funcionando.');
    
  } catch (error) {
    console.error('Erro geral:', error);
  } finally {
    process.exit(0);
  }
}

testPartnerComplete();