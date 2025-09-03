import { MobileLayout } from "@/components/mobile-layout";
import { motion } from "framer-motion";
import { Users, Gift, Copy, Share2, ArrowLeft, DollarSign, TrendingUp, AlertCircle, UserPlus, CheckCircle, Wallet } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";


interface ReferralStats {
  totalReferrals: number;
  validatedReferrals: number;
  totalEarnings: string;
  availableEarnings: string;
}

interface Referral {
  id: number;
  name: string;
  email: string;
  status: 'pending' | 'validated';
  earnings: string;
  createdAt: string;
}

interface ReferralTransaction {
  id: number;
  type: 'deposit' | 'withdrawal';
  amount: string;
  description: string;
  status: 'available' | 'completed';
  createdAt: string;
}

interface ReferralConfig {
  paymentType: string;
  paymentAmount: string;
  isActive: boolean;
}

export default function ReferralPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [, setLocation] = useLocation();
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  // Removido campos PIX - saque vai direto para wallet

  // Generate referral code from user ID
  const referralCode = user ? `RAS${user.id}` : "";

  // Fetch referral stats
  const { data: stats = { totalReferrals: 0, validatedReferrals: 0, totalEarnings: "0.00", availableEarnings: "0.00" }, isLoading: statsLoading } = useQuery<ReferralStats>({
    queryKey: ['/api/referrals/stats'],
    enabled: !!user,
  });

  // Fetch referral list
  const { data: referrals = [], isLoading: referralsLoading } = useQuery<Referral[]>({
    queryKey: ['/api/referrals/list'],
    enabled: !!user,
  });
  
  // Fetch transaction history
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery<ReferralTransaction[]>({
    queryKey: ['/api/referrals/transactions'],
    enabled: !!user,
  });

  // Fetch referral configuration with refetch on mount
  const { data: configData, refetch: refetchConfig } = useQuery<ReferralConfig>({
    queryKey: ['/api/referral-config'],
    enabled: !!user,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0, // Consider data stale immediately
    gcTime: 0, // Don't cache the data (v5 uses gcTime instead of cacheTime)
  });
  
  // Use default values if data is not loaded yet
  const config: ReferralConfig = configData || { paymentType: 'all_deposits', paymentAmount: '15.00', isActive: true };
  
  // Refetch config on mount to ensure we have latest data
  useEffect(() => {
    if (user) {
      refetchConfig();
    }
  }, [user, refetchConfig]);

  // Withdraw mutation
  const withdrawMutation = useMutation({
    mutationFn: (data: { amount: string }) =>
      apiRequest('/api/referrals/withdraw', 'POST', data),
    onSuccess: async () => {
      toast({
        description: "Valor transferido para sua carteira com sucesso!",
      });
      // Close dialog first
      setIsDialogOpen(false);
      // Clear form
      setWithdrawAmount("");
      // Force refetch queries with delay to ensure backend has completed transaction
      setTimeout(async () => {
        // Invalidate and refetch all related queries
        await queryClient.invalidateQueries({ queryKey: ['/api/referrals/stats'] });
        await queryClient.invalidateQueries({ queryKey: ['/api/user/balance'] });
        await queryClient.invalidateQueries({ queryKey: ['/api/referrals/list'] });
        await queryClient.invalidateQueries({ queryKey: ['/api/referrals/transactions'] });
        
        // Force immediate refetch to ensure fresh data is displayed
        await queryClient.refetchQueries({ queryKey: ['/api/referrals/stats'] });
        await queryClient.refetchQueries({ queryKey: ['/api/user/balance'] });
        await queryClient.refetchQueries({ queryKey: ['/api/referrals/transactions'] });
      }, 1000);
    },
    onError: (error: any) => {
      toast({
        description: error.message || "Erro ao transferir para carteira",
      });
    },
  });

  const handleCopyCode = () => {
    const message = `Cadastre-se na Mania Brasil e ganhe até 250 Mania Bônus! Use meu código de convite: ${referralCode} - Acesse: https://mania-brasil.com/register?ref=${referralCode}`;
    navigator.clipboard.writeText(message);
    setCopied(true);
    toast({ description: "Compartilhe com seus amigos para ganhar recompensas." });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    const message = `Cadastre-se na Mania Brasil e ganhe até 250 Mania Bônus! Use meu código de convite: ${referralCode} - Acesse: https://mania-brasil.com/register?ref=${referralCode}`;
    const title = 'Mania Brasil - Ganhe até 250 Mania Bônus!';
    
    if (navigator.share) {
      navigator.share({
        title: title,
        text: message
      });
    } else {
      handleCopyCode();
    }
  };

  const handleWithdraw = () => {
    // Parse values for secure comparison
    const amountValue = parseFloat(withdrawAmount);
    const availableValue = parseFloat(stats?.availableEarnings || "0");
    
    // Validate minimum amount
    if (!withdrawAmount || amountValue < 50) {
      toast({
        description: "O valor mínimo é R$ 50,00",
      });
      return;
    }

    // Validate maximum amount
    if (amountValue > availableValue) {
      toast({
        description: "Valor maior que o saldo disponível",
      });
      return;
    }

    // Validate decimal places (prevent injection attempts)
    if (!/^\d+(\.\d{0,2})?$/.test(withdrawAmount)) {
      toast({
        description: "Valor inválido. Use apenas números com até 2 casas decimais",
      });
      return;
    }

    // Send the request with properly formatted amount
    withdrawMutation.mutate({
      amount: amountValue.toFixed(2),
    });
  };

  return (
    <MobileLayout>
      <div className="max-w-md md:max-w-3xl mx-auto p-4 md:p-6">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setLocation('/profile')}
              className="p-2 md:p-3 hover:bg-gray-900 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 md:w-6 md:h-6 text-gray-400" />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Indique e Ganhe</h1>
              <p className="text-gray-400 text-sm md:text-base">
                {config.isActive ? (
                  <>Ganhe R$ {config.paymentAmount} {config.paymentType === 'first_deposit' ? 'no primeiro depósito' : 'em cada depósito'} dos seus indicados!</>
                ) : (
                  'Sistema de indicação temporariamente desativado'
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {(stats?.totalReferrals || 0) === 0 ? (
          // Single attractive card when no referrals
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 md:p-8 mb-6 border border-gray-700 relative overflow-hidden"
          >
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-green-600/10 rounded-full blur-2xl"></div>
            
            <div className="relative z-10">
              <div className="text-center">
                <div className="inline-flex p-3 bg-gradient-to-br from-green-500/30 to-green-600/30 rounded-full mb-4">
                  <Gift className="w-8 h-8 md:w-10 md:h-10 text-green-400" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-3">
                  Ganhe <span className="text-green-400">R$ {config.paymentAmount}</span> por Indicação!
                </h3>
                <p className="text-sm md:text-base text-gray-300 mb-4">
                  Comece agora fazer indicações em dinheiro
                </p>
                
                <p className="text-xs md:text-sm text-green-400 font-medium animate-pulse">
                  Compartilhe seu código e comece a ganhar hoje mesmo!
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          // Original two cards when user has referrals
          <div className="grid grid-cols-2 gap-4 md:gap-6 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 md:p-6 border border-gray-700"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 md:p-3 bg-green-500/20 rounded-lg">
                  <UserPlus className="w-5 h-5 md:w-6 md:h-6 text-green-400" />
                </div>
                <span className="text-sm md:text-base text-gray-400">Indicados</span>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-white">{stats?.totalReferrals || 0}</p>
              <p className="text-xs md:text-sm text-green-400">{stats?.validatedReferrals || 0} validados</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 md:p-6 border border-gray-700"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 md:p-3 bg-green-500/20 rounded-lg">
                  <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-green-400" />
                </div>
                <span className="text-sm md:text-base text-gray-400">Ganhos Totais</span>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-white">R$ {stats?.totalEarnings || "0.00"}</p>
              <p className="text-xs md:text-sm text-green-400">R$ {stats?.availableEarnings || "0.00"} disponível</p>
            </motion.div>
          </div>
        )}

        {/* Referral Code Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-green-900/20 to-green-800/20 rounded-xl p-6 md:p-8 mb-6 border border-green-700/50"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Gift className="w-8 h-8 md:w-10 md:h-10 text-green-400" />
              <h2 className="text-xl md:text-2xl font-bold text-white">Seu Código de Convite</h2>
            </div>
          </div>
          
          <div className="bg-gray-900/50 rounded-lg p-4 md:p-6 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-3xl md:text-4xl font-bold text-white tracking-wider">{referralCode}</span>
              <button
                onClick={handleCopyCode}
                className="p-2 md:p-3 hover:bg-gray-700/50 rounded-lg transition-colors"
              >
                <Copy className={`w-5 h-5 md:w-6 md:h-6 ${copied ? 'text-green-400' : 'text-gray-400'}`} />
              </button>
            </div>
          </div>

          <button
            onClick={handleShare}
            className="w-full py-3 md:py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-bold rounded-lg flex items-center justify-center space-x-2 transition-all duration-300 transform hover:scale-105"
          >
            <Share2 className="w-5 h-5 md:w-6 md:h-6" />
            <span className="md:text-lg">Compartilhar Código</span>
          </button>
        </motion.div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 md:p-8 mb-6 border border-gray-700"
        >
          <h3 className="text-lg md:text-xl font-bold text-white mb-4 text-left">Como funciona?</h3>
          
          <div className="space-y-4 md:space-y-6">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm md:text-base">1</span>
              </div>
              <div>
                <p className="text-white font-medium md:text-lg">Compartilhe seu código</p>
                <p className="text-gray-400 text-sm md:text-base">Envie seu código único para amigos</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm md:text-base">2</span>
              </div>
              <div>
                <p className="text-white font-medium md:text-lg">Amigo se cadastra</p>
                <p className="text-gray-400 text-sm md:text-base">Seu amigo usa o código no cadastro</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm md:text-base">3</span>
              </div>
              <div>
                <p className="text-white font-medium md:text-lg">Amigo deposita e ganha o BÔNUS </p>
                <p className="text-gray-400 text-sm md:text-base">Ele recebe bônus no 1º depósito!</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm md:text-base">4</span>
              </div>
              <div>
                <p className="text-white font-medium md:text-lg">Você ganha R$ {config.paymentAmount}!</p>
                <p className="text-gray-400 text-sm md:text-base">
                  {config.paymentType === 'first_deposit' 
                    ? `Receba R$ ${config.paymentAmount} quando ele fizer o primeiro depósito!`
                    : `Receba R$ ${config.paymentAmount} em cada depósito que ele fizer!`
                  }
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Withdrawal Section with Transaction History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-green-900/20 to-green-800/20 rounded-xl p-6 md:p-8 mb-6 border border-green-700/50"
        >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg md:text-xl font-bold text-white">Saldo Disponível</h3>
                <p className="text-3xl md:text-4xl font-bold text-green-400">R$ {stats?.availableEarnings || "0.00"}</p>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-green-600 hover:bg-green-700 text-white"
                    disabled={parseFloat(stats?.availableEarnings || "0") < 50}
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    Sacar
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-900 text-white border-gray-700">
                  <DialogHeader>
                    <DialogTitle>Transferir para Carteira</DialogTitle>
                    <DialogDescription className="text-gray-400">
                      Saldo disponível: R$ {stats?.availableEarnings || "0.00"} | Mínimo: R$ 50,00
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label htmlFor="amount">Valor para transferir</Label>
                      <Input
                        id="amount"
                        type="number"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder="0.00"
                        min="50"
                        max={stats?.availableEarnings || "0"}
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                      <p className="text-sm text-gray-400">
                        O valor será transferido para seu saldo principal e ficará disponível para jogar ou sacar via PIX.
                      </p>
                    </div>
                    <Button
                      onClick={handleWithdraw}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      disabled={withdrawMutation.isPending}
                    >
                      {withdrawMutation.isPending ? "Processando..." : "Transferir para Carteira"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {parseFloat(stats?.availableEarnings || "0") < 50 && (
              <p className="text-sm md:text-base text-gray-400 mb-4">
                <AlertCircle className="w-4 h-4 md:w-5 md:h-5 inline mr-1" />
                Valor mínimo para saque: R$ 50,00
              </p>
            )}
            
            {/* Transaction History Inside */}
            <div className="border-t border-green-700/30 pt-4 mt-4">
              <h4 className="text-sm md:text-base font-semibold text-gray-300 mb-3">Histórico de Transações</h4>
              
              {transactionsLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-400 mx-auto"></div>
                </div>
              ) : transactions && transactions.length > 0 ? (
                <div className="space-y-2 md:space-y-3 max-h-60 md:max-h-80 overflow-y-auto">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="bg-gray-800/30 rounded-lg p-3 md:p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 md:gap-3">
                          <div className={`p-1.5 md:p-2 rounded ${
                            transaction.type === 'deposit' 
                              ? 'bg-green-500/20' 
                              : 'bg-red-500/20'
                          }`}>
                            {transaction.type === 'deposit' ? (
                              <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-green-400" />
                            ) : (
                              <Wallet className="w-4 h-4 md:w-5 md:h-5 text-red-400" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm md:text-base font-medium text-white">{transaction.description}</p>
                            <p className="text-xs md:text-sm text-gray-400">
                              {new Date(transaction.createdAt).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm md:text-base font-bold ${
                            transaction.type === 'deposit' 
                              ? 'text-green-400' 
                              : 'text-red-400'
                          }`}>
                            {transaction.type === 'deposit' ? '+' : '-'} R$ {transaction.amount}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <TrendingUp className="w-8 h-8 md:w-10 md:h-10 text-gray-600 mx-auto mb-2" />
                  <p className="text-sm md:text-base text-gray-400">Nenhuma transação ainda</p>
                </div>
              )}
            </div>
          </motion.div>


        {/* Referral List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 md:p-8 border border-gray-700"
        >
          <h3 className="text-lg md:text-xl font-bold text-white mb-4">Seus Indicados</h3>
          
          {referralsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 md:h-10 md:w-10 border-b-2 border-green-400 mx-auto"></div>
            </div>
          ) : referrals && referrals.length > 0 ? (
            <div className="space-y-3 md:space-y-4">
              {referrals.map((referral: any) => (
                <div key={referral.id} className="bg-gray-800/50 rounded-lg p-4 md:p-6 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white md:text-lg">{referral.name || "Usuário"}</p>
                    <p className="text-sm md:text-base text-gray-400">
                      {new Date(referral.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 md:px-3 md:py-1 rounded-full text-xs md:text-sm font-medium ${
                      referral.status === 'validated' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {referral.status === 'validated' ? (
                        <>
                          <CheckCircle className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                          Validado
                        </>
                      ) : (
                        'Pendente'
                      )}
                    </span>
                    {referral.status === 'pending' && (
                      <p className="text-xs md:text-sm text-gray-400 mt-1">
                        Aguardando depósito
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <UserPlus className="w-12 h-12 md:w-16 md:h-16 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 md:text-lg">Você ainda não tem indicados</p>
              <p className="text-sm md:text-base text-gray-500 mt-1">
                Compartilhe seu código para começar a ganhar!
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </MobileLayout>
  );
}