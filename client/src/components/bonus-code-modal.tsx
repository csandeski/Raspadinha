import { motion, AnimatePresence } from "framer-motion";
import { X, Gift, Clock, Sparkles } from "lucide-react";
import { useLocation } from "wouter";

interface BonusCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BonusCodeModal({ isOpen, onClose }: BonusCodeModalProps) {
  const [, setLocation] = useLocation();
  
  const handleRegisterNow = () => {
    onClose();
    // Navigate to register with BONUS referral code pre-filled
    setLocation("/register?ref=BONUS");
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
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200]"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed inset-0 flex items-start justify-center p-4 z-[200] overflow-y-auto"
          >
            <div className="w-full max-w-md relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl border border-[#00E880]/30 shadow-2xl shadow-[#00E880]/20 overflow-hidden my-auto min-h-0">
              {/* Decorative elements */}
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#00E880]/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-[#00E880]/20 rounded-full blur-3xl" />
              
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full bg-gray-800/50 hover:bg-gray-700/50 transition-colors z-50"
              >
                <X className="w-5 h-5 text-gray-400 hover:text-white" />
              </button>
              
              <div className="relative pt-14 px-6 pb-6 sm:pt-16 sm:px-8 sm:pb-8 text-center max-h-[calc(100vh-2rem)] overflow-y-auto">
                {/* Icon */}
                <div className="mx-auto w-20 h-20 sm:w-24 sm:h-24 mb-4 sm:mb-6 relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#00E880] to-[#00D470] rounded-full animate-pulse" />
                  <div className="relative w-full h-full bg-gradient-to-br from-[#00E880] to-[#00D470] rounded-full flex items-center justify-center">
                    <Gift className="w-10 h-10 sm:w-12 sm:h-12 text-black" />
                  </div>
                  {/* Sparkles */}
                  <Sparkles className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 w-6 h-6 sm:w-8 sm:h-8 text-[#00E880] animate-pulse" />
                  <Sparkles className="absolute -bottom-1 -left-1 sm:-bottom-2 sm:-left-2 w-5 h-5 sm:w-6 sm:h-6 text-[#00E880] animate-pulse" />
                </div>
                
                {/* Title */}
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 sm:mb-3">
                  Depósito DOBRADO!
                </h2>
                
                {/* Subtitle */}
                <p className="text-lg sm:text-xl text-[#00E880] font-semibold mb-3 sm:mb-4">
                  Por tempo limitado
                </p>
                
                {/* Highlight: Free Raspadinhas */}
                <div className="relative mb-4 sm:mb-6">
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 via-yellow-400/20 to-yellow-500/20 blur-xl" />
                  <div className="relative bg-gradient-to-r from-yellow-600/10 via-yellow-500/10 to-yellow-600/10 border-2 border-yellow-500/50 rounded-xl p-4 transform hover:scale-[1.02] transition-transform">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
                      <span className="text-yellow-400 font-bold text-base sm:text-lg">BÔNUS ESPECIAL!</span>
                      <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
                    </div>
                    <p className="text-white font-semibold text-sm sm:text-base">
                      Ao se cadastrar, ganhe
                    </p>
                    <p className="text-yellow-400 font-bold text-xl sm:text-2xl mb-1">
                      5 Mania Bônus!
                    </p>
                    <p className="text-yellow-400/80 text-xs sm:text-sm">
                      Comece a jogar imediatamente!
                    </p>
                  </div>
                </div>
                
                {/* Description */}
                <p className="text-sm sm:text-base text-gray-300 mb-4 sm:mb-6 leading-relaxed">
                  Cadastre-se agora com nosso código especial e ganhe <span className="text-[#00E880] font-bold">100% de bônus</span> no seu primeiro depósito!
                </p>
                
                {/* Benefits */}
                <div className="bg-gray-800/50 border-2 border-[#00E880]/50 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
                  <p className="text-base sm:text-lg text-white mb-1 sm:mb-2">Benefícios exclusivos:</p>
                  <p className="text-xs sm:text-sm text-gray-300">• Bônus de 100% no primeiro depósito</p>
                  <p className="text-xs sm:text-sm text-gray-300">• Mania Bônus todos os dias</p>
                </div>
                
                {/* Timer */}
                <div className="flex items-center justify-center gap-2 mb-4 sm:mb-6 text-orange-400">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs sm:text-sm font-medium">Oferta expira em breve!</span>
                </div>
                
                {/* Buttons */}
                <div className="flex gap-2 sm:gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl transition-all text-sm sm:text-base"
                  >
                    Fechar
                  </button>
                  <button
                    onClick={handleRegisterNow}
                    className="flex-1 bg-gradient-to-r from-[#00E880] to-[#00D470] hover:from-[#00D470] hover:to-[#00C060] text-black font-bold py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#00E880]/30 text-sm sm:text-base"
                  >
                    Cadastrar Agora
                  </button>
                </div>
                
                {/* Bottom text */}
                <p className="text-[10px] sm:text-xs text-gray-500 mt-3 sm:mt-4">
                  * Bônus válido apenas para novos usuários
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}