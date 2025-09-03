import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixRemainingIssues() {
  try {
    console.log('=== FIXING ALL REMAINING DATABASE ISSUES ===\n');
    
    // 1. Fix partner_conversions table - add conversion_value column
    console.log('1. Checking partner_conversions table...');
    const partnerConversionsColumns = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'partner_conversions'
    `);
    
    const hasConversionValue = partnerConversionsColumns.rows.some(col => col.column_name === 'conversion_value');
    
    if (!hasConversionValue) {
      console.log('   ❌ conversion_value column missing. Adding...');
      await pool.query(`
        ALTER TABLE partner_conversions 
        ADD COLUMN conversion_value DECIMAL(10, 2) DEFAULT 0.00
      `);
      console.log('   ✅ conversion_value column added');
    } else {
      console.log('   ✅ conversion_value column already exists');
    }
    
    // 2. Check if user 122 exists and might be causing issues
    console.log('\n2. Checking problematic user 122...');
    const userCheck = await pool.query('SELECT id, name, email FROM users WHERE id = 122');
    
    if (userCheck.rows.length > 0) {
      console.log(`   Found user 122: ${userCheck.rows[0].name} (${userCheck.rows[0].email})`);
      
      // Check if this user has any invalid data
      const walletCheck = await pool.query('SELECT * FROM wallets WHERE user_id = 122');
      if (walletCheck.rows.length === 0) {
        console.log('   ❌ User 122 has no wallet. Creating...');
        await pool.query(`
          INSERT INTO wallets (user_id, balance, bonus_balance) 
          VALUES (122, 0, 0)
          ON CONFLICT (user_id) DO NOTHING
        `);
        console.log('   ✅ Wallet created for user 122');
      }
    } else {
      console.log('   User 122 does not exist (might have been deleted)');
    }
    
    // 3. Check and fix any other missing columns in partner tables
    console.log('\n3. Checking all partner-related tables for completeness...');
    
    // Check partner_clicks table
    const partnerClicksCheck = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name = 'partner_clicks'
    `);
    
    if (partnerClicksCheck.rows.length === 0) {
      console.log('   ❌ partner_clicks table missing. Creating...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS partner_clicks (
          id SERIAL PRIMARY KEY,
          partner_id INTEGER REFERENCES partners(id),
          ip_address VARCHAR(45),
          user_agent TEXT,
          referrer TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('   ✅ partner_clicks table created');
    } else {
      console.log('   ✅ partner_clicks table exists');
    }
    
    // 4. Clean up any orphaned records
    console.log('\n4. Cleaning up orphaned records...');
    
    // Remove partner conversions with non-existent partners
    const orphanedConversions = await pool.query(`
      DELETE FROM partner_conversions 
      WHERE partner_id NOT IN (SELECT id FROM partners)
      RETURNING id
    `);
    
    if (orphanedConversions.rows.length > 0) {
      console.log(`   ✅ Removed ${orphanedConversions.rows.length} orphaned partner conversions`);
    } else {
      console.log('   ✅ No orphaned partner conversions found');
    }
    
    // 5. Ensure all partners have wallets
    console.log('\n5. Ensuring all partners have wallets...');
    const partnersWithoutWallets = await pool.query(`
      SELECT p.id, p.name 
      FROM partners p 
      LEFT JOIN partners_wallet pw ON p.id = pw.partner_id 
      WHERE pw.id IS NULL
    `);
    
    if (partnersWithoutWallets.rows.length > 0) {
      for (const partner of partnersWithoutWallets.rows) {
        await pool.query(`
          INSERT INTO partners_wallet (
            partner_id, balance, pending_balance, 
            total_earned, total_withdrawn, 
            created_at, updated_at
          ) VALUES ($1, 0, 0, 0, 0, NOW(), NOW())
        `, [partner.id]);
        console.log(`   ✅ Created wallet for partner: ${partner.name}`);
      }
    } else {
      console.log('   ✅ All partners have wallets');
    }
    
    // 6. Add indexes for performance
    console.log('\n6. Optimizing database performance...');
    
    // Add index on partner_conversions if not exists
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_partner_conversions_partner_id 
      ON partner_conversions(partner_id)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_partner_conversions_user_id 
      ON partner_conversions(user_id)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_partners_affiliate_id 
      ON partners(affiliate_id)
    `);
    
    console.log('   ✅ Database indexes optimized');
    
    console.log('\n=== ALL ISSUES FIXED SUCCESSFULLY ===');
    
    // Show summary
    const partnerCount = await pool.query('SELECT COUNT(*) FROM partners');
    const affiliateCount = await pool.query('SELECT COUNT(*) FROM affiliates');
    const conversionCount = await pool.query('SELECT COUNT(*) FROM partner_conversions');
    
    console.log('\n📊 System Status:');
    console.log(`   • Total Affiliates: ${affiliateCount.rows[0].count}`);
    console.log(`   • Total Partners: ${partnerCount.rows[0].count}`);
    console.log(`   • Total Conversions: ${conversionCount.rows[0].count}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

fixRemainingIssues();