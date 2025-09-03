async function finalTest() {
  console.log('🎯 TESTE FINAL DO SISTEMA DE PARCEIROS\n');
  console.log('=' .repeat(50));
  
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);
  
  // Get click count before
  const getClickCount = async () => {
    const { stdout } = await execAsync(`npx tsx -e "
      import { db } from './server/db';
      import { partnerCodes, partnerClicks } from './shared/schema';
      import { eq } from 'drizzle-orm';
      
      Promise.all([
        db.select().from(partnerCodes).where(eq(partnerCodes.code, 'NOVOSIM')),
        db.select().from(partnerClicks).where(eq(partnerClicks.code, 'NOVOSIM'))
      ]).then(([codes, clicks]) => {
        console.log(JSON.stringify({
          clickCount: codes[0]?.clickCount || 0,
          totalClicks: clicks.length
        }));
        process.exit(0);
      });
    "`);
    return JSON.parse(stdout.trim());
  };
  
  const before = await getClickCount();
  console.log('ANTES DO TESTE:');
  console.log('  Click Count no partner_codes:', before.clickCount);
  console.log('  Total registros em partner_clicks:', before.totalClicks);
  
  // Simulate browser visiting with partner link (like affiliate-tracker.ts does)
  console.log('\n📱 Simulando visita com link: /?ref=NOVOSIM');
  
  // First try affiliate (will fail)
  const affiliateResp = await fetch('http://localhost:5000/api/affiliate/track-click', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: 'NOVOSIM',
      url: 'http://mania-brasil.com/?ref=NOVOSIM',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)'
    })
  });
  
  console.log('  1. Tentou afiliado:', affiliateResp.status === 404 ? '404 (não encontrado) ✓' : affiliateResp.status);
  
  if (!affiliateResp.ok) {
    // Then try partner
    const partnerResp = await fetch('http://localhost:5000/api/partner/track-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: 'NOVOSIM',
        ipAddress: '',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        referrer: 'https://whatsapp.com'
      })
    });
    
    console.log('  2. Tentou parceiro:', partnerResp.status === 200 ? '200 (sucesso) ✓' : partnerResp.status);
  }
  
  // Check after
  const after = await getClickCount();
  console.log('\nDEPOIS DO TESTE:');
  console.log('  Click Count no partner_codes:', after.clickCount);
  console.log('  Total registros em partner_clicks:', after.totalClicks);
  
  console.log('\n' + '=' .repeat(50));
  if (after.clickCount > before.clickCount && after.totalClicks > before.totalClicks) {
    console.log('✅ SUCESSO TOTAL!');
    console.log('  - Click count aumentou de', before.clickCount, 'para', after.clickCount);
    console.log('  - Registros aumentaram de', before.totalClicks, 'para', after.totalClicks);
    console.log('\n🎉 SISTEMA DE PARCEIROS FUNCIONANDO PERFEITAMENTE!');
  } else {
    console.log('❌ ERRO: Contadores não aumentaram corretamente');
  }
  
  process.exit(0);
}

finalTest();
