import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { OptimizedImage } from './optimized-image';

// Generate random Brazilian names - Extended list
const firstNames = [
  'João', 'Maria', 'Pedro', 'Ana', 'Paulo', 'Juliana', 'Carlos', 'Fernanda',
  'José', 'Mariana', 'Antonio', 'Camila', 'Francisco', 'Amanda', 'Lucas',
  'Beatriz', 'Gabriel', 'Larissa', 'Rafael', 'Letícia', 'Bruno', 'Patrícia',
  'Felipe', 'Natália', 'Eduardo', 'Bruna', 'Rodrigo', 'Rafaela', 'Gustavo',
  'Isabela', 'Leonardo', 'Giovana', 'Matheus', 'Vitória', 'Diego', 'Luiza',
  'Thiago', 'Gabriela', 'Daniel', 'Helena', 'Marcelo', 'Carolina', 'Ricardo',
  'Aline', 'Fernando', 'Bianca', 'André', 'Jéssica', 'Roberto', 'Vanessa',
  'Alexandre', 'Tatiana', 'Henrique', 'Priscila', 'Marcos', 'Débora', 'Fábio',
  'Renata', 'Vinícius', 'Adriana', 'Leandro', 'Cristina', 'Maurício', 'Simone',
  'Caio', 'Sabrina', 'Victor', 'Michele', 'Guilherme', 'Talita', 'Júlio',
  'Danielle', 'Sérgio', 'Luciana', 'Igor', 'Raquel', 'Wesley', 'Mônica',
  'Renan', 'Sandra', 'Douglas', 'Elaine', 'Murilo', 'Rosana', 'Arthur',
  'Karla', 'Otávio', 'Viviane', 'Davi', 'Cláudia', 'Samuel', 'Karina',
  'Enzo', 'Alessandra', 'Nicolas', 'Fabiana', 'Lorenzo', 'Verônica', 'Vitor',
  'Lívia', 'Mateus', 'Alice', 'Benjamin', 'Sofia', 'Isaac', 'Laura',
  'Miguel', 'Valentina', 'Heitor', 'Heloísa', 'Bernardo', 'Giovanna', 'Joaquim',
  'Manuela', 'Pietro', 'Sophia', 'Thomas', 'Lorena', 'Benício', 'Rebeca',
  'Augusto', 'Lara', 'Noah', 'Cecília', 'Anthony', 'Esther', 'Oliver'
];

const lastNames = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Pereira', 'Costa', 'Rodrigues', 'Almeida',
  'Nascimento', 'Lima', 'Araújo', 'Fernandes', 'Carvalho', 'Gomes', 'Martins', 'Rocha',
  'Ribeiro', 'Alves', 'Monteiro', 'Mendes', 'Barros', 'Freitas', 'Barbosa', 'Pinto',
  'Moura', 'Cavalcanti', 'Dias', 'Castro', 'Campos', 'Cardoso', 'Teixeira', 'Correia',
  'Soares', 'Machado', 'Vieira', 'Nunes', 'Lopes', 'Moreira', 'Azevedo', 'Melo',
  'Ferreira', 'Borges', 'Ramos', 'Miranda', 'Guimarães', 'Viana', 'Cunha', 'Dantas',
  'Peixoto', 'Farias', 'Fonseca', 'Rezende', 'Duarte', 'Andrade', 'Xavier', 'Batista',
  'Tavares', 'Sampaio', 'Medeiros', 'Nogueira', 'Santana', 'Marques', 'Garcia', 'Leite',
  'Coelho', 'Maia', 'Franco', 'Aguiar', 'Bezerra', 'Assis', 'Braga', 'Siqueira'
];

// Generate winners only for premio games with images - Reduced for better performance
const generateWinners = () => {
  const winners = [];
  const games = ['pix', 'me_mimei', 'eletronicos', 'super', 'esquilo'];
  
  // Define prizes with exact values and names from the actual games
  const gamePrizes = {
    pix: [
      { value: 0.5, name: 'R$ 0,50' },
      { value: 1, name: 'R$ 1,00' },
      { value: 2, name: 'R$ 2,00' },
      { value: 3, name: 'R$ 3,00' },
      { value: 4, name: 'R$ 4,00' },
      { value: 5, name: 'R$ 5,00' },
      { value: 10, name: 'R$ 10,00' },
      { value: 15, name: 'R$ 15,00' },
      { value: 20, name: 'R$ 20,00' },
      { value: 50, name: 'R$ 50,00' },
      { value: 100, name: 'R$ 100,00' },
      { value: 200, name: 'R$ 200,00' },
      { value: 500, name: 'R$ 500,00' },
      { value: 1000, name: 'R$ 1.000,00' },
      { value: 2000, name: 'R$ 2.000,00' },
      { value: 5000, name: 'R$ 5.000,00' },
      { value: 10000, name: 'R$ 10.000,00' },
      { value: 100000, name: 'R$ 100.000,00' }
    ],
    me_mimei: [
      { value: 0.5, name: 'R$ 0,50' },
      { value: 1, name: 'R$ 1,00' },
      { value: 2, name: 'R$ 2,00' },
      { value: 3, name: 'R$ 3,00' },
      { value: 4, name: 'R$ 4,00' },
      { value: 5, name: 'R$ 5,00' },
      { value: 10, name: 'Batom Boca Rosa' },
      { value: 15, name: 'Máscara Ruby Rose' },
      { value: 20, name: 'Iluminador Bruna Tavares' },
      { value: 50, name: 'Perfume Egeo Dolce' },
      { value: 100, name: 'Bolsa Petite Jolie' },
      { value: 200, name: 'Kit WEPINK' },
      { value: 500, name: 'Perfume Good Girl' },
      { value: 1000, name: 'Kit Completo Bruna Tavares' },
      { value: 2000, name: 'Kit Kerastase' },
      { value: 5000, name: 'Bolsa Luxo Michael Kors' },
      { value: 10000, name: 'Dyson Secador' },
      { value: 100000, name: 'Anel Vivara Diamante' }
    ],
    eletronicos: [
      { value: 0.5, name: 'R$ 0,50' },
      { value: 1, name: 'R$ 1,00' },
      { value: 2, name: 'R$ 2,00' },
      { value: 3, name: 'R$ 3,00' },
      { value: 4, name: 'R$ 4,00' },
      { value: 5, name: 'R$ 5,00' },
      { value: 10, name: 'Cabo USB' },
      { value: 15, name: 'Suporte de Celular' },
      { value: 20, name: 'Capinha de Celular' },
      { value: 50, name: 'Power Bank' },
      { value: 100, name: 'Fone sem Fio' },
      { value: 200, name: 'SmartWatch' },
      { value: 500, name: 'Air Fryer' },
      { value: 1000, name: 'Caixa de Som JBL' },
      { value: 2000, name: 'Smart TV 55" 4K' },
      { value: 5000, name: 'Notebook Dell G15' },
      { value: 10000, name: 'iPhone 16 Pro' },
      { value: 100000, name: 'Kit Completo Apple' }
    ],
    super: [
      { value: 10, name: 'R$ 10,00' },
      { value: 20, name: 'R$ 20,00' },
      { value: 40, name: 'R$ 40,00' },
      { value: 60, name: 'R$ 60,00' },
      { value: 80, name: 'R$ 80,00' },
      { value: 100, name: 'R$ 100,00' },
      { value: 200, name: 'Óculos' },
      { value: 300, name: 'Capacete' },
      { value: 400, name: 'Bicicleta' },
      { value: 1000, name: 'HoverBoard' },
      { value: 2000, name: 'Patinete Elétrico' },
      { value: 4000, name: 'Scooter Elétrica' },
      { value: 10000, name: 'Buggy' },
      { value: 20000, name: 'Moto CG' },
      { value: 200000, name: 'Jeep Compass' },
      { value: 500000, name: 'Super Sorte' }
    ],
    esquilo: [
      // Esquilo tem multiplicadores: 0.3x, 0.5x, 0.8x, 2x, 5x
      // Com apostas de 0.50 a 1000, valores comuns do jogo
      { value: 3, name: 'R$ 3,00' },     // 0.3x * 10
      { value: 5, name: 'R$ 5,00' },     // 0.5x * 10
      { value: 8, name: 'R$ 8,00' },     // 0.8x * 10
      { value: 20, name: 'R$ 20,00' },   // 2x * 10
      { value: 50, name: 'R$ 50,00' },   // 5x * 10
      { value: 100, name: 'R$ 100,00' }, // 2x * 50
      { value: 250, name: 'R$ 250,00' }, // 5x * 50
      { value: 500, name: 'R$ 500,00' }, // 5x * 100
      { value: 1000, name: 'R$ 1.000,00' }, // 2x * 500
      { value: 5000, name: 'R$ 5.000,00' }  // 5x * 1000
    ]
  };

  // Generate 30 winners - intercalate big and medium prizes as requested
  for (let i = 0; i < 30; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const game = games[Math.floor(Math.random() * games.length)];
    
    const prizes = gamePrizes[game as keyof typeof gamePrizes];
    
    // Intercalate big and medium prizes for better visual appeal
    let filteredPrizes;
    if (i % 3 === 0) {
      // Every 3rd winner: show a big prize (> 1000)
      filteredPrizes = prizes.filter(prize => prize.value > 1000);
      if (filteredPrizes.length === 0) {
        // If no big prizes, use top 25% of available prizes
        const sortedPrizes = [...prizes].sort((a, b) => b.value - a.value);
        filteredPrizes = sortedPrizes.slice(0, Math.max(1, Math.floor(sortedPrizes.length * 0.25)));
      }
    } else if (i % 3 === 1) {
      // Medium prizes (100-1000)
      filteredPrizes = prizes.filter(prize => prize.value >= 100 && prize.value <= 1000);
      if (filteredPrizes.length === 0) {
        // If no medium prizes, use middle range
        const sortedPrizes = [...prizes].sort((a, b) => a.value - b.value);
        const start = Math.floor(sortedPrizes.length * 0.25);
        const end = Math.floor(sortedPrizes.length * 0.75);
        filteredPrizes = sortedPrizes.slice(start, end + 1);
      }
    } else {
      // Mix of all prizes with weighted distribution
      const rand = Math.random();
      if (rand < 0.3) {
        // 30% small prizes
        filteredPrizes = prizes.filter(prize => prize.value < 100);
      } else if (rand < 0.6) {
        // 30% medium prizes
        filteredPrizes = prizes.filter(prize => prize.value >= 100 && prize.value <= 1000);
      } else {
        // 40% good to big prizes
        filteredPrizes = prizes.filter(prize => prize.value > 500);
      }
    }
    
    // Se não houver prêmios na categoria, pegar qualquer um
    if (!filteredPrizes || filteredPrizes.length === 0) {
      filteredPrizes = prizes;
    }
    
    if (filteredPrizes.length > 0) {
      const prize = filteredPrizes[Math.floor(Math.random() * filteredPrizes.length)];
      
      // Format name as "FirstName La***" (first 2 letters of last name + ***)
      const formattedName = `${firstName} ${lastName.substring(0, 2)}***`;
      
      winners.push({
        id: i,
        name: formattedName,
        game,
        value: prize.value,
        prizeName: prize.name
      });
    }
  }
  
  return winners;
};

const winners = generateWinners();

// Get game display name
const getGameName = (game: string) => {
  const names: { [key: string]: string } = {
    sorte: 'Sorte',
    mines: 'Mines',
    double: 'Double',
    infect: 'Infect',
    pix: 'PIX na Conta',
    me_mimei: 'Me Mimei',
    eletronicos: 'Eletrônicos',
    super: 'Super Prêmios',
    esquilo: 'Esquilo Mania'
  };
  return names[game] || game;
};

// Get prize image for premio games
const getPrizeImage = (game: string, value: number) => {
  // Each folder has images named by value
  
  if (game === 'pix') {
    // PIX folder has all values
    if (value === 0.5) return '/premios/pix/0.5.webp';
    if (value === 1) return '/premios/pix/1.webp';
    if (value === 2) return '/premios/pix/2.webp';
    if (value === 3) return '/premios/pix/3.webp';
    if (value === 4) return '/premios/pix/4.webp';
    if (value === 5) return '/premios/pix/5.webp';
    if (value === 10) return '/premios/pix/10.webp';
    if (value === 15) return '/premios/pix/15.webp';
    if (value === 20) return '/premios/pix/20.webp';
    if (value === 50) return '/premios/pix/50.webp';
    if (value === 100) return '/premios/pix/100.webp';
    if (value === 200) return '/premios/pix/200.webp';
    if (value === 500) return '/premios/pix/500.webp';
    if (value === 1000) return '/premios/pix/1000.webp';
    if (value === 2000) return '/premios/pix/2000.webp';
    if (value === 5000) return '/premios/pix/5000.webp';
    if (value === 10000) return '/premios/pix/10000.webp';
    if (value === 100000) return '/premios/pix/100000.webp';
    return '/premios/pix/100.webp';
  }
  
  if (game === 'me_mimei') {
    // Me-mimei folder has all values
    if (value === 0.5) return '/premios/me-mimei/0.5.webp';
    if (value === 1) return '/premios/me-mimei/1.webp';
    if (value === 2) return '/premios/me-mimei/2.webp';
    if (value === 3) return '/premios/me-mimei/3.webp';
    if (value === 4) return '/premios/me-mimei/4.webp';
    if (value === 5) return '/premios/me-mimei/5.webp';
    if (value === 10) return '/premios/me-mimei/10.webp';
    if (value === 15) return '/premios/me-mimei/15.webp';
    if (value === 20) return '/premios/me-mimei/20.webp';
    if (value === 50) return '/premios/me-mimei/50.webp';
    if (value === 100) return '/premios/me-mimei/100.webp';
    if (value === 200) return '/premios/me-mimei/200.webp';
    if (value === 500) return '/premios/me-mimei/500.webp';
    if (value === 1000) return '/premios/me-mimei/1000.webp';
    if (value === 2000) return '/premios/me-mimei/2000.webp';
    if (value === 5000) return '/premios/me-mimei/5000.webp';
    if (value === 10000) return '/premios/me-mimei/10000.webp';
    if (value === 100000) return '/premios/me-mimei/100000.webp';
    return '/premios/me-mimei/100.webp';
  }
  
  if (game === 'eletronicos') {
    // Eletronicos folder has all values
    if (value === 0.5) return '/premios/eletronicos/0.5.webp';
    if (value === 1) return '/premios/eletronicos/1.webp';
    if (value === 2) return '/premios/eletronicos/2.webp';
    if (value === 3) return '/premios/eletronicos/3.webp';
    if (value === 4) return '/premios/eletronicos/4.webp';
    if (value === 5) return '/premios/eletronicos/5.webp';
    if (value === 10) return '/premios/eletronicos/10.webp';
    if (value === 15) return '/premios/eletronicos/15.webp';
    if (value === 20) return '/premios/eletronicos/20.webp';
    if (value === 50) return '/premios/eletronicos/50.webp';
    if (value === 100) return '/premios/eletronicos/100.webp';
    if (value === 200) return '/premios/eletronicos/200.webp';
    if (value === 500) return '/premios/eletronicos/500.webp';
    if (value === 1000) return '/premios/eletronicos/1000.webp';
    if (value === 2000) return '/premios/eletronicos/2000.webp';
    if (value === 5000) return '/premios/eletronicos/5000.webp';
    if (value === 10000) return '/premios/eletronicos/10000.webp';
    if (value === 100000) return '/premios/eletronicos/100000.webp';
    return '/premios/eletronicos/100.webp';
  }
  
  if (game === 'super') {
    // Super-premios folder has all these exact files
    if (value === 10) return '/premios/super-premios/10.webp';
    if (value === 20) return '/premios/super-premios/20.webp';
    if (value === 40) return '/premios/super-premios/40.webp';
    if (value === 60) return '/premios/super-premios/60.webp';
    if (value === 80) return '/premios/super-premios/80.webp';
    if (value === 100) return '/premios/super-premios/100.webp';
    if (value === 200) return '/premios/super-premios/200.webp';
    if (value === 300) return '/premios/super-premios/300.webp';
    if (value === 400) return '/premios/super-premios/400.webp';
    if (value === 1000) return '/premios/super-premios/1000.webp';
    if (value === 2000) return '/premios/super-premios/2000.webp';
    if (value === 4000) return '/premios/super-premios/4000.webp';
    if (value === 10000) return '/premios/super-premios/10000.webp';
    if (value === 20000) return '/premios/super-premios/20000.webp';
    if (value === 200000) return '/premios/super-premios/200000.webp';
    if (value === 500000) return '/premios/super-premios/500000.webp';
    return '/premios/super-premios/100.webp';
  }
  
  if (game === 'esquilo') {
    // Esquilo uses PIX images as its prizes are money values
    // Map values to appropriate PIX images
    if (value === 3) return '/premios/pix/3.webp';
    if (value === 5) return '/premios/pix/5.webp';
    if (value === 8) return '/premios/pix/10.webp';  // Use 10 for 8
    if (value === 20) return '/premios/pix/20.webp';
    if (value === 50) return '/premios/pix/50.webp';
    if (value === 100) return '/premios/pix/100.webp';
    if (value === 250) return '/premios/pix/200.webp'; // Use 200 for 250
    if (value === 500) return '/premios/pix/500.webp';
    if (value === 1000) return '/premios/pix/1000.webp';
    if (value === 5000) return '/premios/pix/5000.webp';
    // Fallback for other values
    if (value <= 5) return '/premios/pix/5.webp';
    if (value <= 20) return '/premios/pix/20.webp';
    if (value <= 50) return '/premios/pix/50.webp';
    if (value <= 100) return '/premios/pix/100.webp';
    if (value <= 500) return '/premios/pix/500.webp';
    if (value <= 1000) return '/premios/pix/1000.webp';
    if (value <= 5000) return '/premios/pix/5000.webp';
    return '/premios/pix/10000.webp';
  }
  
  // For minigames (sorte, mines, double, infect) use raspadinha image
  return '/premios/raspadinha.webp';
};



// Format money values in Brazilian format
const formatBrazilianMoney = (value: number) => {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export default function WinnersCarousel() {
  // Temporariamente desabilitado - remover este return para reativar o carrossel
  return null;
  
  const [, setLocation] = useLocation();
  
  // Get game route based on game type
  const getGameRoute = (game: string) => {
    switch (game) {
      case 'pix':
        return '/game/premio-pix';
      case 'me_mimei':
        return '/game/premio-me-mimei';
      case 'eletronicos':
        return '/game/premio-eletronicos';
      case 'super':
        return '/game/premio-super-premios';
      case 'esquilo':
        return '/game/jogo-esquilo';
      default:
        return '/';
    }
  };
  
  // Duplicate winners for infinite scroll effect
  const duplicatedWinners = [...winners, ...winners];
  
  return (
    <div className="w-full mb-4 overflow-hidden py-2">
      <div className="relative">
        {/* Live indicator */}
        <div className="absolute top-1 left-4 z-20 flex items-center gap-1 bg-[#00E880] px-1.5 py-0.5 rounded-md">
          <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div>
          <span className="text-[9px] font-black text-black uppercase">Ao Vivo</span>
        </div>
        
        {/* Fade edges */}
        <div className="absolute top-0 left-0 w-8 h-full bg-gradient-to-r from-black/30 to-transparent z-10 pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-8 h-full bg-gradient-to-l from-black/30 to-transparent z-10 pointer-events-none"></div>
        
        <div className="mt-6">
          <motion.div 
            className="flex items-center gap-4"
            style={{ willChange: 'transform' }}
            animate={{ x: [0, -20 * 196] }}
            transition={{
              x: {
                repeat: Infinity,
                repeatType: "loop", 
                duration: 60,
                ease: "linear",
              },
            }}
          >
            {duplicatedWinners.map((winner, index) => (
              <div
                key={`${winner.id}-${index}`}
                onClick={() => setLocation(getGameRoute(winner.game))}
                className="flex-shrink-0 bg-gray-800/60 rounded-lg p-2 cursor-pointer hover:bg-gray-700/60 transition-colors"
                style={{ minWidth: '180px' }}
              >
                <div className="flex items-center gap-2">
                  {/* Prize Image - Optimized for mobile */}
                  <OptimizedImage 
                    src={getPrizeImage(winner.game, winner.value)} 
                    alt="Prize"
                    className="w-12 h-12 object-contain rounded"
                    width={48}
                    height={48}
                    priority={false}
                    fallbackSrc="/premios/raspadinha.webp"
                  />
                  
                  {/* Winner Info */}
                  <div className="flex-1">
                    <div className="text-xs font-bold text-white truncate mb-0.5">{winner.name}</div>
                    <div className="text-[10px] text-gray-400 truncate mb-0.5">{winner.prizeName}</div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-black text-[#00E880]">
                        {formatBrazilianMoney(winner.value)}
                      </span>
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        winner.game === 'pix' ? 'bg-blue-400' :
                        winner.game === 'me_mimei' ? 'bg-pink-400' :
                        winner.game === 'eletronicos' ? 'bg-orange-400' :
                        winner.game === 'esquilo' ? 'bg-amber-400' :
                        'bg-green-400'
                      }`}></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}