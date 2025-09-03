// Script to fix completed commissions that don't have wallet transactions
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./shared/schema.js";
import { eq, and, desc, sql as sqlBuilder } from "drizzle-orm";

const sql = postgres(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });

async function fixMissingWalletTransactions() {
  console.log("=== FIXING MISSING WALLET TRANSACTIONS ===\n");
  
  // Get all completed commissions
  const completedCommissions = await db
    .select()
    .from(schema.affiliateConversions)
    .where(eq(schema.affiliateConversions.status, 'completed'));
  
  console.log(`Found ${completedCommissions.length} completed commissions\n`);
  
  let fixedCount = 0;
  let totalAmountFixed = 0;
  
  for (const commission of completedCommissions) {
    // Check if wallet transaction exists
    const existingTx = await db
      .select()
      .from(schema.affiliatesWalletTransactions)
      .where(
        and(
          eq(schema.affiliatesWalletTransactions.referenceId, commission.id),
          eq(schema.affiliatesWalletTransactions.type, 'commission')
        )
      )
      .limit(1);
    
    if (existingTx.length === 0) {
      console.log(`Fixing commission ID ${commission.id} for affiliate ${commission.affiliateId}: R$${commission.commission}`);
      
      // Get or create wallet
      let wallet = await db
        .select()
        .from(schema.affiliatesWallet)
        .where(eq(schema.affiliatesWallet.affiliateId, commission.affiliateId))
        .limit(1);
      
      if (wallet.length === 0) {
        // Create wallet if doesn't exist
        const [newWallet] = await db
          .insert(schema.affiliatesWallet)
          .values({
            affiliateId: commission.affiliateId,
            balance: '0.00',
            totalEarned: '0.00',
            totalWithdrawn: '0.00'
          })
          .returning();
        wallet = [newWallet];
      }
      
      const currentWallet = wallet[0];
      const balanceBefore = parseFloat(currentWallet.balance);
      const amount = parseFloat(commission.commission || '0');
      const balanceAfter = balanceBefore + amount;
      
      // Create wallet transaction
      await db.insert(schema.affiliatesWalletTransactions).values({
        walletId: currentWallet.id,
        affiliateId: commission.affiliateId,
        type: 'commission',
        status: 'completed',
        amount: amount.toFixed(2),
        balanceBefore: balanceBefore.toFixed(2),
        balanceAfter: balanceAfter.toFixed(2),
        description: `Comissão aprovada - Depósito usuário #${commission.userId}`,
        referenceId: commission.id,
        referenceType: 'deposit',
        metadata: { depositId: commission.id },
        processedAt: new Date()
      });
      
      // Update wallet balance
      await db
        .update(schema.affiliatesWallet)
        .set({
          balance: balanceAfter.toFixed(2),
          totalEarned: (parseFloat(currentWallet.totalEarned) + amount).toFixed(2),
          lastTransactionAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(schema.affiliatesWallet.id, currentWallet.id));
      
      // Update affiliate's approved earnings
      await db.update(schema.affiliates)
        .set({
          approvedEarnings: sqlBuilder`COALESCE(${schema.affiliates.approvedEarnings}, 0) + ${amount}`,
          totalEarnings: sqlBuilder`COALESCE(${schema.affiliates.totalEarnings}, 0) + ${amount}`
        })
        .where(eq(schema.affiliates.id, commission.affiliateId));
      
      fixedCount++;
      totalAmountFixed += amount;
      console.log(`✅ Fixed: Added R$${amount.toFixed(2)} to wallet`);
    }
  }
  
  console.log("\n=== SUMMARY ===");
  console.log(`Fixed ${fixedCount} missing wallet transactions`);
  console.log(`Total amount added to wallets: R$${totalAmountFixed.toFixed(2)}`);
  
  // Show current wallet balances
  const wallets = await db
    .select()
    .from(schema.affiliatesWallet);
  
  console.log("\n=== CURRENT WALLET BALANCES ===");
  for (const w of wallets) {
    console.log(`Affiliate ${w.affiliateId}: Balance: R$${w.balance}, Total Earned: R$${w.totalEarned}`);
  }
  
  process.exit(0);
}

fixMissingWalletTransactions().catch(console.error);