import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function finalCouponTest() {
  const userId = 113;
  
  console.log('=== FINAL COUPON PERSISTENCE TEST ===\n');
  
  try {
    // Get max display_id
    const maxIdResult = await pool.query('SELECT COALESCE(MAX(display_id), 1000) as max_id FROM deposits');
    const nextDisplayId = parseInt(maxIdResult.rows[0].max_id) + 1;
    
    // Check user status before
    const userBefore = await pool.query(
      'SELECT coupon_applied, current_coupon FROM users WHERE id = $1',
      [userId]
    );
    
    console.log('BEFORE deposit:');
    console.log(`Coupon: ${userBefore.rows[0].current_coupon || 'None'}`);
    console.log(`Applied: ${userBefore.rows[0].coupon_applied === 1 ? 'YES' : 'NO'}\n`);
    
    // Create deposit with all required fields
    const depositResult = await pool.query(
      `INSERT INTO deposits (user_id, display_id, transaction_id, amount, status, payment_provider)
       VALUES ($1, $2, $3, $4, 'pending', 'ironpay')
       RETURNING id`,
      [userId, nextDisplayId, `test-${Date.now()}`, 50]
    );
    
    const depositId = depositResult.rows[0].id;
    console.log(`Created deposit ID: ${depositId}`);
    
    // Approve deposit
    const response = await fetch('http://localhost:5000/api/test/approve-deposit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        depositId: depositId,
        testKey: 'test-key-123'
      })
    });
    
    const result = await response.json();
    console.log(`Result: ${result.message}\n`);
    
    // Check user status after
    const userAfter = await pool.query(
      'SELECT coupon_applied, current_coupon FROM users WHERE id = $1',
      [userId]
    );
    
    console.log('AFTER deposit:');
    console.log(`Coupon: ${userAfter.rows[0].current_coupon || 'None'}`);
    console.log(`Applied: ${userAfter.rows[0].coupon_applied === 1 ? 'YES' : 'NO'}\n`);
    
    // Check coupon usage count
    const couponResult = await pool.query(
      `SELECT c.code, c.usage_count, 
        (SELECT COUNT(*) FROM coupon_uses cu WHERE cu.coupon_id = c.id AND cu.user_id = $1) as user_uses
       FROM coupons c 
       WHERE c.code = 'SORTE'`,
      [userId]
    );
    
    if (couponResult.rows.length > 0) {
      const coupon = couponResult.rows[0];
      console.log(`Coupon SORTE stats:`);
      console.log(`- Total uses: ${coupon.usage_count}`);
      console.log(`- Uses by this user: ${coupon.user_uses}\n`);
    }
    
    // Final verdict
    if (userAfter.rows[0].coupon_applied === 1 && userAfter.rows[0].current_coupon === 'SORTE') {
      console.log('✅ PERFEITO! Cupom SORTE permaneceu ativo após o depósito!');
      console.log('O cupom continuará aplicando bônus em futuros depósitos.');
    } else {
      console.log('❌ ERRO! O cupom foi removido após o depósito!');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

finalCouponTest();
