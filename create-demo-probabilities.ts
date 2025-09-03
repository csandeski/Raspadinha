import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL not found in environment variables");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const db = drizzle(pool);

async function createDemoProbabilities() {
  console.log("🎯 Criando sistema de probabilidades para contas demo...");

  try {
    // Criar tabela de probabilidades demo
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS demo_prize_probabilities (
        id SERIAL PRIMARY KEY,
        game_type TEXT NOT NULL,
        prize_value TEXT NOT NULL,
        prize_name TEXT NOT NULL,
        probability NUMERIC(10, 6) NOT NULL,
        "order" INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_by TEXT DEFAULT 'system'
      )
    `);

    console.log("✅ Tabela demo_prize_probabilities criada");

    // Verificar se já existem dados
    const existing = await db.execute(sql`
      SELECT COUNT(*) as count FROM demo_prize_probabilities
    `);

    const existingCount = existing.rows[0]?.count || 0;
    
    if (existingCount == 0) {
      // Copiar dados existentes para a tabela demo
      await db.execute(sql`
        INSERT INTO demo_prize_probabilities (game_type, prize_value, prize_name, probability, "order", updated_by)
        SELECT 
          CASE 
            WHEN game_type = 'premio-pix' THEN 'demo_premio_pix'
            WHEN game_type = 'premio-me-mimei' THEN 'demo_premio_me_mimei'
            WHEN game_type = 'premio-eletronicos' THEN 'demo_premio_eletronicos'
            WHEN game_type = 'premio-super-premios' THEN 'demo_premio_super_premios'
            ELSE CONCAT('demo_', game_type)
          END as game_type,
          prize_value,
          prize_name,
          probability,
          "order",
          'demo_system'
        FROM prize_probabilities
      `);

      console.log("✅ Probabilidades copiadas para tabela demo");

      // Ajustar probabilidades demo para serem mais favoráveis
      // Aumentar chances de prêmios maiores para contas demo
      await db.execute(sql`
        UPDATE demo_prize_probabilities 
        SET probability = probability * 1.5
        WHERE value >= 100
        AND game_type LIKE 'demo_%'
      `);

      await db.execute(sql`
        UPDATE demo_prize_probabilities 
        SET probability = probability * 0.8
        WHERE value < 1
        AND game_type LIKE 'demo_%'
      `);

      console.log("✅ Probabilidades demo ajustadas para serem mais favoráveis");
    } else {
      console.log("ℹ️ Probabilidades demo já existem");
    }

    // Criar índice para melhor performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_demo_prize_probabilities_game_type 
      ON demo_prize_probabilities(game_type)
    `);

    console.log("✅ Índices criados");

    // Verificar contagem
    const count = await db.execute(sql`
      SELECT game_type, COUNT(*) as count 
      FROM demo_prize_probabilities 
      GROUP BY game_type
    `);

    console.log("\n📊 Probabilidades demo criadas:");
    count.rows.forEach((row: any) => {
      console.log(`  - ${row.game_type}: ${row.count} itens`);
    });

    console.log("\n✅ Sistema de probabilidades demo criado com sucesso!");
    console.log("🔒 Contas demo (CPF 99999999999) agora usarão probabilidades separadas");

  } catch (error) {
    console.error("❌ Erro ao criar probabilidades demo:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

createDemoProbabilities().catch(console.error);