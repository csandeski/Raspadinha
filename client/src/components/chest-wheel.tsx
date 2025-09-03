import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy } from "lucide-react";
import confetti from "canvas-confetti";

interface ChestWheelProps {
  isOpen: boolean;
  onClose: () => void;
  userTier: string;
  onRewardClaimed: (reward: any) => void;
}

// Define prizes based on tier
const getPrizesForTier = (tier: string) => {
  const basePrizes = [
    // Premio games
    { id: 1, name: "Raspadinha PIX", value: 1, type: "premio", route: "/game/premio-pix", image: "/premios/pix/1.webp", color: "from-green-500 to-green-600", icon: "💰" },
    { id: 2, name: "Raspadinha Me Mimei", value: 2, type: "premio", route: "/game/premio-me-mimei", image: "/premios/me-mimei/1.webp", color: "from-pink-500 to-pink-600", icon: "💄" },
    { id: 3, name: "Raspadinha Eletrônicos", value: 3, type: "premio", route: "/game/premio-eletronicos", image: "/premios/eletronicos/1.webp", color: "from-blue-500 to-blue-600", icon: "📱" },
    { id: 4, name: "Raspadinha Super Prêmios", value: 5, type: "premio", route: "/game/premio-super-premios", image: "/premios/super-premios/10.webp", color: "from-orange-500 to-orange-600", icon: "🎁" },
  ];

  // Number of raspadinhas based on tier
  const scratchCardCounts: Record<string, number> = {
    "BRONZE": 3,
    "PRATA": 5,
    "OURO": 7,
    "PLATINA": 10,
    "DIAMANTE": 15,
    "MESTRE": 20
  };

  return {
    prizes: basePrizes,
    scratchCards: scratchCardCounts[tier] || 3
  };
};

export function ChestWheel({ isOpen, onClose, userTier, onRewardClaimed }: ChestWheelProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedPrize, setSelectedPrize] = useState<any>(null);
  const [rotation, setRotation] = useState(0);
  const [showClaimButton, setShowClaimButton] = useState(false);
  const wheelRef = useRef<HTMLDivElement>(null);

  const { prizes, scratchCards } = getPrizesForTier(userTier);
  const itemWidth = 140; // Updated to match new card width
  const gap = 16;
  const totalWidth = prizes.length * (itemWidth + gap) * 3; // 3x for repetition



  useEffect(() => {
    if (!isOpen) {
      // Reset states when modal closes
      setIsSpinning(false);
      setSelectedPrize(null);
      setRotation(0);
      setShowClaimButton(false);
    }
  }, [isOpen]);



  const startSpin = () => {
    if (isSpinning) return;
    
    console.log('Starting wheel spin...');
    setIsSpinning(true);
    setSelectedPrize(null);
    setShowClaimButton(false);

    // Create and immediately play roulette sound
    const wheelSound = document.createElement('audio');
    wheelSound.src = '/sounds/roulette-wheel.mp3';
    wheelSound.volume = 0.8;
    wheelSound.loop = true;
    
    // Add to document to ensure it's loaded
    document.body.appendChild(wheelSound);
    
    // Play with multiple fallback methods
    const playSound = () => {
      const playPromise = wheelSound.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('✅ Roulette sound is playing!');
          })
          .catch(error => {
            console.error('❌ Failed to play sound:', error);
            // Try clicking the sound element to trigger play
            wheelSound.click && wheelSound.click();
          });
      } else {
        // Fallback for older browsers
        wheelSound.play();
      }
    };
    
    // Try to play immediately
    playSound();
    
    // Also try after a small delay
    setTimeout(playSound, 10);

    // Always select one of the first two items (cheapest prizes)
    const selectedIndex = Math.random() < 0.7 ? 0 : 1;
    const selectedItem = prizes[selectedIndex];
    
    // Simple animation - just move the wheel left
    const moveDistance = 2000 + (selectedIndex * (itemWidth + gap));
    
    setRotation(prev => prev - moveDistance);

    // Stop spinning after animation
    setTimeout(() => {
      setIsSpinning(false);
      setSelectedPrize(selectedItem);
      
      // Stop and remove the roulette sound
      wheelSound.pause();
      wheelSound.currentTime = 0;
      document.body.removeChild(wheelSound);
      console.log('🛑 Roulette sound stopped');
      
      // Play win sound
      const winSound = new Audio('/sounds/win.mp3');
      winSound.volume = 0.6;
      winSound.play()
        .then(() => console.log('✅ Win sound playing'))
        .catch(e => console.log('❌ Win sound failed:', e));
      
      // Trigger confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Show claim button instead of auto-closing
      setShowClaimButton(true);
    }, 4000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 rounded-3xl p-8 max-w-4xl w-full max-h-[90vh] overflow-hidden border border-purple-500/30 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Animated background effects */}
            <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
              <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-purple-600/20 to-transparent rounded-full blur-3xl animate-pulse" />
              <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-indigo-600/20 to-transparent rounded-full blur-3xl animate-pulse animation-delay-2000" />
            </div>
            
            {/* Header */}
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div>
                <h2 className="text-3xl font-bold text-white mb-1">✨ Baú da Sorte ✨</h2>
                <p className="text-purple-300 text-sm">Gire a roleta e ganhe prêmios incríveis!</p>
              </div>
              <button
                onClick={onClose}
                className="text-purple-300 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Wheel Container */}
            <div className="relative mb-8 overflow-hidden z-10">
              {/* Pointer */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full z-20">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="relative"
                >
                  <div className="w-0 h-0 border-l-[25px] border-l-transparent border-t-[50px] border-t-yellow-400 border-r-[25px] border-r-transparent drop-shadow-[0_0_10px_rgba(250,204,21,0.7)]"></div>
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-2 h-2 bg-yellow-400 rounded-full"></div>
                </motion.div>
              </div>

              {/* Wheel Track */}
              <div className="relative h-48 overflow-hidden rounded-xl bg-gradient-to-b from-purple-900/50 to-purple-950/50 border border-purple-500/20 backdrop-blur-sm">
                <motion.div
                  ref={wheelRef}
                  className="absolute flex items-center h-full gap-4 px-4"
                  animate={{ x: rotation }}
                  transition={{
                    duration: 4,
                    ease: [0.17, 0.67, 0.25, 1.00],
                  }}
                  style={{ width: totalWidth }}
                >
                  {/* Repeat prizes for seamless loop */}
                  {[...prizes, ...prizes, ...prizes].map((prize, index) => (
                    <motion.div
                      key={`${prize.id}-${index}`}
                      className={`flex-shrink-0 w-[140px] h-40 rounded-xl bg-gradient-to-br ${prize.color} p-4 flex flex-col items-center justify-center text-white border border-white/20 shadow-lg ${
                        selectedPrize?.id === prize.id && index === prizes.length ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-purple-900' : ''
                      }`}
                      whileHover={{ scale: 1.05 }}
                      style={{
                        boxShadow: selectedPrize?.id === prize.id && index === prizes.length ? '0 0 30px rgba(250,204,21,0.5)' : ''
                      }}
                    >
                      <div className="w-20 h-20 mb-2 flex items-center justify-center">
                        {prize.image ? (
                          <img src={prize.image} alt={prize.name} className="w-full h-full object-contain drop-shadow-md" />
                        ) : (
                          <div className="text-5xl drop-shadow-md">{prize.icon}</div>
                        )}
                      </div>
                      <p className="text-sm font-bold text-center drop-shadow-md">{prize.name}</p>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </div>

            {/* Spin Button */}
            <div className="flex justify-center mb-6 relative z-30">
              <motion.button
                onClick={startSpin}
                disabled={isSpinning}
                className="px-8 py-4 bg-gradient-to-r from-pink-500 to-pink-600 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:from-pink-600 hover:to-pink-700 transition-all duration-200"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isSpinning ? "Girando..." : "Girar agora!"}
              </motion.button>
            </div>

            {/* User Level Info */}
            <div className="bg-gray-800/50 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Trophy className="w-8 h-8 text-yellow-500" />
                <div>
                  <p className="text-sm text-gray-400">Seu Nível</p>
                  <p className="text-lg font-bold text-white">{userTier}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">Raspadinhas ao ganhar</p>
                <p className="text-lg font-bold text-white">{scratchCards}</p>
              </div>
            </div>

            {/* Result Display */}
            {selectedPrize && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 text-center relative z-10"
              >
                <h3 className="text-2xl font-bold text-white mb-3">🎉 Parabéns! 🎉</h3>
                <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-2xl p-6 border border-yellow-500/30 backdrop-blur-sm">
                  <p className="text-lg text-yellow-300 mb-2">Você ganhou:</p>
                  <p className="text-3xl font-bold text-white mb-1">{selectedPrize.name}</p>
                  {selectedPrize.name.includes("Raspadinha") && (
                    <>
                      <p className="text-xl text-yellow-400 mt-3">{scratchCards} raspadinhas!</p>
                      <p className="text-sm text-gray-400 mt-1">Valor total: R$ {(selectedPrize.value * scratchCards).toFixed(2)}</p>
                    </>
                  )}
                </div>
                
                {showClaimButton && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => {
                      onRewardClaimed({
                        type: selectedPrize.name,
                        value: selectedPrize.value,
                        route: selectedPrize.route,
                        scratchCards: scratchCards,
                        gameType: selectedPrize.type
                      });
                    }}
                    className="mt-6 px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-xl shadow-lg hover:from-green-600 hover:to-green-700 transition-all duration-300"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Resgatar Ganhos
                  </motion.button>
                )}
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}