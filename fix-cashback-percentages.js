import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function fixCashbackPercentages() {
  try {
    // Corrigir as porcentagens e valores de cashback de acordo com o tier
    const tiers = {
      bronze: { percentage: 1.5 },
      silver: { percentage: 3 },
      gold: { percentage: 6 },
      platinum: { percentage: 12 },
      diamond: { percentage: 24 }
    };
    
    // Buscar todos os cashbacks para corrigir
    const cashbacks = await pool.query(
      "SELECT * FROM daily_cashback ORDER BY created_at DESC"
    );
    
    console.log(`Encontrados ${cashbacks.rows.length} cashbacks para verificar`);
    
    for (const cashback of cashbacks.rows) {
      const tier = cashback.tier.toLowerCase();
      const correctPercentage = tiers[tier]?.percentage || 1.5;
      
      // Verificar se a porcentagem está incorreta
      if (parseFloat(cashback.cashback_percentage) !== correctPercentage) {
        console.log(`\nCorrigindo cashback ID ${cashback.id}:`);
        console.log(`  - Tier: ${tier}`);
        console.log(`  - Porcentagem atual: ${cashback.cashback_percentage}%`);
        console.log(`  - Porcentagem correta: ${correctPercentage}%`);
        
        // Recalcular o valor do cashback com a porcentagem correta
        const netLoss = parseFloat(cashback.net_loss);
        const newCashbackAmount = (netLoss * correctPercentage) / 100;
        
        console.log(`  - Valor atual: R$ ${cashback.cashback_amount}`);
        console.log(`  - Novo valor: R$ ${newCashbackAmount.toFixed(2)}`);
        
        // Atualizar o registro
        await pool.query(
          `UPDATE daily_cashback 
           SET cashback_percentage = $1, 
               cashback_amount = $2 
           WHERE id = $3`,
          [correctPercentage.toFixed(2), newCashbackAmount.toFixed(2), cashback.id]
        );
        
        console.log(`  ✓ Atualizado com sucesso!`);
      } else {
        console.log(`Cashback ID ${cashback.id} já está com a porcentagem correta (${correctPercentage}%)`);
      }
    }
    
    console.log('\n✅ Processo de correção concluído!');
    
    // Mostrar o resumo das porcentagens corretas
    console.log('\nPorcentagens corretas por tier:');
    console.log('  Bronze: 1.5%');
    console.log('  Silver: 3%');
    console.log('  Gold: 6%');
    console.log('  Platinum: 12%');
    console.log('  Diamond: 24%');
    
  } catch (error) {
    console.error('Erro ao corrigir cashbacks:', error);
  } finally {
    await pool.end();
  }
}

fixCashbackPercentages();