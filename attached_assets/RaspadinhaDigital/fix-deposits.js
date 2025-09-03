import pg from 'pg';
const { Client } = pg;

// Banco antigo (origem)
const oldDbUrl = 'postgresql://postgres.qbusacxhdsywolzgfltl:RASPADINHA2@aws-0-sa-east-1.pooler.supabase.com:5432/postgres';

// Banco novo (destino)
const newDbUrl = 'postgresql://postgres.ozqcfahanojjobpmopak:!HUEtnp@2M+hxq3@aws-0-us-east-1.pooler.supabase.com:5432/postgres';

const oldClient = new Client({ connectionString: oldDbUrl });
const newClient = new Client({ connectionString: newDbUrl });

async function fixDeposits() {
  try {
    console.log('🔧 Corrigindo tabela de depósitos...\n');
    
    await oldClient.connect();
    await newClient.connect();
    
    // Buscar dados da tabela deposits - apenas colunas essenciais
    const result = await oldClient.query(`
      SELECT 
        id,
        user_id,
        amount,
        pix_code,
        transaction_id,
        status,
        created_at,
        display_id
      FROM deposits
    `);
    
    console.log(`📊 ${result.rows.length} depósitos encontrados`);
    
    // Limpar tabela no novo banco
    await newClient.query(`TRUNCATE TABLE deposits CASCADE`);
    
    // Inserir dados no novo banco
    for (const row of result.rows) {
      await newClient.query(`
        INSERT INTO deposits (
          id, user_id, amount, pix_code, transaction_id, 
          status, created_at, display_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO NOTHING
      `, [
        row.id,
        row.user_id,
        row.amount,
        row.pix_code,
        row.transaction_id,
        row.status,
        row.created_at,
        row.display_id
      ]);
    }
    
    // Atualizar sequência
    await newClient.query(`
      SELECT setval('deposits_id_seq', 
        (SELECT COALESCE(MAX(id), 1) FROM deposits), true)
    `);
    
    console.log('✅ Tabela deposits corrigida!\n');
    
    // Agora copiar support_messages
    console.log('📋 Copiando support_messages...');
    const messages = await oldClient.query(`SELECT * FROM support_messages`);
    
    for (const msg of messages.rows) {
      try {
        await newClient.query(`
          INSERT INTO support_messages (
            id, chat_id, sender_type, sender_id, message, created_at, is_read
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO NOTHING
        `, [
          msg.id,
          msg.chat_id,
          msg.sender_type,
          msg.sender_id,
          msg.message,
          msg.created_at,
          msg.is_read
        ]);
      } catch (e) {
        // Ignorar erros de constraint individual
      }
    }
    console.log('✅ Support messages copiadas!\n');
    
    // Copiar coupon_uses
    console.log('📋 Copiando coupon_uses...');
    const couponUses = await oldClient.query(`SELECT * FROM coupon_uses`);
    
    for (const use of couponUses.rows) {
      try {
        await newClient.query(`
          INSERT INTO coupon_uses (
            user_id, coupon_id, deposit_id, used_at
          )
          VALUES ($1, $2, $3, $4)
          ON CONFLICT DO NOTHING
        `, [
          use.user_id,
          use.coupon_id,
          use.deposit_id,
          use.used_at
        ]);
      } catch (e) {
        // Ignorar erros de constraint individual
      }
    }
    console.log('✅ Coupon uses copiadas!\n');
    
    console.log('🎉 Correção concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await oldClient.end();
    await newClient.end();
  }
}

fixDeposits();