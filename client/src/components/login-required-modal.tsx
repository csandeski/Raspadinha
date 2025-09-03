import { motion, AnimatePresence } from "framer-motion";
import { X, LogIn, UserPlus, Sparkles, Gift, DollarSign } from "lucide-react";
import { useLocation } from "wouter";

interface LoginRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginRequiredModal({ isOpen, onClose }: LoginRequiredModalProps) {
  const [, setLocation] = useLocation();
  
  const handleLogin = () => {
    onClose();
    setLocation("/login");
  };
  
  const handleRegister = () => {
    onClose();
    setLocation("/register");
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
            className="fixed inset-0 flex items-center justify-center p-4 z-[200]"
          >
            <div className="w-full max-w-md relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl border border-[#00E880]/30 shadow-2xl shadow-[#00E880]/20 overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#00E880]/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl" />
              
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full bg-gray-800/50 hover:bg-gray-700/50 transition-colors z-50"
              >
                <X className="w-5 h-5 text-gray-400 hover:text-white" />
              </button>
              
              <div className="relative p-8 text-center">
                {/* Icon */}
                <div className="mx-auto w-20 h-20 mb-6 relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#00E880] to-[#00D470] rounded-full animate-pulse" />
                  <div className="relative w-full h-full bg-gradient-to-br from-[#00E880] to-[#00D470] rounded-full flex items-center justify-center">
                    <LogIn className="w-10 h-10 text-black" />
                  </div>
                  {/* Sparkles */}
                  <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-[#00E880] animate-pulse" />
                  <Sparkles className="absolute -bottom-1 -left-1 w-5 h-5 text-[#00E880] animate-pulse" />
                </div>
                
                {/* Title */}
                <h2 className="text-2xl font-bold text-white mb-3">
                  Você precisa estar logado para jogar!
                </h2>
                
                {/* Description */}
                <p className="text-gray-300 mb-6 leading-relaxed">
                  Crie sua conta agora e receba benefícios exclusivos!
                </p>
                
                {/* Highlighted Benefits - Elegant Mobile Design */}
                <div className="mb-6 space-y-3">
                  {/* Special Offer Banner */}
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-400 p-[2px] animate-gradient-x"
                  >
                    <div className="relative bg-gray-900 rounded-[14px] px-4 py-3">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-400/10 rounded-full blur-2xl" />
                      <div className="relative flex items-center">
                        <div className="flex items-center gap-3 w-full">
                          <div className="relative flex-shrink-0">
                            <div className="absolute inset-0 bg-yellow-400 rounded-full blur-md opacity-50" />
                            <div className="relative w-10 h-10 bg-gradient-to-br from-yellow-300 to-orange-500 rounded-full flex items-center justify-center">
                              <Gift className="w-5 h-5 text-gray-900" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="text-white font-bold text-sm">ATÉ 100 RASPADINHAS</div>
                            <div className="text-yellow-200 text-xs">Ganhe todos os dias grátis</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                  
                  {/* Deposit Bonus */}
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#00E880] via-green-400 to-[#00E880] p-[2px] animate-gradient-x"
                  >
                    <div className="relative bg-gray-900 rounded-[14px] px-4 py-3">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-[#00E880]/10 rounded-full blur-2xl" />
                      <div className="relative flex items-center">
                        <div className="flex items-center gap-3 w-full">
                          <div className="relative flex-shrink-0">
                            <div className="absolute inset-0 bg-[#00E880] rounded-full blur-md opacity-50" />
                            <div className="relative w-10 h-10 bg-gradient-to-br from-[#00E880] to-green-500 rounded-full flex items-center justify-center">
                              <DollarSign className="w-5 h-5 text-gray-900" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="text-white font-bold text-sm">BÔNUS DE BOAS-VINDAS</div>
                            <div className="text-green-200 text-xs">Ganhe até 250 raspadinhas</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                  
                  {/* Additional Perks */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center justify-center pt-2"
                  >
                    <div className="flex items-center gap-2 text-gray-400 text-xs">
                      <span>+ Prêmios diários e muito mais!</span>
                    </div>
                  </motion.div>
                </div>
                
                {/* Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={handleRegister}
                    className="w-full bg-gradient-to-r from-[#00E880] to-[#00D470] hover:from-[#00D470] hover:to-[#00C060] text-black font-bold py-3 px-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#00E880]/30 flex items-center justify-center gap-2"
                  >
                    <UserPlus className="w-5 h-5" />
                    Criar Conta Grátis
                  </button>
                  <button
                    onClick={handleLogin}
                    className="w-full bg-gray-800/50 hover:bg-gray-700/50 text-white font-semibold py-3 px-4 rounded-xl transition-all border border-gray-700 flex items-center justify-center gap-2"
                  >
                    <LogIn className="w-5 h-5" />
                    Já tenho conta
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}