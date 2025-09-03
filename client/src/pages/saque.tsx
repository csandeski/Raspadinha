import { useState } from "react";
import { useAuth } from "../lib/auth.tsx";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "../lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MobileLayout } from "@/components/mobile-layout";
import { Upload, CreditCard, Clock, XCircle, RefreshCw } from "lucide-react";

export default function Saque() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Query user balance
  const { data: userWallet } = useQuery<{balance: string, bonusBalance: string, totalWagered: string}>({
    queryKey: ['/api/user/balance'],
    enabled: !!user,
  });

  // Query user transactions to find pending withdrawals
  const { data: transactions } = useQuery<any[]>({
    queryKey: ['/api/user/transactions'],
    enabled: !!user,
  });

  const balance = userWallet?.balance || "0.00";
  const bonusBalance = userWallet?.bonusBalance || "0.00";

  // Filter pending withdrawals
  const pendingWithdrawals = transactions?.filter(
    (t: any) => t.type === 'withdrawal' && t.status === 'pending'
  ) || [];

  if (!user) {
    setLocation("/login");
    return null;
  }

  // Function to format CPF for display
  const formatCPF = (cpf: string) => {
    if (!cpf) return '';
    const numbers = cpf.replace(/\D/g, '');
    if (numbers.length === 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return cpf;
  };

  // Cancel withdrawal mutation
  const cancelWithdrawalMutation = useMutation({
    mutationFn: (withdrawalId: number) => 
      apiRequest(`/api/withdrawals/${withdrawalId}/cancel`, 'POST'),
    onSuccess: () => {
      toast({ description: "Saque cancelado com sucesso" });
      queryClient.invalidateQueries({ queryKey: ['/api/user/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/balance'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao cancelar saque",
        variant: "destructive",
      });
    },
  });

  const handleWithdrawal = async () => {
    if (!user?.cpf) {
      toast({
        title: "Erro",
        description: "CPF não cadastrado. Por favor, atualize seu perfil.",
        variant: "destructive",
      });
      return;
    }

    if (!withdrawalAmount) {
      toast({
        title: "Erro",
        description: "Por favor, insira o valor do saque",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(withdrawalAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Erro",
        description: "Valor inválido",
        variant: "destructive",
      });
      return;
    }

    if (amount < 50) {
      toast({
        title: "Erro",
        description: "Valor mínimo para saque é R$ 50,00",
        variant: "destructive",
      });
      return;
    }

    if (amount > parseFloat(balance)) {
      toast({
        title: "Erro",
        description: "Saldo insuficiente",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiRequest('/api/withdrawals/create', 'POST', {
        amount: amount.toFixed(2),
        pixKey: user.cpf.replace(/\D/g, ''), // Use CPF without formatting
      });

      toast({ description: response.message || "Saque solicitado com sucesso" });

      // Clear form and refresh data
      setWithdrawalAmount("");
      queryClient.invalidateQueries({ queryKey: ['/api/user/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/balance'] });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao processar saque",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MobileLayout>
      <div className="min-h-full bg-gradient-to-b from-[#0E1015] via-[#1a1b23] to-[#0E1015]">
        <div className="max-w-md md:max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8">
          {/* Header */}
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 md:mb-2">Solicitar Saque</h1>
            <p className="text-gray-400 text-sm md:text-base">Retire seus ganhos via PIX</p>
          </div>

          {/* Balance Cards */}
          <div className="space-y-4 mb-6">
            {/* Available Balance */}
            <div className="bg-gradient-to-b from-gray-800/30 to-gray-900/30 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-gray-700/50">
              <p className="text-[#00E880] text-sm md:text-base mb-3">Saldo disponível para saque</p>
              <p className="text-3xl md:text-4xl font-bold text-white">
                R$ {balance}
              </p>
            </div>

            

            {/* Pending Withdrawals */}
            {pendingWithdrawals.length > 0 && (
              <div className="bg-gradient-to-b from-gray-800/30 to-gray-900/30 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-gray-700/50">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-gray-400 text-sm md:text-base">Saques Pendentes</p>
                  <Clock className="w-4 h-4 md:w-5 md:h-5 text-yellow-400" />
                </div>
                <div className="space-y-3">
                  {pendingWithdrawals.map((withdrawal: any) => (
                    <div key={withdrawal.id} className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl p-5 border border-gray-700/30 hover:border-gray-600/50 transition-all duration-300 shadow-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <p className="text-2xl font-bold text-white">R$ {withdrawal.amount}</p>
                          <p className="text-sm text-gray-400 mt-1 flex items-center gap-1">
                            <CreditCard className="w-3 h-3" />
                            CPF: {withdrawal.pixKey}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-400">
                            {withdrawal.createdAt 
                              ? new Date(withdrawal.createdAt).toLocaleDateString('pt-BR')
                              : 'Processando'
                            }
                          </p>
                          <p className="text-xs text-gray-500">
                            {withdrawal.createdAt 
                              ? new Date(withdrawal.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                              : ''
                            }
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-center">
                        <Button
                          onClick={() => cancelWithdrawalMutation.mutate(withdrawal.id)}
                          disabled={cancelWithdrawalMutation.isPending}
                          variant="outline"
                          className="bg-red-500/10 hover:bg-red-500/20 border-red-500/30 hover:border-red-400/50 text-red-400 hover:text-red-300 text-xs px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2"
                        >
                          {cancelWithdrawalMutation.isPending ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span>Cancelando...</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-4 h-4" />
                              <span>Cancelar Saque</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Withdrawal Form */}
          <div className="bg-gradient-to-b from-gray-800/30 to-gray-900/30 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-gray-700/50">
            <div className="space-y-4 md:space-y-6">
              <div>
                <Label htmlFor="amount" className="text-gray-400 text-sm md:text-base mb-2 block">
                  Valor do Saque
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 font-medium">
                    R$
                  </span>
                  <Input
                    id="amount"
                    type="number"
                    inputMode="decimal"
                    pattern="[0-9]*\.?[0-9]*"
                    placeholder="0,00"
                    value={withdrawalAmount}
                    onChange={(e) => setWithdrawalAmount(e.target.value)}
                    className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder-gray-500 focus:ring-[#00E880] focus:border-[#00E880]"
                    step="0.01"
                    min="50"
                    max={balance}
                  />
                </div>
                <p className="text-xs md:text-sm text-gray-500 mt-1">
                  Mínimo: R$ 50,00 | Saldo Total: R$ {balance}
                </p>
              </div>

              <div>
                <Label className="text-gray-400 text-sm md:text-base mb-2 block">
                  Chave PIX do Saque
                </Label>
                <div className="bg-gray-800/50 rounded-xl p-4 md:p-6 border border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 md:w-6 md:h-6 text-[#00E880]" />
                      <div>
                        <p className="text-white font-medium md:text-lg">CPF Registrado</p>
                        <p className="text-gray-400 text-sm md:text-base">
                          {user?.cpf ? formatCPF(user.cpf) : 'CPF não cadastrado'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs md:text-sm text-gray-500 mt-3">
                    ⚠️ O saque será enviado para o CPF cadastrado em sua conta, caso queira trocar ou colocou errado, fale com o suporte!
                  </p>
                </div>
              </div>

              <div className="pt-4">
                <Button
                  onClick={handleWithdrawal}
                  disabled={isSubmitting || !withdrawalAmount || !user?.cpf || parseFloat(balance) === 0}
                  className="w-full bg-gradient-to-r from-[#00E880] to-[#00D470] hover:from-[#00D470] hover:to-[#00C560] text-black font-bold py-4 disabled:opacity-50 flex items-center justify-center space-x-2 rounded-xl"
                >
                  <Upload className="w-5 h-5" />
                  <span>{isSubmitting ? "Processando..." : "Confirmar Saque"}</span>
                </Button>
              </div>

              {/* Withdrawal Info */}
              <div className="mt-6 p-4 md:p-6 bg-gray-800/30 rounded-xl border border-gray-700/30">
                <h3 className="text-sm md:text-base font-semibold text-white mb-2">Informações Importantes</h3>
                <ul className="space-y-1 text-xs md:text-sm text-gray-400">
                  <li>• Saque mínimo de R$ 50,00</li>
                  <li>• O saque será processado em até 24 horas</li>
                  <li>• Saques pendentes podem ser cancelados</li>
                  <li>• Taxa de processamento grátis</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 mb-4 space-y-4">
            {/* History Button */}
            <button
              type="button"
              onClick={() => setLocation("/wallet?tab=saques")}
              className="w-full p-4 bg-gradient-to-b from-gray-800/30 to-gray-900/30 backdrop-blur-sm border border-gray-700/50 hover:border-gray-600 text-white rounded-2xl transition-all duration-300 transform hover:scale-[1.02] hover:bg-gray-800/50 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-green-600/10 to-green-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="flex items-center justify-center gap-3 relative z-10">
                <svg className="w-5 h-5 text-gray-500 group-hover:text-green-400 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <span className="text-sm font-semibold text-gray-300 group-hover:text-white transition-colors duration-300">Histórico de Saques</span>
                <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-all duration-300 transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}