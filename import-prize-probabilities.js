import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Probabilidades de prêmios para cada jogo
const prizeProbabilities = {
  'premio-pix': [
    { prize_value: '0.25', prize_name: 'R$ 0,25', probability: 20.0, order: 1 },
    { prize_value: '0.50', prize_name: 'R$ 0,50', probability: 15.0, order: 2 },
    { prize_value: '1.00', prize_name: 'R$ 1,00', probability: 12.0, order: 3 },
    { prize_value: '2.00', prize_name: 'R$ 2,00', probability: 10.0, order: 4 },
    { prize_value: '5.00', prize_name: 'R$ 5,00', probability: 8.0, order: 5 },
    { prize_value: '10.00', prize_name: 'R$ 10,00', probability: 5.0, order: 6 },
    { prize_value: '25.00', prize_name: 'R$ 25,00', probability: 3.0, order: 7 },
    { prize_value: '50.00', prize_name: 'R$ 50,00', probability: 2.0, order: 8 },
    { prize_value: '100.00', prize_name: 'R$ 100,00', probability: 1.0, order: 9 },
    { prize_value: '500.00', prize_name: 'R$ 500,00', probability: 0.5, order: 10 },
    { prize_value: '1000.00', prize_name: 'R$ 1.000,00', probability: 0.3, order: 11 },
    { prize_value: '5000.00', prize_name: 'R$ 5.000,00', probability: 0.1, order: 12 },
    { prize_value: '10000.00', prize_name: 'R$ 10.000,00', probability: 0.05, order: 13 },
    { prize_value: '25000.00', prize_name: 'R$ 25.000,00', probability: 0.03, order: 14 },
    { prize_value: '50000.00', prize_name: 'R$ 50.000,00', probability: 0.01, order: 15 },
    { prize_value: '100000.00', prize_name: 'R$ 100.000,00', probability: 0.005, order: 16 }
  ],
  'premio-me-mimei': [
    { prize_value: '0.50', prize_name: 'R$ 0,50', probability: 18.0, order: 1 },
    { prize_value: '1.00', prize_name: 'R$ 1,00', probability: 15.0, order: 2 },
    { prize_value: '2.00', prize_name: 'R$ 2,00', probability: 12.0, order: 3 },
    { prize_value: '5.00', prize_name: 'R$ 5,00', probability: 10.0, order: 4 },
    { prize_value: '10.00', prize_name: 'R$ 10,00', probability: 8.0, order: 5 },
    { prize_value: '20.00', prize_name: 'R$ 20,00', probability: 6.0, order: 6 },
    { prize_value: '50.00', prize_name: 'R$ 50,00', probability: 4.0, order: 7 },
    { prize_value: '100.00', prize_name: 'R$ 100,00', probability: 2.5, order: 8 },
    { prize_value: '250.00', prize_name: 'R$ 250,00', probability: 1.5, order: 9 },
    { prize_value: '500.00', prize_name: 'R$ 500,00', probability: 0.8, order: 10 },
    { prize_value: '1000.00', prize_name: 'R$ 1.000,00', probability: 0.4, order: 11 },
    { prize_value: '5000.00', prize_name: 'R$ 5.000,00', probability: 0.2, order: 12 },
    { prize_value: '10000.00', prize_name: 'R$ 10.000,00', probability: 0.08, order: 13 },
    { prize_value: '25000.00', prize_name: 'R$ 25.000,00', probability: 0.04, order: 14 },
    { prize_value: '50000.00', prize_name: 'R$ 50.000,00', probability: 0.02, order: 15 },
    { prize_value: '100000.00', prize_name: 'R$ 100.000,00', probability: 0.008, order: 16 }
  ],
  'premio-eletronicos': [
    { prize_value: '1.00', prize_name: 'R$ 1,00', probability: 20.0, order: 1 },
    { prize_value: '2.00', prize_name: 'R$ 2,00', probability: 16.0, order: 2 },
    { prize_value: '5.00', prize_name: 'R$ 5,00', probability: 13.0, order: 3 },
    { prize_value: '10.00', prize_name: 'R$ 10,00', probability: 10.0, order: 4 },
    { prize_value: '25.00', prize_name: 'R$ 25,00', probability: 8.0, order: 5 },
    { prize_value: '50.00', prize_name: 'R$ 50,00', probability: 5.0, order: 6 },
    { prize_value: '100.00', prize_name: 'R$ 100,00', probability: 3.0, order: 7 },
    { prize_value: '250.00', prize_name: 'R$ 250,00', probability: 2.0, order: 8 },
    { prize_value: '500.00', prize_name: 'R$ 500,00', probability: 1.0, order: 9 },
    { prize_value: '1000.00', prize_name: 'R$ 1.000,00', probability: 0.5, order: 10 },
    { prize_value: '2500.00', prize_name: 'R$ 2.500,00', probability: 0.3, order: 11 },
    { prize_value: '5000.00', prize_name: 'R$ 5.000,00', probability: 0.15, order: 12 },
    { prize_value: '10000.00', prize_name: 'R$ 10.000,00', probability: 0.06, order: 13 },
    { prize_value: '25000.00', prize_name: 'R$ 25.000,00', probability: 0.03, order: 14 },
    { prize_value: '50000.00', prize_name: 'R$ 50.000,00', probability: 0.015, order: 15 },
    { prize_value: '100000.00', prize_name: 'R$ 100.000,00', probability: 0.006, order: 16 }
  ],
  'premio-super-premios': [
    { prize_value: '2.00', prize_name: 'R$ 2,00', probability: 22.0, order: 1 },
    { prize_value: '5.00', prize_name: 'R$ 5,00', probability: 18.0, order: 2 },
    { prize_value: '10.00', prize_name: 'R$ 10,00', probability: 14.0, order: 3 },
    { prize_value: '25.00', prize_name: 'R$ 25,00', probability: 11.0, order: 4 },
    { prize_value: '50.00', prize_name: 'R$ 50,00', probability: 8.0, order: 5 },
    { prize_value: '100.00', prize_name: 'R$ 100,00', probability: 5.0, order: 6 },
    { prize_value: '250.00', prize_name: 'R$ 250,00', probability: 3.0, order: 7 },
    { prize_value: '500.00', prize_name: 'R$ 500,00', probability: 2.0, order: 8 },
    { prize_value: '1000.00', prize_name: 'R$ 1.000,00', probability: 1.0, order: 9 },
    { prize_value: '2500.00', prize_name: 'R$ 2.500,00', probability: 0.6, order: 10 },
    { prize_value: '5000.00', prize_name: 'R$ 5.000,00', probability: 0.3, order: 11 },
    { prize_value: '10000.00', prize_name: 'R$ 10.000,00', probability: 0.1, order: 12 },
    { prize_value: '25000.00', prize_name: 'R$ 25.000,00', probability: 0.05, order: 13 },
    { prize_value: '50000.00', prize_name: 'R$ 50.000,00', probability: 0.02, order: 14 },
    { prize_value: '100000.00', prize_name: 'R$ 100.000,00', probability: 0.01, order: 15 },
    { prize_value: '1000000.00', prize_name: 'R$ 1.000.000,00', probability: 0.001, order: 16 }
  ]
};

async function importPrizeProbabilities() {
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Clear existing prize probabilities
    console.log('Clearing existing prize probabilities...');
    await client.query('DELETE FROM prize_probabilities');
    
    // Import new probabilities
    for (const [gameType, prizes] of Object.entries(prizeProbabilities)) {
      console.log(`\nImporting probabilities for ${gameType}...`);
      
      for (const prize of prizes) {
        const query = `
          INSERT INTO prize_probabilities (
            game_type, 
            prize_value, 
            prize_name, 
            probability, 
            "order", 
            updated_at, 
            updated_by
          )
          VALUES ($1, $2, $3, $4, $5, NOW(), 'system')
        `;
        
        await client.query(query, [
          gameType,
          prize.prize_value,
          prize.prize_name,
          prize.probability,
          prize.order
        ]);
        
        console.log(`  ✓ Added ${prize.prize_name} (${prize.probability}%)`);
      }
    }
    
    // Verify import
    const result = await client.query('SELECT game_type, COUNT(*) as count FROM prize_probabilities GROUP BY game_type');
    console.log('\n✅ Import complete!');
    console.log('Prize counts by game:');
    result.rows.forEach(row => {
      console.log(`  ${row.game_type}: ${row.count} prizes`);
    });
    
    // Calculate total probability for each game (should be less than 100% to allow for losses)
    for (const gameType of Object.keys(prizeProbabilities)) {
      const probResult = await client.query(
        'SELECT SUM(probability) as total_prob FROM prize_probabilities WHERE game_type = $1',
        [gameType]
      );
      const totalProb = parseFloat(probResult.rows[0].total_prob);
      const loseProb = 100 - totalProb;
      console.log(`\n${gameType}: Win probability: ${totalProb.toFixed(2)}%, Lose probability: ${loseProb.toFixed(2)}%`);
    }
    
  } catch (error) {
    console.error('Error importing prize probabilities:', error);
  } finally {
    await client.end();
    console.log('\nDatabase connection closed');
  }
}

importPrizeProbabilities();