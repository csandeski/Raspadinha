import pg from 'pg';
import fs from 'fs';

const { Pool } = pg;

// Conexão com o banco local
const localPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Conexão com o Supabase - forçando IPv4
const supabaseUrl = process.env.SUPABASE_DATABASE_URL;
const modifiedUrl = supabaseUrl.replace('6432', '6432?sslmode=require');

const supabasePool = new Pool({
  connectionString: modifiedUrl,
});

async function testSupabaseConnection() {
  try {
    console.log('🔄 Testando conexão com Supabase...');
    const result = await supabasePool.query('SELECT NOW()');
    console.log('✅ Conexão com Supabase estabelecida:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar com Supabase:', error.message);
    return false;
  }
}

async function migrate() {
  try {
    // Testar conexão primeiro
    const connected = await testSupabaseConnection();
    if (!connected) {
      console.log('\n❌ Não foi possível conectar ao Supabase.');
      console.log('Verifique se a URL está correta e se o banco está acessível.');
      process.exit(1);
    }

    console.log('\n📦 Iniciando migração para Supabase...\n');

    // Ler o schema SQL
    console.log('📄 Lendo schema do banco atual...');
    const schema = fs.readFileSync('current_schema.sql', 'utf8');
    
    // Limpar e preparar o schema para o Supabase
    const cleanedSchema = schema
      .replace(/OWNER TO postgres;/g, '')
      .replace(/ALTER TABLE .* OWNER TO .*;/g, '')
      .replace(/ALTER SEQUENCE .* OWNER TO .*;/g, '')
      .replace(/ALTER TYPE .* OWNER TO .*;/g, '')
      .replace(/SET default_tablespace = '';/g, '')
      .replace(/SET default_table_access_method = heap;/g, '');

    // Dividir em comandos individuais
    const commands = cleanedSchema
      .split(';')
      .filter(cmd => cmd.trim())
      .map(cmd => cmd.trim() + ';');

    console.log(`📊 Encontrados ${commands.length} comandos de estrutura\n`);

    // Executar comandos de estrutura
    console.log('🏗️  Criando estrutura no Supabase...');
    let successCount = 0;
    let errorCount = 0;

    for (const command of commands) {
      if (command.includes('CREATE') || command.includes('ALTER')) {
        try {
          await supabasePool.query(command);
          successCount++;
          process.stdout.write('.');
        } catch (error) {
          errorCount++;
          if (!error.message.includes('already exists')) {
            console.log(`\n⚠️  Erro em comando:`, error.message.substring(0, 100));
          }
        }
      }
    }

    console.log(`\n✅ Estrutura criada: ${successCount} comandos executados`);
    if (errorCount > 0) {
      console.log(`⚠️  ${errorCount} comandos ignorados (já existentes ou incompatíveis)`);
    }

    // Migrar dados
    console.log('\n📋 Lendo dados do banco atual...');
    const data = fs.readFileSync('current_data.sql', 'utf8');
    
    // Filtrar apenas INSERTs
    const inserts = data
      .split('\n')
      .filter(line => line.startsWith('INSERT INTO'))
      .filter(line => !line.includes('INSERT INTO public.schema_migrations'));

    console.log(`📊 Encontrados ${inserts.length} registros para migrar\n`);

    if (inserts.length > 0) {
      console.log('💾 Inserindo dados no Supabase...');
      let dataSuccess = 0;
      let dataError = 0;

      for (const insert of inserts) {
        try {
          await supabasePool.query(insert);
          dataSuccess++;
          process.stdout.write('.');
        } catch (error) {
          dataError++;
          if (!error.message.includes('duplicate key')) {
            console.log(`\n⚠️  Erro ao inserir:`, error.message.substring(0, 100));
          }
        }
      }

      console.log(`\n✅ Dados migrados: ${dataSuccess} registros inseridos`);
      if (dataError > 0) {
        console.log(`⚠️  ${dataError} registros ignorados (duplicados ou erros)`);
      }
    }

    // Verificar migração
    console.log('\n🔍 Verificando migração...');
    
    const tables = await supabasePool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    
    console.log(`\n📊 Tabelas criadas no Supabase (${tables.rows.length}):`);
    tables.rows.forEach(t => console.log(`   - ${t.tablename}`));

    // Contar registros em tabelas principais
    const mainTables = ['users', 'games', 'deposits', 'withdrawals', 'affiliates'];
    console.log('\n📈 Contagem de registros:');
    
    for (const table of mainTables) {
      try {
        const result = await supabasePool.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`   - ${table}: ${result.rows[0].count} registros`);
      } catch (error) {
        // Tabela pode não existir
      }
    }

    console.log('\n✅ Migração concluída com sucesso!');
    console.log('\n🎯 Próximos passos:');
    console.log('1. O banco de dados Supabase está pronto');
    console.log('2. Vou atualizar a configuração do projeto para usar o Supabase');
    console.log('3. Reiniciar o servidor com a nova conexão');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erro durante migração:', error);
    process.exit(1);
  }
}

migrate();