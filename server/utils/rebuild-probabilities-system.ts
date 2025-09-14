import { pool } from '../db';

// Script para reconstruir completamente o sistema de probabilidades

export async function rebuildProbabilitiesSystem() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Iniciando reconstrução do sistema de probabilidades...');
    
    // 1. LIMPAR DADOS ANTIGOS
    console.log('\n📦 Etapa 1: Limpando dados antigos...');
    
    // Deletar todas as linhas da tabela prize_probabilities
    await client.query('DELETE FROM prize_probabilities');
    console.log('✅ Tabela prize_probabilities limpa');
    
    // 2. CRIAR NOVO SCHEMA NORMALIZADO
    console.log('\n📦 Etapa 2: Criando novo schema normalizado...');
    
    // Criar tabela scratch_games
    await client.query(`
      CREATE TABLE IF NOT EXISTS scratch_games (
        id SERIAL PRIMARY KEY,
        game_key VARCHAR(50) UNIQUE NOT NULL,
        title VARCHAR(100) NOT NULL,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela scratch_games criada');
    
    // Criar tabela game_prizes
    await client.query(`
      CREATE TABLE IF NOT EXISTS game_prizes (
        id SERIAL PRIMARY KEY,
        game_key VARCHAR(50) NOT NULL,
        prize_value DECIMAL(10,2) NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        asset_path VARCHAR(255),
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (game_key) REFERENCES scratch_games(game_key) ON DELETE CASCADE
      )
    `);
    console.log('✅ Tabela game_prizes criada');
    
    // Criar tabela game_prize_probabilities
    await client.query(`
      CREATE TABLE IF NOT EXISTS game_prize_probabilities (
        id SERIAL PRIMARY KEY,
        game_key VARCHAR(50) NOT NULL,
        prize_id INTEGER NOT NULL,
        probability DECIMAL(10,6) NOT NULL CHECK (probability >= 0 AND probability <= 100),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (game_key) REFERENCES scratch_games(game_key) ON DELETE CASCADE,
        FOREIGN KEY (prize_id) REFERENCES game_prizes(id) ON DELETE CASCADE,
        UNIQUE(game_key, prize_id)
      )
    `);
    console.log('✅ Tabela game_prize_probabilities criada');
    
    // Criar tabela probability_audit_log
    await client.query(`
      CREATE TABLE IF NOT EXISTS probability_audit_log (
        id SERIAL PRIMARY KEY,
        admin_username VARCHAR(100) NOT NULL,
        game_key VARCHAR(50) NOT NULL,
        changes JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tabela probability_audit_log criada');
    
    // 3. POPULAR COM DADOS REAIS
    console.log('\n📦 Etapa 3: Populando com dados reais dos jogos...');
    
    // Inserir jogos
    await client.query(`
      INSERT INTO scratch_games (game_key, title) VALUES
      ('premio_pix_conta', 'Prêmio PIX na Conta'),
      ('premio_me_mimei', 'Me Mimei'),
      ('premio_eletronicos', 'Eletrônicos'),
      ('premio_super_premios', 'Super Prêmios')
      ON CONFLICT (game_key) DO NOTHING
    `);
    console.log('✅ Jogos inseridos');
    
    // JOGO 1: premio_pix_conta
    const pixPrizes = [
      { value: 100000, name: 'R$ 100.000,00', path: '/premios/pix/100000.webp' },
      { value: 10000, name: 'R$ 10.000,00', path: '/premios/pix/10000.webp' },
      { value: 5000, name: 'R$ 5.000,00', path: '/premios/pix/5000.webp' },
      { value: 2000, name: 'R$ 2.000,00', path: '/premios/pix/2000.webp' },
      { value: 1000, name: 'R$ 1.000,00', path: '/premios/pix/1000.webp' },
      { value: 500, name: 'R$ 500,00', path: '/premios/pix/500.webp' },
      { value: 200, name: 'R$ 200,00', path: '/premios/pix/200.webp' },
      { value: 100, name: 'R$ 100,00', path: '/premios/pix/100.webp' },
      { value: 50, name: 'R$ 50,00', path: '/premios/pix/50.webp' },
      { value: 20, name: 'R$ 20,00', path: '/premios/pix/20.webp' },
      { value: 15, name: 'R$ 15,00', path: '/premios/pix/15.webp' },
      { value: 10, name: 'R$ 10,00', path: '/premios/pix/10.webp' },
      { value: 5, name: 'R$ 5,00', path: '/premios/pix/5.webp' },
      { value: 4, name: 'R$ 4,00', path: '/premios/pix/4.webp' },
      { value: 3, name: 'R$ 3,00', path: '/premios/pix/3.webp' },
      { value: 2, name: 'R$ 2,00', path: '/premios/pix/2.webp' },
      { value: 1, name: 'R$ 1,00', path: '/premios/pix/1.webp' },
      { value: 0.5, name: 'R$ 0,50', path: '/premios/pix/0.5.webp' }
    ];
    
    for (const prize of pixPrizes) {
      await client.query(
        `INSERT INTO game_prizes (game_key, prize_value, display_name, asset_path) 
         VALUES ($1, $2, $3, $4)`,
        ['premio_pix_conta', prize.value, prize.name, prize.path]
      );
    }
    console.log('✅ Prêmios PIX inseridos');
    
    // JOGO 2: premio_me_mimei
    const mimeiPrizes = [
      { value: 100000, name: 'Anel Vivara (R$ 100.000)', path: '/premios/me-mimei/100000.webp' },
      { value: 10000, name: 'Dyson (R$ 10.000)', path: '/premios/me-mimei/10000.webp' },
      { value: 5000, name: 'Bolsa MK (R$ 5.000)', path: '/premios/me-mimei/5000.webp' },
      { value: 2000, name: 'Kit Kerastase (R$ 2.000)', path: '/premios/me-mimei/2000.webp' },
      { value: 1000, name: 'Kit Bruna Tavares (R$ 1.000)', path: '/premios/me-mimei/1000.webp' },
      { value: 500, name: 'Good Girl (R$ 500)', path: '/premios/me-mimei/500.webp' },
      { value: 200, name: 'Kit WEPINK (R$ 200)', path: '/premios/me-mimei/200.webp' },
      { value: 100, name: 'Bolsa PJ (R$ 100)', path: '/premios/me-mimei/100.webp' },
      { value: 50, name: 'Egeo Dolce (R$ 50)', path: '/premios/me-mimei/50.webp' },
      { value: 20, name: 'Iluminador (R$ 20)', path: '/premios/me-mimei/20.webp' },
      { value: 15, name: 'Máscara (R$ 15)', path: '/premios/me-mimei/15.webp' },
      { value: 10, name: 'Batom (R$ 10)', path: '/premios/me-mimei/10.webp' },
      { value: 5, name: 'R$ 5,00', path: '/premios/me-mimei/5.webp' },
      { value: 4, name: 'R$ 4,00', path: '/premios/me-mimei/4.webp' },
      { value: 3, name: 'R$ 3,00', path: '/premios/me-mimei/3.webp' },
      { value: 2, name: 'R$ 2,00', path: '/premios/me-mimei/2.webp' },
      { value: 1, name: 'R$ 1,00', path: '/premios/me-mimei/1.webp' },
      { value: 0.5, name: 'R$ 0,50', path: '/premios/me-mimei/0.5.webp' }
    ];
    
    for (const prize of mimeiPrizes) {
      await client.query(
        `INSERT INTO game_prizes (game_key, prize_value, display_name, asset_path) 
         VALUES ($1, $2, $3, $4)`,
        ['premio_me_mimei', prize.value, prize.name, prize.path]
      );
    }
    console.log('✅ Prêmios Me Mimei inseridos');
    
    // JOGO 3: premio_eletronicos
    const eletronicosPrizes = [
      { value: 100000, name: 'Kit Apple (R$ 100.000)', path: '/premios/eletronicos/100000.webp' },
      { value: 10000, name: 'iPhone 16 (R$ 10.000)', path: '/premios/eletronicos/10000.webp' },
      { value: 5000, name: 'Notebook Dell (R$ 5.000)', path: '/premios/eletronicos/5000.webp' },
      { value: 2000, name: 'TV 55" (R$ 2.000)', path: '/premios/eletronicos/2000.webp' },
      { value: 1000, name: 'JBL (R$ 1.000)', path: '/premios/eletronicos/1000.webp' },
      { value: 500, name: 'Air Fryer (R$ 500)', path: '/premios/eletronicos/500.webp' },
      { value: 200, name: 'SmartWatch (R$ 200)', path: '/premios/eletronicos/200.webp' },
      { value: 100, name: 'Fone (R$ 100)', path: '/premios/eletronicos/100.webp' },
      { value: 50, name: 'Power Bank (R$ 50)', path: '/premios/eletronicos/50.webp' },
      { value: 20, name: 'Capinha (R$ 20)', path: '/premios/eletronicos/20.webp' },
      { value: 15, name: 'Suporte (R$ 15)', path: '/premios/eletronicos/15.webp' },
      { value: 10, name: 'Cabo (R$ 10)', path: '/premios/eletronicos/10.webp' },
      { value: 5, name: 'R$ 5,00', path: '/premios/eletronicos/5.webp' },
      { value: 4, name: 'R$ 4,00', path: '/premios/eletronicos/4.webp' },
      { value: 3, name: 'R$ 3,00', path: '/premios/eletronicos/3.webp' },
      { value: 2, name: 'R$ 2,00', path: '/premios/eletronicos/2.webp' },
      { value: 1, name: 'R$ 1,00', path: '/premios/eletronicos/1.webp' },
      { value: 0.5, name: 'R$ 0,50', path: '/premios/eletronicos/0.5.webp' }
    ];
    
    for (const prize of eletronicosPrizes) {
      await client.query(
        `INSERT INTO game_prizes (game_key, prize_value, display_name, asset_path) 
         VALUES ($1, $2, $3, $4)`,
        ['premio_eletronicos', prize.value, prize.name, prize.path]
      );
    }
    console.log('✅ Prêmios Eletrônicos inseridos');
    
    // JOGO 4: premio_super_premios
    const superPrizes = [
      { value: 500000, name: 'Super Sorte (R$ 500.000)', path: '/premios/super-premios/500000.webp' },
      { value: 200000, name: 'Jeep (R$ 200.000)', path: '/premios/super-premios/200000.webp' },
      { value: 20000, name: 'Moto (R$ 20.000)', path: '/premios/super-premios/20000.webp' },
      { value: 10000, name: 'Buggy (R$ 10.000)', path: '/premios/super-premios/10000.webp' },
      { value: 4000, name: 'Scooter (R$ 4.000)', path: '/premios/super-premios/4000.webp' },
      { value: 2000, name: 'Patinete (R$ 2.000)', path: '/premios/super-premios/2000.webp' },
      { value: 1000, name: 'HoverBoard (R$ 1.000)', path: '/premios/super-premios/1000.webp' },
      { value: 400, name: 'Bike (R$ 400)', path: '/premios/super-premios/400.webp' },
      { value: 300, name: 'Capacete (R$ 300)', path: '/premios/super-premios/300.webp' },
      { value: 200, name: 'Óculos (R$ 200)', path: '/premios/super-premios/200.webp' },
      { value: 100, name: 'R$ 100,00', path: '/premios/super-premios/100.webp' },
      { value: 80, name: 'R$ 80,00', path: '/premios/super-premios/80.webp' },
      { value: 60, name: 'R$ 60,00', path: '/premios/super-premios/60.webp' },
      { value: 40, name: 'R$ 40,00', path: '/premios/super-premios/40.webp' },
      { value: 20, name: 'R$ 20,00', path: '/premios/super-premios/20.webp' },
      { value: 10, name: 'R$ 10,00', path: '/premios/super-premios/10.webp' }
    ];
    
    for (const prize of superPrizes) {
      await client.query(
        `INSERT INTO game_prizes (game_key, prize_value, display_name, asset_path) 
         VALUES ($1, $2, $3, $4)`,
        ['premio_super_premios', prize.value, prize.name, prize.path]
      );
    }
    console.log('✅ Prêmios Super Prêmios inseridos');
    
    // 4. CONFIGURAR PROBABILIDADES INICIAIS
    console.log('\n📦 Etapa 4: Configurando probabilidades iniciais...');
    
    // Para cada jogo, distribuir probabilidades iniciais
    const games = ['premio_pix_conta', 'premio_me_mimei', 'premio_eletronicos', 'premio_super_premios'];
    
    for (const gameKey of games) {
      // Buscar prêmios do jogo
      const prizesResult = await client.query(
        'SELECT id, prize_value FROM game_prizes WHERE game_key = $1 ORDER BY prize_value DESC',
        [gameKey]
      );
      
      const prizes = prizesResult.rows;
      const totalPrizes = prizes.length;
      
      // Distribuir probabilidades de forma inversamente proporcional ao valor
      // Prêmios menores = maior probabilidade
      for (let i = 0; i < prizes.length; i++) {
        const prize = prizes[i];
        let probability = 0;
        
        // Distribuição baseada no valor do prêmio
        if (prize.prize_value >= 10000) {
          probability = 0.01; // 0.01% para prêmios muito altos
        } else if (prize.prize_value >= 1000) {
          probability = 0.1; // 0.1% para prêmios altos
        } else if (prize.prize_value >= 100) {
          probability = 1; // 1% para prêmios médios
        } else if (prize.prize_value >= 10) {
          probability = 5; // 5% para prêmios pequenos
        } else {
          probability = 20; // 20% para prêmios muito pequenos
        }
        
        await client.query(
          `INSERT INTO game_prize_probabilities (game_key, prize_id, probability) 
           VALUES ($1, $2, $3)`,
          [gameKey, prize.id, probability]
        );
      }
      
      // Ajustar para somar 100%
      const sumResult = await client.query(
        'SELECT SUM(probability) as total FROM game_prize_probabilities WHERE game_key = $1',
        [gameKey]
      );
      
      const currentSum = parseFloat(sumResult.rows[0].total);
      
      if (currentSum !== 100) {
        // Ajustar o prêmio de menor valor para fazer a soma dar 100%
        const smallestPrize = prizes[prizes.length - 1];
        const currentProbResult = await client.query(
          'SELECT probability FROM game_prize_probabilities WHERE game_key = $1 AND prize_id = $2',
          [gameKey, smallestPrize.id]
        );
        
        const currentProb = parseFloat(currentProbResult.rows[0].probability);
        const adjustment = 100 - currentSum + currentProb;
        
        await client.query(
          'UPDATE game_prize_probabilities SET probability = $1 WHERE game_key = $2 AND prize_id = $3',
          [adjustment, gameKey, smallestPrize.id]
        );
      }
      
      console.log(`✅ Probabilidades configuradas para ${gameKey}`);
    }
    
    // Criar índices para melhor performance
    await client.query('CREATE INDEX IF NOT EXISTS idx_game_prizes_game_key ON game_prizes(game_key)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_game_prize_probabilities_game_key ON game_prize_probabilities(game_key)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_probability_audit_log_game_key ON probability_audit_log(game_key)');
    
    console.log('\n✅ Sistema de probabilidades reconstruído com sucesso!');
    
    // Exibir resumo
    const countGames = await client.query('SELECT COUNT(*) FROM scratch_games');
    const countPrizes = await client.query('SELECT COUNT(*) FROM game_prizes');
    const countProbabilities = await client.query('SELECT COUNT(*) FROM game_prize_probabilities');
    
    console.log('\n📊 Resumo:');
    console.log(`- Jogos cadastrados: ${countGames.rows[0].count}`);
    console.log(`- Prêmios cadastrados: ${countPrizes.rows[0].count}`);
    console.log(`- Probabilidades configuradas: ${countProbabilities.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Erro ao reconstruir sistema:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Função para executar diretamente
export async function runRebuild() {
  try {
    await rebuildProbabilitiesSystem();
    console.log('\n✨ Processo concluído!');
  } catch (error) {
    console.error('\n💥 Erro fatal:', error);
    throw error;
  }
}