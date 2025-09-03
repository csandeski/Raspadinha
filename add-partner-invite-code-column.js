import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function addPartnerInviteCodeColumn() {
  try {
    // Check if column already exists
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'affiliates' 
      AND column_name = 'partner_invite_code'
    `);
    
    if (checkColumn.rows.length > 0) {
      console.log('✅ Column partner_invite_code already exists');
    } else {
      // Add the column
      await pool.query(`
        ALTER TABLE affiliates 
        ADD COLUMN partner_invite_code VARCHAR(6) UNIQUE
      `);
      console.log('✅ Column partner_invite_code added successfully');
    }
    
    // Show some affiliates with their partner invite codes
    const affiliates = await pool.query(`
      SELECT id, name, email, partner_invite_code 
      FROM affiliates 
      LIMIT 5
    `);
    
    console.log('\nAffiliates:');
    console.log('====================');
    for (const affiliate of affiliates.rows) {
      console.log(`${affiliate.name}: ${affiliate.partner_invite_code || 'NO CODE YET'}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

addPartnerInviteCodeColumn();