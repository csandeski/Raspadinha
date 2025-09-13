import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { Sparkles, Trophy, Star, Coins } from "lucide-react";

interface WinModalProps {
  isOpen: boolean;
  onClose: () => void;
  prizeImage: string;
  prizeName: string;
  prizeValue: number;
  onPlayAgain: () => void;
}

export function WinModal({
  isOpen,
  onClose,
  prizeImage,
  prizeName,
  prizeValue,
  onPlayAgain,
}: WinModalProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      
      // Dispara confetti múltiplas vezes para efeito mais intenso
      const duration = 5 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
      };

      const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        
        // Confetti da esquerda
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          colors: ['#00E880', '#FFD700', '#FF69B4', '#87CEEB', '#DDA0DD']
        });
        
        // Confetti da direita
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          colors: ['#00E880', '#FFD700', '#FF69B4', '#87CEEB', '#DDA0DD']
        });
      }, 250);

      // Disparo inicial de confetti do centro
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00E880', '#FFD700', '#FF69B4', '#87CEEB', '#DDA0DD']
      });

      return () => {
        clearInterval(interval);
        setShowConfetti(false);
      };
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-[9998]"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0, opacity: 0, rotateY: 180 }}
            animate={{ 
              scale: 1, 
              opacity: 1, 
              rotateY: 0,
              transition: {
                type: "spring",
                damping: 15,
                stiffness: 100,
                duration: 0.8
              }
            }}
            exit={{ scale: 0, opacity: 0, rotateY: -180 }}
            className="fixed inset-0 flex items-center justify-center z-[9999] pointer-events-none"
          >
            <div className="relative bg-gradient-to-br from-[#1a1f2e] via-[#2d3348] to-[#1a1f2e] rounded-3xl p-8 max-w-md w-[90%] mx-auto shadow-2xl border border-[#00E880]/30 pointer-events-auto">


              {/* Conteúdo */}
              <div className="relative space-y-6">
                {/* Título */}
                <motion.div
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-center"
                >
                  <h2 className="text-4xl font-bold bg-gradient-to-r from-[#00E880] via-yellow-400 to-[#00E880] bg-clip-text text-transparent flex items-center justify-center gap-2">
                    <Trophy className="w-10 h-10 text-yellow-400" />
                    Parabéns!
                    <Trophy className="w-10 h-10 text-yellow-400" />
                  </h2>
                </motion.div>

                {/* Imagem do prêmio */}
                <div className="mb-4 flex justify-center">
                  <img
                    src={prizeImage}
                    alt={prizeName}
                    className="w-32 h-32 object-contain"
                  />
                </div>

                {/* Nome do prêmio */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="text-center space-y-2"
                >
                  <h3 className="text-2xl font-bold text-white">{prizeName}</h3>
                  
                  {/* Valor do prêmio */}
                  <div className="text-5xl font-bold bg-gradient-to-r from-[#00E880] to-green-400 bg-clip-text text-transparent flex items-center justify-center gap-2">
                    <Coins className="w-10 h-10 text-[#00E880]" />
                    R$ {prizeValue.toFixed(2).replace('.', ',')}
                  </div>
                  
                  <p className="text-green-400 text-lg font-semibold animate-pulse">
                    Prêmio adicionado ao saldo!
                  </p>
                </motion.div>

                {/* Botão Jogar Novamente */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.9 }}
                  className="pt-4"
                >
                  <Button
                    onClick={onPlayAgain}
                    className="w-full h-14 text-lg font-bold bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl shadow-lg transform transition-all hover:scale-105 active:scale-95"
                  >
                    <motion.span
                      animate={{
                        scale: [1, 1.05, 1],
                      }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        repeatType: "reverse",
                      }}
                      className="flex items-center gap-2"
                    >
                      Jogar Novamente
                      <Sparkles className="w-5 h-5" />
                    </motion.span>
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}