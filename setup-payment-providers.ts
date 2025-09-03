import { db } from './server/db.js';
import { sql } from 'drizzle-orm';
import { paymentProviderConfig } from './shared/schema.js';

async function setupPaymentProviders() {
  try {
    console.log('Setting up payment provider configuration...');
    
    // Create the table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS payment_provider_config (
        id SERIAL PRIMARY KEY,
        provider TEXT NOT NULL UNIQUE,
        is_primary BOOLEAN NOT NULL DEFAULT false,
        is_active BOOLEAN NOT NULL DEFAULT true,
        api_url TEXT,
        api_token TEXT,
        tax_rate DECIMAL(5, 2),
        fixed_tax DECIMAL(10, 2),
        last_health_check TIMESTAMP,
        health_status TEXT DEFAULT 'unknown',
        failure_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    
    console.log('✅ Table created/verified!');
    
    // Check if configurations already exist
    const existing = await db.select().from(paymentProviderConfig);
    
    if (existing.length === 0) {
      // Insert default configurations
      await db.insert(paymentProviderConfig).values([
        {
          provider: 'ironpay',
          isPrimary: true,
          isActive: true,
          apiUrl: 'https://api.ironpayapp.com.br',
          taxRate: '4.49',
          fixedTax: '1.00',
          healthStatus: 'unknown',
          failureCount: 0
        },
        {
          provider: 'orinpay',
          isPrimary: false,
          isActive: true,
          apiUrl: process.env.ORINPAY_API_URL || 'https://www.orinpay.com.br/api/v1',
          apiToken: process.env.ORINPAY_TOKEN,
          taxRate: '0',
          fixedTax: '1.00',
          healthStatus: 'unknown',
          failureCount: 0
        }
      ]);
      
      console.log('✅ Default provider configurations created!');
    } else {
      console.log('✅ Provider configurations already exist!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up payment providers:', error);
    process.exit(1);
  }
}

setupPaymentProviders();