import pg from 'pg';
const { Client } = pg;

// Banco antigo (origem)
const oldDbUrl = 'postgresql://postgres.qbusacxhdsywolzgfltl:RASPADINHA2@aws-0-sa-east-1.pooler.supabase.com:5432/postgres';

// Banco novo (destino)
const newDbUrl = 'postgresql://postgres.ozqcfahanojjobpmopak:!HUEtnp@2M+hxq3@aws-0-us-east-1.pooler.supabase.com:5432/postgres';

const oldClient = new Client({ connectionString: oldDbUrl });
const newClient = new Client({ connectionString: newDbUrl });

// Lista de tabelas na ordem correta (respeitando dependências)
const tables = [
  'users',
  'wallets',
  'games',
  'game_minigames', 
  'game_premios',
  'deposits',
  'withdrawals',
  'admin_sessions',
  'support_chats',
  'support_messages',
  'referrals',
  'referral_earnings',
  'coupons',
  'coupon_uses',
  'game_probabilities',
  'site_accesses'
];

async function copyTable(tableName) {
  try {
    console.log(`\n📋 Copiando tabela: ${tableName}`);
    
    // Buscar dados da tabela antiga
    const result = await oldClient.query(`SELECT * FROM ${tableName}`);
    
    if (result.rows.length === 0) {
      console.log(`   ⚠️  Tabela ${tableName} está vazia`);
      return;
    }
    
    console.log(`   📊 ${result.rows.length} registros encontrados`);
    
    // Limpar tabela no novo banco (opcional - comentar se quiser preservar dados)
    await newClient.query(`TRUNCATE TABLE ${tableName} CASCADE`);
    
    // Inserir dados no novo banco
    for (const row of result.rows) {
      const columns = Object.keys(row);
      const values = Object.values(row);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      
      const insertQuery = `
        INSERT INTO ${tableName} (${columns.join(', ')})
        VALUES (${placeholders})
        ON CONFLICT DO NOTHING
      `;
      
      await newClient.query(insertQuery, values);
    }
    
    // Atualizar sequências se a tabela tiver ID autoincrement
    if (tableName !== 'site_accesses' && tableName !== 'coupon_uses') {
      try {
        await newClient.query(`
          SELECT setval('${tableName}_id_seq', 
            (SELECT COALESCE(MAX(id), 1) FROM ${tableName}), true)
        `);
      } catch (e) {
        // Ignorar se não houver sequência
      }
    }
    
    console.log(`   ✅ Tabela ${tableName} copiada com sucesso!`);
    
  } catch (error) {
    console.error(`   ❌ Erro ao copiar tabela ${tableName}:`, error.message);
  }
}

async function migrate() {
  try {
    console.log('🚀 Iniciando migração do banco de dados...\n');
    
    // Conectar aos dois bancos
    await oldClient.connect();
    console.log('✅ Conectado ao banco antigo');
    
    await newClient.connect();
    console.log('✅ Conectado ao banco novo\n');
    
    // Copiar cada tabela
    for (const table of tables) {
      await copyTable(table);
    }
    
    console.log('\n🎉 Migração concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
  } finally {
    await oldClient.end();
    await newClient.end();
  }
}

// Executar migração
migrate();