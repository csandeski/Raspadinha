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

// Define probabilities for each game with 19 balanced prizes
const gameProbabilities = {
  'premio-pix': [
    { value: '2.00', name: 'R$ 2,00', probability: 18 },
    { value: '5.00', name: 'R$ 5,00', probability: 15 },
    { value: '10.00', name: 'R$ 10,00', probability: 12 },
    { value: '20.00', name: 'R$ 20,00', probability: 10 },
    { value: '30.00', name: 'R$ 30,00', probability: 8 },
    { value: '50.00', name: 'R$ 50,00', probability: 6 },
    { value: '75.00', name: 'R$ 75,00', probability: 4 },
    { value: '100.00', name: 'R$ 100,00', probability: 3 },
    { value: '150.00', name: 'R$ 150,00', probability: 2 },
    { value: '200.00', name: 'R$ 200,00', probability: 1.5 },
    { value: '300.00', name: 'R$ 300,00', probability: 1 },
    { value: '500.00', name: 'R$ 500,00', probability: 0.5 },
    { value: '750.00', name: 'R$ 750,00', probability: 0.3 },
    { value: '1000.00', name: 'R$ 1.000,00', probability: 0.2 },
    { value: '2000.00', name: 'R$ 2.000,00', probability: 0.1 },
    { value: '5000.00', name: 'R$ 5.000,00', probability: 0.05 },
    { value: '10000.00', name: 'R$ 10.000,00', probability: 0.02 },
    { value: '50000.00', name: 'R$ 50.000,00', probability: 0.005 },
    { value: '100000.00', name: 'R$ 100.000,00', probability: 0.001 }
  ],
  'premio-me-mimei': [
    { value: '5.00', name: 'Presente Básico', probability: 18 },
    { value: '10.00', name: 'Presente Simples', probability: 15 },
    { value: '20.00', name: 'Presente Legal', probability: 12 },
    { value: '30.00', name: 'Presente Especial', probability: 10 },
    { value: '50.00', name: 'Kit Beleza', probability: 8 },
    { value: '75.00', name: 'Kit Premium', probability: 6 },
    { value: '100.00', name: 'Vale Compras', probability: 4 },
    { value: '150.00', name: 'Dia de Beleza', probability: 3 },
    { value: '200.00', name: 'Spa Day', probability: 2 },
    { value: '300.00', name: 'Kit Luxo', probability: 1.5 },
    { value: '500.00', name: 'Shopping Spree', probability: 1 },
    { value: '750.00', name: 'Experiência VIP', probability: 0.5 },
    { value: '1000.00', name: 'Pacote Completo', probability: 0.3 },
    { value: '2000.00', name: 'Viagem Romântica', probability: 0.2 },
    { value: '5000.00', name: 'Lua de Mel', probability: 0.1 },
    { value: '10000.00', name: 'Experiência Diamante', probability: 0.05 },
    { value: '20000.00', name: 'Pacote dos Sonhos', probability: 0.02 },
    { value: '50000.00', name: 'Vida de Princesa', probability: 0.005 },
    { value: '100000.00', name: 'Conto de Fadas', probability: 0.001 }
  ],
  'premio-eletronicos': [
    { value: '10.00', name: 'Acessório', probability: 18 },
    { value: '25.00', name: 'Carregador', probability: 15 },
    { value: '50.00', name: 'Fone Bluetooth', probability: 12 },
    { value: '100.00', name: 'Mouse Gamer', probability: 10 },
    { value: '150.00', name: 'Teclado', probability: 8 },
    { value: '200.00', name: 'Smartwatch', probability: 6 },
    { value: '300.00', name: 'Tablet', probability: 4 },
    { value: '500.00', name: 'Console Portátil', probability: 3 },
    { value: '750.00', name: 'Monitor', probability: 2 },
    { value: '1000.00', name: 'Smartphone', probability: 1.5 },
    { value: '1500.00', name: 'Notebook', probability: 1 },
    { value: '2000.00', name: 'Smart TV', probability: 0.5 },
    { value: '3000.00', name: 'Console Premium', probability: 0.3 },
    { value: '5000.00', name: 'PC Gamer', probability: 0.2 },
    { value: '10000.00', name: 'Setup Completo', probability: 0.1 },
    { value: '20000.00', name: 'Home Theater', probability: 0.05 },
    { value: '50000.00', name: 'Sala Gamer', probability: 0.02 },
    { value: '100000.00', name: 'Tech Paradise', probability: 0.005 },
    { value: '200000.00', name: 'Casa Inteligente', probability: 0.001 }
  ],
  'premio-super-premios': [
    { value: '50.00', name: 'Vale Presente', probability: 18 },
    { value: '100.00', name: 'Vale Combustível', probability: 15 },
    { value: '200.00', name: 'Vale Restaurante', probability: 12 },
    { value: '500.00', name: 'Vale Viagem', probability: 10 },
    { value: '1000.00', name: 'Pacote Resort', probability: 8 },
    { value: '2000.00', name: 'Cruzeiro', probability: 6 },
    { value: '3000.00', name: 'Viagem Nacional', probability: 4 },
    { value: '5000.00', name: 'Viagem Internacional', probability: 3 },
    { value: '7500.00', name: 'Moto 0km', probability: 2 },
    { value: '10000.00', name: 'Reforma Casa', probability: 1.5 },
    { value: '20000.00', name: 'Carro Popular', probability: 1 },
    { value: '50000.00', name: 'SUV 0km', probability: 0.5 },
    { value: '100000.00', name: 'Carro Premium', probability: 0.3 },
    { value: '200000.00', name: 'Apartamento', probability: 0.2 },
    { value: '500000.00', name: 'Casa Própria', probability: 0.1 },
    { value: '1000000.00', name: 'Mansão', probability: 0.05 },
    { value: '2000000.00', name: 'Ilha Particular', probability: 0.02 },
    { value: '5000000.00', name: 'Vida de Milionário', probability: 0.005 },
    { value: '10000000.00', name: 'Jackpot Supremo', probability: 0.001 }
  ]
};

async function fixPrizeProbabilities() {
  console.log('Starting to fix prize probabilities...\n');
  
  for (const [gameType, probabilities] of Object.entries(gameProbabilities)) {
    console.log(`Processing ${gameType}...`);
    
    // Delete existing probabilities for this game type
    await db.delete(prizeProbabilities)
      .where(eq(prizeProbabilities.gameType, gameType));
    console.log(`  - Deleted existing probabilities`);
    
    // Insert new probabilities
    const toInsert = probabilities.map((p, index) => ({
      gameType,
      prizeValue: p.value,
      prizeName: p.name,
      probability: p.probability,
      order: index,
      updatedAt: new Date(),
      updatedBy: 'system'
    }));
    
    await db.insert(prizeProbabilities).values(toInsert);
    console.log(`  - Inserted ${toInsert.length} new probabilities`);
    
    // Calculate total probability
    const total = probabilities.reduce((sum, p) => sum + p.probability, 0);
    console.log(`  - Total probability: ${total.toFixed(3)}%\n`);
  }
  
  console.log('Prize probabilities fixed successfully!');
  process.exit(0);
}

fixPrizeProbabilities().catch(error => {
  console.error('Error fixing prize probabilities:', error);
  process.exit(1);
});