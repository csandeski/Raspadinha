import { db } from "./server/db";
import { prizeProbabilities } from "@shared/schema";
import { sql } from "drizzle-orm";

async function importPrizeData() {
  console.log("Starting prize probabilities import...");
  
  try {
    // Clear existing prize probabilities
    await db.delete(prizeProbabilities);
    console.log("Cleared existing prize probabilities");
    
    // Prize data for all games
    const prizeData = [
      // PIX prizes
      { gameType: 'pix', prizeValue: '0.50', prizeName: 'R$ 0,50', probability: '33.219324', order: 1 },
      { gameType: 'pix', prizeValue: '1.00', prizeName: 'R$ 1,00', probability: '6.609662', order: 2 },
      { gameType: 'pix', prizeValue: '2.00', prizeName: 'R$ 2,00', probability: '3.304831', order: 3 },
      { gameType: 'pix', prizeValue: '3.00', prizeName: 'R$ 3,00', probability: '2.203221', order: 4 },
      { gameType: 'pix', prizeValue: '4.00', prizeName: 'R$ 4,00', probability: '1.652416', order: 5 },
      { gameType: 'pix', prizeValue: '5.00', prizeName: 'R$ 5,00', probability: '1.321932', order: 6 },
      { gameType: 'pix', prizeValue: '10.00', prizeName: 'R$ 10,00', probability: '0.660966', order: 7 },
      { gameType: 'pix', prizeValue: '15.00', prizeName: 'R$ 15,00', probability: '0.440644', order: 8 },
      { gameType: 'pix', prizeValue: '20.00', prizeName: 'R$ 20,00', probability: '0.330483', order: 9 },
      { gameType: 'pix', prizeValue: '50.00', prizeName: 'R$ 50,00', probability: '0.132193', order: 10 },
      { gameType: 'pix', prizeValue: '100.00', prizeName: 'R$ 100,00', probability: '0.066097', order: 11 },
      { gameType: 'pix', prizeValue: '200.00', prizeName: 'R$ 200,00', probability: '0.033048', order: 12 },
      { gameType: 'pix', prizeValue: '500.00', prizeName: 'R$ 500,00', probability: '0.013219', order: 13 },
      { gameType: 'pix', prizeValue: '1000.00', prizeName: 'R$ 1.000,00', probability: '0.006610', order: 14 },
      { gameType: 'pix', prizeValue: '2000.00', prizeName: 'R$ 2.000,00', probability: '0.003305', order: 15 },
      { gameType: 'pix', prizeValue: '5000.00', prizeName: 'R$ 5.000,00', probability: '0.001322', order: 16 },
      { gameType: 'pix', prizeValue: '10000.00', prizeName: 'R$ 10.000,00', probability: '0.000661', order: 17 },
      { gameType: 'pix', prizeValue: '100000.00', prizeName: 'R$ 100.000,00', probability: '0.000066', order: 18 },
      
      // Me Mimei prizes
      { gameType: 'me_mimei', prizeValue: '0.50', prizeName: '50 centavos', probability: '33.219324', order: 1 },
      { gameType: 'me_mimei', prizeValue: '1.00', prizeName: '1 real', probability: '6.609662', order: 2 },
      { gameType: 'me_mimei', prizeValue: '2.00', prizeName: '2 reais', probability: '3.304831', order: 3 },
      { gameType: 'me_mimei', prizeValue: '3.00', prizeName: '3 reais', probability: '2.203221', order: 4 },
      { gameType: 'me_mimei', prizeValue: '4.00', prizeName: '4 reais', probability: '1.652416', order: 5 },
      { gameType: 'me_mimei', prizeValue: '5.00', prizeName: '5 reais', probability: '1.321932', order: 6 },
      { gameType: 'me_mimei', prizeValue: '10.00', prizeName: 'Batom Boca Rosa', probability: '0.660966', order: 7 },
      { gameType: 'me_mimei', prizeValue: '15.00', prizeName: 'Máscara Ruby Rose', probability: '0.440644', order: 8 },
      { gameType: 'me_mimei', prizeValue: '20.00', prizeName: 'Iluminador Bruna Tavares', probability: '0.330483', order: 9 },
      { gameType: 'me_mimei', prizeValue: '50.00', prizeName: 'Perfume Egeo Dolce', probability: '0.132193', order: 10 },
      { gameType: 'me_mimei', prizeValue: '100.00', prizeName: 'Bolsa Petite Jolie', probability: '0.066097', order: 11 },
      { gameType: 'me_mimei', prizeValue: '200.00', prizeName: 'Kit WEPINK', probability: '0.033048', order: 12 },
      { gameType: 'me_mimei', prizeValue: '500.00', prizeName: 'Perfume Good Girl', probability: '0.013219', order: 13 },
      { gameType: 'me_mimei', prizeValue: '1000.00', prizeName: 'Kit Completo Bruna Tavares', probability: '0.006610', order: 14 },
      { gameType: 'me_mimei', prizeValue: '2000.00', prizeName: 'Kit Kerastase', probability: '0.003305', order: 15 },
      { gameType: 'me_mimei', prizeValue: '5000.00', prizeName: 'Bolsa Luxo Michael Kors', probability: '0.001322', order: 16 },
      { gameType: 'me_mimei', prizeValue: '10000.00', prizeName: 'Dyson Secador', probability: '0.000661', order: 17 },
      { gameType: 'me_mimei', prizeValue: '100000.00', prizeName: 'Anel Vivara Diamante', probability: '0.000066', order: 18 },
      
      // Eletrônicos prizes
      { gameType: 'eletronicos', prizeValue: '0.50', prizeName: '50 centavos', probability: '33.219324', order: 1 },
      { gameType: 'eletronicos', prizeValue: '1.00', prizeName: '1 real', probability: '6.609662', order: 2 },
      { gameType: 'eletronicos', prizeValue: '2.00', prizeName: '2 reais', probability: '3.304831', order: 3 },
      { gameType: 'eletronicos', prizeValue: '3.00', prizeName: '3 reais', probability: '2.203221', order: 4 },
      { gameType: 'eletronicos', prizeValue: '4.00', prizeName: '4 reais', probability: '1.652416', order: 5 },
      { gameType: 'eletronicos', prizeValue: '5.00', prizeName: '5 reais', probability: '1.321932', order: 6 },
      { gameType: 'eletronicos', prizeValue: '10.00', prizeName: 'Cabo USB', probability: '0.660966', order: 7 },
      { gameType: 'eletronicos', prizeValue: '15.00', prizeName: 'Suporte de Celular', probability: '0.440644', order: 8 },
      { gameType: 'eletronicos', prizeValue: '20.00', prizeName: 'Capinha de Celular', probability: '0.330483', order: 9 },
      { gameType: 'eletronicos', prizeValue: '50.00', prizeName: 'Power Bank', probability: '0.132193', order: 10 },
      { gameType: 'eletronicos', prizeValue: '100.00', prizeName: 'Fone sem Fio', probability: '0.066097', order: 11 },
      { gameType: 'eletronicos', prizeValue: '200.00', prizeName: 'SmartWatch', probability: '0.033048', order: 12 },
      { gameType: 'eletronicos', prizeValue: '500.00', prizeName: 'Air Fryer', probability: '0.013219', order: 13 },
      { gameType: 'eletronicos', prizeValue: '1000.00', prizeName: 'Caixa de Som JBL', probability: '0.006610', order: 14 },
      { gameType: 'eletronicos', prizeValue: '2000.00', prizeName: 'Smart TV 55" 4K', probability: '0.003305', order: 15 },
      { gameType: 'eletronicos', prizeValue: '5000.00', prizeName: 'Notebook Dell G15', probability: '0.001322', order: 16 },
      { gameType: 'eletronicos', prizeValue: '10000.00', prizeName: 'iPhone 16 Pro', probability: '0.000661', order: 17 },
      { gameType: 'eletronicos', prizeValue: '100000.00', prizeName: 'Kit Completo Apple', probability: '0.000066', order: 18 },
      
      // Super Prêmios prizes
      { gameType: 'super', prizeValue: '10.00', prizeName: 'R$ 10,00', probability: '33.221276', order: 1 },
      { gameType: 'super', prizeValue: '20.00', prizeName: 'R$ 20,00', probability: '6.610638', order: 2 },
      { gameType: 'super', prizeValue: '40.00', prizeName: 'R$ 40,00', probability: '3.305319', order: 3 },
      { gameType: 'super', prizeValue: '60.00', prizeName: 'R$ 60,00', probability: '2.203546', order: 4 },
      { gameType: 'super', prizeValue: '80.00', prizeName: 'R$ 80,00', probability: '1.652659', order: 5 },
      { gameType: 'super', prizeValue: '100.00', prizeName: 'R$ 100,00', probability: '1.322128', order: 6 },
      { gameType: 'super', prizeValue: '200.00', prizeName: 'Óculos', probability: '0.661064', order: 7 },
      { gameType: 'super', prizeValue: '300.00', prizeName: 'Capacete', probability: '0.440709', order: 8 },
      { gameType: 'super', prizeValue: '400.00', prizeName: 'Bicicleta', probability: '0.330532', order: 9 },
      { gameType: 'super', prizeValue: '1000.00', prizeName: 'HoverBoard', probability: '0.132213', order: 10 },
      { gameType: 'super', prizeValue: '2000.00', prizeName: 'Patinete Elétrico', probability: '0.066106', order: 11 },
      { gameType: 'super', prizeValue: '4000.00', prizeName: 'Scooter Elétrica', probability: '0.033053', order: 12 },
      { gameType: 'super', prizeValue: '10000.00', prizeName: 'Buggy', probability: '0.013221', order: 13 },
      { gameType: 'super', prizeValue: '20000.00', prizeName: 'Moto CG', probability: '0.006611', order: 14 },
      { gameType: 'super', prizeValue: '200000.00', prizeName: 'Jeep Compass', probability: '0.000661', order: 15 },
      { gameType: 'super', prizeValue: '500000.00', prizeName: 'Super Sorte', probability: '0.000264', order: 16 }
    ];
    
    // Insert all prize data
    for (const prize of prizeData) {
      await db.insert(prizeProbabilities).values({
        gameType: prize.gameType,
        prizeValue: prize.prizeValue,
        prizeName: prize.prizeName,
        probability: prize.probability,
        order: prize.order,
        updatedAt: new Date(),
        updatedBy: 'admin'
      });
    }
    
    console.log(`Successfully imported ${prizeData.length} prize probabilities`);
    
    // Verify the import
    const count = await db.select({ count: sql`count(*)` }).from(prizeProbabilities);
    console.log(`Total prize probabilities in database: ${count[0].count}`);
    
  } catch (error) {
    console.error("Error importing prize data:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

importPrizeData();