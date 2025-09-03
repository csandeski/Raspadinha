import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Copy, Check, Clock } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "../lib/queryClient";
import logoImg from "/logos/logomania.svg";

interface PixPaymentProps {
  pixData: {
    transactionId: string;
    qrCode: string;
    amount: number;
    depositId: number;
    createdAt?: string;
  };
  onComplete: () => void;
  onSuccess?: () => void;
}

export default function PixPayment({ pixData, onComplete, onSuccess }: PixPaymentProps) {
  const [copied, setCopied] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [bonusReceived, setBonusReceived] = useState(0);
  
  // Calculate initial time left based on createdAt if resuming a payment
  const calculateInitialTime = () => {
    if (pixData.createdAt) {
      const created = new Date(pixData.createdAt).getTime();
      const now = new Date().getTime();
      const elapsed = Math.floor((now - created) / 1000);
      const remaining = 1800 - elapsed; // 30 minutes - elapsed time
      return Math.max(0, remaining);
    }
    return 1800; // 30 minutes for new payments
  };
  
  const [timeLeft, setTimeLeft] = useState(calculateInitialTime());
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Fast status check every 2 seconds
  useEffect(() => {
    const fastCheckTimer = setInterval(async () => {
      try {
        const response = await fetch(`/api/payments/status/${pixData.transactionId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.completed) {
            // Payment confirmed! Trigger the full verification
            verifyMutation.mutate();
            clearInterval(fastCheckTimer);
          }
        }
      } catch (error) {
        console.error('Fast status check error:', error);
      }
    }, 2000);

    // Also keep the regular verification every 10 seconds as backup
    const verifyTimer = setInterval(() => {
      verifyMutation.mutate();
    }, 10000);

    return () => {
      clearInterval(fastCheckTimer);
      clearInterval(verifyTimer);
    };
  }, [pixData.transactionId]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const verifyMutation = useMutation({
    mutationFn: () => 
      apiRequest('/api/payments/verify-pix', 'POST', { 
        transactionId: pixData.transactionId 
      }),
    onSuccess: (data) => {
      if (data.status === 'completed') {
        // Fire Facebook Pixel event
        if (typeof window !== 'undefined' && (window as any).fbq) {
          (window as any).fbq('track', 'Purchase', {
            value: pixData.amount,
            currency: 'BRL',
            content_type: 'deposit',
            content_ids: [pixData.depositId]
          });
        }
        
        // Check if SORTE coupon bonus was applied
        const depositAmount = Math.floor(pixData.amount);
        // Backend adds 100% bonus for SORTE coupon users on first deposit
        setBonusReceived(depositAmount);
        
        queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
        queryClient.invalidateQueries({ queryKey: ['/api/user/balance'] });
        if (onSuccess) {
          onSuccess();
        } else {
          setPaymentSuccess(true);
        }
      }
    },
    onError: (error: any) => {
      console.error('Erro ao verificar pagamento:', error);
    },
  });

  const manualVerifyMutation = useMutation({
    mutationFn: () => 
      apiRequest('/api/payments/verify-pix', 'POST', { 
        transactionId: pixData.transactionId 
      }),
    onSuccess: (data) => {
      if (data.status === 'completed') {
        // Fire Facebook Pixel event
        if (typeof window !== 'undefined' && (window as any).fbq) {
          (window as any).fbq('track', 'Purchase', {
            value: pixData.amount,
            currency: 'BRL',
            content_type: 'deposit',
            content_ids: [pixData.depositId]
          });
        }
        
        // Check if SORTE coupon bonus was applied
        const depositAmount = Math.floor(pixData.amount);
        // Backend adds 100% bonus for SORTE coupon users on first deposit
        setBonusReceived(depositAmount);
        
        queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
        queryClient.invalidateQueries({ queryKey: ['/api/user/balance'] });
        if (onSuccess) {
          onSuccess();
        } else {
          setPaymentSuccess(true);
        }
      } else {
        toast({ description: "Por favor, complete o pagamento PIX" });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao verificar pagamento",
        variant: "destructive",
      });
    },
  });

  // Fake approval mutation for testing
  const fakeApprovalMutation = useMutation({
    mutationFn: async () => {
      // Call the test endpoint to simulate payment confirmation
      const response = await fetch('/api/test/approve-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          transactionId: pixData.transactionId,
          depositId: pixData.depositId,
          amount: pixData.amount
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to simulate approval');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "✅ Pagamento aprovado (TESTE)",
        description: "Simulação de webhook enviada com sucesso",
      });
      
      // Wait a moment then trigger verification
      setTimeout(() => {
        verifyMutation.mutate();
      }, 1000);
    },
    onError: (error) => {
      toast({
        title: "Erro na simulação",
        description: "Falha ao simular aprovação",
        variant: "destructive",
      });
    }
  });

  const handleFakeApproval = () => {
    fakeApprovalMutation.mutate();
  };

  const cancelMutation = useMutation({
    mutationFn: () => 
      apiRequest('/api/payments/cancel-pix', 'POST', { 
        transactionId: pixData.transactionId 
      }),
    onSuccess: () => {
      toast({ description: "PIX cancelado. Você pode criar um novo pagamento." });
      // Invalidate pending PIX query to refresh the state
      queryClient.invalidateQueries({ queryKey: ['/api/payments/pending-pix'] });
      onComplete();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao cancelar pagamento",
        variant: "destructive",
      });
    },
  });

  // Test payment simulation mutation
  const simulatePaymentMutation = useMutation({
    mutationFn: () => 
      apiRequest('/api/payments/simulate-success', 'POST', { 
        transactionId: pixData.transactionId 
      }),
    onSuccess: (data) => {
      if (data.status === 'completed' || data.status === 'already_completed') {
        // Fire Facebook Pixel event
        if (typeof window !== 'undefined' && (window as any).fbq) {
          (window as any).fbq('track', 'Purchase', {
            value: pixData.amount,
            currency: 'BRL',
            content_type: 'deposit',
            content_ids: [pixData.depositId]
          });
        }
        
        // Check if SORTE coupon bonus was applied
        const depositAmount = Math.floor(pixData.amount);
        setBonusReceived(depositAmount);
        
        queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
        queryClient.invalidateQueries({ queryKey: ['/api/user/balance'] });
        if (onSuccess) {
          onSuccess();
        } else {
          setPaymentSuccess(true);
        }
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao simular pagamento",
        variant: "destructive",
      });
    },
  });

  const handleCopyCode = () => {
    navigator.clipboard.writeText(pixData.qrCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    toast({ description: "Cole no seu aplicativo bancário" });
  };

  // Generate QR Code URL using a public API
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixData.qrCode)}`;

  // Success Screen
  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-[#0E1015] text-white pb-20 md:pb-0 flex flex-col">
        {/* Header */}
        <header className="bg-[#0E1015] border-b border-gray-800">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center space-x-3">
                <h1 className="text-lg font-medium">Pagamento Confirmado</h1>
              </div>
              
              <img 
                src={logoImg} 
                alt="Raspadinha da Sorte" 
                className="h-10 drop-shadow-2xl"
              />
            </div>
          </div>
        </header>

        {/* Success Content */}
        <div className="flex-1 flex items-center justify-center px-4 pt-20">
          <div className="max-w-md w-full text-center">
            {/* Success Animation */}
            <div className="mb-8">
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

            {/* Success Details */}
            <div className="bg-gray-900/50 rounded-xl p-6 mb-8 border border-gray-800">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Valor:</span>
                  <span className="text-white font-medium">R$ {pixData.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">ID:</span>
                  <span className="text-white font-mono text-sm">{pixData.depositId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Data:</span>
                  <span className="text-white">{new Date().toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
            </div>

            {/* Bonus Raspadinhas Display */}
            {bonusReceived > 0 && (
              <div className="mb-8">
                <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-xl p-6 border border-purple-500/30">
                  <div className="text-center">
                    <div className="mb-3">
                      <span className="text-5xl">🎁</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">
                      Parabéns! Você ganhou
                    </h3>
                    <div className="text-4xl font-black text-[#00E880] mb-2">
                      {bonusReceived}
                    </div>
                    <p className="text-lg text-white mb-2">
                      Raspadinhas Bônus
                    </p>
                    <p className="text-sm text-gray-400">
                      Sem rollover - ganhou, é seu!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Button */}
            <button
              onClick={async () => {
                // Wait a bit to ensure balance updates are processed
                await new Promise(resolve => setTimeout(resolve, 300));
                setLocation('/wallet');
              }}
              className="w-full bg-gradient-to-r from-[#00E880] to-[#00D470] hover:from-[#00D470] hover:to-[#00C560] text-black font-bold py-4 rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-lg flex items-center justify-center space-x-2"
            >
              <span>Ir para Carteira</span>
              <ArrowLeft className="w-5 h-5 rotate-180" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0E1015] text-white pb-20 md:pb-0">
      {/* Header */}
      <header className="bg-[#0E1015] border-b border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center space-x-3">
              <button 
                onClick={onComplete}
                className="p-2 hover:bg-gray-900 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-lg font-medium">Pagamento PIX</h1>
            </div>
            
            <img 
              src={logoImg} 
              alt="Raspadinha da Sorte" 
              className="h-10 drop-shadow-2xl"
            />
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-6">
        {/* Payment Info Card */}
        <div className="bg-gray-900 rounded-xl p-6 mb-6">
          <div className="text-center mb-6">
            <p className="text-gray-400 text-sm mb-1">Valor do depósito:</p>
            <p className="text-3xl font-bold text-white">R$ {pixData.amount.toFixed(2)}</p>
            
            <div className="flex items-center justify-center space-x-2 mt-4 text-gray-400">
              <Clock className="w-4 h-4" />
              <p className="text-sm">O pagamento expira em: {formatTime(timeLeft)}</p>
            </div>
          </div>

          {/* QR Code */}
          <div className="bg-white rounded-xl p-4 mb-6">
            <img 
              src={qrCodeUrl} 
              alt="QR Code PIX" 
              className="w-full h-auto max-w-[250px] mx-auto"
            />
          </div>

          {/* Copy Code Section */}
          <div className="mb-6">
            <p className="text-center text-gray-400 text-sm mb-3">Ou copie o código PIX:</p>
            <div className="bg-gray-800 rounded-lg p-3 mb-3 relative">
              <code className="text-xs text-gray-300 block pr-12 truncate">
                {pixData.qrCode}
              </code>
              <button
                onClick={handleCopyCode}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#00E880] hover:bg-[#00D470] rounded-lg transition-colors"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-black" />
                ) : (
                  <Copy className="w-4 h-4 text-black" />
                )}
              </button>
            </div>
          </div>

          {/* Instructions List */}
          <div className="space-y-3 text-sm">
            <div className="flex items-start space-x-2">
              <span className="text-gray-500 font-medium">1.</span>
              <p className="text-gray-300">Abra o aplicativo do seu banco</p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-gray-500 font-medium">2.</span>
              <p className="text-gray-300">Escolha a opção "Pagar com PIX"</p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-gray-500 font-medium">3.</span>
              <p className="text-gray-300">Escaneie o QR code ou cole o código copiado</p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-gray-500 font-medium">4.</span>
              <p className="text-gray-300">Confirme as informações e finalize o pagamento</p>
            </div>
          </div>
        </div>

        {/* Payment Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => manualVerifyMutation.mutate()}
            disabled={manualVerifyMutation.isPending}
            className="flex-1 bg-gradient-to-r from-[#00E880] to-[#00D470] hover:from-[#00D470] hover:to-[#00C560] text-black font-bold py-4 rounded-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {manualVerifyMutation.isPending ? "Verificando..." : "Já fiz o pagamento"}
          </button>
          
          <button
            onClick={() => {
              // Just close the modal without canceling the PIX
              onComplete();
            }}
            className="flex-1 bg-gradient-to-b from-gray-800/50 to-gray-900/50 hover:from-gray-700/50 hover:to-gray-800/50 text-gray-300 hover:text-white font-bold py-4 rounded-xl transition-all duration-300 transform hover:scale-[1.02] border border-gray-700/50 hover:border-gray-600/50"
          >
            Voltar
          </button>
        </div>

        {/* TEST ONLY - Fake Approval Button - TEMPORARIAMENTE DESABILITADO */}
        {/* <div className="mt-8 border-t border-gray-800 pt-6">
          <p className="text-center text-yellow-500 text-xs mb-3">⚠️ TESTE APENAS - REMOVER EM PRODUÇÃO</p>
          <button
            onClick={handleFakeApproval}
            disabled={fakeApprovalMutation.isPending}
            className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-3 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {fakeApprovalMutation.isPending ? "Aprovando..." : "🧪 Aprovar Fake (TESTE)"}
          </button>
        </div> */}
        
      </div>

    </div>
  );
}