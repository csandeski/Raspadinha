import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface PrizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: string;
  name: string;
  value: string;
  gameTheme?: 'blue' | 'pink' | 'orange' | 'green';
}

export function PrizeModal({ isOpen, onClose, image, name, value, gameTheme = 'green' }: PrizeModalProps) {
  // Parse value to number for formatting
  const numericValue = parseFloat(value);
  
  // Format value with ,00 small
  const formatValue = () => {
    if (numericValue >= 2000000) {
      return <>2.000.000<span className="text-xs">,00</span></>;
    } else if (numericValue >= 100000) {
      return <>{(numericValue / 1000).toFixed(0)}.000<span className="text-xs">,00</span></>;
    } else if (numericValue >= 10000) {
      return <>{(numericValue / 1000).toFixed(0)}.000<span className="text-xs">,00</span></>;
    } else if (numericValue >= 1000) {
      return <>{numericValue.toLocaleString('pt-BR')}<span className="text-xs">,00</span></>;
    } else if (numericValue >= 1 && numericValue !== 0.5) {
      return <>{numericValue.toLocaleString('pt-BR')}<span className="text-xs">,00</span></>;
    } else {
      return numericValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  };
  
  // Theme colors
  const themeColors = {
    blue: 'from-blue-500 to-blue-600',
    pink: 'from-pink-500 to-pink-600',
    orange: 'from-orange-500 to-orange-600',
    green: 'from-green-500 to-green-600'
  };
  
  const valueColors = {
    blue: 'text-blue-400',
    pink: 'text-pink-400',
    orange: 'text-orange-400',
    green: 'text-green-400'
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-50"
          />
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none"
          >
            <div className="relative bg-gradient-to-br from-gray-900 via-gray-950 to-black rounded-3xl p-8 max-w-sm w-full pointer-events-auto shadow-2xl border border-gray-800/50 overflow-hidden">
              {/* Background gradient effect */}
              <div className={`absolute inset-0 bg-gradient-to-br ${themeColors[gameTheme]} opacity-10 blur-3xl`}></div>
              
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-all hover:scale-110 z-10"
              >
                <X className="w-6 h-6" />
              </button>
              
              {/* Content */}
              <div className="relative text-center">
                {/* Title */}
                <div className="flex items-center justify-center mb-6">
                  <h3 className="text-2xl font-black text-white uppercase tracking-wider">Prêmio</h3>
                </div>
                
                {/* Image container with glow effect */}
                <div className="relative mb-6">
                  <div className={`absolute inset-0 bg-gradient-to-br ${themeColors[gameTheme]} opacity-20 blur-2xl`}></div>
                  <div className="relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl p-6 backdrop-blur-sm border border-gray-700/50">
                    <img 
                      src={image} 
                      alt={name}
                      className="w-56 h-56 object-contain mx-auto drop-shadow-2xl"
                    />

                  </div>
                </div>
                
                {/* Prize name */}
                {name && (
                  <h4 className="text-xl font-bold text-gray-300 mb-3">{name}</h4>
                )}
                
                {/* Prize value with theme color */}
                <div className={`text-4xl font-black mb-6 ${valueColors[gameTheme]}`}>
                  R$ {formatValue()}
                </div>
                
                {/* Action button */}
                <button
                  onClick={onClose}
                  className={`w-full bg-gradient-to-r ${themeColors[gameTheme]} text-white font-bold py-3 px-6 rounded-xl hover:scale-105 transition-all duration-200 shadow-lg`}
                >
                  Fechar
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}