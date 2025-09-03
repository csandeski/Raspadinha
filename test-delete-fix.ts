async function testDelete() {
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
    console.log('Login response:', loginData);
    
    if (loginData.success) {
      const token = loginData.token;
      
      // Get current links
      const linksResponse = await fetch('http://localhost:5000/api/partner/links', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const linksData = await linksResponse.json();
      console.log('Current links:', linksData.links?.length || 0);
      
      // Find a code to delete (not the main one)
      const codeToDelete = linksData.links?.find((link: any) => !link.id.toString().startsWith('main'));
      
      if (codeToDelete) {
        console.log('Attempting to delete code:', codeToDelete.id, codeToDelete.code);
        
        const deleteResponse = await fetch(`http://localhost:5000/api/partner/links/${codeToDelete.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('Delete status:', deleteResponse.status);
        console.log('Content-Type:', deleteResponse.headers.get('content-type'));
        
        const deleteResult = await deleteResponse.text();
        console.log('Delete response:', deleteResult);
      } else {
        console.log('No code found to delete');
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

testDelete();
