import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function addPartnerIdColumn() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    
    // Check if column exists
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'partner_id'
    `);
    
    if (checkColumn.rows.length === 0) {
      console.log('Adding partner_id column to users table...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN partner_id INTEGER
      `);
      console.log('Column partner_id added successfully!');
    } else {
      console.log('Column partner_id already exists');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

addPartnerIdColumn();
