import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { createPixPayment, verifyPixPayment, generateQRCodeDataURL } from "../lib/pix";
import { useAuth } from "../lib/auth.tsx";

interface PixPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  onSuccess: (newBalance: string) => void;
}

export default function PixPaymentModal({ 
  isOpen, 
  onClose, 
  amount, 
  onSuccess 
}: PixPaymentModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const { toast } = useToast();
  const { updateUser, user } = useAuth();

  useEffect(() => {
    if (isOpen && !paymentData) {
      handleCreatePayment();
    }
  }, [isOpen]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (paymentData && !isVerifying) {
      interval = setInterval(() => {
        handleVerifyPayment();
      }, 5000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [paymentData, isVerifying]);

  const handleCreatePayment = async () => {
    setIsLoading(true);
    try {
      const data = await createPixPayment(amount);
      setPaymentData(data);
      
      toast({
        title: "PIX Criado!",
        description: "Escaneie o QR Code ou copie o código PIX",
        duration: 3000,
      });
    } catch (error) {
      console.error("Error creating PIX:", error);
      toast({
        title: "Erro",
        description: "Erro ao criar pagamento PIX",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPayment = async () => {
    if (!paymentData || isVerifying) return;
    
    setIsVerifying(true);
    try {
      const result = await verifyPixPayment(paymentData.transactionId);
      
      if (result.status === "completed") {
        toast({
          title: "Pagamento Confirmado!",
          description: "Seu saldo foi atualizado com sucesso",
          duration: 5000,
        });
        
        if (result.newBalance && user) {
          updateUser({ ...user, balance: result.newBalance });
        }
        
        onSuccess(result.newBalance || "0.00");
        onClose();
      }
    } catch (error) {
      console.error("Error verifying PIX:", error);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCopyPixCode = () => {
    if (paymentData?.qrCode) {
      navigator.clipboard.writeText(paymentData.qrCode);
      toast({
        title: "Código Copiado!",
        description: "Código PIX copiado para a área de transferência",
        duration: 2000,
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-gray-800 mb-2">Pagamento PIX</h3>
          <p className="text-gray-600">Escaneie o QR Code ou copie o código</p>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="loading-spinner mx-auto"></div>
            <p className="text-gray-600 mt-4">Gerando PIX...</p>
          </div>
        ) : paymentData ? (
          <>
            <div className="qr-code-container mb-4">
              <img 
                src={generateQRCodeDataURL(paymentData.qrCode)}
                alt="QR Code PIX"
                className="w-48 h-48 mx-auto mb-4"
              />
              <p className="text-sm text-gray-600 mb-2">
                Valor: <span className="font-semibold text-green-600">R$ {amount.toFixed(2)}</span>
              </p>
            </div>

            <div className="pix-code-container mb-4">
              <span className="text-sm text-gray-600 font-mono truncate">
                {paymentData.qrCode.substring(0, 30)}...
              </span>
              <button 
                className="text-primary hover:text-orange-400"
                onClick={handleCopyPixCode}
              >
                <i className="fas fa-copy"></i>
              </button>
            </div>

            <div className="text-center mb-4">
              <div className="payment-status">
                <i className="fas fa-clock mr-2"></i>
                {isVerifying ? "Verificando..." : "Aguardando pagamento..."}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-red-600">Erro ao gerar PIX</p>
          </div>
        )}

        <div className="flex space-x-3">
          <button 
            className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button 
            className="flex-1 btn-primary"
            onClick={handleVerifyPayment}
            disabled={!paymentData || isVerifying}
          >
            {isVerifying ? "Verificando..." : "Verificar Pagamento"}
          </button>
        </div>
      </div>
    </div>
  );
}
