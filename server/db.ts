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

// Optimized pool configuration for better performance
export const pool = new Pool({ 
  connectionString: dbUrl,
  ssl: {
    rejectUnauthorized: false
  },
  // Connection pool optimization
  max: 20, // Maximum number of clients in the pool
  min: 2, // Minimum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Timeout after 2 seconds if cannot connect
  statement_timeout: 10000, // Terminate queries taking longer than 10 seconds
});

export const db = drizzle(pool, { schema });