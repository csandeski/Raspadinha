// Add display_id column to partners_withdrawals table if it doesn't exist
import { db } from './server/db.js';
import { sql } from 'drizzle-orm';

async function addDisplayIdColumn() {
  console.log('📋 Verificando e adicionando coluna display_id na tabela partners_withdrawals...\n');
  
  try {
    // Check if column exists
    const checkColumn = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'partners_withdrawals' 
      AND column_name = 'display_id'
    `);
    
    if (checkColumn.rows.length > 0) {
      console.log('✅ Coluna display_id já existe');
    } else {
      console.log('➕ Adicionando coluna display_id...');
      
      // Add the column
      await db.execute(sql`
        ALTER TABLE partners_withdrawals 
        ADD COLUMN IF NOT EXISTS display_id INTEGER
      `);
      
      // Generate display IDs for existing records
      const existingRecords = await db.execute(sql`
        SELECT id FROM partners_withdrawals WHERE display_id IS NULL
      `);
      
      for (const record of existingRecords.rows) {
        const displayId = Math.floor(10000 + Math.random() * 90000);
        await db.execute(sql`
          UPDATE partners_withdrawals 
          SET display_id = ${displayId}
          WHERE id = ${record.id}
        `);
      }
      
      console.log('✅ Coluna display_id adicionada com sucesso');
    }
    
    // Show sample data
    const sampleData = await db.execute(sql`
      SELECT id, partner_id, display_id, amount, status 
      FROM partners_withdrawals 
      LIMIT 5
    `);
    
    console.log('\n📊 Dados atuais na tabela partners_withdrawals:');
    if (sampleData.rows.length === 0) {
      console.log('   Nenhum saque de parceiro encontrado (tabela vazia)');
    } else {
      console.log('   Amostra de dados:');
      sampleData.rows.forEach(row => {
        console.log(`   ID: ${row.id}, Partner: ${row.partner_id}, Display: ${row.display_id}, Valor: ${row.amount}, Status: ${row.status}`);
      });
    }
    
    console.log('\n✅ Tabela partners_withdrawals pronta para uso!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
  
  process.exit(0);
}

addDisplayIdColumn();