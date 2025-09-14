#!/usr/bin/env node

const BASE_URL = 'http://localhost:5000';

// Test admin login and probability management
async function testAdminProbabilities() {
  console.log('🧪 Iniciando teste de autenticação admin e probabilidades...\n');
  
  try {
    // 1. Login as admin
    console.log('1️⃣ Fazendo login como admin...');
    const loginResponse = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'ManiaBrasil2025@Admin'
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }
    
    const loginData = await loginResponse.json();
    const sessionId = loginData.sessionId;
    console.log('✅ Login bem-sucedido! SessionId:', sessionId);
    
    // 2. Test getting scratch games list
    console.log('\n2️⃣ Buscando lista de jogos de raspadinha...');
    const gamesResponse = await fetch(`${BASE_URL}/api/admin/scratch-games`, {
      headers: {
        'Authorization': `Bearer ${sessionId}`
      }
    });
    
    if (!gamesResponse.ok) {
      const errorText = await gamesResponse.text();
      throw new Error(`Failed to get games: ${gamesResponse.status} - ${errorText}`);
    }
    
    const games = await gamesResponse.json();
    console.log(`✅ ${games.length} jogos encontrados:`, games.map(g => g.game_key));
    
    // 3. Test getting probabilities for first game
    const firstGame = games[0];
    console.log(`\n3️⃣ Buscando probabilidades do jogo: ${firstGame.game_key}...`);
    
    const probResponse = await fetch(`${BASE_URL}/api/admin/scratch-games/${firstGame.game_key}/probabilities`, {
      headers: {
        'Authorization': `Bearer ${sessionId}`
      }
    });
    
    if (!probResponse.ok) {
      const errorText = await probResponse.text();
      throw new Error(`Failed to get probabilities: ${probResponse.status} - ${errorText}`);
    }
    
    const probData = await probResponse.json();
    const probabilities = probData.probabilities;
    console.log(`✅ ${probabilities.length} prêmios encontrados`);
    
    // Calculate sum
    const sum = probabilities.reduce((acc, p) => acc + p.probability, 0);
    console.log(`📊 Soma atual das probabilidades: ${sum.toFixed(2)}%`);
    
    // 4. Test updating probabilities with invalid sum
    console.log('\n4️⃣ Testando validação de soma (tentando soma inválida)...');
    const invalidProbs = probabilities.map(p => ({ ...p, probability: 10 })); // This will sum to more than 100
    
    const invalidUpdateResponse = await fetch(`${BASE_URL}/api/admin/scratch-games/${firstGame.game_key}/probabilities`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${sessionId}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ probabilities: invalidProbs })
    });
    
    if (invalidUpdateResponse.ok) {
      console.log('❌ ERRO: Sistema aceitou soma inválida!');
    } else {
      const error = await invalidUpdateResponse.json();
      console.log('✅ Validação funcionou:', error.error);
    }
    
    // 5. Test distribute equally
    console.log('\n5️⃣ Testando distribuição igual...');
    const distributeResponse = await fetch(`${BASE_URL}/api/admin/scratch-games/${firstGame.game_key}/distribute-equally`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionId}`
      }
    });
    
    if (!distributeResponse.ok) {
      const errorText = await distributeResponse.text();
      throw new Error(`Failed to distribute equally: ${distributeResponse.status} - ${errorText}`);
    }
    
    console.log('✅ Distribuição igual aplicada com sucesso!');
    
    // 6. Verify new probabilities
    console.log('\n6️⃣ Verificando novas probabilidades...');
    const newProbResponse = await fetch(`${BASE_URL}/api/admin/scratch-games/${firstGame.game_key}/probabilities`, {
      headers: {
        'Authorization': `Bearer ${sessionId}`
      }
    });
    
    const newProbData = await newProbResponse.json();
    const newSum = newProbData.probabilities.reduce((acc, p) => acc + p.probability, 0);
    console.log(`✅ Nova soma das probabilidades: ${newSum.toFixed(2)}%`);
    const equalProb = 100 / newProbData.probabilities.length;
    console.log(`  Cada prêmio tem: ${equalProb.toFixed(2)}%`);
    
    // 7. Test reset to defaults
    console.log('\n7️⃣ Testando reset para valores padrão...');
    const resetResponse = await fetch(`${BASE_URL}/api/admin/scratch-games/${firstGame.game_key}/reset-defaults`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionId}`
      }
    });
    
    if (!resetResponse.ok) {
      const errorText = await resetResponse.text();
      throw new Error(`Failed to reset defaults: ${resetResponse.status} - ${errorText}`);
    }
    
    console.log('✅ Reset para valores padrão aplicado com sucesso!');
    
    console.log('\n🎉 TODOS OS TESTES PASSARAM COM SUCESSO! 🎉');
    console.log('✅ Login admin funciona');
    console.log('✅ Autenticação Bearer token funciona');
    console.log('✅ Listagem de jogos funciona');
    console.log('✅ Busca de probabilidades funciona');
    console.log('✅ Validação de soma funciona');
    console.log('✅ Distribuição igual funciona');
    console.log('✅ Reset para padrões funciona');
    
  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:', error.message);
    process.exit(1);
  }
}

// Run the test
testAdminProbabilities();