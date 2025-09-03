import { db } from './server/db';
import { affiliateConversions } from './shared/schema';
import { eq, and, gte } from 'drizzle-orm';

async function verifyData() {
  try {
    const affiliateId = 12;
    
    // Get all conversions for this affiliate
    const conversions = await db
      .select()
      .from(affiliateConversions)
      .where(eq(affiliateConversions.affiliateId, affiliateId));
    
    console.log(`\n=== DADOS REAIS DO AFILIADO ${affiliateId} ===`);
    console.log(`Total de conversões: ${conversions.length}`);
    
    // Count by status
    const statusCounts = conversions.reduce((acc, conv) => {
      const status = conv.status || 'pending';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\nContagem por Status:');
    console.log(`✅ Completed: ${statusCounts.completed || 0}`);
    console.log(`⏳ Pending: ${statusCounts.pending || 0}`);
    console.log(`❌ Cancelled: ${statusCounts.cancelled || 0}`);
    console.log(`💰 Paid: ${statusCounts.paid || 0}`);
    
    // Calculate totals
    let totalCompleted = 0;
    let totalPending = 0;
    let totalCancelled = 0;
    
    conversions.forEach(conv => {
      const amount = parseFloat(conv.commission || '0');
      if (conv.status === 'completed' || conv.status === 'paid') {
        totalCompleted += amount;
      } else if (conv.status === 'pending') {
        totalPending += amount;
      } else if (conv.status === 'cancelled') {
        totalCancelled += amount;
      }
    });
    
    console.log('\nValores Totais:');
    console.log(`✅ Comissões Aprovadas: R$ ${totalCompleted.toFixed(2)}`);
    console.log(`⏳ Comissões Pendentes: R$ ${totalPending.toFixed(2)}`);
    console.log(`❌ Comissões Canceladas: R$ ${totalCancelled.toFixed(2)}`);
    
    // Get last 7 days data
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentConversions = conversions.filter(conv => 
      new Date(conv.createdAt) >= sevenDaysAgo
    );
    
    console.log(`\n=== ÚLTIMOS 7 DIAS ===`);
    console.log(`Total de conversões: ${recentConversions.length}`);
    
    // Group by day and status
    const dayData: Record<string, Record<string, number>> = {};
    
    recentConversions.forEach(conv => {
      const date = new Date(conv.createdAt).toLocaleDateString('pt-BR');
      if (!dayData[date]) {
        dayData[date] = { completed: 0, pending: 0, cancelled: 0 };
      }
      
      const status = conv.status || 'pending';
      if (status === 'completed' || status === 'paid') {
        dayData[date].completed++;
      } else if (status === 'pending') {
        dayData[date].pending++;
      } else if (status === 'cancelled') {
        dayData[date].cancelled++;
      }
    });
    
    console.log('\nPor dia:');
    Object.entries(dayData).forEach(([date, counts]) => {
      console.log(`${date}: ✅ ${counts.completed} | ⏳ ${counts.pending} | ❌ ${counts.cancelled}`);
    });
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    process.exit();
  }
}

verifyData();
