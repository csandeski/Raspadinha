import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function createAffiliateCodesTable() {
  try {
    // Create the affiliate_codes table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS affiliate_codes (
        id SERIAL PRIMARY KEY,
        affiliate_id INTEGER REFERENCES affiliates(id) NOT NULL,
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(255),
        total_clicks INTEGER DEFAULT 0,
        total_registrations INTEGER DEFAULT 0,
        total_deposits INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log("✅ Created affiliate_codes table successfully");
    
    // Create indexes for faster lookups
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_affiliate_codes_code ON affiliate_codes(code);
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_affiliate_codes_affiliate_id ON affiliate_codes(affiliate_id);
    `);
    
    console.log("✅ Created indexes successfully");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating affiliate_codes table:", error);
    process.exit(1);
  }
}

createAffiliateCodesTable();