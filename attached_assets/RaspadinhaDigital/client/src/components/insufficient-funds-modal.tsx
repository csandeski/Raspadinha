import { motion, AnimatePresence } from "framer-motion";
import { X, Wallet, Gift } from "lucide-react";
import { useLocation } from "wouter";

interface InsufficientFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "balance" | "bonus";
  requiredAmount: number;
  currentAmount: number;
}

export function InsufficientFundsModal({
  isOpen,
  onClose,
  type,
  requiredAmount,
  currentAmount
}: InsufficientFundsModalProps) {
  const [, setLocation] = useLocation();

  const handleNavigate = () => {
    onClose();
    if (type === "balance") {
      setLocation("/deposit");
    } else {
      setLocation("/rewards");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative w-full max-w-sm bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl p-6 shadow-2xl border border-gray-700/50"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>

            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                type === "balance" 
                  ? "bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30" 
                  : "bg-gradient-to-r from-purple-500/20 to-purple-600/20 border border-purple-500/30"
              }`}>
                {type === "balance" ? (
                  <Wallet className="w-8 h-8 text-red-400" />
                ) : (
                  <Gift className="w-8 h-8 text-purple-400" />
                )}
              </div>
            </div>

            {/* Title */}
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-white mb-2">
                {type === "balance" ? "Saldo Insuficiente" : "Bônus Insuficiente"}
              </h3>
              <p className="text-gray-400 text-sm">
                {type === "balance" 
                  ? `Você precisa de R$ ${requiredAmount.toFixed(2).replace('.', ',')} mas tem apenas R$ ${currentAmount.toFixed(2).replace('.', ',')}`
                  : `Você precisa de ${requiredAmount} raspadinhas bônus mas tem apenas ${currentAmount}`
                }
              </p>
            </div>

            {/* Message */}
            <div className={`p-4 rounded-2xl mb-6 ${
              type === "balance"
                ? "bg-red-500/10 border border-red-500/20"
                : "bg-purple-500/10 border border-purple-500/20"
            }`}>
              <p className="text-sm text-gray-300 text-center">
                {type === "balance"
                  ? "Faça um depósito para continuar jogando e aumentar suas chances de ganhar!"
                  : "Ganhe raspadinhas bônus através do sistema de recompensas, subindo de nível ou na roleta diária!"
                }
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-gray-700/50 hover:bg-gray-700/70 text-gray-300 font-semibold rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleNavigate}
                className={`flex-1 py-3 font-semibold rounded-xl transition-all transform hover:scale-105 ${
                  type === "balance"
                    ? "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                    : "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white"
                }`}
              >
                {type === "balance" ? "Fazer Depósito" : "Recompensas"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}