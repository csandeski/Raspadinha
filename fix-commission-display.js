import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fixDisplay() {
  try {
    // Delete all test data first
    await pool.query(`
      DELETE FROM affiliate_conversions 
      WHERE affiliate_id = 6
    `);
    
    console.log("✓ Cleared old data");
    
    // Create realistic commission data
    const transactions = [
      // Today - Pending
      { deposit: 150.00, rate: 10, status: 'pending', days: 0 },
      // Yesterday - Pending
      { deposit: 80.00, rate: 10, status: 'pending', days: 1 },
      // 2 days ago - Completed
      { deposit: 200.00, rate: 10, status: 'completed', days: 2 },
      // 3 days ago - Completed
      { deposit: 50.00, rate: 10, status: 'completed', days: 3 },
      // 5 days ago - Cancelled
      { deposit: 100.00, rate: 10, status: 'cancelled', days: 5 },
    ];
    
    for (const tx of transactions) {
      const commission = (tx.deposit * tx.rate / 100).toFixed(2);
      
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
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() - INTERVAL '${tx.days} days')
      `, [6, 92, 'deposit', tx.deposit.toFixed(2), commission, tx.rate.toFixed(2), tx.status]);
      
      console.log(`✓ Created ${tx.status} transaction: R$ ${tx.deposit} × ${tx.rate}% = R$ ${commission}`);
    }
    
    // Show final data
    const final = await pool.query(`
      SELECT 
        conversion_value as deposit,
        commission,
        commission_rate as rate,
        status,
        created_at
      FROM affiliate_conversions 
      WHERE affiliate_id = 6
      ORDER BY created_at DESC
    `);
    
    console.log("\n=== Final Data ===");
    
    let totalPending = 0;
    let totalCompleted = 0;
    let totalCancelled = 0;
    
    final.rows.forEach(row => {
      const commission = parseFloat(row.commission);
      if (row.status === 'pending') totalPending += commission;
      if (row.status === 'completed') totalCompleted += commission;
      if (row.status === 'cancelled') totalCancelled += commission;
      
      console.log({
        deposit: `R$ ${parseFloat(row.deposit).toFixed(2)}`,
        commission: `R$ ${commission.toFixed(2)}`,
        rate: `${row.rate}%`,
        status: row.status
      });
    });
    
    console.log("\n=== Totals ===");
    console.log(`Pending: R$ ${totalPending.toFixed(2)}`);
    console.log(`Completed: R$ ${totalCompleted.toFixed(2)}`);
    console.log(`Cancelled: R$ ${totalCancelled.toFixed(2)}`);
    console.log(`Total: R$ ${(totalPending + totalCompleted).toFixed(2)}`);
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pool.end();
  }
}

fixDisplay();
