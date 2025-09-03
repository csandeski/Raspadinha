import cron from 'node-cron';
import { db } from './db';
import { dailyCashback as cashbackTable, users, wallets, deposits, withdrawals } from '../shared/schema';
import { sql } from 'drizzle-orm';

// Calculate and create daily cashback records
export async function processDailyCashback() {
  console.log('[CRON] Starting daily cashback processing at', new Date().toISOString());
  
  try {
    // Get the current date in Brazil timezone (UTC-3)
    const brazilOffset = -3 * 60 * 60 * 1000;
    const brazilTime = new Date(Date.now() + brazilOffset);
    const calculationDate = brazilTime.toISOString().split('T')[0];
    
    // Check if cashback has already been processed today
    const existingCashback = await db
      .select()
      .from(cashbackTable)
      .where(sql`DATE(calculation_date) = ${calculationDate}`)
      .limit(1);
    
    if (existingCashback.length > 0) {
      console.log('[CRON] Cashback already processed for', calculationDate);
      return;
    }
    
    // Get all users with their financial data
    const usersData = await db
      .select({
        userId: users.id,
        walletBalance: wallets.balance,
      })
      .from(users)
      .innerJoin(wallets, sql`${users.id} = ${wallets.userId}`);
    
    let processedCount = 0;
    let totalAmount = 0;
    
    for (const user of usersData) {
      // Get user's total wagered amount
      const walletInfo = await db
        .select({ totalWagered: sql<string>`COALESCE(total_wagered, '0')` })
        .from(wallets)
        .where(sql`user_id = ${user.userId}`)
        .limit(1);
      
      const totalWagered = parseFloat(walletInfo[0]?.totalWagered || '0');
      
      // Calculate level based on total wagered (same logic as /api/user/level)
      const levelThresholds: Record<number, number> = {
        1: 0,
        2: 50,
        5: 150,
        10: 400,
        20: 1200,
        30: 3000,
        50: 8000,
        70: 20000,
        100: 50000,
      };
      
      function getRequiredForLevel(n: number): number {
        if (levelThresholds[n] !== undefined) {
          return levelThresholds[n];
        }
        
        // Linear interpolation between known thresholds
        const levels = Object.keys(levelThresholds).map(Number).sort((a, b) => a - b);
        for (let i = 0; i < levels.length - 1; i++) {
          if (n > levels[i] && n < levels[i + 1]) {
            const lowerLevel = levels[i];
            const upperLevel = levels[i + 1];
            const lowerAmount = levelThresholds[lowerLevel];
            const upperAmount = levelThresholds[upperLevel];
            const progress = (n - lowerLevel) / (upperLevel - lowerLevel);
            return Math.round(lowerAmount + progress * (upperAmount - lowerAmount));
          }
        }
        
        // Above level 100
        return 50000 + (n - 100) * 1000;
      }
      
      // Calculate current level
      let userLevel = 1;
      for (let level = 100; level >= 1; level--) {
        if (totalWagered >= getRequiredForLevel(level)) {
          userLevel = level;
          break;
        }
      }
      
      // Skip users below level 2
      if (userLevel < 2) continue;
      
      // Calculate tier based on level
      let tier = 'bronze';
      let percentage = 1.5;
      
      if (userLevel >= 100) {
        tier = 'diamond';
        percentage = 24;
      } else if (userLevel >= 75) {
        tier = 'platinum';
        percentage = 12;
      } else if (userLevel >= 50) {
        tier = 'gold';
        percentage = 6;
      } else if (userLevel >= 25) {
        tier = 'silver';
        percentage = 3;
      }
      
      // Get total deposits for user
      const depositsResult = await db
        .select({
          total: sql<string>`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)::text`
        })
        .from(deposits)
        .where(sql`user_id = ${user.userId} AND status = 'completed'`);
      
      const totalDeposits = parseFloat(depositsResult[0]?.total || '0');
      
      // Get total withdrawals for user
      const withdrawalsResult = await db
        .select({
          total: sql<string>`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)::text`
        })
        .from(withdrawals)
        .where(sql`user_id = ${user.userId} AND status = 'approved'`);
      
      const totalWithdrawals = parseFloat(withdrawalsResult[0]?.total || '0');
      
      // Get current balance
      const currentBalance = parseFloat(user.walletBalance || '0');
      
      // Calculate net loss
      const netLoss = totalDeposits - (totalWithdrawals + currentBalance);
      
      // Only create cashback if net loss is positive and cashback amount is at least 0.50
      if (netLoss > 0) {
        const cashbackAmount = (netLoss * percentage) / 100;
        
        if (cashbackAmount >= 0.50) {
          await db.insert(cashbackTable).values({
            userId: user.userId,
            calculationDate: new Date(calculationDate),
            tier,
            cashbackPercentage: percentage,
            totalDeposits: totalDeposits.toFixed(2),
            totalWithdrawals: totalWithdrawals.toFixed(2),
            currentBalance: currentBalance.toFixed(2),
            netLoss: netLoss.toFixed(2),
            cashbackAmount: cashbackAmount.toFixed(2),
            status: 'pending',
          });
          
          processedCount++;
          totalAmount += cashbackAmount;
          
          console.log(`[CRON] Created cashback for user ${user.userId}: R$ ${cashbackAmount.toFixed(2)}`);
        }
      }
    }
    
    console.log(`[CRON] Daily cashback processing completed. Processed ${processedCount} cashbacks totaling R$ ${totalAmount.toFixed(2)}`);
  } catch (error) {
    console.error('[CRON] Error processing daily cashback:', error);
  }
}

// Schedule cron job to run at 00:01 Brazil time (03:01 UTC)
export function initializeCronJobs() {
  // Run every day at 03:01 UTC (00:01 Brazil time)
  cron.schedule('1 3 * * *', () => {
    processDailyCashback();
  }, {
    timezone: "UTC"
  });
  
  console.log('[CRON] Cashback cron job scheduled for 00:01 Brazil time daily');
  
  // Also process immediately on server start if it hasn't been done today
  processDailyCashback();
}