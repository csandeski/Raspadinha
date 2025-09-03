import { db } from './server/db';
import { users, affiliateConversions, deposits, affiliateCodes } from './shared/schema';
import { eq, and, sql } from 'drizzle-orm';

async function createNetworkTestUsers() {
  try {
    // First get the affiliate (ID 12 or 15)
    const affiliateId = 12; // Afiliado Master
    
    // Get affiliate codes
    const affiliateCodes = await db.query.affiliateCodes.findMany({
      where: (codes, { eq }) => eq(codes.affiliateId, affiliateId)
    });
    
    if (affiliateCodes.length === 0) {
      console.log("No affiliate codes found for affiliate", affiliateId);
      return;
    }
    
    const code = affiliateCodes[0].code;
    console.log("Using affiliate code:", code);
    
    // Create test users that registered with this code
    const testUsers = [
      {
        name: 'João Silva',
        email: 'joao.teste@example.com',
        phone: '11987654321',
        referredBy: code, // This links the user to the affiliate
        createdAt: new Date('2025-08-18T10:00:00'),
      },
      {
        name: 'Maria Santos',
        email: 'maria.teste@example.com',
        phone: '11987654322',
        referredBy: code,
        createdAt: new Date('2025-08-18T14:30:00'),
      },
      {
        name: 'Pedro Costa',
        email: 'pedro.teste@example.com',
        phone: '11987654323',
        referredBy: code,
        createdAt: new Date('2025-08-17T09:15:00'),
      },
      {
        name: 'Ana Oliveira',
        email: 'ana.teste@example.com',
        phone: '11987654324',
        referredBy: code,
        createdAt: new Date('2025-08-16T18:45:00'),
      },
      {
        name: 'Carlos Souza',
        email: 'carlos.teste@example.com',
        phone: '11987654325',
        referredBy: code,
        createdAt: new Date('2025-08-15T12:20:00'),
      }
    ];
    
    for (const userData of testUsers) {
      // Check if user already exists
      const existingUser = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.email, userData.email)
      });
      
      if (existingUser) {
        console.log(`User ${userData.email} already exists, skipping...`);
        continue;
      }
      
      // Create user
      const [newUser] = await db.insert(users).values({
        ...userData,
        password: '$2b$10$dummy', // Dummy password hash
        isAffiliate: false,
        balance: '0'
      }).returning();
      
      console.log(`Created user: ${newUser.name} (ID: ${newUser.id})`);
      
      // Update affiliate code stats
      await db.execute(
        `UPDATE affiliate_codes 
         SET total_registrations = total_registrations + 1 
         WHERE code = '${code}'`
      );
      
      // Create some conversions for some users (deposits)
      const shouldHaveDeposit = Math.random() > 0.4; // 60% chance of deposit
      if (shouldHaveDeposit) {
        const depositAmount = Math.floor(Math.random() * 200 + 50) * 100; // Random amount between R$50 and R$250
        const commissionRate = 40; // 40% commission for Bronze level
        const commission = (depositAmount / 100) * (commissionRate / 100);
        
        // Create deposit record
        const displayId = Math.floor(Math.random() * 900000) + 100000; // Random 6-digit number
        const [deposit] = await db.insert(deposits).values({
          userId: newUser.id,
          displayId: displayId,
          amount: String(depositAmount / 100),
          status: Math.random() > 0.3 ? 'completed' : 'pending', // 70% completed, 30% pending
          transactionId: `TEST_${Date.now()}_${newUser.id}`,
          paymentProvider: 'IronPay'
        }).returning();
        
        // Create affiliate conversion
        const [conversion] = await db.insert(affiliateConversions).values({
          affiliateId: affiliateId,
          userId: newUser.id,
          influencerId: null,
          conversionType: 'deposit',
          conversionValue: String(depositAmount / 100),
          commission: String(commission),
          commissionRate: String(commissionRate),
          status: deposit.status === 'completed' ? 'completed' : 'pending',
          conversionDate: userData.createdAt
        }).returning();
        
        console.log(`  - Created ${deposit.status} deposit of R$ ${depositAmount/100} with commission R$ ${commission}`);
        
        // Update affiliate code deposit stats if completed
        if (deposit.status === 'completed') {
          await db.execute(
            `UPDATE affiliate_codes 
             SET total_deposits = total_deposits + 1 
             WHERE code = '${code}'`
          );
        }
      }
    }
    
    console.log("\n✅ Test network users created successfully!");
    console.log("Check the 'Minha Rede' section in the affiliate panel to see the results.");
    
  } catch (error) {
    console.error("Error creating test users:", error);
  }
}

createNetworkTestUsers();