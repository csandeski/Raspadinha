import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AffiliateLayout } from "@/components/affiliate/affiliate-layout";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Calendar,
  Search,
  Filter,
  X,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Users
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { subDays, isAfter } from "date-fns";
import { formatRelativeDate } from "@/lib/format-relative-date";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBRL } from "@/lib/format";
import { useLocation } from "wouter";

export function PainelAfiliadoEarnings() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [, setLocation] = useLocation();

  // Fetch earnings data with real-time updates
  const { data: earningsData, isLoading } = useQuery({
    queryKey: ['/api/affiliate/earnings'],
    queryFn: async () => {
      const token = localStorage.getItem('affiliateToken');
      const response = await fetch('/api/affiliate/earnings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch earnings');
      }
      
      const data = await response.json();
      return data;
    },
    refetchInterval: 5000, // Real-time updates every 5 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    staleTime: 0,
    retry: 3
  });

  // Apply filters - Only show deposit transactions
  const filteredEarnings = (earningsData?.transactions || []).filter((transaction: any) => {
    // Only show deposit transactions, ignore registration transactions
    if (transaction.conversionType === 'registration') {
      return false;
    }
    
    // Search filter
    const matchesSearch = searchTerm === "" || 
      transaction.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.userEmail?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Period filter
    const transactionDate = new Date(transaction.createdAt);
    const matchesPeriod = filterPeriod === "all" || 
      (filterPeriod === "today" && isAfter(transactionDate, subDays(new Date(), 1))) ||
      (filterPeriod === "7days" && isAfter(transactionDate, subDays(new Date(), 7))) ||
      (filterPeriod === "30days" && isAfter(transactionDate, subDays(new Date(), 30)));
    
    // Status filter
    const matchesStatus = filterStatus === "all" || 
      transaction.status === filterStatus;
    
    // Source filter
    const matchesSource = filterSource === "all" || 
      (filterSource === "affiliate" && transaction.source === "affiliate") ||
      (filterSource === "partner" && transaction.source === "partner");
    
    return matchesSearch && matchesPeriod && matchesStatus && matchesSource;
  });

  const hasActiveFilters = searchTerm !== "" || filterPeriod !== "all" || filterStatus !== "all" || filterSource !== "all";


  const clearFilters = () => {
    setSearchTerm("");
    setFilterPeriod("all");
    setFilterStatus("all");
    setFilterSource("all");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400 bg-green-900/20';
      case 'pending':
        return 'text-yellow-400 bg-yellow-900/20';
      case 'cancelled':
        return 'text-red-400 bg-red-900/20';
      default:
        return 'text-gray-400 bg-gray-900/20';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Pago';
      case 'pending':
        return 'Pendente';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  return (
    <AffiliateLayout activeSection="earnings">
      <div className="space-y-6">
        {/* Animated Background Elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-[#00E880]/10 to-transparent rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-600/10 to-transparent rounded-full blur-3xl animate-pulse delay-700" />
        </div>

        {/* Responsive Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-gray-900/50 to-gray-950/50 backdrop-blur-sm rounded-2xl p-4 md:p-6 mb-4"
        >
          <div className="flex items-center gap-3 md:gap-4">
            <div className="p-2 md:p-3 bg-gray-800 rounded-xl">
              <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-gray-400" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">Meus Ganhos</h1>
              <p className="text-gray-400 text-xs md:text-sm">Acompanhe todas as suas comissões e pagamentos</p>
            </div>
          </div>
        </motion.div>

        {/* Premium Stats Cards */}
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
                  <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-[#00E880]" />
                </div>
                <span className="text-[10px] md:text-xs text-gray-500">Total</span>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-white">
                {isLoading ? '...' : formatBRL(earningsData?.totalEarnings || 0)}
              </p>
              <p className="text-xs md:text-sm text-gray-400">Ganhos Totais</p>
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
                  <Clock className="w-5 h-5 md:w-6 md:h-6 text-yellow-400" />
                </div>
                <span className="text-[10px] md:text-xs text-gray-500">Aguardando</span>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-white">
                {isLoading ? '...' : formatBRL(earningsData?.pendingEarnings || 0)}
              </p>
              <p className="text-xs md:text-sm text-gray-400">Pendentes</p>
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
                  <XCircle className="w-5 h-5 md:w-6 md:h-6 text-red-400" />
                </div>
                <span className="text-[10px] md:text-xs text-gray-500">Cancelados</span>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-white">
                {isLoading ? '...' : formatBRL(earningsData?.cancelledEarnings || 0)}
              </p>
              <p className="text-xs md:text-sm text-gray-400">Não Pagos</p>
            </div>
          </motion.div>

        </div>

        {/* Premium Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="relative rounded-3xl overflow-hidden"
        >
          <div className="relative bg-[#1a1f2e] border border-gray-700 rounded-3xl p-4 md:p-6">
            <div className="space-y-3">
              {/* Search Input - Full Width on Mobile */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por usuário..."
                  className="pl-10 bg-gray-900/50 border-gray-700 text-white rounded-xl w-full"
                />
              </div>
              
              {/* Filters Row - Responsive Grid */}
              <div className="flex flex-wrap gap-2 md:gap-3">
                <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                  <SelectTrigger className="flex-1 min-w-[140px] md:w-[180px] bg-gray-900 border-gray-700 text-white">
                    <Calendar className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-950 border-gray-700">
                    <SelectItem value="all" className="text-white hover:bg-gray-900">Todos</SelectItem>
                    <SelectItem value="today" className="text-white hover:bg-gray-900">Hoje</SelectItem>
                    <SelectItem value="7days" className="text-white hover:bg-gray-900">Últimos 7 dias</SelectItem>
                    <SelectItem value="30days" className="text-white hover:bg-gray-900">Últimos 30 dias</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="flex-1 min-w-[140px] md:w-[180px] bg-gray-900 border-gray-700 text-white">
                    <Filter className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-950 border-gray-700">
                    <SelectItem value="all" className="text-white hover:bg-gray-900">Todos</SelectItem>
                    <SelectItem value="completed" className="text-white hover:bg-gray-900">Pagos</SelectItem>
                    <SelectItem value="pending" className="text-white hover:bg-gray-900">Pendentes</SelectItem>
                    <SelectItem value="cancelled" className="text-white hover:bg-gray-900">Cancelados</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={filterSource} onValueChange={setFilterSource}>
                  <SelectTrigger className="flex-1 min-w-[140px] md:w-[180px] bg-gray-900 border-gray-700 text-white">
                    <Users className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                    <SelectValue placeholder="Origem" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-950 border-gray-700">
                    <SelectItem value="all" className="text-white hover:bg-gray-900">Todos</SelectItem>
                    <SelectItem value="affiliate" className="text-white hover:bg-gray-900">Direto</SelectItem>
                    <SelectItem value="partner" className="text-white hover:bg-gray-900">Parceiros</SelectItem>
                  </SelectContent>
                </Select>
                
                {hasActiveFilters && (
                  <Button 
                    onClick={clearFilters}
                    variant="outline" 
                    className="min-w-[100px] md:min-w-[120px] border-gray-700 text-red-400 hover:bg-gray-900 hover:text-red-300"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Limpar
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Premium Transactions List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="relative rounded-3xl overflow-hidden"
        >
          <div className="relative bg-[#1a1f2e] border border-gray-700 rounded-3xl overflow-hidden">
            <div className="bg-gradient-to-r from-gray-900/50 to-gray-950/50 backdrop-blur-sm p-6 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Histórico de Comissões</h3>
                <span className="text-sm text-gray-400">
                  {filteredEarnings.length} {filteredEarnings.length === 1 ? 'transação' : 'transações'}
                </span>
              </div>
            </div>
            <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : filteredEarnings.length > 0 ? (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {filteredEarnings.map((transaction: any, i: number) => {
                  const isPartnerCommission = transaction.source === 'partner';
                  
                  return (
                    <motion.div
                      key={transaction.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02, duration: 0.3 }}
                      className="bg-gray-800/50 rounded-xl p-4 md:p-5 space-y-3 border border-gray-700/50 hover:bg-gray-800/60 hover:border-[#00E880]/30 transition-all"
                    >
                      {/* Header Row */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                            transaction.status === 'completed' ? 'bg-gradient-to-br from-[#00E880] to-green-600' :
                            transaction.status === 'pending' ? 'bg-gradient-to-br from-yellow-400 to-orange-600' :
                            transaction.status === 'cancelled' ? 'bg-gradient-to-br from-red-400 to-red-600' :
                            'bg-gradient-to-br from-gray-400 to-gray-600'
                          }`}>
                            <span className="text-white font-bold text-sm md:text-base">
                              {transaction.userName?.charAt(0).toUpperCase() || transaction.userEmail?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          </div>
                          {/* Name and Info */}
                          <div>
                            <p className="text-sm md:text-base font-medium text-white">
                              {transaction.userName || transaction.userEmail || `Usuário #${transaction.userId}`}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] md:text-xs text-gray-400">Usuário ID: {transaction.userId}</span>
                              <span className="text-[10px] md:text-xs text-gray-600">•</span>
                              <span className="text-[10px] md:text-xs text-purple-400">Ganho ID: {transaction.id}</span>
                              {isPartnerCommission && (
                                <>
                                  <span className="text-[10px] md:text-xs text-gray-600">•</span>
                                  <span className="text-[10px] md:text-xs text-orange-400">
                                    Via: {transaction.partnerName || transaction.partnerCode}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* Date and Status */}
                        <div className="text-right">
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${getStatusColor(transaction.status)} mb-1`}>
                            {getStatusIcon(transaction.status)}
                            <span className="text-[10px] md:text-xs font-medium">
                              {getStatusText(transaction.status)}
                            </span>
                          </div>
                          <p className="text-[10px] md:text-xs text-gray-500">
                            {formatRelativeDate(transaction.createdAt)}
                          </p>
                        </div>
                      </div>
                      
                      {/* Commission Info */}
                      <div className="pt-3 border-t border-gray-700/50">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] md:text-xs text-gray-500 mb-1">
                              {isPartnerCommission
                                ? 'Comissão do Parceiro'
                                : transaction.commissionType === 'fixed' 
                                  ? 'Comissão Fixa'
                                  : `Comissão ${transaction.commissionRate || 10}%`
                              }
                            </p>
                            <p className="text-xl md:text-2xl font-bold text-[#00E880]">
                              {formatBRL(transaction.commission || 0)}
                            </p>
                          </div>
                          {isPartnerCommission && transaction.partnerCommission && (
                            <div className="text-right">
                              <p className="text-[10px] md:text-xs text-gray-500 mb-1">Parceiro recebeu</p>
                              <p className="text-sm md:text-base font-semibold text-orange-400">
                                {formatBRL(transaction.partnerCommission)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <DollarSign className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">
                  {searchTerm || filterPeriod !== 'all' || filterStatus !== 'all' || filterSource !== 'all'
                    ? 'Nenhuma transação encontrada com os filtros aplicados' 
                    : 'Nenhuma comissão registrada ainda'}
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  {searchTerm || filterPeriod !== 'all' || filterStatus !== 'all' || filterSource !== 'all'
                    ? 'Tente ajustar os filtros'
                    : 'As comissões aparecerão aqui quando seus indicados fizerem depósitos'}
                </p>
              </div>
            )}
            </div>
          </div>
        </motion.div>
      </div>
    </AffiliateLayout>
  );
}