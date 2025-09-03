import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { prizeProbabilities } from './shared/schema.ts';
import { eq } from 'drizzle-orm';

const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

await client.connect();
const db = drizzle(client);

// Probabilidades corretas fornecidas pelo usuário
const correctProbabilities = {
  'premio-pix': [
    { value: '0.50', name: 'R$ 0,50', probability: 13.219324, order: 1 },
    { value: '1.00', name: 'R$ 1,00', probability: 6.609662, order: 2 },
    { value: '2.00', name: 'R$ 2,00', probability: 3.304831, order: 3 },
    { value: '3.00', name: 'R$ 3,00', probability: 2.203221, order: 4 },
    { value: '4.00', name: 'R$ 4,00', probability: 1.652416, order: 5 },
    { value: '5.00', name: 'R$ 5,00', probability: 1.321932, order: 6 },
    { value: '10.00', name: 'R$ 10,00', probability: 0.660966, order: 7 },
    { value: '15.00', name: 'R$ 15,00', probability: 0.440644, order: 8 },
    { value: '20.00', name: 'R$ 20,00', probability: 0.330483, order: 9 },
    { value: '50.00', name: 'R$ 50,00', probability: 0.132193, order: 10 },
    { value: '100.00', name: 'R$ 100,00', probability: 0.066097, order: 11 },
    { value: '200.00', name: 'R$ 200,00', probability: 0.033048, order: 12 },
    { value: '500.00', name: 'R$ 500,00', probability: 0.013219, order: 13 },
    { value: '1000.00', name: 'R$ 1.000,00', probability: 0.006610, order: 14 },
    { value: '2000.00', name: 'R$ 2.000,00', probability: 0.003305, order: 15 },
    { value: '5000.00', name: 'R$ 5.000,00', probability: 0.001322, order: 16 },
    { value: '10000.00', name: 'R$ 10.000,00', probability: 0.000661, order: 17 },
    { value: '100000.00', name: 'R$ 100.000,00', probability: 0.000066, order: 18 }
  ],
  'premio-me-mimei': [
    { value: '0.50', name: '50 centavos', probability: 13.219324, order: 1 },
    { value: '1.00', name: '1 real', probability: 6.609662, order: 2 },
    { value: '2.00', name: '2 reais', probability: 3.304831, order: 3 },
    { value: '3.00', name: '3 reais', probability: 2.203221, order: 4 },
    { value: '4.00', name: '4 reais', probability: 1.652416, order: 5 },
    { value: '5.00', name: '5 reais', probability: 1.321932, order: 6 },
    { value: '10.00', name: 'Batom Boca Rosa', probability: 0.660966, order: 7 },
    { value: '15.00', name: 'Máscara Ruby Rose', probability: 0.440644, order: 8 },
    { value: '20.00', name: 'Iluminador Bruna Tavares', probability: 0.330483, order: 9 },
    { value: '50.00', name: 'Perfume Egeo Dolce', probability: 0.132193, order: 10 },
    { value: '100.00', name: 'Bolsa Petite Jolie', probability: 0.066097, order: 11 },
    { value: '200.00', name: 'Kit WEPINK', probability: 0.033048, order: 12 },
    { value: '500.00', name: 'Perfume Good Girl', probability: 0.013219, order: 13 },
    { value: '1000.00', name: 'Kit Completo Bruna Tavares', probability: 0.006610, order: 14 },
    { value: '2000.00', name: 'Kit Kerastase', probability: 0.003305, order: 15 },
    { value: '5000.00', name: 'Bolsa Luxo Michael Kors', probability: 0.001322, order: 16 },
    { value: '10000.00', name: 'Dyson Secador', probability: 0.000661, order: 17 },
    { value: '100000.00', name: 'Anel Vivara Diamante', probability: 0.000066, order: 18 }
  ],
  'premio-eletronicos': [
    { value: '0.50', name: '50 centavos', probability: 13.219324, order: 1 },
    { value: '1.00', name: '1 real', probability: 6.609662, order: 2 },
    { value: '2.00', name: '2 reais', probability: 3.304831, order: 3 },
    { value: '3.00', name: '3 reais', probability: 2.203221, order: 4 },
    { value: '4.00', name: '4 reais', probability: 1.652416, order: 5 },
    { value: '5.00', name: '5 reais', probability: 1.321932, order: 6 },
    { value: '10.00', name: 'Cabo USB', probability: 0.660966, order: 7 },
    { value: '15.00', name: 'Suporte de Celular', probability: 0.440644, order: 8 },
    { value: '20.00', name: 'Capinha de Celular', probability: 0.330483, order: 9 },
    { value: '50.00', name: 'Power Bank', probability: 0.132193, order: 10 },
    { value: '100.00', name: 'Fone sem Fio', probability: 0.066097, order: 11 },
    { value: '200.00', name: 'SmartWatch', probability: 0.033048, order: 12 },
    { value: '500.00', name: 'Air Fryer', probability: 0.013219, order: 13 },
    { value: '1000.00', name: 'Caixa de Som JBL', probability: 0.006610, order: 14 },
    { value: '2000.00', name: 'Smart TV 55" 4K', probability: 0.003305, order: 15 },
    { value: '5000.00', name: 'Notebook Dell G15', probability: 0.001322, order: 16 },
    { value: '10000.00', name: 'iPhone 16 Pro', probability: 0.000661, order: 17 },
    { value: '100000.00', name: 'Kit Completo Apple', probability: 0.000066, order: 18 }
  ],
  'premio-super-premios': [
    { value: '10.00', name: 'R$ 10,00', probability: 13.221276, order: 1 },
    { value: '20.00', name: 'R$ 20,00', probability: 6.610638, order: 2 },
    { value: '40.00', name: 'R$ 40,00', probability: 3.305319, order: 3 },
    { value: '60.00', name: 'R$ 60,00', probability: 2.203546, order: 4 },
    { value: '80.00', name: 'R$ 80,00', probability: 1.652659, order: 5 },
    { value: '100.00', name: 'R$ 100,00', probability: 1.322128, order: 6 },
    { value: '200.00', name: 'Óculos', probability: 0.661064, order: 7 },
    { value: '300.00', name: 'Capacete', probability: 0.440709, order: 8 },
    { value: '400.00', name: 'Bicicleta', probability: 0.330532, order: 9 },
    { value: '1000.00', name: 'HoverBoard', probability: 0.132213, order: 10 },
    { value: '2000.00', name: 'Patinete Elétrico', probability: 0.066106, order: 11 },
    { value: '4000.00', name: 'Scooter Elétrica', probability: 0.033053, order: 12 },
    { value: '10000.00', name: 'Buggy', probability: 0.013221, order: 13 },
    { value: '20000.00', name: 'Moto CG', probability: 0.006611, order: 14 },
    { value: '200000.00', name: 'Jeep Compass', probability: 0.000661, order: 15 },
    { value: '500000.00', name: 'Super Sorte', probability: 0.000264, order: 16 }
  ]
};

async function updateProbabilities() {
  console.log('Atualizando probabilidades corretas no banco de dados...\n');
  
  for (const [gameType, probabilities] of Object.entries(correctProbabilities)) {
    console.log(`\nProcessando ${gameType}...`);
    
    // Deletar probabilidades existentes
    await db.delete(prizeProbabilities)
      .where(eq(prizeProbabilities.gameType, gameType));
    console.log(`  ✓ Deletadas probabilidades antigas`);
    
    // Inserir novas probabilidades
    const toInsert = probabilities.map(p => ({
      gameType,
      prizeValue: p.value,
      prizeName: p.name,
      probability: p.probability,
      order: p.order - 1, // Ajustar ordem para começar em 0
      updatedAt: new Date(),
      updatedBy: 'system'
    }));
    
    await db.insert(prizeProbabilities).values(toInsert);
    console.log(`  ✓ Inseridas ${toInsert.length} novas probabilidades`);
    
    // Calcular probabilidade total
    const total = probabilities.reduce((sum, p) => sum + p.probability, 0);
    console.log(`  ✓ Probabilidade total: ${total.toFixed(6)}%`);
  }
  
  console.log('\n✅ Todas as probabilidades foram atualizadas com sucesso!');
  console.log('\nResumo:');
  console.log('- PIX: 18 prêmios, total ~30%');
  console.log('- Me Mimei: 18 prêmios, total ~30%');
  console.log('- Eletrônicos: 18 prêmios, total ~30%');
  console.log('- Super Prêmios: 16 prêmios, total ~30%');
  
  process.exit(0);
}

updateProbabilities().catch(error => {
  console.error('Erro ao atualizar probabilidades:', error);
  process.exit(1);
});