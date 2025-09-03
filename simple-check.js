import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client);

async function checkData() {
  const result = await client`
    SELECT 
      a.id,
      a.name,
      a.affiliate_level,
      a.commission_type,
      a.custom_commission_rate,
      a.custom_fixed_amount,
      a.current_level_rate,
      t.tier,
      t.percentage_rate as tier_percentage,
      t.fixed_amount as tier_fixed
    FROM affiliates a
    LEFT JOIN affiliate_tier_config t ON t.tier = a.affiliate_level
    WHERE a.id = 12
  `;
  
  console.log('=== DADOS DO AFILIADO ID 12 ===');
  console.log(result[0]);
  
  const tierData = await client`
    SELECT * FROM affiliate_tier_config 
    WHERE tier = 'prata'
  `;
  
  console.log('\n=== CONFIGURAÇÃO DO NÍVEL PRATA ===');
  console.log(tierData[0]);
  
  await client.end();
}

checkData();
