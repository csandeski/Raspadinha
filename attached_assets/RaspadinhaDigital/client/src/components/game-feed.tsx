import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency } from "../lib/utils";
import { gameEvents, type GameEvent } from "../lib/game-events";

interface GameFeedItem {
  id: string;
  name: string;
  game: string;
  bet: number;
  won: boolean;
  prize?: number;
  time: string;
  level?: number;
  isReal?: boolean;
}

// Brazilian first names
const firstNames = [
  "João", "Maria", "José", "Ana", "Pedro", "Paula", "Carlos", "Juliana", 
  "Fernando", "Camila", "Rafael", "Amanda", "Bruno", "Beatriz", "Lucas",
  "Larissa", "Gabriel", "Mariana", "Daniel", "Fernanda", "Rodrigo", "Patricia",
  "Marcelo", "Aline", "André", "Vanessa", "Felipe", "Letícia", "Ricardo", "Carolina",
  "Eduardo", "Isabela", "Gustavo", "Natália", "Leonardo", "Bruna", "Thiago", "Sabrina",
  "Diego", "Tatiane", "Matheus", "Jessica", "Alexandre", "Renata", "Vinicius", "Luciana",
  "Henrique", "Adriana", "Roberto", "Cristina", "Marcos", "Daniela", "Antonio", "Priscila",
  "Paulo", "Michele", "Luiz", "Raquel", "Fabio", "Simone", "Jorge", "Andrea",
  "Claudio", "Sandra", "Marcio", "Eliane", "Sergio", "Viviane", "Wagner", "Monica"
];

// Brazilian last names
const lastNames = [
  "Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves", "Pereira",
  "Lima", "Gomes", "Costa", "Ribeiro", "Martins", "Carvalho", "Almeida", "Lopes",
  "Soares", "Fernandes", "Vieira", "Barbosa", "Rocha", "Dias", "Nascimento", "Moreira",
  "Nunes", "Marques", "Machado", "Mendes", "Freitas", "Cardoso", "Ramos", "Gonçalves",
  "Santana", "Teixeira", "Pinto", "Moura", "Campos", "Monteiro", "Castro", "Araújo"
];

const generateRandomName = (usedNames: Set<string>): string => {
  let fullName = "";
  let attempts = 0;
  
  do {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const hiddenLastName = lastName.substring(0, 2) + "***";
    fullName = `${firstName} ${hiddenLastName}`;
    attempts++;
  } while (usedNames.has(fullName) && attempts < 100);
  
  return fullName;
};

// Counter for generating incremental time values
let timeCounter = 0;

const generateTimeAgo = (reset = false): string => {
  if (reset) {
    timeCounter = 0;
  }
  // Increment counter to ensure older items have more seconds
  timeCounter += Math.floor(Math.random() * 5) + 2; // 2-6 seconds between items
  const seconds = timeCounter;
  return `há ${seconds} segundo${seconds > 1 ? 's' : ''}`;
};

const generateLevel = (): number | undefined => {
  // 30% chance to have a level
  if (Math.random() < 0.3) {
    // Levels weighted towards lower levels
    const rand = Math.random();
    if (rand < 0.5) return Math.floor(Math.random() * 20) + 10; // 10-29
    if (rand < 0.8) return Math.floor(Math.random() * 30) + 30; // 30-59
    if (rand < 0.95) return Math.floor(Math.random() * 30) + 60; // 60-89
    return Math.floor(Math.random() * 10) + 90; // 90-99
  }
  return undefined;
};

// Get level color based on level number
const getLevelColor = (level: number): string => {
  if (level < 20) return 'from-gray-500 to-gray-600'; // 10-19: Gray
  if (level < 30) return 'from-green-500 to-green-600'; // 20-29: Green
  if (level < 40) return 'from-blue-500 to-blue-600'; // 30-39: Blue
  if (level < 50) return 'from-purple-500 to-purple-600'; // 40-49: Purple
  if (level < 60) return 'from-pink-500 to-pink-600'; // 50-59: Pink
  if (level < 70) return 'from-orange-500 to-orange-600'; // 60-69: Orange
  if (level < 80) return 'from-red-500 to-red-600'; // 70-79: Red
  if (level < 90) return 'from-yellow-500 to-amber-600'; // 80-89: Yellow/Amber
  return 'from-yellow-600 to-orange-600'; // 90-99: Gold
};

// Get game color gradient
const getGameColorGradient = (gameColor: string): string => {
  switch (gameColor) {
    case 'blue':
      return 'from-blue-500 to-blue-600';
    case 'pink':
      return 'from-pink-500 to-pink-600';
    case 'orange':
      return 'from-orange-500 to-orange-600';
    case 'green':
      return 'from-green-500 to-green-600';
    default:
      return 'from-gray-500 to-gray-600';
  }
};

// Get appropriate prizes based on game type
const getGamePrizes = (gameName: string, bet: number): number => {
  const gameType = gameName.toLowerCase();
  
  if (gameType.includes('pix')) {
    // PIX prizes: 0.50 to 100,000
    const prizes = [0.5, 1, 2, 3, 4, 5, 10, 15, 20, 50, 100, 200, 500, 1000];
    return prizes[Math.floor(Math.random() * prizes.length)];
  } else if (gameType.includes('me mimei')) {
    // Me Mimei prizes: 0.50 to 100,000
    const prizes = [0.5, 1, 2, 3, 4, 5, 10, 15, 20, 50, 100, 200];
    return prizes[Math.floor(Math.random() * prizes.length)];
  } else if (gameType.includes('eletrônicos')) {
    // Eletrônicos prizes: 0.50 to 100,000
    const prizes = [0.5, 1, 2, 3, 4, 5, 10, 15, 20, 50, 100, 200, 500];
    return prizes[Math.floor(Math.random() * prizes.length)];
  } else if (gameType.includes('super')) {
    // Super Prêmios prizes: 10 to 2,000,000 (20x multiplier)
    const prizes = [10, 20, 40, 60, 80, 100, 200, 300, 400, 1000];
    return prizes[Math.floor(Math.random() * prizes.length)];
  }
  
  // Default multiplier for unknown games
  const multipliers = [2, 3, 5, 10];
  return bet * multipliers[Math.floor(Math.random() * multipliers.length)];
};

const generateGameResult = (gameName: string): GameFeedItem => {
  const won = Math.random() < 0.7; // 70% win rate
  
  // Determine correct bet amount and game name based on input
  let bet = 1; // Default bet
  let displayGameName = gameName;
  
  if (gameName.toLowerCase().includes('pix')) {
    bet = 1;
    displayGameName = 'Pix na Conta';
  } else if (gameName.toLowerCase().includes('me mimei')) {
    bet = 1;
    displayGameName = 'Me Mimei';
  } else if (gameName.toLowerCase().includes('eletrônicos')) {
    bet = 1;
    displayGameName = 'Eletrônicos';
  } else if (gameName.toLowerCase().includes('super')) {
    bet = 20;
    displayGameName = 'Super Prêmios';
  }
  
  let prize = 0;
  if (won) {
    prize = getGamePrizes(gameName, bet);
  }
  
  return {
    id: Date.now().toString() + Math.random(),
    name: "",
    game: displayGameName,
    bet,
    won,
    prize: won ? prize : undefined,
    time: generateTimeAgo(),
    level: generateLevel()
  };
};

interface GameFeedProps {
  gameName: string;
  gameColor: string;
}

export default function GameFeed({ gameName, gameColor }: GameFeedProps) {
  const [feedItems, setFeedItems] = useState<GameFeedItem[]>([]);
  const [usedNames] = useState(new Set<string>());
  const [itemTimestamps] = useState(new Map<string, number>());

  // Update time strings periodically
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setFeedItems(prev => prev.map((item, index) => {
        // Extract current seconds from time string
        const match = item.time.match(/há (\d+) segundo/);
        if (match) {
          const currentSeconds = parseInt(match[1]);
          const newSeconds = currentSeconds + 1;
          return {
            ...item,
            time: `há ${newSeconds} segundo${newSeconds > 1 ? 's' : ''}`
          };
        }
        return item;
      }));
    }, 1000);

    return () => clearInterval(timeInterval);
  }, []);

  useEffect(() => {
    // Reset time counter for new feed
    generateTimeAgo(true);
    
    // Generate initial items (7 fixed) with proper time ordering
    const initialItems: GameFeedItem[] = [];
    
    // Start with lower times for newer items (top) and higher for older (bottom)
    const baseTimes = [1, 5, 9, 13, 17, 21, 25]; // From newest (top) to oldest (bottom)
    
    for (let i = 0; i < 7; i++) {
      const item = generateGameResult(gameName);
      item.name = generateRandomName(usedNames);
      usedNames.add(item.name);
      
      // Set specific time for each item
      const seconds = baseTimes[i] + Math.floor(Math.random() * 3); // Add 0-2 random seconds
      item.time = `há ${seconds} segundo${seconds > 1 ? 's' : ''}`;
      
      initialItems.push(item);
    }
    // Items are already in correct order (newest at end)
    setFeedItems(initialItems);

    // Listen for real game events
    const unsubscribe = gameEvents.addListener((event: GameEvent) => {
      // Only add events that match current game
      if (event.game.toLowerCase() === gameName.toLowerCase() || 
          event.game.toLowerCase().includes(gameName.toLowerCase()) ||
          gameName.toLowerCase().includes(event.game.toLowerCase())) {
        itemTimestamps.set(event.id, Date.now());
        const feedItem: GameFeedItem = {
          ...event,
          won: event.won ?? false,
          isReal: true
        };
        setFeedItems(prev => {
          const updated = [feedItem, ...prev];
          return updated.slice(0, 7); // Keep only 7 items visible
        });
      }
    });

    // Add new fake items periodically
    const interval = setInterval(() => {
      const newItem = generateGameResult(gameName);
      newItem.name = generateRandomName(usedNames);
      usedNames.add(newItem.name);
      
      // New item always starts with 1 second
      newItem.time = 'há 1 segundo';
      
      setFeedItems(prev => {
        const updated = [newItem, ...prev];
        return updated.slice(0, 7); // Keep only 7 items visible
      });
    }, Math.random() * 5000 + 8000); // 8-13 seconds

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [gameName, usedNames, itemTimestamps]);

  return (
    <div className="mt-6 mb-4">
      <h2 className="text-sm font-medium text-gray-400 mb-3">Usuários online</h2>
      
      <div className="space-y-1.5">
        <AnimatePresence mode="popLayout">
          {feedItems.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-between p-2 rounded-lg bg-gradient-to-r from-gray-800/30 to-gray-900/30 border-l-2 border-gray-700"
            >
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  item.level ? `bg-gradient-to-br ${getGameColorGradient(gameColor)}` : 'bg-gray-700'
                }`}>
                  {item.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-gray-300">{item.name}</p>
                    {item.level && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full bg-gradient-to-r ${getGameColorGradient(gameColor)} text-white font-medium`}>
                        Nível {item.level}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500">{item.time}</p>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-[10px] text-gray-500 mb-0.5">
                  {item.game}
                </p>
                {item.won ? (
                  <p className="text-xs font-medium text-gray-300">
                    Ganhou {formatCurrency(item.prize!)}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400">Perdeu</p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      <div className="mt-3 text-center">
        <p className="text-xs text-gray-500">
          Atualizando em tempo real
        </p>
      </div>
    </div>
  );
}