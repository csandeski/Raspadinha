// Update HorsePay tax to R$ 0.65 fixed
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function updateHorsePayTax() {
  try {
    // Update HorsePay tax rate
    await pool.query(`
      UPDATE payment_provider_config 
      SET 
        tax_rate = 0.00,
        fixed_tax = 0.65,
        updated_at = NOW()
      WHERE provider = 'horsepay'
    `);
    
    console.log('✓ Updated HorsePay tax to R$ 0.65 fixed');
    
    // Show all payment providers
    const providers = await pool.query(`
      SELECT provider, is_primary, is_active, tax_rate, fixed_tax 
      FROM payment_provider_config 
      ORDER BY provider
    `);
    
    console.log('\n=== Current Payment Providers ===');
    providers.rows.forEach(p => {
      console.log(`- ${p.provider}: ${p.is_primary ? 'PRIMARY' : 'SECONDARY'}, Active: ${p.is_active}, Tax: ${p.tax_rate}% + R$ ${p.fixed_tax}`);
    });
    
  } catch (error) {
    console.error('Error updating HorsePay tax:', error.message);
  } finally {
    pool.end();
  }
}

updateHorsePayTax();
