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

// Simplified pool configuration for stability
export const pool = new Pool({ 
  connectionString: dbUrl,
  ssl: {
    rejectUnauthorized: false
  },
  // Simplified configuration for better stability
  max: 10, // Reduced max connections
  connectionTimeoutMillis: 30000, // Increased timeout to 30 seconds
  idleTimeoutMillis: 10000, // Reduced idle timeout
});

export const db = drizzle(pool, { schema });