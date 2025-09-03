import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  DollarSign,
  FileText,
  ArrowLeft,
  Calendar,
  Copy,
  Download,
  FileDown
} from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { WithdrawalReceipt } from "@/components/withdrawal-receipt";
import { generateWithdrawalReceipt } from "@/lib/withdrawal-receipt";

interface Withdrawal {
  id: number;
  displayId: string;
  amount: string;
  pixKey: string;
  pixKeyType: string;
  status: "pending" | "approved" | "rejected" | "cancelled" | "completed";
  requestedAt: string;
  processedAt?: string;
  adminNotes?: string;
  // Receipt fields
  endToEndId?: string;
  transactionHash?: string;
  originName?: string;
  originCnpj?: string;
  destinationName?: string;
  destinationDocument?: string;
}

export default function WithdrawalHistory() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);

  // Fetch user withdrawals
  const { data: withdrawals, isLoading } = useQuery<Withdrawal[]>({
    queryKey: ["/api/user/withdrawals"],
    queryFn: async () => {
      const response = await fetch("/api/user/withdrawals", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch withdrawals");
      return response.json();
    },
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(numValue);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Chave PIX copiada para a área de transferência",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
            <Clock className="w-3 h-3 mr-1" />
            Pendente
          </Badge>
        );
      case "approved":
      case "completed":
        return (
          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            Pago
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
            <XCircle className="w-3 h-3 mr-1" />
            Rejeitado
          </Badge>
        );
      case "cancelled":
        return (
          <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelado
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-900 text-white p-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => setLocation("/profile")}
              className="text-zinc-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-3xl font-bold text-[#00E880]">
              Histórico de Saques
            </h1>
          </div>
        </div>

        {/* Withdrawals List */}
        <Card className="bg-black/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-xl text-white">
              Suas Solicitações de Saque
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-12 h-12 border-4 border-[#00E880] border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-zinc-400">Carregando saques...</p>
              </div>
            ) : withdrawals && withdrawals.length > 0 ? (
              <div className="space-y-4">
                {withdrawals.map((withdrawal) => (
                  <motion.div
                    key={withdrawal.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4"
                    data-testid={`withdrawal-${withdrawal.id}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-sm text-zinc-400 mb-1">ID do Saque</p>
                        <p className="text-white font-bold text-lg">#{withdrawal.displayId}</p>
                      </div>
                      {getStatusBadge(withdrawal.status)}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-zinc-400 mb-1">Valor</p>
                        <p className="text-[#00E880] font-bold text-xl">
                          {formatCurrency(withdrawal.amount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-400 mb-1">Data da Solicitação</p>
                        <p className="text-white flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(withdrawal.requestedAt)}
                        </p>
                      </div>
                    </div>

                    <div className="bg-black/30 rounded-lg p-3 mb-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-xs text-zinc-400 mb-1">Chave PIX</p>
                          <p className="text-white font-mono text-sm">{withdrawal.pixKey}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(withdrawal.pixKey)}
                          className="text-zinc-400 hover:text-white"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {withdrawal.processedAt && (
                      <div className="mb-4">
                        <p className="text-xs text-zinc-400 mb-1">Processado em</p>
                        <p className="text-white">{formatDate(withdrawal.processedAt)}</p>
                      </div>
                    )}

                    {withdrawal.adminNotes && (
                      <div className="bg-zinc-800/50 rounded-lg p-3 mb-4">
                        <p className="text-xs text-zinc-400 mb-1">Observações</p>
                        <p className="text-white text-sm">{withdrawal.adminNotes}</p>
                      </div>
                    )}

                    {/* Receipt Button for Approved/Completed Withdrawals */}
                    {(withdrawal.status === "approved" || withdrawal.status === "completed") && (
                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          className="bg-green-500/10 text-green-400 hover:bg-green-500/20 border-green-500/20"
                          onClick={() => {
                            const receiptData = {
                              id: withdrawal.displayId,
                              amount: withdrawal.amount,
                              pixKey: withdrawal.pixKey,
                              pixKeyType: withdrawal.pixKeyType === 'cpf' ? 'CPF' :
                                         withdrawal.pixKeyType === 'cnpj' ? 'CNPJ' :
                                         withdrawal.pixKeyType === 'phone' ? 'Telefone' :
                                         withdrawal.pixKeyType === 'email' ? 'E-mail' :
                                         withdrawal.pixKeyType === 'random' ? 'Aleatória' : 'Chave PIX',
                              status: 'Pago',
                              requestedAt: withdrawal.requestedAt,
                              processedAt: withdrawal.processedAt || withdrawal.requestedAt,
                              endToEndId: withdrawal.endToEndId || '',
                              type: 'player' as 'player'
                            };
                            generateWithdrawalReceipt(receiptData);
                            toast({
                              title: "Comprovante gerado!",
                              description: "O PDF do comprovante foi baixado com sucesso.",
                              duration: 3000
                            });
                          }}
                          data-testid={`button-receipt-${withdrawal.id}`}
                        >
                          <FileDown className="w-4 h-4 mr-2" />
                          Comprovante
                        </Button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="w-8 h-8 text-zinc-600" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-300 mb-2">
                  Nenhum saque realizado
                </h3>
                <p className="text-sm text-zinc-500">
                  Você ainda não solicitou nenhum saque
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Receipt Modal */}
        <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-black/95 border-zinc-800">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-[#00E880]">
                Comprovante de Transferência PIX
              </DialogTitle>
              <DialogDescription className="text-zinc-400">
                Saque #{selectedWithdrawal?.displayId}
              </DialogDescription>
            </DialogHeader>
            {selectedWithdrawal && (
              <WithdrawalReceipt 
                withdrawal={{
                  ...selectedWithdrawal,
                  userName: "Você", // User's own name will be filled from backend
                }} 
                isModal={true} 
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}