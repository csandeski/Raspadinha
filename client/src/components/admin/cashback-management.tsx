import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  DollarSign,
  RefreshCw,
  Calendar,
  Users,
  TrendingUp,
  Wallet,
  CheckCircle,
  Clock,
  AlertCircle,
  CreditCard,
  Activity
} from "lucide-react";
import CountUp from "react-countup";

export default function CashbackManagement() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch pending cashbacks
  const { data: pendingCashbacks, isLoading, refetch } = useQuery<Array<{
    id: number;
    user_id: number;
    user_name: string;
    user_email: string;
    calculation_date: string;
    tier: string;
    cashback_percentage: number;
    total_deposits: string;
    total_withdrawals: string;
    current_balance: string;
    net_loss: string;
    cashback_amount: string;
    status: string;
  }>>({
    queryKey: ["/api/admin/cashback/pending"],
  });

  // Process cashback mutation
  const processCashbackMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/admin/cashback/process", "POST", {});
    },
    onSuccess: (data) => {
      toast({
        title: "Cashback Processado!",
        description: `${data.processed} cashbacks processados. Total: R$ ${data.totalAmount.toFixed(2)}`,
      });
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cashback/pending"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao processar cashback",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
    },
  });

  const handleProcessCashback = () => {
    setIsProcessing(true);
    processCashbackMutation.mutate();
    setTimeout(() => setIsProcessing(false), 2000);
  };

  // Calculate totals
  const totalPending = pendingCashbacks?.length || 0;
  const totalAmount = pendingCashbacks?.reduce((sum, c) => sum + parseFloat(c.cashback_amount), 0) || 0;
  const uniqueUsers = new Set(pendingCashbacks?.map(c => c.user_id)).size;

  // Group by tier
  const tierDistribution = pendingCashbacks?.reduce((acc, c) => {
    acc[c.tier] = (acc[c.tier] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <div className="space-y-6">
      {/* Header da Página */}
      <div className="flex items-center justify-between">
        <div>
          <motion.h2 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-3xl font-bold text-white mb-2 flex items-center gap-3"
          >
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1, delay: 0.5 }}
            >
              <DollarSign className="w-8 h-8 text-[#00E880]" />
            </motion.div>
            Gerenciar Cashback
          </motion.h2>
          <p className="text-zinc-400">Sistema de cashback diário automatizado</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Badges de status no header */}
          <div className="flex gap-2">
            {totalPending > 0 && (
              <Badge variant="outline" className="border-amber-500 text-amber-400 animate-pulse">
                Pendentes: {totalPending}
              </Badge>
            )}
            <Badge variant="outline" className="border-[#00E880] text-[#00E880]">
              Total: R$ {totalAmount.toFixed(2)}
            </Badge>
          </div>
          
          <Button
            onClick={handleProcessCashback}
            disabled={isProcessing || totalPending === 0}
            className="bg-gradient-to-r from-[#00E880] to-[#00C870] text-black hover:opacity-90"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Activity className="w-4 h-4 mr-2" />
                Processar Cashback Diário
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-zinc-400 text-sm mb-1">Cashbacks Pendentes</p>
                  <p className="text-3xl font-bold text-white">
                    <CountUp end={totalPending} duration={1.5} />
                  </p>
                  <p className="text-xs text-amber-400 mt-2">Aguardando processamento</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-amber-500/20 to-amber-600/20 rounded-xl">
                  <Clock className="w-6 h-6 text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-zinc-400 text-sm mb-1">Valor Total</p>
                  <p className="text-3xl font-bold text-[#00E880]">
                    R$ <CountUp end={totalAmount} decimals={2} duration={1.5} />
                  </p>
                  <p className="text-xs text-zinc-500 mt-2">Para distribuir</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-[#00E880]/20 to-[#00E880]/30 rounded-xl">
                  <DollarSign className="w-6 h-6 text-[#00E880]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-zinc-400 text-sm mb-1">Usuários Únicos</p>
                  <p className="text-3xl font-bold text-white">
                    <CountUp end={uniqueUsers} duration={1.5} />
                  </p>
                  <p className="text-xs text-blue-400 mt-2">Recebendo cashback</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl">
                  <Users className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-zinc-400 text-sm mb-1">Média por Usuário</p>
                  <p className="text-3xl font-bold text-white">
                    R$ <CountUp end={uniqueUsers > 0 ? totalAmount / uniqueUsers : 0} decimals={2} duration={1.5} />
                  </p>
                  <p className="text-xs text-purple-400 mt-2">Valor médio</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Tier Distribution */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Distribuição por Nível</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4">
              {['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'].map((tier) => {
                const count = tierDistribution[tier.toLowerCase()] || 0;
                const percentage = totalPending > 0 ? (count / totalPending) * 100 : 0;
                
                return (
                  <div key={tier} className="text-center">
                    <div className={`p-4 rounded-lg bg-gradient-to-br ${
                      tier === 'Bronze' ? 'from-amber-600/20 to-amber-800/20' :
                      tier === 'Silver' ? 'from-gray-400/20 to-gray-600/20' :
                      tier === 'Gold' ? 'from-yellow-400/20 to-yellow-600/20' :
                      tier === 'Platinum' ? 'from-gray-300/20 to-gray-500/20' :
                      'from-cyan-400/20 to-cyan-600/20'
                    }`}>
                      <p className="text-white font-bold text-2xl">{count}</p>
                      <p className="text-gray-400 text-sm mt-1">{tier}</p>
                      <p className="text-[#00E880] text-xs mt-2">{percentage.toFixed(1)}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Pending Cashbacks Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Cashbacks Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
                <p className="text-gray-400">Carregando cashbacks...</p>
              </div>
            ) : pendingCashbacks && pendingCashbacks.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left text-gray-400 p-3">Usuário</th>
                      <th className="text-left text-gray-400 p-3">Nível</th>
                      <th className="text-left text-gray-400 p-3">Depósitos</th>
                      <th className="text-left text-gray-400 p-3">Saques</th>
                      <th className="text-left text-gray-400 p-3">Saldo</th>
                      <th className="text-left text-gray-400 p-3">Perda Líquida</th>
                      <th className="text-left text-gray-400 p-3">%</th>
                      <th className="text-left text-gray-400 p-3">Cashback</th>
                      <th className="text-left text-gray-400 p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingCashbacks.map((cashback) => (
                      <tr key={cashback.id} className="border-b border-gray-800/50 hover:bg-gray-900/50">
                        <td className="p-3">
                          <div>
                            <p className="text-white font-medium">{cashback.user_name}</p>
                            <p className="text-gray-400 text-sm">{cashback.user_email}</p>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge className={`capitalize ${
                            cashback.tier === 'diamond' ? 'bg-cyan-500/20 text-cyan-400' :
                            cashback.tier === 'platinum' ? 'bg-gray-500/20 text-gray-300' :
                            cashback.tier === 'gold' ? 'bg-yellow-500/20 text-yellow-400' :
                            cashback.tier === 'silver' ? 'bg-gray-400/20 text-gray-300' :
                            'bg-amber-600/20 text-amber-400'
                          }`}>
                            {cashback.tier}
                          </Badge>
                        </td>
                        <td className="p-3 text-white">
                          R$ {parseFloat(cashback.total_deposits).toFixed(2)}
                        </td>
                        <td className="p-3 text-white">
                          R$ {parseFloat(cashback.total_withdrawals).toFixed(2)}
                        </td>
                        <td className="p-3 text-white">
                          R$ {parseFloat(cashback.current_balance).toFixed(2)}
                        </td>
                        <td className="p-3 text-red-400">
                          R$ {parseFloat(cashback.net_loss).toFixed(2)}
                        </td>
                        <td className="p-3 text-[#00E880]">
                          {cashback.cashback_percentage}%
                        </td>
                        <td className="p-3 text-[#00E880] font-bold">
                          R$ {parseFloat(cashback.cashback_amount).toFixed(2)}
                        </td>
                        <td className="p-3">
                          <Badge className="bg-yellow-500/20 text-yellow-400">
                            <Clock className="w-3 h-3 mr-1" />
                            Pendente
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <CheckCircle className="w-12 h-12 text-[#00E880] mx-auto mb-4" />
                <p className="text-white text-lg font-semibold">Todos os Cashbacks Processados</p>
                <p className="text-gray-400 mt-2">Não há cashbacks pendentes no momento</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}