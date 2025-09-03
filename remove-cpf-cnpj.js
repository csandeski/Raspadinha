import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function removeCpfCnpjColumn() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const db = drizzle(pool);

  try {
    console.log('Removing cpf_cnpj column from affiliates table...');
    
    // First check if column exists
    const checkColumn = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'affiliates' 
      AND column_name = 'cpf_cnpj'
    `);
    
    if (checkColumn.rows.length > 0) {
      // Remove the column
      await db.execute(sql`ALTER TABLE affiliates DROP COLUMN cpf_cnpj`);
      console.log('✅ cpf_cnpj column removed successfully!');
    } else {
      console.log('ℹ️ cpf_cnpj column does not exist in affiliates table');
    }
    
  } catch (error) {
    console.error('Error removing cpf_cnpj column:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

removeCpfCnpjColumn();