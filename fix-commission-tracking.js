import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fixTracking() {
  try {
    // Update user to have the correct referral code
    console.log("Atualizando usuário 'Teste POP' com código 'POP'...");
    
    await pool.query(`
      UPDATE users 
      SET referral_code = 'POP' 
      WHERE id = 92
    `);
    
    console.log("✓ Usuário atualizado com código POP");
    
    // Test API again
    const { default: fetch } = await import("node-fetch");
    
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
      const codesResponse = await fetch('http://localhost:5000/api/affiliate/codes', {
        headers: { 'Authorization': `Bearer ${loginData.token}` }
      });
      
      const codes = await codesResponse.json();
      const popCode = codes.find(c => c.code === 'POP');
      
      console.log("\n=== Código POP após correção ===");
      if (popCode) {
        console.log({
          completedCommission: `R$ ${(popCode.completedCommission || 0).toFixed(2)}`,
          pendingCommission: `R$ ${(popCode.pendingCommission || 0).toFixed(2)}`,
          cancelledCommission: `R$ ${(popCode.cancelledCommission || 0).toFixed(2)}`,
          totalCommission: `R$ ${(popCode.totalCommission || 0).toFixed(2)}`
        });
      }
    }
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pool.end();
  }
}

fixTracking();
