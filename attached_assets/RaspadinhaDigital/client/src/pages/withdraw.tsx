import { useState } from "react";
import { useAuth } from "../lib/auth.tsx";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "../lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { MobileLayout } from "@/components/mobile-layout";
import { ArrowLeft, Upload, AlertCircle, CreditCard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Withdraw() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pixKeyType, setPixKeyType] = useState<'cpf' | 'cnpj'>('cpf');

  // Format CPF function
  const formatCPF = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Limit to 11 digits
    const limitedDigits = digits.slice(0, 11);
    
    // Apply CPF format (XXX.XXX.XXX-XX)
    if (limitedDigits.length <= 3) {
      return limitedDigits;
    } else if (limitedDigits.length <= 6) {
      return `${limitedDigits.slice(0, 3)}.${limitedDigits.slice(3)}`;
    } else if (limitedDigits.length <= 9) {
      return `${limitedDigits.slice(0, 3)}.${limitedDigits.slice(3, 6)}.${limitedDigits.slice(6)}`;
    } else {
      return `${limitedDigits.slice(0, 3)}.${limitedDigits.slice(3, 6)}.${limitedDigits.slice(6, 9)}-${limitedDigits.slice(9)}`;
    }
  };

  // Format CNPJ function
  const formatCNPJ = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const limitedDigits = digits.slice(0, 14);
    
    // Apply CNPJ format (XX.XXX.XXX/XXXX-XX)
    if (limitedDigits.length <= 2) {
      return limitedDigits;
    } else if (limitedDigits.length <= 5) {
      return `${limitedDigits.slice(0, 2)}.${limitedDigits.slice(2)}`;
    } else if (limitedDigits.length <= 8) {
      return `${limitedDigits.slice(0, 2)}.${limitedDigits.slice(2, 5)}.${limitedDigits.slice(5)}`;
    } else if (limitedDigits.length <= 12) {
      return `${limitedDigits.slice(0, 2)}.${limitedDigits.slice(2, 5)}.${limitedDigits.slice(5, 8)}/${limitedDigits.slice(8)}`;
    } else {
      return `${limitedDigits.slice(0, 2)}.${limitedDigits.slice(2, 5)}.${limitedDigits.slice(5, 8)}/${limitedDigits.slice(8, 12)}-${limitedDigits.slice(12)}`;
    }
  };

  // Handle PIX key change
  const handlePixKeyChange = (value: string) => {
    // Detect key type based on input
    if (pixKeyType === 'cpf') {
      setPixKey(formatCPF(value));
    } else if (pixKeyType === 'cnpj') {
      setPixKey(formatCNPJ(value));
    } else {
      setPixKey(value);
    }
  };

  // Query user balance
  const { data: userWallet } = useQuery<{ balance: string; scratchBonus: number }>({
    queryKey: ['/api/user/balance'],
    enabled: !!user,
  });

  const balance = userWallet?.balance || "0.00";

  if (!user) {
    setLocation("/login");
    return null;
  }

  const handleConfirmClick = () => {
    if (!withdrawalAmount || !pixKey) {
      toast({
        description: "Por favor, preencha todos os campos",
        duration: 5000,
      });
      return;
    }

    const amount = parseFloat(withdrawalAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        description: "Valor inválido",
        duration: 5000,
      });
      return;
    }

    if (amount > parseFloat(balance)) {
      toast({
        description: "Saldo insuficiente",
        duration: 5000,
      });
      return;
    }

    // Show confirmation modal
    setShowConfirmModal(true);
  };

  const handleWithdrawal = async () => {
    setIsSubmitting(true);
    try {
      const response = await apiRequest('/api/withdrawals/create', 'POST', {
        amount: parseFloat(withdrawalAmount).toFixed(2),
        pixKey,
      });

      toast({ 
        description: response.message || "Saque solicitado com sucesso",
        duration: 5000,
      });

      // Navigate to wallet page
      setLocation("/wallet");
    } catch (error: any) {
      // Extract error message from response
      const errorMessage = error.error || error.message || "Não foi possível processar o saque";
      toast({
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
      setShowConfirmModal(false);
    }
  };

  return (
    <MobileLayout>
      <div className="min-h-full bg-gradient-to-b from-[#0E1015] via-[#1a1b23] to-[#0E1015]">
        <div className="max-w-md mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center mb-6">
            <button
              onClick={() => setLocation("/")}
              className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 transition-colors mr-3"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Solicitar Saque</h1>
              <p className="text-gray-400 text-sm">Retire seus ganhos via PIX</p>
            </div>
          </div>

          {/* Balance Card */}
          <div className="bg-gradient-to-b from-gray-800/30 to-gray-900/30 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-gray-400 text-sm">Saldo Disponível</p>
              <span className="text-[#00E880] text-xs font-semibold">Disponível para saque</span>
            </div>
            <p className="text-3xl font-bold text-white">
              R$ {balance}
            </p>
          </div>

          {/* Withdrawal Form */}
          <div className="bg-gradient-to-b from-gray-800/30 to-gray-900/30 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
            <div className="space-y-4">
              <div>
                <Label htmlFor="amount" className="text-gray-400 text-sm mb-2 block">
                  Valor do Saque
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 font-medium">
                    R$
                  </span>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0,00"
                    value={withdrawalAmount}
                    onChange={(e) => setWithdrawalAmount(e.target.value)}
                    className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder-gray-500 focus:ring-[#00E880] focus:border-[#00E880]"
                    step="0.01"
                    min="0.01"
                    max={balance}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Valor mínimo: R$ 0,01 | Máximo: R$ {balance}
                </p>
              </div>

              <div>
                <Label htmlFor="pixKeyType" className="text-gray-400 text-sm mb-2 block">
                  Tipo de Chave PIX
                </Label>
                <select
                  id="pixKeyType"
                  value={pixKeyType}
                  onChange={(e) => {
                    setPixKeyType(e.target.value as 'cpf' | 'cnpj');
                    setPixKey(''); // Clear the key when type changes
                  }}
                  className="w-full bg-gray-800/50 border border-gray-700 text-white rounded-lg px-3 py-2 mb-3 focus:ring-[#00E880] focus:border-[#00E880]"
                >
                  <option value="cpf">CPF</option>
                  <option value="cnpj">CNPJ</option>
                </select>

                <Label htmlFor="pixKey" className="text-gray-400 text-sm mb-2 block">
                  {pixKeyType === 'cpf' ? 'CPF' : 'CNPJ'}
                </Label>
                <Input
                  id="pixKey"
                  type="text"
                  placeholder={
                    pixKeyType === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'
                  }
                  value={pixKey}
                  onChange={(e) => handlePixKeyChange(e.target.value)}
                  className="bg-gray-800/50 border-gray-700 text-white placeholder-gray-500 focus:ring-[#00E880] focus:border-[#00E880]"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {pixKeyType === 'cpf' && 'Digite apenas números. A formatação será automática.'}
                  {pixKeyType === 'cnpj' && 'Digite apenas números. A formatação será automática.'}
                </p>
              </div>

              <div className="pt-4">
                <Button
                  onClick={handleConfirmClick}
                  disabled={isSubmitting || !withdrawalAmount || !pixKey || parseFloat(balance) === 0}
                  className="w-full bg-gradient-to-r from-[#00E880] to-[#00D470] hover:from-[#00D470] hover:to-[#00C560] text-black font-bold py-3 disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  <Upload className="w-5 h-5" />
                  <span>{isSubmitting ? "Processando..." : "Confirmar Saque"}</span>
                </Button>
              </div>

              {/* Withdrawal Info */}
              <div className="mt-6 p-4 bg-gray-800/30 rounded-xl border border-gray-700/30">
                <h3 className="text-sm font-semibold text-white mb-2">Informações Importantes</h3>
                <ul className="space-y-1 text-xs text-gray-400">
                  <li>• O saque será processado em até 24 horas úteis</li>
                  <li>• A chave PIX deve estar vinculada ao seu CPF</li>
                  <li>• Saques pendentes podem ser cancelados na página da carteira</li>
                  <li>• Taxa de processamento: Grátis</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center pb-20 sm:pb-0">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-black/60 backdrop-blur-xl absolute inset-0" 
              onClick={() => setShowConfirmModal(false)}
            />
            
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="relative w-full max-w-md animate-in slide-in-from-bottom duration-300 sm:zoom-in-95"
            >
              <div className="bg-gradient-to-b from-[#1E1F28] to-[#15161B] rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden">
                {/* Header Section */}
                <div className="relative bg-gradient-to-br from-[#00E880]/20 via-[#00E880]/10 to-transparent p-6 pb-8">
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwRTg4MCIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50"></div>
                  
                  <div className="relative">
                    {/* Icon */}
                    <div className="flex justify-center mb-4">
                      <div className="relative group">
                        <div className="absolute inset-0 bg-[#00E880] rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
                        <div className="relative bg-gradient-to-br from-[#00E880] to-[#00D470] p-4 rounded-3xl shadow-xl">
                          <Upload className="w-12 h-12 sm:w-14 sm:h-14 text-black" />
                        </div>
                      </div>
                    </div>
                    
                    <h3 className="text-white font-black text-2xl sm:text-3xl text-center tracking-tight">Confirmar Saque</h3>
                  </div>
                </div>
                
                {/* Content Section */}
                <div className="px-6 pb-6 -mt-4">
                  {/* Details Card */}
                  <div className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 rounded-2xl p-6 border border-gray-700/50 mb-6 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-400 text-sm font-medium">Valor do Saque</span>
                      <span className="text-[#00E880] text-xs font-bold uppercase tracking-wide bg-[#00E880]/10 px-2 py-1 rounded-full">PIX</span>
                    </div>
                    <div className="mb-4">
                      <span className="text-white font-black text-2xl">R$ {withdrawalAmount}</span>
                    </div>
                    <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50">
                      <div className="flex items-start gap-3">
                        <CreditCard className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-gray-400 text-xs mb-1">
                            {pixKeyType === 'cpf' ? 'CPF' : pixKeyType === 'email' ? 'E-mail' : pixKeyType === 'phone' ? 'Telefone' : 'Chave Aleatória'}
                          </p>
                          <p className="text-white text-sm font-medium break-all">
                            {pixKey}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-gray-400 text-sm mb-6 text-center leading-relaxed">
                    Confirme os dados do saque
                  </p>
                  
                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <button
                      onClick={handleWithdrawal}
                      disabled={isSubmitting}
                      className="w-full relative group"
                    >
                      <div className="absolute -inset-1 bg-gradient-to-r from-[#00E880] to-[#00D470] rounded-2xl blur-lg opacity-70 group-hover:opacity-100 transition-opacity"></div>
                      <div className="relative bg-gradient-to-r from-[#00E880] to-[#00D470] text-black font-black px-6 py-4 rounded-2xl transition-all duration-300 transform group-hover:scale-[1.02] shadow-lg">
                        <div className="flex items-center justify-center gap-3">
                          <Upload className="w-5 h-5" />
                          <span>{isSubmitting ? "Processando..." : "Confirmar Saque"}</span>
                        </div>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => setShowConfirmModal(false)}
                      disabled={isSubmitting}
                      className="w-full bg-gray-800/50 backdrop-blur-sm text-gray-400 hover:text-white font-semibold px-6 py-4 rounded-2xl transition-all duration-300 border border-gray-700/50 hover:border-gray-600 hover:bg-gray-800/70"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </MobileLayout>
  );
}