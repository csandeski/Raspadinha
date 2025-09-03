import pg from 'pg';
import bcrypt from 'bcrypt';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function updateAdminCredentials() {
  try {
    // New credentials
    const username = 'admin#@#@d54dsa546645';
    const password = '44D4%GDS4F44245Ddsd*RR$#!331fgyh65';
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update or insert admin credentials
    const result = await pool.query(`
      INSERT INTO admin_users (username, password)
      VALUES ($1, $2)
      ON CONFLICT (username)
      DO UPDATE SET password = $2
      RETURNING *
    `, [username, hashedPassword]);
    
    console.log('✓ Admin credentials updated successfully!');
    console.log('Username:', username);
    console.log('Password:', password);
    console.log('Hashed:', hashedPassword);
    
  } catch (error) {
    console.error('Error updating admin credentials:', error.message);
  } finally {
    pool.end();
  }
}

updateAdminCredentials();
