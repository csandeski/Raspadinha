import { db } from "./server/db.ts";
import { prizeProbabilities } from "./shared/schema.ts";
import { eq } from "drizzle-orm";

async function updatePrizeDistribution() {
  console.log("🎯 Updating prize distribution for all games...");

  // Better balanced PIX prizes - more medium prizes
  const pixPrizes = [
    { value: "2.00", probability: "18.00", name: "2 reais" },
    { value: "5.00", probability: "15.00", name: "5 reais" },
    { value: "10.00", probability: "12.00", name: "10 reais" },
    { value: "20.00", probability: "10.00", name: "20 reais" },
    { value: "30.00", probability: "8.00", name: "30 reais" },
    { value: "50.00", probability: "6.00", name: "50 reais" },
    { value: "75.00", probability: "4.00", name: "75 reais" },
    { value: "100.00", probability: "3.00", name: "100 reais" },
    { value: "150.00", probability: "2.00", name: "150 reais" },
    { value: "200.00", probability: "1.50", name: "200 reais" },
    { value: "300.00", probability: "1.00", name: "300 reais" },
    { value: "500.00", probability: "0.50", name: "500 reais" },
    { value: "750.00", probability: "0.30", name: "750 reais" },
    { value: "1000.00", probability: "0.20", name: "1 mil reais" },
    { value: "2000.00", probability: "0.10", name: "2 mil reais" },
    { value: "5000.00", probability: "0.05", name: "5 mil reais" },
    { value: "10000.00", probability: "0.02", name: "10 mil reais" },
    { value: "50000.00", probability: "0.005", name: "50 mil reais" },
    { value: "100000.00", probability: "0.001", name: "100 mil reais" }
  ];

  // Better balanced Me Mimei prizes - beauty products
  const meMimeiPrizes = [
    { value: "3.00", probability: "18.00", name: "Gloss Labial" },
    { value: "8.00", probability: "15.00", name: "Esmalte Premium" },
    { value: "15.00", probability: "12.00", name: "Base Líquida" },
    { value: "25.00", probability: "10.00", name: "Batom Ruby Rose" },
    { value: "35.00", probability: "8.00", name: "Paleta de Sombras" },
    { value: "50.00", probability: "6.00", name: "Kit Skincare Básico" },
    { value: "75.00", probability: "4.00", name: "Perfume Nacional" },
    { value: "100.00", probability: "3.00", name: "Kit Maquiagem" },
    { value: "150.00", probability: "2.00", name: "Secador de Cabelo" },
    { value: "200.00", probability: "1.50", name: "Kit Completo Natura" },
    { value: "300.00", probability: "1.00", name: "Prancha Profissional" },
    { value: "500.00", probability: "0.50", name: "Perfume Importado" },
    { value: "750.00", probability: "0.30", name: "Kit O Boticário Premium" },
    { value: "1000.00", probability: "0.20", name: "Babyliss Pro" },
    { value: "2000.00", probability: "0.10", name: "Kit MAC Completo" },
    { value: "5000.00", probability: "0.05", name: "Dyson Airwrap" },
    { value: "10000.00", probability: "0.02", name: "Vale Compras Sephora" },
    { value: "50000.00", probability: "0.005", name: "Dia de Princesa Completo" },
    { value: "100000.00", probability: "0.001", name: "Spa & Shopping Ilimitado" }
  ];

  // Better balanced Eletrônicos prizes
  const eletronicosPrizes = [
    { value: "5.00", probability: "18.00", name: "Cabo USB-C" },
    { value: "10.00", probability: "15.00", name: "Capinha Premium" },
    { value: "20.00", probability: "12.00", name: "Película 3D" },
    { value: "30.00", probability: "10.00", name: "Suporte Veicular" },
    { value: "50.00", probability: "8.00", name: "Fone com Fio" },
    { value: "75.00", probability: "6.00", name: "Carregador Turbo" },
    { value: "100.00", probability: "4.00", name: "Power Bank 10000mAh" },
    { value: "150.00", probability: "3.00", name: "Mouse Gamer" },
    { value: "200.00", probability: "2.00", name: "Teclado Mecânico" },
    { value: "300.00", probability: "1.50", name: "Fone Bluetooth" },
    { value: "500.00", probability: "1.00", name: "SmartWatch" },
    { value: "750.00", probability: "0.50", name: "Caixa JBL" },
    { value: "1000.00", probability: "0.30", name: "Tablet Samsung" },
    { value: "1500.00", probability: "0.20", name: "Monitor Gamer" },
    { value: "3000.00", probability: "0.10", name: "TV 50\" 4K" },
    { value: "5000.00", probability: "0.05", name: "PlayStation 5" },
    { value: "10000.00", probability: "0.02", name: "iPhone 16" },
    { value: "50000.00", probability: "0.005", name: "Setup Gamer Completo" },
    { value: "100000.00", probability: "0.001", name: "Kit Apple Premium" }
  ];

  // Better balanced Super Prêmios - bigger prizes
  const superPremiosPrizes = [
    { value: "20.00", probability: "18.00", name: "Vale Combustível" },
    { value: "50.00", probability: "15.00", name: "Vale Refeição" },
    { value: "100.00", probability: "12.00", name: "Vale Compras" },
    { value: "200.00", probability: "10.00", name: "Tênis Esportivo" },
    { value: "300.00", probability: "8.00", name: "Óculos de Sol" },
    { value: "500.00", probability: "6.00", name: "Relógio Digital" },
    { value: "750.00", probability: "4.00", name: "Bicicleta" },
    { value: "1000.00", probability: "3.00", name: "Celular Básico" },
    { value: "1500.00", probability: "2.00", name: "TV 32\"" },
    { value: "2000.00", probability: "1.50", name: "Notebook" },
    { value: "3000.00", probability: "1.00", name: "Geladeira" },
    { value: "5000.00", probability: "0.50", name: "Móveis Planejados" },
    { value: "10000.00", probability: "0.30", name: "Scooter Elétrica" },
    { value: "20000.00", probability: "0.20", name: "Moto 0KM" },
    { value: "50000.00", probability: "0.10", name: "Carro Popular" },
    { value: "100000.00", probability: "0.05", name: "SUV 0KM" },
    { value: "200000.00", probability: "0.02", name: "Casa Própria" },
    { value: "500000.00", probability: "0.005", name: "Prêmio Máximo" },
    { value: "1000000.00", probability: "0.001", name: "1 Milhão de Reais" }
  ];

  try {
    // Clear existing probabilities
    console.log("Clearing existing prize probabilities...");
    await db.delete(prizeProbabilities);

    // Insert PIX prizes
    console.log("Inserting PIX prizes...");
    for (let i = 0; i < pixPrizes.length; i++) {
      await db.insert(prizeProbabilities).values({
        gameType: "pix",
        prizeValue: pixPrizes[i].value,
        prizeName: pixPrizes[i].name,
        probability: pixPrizes[i].probability,
        order: i,
        updatedAt: new Date(),
        updatedBy: "system"
      });
    }

    // Insert Me Mimei prizes
    console.log("Inserting Me Mimei prizes...");
    for (let i = 0; i < meMimeiPrizes.length; i++) {
      await db.insert(prizeProbabilities).values({
        gameType: "me_mimei",
        prizeValue: meMimeiPrizes[i].value,
        prizeName: meMimeiPrizes[i].name,
        probability: meMimeiPrizes[i].probability,
        order: i,
        updatedAt: new Date(),
        updatedBy: "system"
      });
    }

    // Insert Eletrônicos prizes
    console.log("Inserting Eletrônicos prizes...");
    for (let i = 0; i < eletronicosPrizes.length; i++) {
      await db.insert(prizeProbabilities).values({
        gameType: "eletronicos",
        prizeValue: eletronicosPrizes[i].value,
        prizeName: eletronicosPrizes[i].name,
        probability: eletronicosPrizes[i].probability,
        order: i,
        updatedAt: new Date(),
        updatedBy: "system"
      });
    }

    // Insert Super Prêmios prizes
    console.log("Inserting Super Prêmios prizes...");
    for (let i = 0; i < superPremiosPrizes.length; i++) {
      await db.insert(prizeProbabilities).values({
        gameType: "super",
        prizeValue: superPremiosPrizes[i].value,
        prizeName: superPremiosPrizes[i].name,
        probability: superPremiosPrizes[i].probability,
        order: i,
        updatedAt: new Date(),
        updatedBy: "system"
      });
    }

    console.log("✅ Prize distribution updated successfully!");
    console.log("\n📊 New Distribution Summary:");
    console.log("PIX: 19 prizes from R$2 to R$100,000");
    console.log("Me Mimei: 19 prizes from R$3 to R$100,000");
    console.log("Eletrônicos: 19 prizes from R$5 to R$100,000");
    console.log("Super Prêmios: 19 prizes from R$20 to R$1,000,000");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error updating prize distribution:", error);
    process.exit(1);
  }
}

updatePrizeDistribution();