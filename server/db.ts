import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Usar novo Supabase via Pooler (Session Mode - porta 5432)
// IMPORTANTE: Ignorar variável de ambiente antiga e usar apenas a URL do novo Supabase
const dbUrl = 'postgresql://postgres.upxximikhoshaxbmshee:Faneco235***@aws-1-sa-east-1.pooler.supabase.com:5432/postgres';

if (!dbUrl) {
  throw new Error(
    "Database URL must be set",
  );
}

// Ultra-stable pool configuration
export const pool = new Pool({ 
  connectionString: dbUrl,
  ssl: {
    rejectUnauthorized: false
  },
  // Ultra-stable configuration to prevent crashes
  max: 5, // Very limited connections to avoid overload
  connectionTimeoutMillis: 60000, // 60 second timeout
  idleTimeoutMillis: 30000, // 30 second idle timeout
  allowExitOnIdle: false, // Prevent process from exiting on idle
});

export const db = drizzle(pool, { schema });