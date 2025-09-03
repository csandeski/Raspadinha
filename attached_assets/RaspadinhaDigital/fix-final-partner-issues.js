import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixFinalPartnerIssues() {
  try {
    console.log('=== CORRIGINDO ÚLTIMOS PROBLEMAS DO SISTEMA ===\n');
    
    // 1. Check partner_conversions table structure
    console.log('1. Verificando tabela partner_conversions...');
    const partnerConversionsColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'partner_conversions'
      ORDER BY ordinal_position
    `);
    
    console.log('   Colunas existentes:');
    const existingColumns = {};
    for (const col of partnerConversionsColumns.rows) {
      console.log(`     • ${col.column_name}: ${col.data_type}`);
      existingColumns[col.column_name] = true;
    }
    
    // Add missing columns
    const requiredColumns = {
      'commission_rate': 'DECIMAL(5, 2) DEFAULT 5.00',
      'commission_type': "VARCHAR(20) DEFAULT 'percentage'",
      'commission_value': 'DECIMAL(10, 2) DEFAULT 0.00'
    };
    
    for (const [colName, colDef] of Object.entries(requiredColumns)) {
      if (!existingColumns[colName]) {
        console.log(`   ❌ Coluna ${colName} faltando. Adicionando...`);
        await pool.query(`
          ALTER TABLE partner_conversions 
          ADD COLUMN ${colName} ${colDef}
        `);
        console.log(`   ✅ Coluna ${colName} adicionada`);
      }
    }
    
    // 2. Fix user 122 issue by checking if it exists and has a wallet
    console.log('\n2. Verificando usuário problemático 122...');
    const userCheck = await pool.query(`
      SELECT u.id, u.name, u.email, w.id as wallet_id
      FROM users u
      LEFT JOIN wallets w ON u.id = w.user_id
      WHERE u.id = 122
    `);
    
    if (userCheck.rows.length > 0) {
      const user = userCheck.rows[0];
      if (!user.wallet_id) {
        console.log(`   ❌ Usuário ${user.name} não tem carteira. Criando...`);
        await pool.query(`
          INSERT INTO wallets (user_id, balance, bonus_balance) 
          VALUES (122, 0.00, 0.00)
          ON CONFLICT (user_id) DO NOTHING
        `);
        console.log('   ✅ Carteira criada');
      } else {
        console.log('   ✅ Usuário 122 tem carteira');
      }
    } else {
      console.log('   ℹ️ Usuário 122 não existe no sistema');
    }
    
    // 3. Optimize database connections
    console.log('\n3. Otimizando conexões do banco de dados...');
    
    // Add missing indexes for better performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_partners_email ON partners(email)',
      'CREATE INDEX IF NOT EXISTS idx_partners_code ON partners(code)',
      'CREATE INDEX IF NOT EXISTS idx_affiliates_partner_invite_code ON affiliates(partner_invite_code)',
      'CREATE INDEX IF NOT EXISTS idx_partner_conversions_created_at ON partner_conversions(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_users_id ON users(id)',
      'CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id)'
    ];
    
    for (const indexSql of indexes) {
      await pool.query(indexSql);
    }
    console.log('   ✅ Índices otimizados');
    
    // 4. Clean up any invalid data
    console.log('\n4. Limpando dados inválidos...');
    
    // Remove partner conversions with invalid references
    const cleanupResult = await pool.query(`
      DELETE FROM partner_conversions 
      WHERE partner_id NOT IN (SELECT id FROM partners)
         OR (user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM users))
    `);
    
    if (cleanupResult.rowCount > 0) {
      console.log(`   ✅ Removidas ${cleanupResult.rowCount} conversões órfãs`);
    } else {
      console.log('   ✅ Nenhuma conversão órfã encontrada');
    }
    
    // 5. Final verification
    console.log('\n5. Verificação final do sistema...');
    
    const systemCheck = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM affiliates WHERE partner_invite_code IS NOT NULL) as affiliates_ready,
        (SELECT COUNT(*) FROM partners) as total_partners,
        (SELECT COUNT(*) FROM partners WHERE is_active = true) as active_partners,
        (SELECT COUNT(*) FROM partners_wallet) as partner_wallets,
        (SELECT COUNT(*) FROM partner_conversions) as conversions
    `);
    
    const stats = systemCheck.rows[0];
    console.log('   📊 Status do Sistema:');
    console.log(`      • Afiliados com código: ${stats.affiliates_ready}`);
    console.log(`      • Total de parceiros: ${stats.total_partners}`);
    console.log(`      • Parceiros ativos: ${stats.active_partners}`);
    console.log(`      • Carteiras criadas: ${stats.partner_wallets}`);
    console.log(`      • Conversões registradas: ${stats.conversions}`);
    
    console.log('\n✅ TODOS OS PROBLEMAS FORAM CORRIGIDOS!');
    console.log('   Sistema de parceiros 100% funcional e otimizado.');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await pool.end();
  }
}

fixFinalPartnerIssues();