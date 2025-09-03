import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function migratePartnerUsers() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    
    // Update users who have referredBy matching partner codes but no partnerId
    const result = await client.query(`
      UPDATE users 
      SET partner_id = pc.partner_id
      FROM partner_codes pc
      WHERE users.referred_by = pc.code
      AND users.partner_id IS NULL
      RETURNING users.id, users.name, users.referred_by, users.partner_id
    `);
    
    console.log(`\n✅ Migrated ${result.rowCount} users to have correct partnerId`);
    if (result.rows.length > 0) {
      console.table(result.rows);
    }
    
    // Show final status
    const finalCheck = await client.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(partner_id) as users_with_partner_id,
        COUNT(CASE WHEN referred_by IN (SELECT code FROM partner_codes) THEN 1 END) as users_with_partner_code
      FROM users
    `);
    
    console.log('\n=== Final Status ===');
    console.table(finalCheck.rows);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

migratePartnerUsers();
