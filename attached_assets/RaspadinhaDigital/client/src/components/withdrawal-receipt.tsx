import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileText, CheckCircle } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WithdrawalReceiptProps {
  withdrawal: {
    id: number;
    displayId: string;
    amount: string;
    pixKey: string;
    pixKeyType: string;
    endToEndId?: string;
    transactionHash?: string;
    originName?: string;
    originCnpj?: string;
    destinationName?: string;
    destinationDocument?: string;
    processedAt: string;
    userName?: string;
    userEmail?: string;
  };
  isModal?: boolean;
}

export function WithdrawalReceipt({ withdrawal, isModal = false }: WithdrawalReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(numValue);
  };

  const formatDocument = (doc: string | undefined) => {
    if (!doc) return "---";
    // Format CPF/CNPJ
    if (doc.length === 11) {
      return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    } else if (doc.length === 14) {
      return doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
    }
    return doc;
  };

  const formatPixKey = (key: string, type: string) => {
    if (!key) return "---";
    
    switch (type.toLowerCase()) {
      case "cpf":
        return formatDocument(key);
      case "cnpj":
        return formatDocument(key);
      case "phone":
      case "telefone":
        return key.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
      case "email":
        return key.toLowerCase();
      case "evp":
      case "random":
        return key;
      default:
        return key;
    }
  };

  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return;

    try {
      // Capture the receipt as canvas
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        backgroundColor: "#000000",
        logging: false,
        useCORS: true,
      });

      // Create PDF
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save(`comprovante-saque-${withdrawal.displayId}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  return (
    <div className={`${isModal ? "" : "container mx-auto p-4"} max-w-2xl`}>
      {/* Download Button */}
      <div className="mb-4 flex justify-end">
        <Button
          onClick={handleDownloadPDF}
          className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold"
        >
          <Download className="w-4 h-4 mr-2" />
          Baixar Comprovante PDF
        </Button>
      </div>

      {/* Receipt */}
      <div
        ref={receiptRef}
        className="bg-gradient-to-br from-zinc-900 via-black to-zinc-900 border border-zinc-800 rounded-lg p-6 md:p-8 text-white"
        data-testid="withdrawal-receipt"
      >
        {/* Header */}
        <div className="text-center mb-8 pb-6 border-b border-zinc-800">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2">Comprovante de Transferência PIX</h2>
          <p className="text-zinc-400">Transação realizada com sucesso</p>
        </div>

        {/* Transaction Details */}
        <div className="space-y-6">
          {/* Amount */}
          <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
            <p className="text-sm text-zinc-400 mb-1">Valor da Transferência</p>
            <p className="text-3xl font-bold text-green-400">
              {formatCurrency(withdrawal.amount)}
            </p>
          </div>

          {/* Transaction Info */}
          <div className="grid gap-4">
            <div className="bg-zinc-800/30 rounded-lg p-4">
              <p className="text-xs text-zinc-400 mb-1">Identificação</p>
              <p className="text-sm font-mono break-all">{withdrawal.endToEndId || "---"}</p>
            </div>

            <div className="bg-zinc-800/30 rounded-lg p-4">
              <p className="text-xs text-zinc-400 mb-1">Data e Hora do Pagamento</p>
              <p className="text-sm">
                {withdrawal.processedAt 
                  ? format(new Date(withdrawal.processedAt), "dd 'de' MMMM 'de' yyyy 'às' HH:mm:ss", {
                      locale: ptBR,
                    })
                  : "---"
                }
              </p>
            </div>
          </div>

          {/* Origin */}
          <div className="border-t border-zinc-800 pt-4">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">Dados do Pagador</h3>
            <div className="bg-zinc-800/30 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-zinc-400">Nome/Razão Social:</span>
                <span className="text-sm font-medium">
                  {withdrawal.originName || "Mania Brasil"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-zinc-400">CNPJ:</span>
                <span className="text-sm font-mono">
                  {withdrawal.originCnpj || "62.134.421/0001-62"}
                </span>
              </div>
            </div>
          </div>

          {/* Destination */}
          <div className="border-t border-zinc-800 pt-4">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">Dados do Recebedor</h3>
            <div className="bg-zinc-800/30 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-zinc-400">Tipo de Chave:</span>
                <span className="text-sm uppercase">{withdrawal.pixKeyType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-zinc-400">Chave PIX:</span>
                <span className="text-sm break-all">
                  {formatPixKey(withdrawal.pixKey, withdrawal.pixKeyType)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-zinc-800 pt-6 mt-6">
            <div className="text-center space-y-2">
              <p className="text-xs text-zinc-500">
                Este comprovante é válido como recibo de transferência PIX
              </p>
              <p className="text-xs text-zinc-500">
                Guarde este comprovante para sua segurança
              </p>
              <div className="pt-4">
                <p className="text-xs text-zinc-600">
                  © 2025 Mania Brasil - Todos os direitos reservados
                </p>
                <p className="text-xs text-zinc-600">
                  CNPJ: 62.134.421/0001-62
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}