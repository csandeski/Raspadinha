import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';

async function importProbabilities() {
  const pool = new Pool({
    connectionString: process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔄 Importando novas probabilidades...');
    
    // Clear existing data first
    console.log('🗑️ Limpando dados existentes...');
    await pool.query('DELETE FROM game_probabilities');
    await pool.query('DELETE FROM prize_probabilities');
    
    // Import game probabilities
    console.log('📊 Importando game_probabilities...');
    const gameProbSQL = fs.readFileSync('attached_assets/game_probabilities_rows_1754753334344.sql', 'utf8');
    await pool.query(gameProbSQL);
    
    // Import prize probabilities
    console.log('🎰 Importando prize_probabilities...');
    const prizeProbSQL = fs.readFileSync('attached_assets/prize_probabilities_rows_1754753334344.sql', 'utf8');
    await pool.query(prizeProbSQL);
    
    // Verify import
    const gameCount = await pool.query('SELECT COUNT(*) FROM game_probabilities');
    const prizeCount = await pool.query('SELECT COUNT(*) FROM prize_probabilities');
    
    console.log('✅ Importação concluída!');
    console.log(`   - ${gameCount.rows[0].count} configurações de jogos`);
    console.log(`   - ${prizeCount.rows[0].count} configurações de prêmios`);
    
    // Show summary by game
    const summary = await pool.query(`
      SELECT 
        game_type,
        COUNT(*) as prize_count,
        SUM(probability::decimal) as total_probability
      FROM prize_probabilities
      GROUP BY game_type
      ORDER BY game_type
    `);
    
    console.log('\n📈 Resumo por jogo:');
    summary.rows.forEach(row => {
      console.log(`   ${row.game_type}: ${row.prize_count} prêmios, Taxa total: ${parseFloat(row.total_probability).toFixed(2)}%`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao importar:', error.message);
  } finally {
    await pool.end();
  }
}

importProbabilities();