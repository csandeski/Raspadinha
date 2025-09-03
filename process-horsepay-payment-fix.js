// Process the confirmed HorsePay payment
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function processPayment() {
  try {
    // Start transaction
    await pool.query('BEGIN');
    
    // Get deposit details
    const depositResult = await pool.query(`
      SELECT * FROM deposits 
      WHERE transaction_id = '3851903' AND status = 'pending'
    `);
    
    if (depositResult.rows.length === 0) {
      console.log('Deposit not found or already processed');
      
      // Check if already completed
      const completedResult = await pool.query(`
        SELECT * FROM deposits 
        WHERE transaction_id = '3851903' AND status = 'completed'
      `);
      
      if (completedResult.rows.length > 0) {
        console.log('✓ Payment already processed and completed!');
      }
      
      await pool.query('ROLLBACK');
      return;
    }
    
    const deposit = depositResult.rows[0];
    console.log('Processing deposit:', deposit.id, 'Amount:', deposit.amount);
    
    // Update deposit status
    await pool.query(`
      UPDATE deposits 
      SET status = 'completed'
      WHERE id = $1
    `, [deposit.id]);
    
    // Get current wallet balance
    const walletResult = await pool.query(`
      SELECT * FROM wallets WHERE user_id = $1
    `, [deposit.user_id]);
    
    const wallet = walletResult.rows[0];
    const currentBalance = parseFloat(wallet.balance || '0');
    const depositAmount = parseFloat(deposit.amount);
    
    // Calculate net amount after HorsePay tax (R$ 0.65)
    const fixedTax = 0.65;
    const netAmount = Math.max(0, depositAmount - fixedTax);
    
    // Update wallet balance
    const newBalance = currentBalance + netAmount;
    await pool.query(`
      UPDATE wallets 
      SET balance = $1
      WHERE user_id = $2
    `, [newBalance.toFixed(2), deposit.user_id]);
    
    console.log(`✓ Payment processed successfully!`);
    console.log(`  Deposit: R$ ${depositAmount}`);
    console.log(`  Tax: R$ ${fixedTax}`);
    console.log(`  Net amount: R$ ${netAmount}`);
    console.log(`  Previous balance: R$ ${currentBalance}`);
    console.log(`  New balance: R$ ${newBalance.toFixed(2)}`);
    
    await pool.query('COMMIT');
    
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error processing payment:', error.message);
  } finally {
    pool.end();
  }
}

processPayment();
