import { db } from './server/db';
import { partnerCodes, partners } from './shared/schema';

async function checkTables() {
  try {
    // Check partners table structure
    const partnersResult = await db.execute(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'partners'
      ORDER BY ordinal_position
    `);
    
    console.log('Partners table columns:');
    console.log(partnersResult.rows);
    
    // Check partner_codes table structure
    const codesResult = await db.execute(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'partner_codes'
      ORDER BY ordinal_position
    `);
    
    console.log('\nPartner_codes table columns:');
    console.log(codesResult.rows);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkTables();
