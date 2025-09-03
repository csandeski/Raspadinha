async function testPartnerClicksFixed() {
  try {
    console.log('Testing fixed partner click tracking...\n');
    
    // Test tracking a click on NOVOSIM code
    const clickResponse = await fetch('http://localhost:5000/api/partner/track-click', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code: 'NOVOSIM',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Browser',
        referrer: 'https://google.com'
      })
    });
    
    console.log('Click tracking response:', clickResponse.status);
    if (clickResponse.ok) {
      const clickData = await clickResponse.json();
      console.log('✓ Click tracked successfully:', clickData);
    } else {
      const error = await clickResponse.json();
      console.log('❌ Error:', error);
    }
    
    // Login as partner to verify updated stats
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
      console.log('\n📊 Partner codes after click:');
      codes.forEach((code: any) => {
        console.log(`  Code: ${code.code} | Clicks: ${code.clickCount} | Registrations: ${code.totalRegistrations}`);
      });
    }
    
    // Also check the database directly
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    
    const dbQuery = `
      import { db } from './server/db';
      import { partnerCodes } from './shared/schema';
      import { eq } from 'drizzle-orm';
      
      db.select()
        .from(partnerCodes)
        .where(eq(partnerCodes.code, 'NOVOSIM'))
        .then(codes => {
          if (codes.length > 0) {
            console.log('\\n📈 Database verification:');
            console.log('  Code:', codes[0].code, '| Click Count:', codes[0].clickCount);
          }
          process.exit(0);
        });
    `;
    
    await execPromise(`npx tsx -e "${dbQuery}"`);
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

testPartnerClicksFixed();
