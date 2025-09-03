import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';
import bcrypt from 'bcrypt';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function resetAffiliatePassword() {
  try {
    // Hash the password
    const password = 'teste123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update affiliate passwords
    const result = await pool.query(
      `UPDATE affiliates 
       SET password = $1 
       WHERE email IN ('teste@afiliado.com', 'teste2@afiliado.com')
       RETURNING id, email`,
      [hashedPassword]
    );
    
    console.log('Updated affiliates:', result.rows);
    
    // Verify the password works
    const affiliate = await pool.query(
      'SELECT * FROM affiliates WHERE email = $1',
      ['teste2@afiliado.com']
    );
    
    if (affiliate.rows[0]) {
      const isValid = await bcrypt.compare(password, affiliate.rows[0].password);
      console.log('Password verification:', isValid);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

resetAffiliatePassword();
