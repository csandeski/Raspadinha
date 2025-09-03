import dns from 'dns';
import { promisify } from 'util';

const resolve4 = promisify(dns.resolve4);
const resolve6 = promisify(dns.resolve6);

async function testDNS() {
  const host = 'db.qffptdpgjubkuwxsthyf.supabase.co';
  
  console.log('🔍 Testando resolução DNS para:', host);
  
  // Testar diferentes resolvers DNS
  const resolvers = [
    ['8.8.8.8', '8.8.4.4'],    // Google
    ['1.1.1.1', '1.0.0.1'],    // Cloudflare
    ['208.67.222.222', '208.67.220.220'], // OpenDNS
  ];
  
  for (const resolver of resolvers) {
    dns.setServers(resolver);
    console.log(`\n📡 Usando DNS servers: ${resolver.join(', ')}`);
    
    try {
      const ips = await resolve4(host);
      console.log('✅ IPv4 resolvido:', ips);
      
      // Testar conexão direta com IP
      if (ips.length > 0) {
        console.log('\n💡 Para conectar usando IP direto, use:');
        const url = process.env.SUPABASE_DATABASE_URL;
        const newUrl = url.replace('db.qffptdpgjubkuwxsthyf.supabase.co', ips[0]);
        console.log('URL com IP:', newUrl.substring(0, 50) + '...');
        
        return ips[0];
      }
    } catch (error) {
      console.log('❌ Erro IPv4:', error.message);
    }
    
    try {
      const ips = await resolve6(host);
      console.log('✅ IPv6 resolvido:', ips);
    } catch (error) {
      console.log('❌ Erro IPv6:', error.message);
    }
  }
  
  console.log('\n❌ Não foi possível resolver o DNS do Supabase');
  console.log('\n💡 Solução alternativa: Usar proxy ou tunnel');
  
  return null;
}

testDNS();