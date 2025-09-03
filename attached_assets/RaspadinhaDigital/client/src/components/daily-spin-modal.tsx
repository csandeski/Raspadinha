import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gift, Star, Sparkles } from "lucide-react";
import { useLocation } from "wouter";

interface DailySpinModalProps {
  isOpen: boolean;
  onClose: () => void;
  canSpin: boolean;
}

export function DailySpinModal({ isOpen, onClose, canSpin }: DailySpinModalProps) {
  const [, setLocation] = useLocation();
  
  const handleGoToRewards = () => {
    onClose();
    setLocation("/rewards");
  };

  // Don't render anything if modal shouldn't be open
  if (!isOpen || !canSpin) return null;

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="daily-spin-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100]"
          />
          
          {/* Modal */}
          <motion.div
            key="daily-spin-modal"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 flex items-center justify-center p-4 z-[101]"
            onClick={onClose}
          >
            <div 
              className="w-full max-w-sm relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Simple card with green accent */}
              <div className="relative bg-[#181a1f] rounded-2xl border border-[#00E880]/20 shadow-2xl">
                {/* Close button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  className="absolute top-3 right-3 p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors z-10"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
                
                <div className="p-6 text-center">
                  {/* Simple icon */}
                  <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-[#00E880] to-[#00D470] rounded-full flex items-center justify-center">
                    <Gift className="w-8 h-8 text-black" />
                  </div>
                  
                  {/* Main offer */}
                  <div className="mb-4">
                    <h2 className="text-sm text-gray-400 mb-1">
                      OFERTA ESPECIAL
                    </h2>
                    <div className="text-2xl font-black text-white leading-tight">
                      GANHE ATÉ
                    </div>
                    <div className="text-5xl font-black text-[#00E880] mb-1">
                      100
                    </div>
                    <div className="text-xl font-bold text-white">
                      RASPADINHAS GRÁTIS!
                    </div>
                  </div>
                  
                  {/* Highlight box */}
                  <div className="bg-[#00E880]/10 border border-[#00E880]/30 rounded-xl p-3 mb-4">
                    <div className="text-sm font-semibold text-[#00E880]">
                      DISPONÍVEL AGORA • TEMPO LIMITADO
                    </div>
                  </div>
                  
                  {/* Benefits */}
                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-300">
                      <span className="text-[#00E880] font-bold">•</span> 100% Grátis - Sem Pegadinhas
                    </div>
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-300">
                      <span className="text-[#00E880] font-bold">•</span> Gire Todos os Dias
                    </div>
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-300">
                      <span className="text-[#00E880] font-bold">•</span> Sem Necessidade de Depósito
                    </div>
                  </div>
                  
                  {/* CTA Button */}
                  <button
                    onClick={handleGoToRewards}
                    className="w-full bg-[#00E880] hover:bg-[#00D470] text-black font-bold py-3 rounded-xl transition-colors shadow-lg"
                  >
                    GIRAR AGORA
                  </button>
                  
                  {/* Later button */}
                  <button
                    onClick={onClose}
                    className="w-full mt-2 text-gray-400 hover:text-gray-300 font-medium py-2 text-sm transition-colors"
                  >
                    GIRAR DEPOIS
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