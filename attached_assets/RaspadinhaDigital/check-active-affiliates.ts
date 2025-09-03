import { db } from "./server/db";
import { affiliateConversions, partnerConversions, affiliates } from "./shared/schema";
import { sql } from "drizzle-orm";

async function checkActiveAffiliates() {
  console.log("=== CHECKING ACTIVE AFFILIATES WITH CONVERSIONS ===\n");
  
  try {
    // Get affiliates with conversions
    const affiliatesWithConversions = await db.select({
      affiliateId: affiliateConversions.affiliateId,
      conversionCount: sql<number>`COUNT(*)`.as('count'),
      totalCommission: sql<number>`SUM(${affiliateConversions.commission})`.as('total')
    })
    .from(affiliateConversions)
    .groupBy(affiliateConversions.affiliateId)
    .limit(10);
    
    console.log("Affiliates with conversions:");
    for (const aff of affiliatesWithConversions) {
      console.log(`  Affiliate ID ${aff.affiliateId}: ${aff.conversionCount} conversions, Total: R$${aff.totalCommission || 0}`);
    }
    
    // Get affiliates with partner conversions
    const affiliatesWithPartnerConversions = await db.select({
      affiliateId: partnerConversions.affiliateId,
      conversionCount: sql<number>`COUNT(*)`.as('count'),
      totalCommission: sql<number>`SUM(${partnerConversions.affiliateCommission})`.as('total')
    })
    .from(partnerConversions)
    .groupBy(partnerConversions.affiliateId)
    .limit(10);
    
    console.log("\nAffiliates with partner conversions:");
    for (const aff of affiliatesWithPartnerConversions) {
      console.log(`  Affiliate ID ${aff.affiliateId}: ${aff.conversionCount} partner conversions, Total: R$${aff.totalCommission || 0}`);
    }
    
    // Now check for the most active affiliate with both types
    if (affiliatesWithConversions.length > 0) {
      const topAffiliateId = affiliatesWithConversions[0].affiliateId;
      console.log(`\n=== DETAILED CHECK FOR AFFILIATE ${topAffiliateId} ===\n`);
      
      // Get recent conversions for this affiliate
      const recentAffConversions = await db.select({
        userId: affiliateConversions.userId,
        partnerId: affiliateConversions.partnerId,
        conversionValue: affiliateConversions.conversionValue,
        commission: affiliateConversions.commission,
        createdAt: affiliateConversions.createdAt
      })
      .from(affiliateConversions)
      .where(sql`${affiliateConversions.affiliateId} = ${topAffiliateId}`)
      .orderBy(sql`${affiliateConversions.createdAt} DESC`)
      .limit(10);
      
      const recentPartnerConversions = await db.select({
        userId: partnerConversions.userId,
        conversionValue: partnerConversions.conversionValue,
        affiliateCommission: partnerConversions.affiliateCommission,
        createdAt: partnerConversions.createdAt
      })
      .from(partnerConversions)
      .where(sql`${partnerConversions.affiliateId} = ${topAffiliateId}`)
      .orderBy(sql`${partnerConversions.createdAt} DESC`)
      .limit(10);
      
      console.log(`Recent affiliate conversions: ${recentAffConversions.length}`);
      console.log(`Recent partner conversions: ${recentPartnerConversions.length}`);
      
      // Check for potential duplicates
      let duplicates = 0;
      for (const pConv of recentPartnerConversions) {
        const matches = recentAffConversions.filter(aConv => 
          aConv.userId === pConv.userId &&
          aConv.conversionValue === pConv.conversionValue
        );
        
        if (matches.length > 0) {
          duplicates++;
          console.log(`\nPotential duplicate:`);
          console.log(`  User ${pConv.userId}, Amount: R$${pConv.conversionValue}`);
          console.log(`  Partner conversion commission: R$${pConv.affiliateCommission}`);
          for (const match of matches) {
            console.log(`  Affiliate conversion commission: R$${match.commission} (PartnerId: ${match.partnerId || 'NULL'})`);
          }
        }
      }
      
      if (duplicates > 0) {
        console.log(`\nFound ${duplicates} potential duplicates!`);
      }
    }
    
  } catch (error) {
    console.error("Error:", error);
  }
  
  process.exit(0);
}

checkActiveAffiliates();