import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Use environment variable for database connection
const dbUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

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

// Function to ensure active_game_sessions table exists at runtime
export async function ensureActiveGameSessions() {
  const client = await pool.connect();
  try {
    console.log('[ensureActiveGameSessions] Starting table check...');
    
    // Log current database configuration for debugging
    const dbInfo = await client.query(`
      SELECT 
        current_database() as database,
        current_user as user,
        current_schema() as schema,
        current_setting('search_path') as search_path
    `);
    console.log('[ensureActiveGameSessions] Database info:', dbInfo.rows[0]);
    
    // Check if the table exists in the public schema
    const tableCheck = await client.query(`
      SELECT to_regclass('public.active_game_sessions') as table_exists
    `);
    
    const tableExists = tableCheck.rows[0]?.table_exists !== null;
    console.log('[ensureActiveGameSessions] Table exists:', tableExists);
    
    if (!tableExists) {
      console.log('[ensureActiveGameSessions] Creating active_game_sessions table...');
      
      // Create the table with the exact structure needed
      await client.query(`
        CREATE TABLE IF NOT EXISTS public.active_game_sessions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          game_type TEXT NOT NULL,
          game_id TEXT NOT NULL UNIQUE,
          game_state JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      // Create indexes for better performance
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_active_game_sessions_user_id 
        ON public.active_game_sessions(user_id)
      `);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_active_game_sessions_game_type 
        ON public.active_game_sessions(game_type)
      `);
      
      console.log('[ensureActiveGameSessions] ✅ Table created successfully');
      
      // Verify the table was created
      const verifyCheck = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'active_game_sessions'
        ORDER BY ordinal_position
      `);
      
      console.log('[ensureActiveGameSessions] Table columns:', verifyCheck.rows);
    } else {
      console.log('[ensureActiveGameSessions] ✅ Table already exists');
      
      // Log existing table structure for debugging
      const columns = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'active_game_sessions'
        ORDER BY ordinal_position
      `);
      
      console.log('[ensureActiveGameSessions] Existing columns:', columns.rows);
    }
    
    // Set search_path to ensure public schema is used
    await client.query(`SET search_path TO public`);
    console.log('[ensureActiveGameSessions] Search path set to public');
    
  } catch (error) {
    console.error('[ensureActiveGameSessions] Error ensuring table exists:', error);
    // Don't throw - allow server to continue even if table creation fails
    // The error will be logged and can be fixed manually if needed
  } finally {
    client.release();
  }
}