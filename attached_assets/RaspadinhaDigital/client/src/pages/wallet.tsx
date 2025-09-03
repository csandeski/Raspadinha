import { useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../lib/auth.tsx";
import { useQuery } from "@tanstack/react-query";
import { MobileLayout } from "@/components/mobile-layout";
import { Wallet as WalletIcon, Download, Upload, Clock, CheckCircle, XCircle, RefreshCw, ArrowLeft, CreditCard, Mail, Phone, Key, ArrowDownCircle, ArrowUpCircle, Calendar, Eye, Copy, FileDown } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { formatMoney } from "@/lib/utils";
import { generateWithdrawalReceipt } from "@/lib/withdrawal-receipt";

export default function Wallet() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("depositos");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [balanceAnimating, setBalanceAnimating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [dateFilter, setDateFilter] = useState("");
  const [dateFilterType, setDateFilterType] = useState("all"); // "today", "week", "month", or "all"
  const [copiedId, setCopiedId] = useState(false);
  const { toast } = useToast();
  const transactionHistoryRef = useRef<HTMLDivElement>(null);

  // Check URL params on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab === 'saques' || tab === 'depositos') {
      setActiveTab(tab);
      // Scroll to transaction history after a short delay to ensure content is rendered
      setTimeout(() => {
        transactionHistoryRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 100);
    }
  }, []);

  // Query user balance
  const { data: userWallet } = useQuery({
    queryKey: ['/api/user/balance'],
    enabled: !!user,
  });

  // Query transactions
  const { data: transactions } = useQuery({
    queryKey: ['/api/user/transactions'],
    enabled: !!user,
  });

  // Function to get PIX key type icon
  const getPixKeyIcon = (keyType: string) => {
    switch (keyType) {
      case 'cpf':
        return <CreditCard className="w-3 h-3" />;
      case 'email':
        return <Mail className="w-3 h-3" />;
      case 'phone':
        return <Phone className="w-3 h-3" />;
      case 'random':
        return <Key className="w-3 h-3" />;
      default:
        return null;
    }
  };

  // Function to format PIX key for display
  const formatPixKey = (key: string, type: string) => {
    if (!key) return '';
    
    // Truncate long keys
    if (key.length > 20) {
      return `${key.substring(0, 17)}...`;
    }
    return key;
  };



  const balance = userWallet?.balance || "0.00";
  const scratchBonus = userWallet?.scratchBonus || 0;

  // Filter transactions based on active tab and date
  const filteredTransactions = transactions?.filter((t: any) => {
    // Filter by type
    const matchesType = activeTab === "depositos" ? t.type === "deposit" : t.type === "withdrawal";
    
    // If "all" is selected or no filter, show all transactions of the type
    if (dateFilterType === "all" || !dateFilter) {
      return matchesType;
    }
    
    // Filter by date if set
    if (dateFilter && t.createdAt) {
      const transactionDate = new Date(t.createdAt);
      const filterDate = new Date(dateFilter);
      
      // Apply different logic based on filter type
      switch (dateFilterType) {
        case "today":
          // Same day only - compare using date strings
          const today = new Date();
          const transactionDateStr = transactionDate.toISOString().split('T')[0];
          const todayStr = today.toISOString().split('T')[0];
          return matchesType && transactionDateStr === todayStr;
        case "month":
          // From filter date to today
          const now = new Date();
          now.setHours(23, 59, 59, 999);
          filterDate.setHours(0, 0, 0, 0);
          return matchesType && transactionDate >= filterDate && transactionDate <= now;
        default:
          return matchesType;
      }
    }
    
    return matchesType;
  }) || [];



  const handleCancelWithdrawal = async (withdrawalId: number) => {
    try {
      const response = await apiRequest(`/api/withdrawals/${withdrawalId}/cancel`, 'POST');

      toast({ description: "Response.message || Saque cancelado com sucesso" });

      // Refresh data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/user/balance'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/user/transactions'] }),
      ]);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao cancelar saque",
        variant: "destructive",
      });
    }
  };

  return (
    <MobileLayout>
      <div className="min-h-full bg-gradient-to-b from-[#0E1015] via-[#1a1b23] to-[#0E1015]">
        <div className="max-w-md md:max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8">
          {/* Header */}
          <div className="mb-8 relative">
            <div className="text-center">
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 md:mb-2">Carteira</h1>
              <p className="text-gray-400 text-sm md:text-base">Gerencie seus fundos</p>
            </div>
            <button
              onClick={async () => {
                setIsRefreshing(true);
                setBalanceAnimating(true);
                
                // Query pending PIX first to get transaction ID
                const pendingPix = await apiRequest('/api/payments/pending-pix', 'GET');
                if (pendingPix?.hasPending && pendingPix?.pixData?.transactionId) {
                  await apiRequest('/api/payments/verify-pix', 'POST', {
                    transactionId: pendingPix.pixData.transactionId
                  });
                }
                // Refresh balance and transactions
                await Promise.all([
                  queryClient.invalidateQueries({ queryKey: ['/api/user/balance'] }),
                  queryClient.invalidateQueries({ queryKey: ['/api/user/transactions'] }),
                  queryClient.invalidateQueries({ queryKey: ['/api/payments/pending-pix'] })
                ]);
                
                setTimeout(() => {
                  setIsRefreshing(false);
                  setBalanceAnimating(false);
                }, 1000);
              }}
              disabled={isRefreshing}
              className="absolute right-0 top-0 p-2 md:p-3 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 transition-colors group"
            >
              <RefreshCw className={`w-5 h-5 md:w-6 md:h-6 text-gray-400 group-hover:text-white transition-colors ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Balance Cards */}
          <div className="space-y-4 mb-8">
            {/* Available Balance */}
            <div className="bg-gradient-to-b from-gray-800/30 to-gray-900/30 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-gray-700/50">
              <p className="text-gray-400 text-sm md:text-base mb-3">Saldo Disponível</p>
              <p className={`text-3xl md:text-4xl font-bold text-[#00E880] ${balanceAnimating ? 'animate-number-update' : ''}`}>
                R$ {formatMoney(balance)}
              </p>
            </div>

            {/* Scratch Bonus */}
            <div className="bg-gradient-to-b from-purple-900/20 to-purple-800/20 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-purple-700/50">
              <p className="text-gray-400 text-sm md:text-base mb-3">Raspadinhas Bônus</p>
              <p className={`text-3xl md:text-4xl font-bold text-purple-400 ${balanceAnimating ? 'animate-number-update' : ''}`}>
                {scratchBonus}
              </p>
              <p className="text-xs md:text-sm text-gray-500 mt-2">Pode ser usado em raspadinhas grátis</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6 md:mb-8">
            {/* Deposit Button */}
            <button
              onClick={() => setLocation("/deposit")}
              className="bg-gradient-to-r from-[#00E880] to-[#00D470] hover:from-[#00D470] hover:to-[#00C560] text-black font-semibold py-3 md:py-4 px-4 md:px-6 rounded-xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
            >
              <Download className="w-5 h-5 md:w-6 md:h-6" />
              <span className="text-sm md:text-base">Depositar</span>
            </button>

            {/* Withdrawal Button */}
            <button
              onClick={() => setLocation("/saque")}
              disabled={parseFloat(balance) <= 0}
              className={`${
                parseFloat(balance) > 0 
                  ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white hover:scale-105 shadow-lg hover:shadow-xl' 
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              } font-semibold py-3 md:py-4 px-4 md:px-6 rounded-xl transition-all duration-300 transform flex items-center justify-center gap-2`}
            >
              <Upload className="w-5 h-5 md:w-6 md:h-6" />
              <span className="text-sm md:text-base">Sacar</span>
            </button>
          </div>

          {/* Withdrawal form removed - use /withdraw route */}
          {/* Transaction History */}
          <div ref={transactionHistoryRef} className="bg-gradient-to-b from-gray-800/30 to-gray-900/30 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-gray-700/50">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl md:text-2xl font-bold text-white">Histórico de Transações</h2>
            </div>

            {/* Date Filter */}
            <div className="mb-6">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const today = new Date();
                    setDateFilter(today.toISOString().split('T')[0]);
                    setDateFilterType("today");
                  }}
                  className={`flex-1 px-2 md:px-4 py-2 md:py-3 rounded-xl text-xs md:text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                    dateFilterType === "today"
                      ? 'bg-[#00E880] text-black shadow-lg'
                      : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50 border border-gray-700'
                  }`}
                >
                  Hoje
                </button>

                <button
                  onClick={() => {
                    const date = new Date();
                    date.setMonth(date.getMonth() - 1);
                    setDateFilter(date.toISOString().split('T')[0]);
                    setDateFilterType("month");
                  }}
                  className={`flex-1 px-2 md:px-4 py-2 md:py-3 rounded-xl text-xs md:text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                    dateFilterType === "month"
                      ? 'bg-[#00E880] text-black shadow-lg'
                      : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50 border border-gray-700'
                  }`}
                >
                  Este mês
                </button>
                <button
                  onClick={() => {
                    setDateFilter("");
                    setDateFilterType("all");
                  }}
                  className={`flex-1 px-2 md:px-4 py-2 md:py-3 rounded-xl text-xs md:text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                    dateFilterType === "all" || !dateFilterType
                      ? 'bg-[#00E880] text-black shadow-lg'
                      : 'bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50 border border-gray-700'
                  }`}
                >
                  Todos
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-2 mb-6 bg-gray-800/50 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab("depositos")}
                className={`flex-1 px-4 md:px-6 py-2 md:py-3 rounded-lg text-sm md:text-base font-medium transition-all duration-300 ${
                  activeTab === "depositos" 
                    ? "bg-[#00E880] text-black shadow-lg" 
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Depósitos
              </button>
              <button
                onClick={() => setActiveTab("saques")}
                className={`flex-1 px-4 md:px-6 py-2 md:py-3 rounded-lg text-sm md:text-base font-medium transition-all duration-300 ${
                  activeTab === "saques" 
                    ? "bg-[#00E880] text-black shadow-lg" 
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Saques
              </button>
            </div>

            {/* Transaction List */}
            <div className="space-y-3 md:space-y-4 h-[28rem] md:h-[32rem] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800/50">
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-base md:text-lg">Nenhuma transação encontrada</p>
                </div>
              ) : (
                filteredTransactions.map((transaction: any) => (
                  <div key={transaction.id} className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl p-5 md:p-6 border border-gray-700/30 hover:border-gray-600/50 transition-all duration-300 shadow-lg">
                    <div className="mb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3 md:space-x-4">
                          <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center ${
                            (transaction.type === 'deposit' && transaction.status !== 'cancelled') || 
                            (transaction.type === 'withdrawal' && (transaction.status === 'completed' || transaction.status === 'approved'))
                              ? 'bg-gradient-to-br from-green-500/20 to-green-600/20'
                              : transaction.status === 'cancelled'
                              ? 'bg-gradient-to-br from-gray-500/20 to-gray-600/20'
                              : 'bg-gradient-to-br from-red-500/20 to-red-600/20'
                          }`}>
                            {transaction.type === 'deposit' && transaction.status !== 'cancelled' ? (
                              <Download className="w-6 h-6 md:w-7 md:h-7 text-green-400" />
                            ) : transaction.status === 'cancelled' ? (
                              <XCircle className="w-6 h-6 md:w-7 md:h-7 text-gray-400" />
                            ) : transaction.type === 'withdrawal' && (transaction.status === 'completed' || transaction.status === 'approved') ? (
                              <CheckCircle className="w-6 h-6 md:w-7 md:h-7 text-green-400" />
                            ) : (
                              <Upload className="w-6 h-6 md:w-7 md:h-7 text-red-400" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div>
                              <p className="font-semibold text-white text-base md:text-lg">
                                {transaction.type === 'deposit' ? 'Depósito' : 'Saque'}
                              </p>
                              {transaction.displayId && (
                                <p className="text-gray-400 text-sm md:text-base">#{transaction.displayId}</p>
                              )}
                            </div>
                            {transaction.pixKey && transaction.type === 'deposit' && (
                              <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                                {getPixKeyIcon(transaction.pixKeyType)}
                                <span className="font-medium">
                                  {formatPixKey(transaction.pixKey, transaction.pixKeyType)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs md:text-sm text-gray-400">
                            {transaction.createdAt 
                              ? new Date(transaction.createdAt).toLocaleDateString('pt-BR')
                              : 'Data indisponível'
                            }
                          </p>
                          <p className="text-xs md:text-sm text-gray-500">
                            {transaction.createdAt
                              ? new Date(transaction.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                              : ''
                            }
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <p className={`text-2xl md:text-3xl font-bold ${
                          transaction.status === 'cancelled' ? 'text-gray-400' :
                          (transaction.type === 'deposit' || (transaction.type === 'withdrawal' && (transaction.status === 'completed' || transaction.status === 'approved'))) 
                            ? 'text-green-400' 
                            : 'text-red-400'
                        }`}>
                          R$ {formatMoney(transaction.amount)}
                        </p>
                        <p className={`text-xs md:text-sm font-medium px-3 py-1 md:px-4 md:py-2 rounded-full ${
                          transaction.status === 'completed' || transaction.status === 'approved'
                            ? 'bg-green-500/20 text-green-400' 
                            : transaction.status === 'pending' 
                            ? 'bg-yellow-500/20 text-yellow-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {transaction.status === 'completed' || transaction.status === 'approved' ? 'Concluído' : 
                           transaction.status === 'pending' ? 'Aguardando' : 'Cancelado'}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-center gap-2 md:gap-3">
                      <Button
                        onClick={() => {
                          setSelectedTransaction(transaction);
                          setShowDetails(true);
                        }}
                        variant="outline"
                        className="bg-gray-700/20 hover:bg-gray-700/30 border-gray-600 hover:border-gray-500 text-gray-300 hover:text-white text-xs md:text-sm px-4 md:px-5 py-2 md:py-2.5 rounded-lg transition-all duration-200 flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4 md:w-5 md:h-5" />
                        <span>Detalhes</span>
                      </Button>
                      {transaction.type === 'withdrawal' && (transaction.status === 'approved' || transaction.status === 'completed') && (
                        <Button
                          onClick={() => {
                            const receiptData = {
                              id: transaction.displayId || transaction.id.toString(),
                              amount: transaction.amount,
                              pixKey: transaction.pixKey || '',
                              pixKeyType: transaction.pixKeyType === 'cpf' ? 'CPF' :
                                         transaction.pixKeyType === 'cnpj' ? 'CNPJ' :
                                         transaction.pixKeyType === 'phone' ? 'Telefone' :
                                         transaction.pixKeyType === 'email' ? 'E-mail' :
                                         transaction.pixKeyType === 'random' ? 'Aleatória' : 'Chave PIX',
                              status: 'Pago',
                              requestedAt: transaction.requestedAt || transaction.createdAt,
                              processedAt: transaction.processedAt || transaction.createdAt,
                              endToEndId: transaction.endToEndId || '',
                              type: 'player' as 'player'
                            };
                            generateWithdrawalReceipt(receiptData);
                            toast({
                              title: "Comprovante gerado!",
                              description: "O PDF do comprovante foi baixado com sucesso.",
                              duration: 3000
                            });
                          }}
                          variant="outline"
                          className="bg-green-500/10 hover:bg-green-500/20 border-green-500/30 hover:border-green-400/50 text-green-400 hover:text-green-300 text-xs md:text-sm px-4 md:px-5 py-2 md:py-2.5 rounded-lg transition-all duration-200 flex items-center gap-2"
                        >
                          <FileDown className="w-4 h-4 md:w-5 md:h-5" />
                          <span>Comprovante</span>
                        </Button>
                      )}
                      {transaction.type === 'withdrawal' && transaction.status === 'pending' && (
                        <Button
                          onClick={() => handleCancelWithdrawal(transaction.id)}
                          variant="outline"
                          className="bg-red-500/10 hover:bg-red-500/20 border-red-500/30 hover:border-red-400/50 text-red-400 hover:text-red-300 text-xs md:text-sm px-4 md:px-5 py-2 md:py-2.5 rounded-lg transition-all duration-200 flex items-center gap-2"
                        >
                          <XCircle className="w-4 h-4 md:w-5 md:h-5" />
                          <span>Cancelar</span>
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Transaction Details Modal */}
      {showDetails && selectedTransaction && (
        <div className="fixed inset-0 bg-black/80 z-50 overflow-y-auto pt-24 pb-20 px-4" onClick={() => {
          setShowDetails(false);
          setCopiedId(false);
        }}>
          <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl p-6 max-w-md w-full mx-auto shadow-2xl border border-gray-700" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Detalhes da Transação</h3>
              <button
                onClick={() => {
                  setShowDetails(false);
                  setCopiedId(false);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-gray-800/50 rounded-xl p-4">
                <p className="text-sm text-gray-400 mb-1">Tipo de Transação</p>
                <div className="flex items-center justify-between">
                  <p className="text-white font-medium">
                    {selectedTransaction.type === 'deposit' ? 'Depósito PIX' : 'Saque PIX'}
                    {selectedTransaction.displayId && (
                      <span className="text-gray-400 font-normal"> #{selectedTransaction.displayId}</span>
                    )}
                  </p>
                  {selectedTransaction.displayId && (
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(selectedTransaction.displayId.toString());
                          setCopiedId(true);
                          setTimeout(() => setCopiedId(false), 2000);
                          toast({ description: "ID #${selectedTransaction.displayId} copiado para a área de transferência" });
                        } catch (error) {
                          toast({
                            title: "Erro ao copiar",
                            description: "Não foi possível copiar o ID",
                            variant: "destructive",
                          });
                        }
                      }}
                      className="p-2 hover:bg-gray-700/50 rounded-lg transition-all duration-200 group"
                    >
                      {copiedId ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-400 group-hover:text-white" />
                      )}
                    </button>
                  )}
                </div>
              </div>
              
              <div className="bg-gray-800/50 rounded-xl p-4">
                <p className="text-sm text-gray-400 mb-1">Valor</p>
                <p className={`text-2xl font-bold ${
                  selectedTransaction.status === 'cancelled' ? 'text-gray-400' :
                  (selectedTransaction.type === 'deposit' || (selectedTransaction.type === 'withdrawal' && (selectedTransaction.status === 'completed' || selectedTransaction.status === 'approved')))
                    ? 'text-green-400' 
                    : 'text-red-400'
                }`}>
                  R$ {formatMoney(selectedTransaction.amount)}
                </p>
              </div>
              
              <div className="bg-gray-800/50 rounded-xl p-4">
                <p className="text-sm text-gray-400 mb-1">Status</p>
                <p className={`font-medium ${
                  selectedTransaction.status === 'completed' || selectedTransaction.status === 'approved'
                    ? 'text-green-400' 
                    : selectedTransaction.status === 'pending' 
                    ? 'text-yellow-400' 
                    : 'text-red-400'
                }`}>
                  {selectedTransaction.status === 'completed' || selectedTransaction.status === 'approved' ? 'Concluído' : 
                   selectedTransaction.status === 'pending' ? 'Aguardando Processamento' : 'Cancelado'}
                </p>
              </div>
              
              <div className="bg-gray-800/50 rounded-xl p-4">
                <p className="text-sm text-gray-400 mb-1">Data e Hora</p>
                <p className="text-white">
                  {selectedTransaction.createdAt 
                    ? `${new Date(selectedTransaction.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })} às ${new Date(selectedTransaction.createdAt).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}`
                    : 'Data indisponível'
                  }
                </p>
              </div>
              
              
              
              {selectedTransaction.pixKey && (
                <div className="bg-gray-800/50 rounded-xl p-4">
                  <p className="text-sm text-gray-400 mb-1">Chave PIX</p>
                  <div className="flex items-center gap-2">
                    {getPixKeyIcon(selectedTransaction.pixKeyType)}
                    <p className="text-white">{selectedTransaction.pixKey}</p>
                  </div>
                </div>
              )}
              
              
            </div>
            
            <div className="mt-6">
              <Button
                onClick={() => setShowDetails(false)}
                className="w-full bg-gradient-to-r from-[#00E880] to-[#00D470] hover:from-[#00D470] hover:to-[#00C560] text-black font-bold py-3 rounded-xl"
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </MobileLayout>
  );
}