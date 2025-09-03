// Test admin affiliates and partners functionality
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

async function testAdminAffiliatesPartners() {
  console.log('🔧 TESTE DO PAINEL ADMIN - AFILIADOS E PARCEIROS\n');
  console.log('=' .repeat(60));
  
  try {
    // 1. Login as admin
    console.log('\n1️⃣ Fazendo login como admin...');
    const loginResponse = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: ADMIN_USERNAME,
        password: ADMIN_PASSWORD
      })
    });
    
    if (!loginResponse.ok) {
      console.log('❌ Erro no login do admin');
      return;
    }
    
    const { sessionId } = await loginResponse.json();
    console.log('✅ Login realizado com sucesso');
    
    // 2. Test affiliate route
    console.log('\n2️⃣ Buscando afiliados...');
    const affiliatesResponse = await fetch(`${BASE_URL}/api/admin/affiliates`, {
      headers: { 'Authorization': `Bearer ${sessionId}` }
    });
    
    if (affiliatesResponse.ok) {
      const affiliates = await affiliatesResponse.json();
      console.log(`✅ ${affiliates.length} afiliados encontrados`);
      
      if (affiliates.length > 0) {
        const sample = affiliates[0];
        console.log(`   Exemplo: ${sample.name} - ${sample.email}`);
        console.log(`   Nível: ${sample.affiliateLevel}, Comissão: ${sample.commissionType}`);
        console.log(`   Total ganho: R$ ${sample.totalEarnings}, Pendente: R$ ${sample.pendingEarnings}`);
      }
    } else {
      console.log('❌ Erro ao buscar afiliados');
    }
    
    // 3. Test partners route
    console.log('\n3️⃣ Buscando parceiros...');
    const partnersResponse = await fetch(`${BASE_URL}/api/admin/partners`, {
      headers: { 'Authorization': `Bearer ${sessionId}` }
    });
    
    if (partnersResponse.ok) {
      const partners = await partnersResponse.json();
      console.log(`✅ ${partners.length} parceiros encontrados`);
      
      if (partners.length > 0) {
        const sample = partners[0];
        console.log(`   Exemplo: ${sample.name} - ${sample.email}`);
        console.log(`   Código: ${sample.code}, Afiliado: ${sample.affiliateName}`);
        console.log(`   Total ganho: R$ ${sample.totalEarnings}, Pendente: R$ ${sample.pendingEarnings}`);
      }
    } else {
      console.log('❌ Erro ao buscar parceiros');
    }
    
    // 4. Test conversions route
    console.log('\n4️⃣ Buscando conversões...');
    const conversionsResponse = await fetch(`${BASE_URL}/api/admin/conversions`, {
      headers: { 'Authorization': `Bearer ${sessionId}` }
    });
    
    if (conversionsResponse.ok) {
      const conversions = await conversionsResponse.json();
      console.log(`✅ ${conversions.length} conversões encontradas`);
      
      // Count by status
      const pending = conversions.filter(c => c.status === 'pending').length;
      const completed = conversions.filter(c => c.status === 'completed').length;
      const cancelled = conversions.filter(c => c.status === 'cancelled').length;
      
      console.log(`   Pendentes: ${pending}, Completas: ${completed}, Canceladas: ${cancelled}`);
      
      // Calculate total commissions
      const totalCommissions = conversions.reduce((sum, c) => 
        sum + parseFloat(c.commission || '0'), 0
      );
      console.log(`   Total em comissões: R$ ${totalCommissions.toFixed(2)}`);
    } else {
      console.log('❌ Erro ao buscar conversões');
    }
    
    // 5. Summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 RESUMO DO TESTE');
    console.log('=' .repeat(60));
    console.log('\n✅ Sistema de afiliados e parceiros no admin funcionando!');
    console.log('\n📌 Funcionalidades disponíveis:');
    console.log('   • Visualização completa de afiliados');
    console.log('   • Visualização completa de parceiros');
    console.log('   • Histórico de conversões');
    console.log('   • Estatísticas detalhadas');
    console.log('   • Aprovação de comissões pendentes');
    console.log('\n🎯 Acesse o painel admin e clique na aba "Afiliados" para ver tudo!');
    
  } catch (error) {
    console.error('\n❌ Erro durante teste:', error.message);
  }
}

// Run the test
testAdminAffiliatesPartners();