import { db } from './server/db';
import { partners } from './shared/schema';
import { eq } from 'drizzle-orm';

async function testPartnerAPIs() {
  try {
    console.log('=== TESTANDO TODAS AS APIs DO PARCEIRO ===\n');
    
    // Primeiro fazer login
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
      console.error('Erro no login:', loginResult.error);
      process.exit(1);
    }
    
    const token = loginResult.token;
    console.log('✅ Login bem-sucedido!\n');
    
    // Headers com token
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    
    // Array de APIs para testar
    const apis = [
      { name: 'Info do Parceiro', url: '/api/partner/info', method: 'GET' },
      { name: 'Dashboard Stats', url: '/api/partner/dashboard-stats', method: 'GET' },
      { name: 'Dashboard', url: '/api/partner/dashboard', method: 'GET' },
      { name: 'Performance', url: '/api/partner/performance', method: 'GET' },
      { name: 'Earnings', url: '/api/partner/earnings', method: 'GET' },
      { name: 'Network', url: '/api/partner/network', method: 'GET' },
      { name: 'Codes', url: '/api/partner/codes', method: 'GET' },
      { name: 'Links', url: '/api/partner/links', method: 'GET' },
      { name: 'History', url: '/api/partner/history', method: 'GET' },
      { name: 'Demo Account', url: '/api/partner/demo-account', method: 'GET' }
    ];
    
    // Testar cada API
    for (const api of apis) {
      console.log(`\nTestando: ${api.name} (${api.method} ${api.url})`);
      console.log('─'.repeat(50));
      
      try {
        const response = await fetch(`http://localhost:5000${api.url}`, {
          method: api.method,
          headers
        });
        
        const data = await response.json();
        
        if (response.ok) {
          console.log(`✅ Status: ${response.status} OK`);
          console.log('Response preview:', JSON.stringify(data, null, 2).slice(0, 200) + '...');
        } else {
          console.log(`❌ Status: ${response.status}`);
          console.log('Error:', data);
        }
      } catch (error) {
        console.log(`❌ Erro na requisição:`, error.message);
      }
    }
    
    // Testar criação de código
    console.log('\n\nTestando criação de código...');
    console.log('─'.repeat(50));
    
    const createCodeResponse = await fetch('http://localhost:5000/api/partner/codes', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        code: 'TESTCODE' + Date.now().toString().slice(-4),
        name: 'Código de Teste'
      })
    });
    
    const createCodeResult = await createCodeResponse.json();
    
    if (createCodeResponse.ok) {
      console.log('✅ Código criado:', createCodeResult);
    } else {
      console.log('❌ Erro ao criar código:', createCodeResult);
    }
    
    // Testar criação de conta demo
    console.log('\n\nTestando criação de conta demo...');
    console.log('─'.repeat(50));
    
    const createDemoResponse = await fetch('http://localhost:5000/api/partner/demo-account', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Conta Demo Teste',
        balance: 100,
        scratchBonus: 5
      })
    });
    
    const createDemoResult = await createDemoResponse.json();
    
    if (createDemoResponse.ok) {
      console.log('✅ Conta demo criada:', createDemoResult);
    } else {
      console.log('❌ Erro ao criar conta demo:', createDemoResult);
    }
    
    console.log('\n\n=== TESTE COMPLETO ===');
    console.log('Verifique os resultados acima para identificar problemas.');
    
  } catch (error) {
    console.error('Erro geral:', error);
  } finally {
    process.exit(0);
  }
}

testPartnerAPIs();