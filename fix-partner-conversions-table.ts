import { db } from './server/db';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

async function fixPartnerConversionsTable() {
  console.log('\n=== FIXING PARTNER_CONVERSIONS TABLE ===\n');
  
  try {
    // Add type column if it doesn't exist
    await db.execute(sql`
      ALTER TABLE partner_conversions 
      ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'commission'
    `);
    console.log('✅ Added type column to partner_conversions');
    
    // Update existing rows
    await db.execute(sql`
      UPDATE partner_conversions 
      SET type = 'commission' 
      WHERE type IS NULL
    `);
    console.log('✅ Updated existing rows with type = commission');
    
    // Check the schema
    const result = await db.execute(sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'partner_conversions'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 Partner Conversions Schema:');
    console.table(result.rows);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

fixPartnerConversionsTable();