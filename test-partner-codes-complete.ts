async function testPartnerCodesComplete() {
  try {
    // Login as partner
    const loginResponse = await fetch('http://localhost:5000/api/partner/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'parceiro.teste@example.com',
        password: 'teste123'
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('✓ Login successful');
    
    if (loginData.success) {
      const token = loginData.token;
      
      // 1. Get current codes
      const listResponse = await fetch('http://localhost:5000/api/partner/codes', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const currentCodes = await listResponse.json();
      console.log('\n📋 Current codes for partner:');
      currentCodes.forEach((code: any) => {
        console.log(`  - ID: ${code.id}, Code: ${code.code}, Name: ${code.name}`);
      });
      
      // 2. Create a new code
      const timestamp = Date.now();
      const newCode = `WORKING${timestamp}`.substring(0, 15);
      
      const createResponse = await fetch('http://localhost:5000/api/partner/codes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: newCode,
          name: 'Sistema Funcionando!'
        })
      });
      
      const createData = await createResponse.json();
      if (createData.success) {
        console.log(`\n✓ New code created: ${createData.code.code} (ID: ${createData.code.id})`);
      }
      
      // 3. Get updated list
      const updatedListResponse = await fetch('http://localhost:5000/api/partner/codes', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const updatedCodes = await updatedListResponse.json();
      console.log('\n📋 Updated codes list:');
      updatedCodes.forEach((code: any) => {
        console.log(`  - ID: ${code.id}, Code: ${code.code}, Clicks: ${code.clickCount}`);
      });
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
  process.exit(0);
}

testPartnerCodesComplete();
