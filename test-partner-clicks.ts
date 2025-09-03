async function testPartnerClicks() {
  try {
    console.log('Testing partner click tracking...\n');
    
    // Test clicking on a partner code
    const clickResponse = await fetch('http://localhost:5000/api/partner/track-click', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code: 'NOVOSIM',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test',
        referrer: 'https://google.com'
      })
    });
    
    console.log('Click tracking response:', clickResponse.status);
    const clickData = await clickResponse.json();
    console.log('Response data:', clickData);
    
    // Login as partner to check the updated stats
    const loginResponse = await fetch('http://localhost:5000/api/partner/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'parceiro.master@example.com',
        password: 'master123'
      })
    });
    
    const loginData = await loginResponse.json();
    if (loginData.success) {
      const token = loginData.token;
      
      // Get codes to see updated click count
      const codesResponse = await fetch('http://localhost:5000/api/partner/codes', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const codes = await codesResponse.json();
      console.log('\nPartner codes after click:');
      codes.forEach((code: any) => {
        console.log(`- Code: ${code.code}, Clicks: ${code.clickCount}`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

testPartnerClicks();
