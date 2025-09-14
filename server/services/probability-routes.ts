import type { Express } from 'express';
import { db, pool } from '../db';
import { z } from 'zod';

// Schema para validação de atualização de probabilidades
const updateProbabilitiesSchema = z.object({
  probabilities: z.array(z.object({
    prizeId: z.number(),
    probability: z.number().min(0).max(100)
  }))
});

export function setupProbabilityRoutes(app: Express) {
  // 1. GET /api/admin/scratch-games - Listar todos os jogos
  app.get('/api/admin/scratch-games', async (req, res) => {
    try {
      // Verificar autenticação admin
      if (!req.session?.isAdminAuthenticated) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const client = await pool.connect();
      try {
        const result = await client.query(
          'SELECT * FROM scratch_games WHERE active = true ORDER BY id'
        );
        
        res.json({ games: result.rows });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error fetching scratch games:', error);
      res.status(500).json({ error: 'Failed to fetch games' });
    }
  });

  // 2. GET /api/admin/scratch-games/:key/prizes - Listar prêmios do jogo
  app.get('/api/admin/scratch-games/:key/prizes', async (req, res) => {
    try {
      // Verificar autenticação admin
      if (!req.session?.isAdminAuthenticated) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { key } = req.params;

      const client = await pool.connect();
      try {
        const result = await client.query(
          `SELECT 
            id,
            game_key,
            prize_value,
            display_name,
            asset_path,
            active
          FROM game_prizes 
          WHERE game_key = $1 AND active = true
          ORDER BY prize_value DESC`,
          [key]
        );
        
        res.json({ prizes: result.rows });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error fetching game prizes:', error);
      res.status(500).json({ error: 'Failed to fetch prizes' });
    }
  });

  // 3. GET /api/admin/scratch-games/:key/probabilities - Obter probabilidades atuais
  app.get('/api/admin/scratch-games/:key/probabilities', async (req, res) => {
    try {
      // Verificar autenticação admin
      if (!req.session?.isAdminAuthenticated) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { key } = req.params;

      const client = await pool.connect();
      try {
        const result = await client.query(
          `SELECT 
            gpp.id,
            gpp.prize_id,
            gpp.probability,
            gp.prize_value,
            gp.display_name,
            gp.asset_path
          FROM game_prize_probabilities gpp
          JOIN game_prizes gp ON gp.id = gpp.prize_id
          WHERE gpp.game_key = $1
          ORDER BY gp.prize_value DESC`,
          [key]
        );
        
        // Calcular soma total
        const totalProbability = result.rows.reduce((sum, row) => 
          sum + parseFloat(row.probability), 0
        );
        
        res.json({ 
          probabilities: result.rows,
          totalProbability: totalProbability.toFixed(6)
        });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error fetching game probabilities:', error);
      res.status(500).json({ error: 'Failed to fetch probabilities' });
    }
  });

  // 4. PUT /api/admin/scratch-games/:key/probabilities - Atualizar probabilidades
  app.put('/api/admin/scratch-games/:key/probabilities', async (req, res) => {
    try {
      // Verificar autenticação admin
      if (!req.session?.isAdminAuthenticated) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { key } = req.params;
      const validated = updateProbabilitiesSchema.parse(req.body);
      
      // Validar que a soma é exatamente 100%
      const total = validated.probabilities.reduce((sum, item) => 
        sum + item.probability, 0
      );
      
      // Permitir pequena margem de erro devido a floats
      if (Math.abs(total - 100) > 0.001) {
        return res.status(400).json({ 
          error: 'A soma das probabilidades deve ser exatamente 100%',
          currentSum: total
        });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Obter probabilidades antigas para o log
        const oldProbs = await client.query(
          `SELECT 
            gpp.prize_id,
            gpp.probability,
            gp.display_name
          FROM game_prize_probabilities gpp
          JOIN game_prizes gp ON gp.id = gpp.prize_id
          WHERE gpp.game_key = $1`,
          [key]
        );

        // Atualizar cada probabilidade
        for (const prob of validated.probabilities) {
          await client.query(
            `UPDATE game_prize_probabilities 
             SET probability = $1, updated_at = NOW()
             WHERE game_key = $2 AND prize_id = $3`,
            [prob.probability, key, prob.prizeId]
          );
        }

        // Registrar no audit log
        const changes = {
          old: oldProbs.rows.map(r => ({
            prizeId: r.prize_id,
            name: r.display_name,
            probability: parseFloat(r.probability)
          })),
          new: validated.probabilities
        };

        await client.query(
          `INSERT INTO probability_audit_log (admin_username, game_key, changes)
           VALUES ($1, $2, $3)`,
          [req.session.adminUsername || 'admin', key, JSON.stringify(changes)]
        );

        await client.query('COMMIT');

        res.json({ 
          success: true, 
          message: 'Probabilidades atualizadas com sucesso'
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error updating game probabilities:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Dados inválidos', 
          details: error.errors 
        });
      }
      res.status(500).json({ error: 'Failed to update probabilities' });
    }
  });

  // 5. GET /api/admin/scratch-games/:key/audit-log - Histórico de alterações
  app.get('/api/admin/scratch-games/:key/audit-log', async (req, res) => {
    try {
      // Verificar autenticação admin
      if (!req.session?.isAdminAuthenticated) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { key } = req.params;

      const client = await pool.connect();
      try {
        const result = await client.query(
          `SELECT 
            id,
            admin_username,
            changes,
            created_at
          FROM probability_audit_log 
          WHERE game_key = $1
          ORDER BY created_at DESC
          LIMIT 20`,
          [key]
        );
        
        res.json({ auditLog: result.rows });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error fetching audit log:', error);
      res.status(500).json({ error: 'Failed to fetch audit log' });
    }
  });

  // 6. POST /api/admin/scratch-games/:key/distribute-equally - Distribuir probabilidades igualmente
  app.post('/api/admin/scratch-games/:key/distribute-equally', async (req, res) => {
    try {
      // Verificar autenticação admin
      if (!req.session?.isAdminAuthenticated) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { key } = req.params;

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Contar prêmios
        const countResult = await client.query(
          `SELECT COUNT(*) as count 
           FROM game_prizes 
           WHERE game_key = $1 AND active = true`,
          [key]
        );
        
        const prizeCount = parseInt(countResult.rows[0].count);
        if (prizeCount === 0) {
          throw new Error('No prizes found for this game');
        }

        // Calcular probabilidade igual para cada prêmio
        const equalProb = 100 / prizeCount;

        // Atualizar todas as probabilidades
        await client.query(
          `UPDATE game_prize_probabilities gpp
           SET probability = $1, updated_at = NOW()
           FROM game_prizes gp
           WHERE gp.id = gpp.prize_id
           AND gpp.game_key = $2
           AND gp.active = true`,
          [equalProb, key]
        );

        // Registrar no audit log
        await client.query(
          `INSERT INTO probability_audit_log (admin_username, game_key, changes)
           VALUES ($1, $2, $3)`,
          [
            req.session.adminUsername || 'admin', 
            key, 
            JSON.stringify({ action: 'distribute_equally', probability: equalProb })
          ]
        );

        await client.query('COMMIT');

        res.json({ 
          success: true, 
          message: `Probabilidades distribuídas igualmente (${equalProb.toFixed(4)}% cada)`
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error distributing probabilities equally:', error);
      res.status(500).json({ error: 'Failed to distribute probabilities equally' });
    }
  });

  // 7. POST /api/admin/scratch-games/:key/reset-defaults - Resetar para padrão
  app.post('/api/admin/scratch-games/:key/reset-defaults', async (req, res) => {
    try {
      // Verificar autenticação admin
      if (!req.session?.isAdminAuthenticated) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { key } = req.params;

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Buscar prêmios do jogo
        const prizesResult = await client.query(
          'SELECT id, prize_value FROM game_prizes WHERE game_key = $1 ORDER BY prize_value DESC',
          [key]
        );
        
        const prizes = prizesResult.rows;
        let remainingProb = 100;
        
        // Aplicar distribuição padrão
        for (let i = 0; i < prizes.length; i++) {
          const prize = prizes[i];
          let probability = 0;
          
          if (i === prizes.length - 1) {
            // Último prêmio recebe o restante
            probability = remainingProb;
          } else {
            // Distribuição baseada no valor
            if (prize.prize_value >= 100000) {
              probability = 0.001;
            } else if (prize.prize_value >= 10000) {
              probability = 0.01;
            } else if (prize.prize_value >= 1000) {
              probability = 0.1;
            } else if (prize.prize_value >= 100) {
              probability = 0.5;
            } else if (prize.prize_value >= 50) {
              probability = 1;
            } else if (prize.prize_value >= 10) {
              probability = 3;
            } else if (prize.prize_value >= 5) {
              probability = 5;
            } else {
              probability = 10;
            }
            
            probability = Math.min(probability, remainingProb);
            remainingProb -= probability;
          }
          
          await client.query(
            'UPDATE game_prize_probabilities SET probability = $1, updated_at = NOW() WHERE game_key = $2 AND prize_id = $3',
            [probability, key, prize.id]
          );
        }

        // Registrar no audit log
        await client.query(
          `INSERT INTO probability_audit_log (admin_username, game_key, changes)
           VALUES ($1, $2, $3)`,
          [
            req.session.adminUsername || 'admin', 
            key, 
            JSON.stringify({ action: 'reset_to_defaults' })
          ]
        );

        await client.query('COMMIT');

        res.json({ 
          success: true, 
          message: 'Probabilidades resetadas para o padrão'
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error resetting probabilities:', error);
      res.status(500).json({ error: 'Failed to reset probabilities' });
    }
  });

  console.log('✅ Probability management routes configured');
}