async function testPartnerCodeAPI() {
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
    console.log('Login response:', loginData.success ? 'Success' : 'Failed');
    console.log('Partner ID from token:', loginData.partner?.id);
    
    if (loginData.success) {
      const token = loginData.token;
      
      // Create a test code
      const createResponse = await fetch('http://localhost:5000/api/partner/codes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: 'TESTAPICODE',
          name: 'Test via API Script'
        })
      });
      
      console.log('Create status:', createResponse.status);
      const createData = await createResponse.json();
      console.log('Create response:', createData);
    }
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

testPartnerCodeAPI();
