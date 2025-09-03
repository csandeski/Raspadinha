const { Client } = require('pg');

async function setupNetworkTest() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    await client.connect();
    console.log('Conectado ao banco de dados...\n');
    
    // Update user 76 to have affiliate code TESTE2025
    const updateResult = await client.query(
      "UPDATE users SET affiliate_code = 'TESTE2025' WHERE id = 76"
    );
    
    console.log(`✅ Usuário ID 76 atualizado com código TESTE2025 (${updateResult.rowCount} linha atualizada)\n`);
    
    // Update affiliate_codes statistics
    const statsResult = await client.query(
      "UPDATE affiliate_codes SET total_registrations = 1, total_deposits = 16 WHERE code = 'TESTE2025'"
    );
    
    console.log(`✅ Estatísticas do código TESTE2025 atualizadas (${statsResult.rowCount} linha atualizada)\n`);
    
    // Verify the update
    const userResult = await client.query(
      "SELECT id, name, affiliate_code, created_at FROM users WHERE id = 76"
    );
    
    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      console.log('Verificação:');
      console.log(`- Usuário: ${user.name}`);
      console.log(`- Código de afiliado: ${user.affiliate_code}`);
      console.log(`- Data de cadastro: ${new Date(user.created_at).toLocaleString('pt-BR')}`);
    }
    
    console.log('\n✅ Dados de teste configurados com sucesso!');
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await client.end();
  }
}

setupNetworkTest();
