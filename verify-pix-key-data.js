// Verify the actual PIX key data
import pg from 'pg';
const { Pool } = pg;

async function verifyData() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    const result = await pool.query(`
      SELECT id, affiliate_id, amount, status, pix_key, pix_key_type, requested_at, processed_at
      FROM affiliates_withdrawals 
      WHERE affiliate_id = 12
      ORDER BY id DESC
    `);
    
    console.log('=== DADOS REAIS DOS SAQUES ===');
    result.rows.forEach((w, i) => {
      console.log(`\nSaque ${i + 1}:`);
      console.log('- PIX Key:', w.pix_key);
      console.log('- PIX Type:', w.pix_key_type);
      
      if (w.pix_key && w.pix_key_type === 'cpf') {
        const cleanKey = String(w.pix_key).replace(/\D/g, '');
        console.log('- Clean CPF:', cleanKey);
        console.log('- CPF Length:', cleanKey.length);
        
        if (cleanKey.length === 11) {
          const formatted = cleanKey.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
          console.log('- CPF Formatado:', formatted);
        }
      }
    });
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    pool.end();
  }
}

verifyData();
