import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function checkColumns() {
  try {
    // Try to query the partner_clicks table to see what columns exist
    const result = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'partner_clicks' 
      ORDER BY ordinal_position
    `);
    
    console.log('Partner clicks table columns:');
    result.rows.forEach((row: any) => {
      console.log('  -', row.column_name);
    });
  } catch (error) {
    console.error('Error checking columns');
    
    // Try creating the table if it doesn't exist
    console.log('\nAttempting to update partner_clicks table...');
    try {
      // First check if referrer_url column exists, if not add it
      await db.execute(sql`
        ALTER TABLE partner_clicks 
        ADD COLUMN IF NOT EXISTS referrer_url TEXT
      `);
      console.log('✓ referrer_url column added/verified');
      
      // Check if clicked_at exists
      await db.execute(sql`
        ALTER TABLE partner_clicks 
        ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMP DEFAULT NOW()
      `);
      console.log('✓ clicked_at column added/verified');
      
    } catch (alterError) {
      console.error('Failed to alter table:', alterError);
    }
  }
  process.exit(0);
}

checkColumns();
