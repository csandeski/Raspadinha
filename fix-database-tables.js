import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function fixDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔧 Iniciando correção do banco de dados...\n');

    // 1. Criar tabelas de marketing se não existirem
    console.log('📊 Criando tabelas de marketing links...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS marketing_links (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        source TEXT NOT NULL,
        url TEXT NOT NULL UNIQUE,
        short_code TEXT NOT NULL UNIQUE,
        utm_source TEXT,
        utm_medium TEXT,
        utm_campaign TEXT,
        utm_content TEXT,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        total_clicks INTEGER DEFAULT 0,
        total_registrations INTEGER DEFAULT 0,
        total_deposits INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela marketing_links criada/verificada');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS marketing_clicks (
        id SERIAL PRIMARY KEY,
        marketing_link_id INTEGER NOT NULL REFERENCES marketing_links(id),
        ip TEXT,
        user_agent TEXT,
        referrer TEXT,
        device_type TEXT,
        os TEXT,
        browser TEXT,
        city TEXT,
        country TEXT,
        clicked_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela marketing_clicks criada/verificada');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS marketing_conversions (
        id SERIAL PRIMARY KEY,
        marketing_link_id INTEGER NOT NULL REFERENCES marketing_links(id),
        user_id INTEGER NOT NULL REFERENCES users(id),
        registered_at TIMESTAMP DEFAULT NOW(),
        first_deposit_at TIMESTAMP,
        first_deposit_amount DECIMAL(10, 2),
        total_deposited DECIMAL(10, 2) DEFAULT 0.00,
        total_wagered DECIMAL(10, 2) DEFAULT 0.00
      )
    `);
    console.log('✅ Tabela marketing_conversions criada/verificada\n');

    // 2. Adicionar coluna affiliate_id na tabela users se não existir
    console.log('🔧 Verificando e adicionando coluna affiliate_id em users...');
    
    const userColumnsCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'affiliate_id'
    `);
    
    if (userColumnsCheck.rows.length === 0) {
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN affiliate_id INTEGER REFERENCES affiliates(id)
      `);
      console.log('✅ Coluna affiliate_id adicionada na tabela users');
    } else {
      console.log('✅ Coluna affiliate_id já existe na tabela users');
    }
    
    // 3. Adicionar colunas faltantes na tabela affiliates se não existirem
    console.log('\n🔧 Verificando e adicionando colunas na tabela affiliates...');
    
    // Verificar se as colunas existem
    const columnsCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'affiliates'
    `);
    
    const existingColumns = columnsCheck.rows.map(row => row.column_name);
    
    // Adicionar total_clicks se não existir
    if (!existingColumns.includes('total_clicks')) {
      await pool.query(`
        ALTER TABLE affiliates 
        ADD COLUMN IF NOT EXISTS total_clicks INTEGER DEFAULT 0
      `);
      console.log('✅ Coluna total_clicks adicionada');
    }
    
    // Adicionar total_registrations se não existir
    if (!existingColumns.includes('total_registrations')) {
      await pool.query(`
        ALTER TABLE affiliates 
        ADD COLUMN IF NOT EXISTS total_registrations INTEGER DEFAULT 0
      `);
      console.log('✅ Coluna total_registrations adicionada');
    }
    
    // Adicionar total_deposits se não existir
    if (!existingColumns.includes('total_deposits')) {
      await pool.query(`
        ALTER TABLE affiliates 
        ADD COLUMN IF NOT EXISTS total_deposits INTEGER DEFAULT 0
      `);
      console.log('✅ Coluna total_deposits adicionada');
    }

    // Adicionar paid_earnings se não existir
    if (!existingColumns.includes('paid_earnings')) {
      await pool.query(`
        ALTER TABLE affiliates 
        ADD COLUMN IF NOT EXISTS paid_earnings DECIMAL(10, 2) DEFAULT 0.00
      `);
      console.log('✅ Coluna paid_earnings adicionada');
    }

    // 3. Verificar e criar índices para melhor performance
    console.log('\n📈 Criando índices para melhor performance...');
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_marketing_links_short_code 
      ON marketing_links(short_code)
    `);
    console.log('✅ Índice para short_code criado');
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_marketing_clicks_link_id 
      ON marketing_clicks(marketing_link_id)
    `);
    console.log('✅ Índice para marketing_clicks criado');
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_marketing_conversions_link_id 
      ON marketing_conversions(marketing_link_id)
    `);
    console.log('✅ Índice para marketing_conversions criado');
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_affiliates_code 
      ON affiliates(code)
    `);
    console.log('✅ Índice para código de afiliado criado');

    // 4. Verificar integridade referencial
    console.log('\n🔍 Verificando integridade referencial...');
    
    // Verificar se há conversões de afiliados órfãs
    const orphanConversions = await pool.query(`
      SELECT COUNT(*) as count 
      FROM affiliate_conversions ac
      LEFT JOIN affiliates a ON ac.affiliate_id = a.id
      WHERE a.id IS NULL
    `);
    
    if (orphanConversions.rows[0].count > 0) {
      console.log(`⚠️  Encontradas ${orphanConversions.rows[0].count} conversões órfãs`);
      // Limpar conversões órfãs
      await pool.query(`
        DELETE FROM affiliate_conversions 
        WHERE affiliate_id NOT IN (SELECT id FROM affiliates)
      `);
      console.log('✅ Conversões órfãs removidas');
    } else {
      console.log('✅ Nenhuma conversão órfã encontrada');
    }

    // 5. Atualizar estatísticas dos afiliados existentes
    console.log('\n📊 Atualizando estatísticas dos afiliados...');
    
    const affiliatesResult = await pool.query('SELECT id FROM affiliates');
    
    for (const affiliate of affiliatesResult.rows) {
      // Contar cliques
      const clicksResult = await pool.query(
        'SELECT COUNT(*) as count FROM affiliate_clicks WHERE affiliate_id = $1',
        [affiliate.id]
      );
      
      // Contar registros
      const registrationsResult = await pool.query(
        `SELECT COUNT(*) as count FROM affiliate_conversions 
         WHERE affiliate_id = $1 AND conversion_type = 'registration'`,
        [affiliate.id]
      );
      
      // Contar depósitos
      const depositsResult = await pool.query(
        `SELECT COUNT(*) as count FROM affiliate_conversions 
         WHERE affiliate_id = $1 AND conversion_type = 'deposit'`,
        [affiliate.id]
      );
      
      // Atualizar estatísticas
      await pool.query(
        `UPDATE affiliates 
         SET total_clicks = $1, 
             total_registrations = $2, 
             total_deposits = $3
         WHERE id = $4`,
        [
          clicksResult.rows[0].count,
          registrationsResult.rows[0].count,
          depositsResult.rows[0].count,
          affiliate.id
        ]
      );
    }
    
    console.log(`✅ Estatísticas atualizadas para ${affiliatesResult.rows.length} afiliados`);

    // 6. Criar alguns links de exemplo se não existirem
    console.log('\n🎯 Verificando links de marketing de exemplo...');
    
    const existingLinks = await pool.query('SELECT COUNT(*) as count FROM marketing_links');
    
    if (existingLinks.rows[0].count === 0) {
      console.log('📝 Criando links de exemplo...');
      
      const sampleLinks = [
        {
          name: 'Instagram - Campanha Principal',
          source: 'instagram',
          utmSource: 'instagram',
          utmMedium: 'social',
          utmCampaign: 'principal_2025',
          description: 'Link principal para o Instagram'
        },
        {
          name: 'TikTok - Promoção',
          source: 'tiktok',
          utmSource: 'tiktok',
          utmMedium: 'social',
          utmCampaign: 'promocao_2025',
          description: 'Campanha promocional no TikTok'
        },
        {
          name: 'WhatsApp - Grupo VIP',
          source: 'whatsapp',
          utmSource: 'whatsapp',
          utmMedium: 'social',
          utmCampaign: 'grupo_vip',
          description: 'Link para grupos VIP do WhatsApp'
        }
      ];
      
      for (const link of sampleLinks) {
        const shortCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const url = `https://mania-brasil.com?utm_source=${link.utmSource}&utm_medium=${link.utmMedium}&utm_campaign=${link.utmCampaign}&src=${shortCode}`;
        
        await pool.query(
          `INSERT INTO marketing_links 
           (name, source, url, short_code, utm_source, utm_medium, utm_campaign, description, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)`,
          [link.name, link.source, url, shortCode, link.utmSource, link.utmMedium, link.utmCampaign, link.description]
        );
      }
      
      console.log('✅ Links de exemplo criados');
    } else {
      console.log('✅ Links de marketing já existem');
    }

    console.log('\n✨ Correção do banco de dados concluída com sucesso!');
    console.log('📌 Todas as tabelas e colunas foram verificadas e corrigidas.');
    console.log('🚀 O sistema de afiliados e marketing links está pronto para uso!\n');

  } catch (error) {
    console.error('❌ Erro ao corrigir banco de dados:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Executar a correção
fixDatabase().catch(console.error);