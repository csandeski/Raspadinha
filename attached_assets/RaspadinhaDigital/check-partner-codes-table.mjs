// Check partner_codes table structure
import { db } from './server/db.js';
import { sql } from 'drizzle-orm';

async function checkTable() {
  console.log('🔍 Verificando estrutura da tabela partner_codes...\n');
  
  try {
    // Check if table exists
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'partner_codes'
      )
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('❌ Tabela partner_codes NÃO existe!');
      console.log('   Criando tabela partner_codes...');
      
      // Create table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS partner_codes (
          id SERIAL PRIMARY KEY,
          partner_id INTEGER REFERENCES partners(id) NOT NULL,
          code VARCHAR(50) NOT NULL UNIQUE,
          name VARCHAR(255),
          uses INTEGER DEFAULT 0,
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      console.log('✅ Tabela criada com sucesso!');
    } else {
      console.log('✅ Tabela partner_codes existe');
      
      // Get column info
      const columns = await db.execute(sql`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'partner_codes'
        ORDER BY ordinal_position
      `);
      
      console.log('\n📋 Colunas da tabela:');
      columns.rows.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type})`);
      });
    }
    
    // Check if NOVO23 exists
    const novo23 = await db.execute(sql`
      SELECT * FROM partner_codes WHERE UPPER(code) = 'NOVO23'
    `);
    
    if (novo23.rows.length > 0) {
      console.log('\n✅ Código NOVO23 encontrado:');
      console.log(novo23.rows[0]);
    } else {
      console.log('\n❌ Código NOVO23 não existe na tabela');
      
      // Try to insert it
      console.log('   Criando código NOVO23...');
      
      // First check if we have any partners
      const partners = await db.execute(sql`
        SELECT id, name FROM partners LIMIT 1
      `);
      
      if (partners.rows.length > 0) {
        const partnerId = partners.rows[0].id;
        await db.execute(sql`
          INSERT INTO partner_codes (partner_id, code, name, uses, status)
          VALUES (${partnerId}, 'NOVO23', 'Código Promocional', 0, 'active')
          ON CONFLICT (code) DO NOTHING
        `);
        console.log('   ✅ Código NOVO23 criado para parceiro ID:', partnerId);
      } else {
        console.log('   ❌ Nenhum parceiro encontrado para criar o código');
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
  
  process.exit(0);
}

checkTable();
