import { useQuery } from "@tanstack/react-query";
import { PartnerLayout } from "@/components/partner/partner-layout";
import { Card } from "@/components/ui/card";
import { formatBRL } from "@/lib/format";
import { Loader2 } from "lucide-react";

export default function ParceirosDebug() {
  const { data: debugData, isLoading, error } = useQuery({
    queryKey: ['/api/partner/debug-wallet'],
    queryFn: async () => {
      const token = localStorage.getItem('partnerToken');
      const response = await fetch('/api/partner/debug-wallet', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch debug data');
      return response.json();
    }
  });

  if (isLoading) {
    return (
      <PartnerLayout activeSection="debug">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </PartnerLayout>
    );
  }

  if (error) {
    return (
      <PartnerLayout activeSection="debug">
        <Card className="p-6 bg-red-950/50 border-red-900">
          <p className="text-red-400">Erro ao carregar dados de debug: {error.message}</p>
        </Card>
      </PartnerLayout>
    );
  }

  return (
    <PartnerLayout activeSection="debug">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white mb-6">Debug - Informações da Carteira</h1>
        
        {/* Partner Info */}
        <Card className="p-6 bg-gray-900/50 border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Informações do Parceiro</h2>
          <div className="space-y-2 text-gray-300">
            <p>ID: {debugData?.partner?.id}</p>
            <p>Nome: {debugData?.partner?.name}</p>
            <p>Tipo de Comissão: {debugData?.partner?.commissionType}</p>
            <p>Taxa: {debugData?.partner?.commissionRate}%</p>
            <p>Valor Fixo: R$ {debugData?.partner?.fixedCommissionAmount}</p>
          </div>
        </Card>

        {/* Wallet Info */}
        <Card className="p-6 bg-gray-900/50 border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Carteira (partners_wallet)</h2>
          <div className="space-y-2 text-gray-300">
            <p className="text-xl">Saldo Atual: <span className="text-[#00E880] font-bold">{formatBRL(parseFloat(debugData?.wallet?.balance || '0'))}</span></p>
            <p>Total Ganho: {formatBRL(parseFloat(debugData?.wallet?.totalEarned || '0'))}</p>
            <p>Total Sacado: {formatBRL(parseFloat(debugData?.wallet?.totalWithdrawn || '0'))}</p>
            <p>Última Transação: {debugData?.wallet?.lastTransactionAt || 'Nunca'}</p>
          </div>
        </Card>

        {/* Conversions Summary */}
        <Card className="p-6 bg-gray-900/50 border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Resumo das Comissões (partner_conversions)</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-800/50 p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Pendentes</p>
              <p className="text-yellow-400 font-bold text-xl">{debugData?.conversions?.pending || 0}</p>
              <p className="text-gray-400 text-sm">{formatBRL(parseFloat(debugData?.conversions?.totalPendingAmount || '0'))}</p>
            </div>
            <div className="bg-gray-800/50 p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Aprovadas</p>
              <p className="text-[#00E880] font-bold text-xl">{debugData?.conversions?.completed || 0}</p>
              <p className="text-gray-400 text-sm">{formatBRL(parseFloat(debugData?.conversions?.totalCompletedAmount || '0'))}</p>
            </div>
            <div className="bg-gray-800/50 p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Canceladas</p>
              <p className="text-red-400 font-bold text-xl">{debugData?.conversions?.cancelled || 0}</p>
              <p className="text-gray-400 text-sm">{formatBRL(parseFloat(debugData?.conversions?.totalCancelledAmount || '0'))}</p>
            </div>
          </div>
        </Card>

        {/* Balance Calculation */}
        <Card className="p-6 bg-gray-900/50 border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Cálculo do Saldo</h2>
          <div className="space-y-2 text-gray-300">
            <p>Total de Comissões Aprovadas: {formatBRL(parseFloat(debugData?.conversions?.totalCompletedAmount || '0'))}</p>
            <p>- Total Sacado: {formatBRL(parseFloat(debugData?.wallet?.totalWithdrawn || '0'))}</p>
            <p className="text-xl font-bold">= Saldo Esperado: <span className="text-[#00E880]">{formatBRL(parseFloat(debugData?.expectedBalance || '0'))}</span></p>
            <p className="mt-4 text-yellow-400">
              {parseFloat(debugData?.wallet?.balance || '0') !== parseFloat(debugData?.expectedBalance || '0') && 
                `⚠️ Divergência detectada! Saldo na carteira: ${formatBRL(parseFloat(debugData?.wallet?.balance || '0'))}`
              }
            </p>
          </div>
        </Card>

        {/* Recent Conversions */}
        <Card className="p-6 bg-gray-900/50 border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Últimas Comissões</h2>
          <div className="space-y-2">
            {debugData?.conversions?.recentConversions?.map((conv: any) => (
              <div key={conv.id} className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
                <div>
                  <p className="text-gray-300">Usuário #{conv.userId}</p>
                  <p className="text-xs text-gray-500">{new Date(conv.createdAt).toLocaleString('pt-BR')}</p>
                </div>
                <div className="text-right">
                  <p className="text-[#00E880] font-bold">{formatBRL(parseFloat(conv.partnerCommission))}</p>
                  <p className={`text-xs ${
                    conv.status === 'completed' || conv.status === 'approved' ? 'text-green-400' :
                    conv.status === 'pending' ? 'text-yellow-400' : 'text-red-400'
                  }`}>{conv.status}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PartnerLayout>
  );
}