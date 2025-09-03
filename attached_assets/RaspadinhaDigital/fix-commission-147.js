// Script to fix commission 147 that wasn't added to wallet
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./shared/schema.js";
import { eq, and, sql as sqlBuilder } from "drizzle-orm";

const sql = postgres(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });

async function fixCommission147() {
  console.log("=== FIXING COMMISSION 147 ===\n");
  
  // Get the commission
  const [commission] = await db
    .select()
    .from(schema.affiliateConversions)
    .where(eq(schema.affiliateConversions.id, 147));
  
  if (!commission) {
    console.log("Commission 147 not found.");
    process.exit(0);
  }
  
  console.log("Commission Details:");
  console.log(`- ID: ${commission.id}`);
  console.log(`- Affiliate ID: ${commission.affiliateId}`);
  console.log(`- Amount: R$ ${commission.commission}`);
  console.log(`- Status: ${commission.status}\n`);
  
  // Check if wallet transaction already exists
  const existingTx = await db
    .select()
    .from(schema.affiliatesWalletTransactions)
    .where(
      and(
        eq(schema.affiliatesWalletTransactions.referenceId, commission.id),
        eq(schema.affiliatesWalletTransactions.type, 'commission')
      )
    );
  
  if (existingTx.length > 0) {
    console.log("Wallet transaction already exists for this commission.");
    process.exit(0);
  }
  
  console.log("❌ No wallet transaction found. Creating it now...\n");
  
  // Get or create wallet
  let wallet = await db
    .select()
    .from(schema.affiliatesWallet)
    .where(eq(schema.affiliatesWallet.affiliateId, commission.affiliateId))
    .limit(1);
  
  if (wallet.length === 0) {
    console.log("Creating wallet for affiliate...");
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
  
  console.log(`Current balance: R$ ${balanceBefore.toFixed(2)}`);
  console.log(`Adding: R$ ${amount.toFixed(2)}`);
  console.log(`New balance: R$ ${balanceAfter.toFixed(2)}\n`);
  
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
  
  console.log("✅ Commission fixed successfully!");
  console.log(`Added R$ ${amount.toFixed(2)} to affiliate wallet`);
  
  // Verify the fix
  const [updatedWallet] = await db
    .select()
    .from(schema.affiliatesWallet)
    .where(eq(schema.affiliatesWallet.affiliateId, commission.affiliateId));
  
  console.log(`\nFinal wallet balance: R$ ${updatedWallet.balance}`);
  
  process.exit(0);
}

fixCommission147().catch(console.error);