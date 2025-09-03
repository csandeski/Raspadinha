import pg from 'pg';

const { Client } = pg;

async function testConnection() {
  const supabaseUrl = process.env.SUPABASE_DATABASE_URL;
  
  console.log('🔍 Testando conexão com Supabase...');
  console.log('URL (parcial):', supabaseUrl.substring(0, 50) + '...');
  
  // Tentar diferentes configurações
  const configs = [
    // Config 1: URL original
    { connectionString: supabaseUrl },
    
    // Config 2: URL com SSL require
    { connectionString: supabaseUrl + '?sslmode=require' },
    
    // Config 3: Parseando a URL manualmente
    (() => {
      const match = supabaseUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
      if (match) {
        return {
          host: match[3],
          port: parseInt(match[4]),
          database: match[5],
          user: match[1],
          password: match[2],
          ssl: { rejectUnauthorized: false }
        };
      }
      return null;
    })()
  ].filter(Boolean);

  for (let i = 0; i < configs.length; i++) {
    console.log(`\n📝 Tentativa ${i + 1}...`);
    const client = new Client(configs[i]);
    
    try {
      await client.connect();
      const result = await client.query('SELECT NOW()');
      console.log('✅ SUCESSO! Conectado ao Supabase');
      console.log('Hora do servidor:', result.rows[0].now);
      
      // Listar tabelas existentes
      const tables = await client.query(`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        LIMIT 10
      `);
      
      console.log('\n📊 Tabelas existentes no Supabase:');
      if (tables.rows.length === 0) {
        console.log('   (Nenhuma tabela encontrada - banco vazio)');
      } else {
        tables.rows.forEach(t => console.log(`   - ${t.tablename}`));
      }
      
      await client.end();
      
      console.log('\n✅ Conexão testada com sucesso!');
      console.log('📝 Configuração que funcionou:', i + 1);
      
      return true;
    } catch (error) {
      console.log(`❌ Erro:`, error.message);
      try { await client.end(); } catch {}
    }
  }
  
  console.log('\n❌ Não foi possível conectar ao Supabase');
  console.log('\n💡 Possíveis soluções:');
  console.log('1. Verifique se a URL do Supabase está correta');
  console.log('2. Verifique se o banco está ativo no painel do Supabase');
  console.log('3. Verifique as configurações de rede/firewall do Supabase');
  
  return false;
}

testConnection().then(success => {
  process.exit(success ? 0 : 1);
});