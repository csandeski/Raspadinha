#!/usr/bin/env node

import bcrypt from 'bcrypt';
import { db } from './server/db.js';
import { adminUsers } from './shared/schema.js';
import { eq } from 'drizzle-orm';

async function createAdminUser() {
  console.log('🔧 Criando usuário admin...\n');
  
  try {
    // Check if admin already exists
    const existingAdmin = await db.select()
      .from(adminUsers)
      .where(eq(adminUsers.username, 'admin'))
      .limit(1);
    
    if (existingAdmin.length > 0) {
      console.log('⚠️  Usuário admin já existe!');
      console.log('🔄 Atualizando senha do admin...');
      
      // Update password
      const hashedPassword = await bcrypt.hash('ManiaBrasil2025@Admin', 10);
      await db.update(adminUsers)
        .set({ password: hashedPassword })
        .where(eq(adminUsers.username, 'admin'));
      
      console.log('✅ Senha do admin atualizada com sucesso!');
    } else {
      // Create new admin user
      const hashedPassword = await bcrypt.hash('ManiaBrasil2025@Admin', 10);
      
      await db.insert(adminUsers).values({
        username: 'admin',
        password: hashedPassword,
        email: 'admin@mania-brasil.com',
        createdAt: new Date()
      });
      
      console.log('✅ Usuário admin criado com sucesso!');
    }
    
    console.log('\n📝 Credenciais do admin:');
    console.log('   Username: admin');
    console.log('   Password: ManiaBrasil2025@Admin');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao criar usuário admin:', error);
    process.exit(1);
  }
}

createAdminUser();