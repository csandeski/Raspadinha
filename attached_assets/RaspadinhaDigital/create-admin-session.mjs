import bcrypt from 'bcrypt';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import crypto from 'crypto';

async function createAdminSession() {
  try {
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    const db = drizzle(pool);
    
    // Create admin credentials
    const username = 'admin';
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);
    const sessionId = crypto.randomBytes(32).toString('hex');
    
    // First, check if admin user exists, if not create it
    await pool.query(`
      INSERT INTO admin_users (username, password, created_at, updated_at)
      VALUES ($1, $2, NOW(), NOW())
      ON CONFLICT (username) 
      DO UPDATE SET 
        password = $2,
        updated_at = NOW()
    `, [username, hashedPassword]);
    
    // Create admin session
    await pool.query(`
      INSERT INTO admin_sessions (session_id, username, expires_at, created_at)
      VALUES ($1, $2, NOW() + INTERVAL '30 days', NOW())
    `, [sessionId, username]);
    
    console.log('✅ Admin criado com sucesso!');
    console.log('');
    console.log('=== CREDENCIAIS DE ADMIN ===');
    console.log('Usuário: admin');
    console.log('Senha: admin123');
    console.log('=============================');
    console.log('');
    console.log('Use essas credenciais para fazer login em /admin');
    
    await pool.end();
  } catch (error) {
    console.error('Erro ao criar admin:', error);
  }
}

createAdminSession();