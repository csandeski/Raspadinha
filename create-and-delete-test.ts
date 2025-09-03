async function testCreateAndDelete() {
  try {
    // Login to get token
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
    
    if (loginData.success) {
      const token = loginData.token;
      console.log('✓ Login successful');
      
      // Create a test code
      const createResponse = await fetch('http://localhost:5000/api/partner/links', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: 'TESTDEL123',
          name: 'Código para Teste de Delete'
        })
      });
      
      console.log('Create status:', createResponse.status);
      
      if (createResponse.ok) {
        const createData = await createResponse.json();
        console.log('✓ Code created successfully:', createData.link);
        
        // Now try to delete it
        const deleteUrl = `http://localhost:5000/api/partner/links/${createData.link.id}`;
        console.log('Attempting to delete at:', deleteUrl);
        
        const deleteResponse = await fetch(deleteUrl, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('Delete status:', deleteResponse.status);
        console.log('Delete Content-Type:', deleteResponse.headers.get('content-type'));
        
        const deleteText = await deleteResponse.text();
        console.log('Delete response body:', deleteText);
        
        try {
          const deleteData = JSON.parse(deleteText);
          if (deleteData.success) {
            console.log('✓ Code deleted successfully');
          } else {
            console.log('✗ Delete failed:', deleteData.error);
          }
        } catch (e) {
          console.log('✗ Response is not valid JSON');
        }
      } else {
        const errorText = await createResponse.text();
        console.log('✗ Create failed:', errorText);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

testCreateAndDelete();
