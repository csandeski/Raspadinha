import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testCoupon() {
  const userId = 113;
  
  console.log('=== SIMPLE COUPON PERSISTENCE TEST ===\n');
  
  try {
    // Check initial status
    const userResult = await pool.query(
      'SELECT coupon_applied, current_coupon FROM users WHERE id = $1',
      [userId]
    );
    
    const user = userResult.rows[0];
    console.log('User status BEFORE deposit:');
    console.log(`- Coupon applied: ${user.coupon_applied === 1 ? 'YES' : 'NO'}`);
    console.log(`- Current coupon: ${user.current_coupon || 'None'}\n`);
    
    // Create a simple test deposit
    const depositResult = await pool.query(
      `INSERT INTO deposits (user_id, amount, status, payment_provider)
       VALUES ($1, $2, 'pending', 'ironpay')
       RETURNING id`,
      [userId, 50]
    );
    
    const depositId = depositResult.rows[0].id;
    console.log(`Created deposit ID: ${depositId}`);
    
    // Call test approval
    console.log('Calling test approval endpoint...\n');
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
    console.log('API Response:');
    console.log(`- ${result.message}`);
    console.log(`- Balance: R$ ${result.newBalance}`);
    console.log(`- Bonus: ${result.scratchBonus} cards\n`);
    
    // Check if coupon persisted
    const userAfter = await pool.query(
      'SELECT coupon_applied, current_coupon FROM users WHERE id = $1',
      [userId]
    );
    
    const userFinal = userAfter.rows[0];
    console.log('User status AFTER deposit:');
    console.log(`- Coupon applied: ${userFinal.coupon_applied === 1 ? '✅ YES' : '❌ NO'}`);
    console.log(`- Current coupon: ${userFinal.current_coupon || 'None'}\n`);
    
    if (userFinal.coupon_applied === 1 && userFinal.current_coupon === 'SORTE') {
      console.log('✅ SUCCESS! Coupon SORTE persisted after deposit!');
    } else {
      console.log('❌ FAILURE! Coupon was removed!');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

testCoupon();
