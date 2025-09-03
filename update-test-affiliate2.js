import bcrypt from 'bcrypt';
import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function updateTestAffiliate() {
  try {
    await client.connect();
    
    const hashedPassword = await bcrypt.hash('teste123', 10);
    
    // First check if the affiliate exists
    const checkQuery = `SELECT * FROM affiliates WHERE email = $1`;
    const checkResult = await client.query(checkQuery, ['teste2@afiliado.com']);
    
    if (checkResult.rows.length > 0) {
      // Update existing affiliate
      const updateQuery = `
        UPDATE affiliates 
        SET password = $1
        WHERE email = $2
        RETURNING *;
      `;
      const result = await client.query(updateQuery, [hashedPassword, 'teste2@afiliado.com']);
      console.log('Test affiliate updated:', result.rows[0]);
    } else {
      console.log('Affiliate teste2@afiliado.com not found, creating new one');
      // Try to create a new one with a unique cpf_cnpj
      const insertQuery = `
        INSERT INTO affiliates (name, email, phone, password, code, cpf_cnpj, approved_earnings, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING *;
      `;
      
      const values = [
        'Teste Afiliado',
        'teste2@afiliado.com',
        '(11) 99999-9999',
        hashedPassword,
        'TESTE2_CODE',
        '12345678901', // unique CPF
        0
      ];
      
      const result = await client.query(insertQuery, values);
      console.log('Test affiliate created:', result.rows[0]);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

updateTestAffiliate();
