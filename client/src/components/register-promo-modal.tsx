import { useState, useEffect } from "react";
import { X, Gift, Sparkles, DollarSign, UserPlus } from "lucide-react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { getPathWithRef } from "@/lib/url-utils";

interface RegisterPromoModalProps {
  alwaysShow?: boolean; // If true, don't check localStorage
}

export function RegisterPromoModal({ alwaysShow = false }: RegisterPromoModalProps) {
  const [show, setShow] = useState(false);
  const [location, setLocation] = useLocation();

  useEffect(() => {
    // Define allowed pages for the modal - only raspadinha game pages
    const allowedPages = [
      '/game/premio-pix',
      '/game/premio-me-mimei',
      '/game/premio-eletronicos',
      '/game/premio-super-premios'
    ];

    // Check if current page is allowed
    if (!allowedPages.includes(location)) return;
    
    // Only check localStorage if not alwaysShow
    if (!alwaysShow) {
      const hasSeenModal = localStorage.getItem('hasSeenRegisterPromo');
      if (hasSeenModal) return;
    }

    // Show modal after 5 seconds for non-logged users
    const timer = setTimeout(() => {
      setShow(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, [location, alwaysShow]);

  const handleClose = () => {
    setShow(false);
    // Only set localStorage if not alwaysShow
    if (!alwaysShow) {
      localStorage.setItem('hasSeenRegisterPromo', 'true');
    }
  };

  const handleRegister = () => {
    setShow(false);
    // Only set localStorage if not alwaysShow
    if (!alwaysShow) {
      localStorage.setItem('hasSeenRegisterPromo', 'true');
    }
    // Navigate to register with coupon and ref pre-applied
    const baseUrl = '/register?coupon=SORTE';
    setLocation(getPathWithRef(baseUrl));
  };

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
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
              <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-[#00E880]/20 rounded-full blur-3xl" />
              
              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 rounded-full bg-gray-800/50 hover:bg-gray-700/50 transition-colors z-50"
              >
                <X className="w-5 h-5 text-gray-400 hover:text-white" />
              </button>
              
              <div className="relative p-8 text-center">
                {/* Icon */}
                <div className="mx-auto w-20 h-20 mb-6 relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#00E880] to-[#00D470] rounded-full animate-pulse" />
                  <div className="relative w-full h-full bg-gradient-to-br from-[#00E880] to-[#00D470] rounded-full flex items-center justify-center">
                    <Gift className="w-10 h-10 text-black" />
                  </div>
                  {/* Sparkles */}
                  <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-[#00E880] animate-pulse" />
                  <Sparkles className="absolute -bottom-1 -left-1 w-5 h-5 text-[#00E880] animate-pulse" />
                </div>
                
                {/* Title */}
                <h2 className="text-2xl font-bold text-white mb-3">Você ganhou 250 MANIA BÔNUS </h2>
                
                {/* Description */}
                <p className="mb-6 leading-relaxed text-[#00dc76]">Por tempo limitado!</p>
                
                {/* Highlighted Benefits - Elegant Mobile Design */}
                <div className="mb-6 space-y-3">
                  {/* Special Offer Banner */}
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-500 via-violet-500 to-purple-500 p-[2px] animate-gradient-x"
                  >
                    <div className="relative bg-gray-900 rounded-[14px] px-4 py-3">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full blur-2xl" />
                      <div className="relative flex items-center">
                        <div className="flex items-center gap-3 w-full">
                          <div className="relative flex-shrink-0">
                            <div className="absolute inset-0 bg-purple-500 rounded-full blur-md opacity-50" />
                            <div className="relative w-10 h-10 bg-gradient-to-br from-purple-400 to-violet-600 rounded-full flex items-center justify-center">
                              <Gift className="w-5 h-5 text-white" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="text-white font-bold text-sm">CUPOM SORTE ATIVADO</div>
                            <div className="text-purple-200 text-xs">Até 250 Mania Bônus!</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                  
                  
                  
                  {/* Additional Perks */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center justify-center pt-2"
                  >
                    <div className="flex items-center gap-2 text-gray-400 text-xs">
                      <span>Cadastre-se agora e ganhe!</span>
                    </div>
                  </motion.div>
                </div>
                
                {/* Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={handleRegister}
                    className="w-full bg-gradient-to-r from-[#00E880] to-[#00D470] hover:from-[#00D470] hover:to-[#00C060] text-black font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#00E880]/30 flex flex-col items-center justify-center gap-1"
                  >
                    <span className="text-lg font-bold flex items-center gap-2">
                      <UserPlus className="w-5 h-5" />
                      Cadastrar Agora
                    </span>
                    <span className="text-sm font-medium opacity-90">e ganhe até 250 raspadinhas!</span>
                  </button>
                  <button
                    onClick={handleClose}
                    className="w-full bg-gray-800/50 hover:bg-gray-700/50 text-white font-semibold py-3 px-4 rounded-xl transition-all border border-gray-700 flex items-center justify-center gap-2"
                  >
                    Fechar
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