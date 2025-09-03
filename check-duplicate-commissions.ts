import { db } from "./server/db";
import { affiliateConversions, partnerConversions, affiliates } from "./shared/schema";
import { eq, and, sql, isNull, desc, isNotNull } from "drizzle-orm";

async function checkDuplicates() {
  console.log("=== CHECKING FOR DUPLICATE COMMISSIONS ===\n");
  
  try {
    // Get specific affiliate to check (ID from screenshot appears to be affiliate 1)
    const affiliateId = 1;
    
    console.log(`Checking commissions for affiliate ID: ${affiliateId}\n`);
    
    // Get affiliate conversions for this affiliate
    const affiliateConvs = await db.select({
      id: affiliateConversions.id,
      userId: affiliateConversions.userId,
      partnerId: affiliateConversions.partnerId,
      conversionValue: affiliateConversions.conversionValue,
      commission: affiliateConversions.commission,
      status: affiliateConversions.status,
      createdAt: affiliateConversions.createdAt
    })
    .from(affiliateConversions)
    .where(eq(affiliateConversions.affiliateId, affiliateId))
    .orderBy(desc(affiliateConversions.createdAt))
    .limit(20);
    
    console.log(`Found ${affiliateConvs.length} affiliate conversions`);
    
    // Get partner conversions for this affiliate
    const partnerConvs = await db.select({
      id: partnerConversions.id,
      partnerId: partnerConversions.partnerId,
      userId: partnerConversions.userId,
      conversionValue: partnerConversions.conversionValue,
      affiliateCommission: partnerConversions.affiliateCommission,
      partnerCommission: partnerConversions.partnerCommission,
      status: partnerConversions.status,
      createdAt: partnerConversions.createdAt
    })
    .from(partnerConversions)
    .where(eq(partnerConversions.affiliateId, affiliateId))
    .orderBy(desc(partnerConversions.createdAt))
    .limit(20);
    
    console.log(`Found ${partnerConvs.length} partner conversions\n`);
    
    // Check for duplicates - conversions that appear in both tables
    console.log("=== CHECKING FOR DUPLICATES ===\n");
    
    let duplicateCount = 0;
    
    for (const pConv of partnerConvs) {
      // Find matching affiliate conversions (same user, amount, and around same time)
      const matches = affiliateConvs.filter(aConv => 
        aConv.userId === pConv.userId &&
        aConv.conversionValue === pConv.conversionValue &&
        Math.abs(new Date(aConv.createdAt!).getTime() - new Date(pConv.createdAt!).getTime()) < 60000 // Within 1 minute
      );
      
      if (matches.length > 0) {
        duplicateCount++;
        console.log(`DUPLICATE FOUND:`);
        console.log(`  User ID: ${pConv.userId}`);
        console.log(`  Amount: R$ ${pConv.conversionValue}`);
        console.log(`  Partner conversion ID: ${pConv.id} (Affiliate gets: R$${pConv.affiliateCommission})`);
        for (const match of matches) {
          console.log(`  Affiliate conversion ID: ${match.id} (Commission: R$${match.commission}, PartnerId: ${match.partnerId || 'NULL'})`);
        }
        console.log("");
      }
    }
    
    if (duplicateCount === 0) {
      console.log("No duplicates found!");
    } else {
      console.log(`\nTotal duplicates found: ${duplicateCount}`);
      console.log("\nThese affiliate conversions should have partnerId set or be removed if they're true duplicates.");
    }
    
    // Also check for affiliate conversions without partnerId that have partner notes
    const suspiciousConvs = await db.select({
      id: affiliateConversions.id,
      notes: affiliateConversions.notes,
      partnerId: affiliateConversions.partnerId
    })
    .from(affiliateConversions)
    .where(and(
      eq(affiliateConversions.affiliateId, affiliateId),
      isNull(affiliateConversions.partnerId),
      sql`${affiliateConversions.notes} LIKE '%Partner%' OR ${affiliateConversions.notes} LIKE '%partner%'`
    ))
    .limit(10);
    
    if (suspiciousConvs.length > 0) {
      console.log(`\n=== SUSPICIOUS CONVERSIONS ===`);
      console.log(`Found ${suspiciousConvs.length} conversions with partner notes but no partnerId:`);
      for (const conv of suspiciousConvs) {
        console.log(`  ID: ${conv.id}, Notes: "${conv.notes}"`);
      }
    }
    
  } catch (error) {
    console.error("Error checking duplicates:", error);
  }
  
  process.exit(0);
}

checkDuplicates();