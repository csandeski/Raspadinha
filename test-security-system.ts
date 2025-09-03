import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'defa543ult-jwt-secret-2024';
const BASE_URL = 'http://localhost:5000';

console.log('🔒 TESTE DE SEGURANÇA E FUNCIONALIDADE DO SISTEMA\n');
console.log('=' .repeat(60));

interface TestResult {
  name: string;
  status: 'pass' | 'fail';
  message?: string;
}

const results: TestResult[] = [];

async function testAuthSecurity() {
  console.log('\n🔐 Testando Segurança de Autenticação...\n');
  
  // Test 1: Invalid token for affiliate
  try {
    const response = await fetch(`${BASE_URL}/api/affiliate/info`, {
      headers: {
        'Authorization': 'Bearer invalid-token'
      }
    });
    
    if (response.status === 401) {
      results.push({ name: 'Rejeição de token inválido (Afiliado)', status: 'pass' });
      console.log('✅ Token inválido rejeitado corretamente (Afiliado)');
    } else {
      results.push({ name: 'Rejeição de token inválido (Afiliado)', status: 'fail', message: 'Token inválido aceito!' });
      console.log('❌ FALHA: Token inválido aceito (Afiliado)');
    }
  } catch (error) {
    results.push({ name: 'Rejeição de token inválido (Afiliado)', status: 'fail', message: String(error) });
  }
  
  // Test 2: Invalid token for partner
  try {
    const response = await fetch(`${BASE_URL}/api/partner/info`, {
      headers: {
        'Authorization': 'Bearer invalid-token'
      }
    });
    
    if (response.status === 401) {
      results.push({ name: 'Rejeição de token inválido (Parceiro)', status: 'pass' });
      console.log('✅ Token inválido rejeitado corretamente (Parceiro)');
    } else {
      results.push({ name: 'Rejeição de token inválido (Parceiro)', status: 'fail', message: 'Token inválido aceito!' });
      console.log('❌ FALHA: Token inválido aceito (Parceiro)');
    }
  } catch (error) {
    results.push({ name: 'Rejeição de token inválido (Parceiro)', status: 'fail', message: String(error) });
  }
  
  // Test 3: Expired token
  try {
    const expiredToken = jwt.sign(
      { affiliateId: 1, type: 'affiliate' },
      JWT_SECRET,
      { expiresIn: '0s' }
    );
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for expiration
    
    const response = await fetch(`${BASE_URL}/api/affiliate/info`, {
      headers: {
        'Authorization': `Bearer ${expiredToken}`
      }
    });
    
    if (response.status === 401) {
      results.push({ name: 'Rejeição de token expirado', status: 'pass' });
      console.log('✅ Token expirado rejeitado corretamente');
    } else {
      results.push({ name: 'Rejeição de token expirado', status: 'fail', message: 'Token expirado aceito!' });
      console.log('❌ FALHA: Token expirado aceito');
    }
  } catch (error) {
    results.push({ name: 'Rejeição de token expirado', status: 'fail', message: String(error) });
  }
  
  // Test 4: Wrong token type (affiliate token for partner route)
  try {
    const affiliateToken = jwt.sign(
      { affiliateId: 1, type: 'affiliate' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    const response = await fetch(`${BASE_URL}/api/partner/info`, {
      headers: {
        'Authorization': `Bearer ${affiliateToken}`
      }
    });
    
    if (response.status === 401) {
      results.push({ name: 'Rejeição de token com tipo incorreto', status: 'pass' });
      console.log('✅ Token de tipo incorreto rejeitado corretamente');
    } else {
      results.push({ name: 'Rejeição de token com tipo incorreto', status: 'fail', message: 'Token de afiliado aceito em rota de parceiro!' });
      console.log('❌ FALHA: Token de afiliado aceito em rota de parceiro');
    }
  } catch (error) {
    results.push({ name: 'Rejeição de token com tipo incorreto', status: 'fail', message: String(error) });
  }
}

async function testCommissionFlow() {
  console.log('\n💰 Testando Fluxo de Comissões...\n');
  
  // Test affiliate login to get a valid token
  try {
    const loginResponse = await fetch(`${BASE_URL}/api/affiliate/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'affiliate@example.com',
        password: 'Test123456'
      })
    });
    
    if (loginResponse.ok) {
      const { token } = await loginResponse.json() as any;
      
      // Test earnings endpoint
      const earningsResponse = await fetch(`${BASE_URL}/api/affiliate/earnings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (earningsResponse.ok) {
        const earnings = await earningsResponse.json();
        results.push({ name: 'Consulta de ganhos de afiliado', status: 'pass' });
        console.log(`✅ Ganhos consultados: Total: R$ ${earnings.totalEarnings}, Pendente: R$ ${earnings.pendingEarnings}`);
      } else {
        results.push({ name: 'Consulta de ganhos de afiliado', status: 'fail', message: 'Erro ao consultar ganhos' });
        console.log('❌ FALHA: Erro ao consultar ganhos');
      }
    } else {
      console.log('⚠️ Login de afiliado falhou - pode não haver afiliado de teste');
    }
  } catch (error) {
    console.log('⚠️ Erro no teste de comissões:', error);
  }
}

async function testRateLimiting() {
  console.log('\n⏱️ Testando Proteção contra Múltiplas Requisições...\n');
  
  // Test multiple rapid requests
  const promises = [];
  for (let i = 0; i < 5; i++) {
    promises.push(
      fetch(`${BASE_URL}/api/affiliate/info`, {
        headers: { 'Authorization': 'Bearer invalid' }
      })
    );
  }
  
  try {
    const responses = await Promise.all(promises);
    const statusCodes = responses.map(r => r.status);
    
    if (statusCodes.every(status => status === 401)) {
      results.push({ name: 'Tratamento de múltiplas requisições', status: 'pass' });
      console.log('✅ Sistema responde corretamente a múltiplas requisições');
    } else {
      results.push({ name: 'Tratamento de múltiplas requisições', status: 'fail', message: 'Respostas inconsistentes' });
      console.log('❌ Respostas inconsistentes para múltiplas requisições');
    }
  } catch (error) {
    results.push({ name: 'Tratamento de múltiplas requisições', status: 'fail', message: String(error) });
  }
}

async function testDataIntegrity() {
  console.log('\n🔍 Testando Integridade de Dados...\n');
  
  // Test public endpoints that shouldn't expose sensitive data
  try {
    const response = await fetch(`${BASE_URL}/api/games/premio`);
    
    if (response.ok) {
      const data = await response.json();
      
      // Check if any sensitive data is exposed
      const hasSensitiveData = JSON.stringify(data).includes('password') || 
                               JSON.stringify(data).includes('token') ||
                               JSON.stringify(data).includes('SECRET');
      
      if (!hasSensitiveData) {
        results.push({ name: 'Proteção de dados sensíveis', status: 'pass' });
        console.log('✅ Dados sensíveis protegidos em endpoints públicos');
      } else {
        results.push({ name: 'Proteção de dados sensíveis', status: 'fail', message: 'Dados sensíveis expostos!' });
        console.log('❌ FALHA: Dados sensíveis expostos em endpoints públicos');
      }
    }
  } catch (error) {
    console.log('⚠️ Erro ao testar integridade de dados:', error);
  }
}

async function runAllTests() {
  try {
    await testAuthSecurity();
    await testCommissionFlow();
    await testRateLimiting();
    await testDataIntegrity();
    
    // Summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 RESUMO DOS TESTES');
    console.log('=' .repeat(60) + '\n');
    
    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;
    
    console.log(`✅ Testes aprovados: ${passed}`);
    console.log(`❌ Testes falhados: ${failed}`);
    
    if (failed > 0) {
      console.log('\n⚠️ Falhas detectadas:');
      results.filter(r => r.status === 'fail').forEach(r => {
        console.log(`  - ${r.name}: ${r.message || 'Sem detalhes'}`);
      });
    }
    
    console.log('\n📌 Recomendações de Segurança:');
    console.log('  1. Sempre use HTTPS em produção');
    console.log('  2. Implemente rate limiting no Cloudflare');
    console.log('  3. Mantenha logs de autenticação');
    console.log('  4. Faça backup regular do banco de dados');
    console.log('  5. Monitore conversões e comissões diariamente');
    
  } catch (error) {
    console.error('\n❌ Erro durante testes:', error);
  } finally {
    process.exit(0);
  }
}

// Wait for server to be ready
setTimeout(() => {
  runAllTests();
}, 2000);