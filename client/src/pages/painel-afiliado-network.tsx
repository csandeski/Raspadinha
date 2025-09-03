import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AffiliateLayout } from "@/components/affiliate/affiliate-layout";
import { Users, UserPlus, TrendingUp, Award, Loader2, Search, Filter, Hash, Calendar, X, DollarSign, Eye, Phone, Mail, CreditCard, Wallet, ChevronDown, ChevronUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatBRL } from "@/lib/format";
import { formatZeroValue, formatStatValue } from "@/lib/format-zero-values";
import { subDays, isAfter } from "date-fns";
import { formatRelativeDate } from "@/lib/format-relative-date";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function PainelAfiliadoNetwork() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [filterDeposits, setFilterDeposits] = useState("all");
  const [filterSource, setFilterSource] = useState("all"); // New filter for source
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [, setLocation] = useLocation();
  
  const { data: networkData, isLoading } = useQuery({
    queryKey: ['/api/affiliate/network'],
    queryFn: async () => {
      const token = localStorage.getItem('affiliateToken');
      const response = await fetch('/api/affiliate/network', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch network data');
      }
      
      return response.json();
    },
    refetchInterval: 5000, // Real-time updates every 5 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    staleTime: 0,
    retry: 3
  });

  // Filter users based on search term and filters
  const filteredUsers = networkData?.recentReferrals?.filter((user: any) => {
    // Search filter
    const search = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || (
      user.name.toLowerCase().includes(search) ||
      user.code.toLowerCase().includes(search) ||
      user.id.toString().includes(search)
    );
    
    // Period filter
    let matchesPeriod = true;
    if (filterPeriod !== "all") {
      const userDate = new Date(user.date);
      const now = new Date();
      
      switch (filterPeriod) {
        case "today":
          matchesPeriod = userDate.toDateString() === now.toDateString();
          break;
        case "7days":
          matchesPeriod = isAfter(userDate, subDays(now, 7));
          break;
        case "30days":
          matchesPeriod = isAfter(userDate, subDays(now, 30));
          break;
      }
    }
    
    // Deposits filter
    let matchesDeposits = true;
    if (filterDeposits === "with") {
      matchesDeposits = user.totalDeposits > 0;
    } else if (filterDeposits === "without") {
      matchesDeposits = user.totalDeposits === 0;
    }
    
    // Source filter (affiliate or partner)
    let matchesSource = true;
    if (filterSource === "affiliate") {
      matchesSource = !user.isFromPartner;
    } else if (filterSource === "partner") {
      matchesSource = user.isFromPartner;
    }
    
    return matchesSearch && matchesPeriod && matchesDeposits && matchesSource;
  }) || [];

  const clearFilters = () => {
    setSearchTerm("");
    setFilterPeriod("all");
    setFilterDeposits("all");
    setFilterSource("all");
  };

  const hasActiveFilters = filterPeriod !== "all" || filterDeposits !== "all" || filterSource !== "all" || searchTerm !== "";

  return (
    <AffiliateLayout activeSection="network">
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
              <Users className="w-5 h-5 md:w-6 md:h-6 text-gray-400" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">Minha Rede</h1>
              <p className="text-gray-400 text-xs md:text-sm">Acompanhe o crescimento da sua rede de afiliados</p>
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
                  <Users className="w-5 h-5 md:w-6 md:h-6 text-purple-400" />
                </div>
                <span className="text-[10px] md:text-xs text-gray-500">Total</span>
              </div>
              {isLoading ? (
                <div>
                  <p className="text-2xl md:text-3xl font-bold text-white">...</p>
                  <p className="text-xs md:text-sm text-gray-400">Carregando...</p>
                </div>
              ) : networkData?.directReferrals === 0 || !networkData?.directReferrals ? (
                <div>
                  <p className="text-2xl md:text-3xl font-bold text-white">—</p>
                  <p className="text-xs md:text-sm text-gray-400">Nenhum cadastro ainda</p>
                </div>
              ) : (
                <div>
                  <p className="text-2xl md:text-3xl font-bold text-white">{networkData.directReferrals}</p>
                  <p className="text-xs md:text-sm text-gray-400">Cadastros Diretos</p>
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
                  <UserPlus className="w-5 h-5 md:w-6 md:h-6 text-[#00E880]" />
                </div>
                <span className="text-[10px] md:text-xs text-gray-500">Hoje</span>
              </div>
              {isLoading ? (
                <div>
                  <p className="text-2xl md:text-3xl font-bold text-white">...</p>
                  <p className="text-xs md:text-sm text-gray-400">Carregando...</p>
                </div>
              ) : (networkData?.todayNew || 0) === 0 ? (
                <div>
                  <p className="text-2xl md:text-3xl font-bold text-white">—</p>
                  <p className="text-xs md:text-sm text-gray-400">Nenhum cadastro hoje</p>
                </div>
              ) : (
                <div>
                  <p className="text-2xl md:text-3xl font-bold text-white">{networkData.todayNew}</p>
                  <p className="text-xs md:text-sm text-gray-400">Novos hoje</p>
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
                  <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-yellow-400" />
                </div>
                <span className="text-[10px] md:text-xs text-gray-500">Conversão</span>
              </div>
              {isLoading ? (
                <div>
                  <p className="text-2xl md:text-3xl font-bold text-white">...</p>
                  <p className="text-xs md:text-sm text-gray-400">Carregando...</p>
                </div>
              ) : !networkData?.recentReferrals || networkData.recentReferrals.length === 0 ? (
                <div>
                  <p className="text-2xl md:text-3xl font-bold text-white">—</p>
                  <p className="text-xs md:text-sm text-gray-400">Sem dados de conversão</p>
                </div>
              ) : (
                <div>
                  <p className="text-2xl md:text-3xl font-bold text-white">
                    {`${Math.round((networkData.recentReferrals.filter((u: any) => u.totalDeposits > 0).length / networkData.recentReferrals.length) * 100)}%`}
                  </p>
                  <p className="text-xs md:text-sm text-gray-400">Taxa de Conversão</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Premium Search and Filter */}
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
                  placeholder="Buscar por nome, código ou ID..."
                  className="pl-10 bg-gray-900/50 border-gray-700 text-white rounded-xl w-full"
                />
              </div>
              
              {/* Filters Row - Responsive Grid */}
              <div className="flex flex-wrap gap-2 md:gap-3">
                {/* Period Filter */}
                <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                  <SelectTrigger className="flex-1 min-w-[140px] md:w-[180px] bg-gray-900 border-gray-700 text-white">
                    <Calendar className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-950 border-gray-700">
                    <SelectItem value="all" className="text-white hover:bg-gray-900">Todos os períodos</SelectItem>
                    <SelectItem value="today" className="text-white hover:bg-gray-900">Hoje</SelectItem>
                    <SelectItem value="7days" className="text-white hover:bg-gray-900">Últimos 7 dias</SelectItem>
                    <SelectItem value="30days" className="text-white hover:bg-gray-900">Últimos 30 dias</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Deposits Filter */}
                <Select value={filterDeposits} onValueChange={setFilterDeposits}>
                  <SelectTrigger className="flex-1 min-w-[140px] md:w-[180px] bg-gray-900 border-gray-700 text-white">
                    <TrendingUp className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                    <SelectValue placeholder="Depósitos" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-950 border-gray-700">
                    <SelectItem value="all" className="text-white hover:bg-gray-900">Todos</SelectItem>
                    <SelectItem value="with" className="text-white hover:bg-gray-900">Com depósitos</SelectItem>
                    <SelectItem value="without" className="text-white hover:bg-gray-900">Sem depósitos</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Source Filter */}
                <Select value={filterSource} onValueChange={setFilterSource}>
                  <SelectTrigger className="flex-1 min-w-[140px] md:w-[180px] bg-gray-900 border-gray-700 text-white">
                    <Users className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                    <SelectValue placeholder="Origem" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-950 border-gray-700">
                    <SelectItem value="all" className="text-white hover:bg-gray-900">Todos</SelectItem>
                    <SelectItem value="affiliate" className="text-white hover:bg-gray-900">Só do Afiliado</SelectItem>
                    <SelectItem value="partner" className="text-white hover:bg-gray-900">Só dos Parceiros</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Clear Filters Button */}
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

        {/* Premium Network List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="relative rounded-3xl overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-[#00E880]/10" />
          <div className="relative bg-[#1a1f2e] m-[1px] rounded-3xl overflow-hidden">
            <div className="bg-gradient-to-r from-gray-900/50 to-gray-950/50 backdrop-blur-sm p-6 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Todos os Cadastros</h3>
                <span className="text-sm text-gray-400">
                  {filteredUsers.length} {filteredUsers.length === 1 ? 'cadastro' : 'cadastros'}
                </span>
              </div>
            </div>
            <div className="p-4 md:p-6">
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : filteredUsers.length > 0 ? (
              <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
                {filteredUsers.map((user: any, i: number) => {
                  const handleClick = () => {
                    if (user.isFromPartner && user.partnerId) {
                      sessionStorage.setItem('selectedPartnerId', user.partnerId.toString());
                      setLocation('/afiliados/parceiros');
                    }
                  };
                  
                  const showDetails = (e: React.MouseEvent) => {
                    e.stopPropagation();
                    setSelectedUser(user);
                  };
                  
                  return (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02, duration: 0.3 }}
                      onClick={handleClick}
                      className={`bg-gray-800/50 rounded-xl p-4 md:p-5 space-y-3 border hover:bg-gray-800/60 transition-all ${
                        user.isFromPartner 
                          ? 'border-orange-500/50 hover:border-orange-500/70 cursor-pointer' 
                          : 'border-gray-700/50 hover:border-[#00E880]/30'
                      }`}
                    >
                      {/* Header Row */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-[#00E880] to-purple-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-bold text-sm md:text-base">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          {/* Name and Code */}
                          <div>
                            <p className="text-sm md:text-base font-medium text-white">{user.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] md:text-xs text-gray-400">ID: {user.id}</span>
                              <span className={`text-[10px] md:text-xs font-medium ${
                                user.isFromPartner ? 'text-orange-400' : 'text-purple-400'
                              }`}>
                                {user.code}
                              </span>
                            </div>
                            {user.isFromPartner && user.partnerId && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-[10px] md:text-xs text-orange-400">Via Parceiro ID:</span>
                                <span className="text-[10px] md:text-xs text-orange-300 font-medium">{user.partnerId}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Date */}
                        <div className="text-right">
                          <span className="text-[10px] md:text-xs text-gray-500">
                            {formatRelativeDate(user.date)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-700/50">
                        <div className="text-center">
                          <p className="text-[10px] md:text-xs text-gray-500 mb-1">Comissão Paga</p>
                          <p className="text-sm md:text-base font-bold text-[#00E880]">
                            {formatBRL(user.completedCommission || 0)}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] md:text-xs text-gray-500 mb-1">Pendente</p>
                          <p className="text-sm md:text-base font-bold text-yellow-400">
                            {formatBRL(user.pendingCommission || 0)}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] md:text-xs text-gray-500 mb-1">Cancelada</p>
                          <p className="text-sm md:text-base font-bold text-red-400">
                            {formatBRL(user.cancelledCommission || 0)}
                          </p>
                        </div>
                      </div>
                      
                      {/* Details Button */}
                      <div className="pt-3 border-t border-gray-700/50">
                        <button
                          onClick={showDetails}
                          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-gray-700/30 hover:bg-gray-700/50 rounded-lg transition-all text-xs md:text-sm text-gray-300 hover:text-white"
                        >
                          <Eye className="w-4 h-4" />
                          Ver Detalhes
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400">
                  {searchTerm ? 'Nenhum cadastro encontrado com sua busca' : 'Nenhum cadastro encontrado'}
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  {searchTerm ? 'Tente buscar por outro termo' : 'Compartilhe seus códigos para começar a construir sua rede'}
                </p>
              </div>
            )}
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* User Details Modal */}
      <AnimatePresence>
        {selectedUser && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setSelectedUser(null)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-full md:w-[400px] bg-gray-900 shadow-xl z-50 overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white">Detalhes do Usuário</h3>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="p-2 hover:bg-gray-800 rounded-lg transition-all"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                
                {selectedUser && (
                  <div className="space-y-4">
                    {/* User Info */}
                    <div className="bg-gray-800 rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00E880] to-purple-600 flex items-center justify-center">
                          <span className="text-white font-bold">
                            {selectedUser.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-white">{selectedUser.name}</p>
                          <p className="text-xs text-gray-400">ID: {selectedUser.id}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Phone className="w-4 h-4 text-gray-500" />
                          <div className="flex-1">
                            <p className="text-xs text-gray-500">Telefone</p>
                            <p className="text-sm text-gray-300">
                              {(() => {
                                if (!selectedUser.phone) return '(11) 1111-**********';
                                const cleanPhone = selectedUser.phone.replace(/\D/g, '');
                                if (cleanPhone.length >= 10) {
                                  const ddd = cleanPhone.slice(0, 2);
                                  const firstDigits = cleanPhone.slice(2, 6);
                                  return `(${ddd}) ${firstDigits}-${'*'.repeat(10)}`;
                                }
                                return '(11) 1111-**********';
                              })()}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <Mail className="w-4 h-4 text-gray-500" />
                          <div className="flex-1">
                            <p className="text-xs text-gray-500">Email</p>
                            <p className="text-sm text-gray-300 break-all">
                              {selectedUser.email ? 
                                `${selectedUser.email.slice(0, 3)}${'*'.repeat(6)}@${selectedUser.email.split('@')[1] || 'gmail.com'}` :
                                'aaa******@gmail.com'
                              }
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <CreditCard className="w-4 h-4 text-gray-500" />
                          <div className="flex-1">
                            <p className="text-xs text-gray-500">CPF</p>
                            <p className="text-sm text-gray-300">
                              {selectedUser.cpf ? 
                                `${selectedUser.cpf.slice(0, 3)}.***.***-${selectedUser.cpf.slice(-2)}` :
                                '111.***.***-11'
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Commission Stats */}
                    <div className="bg-gray-800 rounded-xl p-4">
                      <h4 className="text-sm font-medium text-white mb-3">Estatísticas de Comissão</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-400">Comissão Paga</span>
                          <span className="text-sm font-bold text-[#00E880]">
                            {formatBRL(selectedUser.completedCommission || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-400">Pendente</span>
                          <span className="text-sm font-bold text-yellow-400">
                            {formatBRL(selectedUser.pendingCommission || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-400">Cancelada</span>
                          <span className="text-sm font-bold text-red-400">
                            {formatBRL(selectedUser.cancelledCommission || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Registration Info */}
                    <div className="bg-gray-800 rounded-xl p-4">
                      <h4 className="text-sm font-medium text-white mb-3">Informações de Registro</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-400">Código</span>
                          <span className={`text-sm font-medium ${
                            selectedUser.isFromPartner ? 'text-orange-400' : 'text-purple-400'
                          }`}>
                            {selectedUser.code}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-gray-400">Data de Cadastro</span>
                          <span className="text-sm text-gray-300">
                            {formatRelativeDate(selectedUser.date)}
                          </span>
                        </div>
                        {selectedUser.isFromPartner && selectedUser.partnerId && (
                          <div className="flex justify-between">
                            <span className="text-xs text-gray-400">Via Parceiro</span>
                            <span className="text-sm text-orange-400">
                              ID {selectedUser.partnerId}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AffiliateLayout>
  );
}