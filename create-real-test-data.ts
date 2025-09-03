import { db } from './server/db';
import { affiliateConversions } from './shared/schema';
import { eq } from 'drizzle-orm';

async function createRealTestData() {
  try {
    const affiliateId = 12; // Master affiliate
    
    // Clear old test data for this affiliate
    await db.delete(affiliateConversions).where(eq(affiliateConversions.affiliateId, affiliateId));
    console.log('Dados antigos removidos');
    
    // Create realistic test data for the last 7 days
    const today = new Date();
    const testData = [
      { daysAgo: 6, approved: 2, pending: 1, cancelled: 0, amounts: [150.00, 200.00, 100.00] },
      { daysAgo: 5, approved: 3, pending: 0, cancelled: 1, amounts: [100.00, 250.00, 180.00, 120.00] },
      { daysAgo: 4, approved: 1, pending: 2, cancelled: 0, amounts: [300.00, 150.00, 200.00] },
      { daysAgo: 3, approved: 4, pending: 1, cancelled: 1, amounts: [180.00, 220.00, 150.00, 100.00, 250.00, 130.00] },
      { daysAgo: 2, approved: 2, pending: 0, cancelled: 0, amounts: [400.00, 150.00] },
      { daysAgo: 1, approved: 3, pending: 1, cancelled: 0, amounts: [200.00, 180.00, 250.00, 120.00] },
      { daysAgo: 0, approved: 1, pending: 2, cancelled: 1, amounts: [150.00, 300.00, 200.00, 100.00] }
    ];
    
    console.log('Criando dados de teste realistas...\n');
    
    for (const data of testData) {
      const date = new Date();
      date.setDate(date.getDate() - data.daysAgo);
      date.setHours(10, 0, 0, 0); // Set to 10 AM
      
      let amountIndex = 0;
      
      // Create approved conversions
      for (let i = 0; i < data.approved; i++) {
        const depositAmount = data.amounts[amountIndex++];
        const commission = depositAmount * 0.50; // 50% commission rate
        
        await db.insert(affiliateConversions).values({
          affiliateId,
          userId: 76, // Using existing user ID
          conversionType: 'deposit',
          conversionValue: depositAmount.toFixed(2),
          depositId: Math.floor(Math.random() * 1000000),
          depositAmount: depositAmount.toFixed(2),
          commission: commission.toFixed(2),
          commissionRate: '50.00',
          status: 'completed',
          createdAt: date
        });
      }
      
      // Create pending conversions
      for (let i = 0; i < data.pending; i++) {
        const depositAmount = data.amounts[amountIndex++];
        const commission = depositAmount * 0.50; // 50% commission rate
        
        await db.insert(affiliateConversions).values({
          affiliateId,
          userId: 76,
          conversionType: 'deposit',
          conversionValue: depositAmount.toFixed(2),
          depositId: Math.floor(Math.random() * 1000000),
          depositAmount: depositAmount.toFixed(2),
          commission: commission.toFixed(2),
          commissionRate: '50.00',
          status: 'pending',
          createdAt: date
        });
      }
      
      // Create cancelled conversions
      for (let i = 0; i < data.cancelled; i++) {
        const depositAmount = data.amounts[amountIndex++];
        const commission = depositAmount * 0.50; // 50% commission rate
        
        await db.insert(affiliateConversions).values({
          affiliateId,
          userId: 76,
          conversionType: 'deposit',
          conversionValue: depositAmount.toFixed(2),
          depositId: Math.floor(Math.random() * 1000000),
          depositAmount: depositAmount.toFixed(2),
          commission: commission.toFixed(2),
          commissionRate: '50.00',
          status: 'cancelled',
          createdAt: date
        });
      }
      
      const dayName = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][date.getDay()];
      console.log(`${dayName} (${date.toLocaleDateString('pt-BR')}): ✅ ${data.approved} | ⏳ ${data.pending} | ❌ ${data.cancelled}`);
    }
    
    // Verify the data
    const allConversions = await db.select().from(affiliateConversions).where(eq(affiliateConversions.affiliateId, affiliateId));
    
    const stats = allConversions.reduce((acc, conv) => {
      const status = conv.status || 'pending';
      acc[status] = (acc[status] || 0) + 1;
      acc[`${status}Amount`] = (acc[`${status}Amount`] || 0) + parseFloat(conv.commission || '0');
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\n✅ DADOS CRIADOS COM SUCESSO!');
    console.log(`Total de conversões: ${allConversions.length}`);
    console.log(`\n📊 Resumo:`);
    console.log(`Aprovadas: ${stats.completed || 0} conversões - R$ ${(stats.completedAmount || 0).toFixed(2)}`);
    console.log(`Pendentes: ${stats.pending || 0} conversões - R$ ${(stats.pendingAmount || 0).toFixed(2)}`);
    console.log(`Canceladas: ${stats.cancelled || 0} conversões - R$ ${(stats.cancelledAmount || 0).toFixed(2)}`);
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    process.exit();
  }
}

createRealTestData();
