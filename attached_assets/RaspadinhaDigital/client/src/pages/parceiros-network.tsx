import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PartnerLayout } from "@/components/partner/partner-layout";
import { Users, UserPlus, TrendingUp, Award, Loader2, Search, Filter, Hash, Calendar, X, DollarSign } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatBRL } from "@/lib/format";
import { formatZeroValue, formatStatValue } from "@/lib/format-zero-values";
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

export default function ParceirosNetwork() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [filterDeposits, setFilterDeposits] = useState("all");
  
  const { data: networkData, isLoading } = useQuery({
    queryKey: ['/api/partner/network'],
    queryFn: async () => {
      const token = localStorage.getItem('partnerToken');
      const response = await fetch('/api/partner/network', {
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
    
    return matchesSearch && matchesPeriod && matchesDeposits;
  }) || [];

  const clearFilters = () => {
    setSearchTerm("");
    setFilterPeriod("all");
    setFilterDeposits("all");
  };

  const hasActiveFilters = filterPeriod !== "all" || filterDeposits !== "all" || searchTerm !== "";

  return (
    <PartnerLayout activeSection="network">
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
              <p className="text-gray-400 text-xs md:text-sm">Acompanhe o crescimento da sua rede de parceiros</p>
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
            <div className="p-3 lg:p-4">
            {/* Table Header - Desktop */}
            <div className="hidden lg:flex items-center px-4 py-2 mb-3 text-[10px] text-gray-600 uppercase tracking-wider border-b border-gray-800">
              <div className="w-8 mr-3"></div> {/* Avatar space */}
              <div className="w-48">Nome</div>
              <div className="w-36">Código</div>
              <div className="w-44">Data</div>
              <div className="flex-1"></div>
              <div className="w-32 text-center">Paga</div>
              <div className="w-32 text-center">Pendente</div>
              <div className="w-32 text-center">Cancelada</div>
            </div>
            
            {/* Mobile Commission Header */}
            <div className="flex lg:hidden items-center justify-end px-4 py-2 mb-2 text-[9px] text-gray-600 uppercase tracking-wider border-b border-gray-800">
              <div className="w-20 text-center">Paga</div>
              <div className="w-20 text-center">Pend.</div>
              <div className="w-20 text-center">Canc.</div>
            </div>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : filteredUsers.length > 0 ? (
              <div className="space-y-1 max-h-[550px] overflow-y-auto custom-scrollbar">
                {filteredUsers.map((user: any, i: number) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.01, duration: 0.15 }}
                    className="group relative"
                  >
                    <div className="relative flex items-center px-2 lg:px-4 py-1.5 bg-gray-900/30 rounded-lg border border-gray-800/40 hover:border-[#00E880]/20 hover:bg-gray-900/50 transition-all duration-150">
                      {/* Mobile Layout */}
                      <div className="lg:hidden flex items-center w-full">
                        {/* Avatar + Name + Code */}
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#00E880] to-purple-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-bold text-[8px]">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-white font-medium text-[11px] truncate">{user.name}</p>
                            <span className="text-[9px] text-purple-400">{user.code}</span>
                          </div>
                        </div>
                        
                        {/* Mobile Commission Values - Fixed Width */}
                        <div className="w-20 text-center flex-shrink-0">
                          <p className="text-[#00E880] font-bold text-[11px]">{formatBRL(user.completedCommission || 0)}</p>
                        </div>
                        <div className="w-20 text-center flex-shrink-0">
                          <p className="text-yellow-400 font-bold text-[11px]">{formatBRL(user.pendingCommission || 0)}</p>
                        </div>
                        <div className="w-20 text-center flex-shrink-0">
                          <p className="text-red-400 font-bold text-[11px]">{formatBRL(user.cancelledCommission || 0)}</p>
                        </div>
                      </div>
                      
                      {/* Desktop Layout */}
                      <div className="hidden lg:flex items-center w-full">
                        {/* Avatar - Fixed Width */}
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00E880] to-purple-600 flex items-center justify-center flex-shrink-0 mr-3">
                          <span className="text-white font-bold text-[10px]">
                            {user.name.charAt(0).toUpperCase()}{user.name.split(' ').pop()?.charAt(0).toUpperCase() || ''}
                          </span>
                        </div>
                        
                        {/* Name Section - Fixed Width */}
                        <div className="w-48 flex-shrink-0 pr-2">
                          <div className="flex items-center gap-2">
                            <p className="text-white font-medium text-[13px] truncate">{user.name}</p>
                            <span className="text-xs text-gray-600">•</span>
                            <span className="text-[11px] text-gray-500">#{user.id.toString().padStart(3, '0')}</span>
                          </div>
                        </div>
                        
                        {/* Code Section - Fixed Width */}
                        <div className="w-36 flex-shrink-0 pr-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-900/20 rounded text-[11px]">
                            <span className="text-purple-400 font-medium">{user.code}</span>
                          </span>
                        </div>
                        
                        {/* Date Section - Fixed Width */}
                        <div className="w-44 flex-shrink-0 text-[11px] text-gray-500">
                          {formatRelativeDate(user.date)}
                        </div>
                        
                        {/* Spacer */}
                        <div className="flex-1" />
                        
                        {/* Commission Values - Fixed Width for Perfect Alignment */}
                        <div className="flex items-center flex-shrink-0">
                          {/* Paga Column */}
                          <div className="w-32 text-center">
                            <p className="text-[#00E880] font-bold text-[14px]">{formatBRL(user.completedCommission || 0)}</p>
                            <p className="text-[8px] text-gray-600">Paga</p>
                          </div>
                          
                          {/* Pendente Column */}
                          <div className="w-32 text-center">
                            <p className="text-yellow-400 font-bold text-[14px]">{formatBRL(user.pendingCommission || 0)}</p>
                            <p className="text-[8px] text-gray-600">Pendente</p>
                          </div>
                          
                          {/* Cancelada Column */}
                          <div className="w-32 text-center">
                            <p className="text-red-400 font-bold text-[14px]">{formatBRL(user.cancelledCommission || 0)}</p>
                            <p className="text-[8px] text-gray-600">Cancelada</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                {hasActiveFilters ? (
                  <div>
                    <p className="text-gray-400 mb-2">Nenhum cadastro encontrado com os filtros aplicados</p>
                    <Button 
                      onClick={clearFilters}
                      variant="outline" 
                      className="border-gray-700 text-gray-300 hover:bg-gray-900"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Limpar Filtros
                    </Button>
                  </div>
                ) : (
                  <p className="text-gray-400">Nenhum cadastro na sua rede ainda</p>
                )}
              </div>
            )}
            </div>
          </div>
        </motion.div>
      </div>
    </PartnerLayout>
  );
}