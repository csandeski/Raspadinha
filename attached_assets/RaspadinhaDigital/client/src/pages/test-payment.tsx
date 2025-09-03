import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { useLocation } from "wouter";

export default function TestPayment() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [transactionId, setTransactionId] = useState("");

  // Get pending deposits
  const { data: deposits } = useQuery({
    queryKey: ['/api/admin/deposits'],
    enabled: !!user,
  });

  // Test payment confirmation mutation
  const testWebhookMutation = useMutation({
    mutationFn: async (txId: string) => {
      const response = await fetch('/api/payments/confirm-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ transactionId: txId }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao confirmar pagamento');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Pagamento Confirmado!",
        description: "O webhook de teste foi enviado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/deposits'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/wallet'] });
      setTransactionId("");
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao enviar webhook de teste",
        variant: "destructive",
      });
    }
  });

  const pendingDeposits = (deposits as any[])?.filter((d: any) => d.status === 'pending') || [];

  return (
    <div className="min-h-screen bg-black p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-white">Teste de Pagamento PIX</h1>
        </div>

        {/* Info Card */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-8">
          <p className="text-yellow-500 text-sm">
            ⚠️ Esta é uma página de teste para simular confirmações de pagamento PIX. 
            Use apenas para desenvolvimento e testes.
          </p>
        </div>

        {/* Manual Test */}
        <div className="bg-gray-900 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Confirmar Pagamento Manual</h2>
          <div className="flex gap-3">
            <Input
              placeholder="ID da Transação"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              className="flex-1 bg-gray-800 border-gray-700 text-white"
            />
            <Button
              onClick={() => transactionId && testWebhookMutation.mutate(transactionId)}
              disabled={!transactionId || testWebhookMutation.isPending}
              className="bg-[#00E880] hover:bg-[#00D470] text-black font-bold"
            >
              {testWebhookMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              <span className="ml-2">Confirmar</span>
            </Button>
          </div>
        </div>

        {/* Pending Deposits List */}
        <div className="bg-gray-900 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Depósitos Pendentes ({pendingDeposits.length})
          </h2>
          
          {pendingDeposits.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Nenhum depósito pendente</p>
          ) : (
            <div className="space-y-3">
              {pendingDeposits.map((deposit: any) => (
                <div key={deposit.id} className="bg-gray-800 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">R$ {deposit.amount}</p>
                    <p className="text-gray-400 text-sm">ID: {deposit.transactionId}</p>
                    <p className="text-gray-500 text-xs">
                      {new Date(deposit.createdAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => testWebhookMutation.mutate(deposit.transactionId)}
                    disabled={testWebhookMutation.isPending}
                    className="bg-[#00E880] hover:bg-[#00D470] text-black font-bold"
                  >
                    Confirmar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}