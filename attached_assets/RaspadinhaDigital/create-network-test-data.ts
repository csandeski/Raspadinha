import { db } from './server/db';
import { users, affiliateConversions, deposits } from './shared/schema';
import { eq, and } from 'drizzle-orm';

async function createNetworkTestData() {
  try {
    const affiliateId = 15; // teste2@afiliado.com
    const affiliateCode = 'TESTE2025';
    
    console.log('Criando dados de teste para a rede do afiliado teste2...\n');
    
    // Get existing users registered with this affiliate code
    const networkUsers = await db.select().from(users).where(eq(users.affiliateCode, affiliateCode));
    
    console.log(`Usuários encontrados com código ${affiliateCode}: ${networkUsers.length}`);
    
    if (networkUsers.length > 0) {
      for (const user of networkUsers) {
        console.log(`\nUsuário: ${user.name} (ID: ${user.id})`);
        console.log(`Cadastrado em: ${new Date(user.createdAt).toLocaleString('pt-BR')}`);
        
        // Get conversions for this user
        const conversions = await db
          .select()
          .from(affiliateConversions)
          .where(
            and(
              eq(affiliateConversions.affiliateId, affiliateId),
              eq(affiliateConversions.userId, user.id)
            )
          );
        
        console.log(`Conversões encontradas: ${conversions.length}`);
        
        let completedTotal = 0;
        let pendingTotal = 0;
        let cancelledTotal = 0;
        
        conversions.forEach(conv => {
          const amount = parseFloat(conv.commission || '0');
          if (conv.status === 'completed') completedTotal += amount;
          else if (conv.status === 'pending') pendingTotal += amount;
          else if (conv.status === 'cancelled') cancelledTotal += amount;
        });
        
        console.log(`Comissões - Aprovada: R$ ${completedTotal.toFixed(2)}, Pendente: R$ ${pendingTotal.toFixed(2)}, Cancelada: R$ ${cancelledTotal.toFixed(2)}`);
      }
    } else {
      console.log('\nNenhum usuário encontrado com este código. Criando usuários de teste...\n');
      
      // Create test users with this affiliate code
      const testUsers = [
        { name: 'João Silva', email: 'joao.test@example.com', phone: '11987654321', createdAt: new Date('2025-08-15 10:30:00') },
        { name: 'Maria Santos', email: 'maria.test@example.com', phone: '11987654322', createdAt: new Date('2025-08-16 14:20:00') },
        { name: 'Pedro Oliveira', email: 'pedro.test@example.com', phone: '11987654323', createdAt: new Date('2025-08-17 09:15:00') },
        { name: 'Ana Costa', email: 'ana.test@example.com', phone: '11987654324', createdAt: new Date('2025-08-18 16:45:00') },
        { name: 'Carlos Ferreira', email: 'carlos.test@example.com', phone: '11987654325', createdAt: new Date('2025-08-18 18:30:00') }
      ];
      
      for (const userData of testUsers) {
        const [newUser] = await db.insert(users).values({
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          password: '$2b$10$test',
          affiliateCode: affiliateCode,
          isActive: true,
          createdAt: userData.createdAt
        }).returning();
        
        console.log(`Criado usuário: ${newUser.name} (ID: ${newUser.id})`);
        console.log(`Cadastrado em: ${userData.createdAt.toLocaleString('pt-BR')}`);
        
        // Create some conversions for this user
        const hasDeposit = Math.random() > 0.3; // 70% chance of having deposits
        
        if (hasDeposit) {
          const depositAmount = (Math.random() * 300 + 50); // Random between 50-350
          const commission = depositAmount * 0.5; // 50% commission
          const status = Math.random() < 0.6 ? 'completed' : (Math.random() < 0.5 ? 'pending' : 'cancelled');
          
          await db.insert(affiliateConversions).values({
            affiliateId,
            userId: newUser.id,
            conversionType: 'deposit',
            conversionValue: depositAmount.toFixed(2),
            depositId: Math.floor(Math.random() * 1000000),
            depositAmount: depositAmount.toFixed(2),
            commission: commission.toFixed(2),
            commissionRate: '50.00',
            status,
            createdAt: userData.createdAt
          });
          
          console.log(`  → Depósito ${status}: R$ ${depositAmount.toFixed(2)} (Comissão: R$ ${commission.toFixed(2)})`);
        } else {
          console.log(`  → Sem depósitos ainda`);
        }
      }
    }
    
    console.log('\n✅ Dados de rede verificados/criados com sucesso!');
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    process.exit();
  }
}

createNetworkTestData();
