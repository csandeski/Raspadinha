import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "../lib/auth.tsx";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Shield, Sparkles, Zap, Flame, Check, ArrowLeft, Gift } from "lucide-react";
import { motion } from "framer-motion";
import pixIcon from "/icons/pix.png";
import PixPayment from "../components/pix-payment-new";
import { apiRequest, queryClient } from "../lib/queryClient";
import { MobileLayout } from "@/components/mobile-layout";

export default function Deposit() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [amount, setAmount] = useState("80");
  const [customAmount, setCustomAmount] = useState("");
  const [pixData, setPixData] = useState<any>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [successAmount, setSuccessAmount] = useState(0);
  const [successTransactionId, setSuccessTransactionId] = useState("");
  const [successBonusCards, setSuccessBonusCards] = useState(0);
  const [showPendingPix, setShowPendingPix] = useState(true);
  const [couponCode, setCouponCode] = useState("");
  const [showCouponField, setShowCouponField] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [autoCreateTriggered, setAutoCreateTriggered] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(0);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [userCanceledPix, setUserCanceledPix] = useState(false);
  const { toast } = useToast();

  // Query user balance
  const { data: userWallet } = useQuery<{
    balance: string;
    scratchBonus: number;
    totalBalance: string;
  }>({
    queryKey: ['/api/user/balance'],
    enabled: !!user,
  });

  const balance = userWallet?.balance || "0.00";
  
  // Query user deposit history to check if it's first deposit
  const { data: depositHistory = [] } = useQuery<any[]>({
    queryKey: ['/api/user/deposits'],
    enabled: !!user,
  });
  
  const isFirstDeposit = depositHistory.length === 0;
  
  // Query current coupon
  const { data: currentCoupon } = useQuery<{
    hasAppliedCoupon: boolean;
    currentCoupon: string | null;
    couponDetails: any;
  }>({
    queryKey: ['/api/coupons/current'],
    enabled: !!user,
  });
  
  // Apply coupon mutation
  const applyCouponMutation = useMutation({
    mutationFn: async ({ code, silent = false }: { code: string; silent?: boolean }) => {
      return await apiRequest('/api/coupons/apply', 'POST', { code });
    },
    onSuccess: (data, variables) => {
      if (!variables.silent) {
        toast({
          description: data.message || "Cupom aplicado com sucesso!"
        });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/coupons/current'] });
      setShowCouponField(false);
      setCouponCode("");
      setCouponError(""); // Clear any existing error
    },
    onError: (error: any, variables) => {
      // Only show error if it's not a silent operation and not "already has coupon" error
      if (!variables.silent && !error.message?.includes("já tem um cupom")) {
        // Extract clean error message from the error object
        let errorMessage = "Erro ao aplicar cupom";
        
        if (typeof error.message === 'string') {
          // Check if the error message is a JSON string
          if (error.message.startsWith('{') && error.message.includes('"error"')) {
            try {
              const parsed = JSON.parse(error.message);
              errorMessage = parsed.error || parsed.message || error.message;
            } catch {
              errorMessage = error.message;
            }
          } else {
            errorMessage = error.message;
          }
        }
        
        setCouponError(errorMessage);
      }
    }
  });
  
  // Remove coupon mutation
  const removeCouponMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/coupons/remove', 'DELETE');
    },
    onSuccess: () => {
      toast({
        description: "Cupom removido com sucesso!"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/coupons/current'] });
    },
    onError: (error: any) => {
      toast({
        description: error.message || "Erro ao remover cupom",
        variant: "destructive"
      });
    }
  });
  
  // Track if we've already attempted to apply BONUS coupon
  const [bonusAttempted, setBonusAttempted] = useState(false);
  
  // Automatically apply BONUS coupon for first deposits
  useEffect(() => {
    if (isFirstDeposit && !currentCoupon?.hasAppliedCoupon && depositHistory && user && !bonusAttempted) {
      // Only apply if deposits have loaded and it's truly the first deposit
      setBonusAttempted(true);
      applyCouponMutation.mutate({ code: 'SORTE', silent: true });
    }
  }, [isFirstDeposit, currentCoupon?.hasAppliedCoupon, depositHistory, user, bonusAttempted]);
  
  // Check for pending PIX payment
  const { data: pendingPix, isLoading: checkingPending, refetch: refetchPendingPix } = useQuery<{
    hasPending: boolean;
    pixData?: any;
  }>({
    queryKey: ['/api/payments/pending-pix'],
    enabled: !!user && !pixData && !paymentSuccess && !userCanceledPix,
    refetchInterval: (data) => {
      // Only refetch if there's actually a pending PIX
      return data?.hasPending ? 2000 : false;
    },
    retry: false, // Don't retry if it fails
    staleTime: 0, // Always fetch fresh data
  });
  
  // Reset show pending PIX when pendingPix changes
  useEffect(() => {
    if (pendingPix?.hasPending && !pixData) {
      setShowPendingPix(true);
    }
  }, [pendingPix?.hasPending, pixData]);

  // If there's a pending PIX, show it instead of the form
  useEffect(() => {
    if (pendingPix?.hasPending && pendingPix.pixData && !pixData && !userCanceledPix) {
      // Only set pixData if it's not already set (to avoid conflicts)
      if (showPendingPix) {
        // User wants to see the pending PIX modal
      } else {
        // Automatically show the PIX payment screen
        setPixData(pendingPix.pixData);
      }
    }
  }, [pendingPix, pixData, showPendingPix, userCanceledPix]);



  const createPixMutation = useMutation({
    mutationFn: async (data: { amount: number }) => {
      console.log('Creating PIX payment:', data);
      try {
        const result = await apiRequest('/api/payments/create-pix', 'POST', data);
        console.log('PIX creation success:', result);
        return result;
      } catch (error: any) {
        console.error('PIX creation error:', error);
        console.error('Error details:', error.response, error.message);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('PIX mutation success:', data);
      // Hide the pending PIX modal and show the new PIX payment
      setShowPendingPix(false);
      setUserCanceledPix(false);
      setPixData(data);
      
      // Fire Facebook Pixel InitiateCheckout event
      if (typeof window !== 'undefined' && (window as any).fbq) {
        (window as any).fbq('track', 'InitiateCheckout', {
          value: data.amount,
          currency: 'BRL',
          content_type: 'deposit',
          content_ids: [data.depositId || data.transactionId]
        });
      }
    },
    onError: (error: any) => {
      console.error('PIX mutation error:', error);
      toast({
        description: "Não foi possível criar o pagamento PIX"
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = customAmount ? parseFloat(customAmount) : parseFloat(amount);
    
    if (isNaN(value) || value < 20) {
      toast({
        description: "O valor mínimo para depósito é R$ 20,00"
      });
      return;
    }

    if (value > 5000) {
      toast({
        description: "O valor máximo para depósito é R$ 1K"
      });
      return;
    }

    createPixMutation.mutate({ amount: value });
  };

  // Define the first deposit bonus tiers
  const firstDepositBonusTiers = [
    { minAmount: 10, cards: 1 },
    { minAmount: 20, cards: 3 },
    { minAmount: 30, cards: 6 },
    { minAmount: 40, cards: 12 },
    { minAmount: 50, cards: 24 },
    { minAmount: 60, cards: 30 },
    { minAmount: 80, cards: 45 },
    { minAmount: 100, cards: 60 },
    { minAmount: 150, cards: 100 },
    { minAmount: 200, cards: 150 },
    { minAmount: 300, cards: 250 }
  ];

  const getFirstDepositBonus = (amount: number) => {
    // Find the highest tier that the amount qualifies for
    for (let i = firstDepositBonusTiers.length - 1; i >= 0; i--) {
      if (amount >= firstDepositBonusTiers[i].minAmount) {
        return firstDepositBonusTiers[i].cards;
      }
    }
    return 0;
  };

  const presetValues = (isFirstDeposit || currentCoupon?.hasAppliedCoupon) ? [
    { value: "20", label: "20", bonus: 3, badge: "3 Bônus", popular: false },
    { value: "50", label: "50", bonus: 24, badge: "24 Bônus", popular: false },
    { value: "80", label: "80", bonus: 45, badge: "45 Bônus", popular: true },
    { value: "100", label: "100", bonus: 60, badge: "60 Bônus", popular: false },
    { value: "200", label: "200", bonus: 150, badge: "150 Bônus", popular: false },
    { value: "300", label: "300", bonus: 250, badge: "250 Bônus", popular: false }
  ] : [
    { value: "20", label: "20", bonus: 0, badge: undefined, popular: false },
    { value: "50", label: "50", bonus: 0, badge: undefined, popular: false },
    { value: "80", label: "80", bonus: 0, badge: undefined, popular: true },
    { value: "100", label: "100", bonus: 0, badge: undefined, popular: false },
    { value: "200", label: "200", bonus: 0, badge: undefined, popular: false },
    { value: "300", label: "300", bonus: 0, badge: undefined, popular: false }
  ];

  // Show PIX payment screen when pixData is available
  if (pixData) {
    console.log('Showing PIX payment screen with data:', pixData);
    return <PixPayment 
      pixData={pixData} 
      onComplete={() => {
        console.log('PIX payment completed/cancelled');
        setPixData(null);
        setPaymentSuccess(false);
        setUserCanceledPix(true);
        setShowPendingPix(false);
        // Don't automatically show pending PIX after cancellation
        // User can create a new payment or resume existing one from the deposit page
      }}
      onSuccess={() => {
        console.log('PIX payment success!');
        setSuccessAmount(pixData.amount);
        setSuccessTransactionId(pixData.transactionId);
        // Calculate bonus cards - applies when first deposit OR when coupon is active
        const bonusCards = (isFirstDeposit || currentCoupon?.hasAppliedCoupon) ? getFirstDepositBonus(pixData.amount) : 0;
        setSuccessBonusCards(bonusCards);
        setPixData(null);
        setPaymentSuccess(true);
      }}
    />;
  }

  // Only show loading state on initial load if user is authenticated
  if (checkingPending && user && !userCanceledPix) {
    return (
      <MobileLayout>
        <div className="min-h-full bg-gradient-to-b from-[#0E1015] via-[#1a1b23] to-[#0E1015] flex items-center justify-center pt-20">
          <div className="flex flex-col items-center space-y-6">
            {/* Animated PIX Icon */}
            <div className="relative">
              <div className="absolute inset-0 bg-[#00E880] rounded-full blur-xl opacity-40 animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-full border border-gray-700/50">
                <img 
                  src={pixIcon} 
                  alt="PIX" 
                  className="w-16 h-16 animate-pulse"
                />
              </div>
            </div>
            
            {/* Loading Text */}
            <div className="text-center space-y-2">
              <h3 className="text-white text-xl font-medium">Verificando pagamentos</h3>
              <p className="text-gray-400 text-sm">Aguarde um momento...</p>
            </div>
            
            {/* Loading Dots */}
            <div className="flex space-x-2">
              <div className="w-2 h-2 bg-[#00E880] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-[#00E880] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-[#00E880] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  // Success Screen
  if (paymentSuccess) {
    return (
      <MobileLayout>
        <div className="min-h-full bg-gradient-to-b from-[#0E1015] via-[#1a1b23] to-[#0E1015] flex flex-col pt-12">
          <div className="flex-1 flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center">
              {/* Success Animation */}
              <div className="mb-6">
                <div className="relative w-32 h-32 mx-auto">
                  <div className="absolute inset-0 bg-gradient-to-r from-[#00E880] to-[#00D470] rounded-full animate-pulse"></div>
                  <div className="absolute inset-2 bg-[#0E1015] rounded-full flex items-center justify-center">
                    <Check className="w-16 h-16 text-[#00E880]" />
                  </div>
                </div>
              </div>

              {/* Success Message */}
              <h2 className="text-3xl font-bold mb-4 text-white">
                Pagamento Aprovado!
              </h2>
              
              <p className="text-gray-400 mb-8">
                Seu depósito foi processado com sucesso e já está disponível em sua conta.
              </p>

              {/* Action Button - Moved to top */}
              <button
                onClick={() => setLocation('/')}
                className="w-full bg-gradient-to-r from-[#00E880] to-[#00D470] hover:from-[#00D470] hover:to-[#00C560] text-black font-bold py-4 rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-lg flex items-center justify-center space-x-2 mb-6"
              >
                <span>Ir para os jogos</span>
                <ArrowLeft className="w-5 h-5 rotate-180" />
              </button>

              {/* Success Details */}
              <div className="bg-gray-900/50 rounded-xl p-6 mb-4 border border-gray-800">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Valor:</span>
                    <span className="text-white font-medium">R$ {successAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">ID:</span>
                    <span className="text-white font-mono text-sm">{successTransactionId?.slice(0, 8).toUpperCase() || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Data:</span>
                    <span className="text-white">{new Date().toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              </div>

              {/* Bonus Details - Only show if there are bonus cards */}
              {successBonusCards > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, duration: 0.5, type: "spring", stiffness: 100 }}
                  className="relative"
                >
                  {/* Confetti effect background */}
                  <div className="absolute inset-0 overflow-hidden rounded-xl">
                    <div className="absolute -top-10 -left-10 w-20 h-20 bg-[#00E880]/20 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-[#00D470]/20 rounded-full blur-3xl animate-pulse"></div>
                  </div>
                  
                  <div className="relative bg-gradient-to-br from-[#00E880]/30 via-[#00D470]/25 to-[#00E880]/30 rounded-xl p-6 border-2 border-[#00E880]/50 shadow-2xl shadow-[#00E880]/20 backdrop-blur-sm">
                    <div className="text-center">
                      {/* Gift Icon with animation */}
                      <motion.div 
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.7, type: "spring", stiffness: 200 }}
                        className="flex items-center justify-center mb-4"
                      >
                        <div className="relative">
                          <Gift className="w-12 h-12 text-[#00E880] animate-bounce" />
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#00D470] rounded-full animate-ping"></div>
                        </div>
                      </motion.div>
                      
                      <motion.h3 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="text-2xl font-black text-white mb-3 drop-shadow-lg"
                      >Parabéns! Você ganhou</motion.h3>
                      
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 1, type: "spring", stiffness: 200 }}
                        className="flex items-center justify-center space-x-3 mb-4"
                      >
                        <span className="text-5xl font-black text-[#00E880] drop-shadow-lg animate-pulse">{successBonusCards}</span>
                        <span className="text-xl text-white font-bold">Mania Bônus!</span>
                      </motion.div>
                      
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.2 }}
                        className="space-y-2"
                      >
                        
                        <p className="text-sm text-gray-300">
                          Já estão disponíveis para jogar!
                        </p>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="min-h-full bg-gradient-to-b from-[#0E1015] via-[#1a1b23] to-[#0E1015]">
        <div className="max-w-md md:max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-10">
          {/* Header */}
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 md:mb-2">Realizar Depósito</h1>
            <p className="text-gray-400 text-sm md:text-base">Adicione saldo via PIX</p>
          </div>

        <div className="relative">
          {/* Overlay for pending PIX */}
          {pendingPix?.hasPending && showPendingPix && (
            <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center pb-20 sm:pb-0">
              <div className="bg-black/60 backdrop-blur-xl absolute inset-0"></div>
              
              <div className="relative w-full max-w-md animate-in slide-in-from-bottom duration-300 sm:zoom-in-95">
                <div className="bg-gradient-to-b from-[#1E1F28] to-[#15161B] rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden">
                  {/* Header Section */}
                  <div className="relative bg-gradient-to-br from-[#00E880]/20 via-[#00D470]/10 to-transparent p-6 pb-8">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzAwRTg4MCIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50"></div>
                    
                    <div className="relative">
                      {/* PIX Icon */}
                      <div className="flex justify-center mb-4">
                        <div className="relative group">
                          <div className="absolute inset-0 bg-[#00E880] rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
                          <div className="relative bg-gradient-to-br from-[#00E880] to-[#00D470] p-4 rounded-3xl shadow-xl">
                            <img src={pixIcon} alt="PIX" className="w-12 h-12 sm:w-14 sm:h-14" />
                          </div>
                        </div>
                      </div>
                      
                      <h3 className="text-white font-black text-2xl sm:text-3xl text-center tracking-tight">PIX Aguardando Pagamento</h3>
                    </div>
                  </div>
                  
                  {/* Content Section */}
                  <div className="px-6 pb-6 -mt-4">
                    {/* Amount Card */}
                    <div className="bg-gradient-to-br from-[#00E880]/10 to-[#00D470]/5 rounded-2xl p-6 border border-[#00E880]/20 mb-6 backdrop-blur-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400 text-sm font-medium">Valor a pagar</span>
                        <span className="text-[#00E880] text-xs font-bold uppercase tracking-wide bg-[#00E880]/10 px-2 py-1 rounded-full">PIX</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-gray-500 text-lg">R$</span>
                        <span className="text-white font-black text-4xl tracking-tight">{pendingPix.pixData.amount.toFixed(2)}</span>
                      </div>
                    </div>
                    
                    <p className="text-gray-400 text-sm mb-6 text-center leading-relaxed">
                      Complete o pagamento ou cancele para criar um novo
                    </p>
                    
                    {/* Action Buttons */}
                    <div className="space-y-3">
                      <button
                        onClick={() => {
                          setPixData(pendingPix.pixData);
                          setShowPendingPix(false);
                          setUserCanceledPix(false);
                        }}
                        className="w-full relative group"
                      >
                        <div className="absolute -inset-1 bg-gradient-to-r from-[#00E880] to-[#00D470] rounded-2xl blur-lg opacity-70 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative bg-gradient-to-r from-[#00E880] to-[#00D470] text-black font-black px-6 py-4 rounded-2xl transition-all duration-300 transform group-hover:scale-[1.02] shadow-lg">
                          <div className="flex items-center justify-center gap-3">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 1.414L10.586 9.5H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                            </svg>
                            <span>Continuar Pagamento</span>
                          </div>
                        </div>
                      </button>
                      
                      <button
                        onClick={() => setShowCancelConfirmation(true)}
                        className="w-full bg-gray-800/50 backdrop-blur-sm text-gray-400 hover:text-white font-semibold px-6 py-4 rounded-2xl transition-all duration-300 border border-gray-700/50 hover:border-gray-600 hover:bg-gray-800/70"
                      >
                        Cancelar e criar novo PIX
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cancel Confirmation Modal */}
          {showCancelConfirmation && (
            <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center pb-20 sm:pb-0">
              <div className="bg-black/60 backdrop-blur-xl absolute inset-0" onClick={() => setShowCancelConfirmation(false)}></div>
              
              <div className="relative w-full max-w-md animate-in slide-in-from-bottom duration-300 sm:zoom-in-95">
                <div className="bg-gradient-to-b from-[#1E1F28] to-[#15161B] rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden">
                  {/* Header Section */}
                  <div className="relative bg-gradient-to-br from-red-600/20 via-red-500/10 to-transparent p-6 pb-8">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0VGNDQ0NCIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50"></div>
                    
                    <div className="relative">
                      {/* Warning Icon */}
                      <div className="flex justify-center mb-4">
                        <div className="relative group">
                          <div className="absolute inset-0 bg-red-500 rounded-3xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
                          <div className="relative bg-gradient-to-br from-red-600 to-red-500 p-4 rounded-3xl shadow-xl">
                            <svg className="w-12 h-12 sm:w-14 sm:h-14 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                      
                      <h3 className="text-white font-black text-2xl sm:text-3xl text-center tracking-tight">Atenção!</h3>
                    </div>
                  </div>
                  
                  {/* Content Section */}
                  <div className="px-6 pb-6 -mt-4">
                    {/* Warning Card - same style as Amount Card */}
                    <div className="bg-gradient-to-br from-red-600/10 to-red-500/5 rounded-2xl p-6 border border-red-500/20 mb-6 backdrop-blur-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400 text-sm font-medium">Cancelar PIX</span>
                        <span className="text-red-500 text-xs font-bold uppercase tracking-wide bg-red-500/10 px-2 py-1 rounded-full">AVISO</span>
                      </div>
                      <div className="mb-4">
                        <span className="text-white font-black text-xl">Tem certeza?</span>
                      </div>
                      <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/20">
                        <p className="text-red-400 text-sm text-center font-medium">
                          <strong>IMPORTANTE:</strong> Após cancelar, NÃO faça o pagamento! O valor não será creditado em sua conta.
                        </p>
                      </div>
                    </div>
                    
                    <p className="text-gray-400 text-sm mb-6 text-center leading-relaxed">
                      Escolha uma opção abaixo
                    </p>
                    
                    {/* Action Buttons - same style as PIX modal */}
                    <div className="space-y-3">
                      <button
                        onClick={async () => {
                          if (pendingPix?.pixData?.transactionId) {
                            await apiRequest('/api/payments/cancel-pix', 'POST', { 
                              transactionId: pendingPix.pixData.transactionId 
                            });
                            queryClient.invalidateQueries({ queryKey: ['/api/payments/pending-pix'] });
                            setShowCancelConfirmation(false);
                            setShowPendingPix(false);
                            toast({
                              title: "PIX Cancelado",
                              description: "O PIX foi cancelado com sucesso. Você pode criar um novo depósito.",
                            });
                          }
                        }}
                        className="w-full relative group"
                      >
                        <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-red-500 rounded-2xl blur-lg opacity-70 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative bg-gradient-to-r from-red-600 to-red-500 text-white font-black px-6 py-4 rounded-2xl transition-all duration-300 transform group-hover:scale-[1.02] shadow-lg">
                          <div className="flex items-center justify-center gap-3">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            <span>Sim, cancelar PIX</span>
                          </div>
                        </div>
                      </button>
                      
                      <button
                        onClick={() => setShowCancelConfirmation(false)}
                        className="w-full bg-gray-800/50 backdrop-blur-sm text-gray-400 hover:text-white font-semibold px-6 py-4 rounded-2xl transition-all duration-300 border border-gray-700/50 hover:border-gray-600 hover:bg-gray-800/70"
                      >
                        Voltar ao pagamento
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        <form onSubmit={handleSubmit} className={`space-y-8 ${pendingPix?.hasPending ? 'pointer-events-none' : ''}`}>
          {/* Coupon Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-1">Cupom de Desconto</h3>
            <p className="text-gray-400 text-sm mb-4">Tem um cupom? Adicione aqui</p>
            
            {/* Current Coupon Display */}
            {currentCoupon?.hasAppliedCoupon && currentCoupon?.couponDetails && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="relative group mb-4"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#00E880]/20 to-[#00D470]/20 rounded-xl blur-lg group-hover:blur-xl transition-all duration-300"></div>
                <div className="relative bg-gradient-to-br from-[#00E880]/10 via-[#00E880]/5 to-[#00D470]/10 backdrop-blur-sm border border-[#00E880]/30 rounded-xl p-3 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-[#00E880] to-[#00D470] rounded-full flex items-center justify-center shadow-lg">
                        <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-semibold">Cupom:</span>
                        <span className="font-mono font-bold text-[#00E880] text-sm tracking-wider">
                          {currentCoupon.couponDetails.code}
                        </span>
                      </div>
                    </div>
                    
                    <div className="bg-[#00E880]/20 backdrop-blur-sm px-2 py-0.5 rounded-full border border-[#00E880]/30">
                      <span className="text-[#00E880] text-xs font-semibold">ATIVO</span>
                    </div>
                  </div>
                  
                  {currentCoupon.couponDetails.description && (
                    <p className="text-gray-300 text-xs mt-2 ml-10">
                      {currentCoupon.couponDetails.description}
                    </p>
                  )}
                  
                  {/* Decorative element */}
                  <div className="absolute bottom-0 right-0 w-16 h-16 bg-gradient-to-tl from-[#00E880]/10 to-transparent rounded-tl-full"></div>
                </div>
              </motion.div>
            )}
            
            {/* Add Coupon Field */}
            {!currentCoupon?.hasAppliedCoupon && (
              <>
                {!showCouponField ? (
                  <button
                    type="button"
                    onClick={() => setShowCouponField(true)}
                    className="w-full bg-[#1a1b23] border border-gray-800 rounded-xl py-3 px-4 text-gray-400 hover:text-white hover:border-[#00E880] transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span>Adicionar cupom</span>
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="XXXXX"
                        value={couponCode}
                        onChange={(e) => {
                          setCouponCode(e.target.value.toUpperCase());
                          setCouponError(""); // Clear error when user types
                        }}
                        className={`flex-1 bg-[#1a1b23] border ${couponError ? 'border-red-500' : 'border-gray-800'} rounded-xl py-3 px-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#00E880] focus:bg-[#252631] transition-all duration-200 uppercase`}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (couponCode.trim()) {
                            setCouponError(""); // Clear error before trying
                            applyCouponMutation.mutate({ code: couponCode.trim(), silent: false });
                          }
                        }}
                        disabled={applyCouponMutation.isPending || !couponCode.trim()}
                        className="px-6 bg-[#00E880] hover:bg-[#00D470] text-black font-bold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {applyCouponMutation.isPending ? "..." : "Aplicar"}
                      </button>
                    </div>
                    {couponError && (
                      <p className="text-red-500 text-sm mt-2 animate-pulse text-center">
                        {(() => {
                          let errorMessage = "";
                          
                          if (typeof couponError === 'string') {
                            errorMessage = couponError;
                          } else {
                            errorMessage = couponError?.error || couponError?.message || JSON.stringify(couponError);
                          }
                          
                          // Change specific error message
                          if (errorMessage === "Você já usou este cupom o máximo de vezes permitido") {
                            return "Você já usou este cupom!";
                          }
                          
                          return errorMessage;
                        })()}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setShowCouponField(false);
                        setCouponCode("");
                        setCouponError(""); // Clear error when canceling
                      }}
                      className="w-full px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl transition-all duration-200"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </>
            )}
          </div>



          {/* Amount Selection */}
          <div>
            <h3 className="text-lg md:text-xl font-semibold text-white mb-1">Escolha o valor</h3>
            <p className="text-gray-400 text-sm md:text-base mb-6">Selecione um valor ou digite abaixo</p>
            
            {/* Preset Amounts */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-x-2 md:gap-x-3 gap-y-4 mb-6">
              {presetValues.map((item) => (
                <div key={item.value} className="relative">
                  {/* Bonus Badge */}
                  {item.badge && (
                    <div className="absolute -top-2.5 left-1/2 transform -translate-x-1/2 z-20">
                      <div className="bg-gradient-to-r from-[#9B59B6] to-[#8E44AD] text-white text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-md shadow-sm whitespace-nowrap">
                        {item.badge}
                      </div>
                    </div>
                  )}
                  
                  <button
                    type="button"
                    onClick={() => {
                      setAmount(item.value);
                      setCustomAmount("");
                    }}
                    className={`relative w-full py-2.5 md:py-3 px-2 md:px-3 rounded-lg font-semibold text-sm md:text-base transition-all duration-300 ${
                      amount === item.value && !customAmount
                        ? "bg-[#00E880] text-black shadow-lg transform scale-105" 
                        : item.popular 
                          ? "bg-[#1a1b23] text-white hover:bg-[#252631] border border-orange-500/20"
                          : "bg-[#1a1b23] text-white hover:bg-[#252631] border border-gray-700"
                    }`}
                  >
                    {item.popular && (
                      <div className="absolute -top-1 -right-1 z-10">
                        <div className="bg-gradient-to-t from-orange-600 to-yellow-500 rounded-full w-6 h-6 flex items-center justify-center shadow-md">
                          <span className="text-xs">🔥</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-center gap-0.5 relative z-10">
                      <span className={`text-xs ${
                        amount === item.value && !customAmount ? "text-black/70" : "text-gray-400"
                      }`}>R$</span>
                      <span className="text-base font-semibold">{item.label}</span>
                    </div>
                  </button>
                </div>
              ))}
            </div>

            {/* Custom Amount Input */}
            <div className="mt-6 space-y-0">
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 font-medium text-base sm:text-lg">
                  R$
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  step="1"
                  min="20"
                  max="5000"
                  placeholder="Digite um valor"
                  value={customAmount || amount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setAmount("");
                  }}
                  className="w-full bg-[#1a1b23] border border-gray-800 rounded-t-xl rounded-b-none py-3 sm:py-4 pl-11 sm:pl-12 pr-28 text-lg sm:text-xl font-semibold text-white placeholder-gray-600 focus:outline-none focus:border-[#00E880] focus:bg-[#252631] transition-all duration-200"
                />
                {/* Increment/Decrement Buttons */}
                <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const currentValue = customAmount ? parseFloat(customAmount) : (amount ? parseFloat(amount) : 0);
                      const newValue = Math.max(20, currentValue - 1);
                      setCustomAmount(newValue.toString());
                      setAmount("");
                    }}
                    className="bg-gray-700/50 hover:bg-gray-700 border border-gray-600 text-gray-300 hover:text-white rounded-lg p-2 transition-all duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const currentValue = customAmount ? parseFloat(customAmount) : (amount ? parseFloat(amount) : 0);
                      const newValue = Math.min(5000, currentValue + 1);
                      setCustomAmount(newValue.toString());
                      setAmount("");
                    }}
                    className="bg-gray-700/50 hover:bg-gray-700 border border-gray-600 text-gray-300 hover:text-white rounded-lg p-2 transition-all duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between bg-[#161621] border border-gray-800 border-t-0 rounded-b-xl px-4 py-2">
                <div className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse"></div>
                  <span className="text-[10px] text-gray-500 font-medium">Mín: R$ 20,00</span>
                </div>
                <div className="h-4 w-px bg-gray-700"></div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] text-gray-500 font-medium">Máx: R$ 5.000,00</span>
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
            
            {/* Bonus Display */}
            {(customAmount || amount) && currentCoupon?.hasAppliedCoupon && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-2 relative group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#00E880]/20 to-[#00D470]/20 rounded-xl blur-lg group-hover:blur-xl transition-all duration-300"></div>
                <div className="relative overflow-hidden bg-gradient-to-br from-[#00E880]/10 via-[#00E880]/5 to-[#00D470]/10 backdrop-blur-sm rounded-xl p-2.5 border border-[#00E880]/30">
                  {/* Main bonus display */}
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-3 mb-2">
                      <div className="w-9 h-9 bg-gradient-to-br from-purple-600 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                        <Gift className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-3xl font-bold text-purple-500">
                        {(() => {
                          const value = parseFloat(customAmount || amount || "0");
                          const bonusTiers = [
                            { minAmount: 300, cards: 250 },
                            { minAmount: 200, cards: 150 },
                            { minAmount: 150, cards: 100 },
                            { minAmount: 100, cards: 60 },
                            { minAmount: 80, cards: 45 },
                            { minAmount: 60, cards: 30 },
                            { minAmount: 50, cards: 24 },
                            { minAmount: 40, cards: 12 },
                            { minAmount: 30, cards: 6 },
                            { minAmount: 20, cards: 3 }
                          ];
                          const tier = bonusTiers.find(t => value >= t.minAmount);
                          return tier ? tier.cards : 0;
                        })()}
                        <span className="text-lg ml-2">Mania Bônus</span>
                      </div>
                    </div>
                    
                    {/* Info text more visible */}
                    <p className="text-sm font-semibold text-purple-400 mb-2">
                      {(() => {
                        const value = parseFloat(customAmount || amount || "0");
                        if (value >= 300) return "Bônus máximo atingido!";
                        if (value >= 200) return "Deposite R$300 e ganhe +100 bônus!";
                        if (value >= 150) return "Deposite R$200 e ganhe +50 bônus!";
                        if (value >= 100) return "Deposite R$150 e ganhe +40 bônus!";
                        if (value >= 80) return "Deposite R$100 e ganhe +15 bônus!";
                        if (value >= 60) return "Deposite R$80 e ganhe +15 bônus!";
                        if (value >= 50) return "Deposite R$60 e ganhe +6 bônus!";
                        if (value >= 40) return "Deposite R$50 e ganhe +12 bônus!";
                        if (value >= 30) return "Deposite R$40 e ganhe +6 bônus!";
                        if (value >= 20) return "Deposite R$30 e ganhe +3 bônus!";
                        return "Quanto mais você deposita, mais bônus ganha!";
                      })()}
                    </p>
                    
                    {/* Progress bar */}
                    <div className="w-full bg-black/30 rounded-full h-2">
                      <motion.div 
                        className="bg-gradient-to-r from-purple-600 to-purple-500 h-2 rounded-full shadow-md"
                        initial={{ width: "0%" }}
                        animate={{ 
                          width: `${Math.min(100, (parseFloat(customAmount || amount || "0") / 300) * 100)}%` 
                        }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                  {/* Decorative element */}
                  <div className="absolute bottom-0 right-0 w-16 h-16 bg-gradient-to-tl from-[#00E880]/10 to-transparent rounded-tl-full"></div>
                </div>
              </motion.div>
            )}
          </div>



          {/* Generate PIX Button */}
          <div className="space-y-4">
            <button 
              type="submit" 
              disabled={createPixMutation.isPending || (!amount && !customAmount)}
              className="w-full bg-gradient-to-r from-[#00E880] to-[#00D470] hover:from-[#00D470] hover:to-[#00C560] text-white font-bold py-5 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none disabled:shadow-none"
            >
              <img src={pixIcon} alt="PIX" className="w-6 h-6" />
              <span className="text-lg text-[#000000]">{createPixMutation.isPending ? "Gerando PIX..." : "Gerar Pagamento PIX"}</span>
            </button>

            {/* Trust Badges */}
            <div className="flex items-center justify-center space-x-6 opacity-70">
              <div className="flex items-center space-x-1 text-xs text-gray-400">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Verificado</span>
              </div>
              <div className="flex items-center space-x-1 text-xs text-gray-400">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 1.414L10.586 9.5H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                </svg>
                <span>Instantâneo</span>
              </div>
            </div>
          </div>
        </form>
        </div>
        
        {/* Action Buttons */}
        <div className="mt-8 mb-4 space-y-4">
          {/* History Button */}
          <button
            type="button"
            onClick={() => setLocation("/wallet?tab=depositos")}
            className="w-full p-4 bg-gradient-to-b from-gray-800/30 to-gray-900/30 backdrop-blur-sm border border-gray-700/50 hover:border-gray-600 text-white rounded-2xl transition-all duration-300 transform hover:scale-[1.02] hover:bg-gray-800/50 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-green-600/10 to-green-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="flex items-center justify-center gap-3 relative z-10">
              <svg className="w-5 h-5 text-gray-500 group-hover:text-green-400 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <span className="text-sm font-semibold text-gray-300 group-hover:text-white transition-colors duration-300">Histórico de Depósitos</span>
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