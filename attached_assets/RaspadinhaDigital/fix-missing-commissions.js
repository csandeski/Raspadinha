import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fixMissingCommissions() {
  try {
    console.log("=== Processing Missing Commissions ===\n");
    
    // Get all deposits from users with affiliates
    const deposits = await pool.query(`
      SELECT 
        d.*,
        u.affiliate_id,
        u.name as user_name
      FROM deposits d
      JOIN users u ON d.user_id = u.id
      WHERE u.affiliate_id IS NOT NULL
      ORDER BY d.created_at DESC
    `);
    
    console.log(`Found ${deposits.rows.length} deposits from users with affiliates\n`);
    
    let created = 0;
    let skipped = 0;
    
    for (const deposit of deposits.rows) {
      // Check if commission already exists
      const existing = await pool.query(`
        SELECT id 
        FROM affiliate_conversions 
        WHERE user_id = $1 
        AND conversion_value = $2
        AND conversion_type = 'deposit'
        AND DATE(created_at) = DATE($3)
      `, [deposit.user_id, deposit.amount, deposit.created_at]);
      
      if (existing.rows.length > 0) {
        console.log(`✓ Commission exists for deposit ${deposit.id} (${deposit.user_name}: R$ ${deposit.amount})`);
        skipped++;
        continue;
      }
      
      // Get affiliate commission rate
      const affiliate = await pool.query(`
        SELECT commission_rate, name 
        FROM affiliates 
        WHERE id = $1
      `, [deposit.affiliate_id]);
      
      if (!affiliate.rows.length) {
        console.log(`⚠ Affiliate ${deposit.affiliate_id} not found`);
        continue;
      }
      
      const commissionRate = parseFloat(affiliate.rows[0].commission_rate || '10.00');
      const commissionAmount = (parseFloat(deposit.amount) * commissionRate / 100).toFixed(2);
      
      // Determine commission status based on deposit status
      let commissionStatus = 'pending';
      if (deposit.status === 'completed') {
        commissionStatus = 'completed';
      } else if (deposit.status === 'cancelled' || deposit.status === 'expired' || deposit.status === 'failed') {
        commissionStatus = 'cancelled';
      }
      
      // Create commission
      await pool.query(`
        INSERT INTO affiliate_conversions (
          affiliate_id,
          user_id,
          conversion_type,
          conversion_value,
          commission,
          commission_rate,
          status,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        deposit.affiliate_id,
        deposit.user_id,
        'deposit',
        deposit.amount,
        commissionAmount,
        commissionRate.toFixed(2),
        commissionStatus,
        deposit.created_at
      ]);
      
      console.log(`✅ Created ${commissionStatus} commission for deposit ${deposit.id} (${deposit.user_name}: R$ ${deposit.amount} × ${commissionRate}% = R$ ${commissionAmount})`);
      created++;
    }
    
    console.log(`\n=== Summary ===`);
    console.log(`Created: ${created} new commissions`);
    console.log(`Skipped: ${skipped} (already exist)`);
    
    // Update affiliate totals
    console.log("\n=== Updating Affiliate Totals ===");
    
    const affiliates = await pool.query(`
      SELECT DISTINCT affiliate_id FROM affiliate_conversions
    `);
    
    for (const aff of affiliates.rows) {
      // Calculate totals
      const totals = await pool.query(`
        SELECT 
          SUM(CASE WHEN status = 'completed' THEN commission ELSE 0 END) as total_earnings,
          SUM(CASE WHEN status = 'pending' THEN commission ELSE 0 END) as pending_earnings
        FROM affiliate_conversions
        WHERE affiliate_id = $1
      `, [aff.affiliate_id]);
      
      const totalEarnings = parseFloat(totals.rows[0].total_earnings || '0').toFixed(2);
      const pendingEarnings = parseFloat(totals.rows[0].pending_earnings || '0').toFixed(2);
      
      await pool.query(`
        UPDATE affiliates 
        SET total_earnings = $1,
            pending_earnings = $2
        WHERE id = $3
      `, [totalEarnings, pendingEarnings, aff.affiliate_id]);
      
      const affInfo = await pool.query(`SELECT name FROM affiliates WHERE id = $1`, [aff.affiliate_id]);
      console.log(`Updated ${affInfo.rows[0].name}: Total R$ ${totalEarnings}, Pending R$ ${pendingEarnings}`);
    }
    
    console.log("\n✅ All missing commissions processed successfully!");
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pool.end();
  }
}

fixMissingCommissions();
