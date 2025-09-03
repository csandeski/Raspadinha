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

// Ultra-stable pool configuration with error handling
export const pool = new Pool({ 
  connectionString: dbUrl,
  ssl: {
    rejectUnauthorized: false
  },
  // Minimal configuration for maximum stability
  max: 2, // Minimal connections
  min: 0, // Allow zero connections when idle
  connectionTimeoutMillis: 10000, // 10 second timeout
  idleTimeoutMillis: 1000, // 1 second idle timeout
  allowExitOnIdle: false, // Prevent process from exiting on idle
});

// Add error handling to prevent crashes
pool.on('error', (err) => {
  console.error('Unexpected error on idle client:', err);
  // Don't crash on pool errors
});

pool.on('connect', () => {
  console.log('Database pool: client connected');
});

pool.on('remove', () => {
  console.log('Database pool: client removed');
});

export const db = drizzle(pool, { schema });