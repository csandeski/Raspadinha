import { db } from './server/db';
import { affiliateConversions } from './shared/schema';

async function createTestData() {
  try {
    const affiliateId = 12; // ID do afiliado master
    
    // Get current date and create data for the last 7 days
    const today = new Date();
    const testData = [
      { daysAgo: 6, completed: 2, pending: 1, cancelled: 0, commission: 50 },
      { daysAgo: 5, completed: 3, pending: 0, cancelled: 1, commission: 75 },
      { daysAgo: 4, completed: 1, pending: 2, cancelled: 0, commission: 25 },
      { daysAgo: 3, completed: 4, pending: 1, cancelled: 1, commission: 100 },
      { daysAgo: 2, completed: 2, pending: 0, cancelled: 0, commission: 50 },
      { daysAgo: 1, completed: 3, pending: 1, cancelled: 0, commission: 75 },
      { daysAgo: 0, completed: 1, pending: 2, cancelled: 1, commission: 25 }
    ];
    
    console.log('Criando dados de teste de comissões...');
    
    for (const data of testData) {
      const date = new Date();
      date.setDate(date.getDate() - data.daysAgo);
      
      // Create completed conversions
      for (let i = 0; i < data.completed; i++) {
        await db.insert(affiliateConversions).values({
          affiliateId,
          userId: 17, // Test user ID
          depositId: Math.floor(Math.random() * 1000000),
          depositAmount: (data.commission / data.completed).toString(),
          commission: (data.commission / data.completed).toString(),
          commissionRate: '50.00',
          status: 'completed',
          createdAt: date
        });
      }
      
      // Create pending conversions
      for (let i = 0; i < data.pending; i++) {
        await db.insert(affiliateConversions).values({
          affiliateId,
          userId: 17,
          depositId: Math.floor(Math.random() * 1000000),
          depositAmount: '50.00',
          commission: '25.00',
          commissionRate: '50.00',
          status: 'pending',
          createdAt: date
        });
      }
      
      // Create cancelled conversions
      for (let i = 0; i < data.cancelled; i++) {
        await db.insert(affiliateConversions).values({
          affiliateId,
          userId: 17,
          depositId: Math.floor(Math.random() * 1000000),
          depositAmount: '50.00',
          commission: '25.00',
          commissionRate: '50.00',
          status: 'cancelled',
          createdAt: date
        });
      }
    }
    
    console.log('✅ Dados de teste criados com sucesso!');
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    process.exit();
  }
}

createTestData();
