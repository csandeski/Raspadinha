import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { affiliateTierConfig } from './shared/schema.ts';

const connectionString = process.env.DATABASE_URL;
const sql = postgres(connectionString);
const db = drizzle(sql);

async function checkTierConfig() {
  try {
    // Check if tier configs exist
    const configs = await db.select().from(affiliateTierConfig);
    console.log('Existing tier configs:', configs);
    
    // If no configs, create default ones
    if (configs.length === 0) {
      console.log('Creating default tier configurations...');
      
      const defaultConfigs = [
        { tier: 'bronze', percentageRate: '40.00', fixedAmount: '6.00', minEarnings: '0.00' },
        { tier: 'silver', percentageRate: '45.00', fixedAmount: '7.00', minEarnings: '5000.00' },
        { tier: 'gold', percentageRate: '50.00', fixedAmount: '8.00', minEarnings: '20000.00' },
        { tier: 'platinum', percentageRate: '60.00', fixedAmount: '9.00', minEarnings: '50000.00' },
        { tier: 'diamond', percentageRate: '70.00', fixedAmount: '11.00', minEarnings: '100000.00' },
        { tier: 'special', percentageRate: '80.00', fixedAmount: '14.00', minEarnings: '0.00' }
      ];
      
      for (const config of defaultConfigs) {
        await db.insert(affiliateTierConfig).values(config);
        console.log(`Created tier config for ${config.tier}`);
      }
      
      // Verify creation
      const newConfigs = await db.select().from(affiliateTierConfig);
      console.log('Created tier configs:', newConfigs);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkTierConfig();
