// Create NOVO23 partner code
import { db } from './server/db.js';
import { sql } from 'drizzle-orm';

async function createNOVO23() {
  console.log('🔧 Criando código NOVO23 para parceiros...\n');
  
  try {
    // First check if the code already exists
    const existing = await db.execute(sql`
      SELECT * FROM partner_codes WHERE UPPER(code) = 'NOVO23'
    `);
    
    if (existing.rows.length > 0) {
      console.log('✅ Código NOVO23 já existe!');
      console.log('   ID:', existing.rows[0].id);
      console.log('   Partner ID:', existing.rows[0].partner_id);
      console.log('   Status:', existing.rows[0].status);
      return;
    }
    
    // Get first partner to associate the code
    const partners = await db.execute(sql`
      SELECT id, name FROM partners ORDER BY id LIMIT 1
    `);
    
    if (partners.rows.length === 0) {
      console.log('❌ Nenhum parceiro encontrado no banco de dados');
      console.log('   Criando um parceiro de teste...');
      
      // Create a test partner
      const newPartner = await db.execute(sql`
        INSERT INTO partners (
          affiliate_id, 
          name, 
          email, 
          password, 
          commission_type, 
          commission_rate,
          status
        ) VALUES (
          1,
          'Parceiro Teste',
          'parceiro.teste@example.com',
          'teste123',
          'percentage',
          10.00,
          'active'
        ) RETURNING id, name
      `);
      
      if (newPartner.rows.length > 0) {
        console.log('✅ Parceiro criado:', newPartner.rows[0].name);
        partners.rows = newPartner.rows;
      }
    }
    
    const partnerId = partners.rows[0].id;
    console.log('📝 Criando código NOVO23 para parceiro ID:', partnerId);
    
    // Create the NOVO23 code
    await db.execute(sql`
      INSERT INTO partner_codes (partner_id, code, name, status)
      VALUES (${partnerId}, 'NOVO23', 'Código Promocional', 'active')
    `);
    
    console.log('✅ Código NOVO23 criado com sucesso!');
    
    // Verify creation
    const verify = await db.execute(sql`
      SELECT * FROM partner_codes WHERE code = 'NOVO23'
    `);
    
    if (verify.rows.length > 0) {
      console.log('\n✅ Verificação: Código NOVO23 está ativo e pronto para uso!');
      console.log('   Partner ID:', verify.rows[0].partner_id);
      console.log('   Status:', verify.rows[0].status);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    
    // If partner_codes table doesn't exist, create it
    if (error.message.includes('does not exist')) {
      console.log('\n📋 Tentando criar tabela partner_codes...');
      
      try {
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS partner_codes (
            id SERIAL PRIMARY KEY,
            partner_id INTEGER REFERENCES partners(id),
            code VARCHAR(50) NOT NULL UNIQUE,
            name VARCHAR(255),
            status VARCHAR(20) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          )
        `);
        
        console.log('✅ Tabela partner_codes criada!');
        console.log('   Execute o script novamente para criar o código.');
      } catch (createError) {
        console.error('❌ Erro ao criar tabela:', createError.message);
      }
    }
  }
  
  process.exit(0);
}

createNOVO23();