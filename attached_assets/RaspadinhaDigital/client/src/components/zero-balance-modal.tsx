import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Sparkles, Plus, Gift } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";

// Global function to show the zero balance modal
let showZeroBalanceModal: (() => void) | null = null;

export function triggerZeroBalanceModal() {
  if (showZeroBalanceModal) {
    showZeroBalanceModal();
  }
}

export default function ZeroBalanceModal() {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [, setLocation] = useLocation();

  // Set up the global trigger function
  useEffect(() => {
    showZeroBalanceModal = () => {
      setShowModal(true);
    };

    return () => {
      showZeroBalanceModal = null;
    };
  }, []);

  const handleDeposit = () => {
    setShowModal(false);
    setLocation("/deposit");
  };

  const handleClose = () => {
    setShowModal(false);
  };

  if (!user) return null;

  const realBalance = parseFloat(user.balance || "0");

  return (
    <AnimatePresence>
      {showModal && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 flex items-center justify-center p-4 z-50"
          >
            <div className="bg-gradient-to-b from-gray-900 to-gray-950 rounded-2xl shadow-2xl overflow-hidden border border-gray-800 max-w-sm w-full">
              {/* Header with animated background */}
              <div className="relative p-6 pb-4">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-orange-500/10 to-yellow-500/10 animate-pulse" />
                
                <div className="relative flex flex-col items-center text-center">
                  <motion.div
                    initial={{ rotate: -180, scale: 0 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="mb-4"
                  >
                    <div className="relative">
                      <AlertCircle className="w-16 h-16 text-orange-400" />
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <div className="w-20 h-20 bg-orange-400/20 rounded-full blur-xl" />
                      </motion.div>
                    </div>
                  </motion.div>

                  <h2 className="text-2xl font-bold text-white mb-2">
                    Saldo Real Zerado!
                  </h2>
                  
                  <p className="text-gray-300 text-sm">
                    Seu saldo real acabou. Faça uma recarga para continuar aproveitando!
                  </p>
                </div>
              </div>

              {/* Balance Display */}
              <div className="px-6 pb-4">
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                  <p className="text-xs text-gray-400 mb-1">Saldo Real</p>
                  <p className="text-lg font-bold text-red-400">
                    R$ {realBalance.toFixed(2)}
                  </p>
                </div>
              </div>
              
              {/* Bonus Info */}
              <div className="px-6 pb-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 via-yellow-400/20 to-yellow-500/20 blur-xl" />
                  <div className="relative bg-gradient-to-r from-yellow-600/10 via-yellow-500/10 to-yellow-600/10 border-2 border-yellow-500/50 rounded-xl p-4 transform hover:scale-[1.02] transition-transform">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
                      <span className="text-yellow-400 font-bold text-sm">BÔNUS ESPECIAL!</span>
                      <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Gift className="w-4 h-4 text-yellow-400" />
                        <p className="text-white font-semibold text-sm">
                          100% de bônus no primeiro depósito
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Gift className="w-4 h-4 text-yellow-400" />
                        <p className="text-white font-semibold text-sm">
                          5 Raspadinhas PIX GRÁTIS!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-6 pt-2 space-y-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDeposit}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-4 px-6 rounded-xl 
                    hover:from-green-600 hover:to-emerald-700 transition-all duration-200 
                    shadow-lg hover:shadow-green-500/25 flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Fazer Recarga Agora
                </motion.button>

                <button
                  onClick={handleClose}
                  className="w-full text-gray-400 hover:text-white transition-colors text-sm font-medium py-2"
                >
                  Continuar sem recarregar
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}