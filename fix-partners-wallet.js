import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixPartnersWallet() {
  try {
    console.log('Fixing partners_wallet table...\n');
    
    // Check current columns
    const columnsQuery = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'partners_wallet'
      ORDER BY ordinal_position
    `);
    
    console.log('Current columns in partners_wallet table:');
    console.log('==========================================');
    for (const col of columnsQuery.rows) {
      console.log(`  ${col.column_name}: ${col.data_type}`);
    }
    
    // Check if last_transaction_at column exists
    const hasLastTransaction = columnsQuery.rows.some(col => col.column_name === 'last_transaction_at');
    
    if (!hasLastTransaction) {
      console.log('\n❌ last_transaction_at column is missing. Adding it now...');
      await pool.query(`
        ALTER TABLE partners_wallet 
        ADD COLUMN last_transaction_at TIMESTAMP
      `);
      console.log('✅ last_transaction_at column added successfully');
    } else {
      console.log('\n✅ last_transaction_at column already exists');
    }
    
    // Check if created_at column exists
    const hasCreatedAt = columnsQuery.rows.some(col => col.column_name === 'created_at');
    
    if (!hasCreatedAt) {
      console.log('\n❌ created_at column is missing. Adding it now...');
      await pool.query(`
        ALTER TABLE partners_wallet 
        ADD COLUMN created_at TIMESTAMP DEFAULT NOW()
      `);
      console.log('✅ created_at column added successfully');
    } else {
      console.log('\n✅ created_at column already exists');
    }
    
    console.log('\n✅ Partners wallet table is now ready');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

fixPartnersWallet();