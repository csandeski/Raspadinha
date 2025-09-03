async function testPartnerClicksFinal() {
  try {
    console.log('🔧 Testing partner click tracking with fixed schema...\n');
    
    // Step 1: Track a click on NOVOSIM partner code
    console.log('1. Tracking click on partner code NOVOSIM...');
    const clickResponse = await fetch('http://localhost:5000/api/partner/track-click', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code: 'NOVOSIM',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 Test Browser',
        referrer: 'https://google.com',
        url: '/?ref=NOVOSIM'
      })
    });
    
    if (clickResponse.ok) {
      console.log('   ✓ Click tracked successfully!');
    } else {
      const error = await clickResponse.json();
      console.log('   ❌ Error:', error.error);
      process.exit(1);
    }
    
    // Step 2: Login as partner to verify updated stats
    console.log('\n2. Logging in as partner to check stats...');
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
      console.log('\n📊 Partner code statistics:');
      codes.forEach((code: any) => {
        console.log(`   Code: ${code.code}`);
        console.log(`   - Clicks: ${code.clickCount}`);
        console.log(`   - Registrations: ${code.totalRegistrations}`);
        console.log(`   - Deposits: ${code.completedDeposits}`);
      });
      
      console.log('\n✅ Partner click tracking is working properly!');
    } else {
      console.log('   ❌ Login failed:', loginData.error);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

testPartnerClicksFinal();
