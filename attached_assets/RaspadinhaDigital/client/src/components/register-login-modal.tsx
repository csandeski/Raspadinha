import { useState } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export function RegisterLoginModal({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void;
}) {
  const [, setLocation] = useLocation();

  const handleRegister = () => {
    setLocation('/register');
  };

  const handleLogin = () => {
    setLocation('/login');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gray-900 rounded-2xl p-6 relative max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">
              Continue Jogando!
            </h2>
            <p className="text-gray-400">
              Crie uma conta para continuar jogando e ganhar prêmios de verdade!
            </p>
          </div>

          {/* Benefits list */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 text-gray-300">
              <div className="w-2 h-2 rounded-full bg-[#00E880]"></div>
              <span>Ganhe bônus de boas-vindas</span>
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <div className="w-2 h-2 rounded-full bg-[#00E880]"></div>
              <span>Participe de promoções exclusivas</span>
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <div className="w-2 h-2 rounded-full bg-[#00E880]"></div>
              <span>Acumule pontos e suba de nível</span>
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <div className="w-2 h-2 rounded-full bg-[#00E880]"></div>
              <span>Saque seus prêmios via PIX</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleRegister}
              size="lg"
              className="w-full bg-gradient-to-r from-[#00E880] to-[#00D470] hover:from-[#00D470] hover:to-[#00C060] text-black font-bold py-6 text-lg rounded-xl shadow-lg transform transition-all hover:scale-105"
            >
              Criar Conta Grátis
            </Button>
            
            <Button
              onClick={handleLogin}
              size="lg"
              variant="outline"
              className="w-full border-gray-700 hover:border-gray-600 bg-gray-800 hover:bg-gray-700 text-white font-bold py-6 text-lg rounded-xl"
            >
              Já tenho conta
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center mt-4">
            Ao criar uma conta, você concorda com nossos Termos de Uso e Política de Privacidade
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}