import { db, pool } from './server/db.js';
import { dailyCashback, wallets, deposits, withdrawals } from './shared/schema.js';
import { eq, and, sql, desc } from 'drizzle-orm';

async function processCashback() {
  try {
    const today = new Date().toISOString().split('T')[0];
    console.log('Processing cashback for date:', today);
    
    // Get user wallet
    const [wallet] = await db.select()
      .from(wallets)
      .where(eq(wallets.userId, 1));
    
    if (!wallet) {
      console.log('No wallet found for user 1');
      return;
    }
    
    const totalWagered = parseFloat(wallet.totalWagered || '0');
    console.log('Total wagered:', totalWagered);
    
    // Calculate tier
    let tier = 'bronze';
    if (totalWagered >= 50000) tier = 'diamond';
    else if (totalWagered >= 20000) tier = 'platinum';
    else if (totalWagered >= 8000) tier = 'gold';
    else if (totalWagered >= 3000) tier = 'silver';
    
    console.log('User tier:', tier);
    
    // Get percentage
    const percentages = {
      bronze: 1.5,
      silver: 3,
      gold: 6,
      platinum: 12,
      diamond: 24
    };
    
    const percentage = percentages[tier];
    console.log('Cashback percentage:', percentage);
    
    // Check if cashback already exists for today
    const [existing] = await db.select()
      .from(dailyCashback)
      .where(and(
        eq(dailyCashback.userId, 1),
        eq(dailyCashback.calculationDate, today)
      ));
    
    if (existing) {
      console.log('Cashback already exists for today:', existing);
      return;
    }
    
    // Create a test cashback record for today
    const totalDeposits = 1000; // Example deposit amount
    const totalWithdrawals = 0;
    const currentBalance = parseFloat(wallet.balance);
    const netLoss = totalDeposits - (totalWithdrawals + currentBalance);
    
    // Only create if there's a loss or we want to test
    const cashbackAmount = Math.max(10, (Math.abs(netLoss) * percentage) / 100); // Minimum R$ 10 for testing
    
    console.log('Creating cashback record...');
    console.log('Net loss:', netLoss);
    console.log('Cashback amount:', cashbackAmount);
    
    const [newCashback] = await db.insert(dailyCashback).values({
      userId: 1,
      calculationDate: today,
      tier: tier,
      cashbackPercentage: percentage,
      totalDeposits: totalDeposits.toFixed(2),
      totalWithdrawals: totalWithdrawals.toFixed(2),
      currentBalance: currentBalance.toFixed(2),
      netLoss: Math.max(0, netLoss).toFixed(2),
      cashbackAmount: cashbackAmount.toFixed(2),
      status: 'pending'
    }).returning();
    
    console.log('Created cashback:', newCashback);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

processCashback();
