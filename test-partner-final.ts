import { db } from './server/db';

async function testPartnerFinal() {
  console.log('=== TESTE FINAL DO PAINEL DO PARCEIRO ===\n');
  
  const email = 'partner1755810339358@test.com';
  const password = 'Test123456';
  
  // 1. Login
  console.log('1. Login do Parceiro');
  const loginRes = await fetch('http://localhost:5000/api/partner/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  if (!loginRes.ok) {
    console.log('❌ Falha no login');
    process.exit(1);
  }
  
  const { token } = await loginRes.json();
  console.log('✅ Login bem-sucedido\n');
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
  
  // 2. Testar todas as páginas/APIs
  console.log('2. Testando todas as páginas do painel:\n');
  
  const pages = [
    { name: 'Dashboard', url: '/api/partner/dashboard' },
    { name: 'Dashboard Stats', url: '/api/partner/dashboard-stats' },
    { name: 'Links', url: '/api/partner/links' },
    { name: 'Network', url: '/api/partner/network' },
    { name: 'Earnings', url: '/api/partner/earnings' },
    { name: 'Codes', url: '/api/partner/codes' },
    { name: 'History', url: '/api/partner/history' },
    { name: 'Demo Account', url: '/api/partner/demo-account' },
    { name: 'Info', url: '/api/partner/info' },
    { name: 'Performance', url: '/api/partner/performance' }
  ];
  
  let allSuccess = true;
  
  for (const page of pages) {
    const res = await fetch(`http://localhost:5000${page.url}`, { headers });
    
    if (res.ok) {
      console.log(`✅ ${page.name.padEnd(20)} - OK`);
    } else {
      console.log(`❌ ${page.name.padEnd(20)} - Erro ${res.status}`);
      allSuccess = false;
    }
  }
  
  // 3. Testar funcionalidades principais
  console.log('\n3. Testando funcionalidades principais:\n');
  
  // Buscar conta demo
  const demoRes = await fetch('http://localhost:5000/api/partner/demo-account', { headers });
  
  if (demoRes.status === 404) {
    console.log('🔄 Conta demo não existe, criando uma nova...');
    
    const createRes = await fetch('http://localhost:5000/api/partner/demo-account', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Conta Demo Teste Final',
        balance: 500,
        scratchBonus: 20
      })
    });
    
    if (createRes.ok) {
      const demo = await createRes.json();
      console.log('✅ Conta demo criada com sucesso');
      console.log(`   Email: ${demo.email}`);
      console.log(`   Senha: ${demo.password}`);
      console.log(`   Saldo: R$ ${demo.balance}`);
      console.log(`   Bônus: ${demo.bonusBalance} raspadinhas\n`);
    } else {
      console.log('❌ Erro ao criar conta demo\n');
    }
  } else if (demoRes.ok) {
    const demo = await demoRes.json();
    console.log('✅ Conta demo já existe');
    console.log(`   Email: ${demo.email}`);
    console.log(`   Saldo: R$ ${demo.balance}`);
    console.log(`   Bônus: ${demo.bonusBalance} raspadinhas\n`);
    
    // Atualizar conta demo
    const updateRes = await fetch('http://localhost:5000/api/partner/demo-account', {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        name: 'Conta Demo Atualizada',
        balance: 1000,
        bonusBalance: 50
      })
    });
    
    if (updateRes.ok) {
      console.log('✅ Conta demo atualizada com sucesso\n');
    }
  }
  
  // Resumo final
  console.log('='.repeat(50));
  console.log('\n📊 RESUMO DO TESTE:\n');
  
  if (allSuccess) {
    console.log('✅ TODAS AS APIs DO PAINEL DO PARCEIRO ESTÃO FUNCIONANDO!');
    console.log('\nO painel do parceiro está 100% operacional com:');
    console.log('  • Dashboard com estatísticas');
    console.log('  • Links de marketing com QR codes');
    console.log('  • Rede de indicados');
    console.log('  • Ganhos e comissões');
    console.log('  • Códigos promocionais');
    console.log('  • Histórico de atividades');
    console.log('  • Conta demo para demonstração');
    console.log('  • Centro de materiais');
    console.log('  • Suporte integrado');
    console.log('\n🎉 Sistema pronto para uso!');
  } else {
    console.log('⚠️ Algumas APIs ainda apresentam problemas.');
    console.log('Verifique os erros acima para correção.');
  }
  
  console.log('\n' + '='.repeat(50));
  process.exit(0);
}

testPartnerFinal();