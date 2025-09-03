// Check if NOV23 code exists
import { db } from './server/db.js';
import { sql } from 'drizzle-orm';

async function checkNOV23() {
  console.log('🔍 Verificando código NOV23 no banco de dados...\n');
  
  try {
    // Check in affiliate_codes table
    const result = await db.execute(sql`
      SELECT ac.*, a.name as affiliate_name
      FROM affiliate_codes ac
      LEFT JOIN affiliates a ON ac.affiliate_id = a.id
      WHERE UPPER(ac.code) IN ('NOV23', 'NOVO23')
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Código encontrado:');
      result.rows.forEach(row => {
        console.log(`   Código: ${row.code}`);
        console.log(`   Nome: ${row.name}`);
        console.log(`   Status: ${row.status}`);
        console.log(`   Afiliado: ${row.affiliate_name} (ID: ${row.affiliate_id})`);
        console.log(`   Usos: ${row.uses}`);
        console.log('---');
      });
    } else {
      console.log('❌ Código NOV23/NOVO23 não encontrado');
    }
    
    // Check partner codes
    const partnerResult = await db.execute(sql`
      SELECT pc.*, p.name as partner_name
      FROM partner_codes pc
      LEFT JOIN partners p ON pc.partner_id = p.id
      WHERE UPPER(pc.code) IN ('NOV23', 'NOVO23')
    `);
    
    if (partnerResult.rows.length > 0) {
      console.log('\n✅ Código de parceiro encontrado:');
      partnerResult.rows.forEach(row => {
        console.log(`   Código: ${row.code}`);
        console.log(`   Nome: ${row.name}`);
        console.log(`   Status: ${row.status}`);
        console.log(`   Parceiro: ${row.partner_name} (ID: ${row.partner_id})`);
        console.log(`   Usos: ${row.uses}`);
      });
    } else {
      console.log('\n❌ Código NOV23/NOVO23 não encontrado na tabela partner_codes');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
  
  process.exit(0);
}

checkNOV23();
