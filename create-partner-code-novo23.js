// Create NOVO23 partner code via API
import fetch from 'node-fetch';

async function createNOVO23() {
  console.log('🔧 Criando código NOVO23 para parceiros...\n');
  
  try {
    // First login as partner
    console.log('1️⃣ Fazendo login como parceiro...');
    const loginResponse = await fetch('http://localhost:5000/api/partner/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'parceiro@teste.com',
        password: 'senha123'
      })
    });
    
    const loginData = await loginResponse.json();
    
    if (!loginResponse.ok) {
      console.log('❌ Login falhou, tentando com parceiro2...');
      
      // Try another partner
      const login2Response = await fetch('http://localhost:5000/api/partner/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'parceiro2@teste.com',
          password: 'senha123'
        })
      });
      
      const login2Data = await login2Response.json();
      
      if (!login2Response.ok) {
        console.log('❌ Nenhum parceiro conseguiu fazer login');
        console.log('   Erro:', login2Data.error || login2Data.message);
        
        // Try to list partners to see what exists
        console.log('\n2️⃣ Tentando listar parceiros existentes...');
        const adminLoginResponse = await fetch('http://localhost:5000/api/admin/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: 'admin',
            password: 'admin123'
          })
        });
        
        if (adminLoginResponse.ok) {
          const adminData = await adminLoginResponse.json();
          const adminToken = adminData.sessionId;
          
          const partnersResponse = await fetch('http://localhost:5000/api/admin/partners', {
            headers: {
              'Authorization': `Bearer ${adminToken}`
            }
          });
          
          if (partnersResponse.ok) {
            const partners = await partnersResponse.json();
            console.log('   Parceiros encontrados:', partners.length);
            if (partners.length > 0) {
              console.log('   Primeiro parceiro:', partners[0]);
            }
          }
        }
        return;
      }
      
      loginData.token = login2Data.token;
    }
    
    const token = loginData.token;
    console.log('✅ Login realizado com sucesso!');
    
    // Check existing codes
    console.log('\n2️⃣ Verificando códigos existentes...');
    const codesResponse = await fetch('http://localhost:5000/api/partner/codes', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (codesResponse.ok) {
      const codes = await codesResponse.json();
      console.log('   Códigos existentes:', codes.length);
      
      const novo23Exists = codes.some(c => c.code === 'NOVO23');
      if (novo23Exists) {
        console.log('✅ Código NOVO23 já existe!');
        return;
      }
    }
    
    // Create NOVO23 code
    console.log('\n3️⃣ Criando código NOVO23...');
    const createResponse = await fetch('http://localhost:5000/api/partner/codes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        code: 'NOVO23',
        name: 'Código Promocional Novembro 2023'
      })
    });
    
    if (createResponse.ok) {
      const newCode = await createResponse.json();
      console.log('✅ Código NOVO23 criado com sucesso!');
      console.log('   Detalhes:', newCode);
    } else {
      const error = await createResponse.json();
      console.log('❌ Erro ao criar código:', error.error || error.message);
    }
    
    // Test validation
    console.log('\n4️⃣ Testando validação do código NOVO23...');
    const validateResponse = await fetch('http://localhost:5000/api/referrals/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        referralCode: 'NOVO23'
      })
    });
    
    const validateData = await validateResponse.json();
    if (validateResponse.ok && validateData.valid) {
      console.log('✅ Código NOVO23 validado com sucesso!');
      console.log('   Nome do referente:', validateData.referrerName);
    } else {
      console.log('❌ Código ainda não está sendo validado');
      console.log('   Resposta:', validateData);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

createNOVO23();
