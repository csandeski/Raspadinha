import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fixCommissionRate() {
  try {
    // Get affiliate details
    const affiliate = await pool.query(`
      SELECT * FROM affiliates WHERE id = 6
    `);
    
    const affiliateRate = parseFloat(affiliate.rows[0].commission_rate);
    console.log(`=== Affiliate Commission Rate: ${affiliateRate}% ===`);
    
    // Get all conversions
    const conversions = await pool.query(`
      SELECT * FROM affiliate_conversions 
      WHERE affiliate_id = 6
      ORDER BY created_at DESC
    `);
    
    console.log("\n=== Fixing Commissions ===");
    
    for (const conversion of conversions.rows) {
      if (conversion.conversion_value) {
        const depositAmount = parseFloat(conversion.conversion_value);
        const correctCommission = (depositAmount * affiliateRate / 100).toFixed(2);
        const currentCommission = parseFloat(conversion.commission || 0).toFixed(2);
        
        if (correctCommission !== currentCommission) {
          // Update with correct commission
          await pool.query(`
            UPDATE affiliate_conversions 
            SET commission = $1,
                commission_rate = $2
            WHERE id = $3
          `, [correctCommission, affiliateRate.toFixed(2), conversion.id]);
          
          console.log(`Fixed: R$ ${depositAmount} × ${affiliateRate}% = R$ ${correctCommission} (was R$ ${currentCommission})`);
        }
      }
    }
    
    // Show updated data
    const updated = await pool.query(`
      SELECT 
        ac.*,
        u.name as user_name
      FROM affiliate_conversions ac
      LEFT JOIN users u ON ac.user_id = u.id
      WHERE ac.affiliate_id = 6
      ORDER BY ac.created_at DESC
    `);
    
    console.log("\n=== Updated Commissions ===");
    let totalEarnings = 0;
    let pendingEarnings = 0;
    let completedEarnings = 0;
    
    updated.rows.forEach(row => {
      const commission = parseFloat(row.commission || 0);
      totalEarnings += commission;
      
      if (row.status === 'pending') {
        pendingEarnings += commission;
      } else if (row.status === 'completed' || row.status === 'paid') {
        completedEarnings += commission;
      }
      
      console.log({
        user: row.user_name,
        deposit: `R$ ${row.conversion_value}`,
        rate: `${row.commission_rate}%`,
        commission: `R$ ${commission.toFixed(2)}`,
        status: row.status
      });
    });
    
    console.log("\n=== Totals ===");
    console.log(`Total Earnings: R$ ${totalEarnings.toFixed(2)}`);
    console.log(`Pending: R$ ${pendingEarnings.toFixed(2)}`);
    console.log(`Completed: R$ ${completedEarnings.toFixed(2)}`);
    
    // Update affiliate totals
    await pool.query(`
      UPDATE affiliates 
      SET total_earnings = $1,
          pending_earnings = $2
      WHERE id = 6
    `, [completedEarnings.toFixed(2), pendingEarnings.toFixed(2)]);
    
    console.log("\n✓ Updated affiliate totals in database");
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pool.end();
  }
}

fixCommissionRate();
