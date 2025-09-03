import { useState } from "react";
import { useAuth } from "../lib/auth.tsx";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import PixPaymentModal from "../components/pix-payment";

export default function Deposit() {
  const { user, updateUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPixModal, setShowPixModal] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(0);

  const depositOptions = [
    { amount: 5, label: "R$ 5,00", description: "Valor mínimo" },
    { amount: 10, label: "R$ 10,00", description: "Mais popular" },
    { amount: 20, label: "R$ 20,00", description: "Bom valor" },
    { amount: 50, label: "R$ 50,00", description: "Maior valor" },
  ];

  const handleDepositSelect = (amount: number) => {
    if (!user) {
      toast({
        title: "Login Necessário",
        description: "Faça login para fazer depósitos",
        variant: "destructive",
      });
      setLocation("/login");
      return;
    }

    setSelectedAmount(amount);
    setShowPixModal(true);
  };

  const handlePaymentSuccess = (newBalance: string) => {
    if (user) {
      updateUser({ ...user, balance: newBalance });
    }
    
    toast({ description: "R$ ${selectedAmount.toFixed(2)} foram adicionados ao seu saldo" });
    
    setShowPixModal(false);
  };

  return (
    <div className="content-container">
      <div className="max-w-md mx-auto">
        {/* Deposit Banner */}
        <div className="mb-6">
          <img 
            src="https://raspadinhadasorte.site/images/banners/1752257911.webp" 
            alt="Deposit Banner" 
            className="w-full h-48 object-contain rounded-xl bg-gray-900"
          />
        </div>

        {/* Current Balance */}
        {user && (
          <div className="glass-effect rounded-xl p-6 mb-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Saldo Atual</h2>
              <div className="balance-widget justify-center text-lg">
                <i className="fas fa-wallet"></i>
                <span>R$ {user.balance}</span>
              </div>
            </div>
          </div>
        )}

        {/* Deposit Options */}
        <div className="glass-effect rounded-xl p-6 mb-6">
          <h3 className="text-xl font-bold text-white mb-4 text-center">
            Escolha o Valor do Depósito
          </h3>
          
          <div className="space-y-3">
            {depositOptions.map((option) => (
              <button
                key={option.amount}
                className="w-full glass-effect rounded-lg p-4 text-left glass-hover transition-all duration-200"
                onClick={() => handleDepositSelect(option.amount)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-semibold text-lg">{option.label}</p>
                    <p className="text-white/60 text-sm">{option.description}</p>
                  </div>
                  <div className="text-primary">
                    <i className="fas fa-qrcode text-2xl"></i>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Payment Info */}
        <div className="glass-effect rounded-xl p-6 mb-6">
          <h3 className="text-lg font-bold text-white mb-3">Como Funciona</h3>
          <div className="space-y-3 text-white/80 text-sm">
            <div className="flex items-start space-x-3">
              <i className="fas fa-check-circle text-green-400 mt-1"></i>
              <p>Escolha o valor desejado</p>
            </div>
            <div className="flex items-start space-x-3">
              <i className="fas fa-qrcode text-blue-400 mt-1"></i>
              <p>Escaneie o QR Code ou copie o código PIX</p>
            </div>
            <div className="flex items-start space-x-3">
              <i className="fas fa-bolt text-yellow-400 mt-1"></i>
              <p>Pagamento é processado instantaneamente</p>
            </div>
            <div className="flex items-start space-x-3">
              <i className="fas fa-play text-primary mt-1"></i>
              <p>Comece a jogar imediatamente</p>
            </div>
          </div>
        </div>

        {/* Security Info */}
        <div className="glass-effect rounded-xl p-6">
          <div className="text-center">
            <i className="fas fa-shield-alt text-green-400 text-3xl mb-3"></i>
            <h3 className="text-lg font-bold text-white mb-2">Pagamento Seguro</h3>
            <p className="text-white/80 text-sm">
              Utilizamos a tecnologia PIX para garantir transações seguras e instantâneas
            </p>
          </div>
        </div>

        {/* Back Button */}
        <div className="text-center mt-6">
          <Button 
            className="btn-secondary"
            onClick={() => setLocation("/")}
          >
            <i className="fas fa-home mr-2"></i>
            Voltar ao Início
          </Button>
        </div>
      </div>

      {/* PIX Payment Modal */}
      <PixPaymentModal
        isOpen={showPixModal}
        onClose={() => setShowPixModal(false)}
        amount={selectedAmount}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
