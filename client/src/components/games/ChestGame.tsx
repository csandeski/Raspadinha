import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Trophy } from 'lucide-react';

interface RouletteItem {
  id: string;
  value: string;
  name: string;
  path: string;
  isLoss: boolean;
  originalIndex: number;
}

interface ChestGameProps {
  prizes: Array<{
    value: string;
    path: string;
    name: string;
  }>;
  betAmount: number;
  multiplier: 1 | 5 | 10;
  balance: number;
  bonusCount: number;
  onPlayWithBalance: () => void;
  onPlayWithBonus: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  gameColor: 'blue' | 'pink' | 'orange' | 'green';
  onProcessingChange?: (processing: boolean) => void;
}

export interface ChestGameRef {
  playWithBalance: () => void;
  playWithBonus: () => void;
}

export const ChestGame = forwardRef<ChestGameRef, ChestGameProps>((props, ref) => {
  const {
    prizes,
    betAmount,
    multiplier,
    balance,
    bonusCount,
    onPlayWithBalance,
    onPlayWithBonus,
    isLoading = false,
    disabled = false,
    gameColor = 'blue',
    onProcessingChange
  } = props;
  const [showLock, setShowLock] = useState(true); // Nova fase do cadeado
  const [lockOpening, setLockOpening] = useState(false); // Animação de abertura
  const [isSpinning, setIsSpinning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stripPosition, setStripPosition] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [gameResult, setGameResult] = useState<any>(null);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [showChestAnimation, setShowChestAnimation] = useState(false);
  const [chestOpening, setChestOpening] = useState(false);
  const [prizeInfo, setPrizeInfo] = useState<{value: string, name: string, path: string} | null>(null);
  const [currentRouletteItems, setCurrentRouletteItems] = useState<RouletteItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Call onProcessingChange whenever isProcessing changes
  useEffect(() => {
    if (onProcessingChange) {
      onProcessingChange(isProcessing);
    }
  }, [isProcessing, onProcessingChange]);

  // Color schemes
  const colors = {
    blue: {
      primary: 'from-blue-500 to-blue-600',
      hover: 'from-blue-600 to-blue-700',
      border: 'border-blue-500/30',
      text: 'text-blue-500',
      bg: 'from-blue-600/20 to-blue-700/20 border-blue-500/50',
      rouletteBg: 'from-blue-950 via-blue-900 to-blue-950',
      itemBg: 'from-blue-800/30 to-blue-900/30',
      winBg: 'from-blue-600/40 to-blue-700/40',
      glow: 'shadow-blue-500/50'
    },
    pink: {
      primary: 'from-pink-500 to-pink-600',
      hover: 'from-pink-600 to-pink-700',
      border: 'border-pink-500/30',
      text: 'text-pink-500',
      bg: 'from-pink-600/20 to-pink-700/20 border-pink-500/50',
      rouletteBg: 'from-pink-950 via-pink-900 to-pink-950',
      itemBg: 'from-pink-800/30 to-pink-900/30',
      winBg: 'from-pink-600/40 to-pink-700/40',
      glow: 'shadow-pink-500/50'
    },
    orange: {
      primary: 'from-orange-500 to-orange-600',
      hover: 'from-orange-600 to-orange-700',
      border: 'border-orange-500/30',
      text: 'text-orange-500',
      bg: 'from-orange-600/20 to-orange-700/20 border-orange-500/50',
      rouletteBg: 'from-orange-950 via-orange-900 to-orange-950',
      itemBg: 'from-orange-800/30 to-orange-900/30',
      winBg: 'from-orange-600/40 to-orange-700/40',
      glow: 'shadow-orange-500/50'
    },
    green: {
      primary: 'from-green-500 to-green-600',
      hover: 'from-green-600 to-green-700',
      border: 'border-green-500/30',
      text: 'text-green-500',
      bg: 'from-green-600/20 to-green-700/20 border-green-500/50',
      rouletteBg: 'from-green-950 via-green-900 to-green-950',
      itemBg: 'from-green-800/30 to-green-900/30',
      winBg: 'from-green-600/40 to-green-700/40',
      glow: 'shadow-green-500/50'
    },
  };

  const colorScheme = colors[gameColor];
  const ITEM_WIDTH = 104; // 100px width + 4px gap (gap-1 = 4px)

  // Create roulette items with guaranteed prize
  const createRouletteItemsForSpin = (winningValue?: string): RouletteItem[] => {
    const items: RouletteItem[] = [];
    const baseItems = 18;
    
    // Get all available prizes and shuffle them
    const shuffledPrizes = [...prizes].sort(() => Math.random() - 0.5);
    
    // If there's a winning value, ensure it's in the list
    if (winningValue) {
      // Remove any existing instance of the winning value
      const filtered = shuffledPrizes.filter(p => String(p.value) !== String(winningValue));
      // Find the winning prize
      const winningPrize = prizes.find(p => String(p.value) === String(winningValue) || parseFloat(p.value) === parseFloat(winningValue));
      if (winningPrize) {
        // Add it at a random position that's not a loss position
        const insertPos = Math.floor(Math.random() * 15); // 15 non-loss positions
        filtered.splice(insertPos, 0, winningPrize);
        shuffledPrizes.length = 0;
        shuffledPrizes.push(...filtered);
      }
    }
    
    // Add more prizes if needed
    while (shuffledPrizes.length < 15) { // Need 15 prize slots (18 total - 3 loss)
      shuffledPrizes.push(...[...prizes].sort(() => Math.random() - 0.5));
    }
    
    let prizeIndex = 0;
    for (let i = 0; i < baseItems; i++) {
      const isLoss = i === 5 || i === 11 || i === 17; // 3 loss positions per 18
      
      if (isLoss) {
        items.push({
          id: `item-${i}`,
          value: "",
          name: "Tente Novamente",
          path: "/logos/logo.png",
          isLoss: true,
          originalIndex: i
        });
      } else {
        const prize = shuffledPrizes[prizeIndex];
        prizeIndex++;
        items.push({
          id: `item-${i}`,
          value: prize.value,
          name: prize.name,
          path: prize.path,
          isLoss: false,
          originalIndex: i
        });
      }
    }
    return items;
  };

  // Initialize roulette items and position when component mounts
  useEffect(() => {
    // Initialize roulette items
    if (currentRouletteItems.length === 0) {
      setCurrentRouletteItems(createRouletteItemsForSpin());
    }
    
    // Only set initial position if it hasn't been set yet
    if (stripPosition === 0) {
      // Set initial position for 18 items
      const randomStartIndex = Math.floor(Math.random() * 8) + 5; // Start in middle
      const containerWidth = 600; // Default width
      const centerOffset = (containerWidth / 2) - (ITEM_WIDTH / 2);
      setStripPosition(-(randomStartIndex * ITEM_WIDTH) + centerOffset);
    }
  }, []); // Only run once on mount

  // Start checking for results when buttons are clicked
  useEffect(() => {
    // Only start checking if we haven't played and aren't processing and lock is not showing
    if (hasPlayed || isProcessing || isSpinning || showLock) {
      return; // Don't start new interval if game is already in progress or showing lock
    }
    
    // Check for game results periodically
    const checkInterval = setInterval(() => {
      const resultElement = document.getElementById('chest-game-result');
      if (resultElement && resultElement.dataset.result) {
        try {
          const resultData = JSON.parse(resultElement.dataset.result);
          if (resultData.ready && !isSpinning && !isProcessing && !hasPlayed && !showLock) {
            // Start the game
            clearInterval(checkInterval);
            setTimeout(() => {
              resultElement.dataset.result = '';
              // Create items with the winning value guaranteed
              setHasPlayed(true);
              setIsProcessing(true);
              const rouletteItems = createRouletteItemsForSpin(resultData.won ? resultData.value : undefined);
              startSpinAnimation(resultData, rouletteItems);
              // Visual update is now handled inside startSpinAnimation
            }, 100);
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
    }, 50);
    
    return () => {
      clearInterval(checkInterval);
    };
  }, [isSpinning, isProcessing, hasPlayed, showLock]); // Add showLock to dependencies


  const startSpinAnimation = (result: any, items: RouletteItem[]) => {
    
    // Always stop at position 9 (middle)
    let targetIndex = 9;
    
    // Place the correct prize at position 9
    if (result.won && result.value) {
      const serverValue = String(result.value);
      const serverNum = parseFloat(result.value);
      
      // Find the winning prize from the original prizes array
      const winningPrize = prizes.find(p => {
        const pNum = parseFloat(p.value);
        return pNum === serverNum;
      });
      
      if (winningPrize) {
        // Replace position 9 with the winning prize
        items[9] = {
          id: `item-9`,
          value: winningPrize.value,
          name: winningPrize.name,
          path: winningPrize.path,
          isLoss: false,
          originalIndex: 9
        };
      }
    } else {
      // For losses, put "Tente Novamente" at position 9
      items[9] = {
        id: `item-9`,
        value: "",
        name: "Tente Novamente",
        path: "/logos/logo.png",
        isLoss: true,
        originalIndex: 9
      };
    }
    
    
    // Update the visual roulette BEFORE spinning
    setCurrentRouletteItems([...items]);
    
    // Start spinning after a brief delay to ensure UI updates
    setTimeout(() => {
      setGameResult(result);
      setIsSpinning(true);
      
      // BULLETPROOF POSITIONING: Always calculate from container center
      setTimeout(() => {
        const containerWidth = containerRef.current?.offsetWidth || 351;
        
        // Exact center of container
        const containerCenter = containerWidth / 2;
        
        // Exact center of item (half of 100px width)
        const itemHalfWidth = ITEM_WIDTH / 2; // 50px
        
        // Perfect center position where item center aligns with container center
        const perfectCenterPosition = containerCenter - itemHalfWidth;
        
        // Position of item 9 from strip start (0-based)
        const item9FromStart = 9 * ITEM_WIDTH; // 936px
        
        // Add visual spins (exactly 3 full cycles for dramatic effect)
        const fullCycle = 18 * ITEM_WIDTH; // 1872px per cycle
        const totalSpins = 3 * fullCycle; // 5616px of spinning
        
        // FINAL CALCULATION: Position the strip so item 9 lands at perfect center
        // We need to move the strip LEFT by the amount that puts item 9 at center
        const finalStripPosition = perfectCenterPosition - item9FromStart - totalSpins;
        
        // Apply the bulletproof position
        setStripPosition(finalStripPosition);
      }, 10);
    }, 50);
    
    // Show result after animation completes (5 seconds for animation)
    setTimeout(() => {
      // Don't set isSpinning to false here - keep the roulette visible
      setShowResult(true);
      
      if (result.won) {
        // Find the prize info from the prizes array
        const winningPrize = prizes.find(p => String(p.value) === String(result.value));
        if (winningPrize) {
          // Map the prize path based on game color
          let prizePath = winningPrize.path;
          if (gameColor === 'pink' || gameColor === 'orange' || gameColor === 'green') {
            const numValue = parseFloat(winningPrize.value);
            let fileName;
            if (numValue === 0.5 || numValue === 0.50) {
              fileName = '0.5';
            } else {
              fileName = parseInt(winningPrize.value).toString();
            }
            const folder = gameColor === 'pink' ? 'me-mimei' : 
                          gameColor === 'orange' ? 'eletronicos' : 
                          'super-premios';
            prizePath = `/premios/${folder}/${fileName}.webp`;
          }
          // Apply multiplier to the prize value
          const multipliedValue = (parseFloat(winningPrize.value) * multiplier).toFixed(2);
          
          setPrizeInfo({
            value: multipliedValue,
            name: winningPrize.name,
            path: prizePath
          });
        }
        // Show chest opening animation for wins
        setShowChestAnimation(true);
        setTimeout(() => {
          setChestOpening(true);
          setIsSpinning(false); // Stop spinning after chest opens
          // Keep the strip at its current position for next play
        }, 1200);
      } else {
        // For losses, stop spinning immediately
        setIsSpinning(false);
        // Reset game state after animation and VOLTAR PARA O CADEADO
        setTimeout(() => {
          // Reset game states and show lock for next play
          setShowResult(false);
          setGameResult(null);
          setHasPlayed(false);
          setIsProcessing(false);
          // VOLTAR para o cadeado após perder (Tente Novamente)
          setShowLock(true);
          setLockOpening(false);
          // Reset roulette completely to avoid animation bugs
          setCurrentRouletteItems([]);
          setStripPosition(0); // Reset strip position to start
        }, 2500);
      }
    }, 5100);
  };

  const resetGame = () => {
    // Reset all visual states
    setShowResult(false);
    setGameResult(null);
    setHasPlayed(false);
    setShowChestAnimation(false);
    setChestOpening(false);
    setPrizeInfo(null);
    setIsProcessing(false);
    setIsSpinning(false);
    
    // VOLTAR para o cadeado quando clicar em "Abrir Novamente"
    setShowLock(true);
    setLockOpening(false);
    
    // Clear any pending result data
    const resultElement = document.getElementById('chest-game-result');
    if (resultElement) {
      resultElement.dataset.result = '';
    }
    
    // Reset roulette completely to avoid animation bugs
    setCurrentRouletteItems([]);
    setStripPosition(0); // Reset strip position to start
  };

  // Função para abrir o cadeado com animação
  const openLock = () => {
    setLockOpening(true);
    
    // Após animação, mostrar a roleta
    setTimeout(() => {
      setShowLock(false);
      setLockOpening(false);
    }, 800);
  };

  // Interceptar as funções de jogar para abrir o cadeado primeiro
  const handlePlayWithBalance = () => {
    if (showLock) {
      openLock();
      // Executar o jogo após a animação do cadeado
      setTimeout(() => {
        onPlayWithBalance();
      }, 900);
    } else {
      onPlayWithBalance();
    }
  };

  const handlePlayWithBonus = () => {
    if (showLock) {
      openLock();
      // Executar o jogo após a animação do cadeado
      setTimeout(() => {
        onPlayWithBonus();
      }, 900);
    } else {
      onPlayWithBonus();
    }
  };

  // Substituir as funções originais pelas interceptadas
  const playWithBalance = showLock ? handlePlayWithBalance : onPlayWithBalance;
  const playWithBonus = showLock ? handlePlayWithBonus : onPlayWithBonus;

  // Expor as funções através de ref
  useImperativeHandle(ref, () => ({
    playWithBalance,
    playWithBonus
  }));


  return (
    <>
      <div className="w-full max-w-4xl mx-auto relative">
        {/* Hidden element for game result */}
        <div id="chest-game-result" style={{ display: 'none' }} />
        
        {/* FASE DO CADEADO */}
        {showLock ? (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ 
                opacity: 0, 
                scale: 1.1,
                rotateY: 180,
                filter: "blur(10px)"
              }}
              transition={{ duration: 0.5, type: "spring" }}
              className="relative mb-6 mt-4 h-40 rounded-3xl overflow-hidden flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, 
                  ${gameColor === 'blue' ? '#1e3a8a' : 
                    gameColor === 'pink' ? '#831843' : 
                    gameColor === 'orange' ? '#7c2d12' : '#14532d'} 0%, 
                  #111827 50%, 
                  ${gameColor === 'blue' ? '#1e3a8a' : 
                    gameColor === 'pink' ? '#831843' : 
                    gameColor === 'orange' ? '#7c2d12' : '#14532d'} 100%)`,
                boxShadow: `
                  0 20px 60px rgba(0, 0, 0, 0.8),
                  inset 0 1px 0 rgba(255, 255, 255, 0.1),
                  inset 0 -1px 0 rgba(0, 0, 0, 0.3),
                  0 0 120px ${gameColor === 'blue' ? 'rgba(59, 130, 246, 0.2)' : 
                             gameColor === 'pink' ? 'rgba(236, 72, 153, 0.2)' : 
                             gameColor === 'orange' ? 'rgba(251, 146, 60, 0.2)' : 'rgba(74, 222, 128, 0.2)'}
                `,
                minHeight: '160px',
                border: `2px solid ${gameColor === 'blue' ? 'rgba(59, 130, 246, 0.3)' : 
                                    gameColor === 'pink' ? 'rgba(236, 72, 153, 0.3)' : 
                                    gameColor === 'orange' ? 'rgba(251, 146, 60, 0.3)' : 'rgba(74, 222, 128, 0.3)'}`
              }}
            >
              {/* Animated gradient overlay */}
              <motion.div
                className="absolute inset-0"
                animate={{
                  background: [
                    `radial-gradient(circle at 20% 50%, ${
                      gameColor === 'blue' ? 'rgba(59, 130, 246, 0.3)' :
                      gameColor === 'pink' ? 'rgba(236, 72, 153, 0.3)' :
                      gameColor === 'orange' ? 'rgba(251, 146, 60, 0.3)' : 'rgba(74, 222, 128, 0.3)'
                    } 0%, transparent 50%)`,
                    `radial-gradient(circle at 80% 50%, ${
                      gameColor === 'blue' ? 'rgba(59, 130, 246, 0.3)' :
                      gameColor === 'pink' ? 'rgba(236, 72, 153, 0.3)' :
                      gameColor === 'orange' ? 'rgba(251, 146, 60, 0.3)' : 'rgba(74, 222, 128, 0.3)'
                    } 0%, transparent 50%)`,
                    `radial-gradient(circle at 20% 50%, ${
                      gameColor === 'blue' ? 'rgba(59, 130, 246, 0.3)' :
                      gameColor === 'pink' ? 'rgba(236, 72, 153, 0.3)' :
                      gameColor === 'orange' ? 'rgba(251, 146, 60, 0.3)' : 'rgba(74, 222, 128, 0.3)'
                    } 0%, transparent 50%)`
                  ]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              />
              
              {/* Beautiful sparkles */}
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute"
                  initial={{ opacity: 0 }}
                  animate={{ 
                    opacity: [0, 1, 0],
                    x: Math.cos(i * 18 * Math.PI / 180) * 80,
                    y: Math.sin(i * 18 * Math.PI / 180) * 60,
                  }}
                  transition={{ 
                    duration: 3,
                    repeat: Infinity,
                    delay: i * 0.1,
                    ease: "easeInOut"
                  }}
                >
                  <div 
                    className="w-1 h-1 rounded-full"
                    style={{
                      background: `${
                        gameColor === 'blue' ? '#60a5fa' :
                        gameColor === 'pink' ? '#f9a8d4' :
                        gameColor === 'orange' ? '#fdba74' : '#86efac'
                      }`,
                      boxShadow: `0 0 6px ${
                        gameColor === 'blue' ? '#60a5fa' :
                        gameColor === 'pink' ? '#f9a8d4' :
                        gameColor === 'orange' ? '#fdba74' : '#86efac'
                      }`
                    }}
                  />
                </motion.div>
              ))}
              
              {/* Premium lock container */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ 
                  scale: lockOpening ? [1, 1.2, 0] : 1,
                  rotate: lockOpening ? [0, 360] : 0,
                  opacity: lockOpening ? [1, 1, 0] : 1
                }}
                transition={{ 
                  duration: lockOpening ? 0.8 : 0.6,
                  type: "spring",
                  stiffness: 260,
                  damping: 20
                }}
                className="relative z-10"
              >
                {/* Multi-layer glow effect */}
                <div className="absolute inset-0 -m-8">
                  <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${colorScheme.primary} blur-3xl opacity-30 animate-pulse`} />
                  <div className={`absolute inset-0 rounded-full bg-gradient-to-tr ${colorScheme.primary} blur-2xl opacity-20`} />
                </div>
                
                {/* Chest image without background */}
                <motion.div
                  animate={{ 
                    rotate: lockOpening ? [0, 10, -10, 0] : 0,
                    scale: lockOpening ? [1, 1.1, 0.8, 0] : [1, 1.05, 1]
                  }}
                  transition={{ 
                    duration: lockOpening ? 0.8 : 2,
                    repeat: lockOpening ? 0 : Infinity,
                    ease: "easeInOut"
                  }}
                  className="relative w-32 h-32"
                >
                  <img 
                    src="/images/bau-fechado.webp" 
                    alt="Baú fechado" 
                    className="w-full h-full object-contain"
                    style={{
                      filter: `drop-shadow(0 0 30px ${
                        gameColor === 'blue' ? 'rgba(59, 130, 246, 0.6)' :
                        gameColor === 'pink' ? 'rgba(236, 72, 153, 0.6)' :
                        gameColor === 'orange' ? 'rgba(251, 146, 60, 0.6)' : 'rgba(74, 222, 128, 0.6)'
                      })`
                    }}
                  />
                </motion.div>
              </motion.div>
              
            </motion.div>
          </AnimatePresence>
        ) : (
          /* FASE DA ROLETA - código existente */
          <div className="relative mb-6 mt-4">
  
          {/* Center Indicator Arrow */}
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-40 pointer-events-none">
            <motion.div
              animate={isSpinning ? {
                y: [0, -2, 0],
              } : {}}
              transition={{
                duration: 0.5,
                repeat: isSpinning ? Infinity : 0,
                ease: "easeInOut"
              }}
              className="flex flex-col items-center"
            >
              <ChevronDown className="w-10 h-10 text-amber-400 drop-shadow-lg" />
              <div className="w-1 h-4 bg-gradient-to-b from-amber-400 to-transparent" />
            </motion.div>
          </div>

          {/* Roulette Track */}
          <div 
            ref={containerRef}
            className="relative h-40 overflow-hidden rounded-2xl bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 border-2 border-gray-700"
            style={{
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5), inset 0 2px 10px rgba(0, 0, 0, 0.3)',
              minHeight: '160px' // Ensure minimum height
            }}
          >
            {/* Roulette Items Strip - INFINITE LOOP */}
            <div 
              className="flex items-center gap-1 absolute h-full py-2"
              style={{ 
                transform: `translateX(${stripPosition}px)`,
                transition: isSpinning ? 'transform 5s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
                visibility: 'visible',
                opacity: 1
              }}
            >
              {/* Create visual roulette from current items or default */}
              {(() => {
                const baseItems = currentRouletteItems.length > 0 ? currentRouletteItems : createRouletteItemsForSpin();
                const items: RouletteItem[] = [];
                const visibleWidth = 800; // Approx visible area
                const itemTotalWidth = ITEM_WIDTH + 4; // Item + gap
                const visibleItems = Math.ceil(visibleWidth / itemTotalWidth) + 2;
                
                // Calculate how many cycles we need based on position
                const startOffset = Math.floor(Math.abs(stripPosition) / itemTotalWidth);
                const cycles = Math.ceil((startOffset + visibleItems) / 18) + 5; // Extra cycles for smooth scrolling
                
                // Generate enough items for smooth infinite scrolling by repeating the base 18 items
                for (let cycle = 0; cycle < cycles; cycle++) {
                  baseItems.forEach((baseItem: any, i: number) => {
                    const idx = cycle * 18 + i;
                    
                    // Determine image path based on game type
                    let imagePath = baseItem.path;
                    if (!baseItem.isLoss && (gameColor === 'pink' || gameColor === 'orange' || gameColor === 'green')) {
                      const numValue = parseFloat(baseItem.value);
                      const fileName = numValue === 0.5 ? '0.5' : parseInt(baseItem.value).toString();
                      const folder = gameColor === 'pink' ? 'me-mimei' : 
                                   gameColor === 'orange' ? 'eletronicos' : 
                                   'super-premios';
                      imagePath = `/premios/${folder}/${fileName}.webp`;
                    }
                    
                    items.push({
                      id: `roulette-item-${idx}`,
                      value: baseItem.value,
                      name: baseItem.name,
                      path: imagePath,
                      isLoss: baseItem.isLoss,
                      originalIndex: i // Keep track of base index
                    } as RouletteItem);
                  });
                }
                return items;
              })().map((item) => (
                  <div
                    key={item.id}
                    className={`
                      flex-shrink-0 w-[100px] h-[124px] rounded-lg
                      ${item.isLoss ? 'bg-gradient-to-br from-gray-700/90 to-gray-800/90' : 'bg-gradient-to-br from-gray-800 to-gray-900'} 
                      border ${item.isLoss ? 'border-gray-700' : 'border-gray-600'}
                      flex flex-col items-center justify-center p-2
                      ${item.value === gameResult?.value && showResult && gameResult?.won ? 'ring-2 ring-amber-400 shadow-lg shadow-amber-400/50' : ''}
                      transition-all duration-200
                    `}
                  >
                    <div className="relative w-14 h-14 mb-2 flex items-center justify-center">
                      {item.isLoss ? (
                        <img
                          src="/logos/logo.png"
                          alt="Tente Novamente"
                          className="w-12 h-12 object-contain opacity-70"
                        />
                      ) : (
                        <img
                          src={item.path}
                          alt={item.name}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            target.src = '/logos/logo.png';
                          }}
                        />
                      )}
                    </div>
                    
                    <p className={`text-[11px] font-bold text-center leading-[1.2] ${item.isLoss ? 'text-gray-400' : 'text-white'} mt-1 line-clamp-2 min-h-[28px] flex items-center justify-center`}>
                      {item.name}
                    </p>
                  </div>
                ))}
              </div>
          </div>

          {/* Gradient overlays - Better visibility */}
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-black via-black/60 to-transparent pointer-events-none rounded-l-2xl" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-black via-black/60 to-transparent pointer-events-none rounded-r-2xl" />
        </div>
        )}
      </div>

      {/* Chest Opening Animation - Beautiful design like Esquilo game */}
      <AnimatePresence>
        {showChestAnimation && gameResult && gameResult.won && prizeInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md"
            onClick={resetGame}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.5, type: "spring", bounce: 0.3 }}
              className="relative max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative">
                {/* Glow effect behind chest */}
                <div className={`absolute inset-0 bg-gradient-to-br ${colors[gameColor].primary} opacity-20 blur-3xl scale-150 animate-pulse`} />
                
                {/* Main container */}
                <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-3xl p-8 shadow-2xl border border-gray-700/50">

                  {/* Chest container */}
                  <div className="relative w-64 h-64 mx-auto mb-6">
                    {!chestOpening ? (
                      // Closed chest
                      <motion.div
                        initial={{ scale: 1 }}
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="relative w-full h-full"
                      >
                        <img 
                          src="/images/bau-fechado.webp" 
                          alt="Baú fechado" 
                          className="w-full h-full object-contain drop-shadow-2xl"
                        />
                      </motion.div>
                    ) : (
                      // Open chest with prize
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5, type: "spring" }}
                        className="relative w-full h-full"
                      >
                        {/* Open chest image with glow */}
                        <img 
                          src="/images/bau-aberto.webp" 
                          alt="Baú aberto" 
                          className="absolute inset-0 w-full h-full object-contain drop-shadow-2xl"
                        />
                        
                        {/* Prize inside chest */}
                        <motion.div
                          initial={{ scale: 0, y: 20 }}
                          animate={{ scale: 1, y: -20 }}
                          transition={{ delay: 0.3, duration: 0.5, type: "spring" }}
                          className="absolute inset-0 flex items-center justify-center"
                        >
                          <div className="relative">
                            {/* Prize glow */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${colors[gameColor].primary} blur-2xl opacity-60 scale-150 animate-pulse`} />
                            {/* Prize image */}
                            <img 
                              src={prizeInfo.path} 
                              alt={prizeInfo.name}
                              className="relative w-32 h-32 object-contain drop-shadow-2xl"
                            />
                          </div>
                        </motion.div>
                        
                        {/* Sparkles effect */}
                        {[...Array(12)].map((_, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ 
                              opacity: [0, 1, 0],
                              scale: [0, 1.5, 0],
                              x: Math.cos(i * 30 * Math.PI / 180) * 100,
                              y: Math.sin(i * 30 * Math.PI / 180) * 100,
                            }}
                            transition={{ 
                              duration: 1.5,
                              delay: 0.5 + i * 0.05,
                              repeat: Infinity,
                              repeatDelay: 1
                            }}
                            className="absolute top-1/2 left-1/2 w-2 h-2"
                            style={{
                              background: `radial-gradient(circle, ${gameColor === 'blue' ? '#60A5FA' : gameColor === 'pink' ? '#F472B6' : gameColor === 'orange' ? '#FB923C' : '#4ADE80'} 0%, transparent 70%)`
                            }}
                          />
                        ))}
                      </motion.div>
                    )}
                  </div>

                  
                  {/* Prize info */}
                  {chestOpening && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8, duration: 0.5 }}
                      className="text-center"
                    >
                      <h3 className="text-xl font-bold text-white mb-3">
                        Parabéns!
                      </h3>
                      <div className={`text-lg font-black ${colors[gameColor].text} mb-2`}>
                        {prizeInfo.name}
                      </div>
                      <div className="text-2xl font-black text-white mb-2">
                        R$ {parseFloat(prizeInfo.value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      {multiplier > 1 && (
                        <div className="text-sm text-gray-400 mb-4">
                          ({multiplier}x de R$ {(parseFloat(prizeInfo.value) / multiplier).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                        </div>
                      )}
                      {multiplier === 1 && (
                        <div className="mb-4"></div>
                      )}
                      
                      {/* Play again button */}
                      <button
                        onClick={resetGame}
                        className={`w-full bg-gradient-to-r ${colors[gameColor].primary} hover:${colors[gameColor].hover} text-white font-bold py-4 px-8 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105`}
                      >
                        Abrir Novamente
                      </button>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

ChestGame.displayName = 'ChestGame';