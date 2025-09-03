async function testPartnerLinksDelete() {
  try {
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
      console.log('Login successful');
      
      // Test get links
      const linksResponse = await fetch('http://localhost:5000/api/partner/links', {
        headers: {
          'Authorization': `Bearer ${data.token}`
        }
      });
      
      if (linksResponse.ok) {
        const linksData = await linksResponse.json();
        console.log('Links retrieved:', linksData.links.length);
        
        // Create a test code to delete
        const createResponse = await fetch('http://localhost:5000/api/partner/links', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${data.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            code: 'TESTDEL',
            name: 'Test Delete Code'
          })
        });
        
        if (createResponse.ok) {
          const createData = await createResponse.json();
          console.log('Created test code:', createData.link);
          
          // Now delete it
          const deleteResponse = await fetch(`http://localhost:5000/api/partner/links/${createData.link.id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${data.token}`
            }
          });
          
          console.log('Delete response status:', deleteResponse.status);
          console.log('Delete response content-type:', deleteResponse.headers.get('content-type'));
          
          if (deleteResponse.ok) {
            const deleteData = await deleteResponse.json();
            console.log('Delete successful:', deleteData);
          } else {
            const errorText = await deleteResponse.text();
            console.log('Delete failed:', errorText);
          }
        } else {
          console.log('Create failed:', await createResponse.text());
        }
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

testPartnerLinksDelete();
