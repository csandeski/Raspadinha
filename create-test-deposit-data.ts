import { db } from './server/db';
import { affiliateConversions, users } from './shared/schema';
import { eq } from 'drizzle-orm';

async function createTestData() {
  try {
    const affiliateId = 12; // Master affiliate
    
    // Get an existing user ID
    const existingUsers = await db.select({ id: users.id }).from(users).limit(1);
    
    if (existingUsers.length === 0) {
      console.log('No users found in database');
      return;
    }
    
    const userId = existingUsers[0].id;
    console.log(`Using user ID: ${userId}`);
    
    // Create diverse test data for the last 7 days
    const today = new Date();
    const testData = [
      { daysAgo: 6, approved: 2, pending: 1, cancelled: 0 },
      { daysAgo: 5, approved: 3, pending: 0, cancelled: 1 },
      { daysAgo: 4, approved: 1, pending: 2, cancelled: 0 },
      { daysAgo: 3, approved: 4, pending: 1, cancelled: 1 },
      { daysAgo: 2, approved: 2, pending: 0, cancelled: 0 },
      { daysAgo: 1, approved: 3, pending: 1, cancelled: 0 },
      { daysAgo: 0, approved: 1, pending: 2, cancelled: 1 }
    ];
    
    console.log('Criando dados de teste de depósitos...');
    
    for (const data of testData) {
      const date = new Date();
      date.setDate(date.getDate() - data.daysAgo);
      
      // Create approved conversions
      for (let i = 0; i < data.approved; i++) {
        await db.insert(affiliateConversions).values({
          affiliateId,
          userId,
          conversionType: 'deposit',
          conversionValue: '100.00',
          depositId: Math.floor(Math.random() * 1000000),
          depositAmount: '100.00',
          commission: '50.00',
          commissionRate: '50.00',
          status: 'completed',
          createdAt: date
        });
      }
      
      // Create pending conversions
      for (let i = 0; i < data.pending; i++) {
        await db.insert(affiliateConversions).values({
          affiliateId,
          userId,
          conversionType: 'deposit',
          conversionValue: '100.00',
          depositId: Math.floor(Math.random() * 1000000),
          depositAmount: '100.00',
          commission: '50.00',
          commissionRate: '50.00',
          status: 'pending',
          createdAt: date
        });
      }
      
      // Create cancelled conversions
      for (let i = 0; i < data.cancelled; i++) {
        await db.insert(affiliateConversions).values({
          affiliateId,
          userId,
          conversionType: 'deposit',
          conversionValue: '100.00',
          depositId: Math.floor(Math.random() * 1000000),
          depositAmount: '100.00',
          commission: '50.00',
          commissionRate: '50.00',
          status: 'cancelled',
          createdAt: date
        });
      }
    }
    
    console.log('✅ Dados de teste criados com sucesso!');
    console.log('Total aprovados: 16');
    console.log('Total pendentes: 7');
    console.log('Total cancelados: 3');
    
    // Verify the data
    const allConversions = await db.select().from(affiliateConversions).where(eq(affiliateConversions.affiliateId, affiliateId));
    console.log(`\nTotal de conversões para afiliado ${affiliateId}: ${allConversions.length}`);
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    process.exit();
  }
}

createTestData();
