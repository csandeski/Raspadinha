import { db } from './server/db';
import { partnerCodes } from './shared/schema';
import { eq } from 'drizzle-orm';

async function testCreateCode() {
  try {
    console.log('Testing direct database insert for partner ID 11...');
    
    // Insert a test code directly
    const [newCode] = await db.insert(partnerCodes).values({
      partnerId: 11,
      code: 'TESTDIRECT',
      name: 'Test Direct Insert',
      isActive: true,
      clickCount: 0,
      registrationCount: 0,
      depositCount: 0,
      createdAt: new Date()
    }).returning();
    
    console.log('Created code:', newCode);
    
    // Verify it was saved
    const codes = await db.select()
      .from(partnerCodes)
      .where(eq(partnerCodes.partnerId, 11));
    
    console.log('All codes for partner 11:', codes);
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

testCreateCode();
