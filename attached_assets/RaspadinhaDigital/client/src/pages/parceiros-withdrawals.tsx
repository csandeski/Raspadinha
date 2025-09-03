import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PartnerLayout } from "@/components/partner/partner-layout";
import { useToast } from "@/hooks/use-toast";
import { Wallet, DollarSign, Clock, CheckCircle, AlertCircle, ArrowDownLeft, ArrowUpRight, TrendingUp, Info, Edit2, History, ArrowRight, CheckCircle2, Send, Key, XCircle, Copy, FileDown } from "lucide-react";
import { generateWithdrawalReceipt } from "@/lib/withdrawal-receipt";
// CountUp removed - using static values instead
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBRL } from "@/lib/format";
import { formatZeroValue, formatStatValue } from "@/lib/format-zero-values";
import { useLocation } from "wouter";

export default function ParceirosWithdrawals() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [pixKeyType, setPixKeyType] = useState("cpf");
  const [document, setDocument] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const [animateToHistory, setAnimateToHistory] = useState(false);
  
  const minWithdraw = 20.00;
  const maxWithdraw = 1000.00;
  const withdrawFee = 3.00;
  
  // Fetch wallet data with real-time updates
  const { data: earningsData, isLoading } = useQuery({
    queryKey: ["/api/partner/earnings"],
    refetchInterval: 5000, // Real-time updates every 5 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    staleTime: 0,
    retry: 3
  });
  
  // Removed duplicate fetch - will use from layout
  
  // Fetch withdrawal history with real-time updates
  const { data: withdrawals = [], isLoading: withdrawalsLoading } = useQuery({
    queryKey: ["/api/partner/withdrawals"],
    refetchInterval: 5000, // Real-time updates every 5 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    staleTime: 0,
    retry: 3
  });
  
  // Fetch saved PIX settings with real-time updates
  const { data: settingsData } = useQuery({
    queryKey: ['/api/partner/settings'],
    queryFn: async () => {
      const token = localStorage.getItem('partnerToken');
      const response = await fetch('/api/partner/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch settings');
      return response.json();
    },
    refetchInterval: 5000, // Real-time updates every 5 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    staleTime: 0,
    retry: 3
  });
  
  // Load saved PIX key when settings are fetched
  useEffect(() => {
    if (settingsData) {
      if (settingsData.pixKey) {
        setPixKey(settingsData.pixKey);
        setPixKeyType(settingsData.pixKeyType || 'cpf');
      }
    }
  }, [settingsData]);
  
  // Safely access wallet data with proper fallbacks
  const availableBalance = earningsData ? (earningsData as any)?.wallet?.balance || 0 : 0;
  const pendingBalance = earningsData ? (earningsData as any)?.pendingEarnings || 0 : 0;
  const totalWithdrawn = earningsData ? (earningsData as any)?.wallet?.totalWithdrawn || 0 : 0;
  
  // Calculate pending withdrawals
  const pendingWithdrawals = (withdrawals as any[])
    .filter((w: any) => w.status === 'pending' || w.status === 'processing')
    .reduce((sum: number, w: any) => sum + parseFloat(w.amount), 0);
  
  // Calculate real total withdrawn (after fees)
  const realTotalWithdrawn = (withdrawals as any[])
    .filter((w: any) => w.status === 'completed')
    .reduce((sum: number, w: any) => sum + (parseFloat(w.amount) - withdrawFee), 0);
  
  // Calculate the amount user will receive after fee
  const calculateNetAmount = (grossAmount: number) => {
    return Math.max(0, grossAmount - withdrawFee);
  };
  
  // Create withdrawal mutation
  const withdrawMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/partner/withdrawals", "POST", data);
    },
    onSuccess: (response, variables) => {
      // Set success data for the modal
      // Use response data which has the correct values
      setSuccessData({
        amount: response.withdrawal.grossAmount || variables.amount,
        netAmount: response.withdrawal.netAmount || variables.netAmount,
        fee: response.withdrawal.fee || variables.fee,
        pixKey: variables.document,
        pixKeyType: variables.pixKeyType
      });
      setShowSuccessModal(true);
      
      // Animate to history after a delay
      setTimeout(() => {
        setAnimateToHistory(true);
      }, 800);
      
      // Close modal and reset after animation
      setTimeout(() => {
        setShowSuccessModal(false);
        setAnimateToHistory(false);
        setWithdrawAmount("");
        // Don't clear pixKey here - let user decide
        setDocument("");
        queryClient.invalidateQueries({ queryKey: ["/api/partner/earnings"] });
        queryClient.invalidateQueries({ queryKey: ["/api/partner/withdrawals"] });
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao solicitar saque",
        description: error.message || "Ocorreu um erro ao processar sua solicitação",
        variant: "destructive"
      });
    }
  });

  const handleWithdraw = () => {
    const amount = parseFloat(withdrawAmount);
    
    if (!amount || amount < minWithdraw) {
      toast({
        title: "Valor inválido",
        description: `O valor mínimo para saque é ${formatBRL(minWithdraw)}`,
        variant: "destructive"
      });
      return;
    }
    
    if (amount > maxWithdraw) {
      toast({
        title: "Valor excede o limite",
        description: `O valor máximo por saque é ${formatBRL(maxWithdraw)}`,
        variant: "destructive"
      });
      return;
    }
    
    if (amount > availableBalance) {
      toast({
        title: "Saldo insuficiente",
        description: `Você possui apenas ${formatBRL(availableBalance)} disponível para saque`,
        variant: "destructive"
      });
      return;
    }

    if (!pixKey) {
      toast({
        title: "Documento necessário",
        description: pixKeyType === 'cpf' ? "Por favor, informe seu CPF" : "Por favor, informe seu CNPJ",
        variant: "destructive"
      });
      return;
    }
    
    // Validate CPF/CNPJ format
    const cleanDoc = pixKey.replace(/\D/g, '');
    if (pixKeyType === 'cpf' && cleanDoc.length !== 11) {
      toast({
        title: "CPF inválido",
        description: "O CPF deve conter 11 dígitos",
        variant: "destructive"
      });
      return;
    }
    
    if (pixKeyType === 'cnpj' && cleanDoc.length !== 14) {
      toast({
        title: "CNPJ inválido",
        description: "O CNPJ deve conter 14 dígitos",
        variant: "destructive"
      });
      return;
    }

    const netAmount = calculateNetAmount(amount);
    
    withdrawMutation.mutate({
      amount: amount.toFixed(2),
      netAmount: netAmount.toFixed(2),
      fee: withdrawFee.toFixed(2),
      pixKey: cleanDoc,
      pixKeyType,
      document: pixKey // Send formatted version for display
    });
  };
  
  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .slice(0, 11)
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };
  
  const formatCNPJ = (value: string) => {
    return value
      .replace(/\D/g, '')
      .slice(0, 14)
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };
  
  const formatDocument = (value: string, type: string) => {
    if (type === 'cpf') return formatCPF(value);
    if (type === 'cnpj') return formatCNPJ(value);
    return value;
  };

  return (
    <PartnerLayout activeSection="withdrawals">
      <div className="space-y-6">
        {/* Animated Background Elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-[#00E880]/10 to-transparent rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-600/10 to-transparent rounded-full blur-3xl animate-pulse delay-700" />
        </div>

        {/* Success Modal */}
        <AnimatePresence>
          {showSuccessModal && successData && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
                animate={{ 
                  scale: animateToHistory ? 0.3 : 1, 
                  opacity: animateToHistory ? 0 : 1,
                  rotate: 0,
                  x: animateToHistory ? 400 : 0,
                  y: animateToHistory ? 200 : 0
                }}
                transition={{ 
                  type: "spring", 
                  damping: 15, 
                  stiffness: 100,
                  duration: animateToHistory ? 1.5 : 0.8
                }}
                className="relative max-w-md w-full"
              >


                {/* Main card */}
                <div className="relative bg-gradient-to-br from-gray-900 to-gray-950 rounded-3xl border border-[#00E880]/30 shadow-2xl overflow-hidden">
                  {/* Animated gradient background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#00E880]/10 via-transparent to-purple-600/10 animate-pulse" />
                  
                  {/* Success header */}
                  <div className="relative p-8 pb-0">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                      className="flex justify-center mb-4"
                    >
                      <div className="relative">
                        <motion.div
                          animate={{ rotate: [0, 10, -10, 10, 0] }}
                          transition={{ duration: 0.5, delay: 0.5 }}
                          className="w-20 h-20 bg-gradient-to-br from-[#00E880] to-green-600 rounded-full flex items-center justify-center shadow-lg"
                        >
                          <CheckCircle2 className="w-12 h-12 text-white" />
                        </motion.div>
                        
                        {/* Pulsing ring effect */}
                        <motion.div
                          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="absolute inset-0 rounded-full border-4 border-[#00E880]"
                        />
                      </div>
                    </motion.div>

                    <motion.h2
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-3xl font-bold text-center text-white mb-2"
                    >
                      Saque Solicitado!
                    </motion.h2>
                    
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="text-center text-gray-400"
                    >
                      Seu saque está sendo processado
                    </motion.p>
                  </div>

                  {/* Amount details */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="p-8 space-y-4"
                  >
                    {/* Main amount */}
                    <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700">
                      <div className="flex items-center justify-between mb-3 md:mb-4">
                        <span className="text-gray-400">Valor Solicitado</span>
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.6, type: "spring" }}
                          className="text-3xl font-bold text-[#00E880]"
                        >
                          {formatBRL(parseFloat(successData.amount))}
                        </motion.span>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-gray-500">
                          <span>Taxa de processamento</span>
                          <span className="text-red-400">- {formatBRL(parseFloat(successData.fee))}</span>
                        </div>
                        <div className="pt-2 border-t border-gray-700">
                          <div className="flex justify-between">
                            <span className="text-gray-400 font-medium">Valor a receber</span>
                            <span className="text-xl font-bold text-white">
                              {formatBRL(parseFloat(successData.netAmount))}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* PIX details */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.7 }}
                      className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#00E880]/10 rounded-lg">
                          <Send className="w-5 h-5 text-[#00E880]" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 uppercase">
                            {successData.pixKeyType === 'cpf' ? 'CPF' : 'CNPJ'}
                          </p>
                          <p className="text-sm font-medium text-white">
                            {successData.pixKey}
                          </p>
                        </div>
                      </div>
                    </motion.div>

                    {/* Processing time notice */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.8 }}
                      className="flex items-center gap-2 p-3 bg-blue-500/10 rounded-xl border border-blue-500/20"
                    >
                      <Clock className="w-4 h-4 text-blue-400" />
                      <p className="text-sm text-blue-300">
                        Processamento em até 24 horas úteis
                      </p>
                    </motion.div>

                    {/* Animation indicator */}
                    {animateToHistory && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center justify-center gap-2 pt-4"
                      >
                        <ArrowRight className="w-5 h-5 text-[#00E880] animate-pulse" />
                        <span className="text-[#00E880] font-medium animate-pulse">
                          Movendo para o histórico...
                        </span>
                      </motion.div>
                    )}
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Responsive Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-gray-900/50 to-gray-950/50 backdrop-blur-sm rounded-2xl p-4 md:p-6 mb-4"
        >
          <div className="flex items-center gap-3 md:gap-4">
            <div className="p-2 md:p-3 bg-gray-800 rounded-xl">
              <Wallet className="w-5 h-5 md:w-6 md:h-6 text-gray-400" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">Central de Saques</h1>
              <p className="text-gray-400 text-xs md:text-sm">Gerencie seus saques e acompanhe o processamento via PIX</p>
            </div>
          </div>
        </motion.div>

        {/* Premium Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ scale: 1.02 }}
            className="relative rounded-2xl overflow-hidden"
          >
            <div className="relative bg-[#1a1f2e]/95 backdrop-blur-sm border border-gray-700 rounded-2xl p-4 md:p-6">
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <div className="p-2.5 md:p-3 bg-gray-800 rounded-xl border border-gray-700">
                  <Wallet className="w-5 h-5 md:w-6 md:h-6 text-[#00E880]" />
                </div>
                <Badge className="bg-green-900/40 text-[#00E880] border-0">
                  Liberado
                </Badge>
              </div>
              {isLoading ? (
                <Skeleton className="h-10 w-32 mb-2" />
              ) : availableBalance === 0 ? (
                <div>
                  <p className="text-2xl md:text-3xl font-bold text-white">—</p>
                  <p className="text-xs md:text-sm text-gray-400">Sem saldo disponível</p>
                </div>
              ) : (
                <div>
                  <p className="text-2xl md:text-3xl font-bold text-[#00E880]">
                    {formatBRL(availableBalance)}
                  </p>
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-gray-400" />
                    <p className="text-xs md:text-sm text-gray-400">Disponível para Saque</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.02 }}
            className="relative rounded-2xl overflow-hidden"
          >
            <div className="relative bg-[#1a1f2e]/95 backdrop-blur-sm border border-gray-700 rounded-2xl p-4 md:p-6">
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <div className="p-2.5 md:p-3 bg-gray-800 rounded-xl border border-gray-700">
                  <ArrowUpRight className="w-5 h-5 md:w-6 md:h-6 text-orange-400" />
                </div>
                <Badge className="bg-orange-900/40 text-orange-400 border-0">
                  Processando
                </Badge>
              </div>
              {isLoading ? (
                <Skeleton className="h-10 w-32 mb-2" />
              ) : pendingWithdrawals === 0 ? (
                <div>
                  <p className="text-2xl md:text-3xl font-bold text-white">—</p>
                  <p className="text-xs md:text-sm text-gray-400">Nenhum saque pendente</p>
                </div>
              ) : (
                <div>
                  <p className="text-2xl md:text-3xl font-bold text-orange-400">
                    {formatBRL(pendingWithdrawals)}
                  </p>
                  <p className="text-xs md:text-sm text-gray-400">Saques em Andamento</p>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.02 }}
            className="relative rounded-2xl overflow-hidden"
          >
            <div className="relative bg-[#1a1f2e]/95 backdrop-blur-sm border border-gray-700 rounded-2xl p-4 md:p-6">
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <div className="p-2.5 md:p-3 bg-gray-800 rounded-xl border border-gray-700">
                  <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />
                </div>
                <Badge className="bg-blue-900/40 text-blue-400 border-0">
                  Histórico
                </Badge>
              </div>
              {isLoading ? (
                <Skeleton className="h-10 w-32 mb-2" />
              ) : realTotalWithdrawn === 0 ? (
                <div>
                  <p className="text-2xl md:text-3xl font-bold text-white">—</p>
                  <p className="text-xs md:text-sm text-gray-400">Nenhum saque realizado</p>
                </div>
              ) : (
                <div>
                  <p className="text-2xl md:text-3xl font-bold text-blue-400">
                    {formatBRL(realTotalWithdrawn)}
                  </p>
                  <p className="text-xs md:text-sm text-gray-400">Total Sacado</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Main Content - Vertical Layout */}
        <div className="space-y-6">
          {/* Top Section - Withdrawal Form */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="relative"
          >
            <div className="relative rounded-2xl overflow-hidden">
              <div className="relative bg-[#1a1f2e] rounded-2xl overflow-hidden border border-gray-700">
                {/* Pattern Background */}
                <div className="absolute inset-0 opacity-5">
                  <div className="absolute inset-0" style={{
                    backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.05) 10px, rgba(255,255,255,.05) 20px)`
                  }} />
                </div>

                {/* Content */}
                <div className="relative flex flex-col">
                  <div className="bg-gradient-to-r from-gray-900/50 to-gray-950/50 backdrop-blur-sm p-5 border-b border-gray-800">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-gradient-to-br from-[#00E880]/20 to-[#00E880]/10 rounded-xl">
                        <DollarSign className="w-6 h-6 text-[#00E880]" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-white">Solicitar Saque</h2>
                        <p className="text-xs text-gray-400 mt-0.5">Retire seus ganhos via PIX</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 p-6 space-y-5">
                    {availableBalance < minWithdraw && (
                      <Alert className="bg-red-950/50 border-red-900">
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        <AlertDescription className="text-red-400">
                          Saldo insuficiente. Você precisa de pelo menos R$ {minWithdraw.toFixed(2)} para sacar.
                        </AlertDescription>
                      </Alert>
                    )}
              
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300 text-base font-medium mb-2 block">Valor do Saque</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder={`Mínimo R$ ${minWithdraw.toFixed(2)}`}
                      className="bg-gray-900/50 border-gray-700 text-white text-lg h-12 pl-12 pr-4 focus:border-[#00E880] focus:ring-1 focus:ring-[#00E880]/50 transition-all"
                      disabled={availableBalance < minWithdraw}
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#00E880] font-bold">R$</div>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-gray-400">
                      <span className="text-gray-500">Mínimo:</span> 
                      <span className="text-white ml-1 font-medium">R$ {minWithdraw.toFixed(2)}</span>
                    </span>
                    <span className="text-gray-400">
                      <span className="text-gray-500">Máximo:</span> 
                      <span className="text-white ml-1 font-medium">R$ {maxWithdraw.toFixed(2)}</span>
                    </span>
                  </div>
                </div>
                
                {/* Fee calculation display */}
                {withdrawAmount && parseFloat(withdrawAmount) >= minWithdraw && (
                  <div className="mt-3 p-3 bg-gray-900/50 rounded-lg border border-gray-800">
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Valor solicitado:</span>
                        <span className="text-white">R$ {parseFloat(withdrawAmount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Taxa de saque:</span>
                        <span className="text-red-400">- R$ {withdrawFee.toFixed(2)}</span>
                      </div>
                      <div className="h-px bg-gray-700 my-1" />
                      <div className="flex justify-between font-semibold">
                        <span className="text-gray-300">Você receberá:</span>
                        <span className="text-[#00E880]">
                          R$ {calculateNetAmount(parseFloat(withdrawAmount)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Saved PIX Key Section */}
              {settingsData?.pixKey ? (
                <div className="bg-gradient-to-r from-[#00E880]/10 to-green-600/10 rounded-xl p-4 border border-[#00E880]/20">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-[#00E880]" />
                        <p className="text-xs md:text-sm font-medium text-[#00E880]">Chave PIX Configurada</p>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-3">
                        <p className="text-xs text-gray-400 mb-1">
                          {settingsData.pixKeyType === 'cpf' ? 'CPF' : 
                           settingsData.pixKeyType === 'cnpj' ? 'CNPJ' :
                           settingsData.pixKeyType === 'email' ? 'E-mail' :
                           settingsData.pixKeyType === 'phone' ? 'Telefone' : 'Chave Aleatória'}
                        </p>
                        <p className="text-white font-mono text-sm md:text-lg tracking-wide break-all">
                          {settingsData.pixKey}
                        </p>
                      </div>
                      <p className="text-xs text-gray-400 mt-3">
                        Esta chave será usada automaticamente para receber seu saque
                      </p>
                    </div>
                    <div className="md:ml-4">
                      <Button
                        onClick={() => setLocation('/parceiros/settings')}
                        variant="ghost"
                        size="sm"
                        className="w-full md:w-auto border border-[#00E880]/30 text-[#00E880] hover:bg-[#00E880]/10"
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Alterar
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-orange-500/10 to-orange-600/10 rounded-xl p-4 border border-orange-500/20">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-orange-400" />
                        <p className="text-xs md:text-sm font-medium text-orange-400">Atenção</p>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-3">
                        <p className="text-white font-medium text-sm md:text-base">
                          Configure sua chave PIX padrão agora
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Facilite seus saques configurando uma chave PIX
                        </p>
                      </div>
                    </div>
                    <div className="md:ml-4">
                      <Button
                        onClick={() => setLocation('/parceiros/settings?section=pix')}
                        variant="ghost"
                        size="sm"
                        className="w-full md:w-auto border border-orange-400/30 text-orange-400 hover:bg-orange-400/10"
                      >
                        <Key className="w-4 h-4 mr-2" />
                        Configurar
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Show PIX key inputs if no key is entered */}
              {!pixKey && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-300 text-base font-medium">Tipo de Documento</Label>
                      <Select value={pixKeyType} onValueChange={setPixKeyType}>
                        <SelectTrigger className="bg-gray-900/50 border-gray-700 text-white h-12 focus:border-[#00E880] focus:ring-1 focus:ring-[#00E880]/50 transition-all">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-700">
                          <SelectItem value="cpf" className="text-white hover:bg-gray-800">CPF</SelectItem>
                          <SelectItem value="cnpj" className="text-white hover:bg-gray-800">CNPJ</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-gray-300 text-base font-medium">{pixKeyType === 'cpf' ? 'CPF' : 'CNPJ'} (Chave PIX)</Label>
                      <Input
                        value={pixKey}
                        onChange={(e) => setPixKey(formatDocument(e.target.value, pixKeyType))}
                        placeholder={
                          pixKeyType === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'
                        }
                        className="bg-gray-900/50 border-gray-700 text-white h-12 text-lg focus:border-[#00E880] focus:ring-1 focus:ring-[#00E880]/50 transition-all"
                        disabled={availableBalance < minWithdraw}
                      />
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-400 -mt-2 flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-400" />
                    {pixKeyType === 'cpf' 
                      ? 'Use o CPF cadastrado como chave PIX na sua conta bancária' 
                      : 'Use o CNPJ cadastrado como chave PIX na sua conta bancária'}
                  </p>
                </>
              )}
              
              <div className="bg-gradient-to-r from-gray-900/30 to-gray-800/30 rounded-xl p-4 border border-gray-700">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Prazo</p>
                    <p className="text-white font-semibold">24h úteis</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Taxa fixa</p>
                    <p className="text-yellow-400 font-semibold">R$ {withdrawFee.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Mínimo</p>
                    <p className="text-white font-semibold">R$ {minWithdraw.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Máximo</p>
                    <p className="text-white font-semibold">R$ {maxWithdraw.toFixed(2)}</p>
                  </div>
                </div>
              </div>
              
              <Button 
                onClick={handleWithdraw}
                disabled={availableBalance < minWithdraw || withdrawMutation.isPending}
                className="w-full h-14 bg-gradient-to-r from-[#00E880] to-green-600 text-black font-bold text-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl hover:shadow-[#00E880]/20"
              >
                {withdrawMutation.isPending ? (
                  <>
                    <Clock className="w-5 h-5 mr-2 animate-spin" />
                    Processando Saque...
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="w-5 h-5 mr-2" />
                    Confirmar Saque
                  </>
                )}
              </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Bottom Section - Withdrawal History */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="relative"
          >
            <div className="relative rounded-2xl overflow-hidden">
              <div className="relative bg-[#1a1f2e] rounded-2xl overflow-hidden border border-gray-700">
                <div className="bg-gradient-to-r from-gray-900/50 to-gray-950/50 backdrop-blur-sm p-5 border-b border-gray-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-gradient-to-br from-purple-600/20 to-purple-600/10 rounded-xl">
                        <History className="w-6 h-6 text-purple-400" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-white">Histórico</h2>
                        <p className="text-xs text-gray-400 mt-0.5">Acompanhe seus saques</p>
                      </div>
                    </div>
                    {(withdrawals as any[]).length > 0 && (
                      <Badge className="bg-gray-800 text-gray-300 border-0">
                        {(withdrawals as any[]).length} {(withdrawals as any[]).length === 1 ? 'saque' : 'saques'}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="p-6 overflow-y-auto" style={{ maxHeight: '600px' }}>
                  {(withdrawals as any[]).length === 0 ? (
                    <div className="text-center py-8">
                <Wallet className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">Nenhum saque realizado ainda</p>
                <p className="text-gray-500 text-sm mt-1">
                  Seus saques aparecerão aqui
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {(withdrawals as any[]).map((withdrawal: any, i: number) => {
                  const isNew = i === 0 && Date.now() - new Date(withdrawal.requestedAt || withdrawal.createdAt || Date.now()).getTime() < 10000;
                  // Get PIX key directly from withdrawal fields (no metadata in this table)
                  const pixKey = withdrawal.pixKey || withdrawal.pix_key || '';
                  const pixKeyType = withdrawal.pixKeyType || withdrawal.pix_key_type || 'cpf';
                  
                  // Format PIX key based on type
                  const formatPixKey = (key: string, type: string) => {
                    if (!key) return 'Não informada';
                    
                    // Convert to string if it's a number
                    const keyStr = String(key);
                    
                    // If it's already formatted, return as is
                    if (keyStr.includes('.') || keyStr.includes('-') || keyStr.includes('/') || keyStr.includes('@')) {
                      return keyStr;
                    }
                    
                    // Remove any existing formatting first
                    const cleanKey = keyStr.replace(/[^\d@A-Za-z]/g, '');
                    
                    switch(type) {
                      case 'cpf':
                        // Format CPF: 000.000.000-00
                        if (cleanKey.length === 11) {
                          return cleanKey.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
                        }
                        return cleanKey;
                      case 'cnpj':
                        // Format CNPJ: 00.000.000/0000-00
                        return key.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
                      case 'phone':
                        // Format phone: +55 (00) 00000-0000
                        if (key.length === 11) {
                          return key.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
                        }
                        return key;
                      case 'email':
                        return key; // Email doesn't need formatting
                      case 'random':
                        return key; // Random key doesn't need formatting
                      default:
                        return key;
                    }
                  };
                  
                  const formattedPixKey = formatPixKey(pixKey, pixKeyType);
                  // Use values from backend which now includes gross and net amounts
                  // Ensure all values are numbers
                  const netAmount = typeof withdrawal.netAmount === 'number' 
                    ? withdrawal.netAmount 
                    : parseFloat(withdrawal.amount || '0');
                  const grossAmount = typeof withdrawal.grossAmount === 'number'
                    ? withdrawal.grossAmount
                    : (netAmount + withdrawFee);
                  const fee = typeof withdrawal.fee === 'number'
                    ? withdrawal.fee
                    : withdrawFee;
                  
                  const statusConfig = {
                    pending: { 
                      bg: 'bg-gradient-to-r from-yellow-900/30 to-yellow-900/20', 
                      icon: Clock,
                      iconBg: 'bg-yellow-500/20',
                      text: 'text-yellow-400', 
                      label: 'Pendente',
                      border: 'border-yellow-900/50'
                    },
                    processing: { 
                      bg: 'bg-gradient-to-r from-yellow-900/30 to-yellow-900/20', 
                      icon: Clock,
                      iconBg: 'bg-yellow-500/20',
                      text: 'text-yellow-400', 
                      label: 'Pendente',
                      border: 'border-yellow-900/50'
                    },
                    approved: { 
                      bg: 'bg-gradient-to-r from-green-900/30 to-green-900/20', 
                      icon: CheckCircle,
                      iconBg: 'bg-green-500/20',
                      text: 'text-green-400', 
                      label: 'Pago',
                      border: 'border-green-900/50'
                    },
                    completed: { 
                      bg: 'bg-gradient-to-r from-green-900/30 to-green-900/20', 
                      icon: CheckCircle,
                      iconBg: 'bg-green-500/20',
                      text: 'text-green-400', 
                      label: 'Pago',
                      border: 'border-green-900/50'
                    },
                    rejected: { 
                      bg: 'bg-gradient-to-r from-red-900/30 to-red-900/20', 
                      icon: XCircle,
                      iconBg: 'bg-red-500/20',
                      text: 'text-red-400', 
                      label: 'Rejeitado',
                      border: 'border-red-900/50'
                    },
                    cancelled: { 
                      bg: 'bg-gradient-to-r from-red-900/30 to-red-900/20', 
                      icon: XCircle,
                      iconBg: 'bg-red-500/20',
                      text: 'text-red-400', 
                      label: 'Rejeitado',
                      border: 'border-red-900/50'
                    },
                    failed: { 
                      bg: 'bg-gradient-to-r from-red-900/30 to-red-900/20', 
                      icon: XCircle,
                      iconBg: 'bg-red-500/20',
                      text: 'text-red-400', 
                      label: 'Rejeitado',
                      border: 'border-red-900/50'
                    }
                  };
                  
                  const status = statusConfig[withdrawal.status as keyof typeof statusConfig] || statusConfig.pending;
                  const StatusIcon = status.icon;
                  
                  return (
                    <motion.div
                      key={withdrawal.id}
                      initial={{ opacity: 0, y: 20, scale: isNew ? 0.95 : 1 }}
                      animate={{ 
                        opacity: 1, 
                        y: 0, 
                        scale: 1,
                        boxShadow: isNew ? [
                          "0 0 0px rgba(0, 232, 128, 0)",
                          "0 0 20px rgba(0, 232, 128, 0.5)",
                          "0 0 40px rgba(0, 232, 128, 0.8)",
                          "0 0 20px rgba(0, 232, 128, 0.5)",
                          "0 0 0px rgba(0, 232, 128, 0)"
                        ] : "0 0 0px rgba(0, 232, 128, 0)"
                      }}
                      transition={{ 
                        delay: isNew ? 0.5 : i * 0.05,
                        duration: isNew ? 1.5 : 0.3,
                        type: isNew ? "spring" : "tween",
                        boxShadow: isNew ? { duration: 2, times: [0, 0.25, 0.5, 0.75, 1] } : undefined
                      }}
                      className={`relative overflow-hidden rounded-xl border ${status.border} ${status.bg} ${
                        isNew ? 'animate-pulse' : ''
                      }`}
                    >
                      {/* Decorative gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent opacity-50" />
                      
                      <div className="relative p-4">
                        {/* Header Row */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl ${status.iconBg}`}>
                              <StatusIcon className={`w-5 h-5 ${status.text}`} />
                            </div>
                            <div>
                              <Badge className={`${status.text} bg-transparent border-0 px-0 font-semibold text-sm`}>
                                {status.label}
                              </Badge>
                              <div className="text-xs text-gray-400 mt-0.5">
                                {withdrawal.requestedAt || withdrawal.createdAt ? 
                                  `${new Date(withdrawal.requestedAt || withdrawal.createdAt).toLocaleDateString('pt-BR')} às ${new Date(withdrawal.requestedAt || withdrawal.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` :
                                  'Data não disponível'
                                }
                              </div>
                            </div>
                          </div>
                          
                          {/* Request ID with Copy Button */}
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <p className="text-xs text-gray-500">ID</p>
                              <p className="text-sm font-mono text-white">#{withdrawal.displayId || withdrawal.display_id || withdrawal.id}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-gray-800"
                              onClick={() => {
                                const idToCopy = withdrawal.displayId || withdrawal.display_id || withdrawal.id;
                                navigator.clipboard.writeText(idToCopy.toString());
                                toast({
                                  title: "ID Copiado!",
                                  description: `ID #${idToCopy} copiado para a área de transferência`,
                                  duration: 2000,
                                });
                              }}
                            >
                              <Copy className="h-3.5 w-3.5 text-gray-400" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Amount Details Row */}
                        <div className="grid grid-cols-3 gap-4 p-3 bg-gray-900/50 rounded-lg mb-3">
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Valor Solicitado</p>
                            <p className="text-white font-semibold">R$ {grossAmount.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Taxa</p>
                            <p className="text-red-400 font-semibold">- R$ {fee.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Valor Líquido</p>
                            <p className="text-[#00E880] font-bold text-lg">R$ {netAmount.toFixed(2)}</p>
                          </div>
                        </div>
                        
                        {/* PIX Details */}
                        <div className="flex items-center justify-between p-3 bg-gray-900/30 rounded-lg mb-3">
                          <div className="flex items-center gap-2">
                            <Key className="w-4 h-4 text-gray-400" />
                            <span className="text-xs text-gray-400">
                              {pixKeyType === 'cpf' ? 'CPF' :
                               pixKeyType === 'cnpj' ? 'CNPJ' :
                               pixKeyType === 'phone' ? 'Telefone' :
                               pixKeyType === 'email' ? 'E-mail' :
                               pixKeyType === 'random' ? 'Aleatória' : 'Chave PIX'}
                            </span>
                          </div>
                          <span className="text-[#00E880] font-mono text-sm font-medium">{formattedPixKey}</span>
                        </div>
                        
                        {/* Receipt Button for Completed Withdrawals */}
                        {(withdrawal.status === 'completed' || withdrawal.status === 'approved') && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-[#00E880]/20 bg-[#00E880]/5 hover:bg-[#00E880]/10 text-[#00E880]"
                            onClick={() => {
                              const receiptData = {
                                id: withdrawal.displayId || withdrawal.display_id || withdrawal.id,
                                amount: grossAmount.toFixed(2),
                                netAmount: netAmount.toFixed(2),
                                fee: fee.toFixed(2),
                                pixKey: formattedPixKey,
                                pixKeyType: pixKeyType === 'cpf' ? 'CPF' :
                                           pixKeyType === 'cnpj' ? 'CNPJ' :
                                           pixKeyType === 'phone' ? 'Telefone' :
                                           pixKeyType === 'email' ? 'E-mail' :
                                           pixKeyType === 'random' ? 'Aleatória' : 'Chave PIX',
                                status: 'Pago',
                                requestedAt: withdrawal.requestedAt || withdrawal.createdAt,
                                processedAt: withdrawal.processedAt || withdrawal.updatedAt,
                                endToEndId: withdrawal.endToEndId || withdrawal.endtoEndId || '',
                                type: 'affiliate' as 'affiliate'
                              };
                              generateWithdrawalReceipt(receiptData);
                              toast({
                                title: "Comprovante gerado!",
                                description: "O PDF do comprovante foi baixado com sucesso.",
                                duration: 3000
                              });
                            }}
                          >
                            <FileDown className="w-4 h-4 mr-2" />
                            Comprovante
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </PartnerLayout>
  );
}