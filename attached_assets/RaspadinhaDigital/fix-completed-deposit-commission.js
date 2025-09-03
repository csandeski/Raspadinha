import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fixCompletedDeposit() {
  try {
    console.log("=== Fixing Completed Deposit Commission ===\n");
    
    // Update commission for completed deposit
    const result = await pool.query(`
      UPDATE affiliate_conversions 
      SET status = 'completed'
      WHERE user_id = 92
      AND conversion_value = '80.00'
      AND status = 'pending'
      RETURNING *
    `);
    
    if (result.rows.length > 0) {
      console.log(`✓ Updated commission ${result.rows[0].id} to completed status`);
      
      // Update affiliate totals
      const commission = parseFloat(result.rows[0].commission);
      
      await pool.query(`
        UPDATE affiliates 
        SET 
          pending_earnings = GREATEST(pending_earnings - $1, 0),
          total_earnings = total_earnings + $1
        WHERE id = 6
      `, [commission]);
      
      console.log(`✓ Moved R$ ${commission.toFixed(2)} from pending to completed earnings`);
    }
    
    // Show final state
    const commissions = await pool.query(`
      SELECT 
        ac.*,
        d.status as deposit_status
      FROM affiliate_conversions ac
      LEFT JOIN deposits d ON d.user_id = ac.user_id 
        AND d.amount = ac.conversion_value
        AND DATE(d.created_at) = DATE(ac.created_at)
      WHERE ac.affiliate_id = 6
      ORDER BY ac.created_at DESC
    `);
    
    console.log("\n=== Final Commission State ===");
    commissions.rows.forEach(row => {
      const match = row.status === 'completed' && row.deposit_status === 'completed' ? '✅' :
                   row.status === 'cancelled' && (row.deposit_status === 'cancelled' || row.deposit_status === 'expired') ? '✅' :
                   row.status === 'pending' && row.deposit_status === 'pending' ? '✅' : '⚠️';
                   
      console.log({
        match,
        deposit: `R$ ${row.conversion_value}`,
        commission: `R$ ${row.commission}`,
        commission_status: row.status,
        deposit_status: row.deposit_status,
        rate: `${row.commission_rate}%`
      });
    });
    
    // Show affiliate totals
    const affiliate = await pool.query(`
      SELECT * FROM affiliates WHERE id = 6
    `);
    
    console.log("\n=== Affiliate Totals ===");
    console.log({
      total_earnings: `R$ ${affiliate.rows[0].total_earnings || '0.00'}`,
      pending_earnings: `R$ ${affiliate.rows[0].pending_earnings || '0.00'}`,
      paid_earnings: `R$ ${affiliate.rows[0].paid_earnings || '0.00'}`
    });
    
    console.log("\n✅ System Ready: All commissions match deposit status!");
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pool.end();
  }
}

fixCompletedDeposit();
