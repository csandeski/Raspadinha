import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixPartnerConversions() {
  try {
    console.log('Fixing partner_conversions table...\n');
    
    // Check current columns
    const columnsQuery = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'partner_conversions'
      ORDER BY ordinal_position
    `);
    
    console.log('Current columns in partner_conversions table:');
    console.log('===============================================');
    for (const col of columnsQuery.rows) {
      console.log(`  ${col.column_name}: ${col.data_type}`);
    }
    
    // Check if conversion_type column exists
    const hasConversionType = columnsQuery.rows.some(col => col.column_name === 'conversion_type');
    
    if (!hasConversionType) {
      console.log('\n❌ conversion_type column is missing. Adding it now...');
      await pool.query(`
        ALTER TABLE partner_conversions 
        ADD COLUMN conversion_type VARCHAR(50) DEFAULT 'deposit'
      `);
      console.log('✅ conversion_type column added successfully');
    } else {
      console.log('\n✅ conversion_type column already exists');
    }
    
    console.log('\n✅ Partner conversions table is now ready');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

fixPartnerConversions();