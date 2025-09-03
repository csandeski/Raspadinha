import { motion, AnimatePresence } from "framer-motion";
import { X, TrendingUp, Trophy, Sparkles } from "lucide-react";

interface MultiplierInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameType: string;
  gameCost: number;
  themeColor: string;
}

export function MultiplierInfoModal({ 
  isOpen, 
  onClose, 
  gameType,
  gameCost,
  themeColor 
}: MultiplierInfoModalProps) {
  
  const getGameName = () => {
    switch (gameType) {
      case 'pix': return 'PIX na Conta';
      case 'me-mimei': return 'Me Mimei';
      case 'eletronicos': return 'Eletrônicos';
      case 'super-premios': return 'Super Prêmios';
      default: return '';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200]"
            onClick={onClose}
          />
          
          {/* Modal */}
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
            >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#00E880] to-[#00D470] p-4 relative">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-black/80 hover:text-black transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-[#f0f0f0] bg-[#000000fc]">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#000000]">Multiplicador de Ganhos</h3>
                  <p className="text-sm text-[#0a0101]">{getGameName()}</p>
                </div>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-5 space-y-4">
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  Como funciona?
                </h4>
                <p className="text-sm text-gray-300 leading-relaxed">
                  O multiplicador aumenta o valor do seu prêmio quando você ganha!
                </p>
              </div>
              
              {/* Examples */}
              <div className="space-y-3">
                <div className="bg-gray-800/30 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-400">Normal (1x)</span>
                    <span className="text-sm text-gray-500">R$ {gameCost.toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    • Prêmio com valor normal<br/>
                    • Sem multiplicação do valor
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-lg p-3 border border-gray-600">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white flex items-center gap-1">
                      Mega (5x)
                      <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                    </span>
                    <span className="text-sm text-gray-300">R$ {(gameCost * 5).toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-gray-300">
                    • <span className="text-yellow-400 font-semibold">Prêmio multiplicado por 5</span><br/>
                    • Se ganhar R$ 100, recebe R$ 500
                  </div>
                  <div className="mt-2 text-xs text-gray-400">
                    Valor do prêmio aumentado 5 vezes
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-lg p-3 border border-gray-500">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white flex items-center gap-1">
                      Super (10x)
                      <Trophy className="w-3 h-3 text-yellow-400" />
                    </span>
                    <span className="text-sm text-gray-300">R$ {(gameCost * 10).toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-gray-300">
                    • <span className="text-green-400 font-semibold">Prêmio multiplicado por 10</span><br/>
                    • Se ganhar R$ 100, recebe R$ 1K
                  </div>
                  <div className="mt-2 text-xs text-gray-400">
                    Valor do prêmio aumentado 10 vezes
                  </div>
                </div>
              </div>
              
              <button
                onClick={onClose}
                className="w-full bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}