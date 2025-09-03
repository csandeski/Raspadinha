import { db } from './server/db';
import { partners } from './shared/schema';
import bcrypt from 'bcrypt';

async function createTestPartner() {
  try {
    // Create a test partner
    const hashedPassword = await bcrypt.hash('teste123', 10);
    
    const [newPartner] = await db.insert(partners).values({
      affiliateId: 12, // Using known affiliate ID
      name: 'Parceiro Teste Links',
      email: 'parceiro.teste@example.com',
      phone: '11999999999',
      cpf: '12345678901',
      password: hashedPassword,
      code: 'TESTLINKS',
      pixKey: '11999999999',
      pixKeyType: 'phone',
      commissionPercentage: '50',
      commissionType: 'percentage',
      isActive: true,
      createdAt: new Date()
    }).returning();
    
    console.log('Partner created successfully!');
    console.log('Email:', newPartner.email);
    console.log('Password: teste123');
    console.log('Code:', newPartner.code);
    console.log('ID:', newPartner.id);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

createTestPartner();
