import { db } from './server/db';
import { affiliateConversions, affiliates, affiliatesWallet } from './shared/schema';
import { eq } from 'drizzle-orm';

async function removeDuplicate() {
  try {
    console.log('Removing duplicate pending commission...\n');
    
    // Delete the pending commission (ID 35) since we have a completed one (ID 36)
    await db.delete(affiliateConversions)
      .where(eq(affiliateConversions.id, 35));
    
    console.log('✓ Removed pending commission ID 35\n');
    
    // Recalculate affiliate earnings for affiliate ID 12
    const affiliateId = 12;
    
    // Get all conversions for this affiliate
    const conversions = await db.select()
      .from(affiliateConversions)
      .where(eq(affiliateConversions.affiliateId, affiliateId));
    
    let totalEarnings = 0;
    let pendingEarnings = 0;
    let paidEarnings = 0;
    
    for (const conv of conversions) {
      const commission = parseFloat(conv.commission || '0');
      
      if (conv.status === 'paid') {
        paidEarnings += commission;
      } else if (conv.status === 'completed') {
        totalEarnings += commission;
      } else if (conv.status === 'pending') {
        pendingEarnings += commission;
      }
    }
    
    // Update affiliate with correct values
    await db.update(affiliates)
      .set({
        totalEarnings: totalEarnings.toFixed(2),
        pendingEarnings: pendingEarnings.toFixed(2),
        paidEarnings: paidEarnings.toFixed(2)
      })
      .where(eq(affiliates.id, affiliateId));
    
    console.log('✓ Updated affiliate earnings:');
    console.log(`  Total: R$ ${totalEarnings.toFixed(2)}`);
    console.log(`  Pending: R$ ${pendingEarnings.toFixed(2)}`);
    console.log(`  Paid: R$ ${paidEarnings.toFixed(2)}\n`);
    
    // Update wallet balance
    const wallet = await db.select()
      .from(affiliatesWallet)
      .where(eq(affiliatesWallet.affiliateId, affiliateId))
      .limit(1);
    
    if (wallet.length > 0) {
      await db.update(affiliatesWallet)
        .set({
          balance: totalEarnings.toFixed(2),
          pendingBalance: pendingEarnings.toFixed(2)
        })
        .where(eq(affiliatesWallet.affiliateId, affiliateId));
      
      console.log('✓ Updated wallet balances\n');
    }
    
    // Show remaining conversions
    const remainingConversions = await db.select()
      .from(affiliateConversions)
      .where(eq(affiliateConversions.conversionType, 'deposit'));
    
    console.log('=== REMAINING DEPOSIT CONVERSIONS ===');
    for (const conv of remainingConversions) {
      console.log(`ID ${conv.id}: User ${conv.userId}, Amount R$ ${conv.conversionValue}, Status: ${conv.status}`);
    }
    
    console.log('\n✅ Duplicate commission fix completed!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
}

removeDuplicate();
