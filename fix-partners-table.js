import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixPartnersTable() {
  try {
    // Check current columns in partners table
    const columnsQuery = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'partners'
      ORDER BY ordinal_position
    `);
    
    console.log('Current columns in partners table:');
    console.log('====================================');
    for (const col of columnsQuery.rows) {
      console.log(`  ${col.column_name}: ${col.data_type}`);
    }
    
    // Check if password column exists
    const hasPassword = columnsQuery.rows.some(col => col.column_name === 'password');
    
    if (!hasPassword) {
      console.log('\n❌ Password column is missing. Adding it now...');
      await pool.query(`
        ALTER TABLE partners 
        ADD COLUMN password VARCHAR(255) NOT NULL DEFAULT 'temp_password'
      `);
      
      // Remove the default after adding
      await pool.query(`
        ALTER TABLE partners 
        ALTER COLUMN password DROP DEFAULT
      `);
      
      console.log('✅ Password column added successfully');
    } else {
      console.log('\n✅ Password column already exists');
    }
    
    // Check if pending_earnings column exists
    const hasPendingEarnings = columnsQuery.rows.some(col => col.column_name === 'pending_earnings');
    
    if (!hasPendingEarnings) {
      console.log('\n❌ pending_earnings column is missing. Adding it now...');
      await pool.query(`
        ALTER TABLE partners 
        ADD COLUMN pending_earnings DECIMAL(10, 2) DEFAULT 0.00
      `);
      console.log('✅ pending_earnings column added successfully');
    } else {
      console.log('\n✅ pending_earnings column already exists');
    }
    
    // Check if approved_earnings column exists
    const hasApprovedEarnings = columnsQuery.rows.some(col => col.column_name === 'approved_earnings');
    
    if (!hasApprovedEarnings) {
      console.log('\n❌ approved_earnings column is missing. Adding it now...');
      await pool.query(`
        ALTER TABLE partners 
        ADD COLUMN approved_earnings DECIMAL(10, 2) DEFAULT 0.00
      `);
      console.log('✅ approved_earnings column added successfully');
    } else {
      console.log('\n✅ approved_earnings column already exists');
    }
    
    // Check if remember_token column exists
    const hasRememberToken = columnsQuery.rows.some(col => col.column_name === 'remember_token');
    
    if (!hasRememberToken) {
      console.log('\n❌ remember_token column is missing. Adding it now...');
      await pool.query(`
        ALTER TABLE partners 
        ADD COLUMN remember_token VARCHAR(255)
      `);
      console.log('✅ remember_token column added successfully');
    } else {
      console.log('\n✅ remember_token column already exists');
    }
    
    // Verify the structure
    const finalCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'partners' 
      AND column_name = 'password'
    `);
    
    if (finalCheck.rows.length > 0) {
      console.log('\n✅ Partners table is now ready for registration');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

fixPartnersTable();