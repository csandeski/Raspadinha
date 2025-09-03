import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function cleanDuplicates() {
  try {
    console.log("=== Cleaning Duplicate Commissions ===\n");
    
    // Find duplicates
    const duplicates = await pool.query(`
      SELECT 
        user_id,
        conversion_value,
        DATE(created_at) as date,
        COUNT(*) as count
      FROM affiliate_conversions
      WHERE affiliate_id = 6
      GROUP BY user_id, conversion_value, DATE(created_at)
      HAVING COUNT(*) > 1
    `);
    
    console.log(`Found ${duplicates.rows.length} duplicate sets\n`);
    
    for (const dup of duplicates.rows) {
      console.log(`Duplicate: User ${dup.user_id}, Amount ${dup.conversion_value}, Date ${dup.date}`);
      
      // Get all duplicates for this combination
      const records = await pool.query(`
        SELECT id, status 
        FROM affiliate_conversions
        WHERE user_id = $1 
        AND conversion_value = $2
        AND DATE(created_at) = $3
        ORDER BY id
      `, [dup.user_id, dup.conversion_value, dup.date]);
      
      // Keep the first one, delete the rest
      for (let i = 1; i < records.rows.length; i++) {
        await pool.query(`DELETE FROM affiliate_conversions WHERE id = $1`, [records.rows[i].id]);
        console.log(`  ✓ Deleted duplicate commission ID ${records.rows[i].id}`);
      }
    }
    
    // Recalculate affiliate totals
    console.log("\n=== Recalculating Affiliate Totals ===");
    
    const totals = await pool.query(`
      SELECT 
        SUM(CASE WHEN status = 'completed' THEN commission ELSE 0 END) as total_earnings,
        SUM(CASE WHEN status = 'pending' THEN commission ELSE 0 END) as pending_earnings
      FROM affiliate_conversions
      WHERE affiliate_id = 6
    `);
    
    const totalEarnings = parseFloat(totals.rows[0].total_earnings || '0').toFixed(2);
    const pendingEarnings = parseFloat(totals.rows[0].pending_earnings || '0').toFixed(2);
    
    await pool.query(`
      UPDATE affiliates 
      SET total_earnings = $1,
          pending_earnings = $2
      WHERE id = 6
    `, [totalEarnings, pendingEarnings]);
    
    console.log(`Updated totals: Completed R$ ${totalEarnings}, Pending R$ ${pendingEarnings}`);
    
    // Final check
    const finalCommissions = await pool.query(`
      SELECT 
        ac.*,
        u.name as user_name
      FROM affiliate_conversions ac
      LEFT JOIN users u ON ac.user_id = u.id
      WHERE ac.affiliate_id = 6
      ORDER BY ac.created_at DESC
    `);
    
    console.log("\n=== Final Commission List ===");
    finalCommissions.rows.forEach(row => {
      console.log({
        id: row.id,
        user: row.user_name,
        deposit: `R$ ${row.conversion_value}`,
        commission: `R$ ${row.commission}`,
        rate: `${row.commission_rate}%`,
        status: row.status
      });
    });
    
    console.log("\n✅ Duplicates cleaned successfully!");
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pool.end();
  }
}

cleanDuplicates();
