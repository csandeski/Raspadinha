import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function verifyCouponPersistence() {
  const userId = 113;
  
  console.log('=== VERIFICANDO PERSISTÊNCIA DO CUPOM ===\n');
  
  try {
    // Check current user status
    const userResult = await pool.query(
      'SELECT coupon_applied, current_coupon FROM users WHERE id = $1',
      [userId]
    );
    
    const user = userResult.rows[0];
    console.log('Status atual do usuário:');
    console.log(`- Cupom aplicado: ${user.coupon_applied === 1 ? 'SIM' : 'NÃO'}`);
    console.log(`- Cupom atual: ${user.current_coupon || 'Nenhum'}\n`);
    
    // Check recent deposits
    const depositsResult = await pool.query(
      `SELECT id, amount, status, created_at 
       FROM deposits 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 5`,
      [userId]
    );
    
    console.log(`Últimos ${depositsResult.rows.length} depósitos:`);
    depositsResult.rows.forEach((deposit, index) => {
      console.log(`${index + 1}. ID ${deposit.id}: R$ ${deposit.amount} - Status: ${deposit.status} - ${new Date(deposit.created_at).toLocaleString('pt-BR')}`);
    });
    
    // Check coupon usage history
    const couponUsageResult = await pool.query(
      `SELECT cu.*, d.amount, d.status, d.created_at
       FROM coupon_uses cu
       JOIN deposits d ON cu.deposit_id = d.id
       JOIN coupons c ON cu.coupon_id = c.id
       WHERE cu.user_id = $1 AND c.code = 'SORTE'
       ORDER BY d.created_at DESC`,
      [userId]
    );
    
    console.log(`\nUsos do cupom SORTE: ${couponUsageResult.rows.length}`);
    if (couponUsageResult.rows.length > 0) {
      console.log('Histórico de uso:');
      couponUsageResult.rows.forEach((use, index) => {
        console.log(`${index + 1}. Depósito R$ ${use.amount} - ${new Date(use.created_at).toLocaleString('pt-BR')}`);
      });
    }
    
    // Check wallet bonus
    const walletResult = await pool.query(
      'SELECT balance, scratch_bonus FROM wallets WHERE user_id = $1',
      [userId]
    );
    
    const wallet = walletResult.rows[0];
    console.log(`\nCarteira atual:`);
    console.log(`- Saldo: R$ ${wallet.balance}`);
    console.log(`- Bônus de raspadinhas: ${wallet.scratch_bonus}`);
    
    // Final verification
    console.log('\n=== RESULTADO DA VERIFICAÇÃO ===');
    if (user.coupon_applied === 1 && user.current_coupon === 'SORTE') {
      console.log('✅ SUCESSO! O cupom SORTE está ATIVO e persistente!');
      console.log('O cupom continuará aplicando bônus em futuros depósitos.');
    } else {
      console.log('⚠️ ATENÇÃO: O cupom SORTE não está ativo.');
      console.log('Pode ter sido removido após um depósito ou manualmente.');
    }
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await pool.end();
  }
}

verifyCouponPersistence();
