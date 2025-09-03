import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixPasswordColumn() {
  try {
    console.log('Fixing password column issue in partners table...\n');
    
    // Since we have both password and password_hash columns, and the code uses 'password',
    // we should drop the password_hash constraint or drop the column entirely
    
    // Option 1: Make password_hash nullable (safest approach)
    console.log('Making password_hash column nullable...');
    await pool.query(`
      ALTER TABLE partners 
      ALTER COLUMN password_hash DROP NOT NULL
    `);
    console.log('✅ password_hash is now nullable');
    
    // Check the structure
    const columnsQuery = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'partners' 
      AND column_name IN ('password', 'password_hash')
      ORDER BY column_name
    `);
    
    console.log('\nPassword columns status:');
    console.log('========================');
    for (const col of columnsQuery.rows) {
      console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    }
    
    console.log('\n✅ Partners table is now ready for registration');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

fixPasswordColumn();