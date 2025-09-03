import { db } from "./server/db";
import { affiliateConversions, partnerConversions } from "./shared/schema";
import { eq, and, sql, isNull, desc } from "drizzle-orm";

async function fixDuplicateCommissions() {
  console.log("=== FIXING DUPLICATE COMMISSIONS ===\n");
  
  try {
    // 1. Find all partner conversions (limit to recent ones to avoid timeout)
    const partnerConvs = await db.select({
      userId: partnerConversions.userId,
      affiliateId: partnerConversions.affiliateId,
      conversionValue: partnerConversions.conversionValue,
      createdAt: partnerConversions.createdAt
    })
    .from(partnerConversions)
    .orderBy(desc(partnerConversions.createdAt))
    .limit(50); // Process only recent 50 to avoid timeout
    
    console.log(`Processing ${partnerConvs.length} recent partner conversions`);
    
    let duplicatesFound = 0;
    let duplicatesFixed = 0;
    
    // 2. For each partner conversion, find duplicate affiliate conversions
    for (const pConv of partnerConvs) {
      // Find affiliate conversions for the same user, affiliate, and amount
      // that don't have a partnerId (these are the duplicates)
      const duplicates = await db.select()
        .from(affiliateConversions)
        .where(and(
          eq(affiliateConversions.userId, pConv.userId!),
          eq(affiliateConversions.affiliateId, pConv.affiliateId!),
          eq(affiliateConversions.conversionValue, pConv.conversionValue!),
          isNull(affiliateConversions.partnerId),
          eq(affiliateConversions.conversionType, 'deposit')
        ));
      
      if (duplicates.length > 0) {
        duplicatesFound += duplicates.length;
        console.log(`\nFound ${duplicates.length} duplicate(s) for user ${pConv.userId}, affiliate ${pConv.affiliateId}`);
        
        // Delete the duplicates (keep partner conversions as they have the correct split)
        for (const dup of duplicates) {
          console.log(`  - Deleting duplicate affiliate conversion ID ${dup.id} (commission: R$${dup.commission})`);
          await db.delete(affiliateConversions)
            .where(eq(affiliateConversions.id, dup.id));
          duplicatesFixed++;
        }
      }
    }
    
    // 3. Now update any remaining affiliate conversions that should have partnerId
    // This is for future-proofing - set partnerId on conversions that were created with partners
    const affiliateConvsWithoutPartner = await db.select({
      id: affiliateConversions.id,
      userId: affiliateConversions.userId,
      affiliateId: affiliateConversions.affiliateId,
      conversionValue: affiliateConversions.conversionValue,
      notes: affiliateConversions.notes
    })
    .from(affiliateConversions)
    .where(and(
      isNull(affiliateConversions.partnerId),
      sql`${affiliateConversions.notes} LIKE '%Partner share%'`
    ));
    
    console.log(`\nFound ${affiliateConvsWithoutPartner.length} affiliate conversions with partner notes but no partnerId`);
    
    // For each of these, try to find the corresponding partner
    for (const conv of affiliateConvsWithoutPartner) {
      // Find partner conversion with matching details
      const [partnerConv] = await db.select({
        partnerId: partnerConversions.partnerId
      })
      .from(partnerConversions)
      .where(and(
        eq(partnerConversions.userId, conv.userId!),
        eq(partnerConversions.affiliateId, conv.affiliateId!),
        eq(partnerConversions.conversionValue, conv.conversionValue!)
      ))
      .limit(1);
      
      if (partnerConv && partnerConv.partnerId) {
        console.log(`  - Updating conversion ${conv.id} with partnerId ${partnerConv.partnerId}`);
        await db.update(affiliateConversions)
          .set({ partnerId: partnerConv.partnerId })
          .where(eq(affiliateConversions.id, conv.id));
      }
    }
    
    console.log("\n=== SUMMARY ===");
    console.log(`Total duplicates found: ${duplicatesFound}`);
    console.log(`Duplicates removed: ${duplicatesFixed}`);
    console.log(`Conversions updated with partnerId: ${affiliateConvsWithoutPartner.length}`);
    
    // 4. Verify the fix - count remaining conversions
    const [affiliateCount] = await db.select({ count: sql<number>`COUNT(*)` })
      .from(affiliateConversions);
    const [partnerCount] = await db.select({ count: sql<number>`COUNT(*)` })
      .from(partnerConversions);
    
    console.log(`\nFinal counts:`);
    console.log(`  - Affiliate conversions: ${affiliateCount.count}`);
    console.log(`  - Partner conversions: ${partnerCount.count}`);
    
  } catch (error) {
    console.error("Error fixing duplicates:", error);
  }
  
  process.exit(0);
}

fixDuplicateCommissions();