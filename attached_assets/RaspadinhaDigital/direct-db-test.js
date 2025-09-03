import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import dotenv from 'dotenv';
import { affiliates, affiliateTierConfig } from './shared/schema.js';
import { eq } from 'drizzle-orm';

dotenv.config();

const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client);

async function testDirectly() {
  // Get affiliate data
  const affiliateData = await db
    .select()
    .from(affiliates)
    .where(eq(affiliates.id, 12))
    .limit(1);
    
  const affiliate = affiliateData[0];
  console.log('=== AFFILIATE DATA ===');
  console.log('ID:', affiliate.id);
  console.log('Name:', affiliate.name);
  console.log('Level:', affiliate.affiliateLevel);
  console.log('Commission Type:', affiliate.commissionType);
  console.log('Current Level Rate:', affiliate.currentLevelRate);
  console.log('Custom Fixed Amount:', affiliate.customFixedAmount);
  console.log('Custom Commission Rate:', affiliate.customCommissionRate);
  
  // Get tier config for silver
  const tierData = await db
    .select()
    .from(affiliateTierConfig)
    .where(eq(affiliateTierConfig.tier, 'silver'))
    .limit(1);
    
  const tier = tierData[0];
  console.log('\n=== TIER CONFIG (SILVER) ===');
  if (tier) {
    console.log('Tier:', tier.tier);
    console.log('Fixed Amount:', tier.fixedAmount);
    console.log('Percentage Rate:', tier.percentageRate);
  } else {
    console.log('No tier config found for silver');
  }
  
  // Determine actual commission
  let commissionType = 'fixed';
  let commissionValue = 7;
  
  if (tier) {
    commissionType = 'fixed';
    commissionValue = parseFloat(tier.fixedAmount || '7');
  } else if (affiliate.customFixedAmount && parseFloat(affiliate.customFixedAmount) > 0) {
    commissionType = 'fixed';
    commissionValue = parseFloat(affiliate.customFixedAmount);
  } else if (affiliate.customCommissionRate && parseFloat(affiliate.customCommissionRate) > 0) {
    commissionType = 'percentage';
    commissionValue = parseFloat(affiliate.customCommissionRate);
  } else if (affiliate.commissionType === 'fixed' && affiliate.currentLevelRate) {
    // Use current level rate as fixed amount
    commissionType = 'fixed';
    commissionValue = parseFloat(affiliate.currentLevelRate);
  }
  
  console.log('\n=== CALCULATED COMMISSION ===');
  console.log('Type:', commissionType);
  console.log('Value:', commissionValue);
  
  // Calculate partner limits
  const MINIMUM_DEPOSIT = 15;
  
  console.log('\n=== PARTNER COMMISSION LIMITS ===');
  if (commissionType === 'fixed') {
    const maxFixed = commissionValue;
    const maxPercentage = (commissionValue / MINIMUM_DEPOSIT) * 100;
    
    console.log('Partner with FIXED commission: max R$', maxFixed.toFixed(2));
    console.log('Partner with PERCENTAGE commission: max', maxPercentage.toFixed(1) + '%');
  } else {
    const maxPercentage = commissionValue;
    const maxFixed = (commissionValue / 100) * MINIMUM_DEPOSIT;
    
    console.log('Partner with PERCENTAGE commission: max', maxPercentage.toFixed(1) + '%');
    console.log('Partner with FIXED commission: max R$', maxFixed.toFixed(2));
  }
  
  await client.end();
}

testDirectly();
