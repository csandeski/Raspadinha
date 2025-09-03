async function testPartnerCode() {
  try {
    // Login first
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
    console.log('Login successful:', loginData.success);
    
    if (loginData.success) {
      const token = loginData.token;
      
      // Create a test code
      const timestamp = Date.now();
      const testCode = `FIXED${timestamp}`.substring(0, 15);
      
      const createResponse = await fetch('http://localhost:5000/api/partner/codes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: testCode,
          name: 'Test After Fix'
        })
      });
      
      console.log('Create status:', createResponse.status);
      const createData = await createResponse.json();
      console.log('Create response:', JSON.stringify(createData, null, 2));
      
      // List all codes
      const listResponse = await fetch('http://localhost:5000/api/partner/codes', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const listData = await listResponse.json();
      console.log('Total codes for this partner:', listData.length);
      listData.forEach((code: any) => {
        console.log(`- ID: ${code.id}, Code: ${code.code}`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

testPartnerCode();
