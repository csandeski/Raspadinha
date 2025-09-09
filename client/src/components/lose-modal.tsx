import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw, TrendingDown } from 'lucide-react';
import { useEffect, useState } from 'react';

interface LoseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayAgain: () => void;
  nearMissPrizes?: Array<{ name: string; value: number }>;
}

export function LoseModal({ isOpen, onClose, onPlayAgain, nearMissPrizes = [] }: LoseModalProps) {
  const [showParticles, setShowParticles] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowParticles(true);
      const timer = setTimeout(() => setShowParticles(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Default near miss prizes if none provided
  const defaultPrizes = [
    { name: "100 MIL REAIS", value: 100000 },
    { name: "10 REAIS", value: 10 },
    { name: "50 CENTAVOS", value: 0.50 },
    { name: "5 REAIS", value: 5 },
    { name: "VAZIO", value: 0 }
  ];

  const prizesToShow = nearMissPrizes.length > 0 ? nearMissPrizes : defaultPrizes;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0, rotateY: -180 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            exit={{ scale: 0.5, opacity: 0, rotateY: 180 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <div className="bg-gradient-to-br from-gray-900 via-[#1a1f2e] to-gray-800 rounded-3xl p-8 max-w-md w-full mx-4 relative overflow-hidden pointer-events-auto border border-gray-700/50 shadow-2xl">
              
              {/* Animated Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-800/20 to-gray-900/20" />
              </div>

              {/* Falling Particles Effect */}
              {showParticles && (
                <div className="absolute inset-0 pointer-events-none">
                  {[...Array(20)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-1 h-1 bg-blue-400/50 rounded-full"
                      initial={{ 
                        x: Math.random() * 400 - 200,
                        y: -20 
                      }}
                      animate={{ 
                        y: 500,
                        x: Math.random() * 400 - 200
                      }}
                      transition={{ 
                        duration: 3 + Math.random() * 2,
                        repeat: Infinity,
                        delay: Math.random() * 2,
                        ease: "linear"
                      }}
                      style={{
                        left: '50%',
                        filter: 'blur(1px)'
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Sad Icon Animation */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="flex justify-center mb-6"
              >
                <div className="relative">
                  <motion.div
                    animate={{ 
                      rotate: [0, -10, 10, -10, 0],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      repeatDelay: 2
                    }}
                    className="w-24 h-24 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center"
                  >
                    <TrendingDown className="w-12 h-12 text-blue-400" />
                  </motion.div>
                  
                  {/* Pulsing ring effect */}
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-blue-400/30"
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
              </motion.div>

              {/* Title */}
              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-bold text-center mb-2 text-red-400"
              >
                Não foi desta vez
              </motion.h2>

              {/* Subtitle */}
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-gray-400 text-center mb-6"
              >
                Tente novamente e boa sorte!
              </motion.p>

              {/* Near Miss Prizes Display */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mb-6"
              >
                <p className="text-xs text-gray-500 text-center mb-3 uppercase tracking-wider">
                  Prêmios que você quase ganhou
                </p>
                <div className="flex justify-center gap-2 flex-wrap">
                  {prizesToShow.slice(0, 4).map((prize, index) => (
                    <motion.div
                      key={index}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                      className="bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2"
                    >
                      <span className="text-xs text-gray-400 block">
                        {prize.value > 0 ? `R$ ${prize.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'VAZIO'}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Play Again Button */}
              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onPlayAgain}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-4 rounded-xl font-bold transition-all hover:shadow-xl flex items-center justify-center gap-2 group"
              >
                <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                <span>Jogar Novamente</span>
              </motion.button>

              {/* Motivational Text */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-xs text-gray-500 text-center mt-4"
              >
                A sorte está ao seu lado, continue tentando!
              </motion.p>

              {/* Corner Decorations */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute top-8 left-8 w-4 h-4 border-2 border-blue-400/20 rounded-full"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute bottom-8 right-8 w-4 h-4 border-2 border-purple-400/20 rounded-full"
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}