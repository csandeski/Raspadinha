import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function fixMarketingLinksTable() {
  try {
    console.log('Fixing marketing_links table...');
    
    // Add new columns if they don't exist
    await db.execute(sql`
      ALTER TABLE marketing_links 
      ADD COLUMN IF NOT EXISTS affiliate_id INTEGER REFERENCES affiliates(id),
      ADD COLUMN IF NOT EXISTS partner_id INTEGER REFERENCES partners(id),
      ADD COLUMN IF NOT EXISTS link_name TEXT,
      ADD COLUMN IF NOT EXISTS custom_path TEXT,
      ADD COLUMN IF NOT EXISTS utm_term TEXT,
      ADD COLUMN IF NOT EXISTS count INTEGER DEFAULT 0
    `);
    
    console.log('Added new columns');
    
    // Check if old columns exist and migrate data
    try {
      await db.execute(sql`
        UPDATE marketing_links 
        SET link_name = name 
        WHERE link_name IS NULL AND name IS NOT NULL
      `);
      console.log('Migrated data from name to link_name');
    } catch (e) {
      console.log('name column does not exist or data already migrated');
    }
    
    // Make link_name NOT NULL if it has data
    try {
      await db.execute(sql`
        UPDATE marketing_links 
        SET link_name = 'Unnamed Link' 
        WHERE link_name IS NULL
      `);
      
      await db.execute(sql`
        ALTER TABLE marketing_links 
        ALTER COLUMN link_name SET NOT NULL
      `);
      console.log('Made link_name NOT NULL');
    } catch (e) {
      console.log('link_name already NOT NULL or has null values');
    }
    
    // Drop old columns if they exist
    const columnsToDropp = ['name', 'source', 'url', 'short_code', 'description', 
                           'total_clicks', 'total_registrations', 'total_deposits'];
    
    for (const column of columnsToDropp) {
      try {
        await db.execute(sql`ALTER TABLE marketing_links DROP COLUMN ${sql.raw(column)}`);
        console.log(`Dropped column ${column}`);
      } catch (e) {
        // Column doesn't exist, that's fine
      }
    }
    
    console.log('Marketing links table fixed successfully!');
    
  } catch (error) {
    console.error('Error fixing marketing links table:', error);
  } finally {
    process.exit(0);
  }
}

fixMarketingLinksTable();