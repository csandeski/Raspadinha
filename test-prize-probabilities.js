import fetch from 'node-fetch';

// Função para testar GET de probabilidades
async function testGetProbabilities() {
  console.log('📝 Testando GET /api/admin/prize-probabilities/pix');
  
  try {
    const response = await fetch('http://localhost:5000/api/admin/prize-probabilities/pix', {
      headers: {
        'Authorization': 'Bearer admin-session-test'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('\n✅ Resposta recebida:');
      console.log(JSON.stringify(data.slice(0, 3), null, 2));
      
      // Verificar se há "TESTE" nos valores
      const hasTestString = data.some(item => 
        item.prize_name && item.prize_name.includes('TESTE')
      );
      
      if (hasTestString) {
        console.log('\n❌ PROBLEMA ENCONTRADO: Valores contêm "TESTE"');
        const problematicItems = data.filter(item => 
          item.prize_name && item.prize_name.includes('TESTE')
        );
        console.log('Itens problemáticos:', problematicItems);
      } else {
        console.log('\n✅ Nenhum "TESTE" encontrado nos valores');
      }
    } else {
      console.log(`❌ Erro HTTP: ${response.status} - ${response.statusText}`);
      const errorText = await response.text();
      console.log('Resposta:', errorText);
    }
  } catch (error) {
    console.log('❌ Erro na requisição:', error.message);
  }
}

// Função para testar POST de probabilidades
async function testUpdateProbabilities() {
  console.log('\n📝 Testando POST /api/admin/prize-probabilities/pix');
  
  const testData = {
    prizes: [
      { prizeValue: '0.5', prizeName: 'R$ 0,50', probability: 30 },
      { prizeValue: '1', prizeName: 'R$ 1,00', probability: 25 },
      { prizeValue: '2', prizeName: 'R$ 2,00', probability: 20 }
    ]
  };
  
  try {
    const response = await fetch('http://localhost:5000/api/admin/prize-probabilities/pix', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer admin-session-test'
      },
      body: JSON.stringify(testData)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Atualização bem sucedida:', data);
    } else {
      console.log(`❌ Erro HTTP: ${response.status} - ${response.statusText}`);
      const errorText = await response.text();
      console.log('Resposta:', errorText);
    }
  } catch (error) {
    console.log('❌ Erro na requisição:', error.message);
  }
}

// Executar testes
async function runTests() {
  console.log('🔧 Iniciando testes do sistema de probabilidades\n');
  console.log('=' .repeat(50));
  
  await testGetProbabilities();
  
  console.log('\n' + '=' .repeat(50));
  
  await testUpdateProbabilities();
  
  console.log('\n' + '=' .repeat(50));
  console.log('✅ Testes concluídos');
}

runTests();