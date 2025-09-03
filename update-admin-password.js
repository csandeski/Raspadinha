import pg from 'pg';
import bcrypt from 'bcrypt';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function updateAdminPassword() {
  try {
    // New credentials
    const username = 'admin#@#@d54dsa546645';
    const password = 'ManiaBrasil24542134842564';
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update admin password
    const result = await pool.query(`
      UPDATE admin_users 
      SET password = $1
      WHERE username = $2
      RETURNING *
    `, [hashedPassword, username]);
    
    console.log('✓ Admin password updated successfully!');
    console.log('Username:', username);
    console.log('New Password:', password);
    
  } catch (error) {
    console.error('Error updating admin password:', error.message);
  } finally {
    pool.end();
  }
}

updateAdminPassword();
