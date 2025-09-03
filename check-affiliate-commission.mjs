import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const sql = postgres(process.env.DATABASE_URL);

async function checkCommission() {
  try {
    const result = await sql`
      SELECT 
        id,
        name,
        commission_type,
        custom_commission_rate,
        custom_fixed_amount,
        fixed_commission_amount,
        current_level_rate
      FROM affiliates 
      WHERE id = 1
    `;
    
    console.log('Affiliate commission data:', result[0]);
    
    if (result[0]) {
      const affiliate = result[0];
      console.log('\n=== Commission Configuration ===');
      console.log('Type:', affiliate.commission_type);
      console.log('Custom Fixed Amount:', affiliate.custom_fixed_amount);
      console.log('Fixed Commission Amount:', affiliate.fixed_commission_amount);
      console.log('Custom Commission Rate:', affiliate.custom_commission_rate);
      console.log('Current Level Rate:', affiliate.current_level_rate);
      
      if (affiliate.commission_type === 'fixed') {
        const fixedValue = affiliate.custom_fixed_amount || affiliate.fixed_commission_amount || '10.00';
        console.log('\n✓ Should show: R$', parseFloat(fixedValue).toFixed(2));
      } else {
        const rate = affiliate.custom_commission_rate || affiliate.current_level_rate || '40';
        console.log('\n✓ Should show:', rate + '%');
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkCommission();
