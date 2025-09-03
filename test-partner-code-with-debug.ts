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
    console.log('Login success:', loginData.success);
    console.log('Partner from login:', loginData.partner);
    
    if (loginData.success) {
      const token = loginData.token;
      
      // Create a test code with unique name
      const timestamp = Date.now();
      const createResponse = await fetch('http://localhost:5000/api/partner/codes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: `TEST${timestamp}`.substring(0, 15),
          name: 'Test Code Debug'
        })
      });
      
      console.log('Create status:', createResponse.status);
      const createData = await createResponse.json();
      console.log('Create response:', createData);
      
      // Check if it was actually saved
      const { exec } = require('child_process');
      exec('npx tsx -e "import { db } from \'./server/db\'; import { partnerCodes } from \'./shared/schema\'; db.select().from(partnerCodes).orderBy(partnerCodes.id).then(codes => console.log(\'Codes in DB:\', codes.length));"', (error, stdout) => {
        if (!error) console.log(stdout);
        process.exit(0);
      });
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testPartnerCodeAPI();
