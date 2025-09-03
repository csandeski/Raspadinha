import { db } from "./db";
import { sql } from "drizzle-orm";

async function createAdminTable() {
  try {
    console.log("Creating admin_users table...");
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log("✅ Admin users table created successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error creating admin_users table:", error);
    process.exit(1);
  }
}

createAdminTable();