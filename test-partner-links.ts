import { db } from './server/db';

async function testPartnerLinks() {
  try {
    const token = 'your_token_here'; // You'll need a real token
    
    // Login first to get token
    const loginResponse = await fetch('http://localhost:5000/api/partner/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'parceiro.teste@example.com',
        password: 'teste123'
      })
    });
    
    if (loginResponse.ok) {
      const data = await loginResponse.json();
      console.log('Login successful, testing links endpoint...');
      
      // Test get links
      const linksResponse = await fetch('http://localhost:5000/api/partner/links', {
        headers: {
          'Authorization': `Bearer ${data.token}`
        }
      });
      
      if (linksResponse.ok) {
        const links = await linksResponse.json();
        console.log('Links response:', JSON.stringify(links, null, 2));
      } else {
        console.log('Links error:', await linksResponse.text());
      }
    } else {
      console.log('Login failed:', await loginResponse.text());
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

testPartnerLinks();
