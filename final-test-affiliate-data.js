import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function finalTest() {
  try {
    console.log("=== TESTE FINAL - Dados de Affiliate Conversions ===\n");
    
    // Create one more test conversion to confirm everything works
    await pool.query(`
      INSERT INTO affiliate_conversions (
        affiliate_id, user_id, conversion_type, conversion_value, 
        commission, commission_rate, status, created_at
      ) VALUES (
        6, 92, 'deposit', '100.00', '20.00', '20.00', 'completed', NOW()
      )
    `);
    
    console.log("Criada nova conversão de teste: R$ 100 (comissão R$ 20)\n");
    
    const { default: fetch } = await import("node-fetch");
    
    // Login
    const loginResponse = await fetch('http://localhost:5000/api/affiliate/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'teste2@afiliado.com',
        password: 'teste123'
      })
    });
    
    const loginData = await loginResponse.json();
    
    if (loginData.token) {
      // Get earnings
      const earningsResponse = await fetch('http://localhost:5000/api/affiliate/earnings', {
        headers: { 'Authorization': `Bearer ${loginData.token}` }
      });
      
      const earnings = await earningsResponse.json();
      
      console.log("=== GANHOS (após nova conversão) ===");
      console.log(`Total: R$ ${earnings.totalEarnings}`);
      console.log(`Pendentes: R$ ${earnings.pendingEarnings}`);
      console.log(`Pagos: R$ ${earnings.completedEarnings}`);
      console.log(`Cancelados: R$ ${earnings.cancelledEarnings}`);
      
      // Get network  
      const networkResponse = await fetch('http://localhost:5000/api/affiliate/network', {
        headers: { 'Authorization': `Bearer ${loginData.token}` }
      });
      
      const network = await networkResponse.json();
      
      console.log("\n=== REDE ===");
      if (network.recentReferrals && network.recentReferrals.length > 0) {
        const ref = network.recentReferrals[0];
        console.log(`Usuário: ${ref.name}`);
        console.log(`Depósitos Completos: R$ ${ref.totalDeposits}`);
        console.log(`Comissão Total: R$ ${ref.commission}`);
      }
      
      // Clean up test data
      await pool.query(`
        DELETE FROM affiliate_conversions 
        WHERE affiliate_id = 6 AND user_id = 92 
        AND conversion_value = '100.00'
      `);
      
      console.log("\n✓ Teste concluído e dados de teste removidos");
    }
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pool.end();
  }
}

finalTest();
