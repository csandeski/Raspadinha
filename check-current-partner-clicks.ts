import { db } from './server/db';
import { partnerCodes, partnerClicks } from './shared/schema';
import { eq } from 'drizzle-orm';

async function checkClicks() {
  console.log('Checking partner clicks in database...\n');
  
  // Check partner_codes table
  const [code] = await db.select()
    .from(partnerCodes)
    .where(eq(partnerCodes.code, 'NOVOSIM'));
  
  console.log('Partner Code NOVOSIM:');
  console.log('  Click Count in partner_codes:', code?.clickCount || 0);
  
  // Check partner_clicks table
  const clicks = await db.select()
    .from(partnerClicks)
    .where(eq(partnerClicks.code, 'NOVOSIM'));
  
  console.log('  Total records in partner_clicks:', clicks.length);
  
  // Check last few clicks
  const recentClicks = clicks.slice(-3);
  if (recentClicks.length > 0) {
    console.log('\nLast 3 clicks:');
    recentClicks.forEach(click => {
      console.log('  -', click.createdAt);
    });
  }
  
  process.exit(0);
}

checkClicks();
