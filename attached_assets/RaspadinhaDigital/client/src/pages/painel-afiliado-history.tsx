import { useState } from "react";
import { motion } from "framer-motion";
import { AffiliateLayout } from "@/components/affiliate/affiliate-layout";
import { 
  History, 
  Calendar, 
  DollarSign, 
  Users, 
  MousePointerClick,
  TrendingUp,
  UserPlus,
  CheckCircle,
  Clock,
  XCircle,
  Activity,
  Filter,
  Search,
  ChevronRight
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatBRL } from "@/lib/format";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function PainelAfiliadoHistory() {
  const [filterType, setFilterType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch real data from multiple endpoints
  const { data: earningsData } = useQuery({
    queryKey: ['/api/affiliate/earnings'],
    queryFn: async () => {
      const token = localStorage.getItem('affiliateToken');
      const response = await fetch('/api/affiliate/earnings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch earnings');
      return response.json();
    }
  });

  const { data: networkData } = useQuery({
    queryKey: ['/api/affiliate/network'],
    queryFn: async () => {
      const token = localStorage.getItem('affiliateToken');
      const response = await fetch('/api/affiliate/network', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch network');
      return response.json();
    }
  });

  const { data: codesData } = useQuery({
    queryKey: ['/api/affiliate/codes'],
    queryFn: async () => {
      const token = localStorage.getItem('affiliateToken');
      const response = await fetch('/api/affiliate/codes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch codes');
      return response.json();
    }
  });

  // Combine all activities into a timeline
  interface Activity {
    date: Date;
    type: string;
    title: string;
    description: string;
    icon: any;
    color: string;
    bgColor: string;
    status?: string;
  }
  const activities: Activity[] = [];

  // Add earnings transactions (only deposits, not registrations)
  if (earningsData?.transactions) {
    earningsData.transactions
      .filter((transaction: any) => transaction.conversionType !== 'registration')
      .forEach((transaction: any) => {
        activities.push({
          date: new Date(transaction.createdAt),
          type: 'commission',
          title: transaction.status === 'completed' ? 'Comissão paga' : 
                 transaction.status === 'pending' ? 'Comissão pendente' : 'Comissão cancelada',
          description: `${transaction.userName || 'Usuário'} - ${(transaction.commission || 0) === 0 ? '—' : formatBRL(transaction.commission || 0)}`,
          icon: DollarSign,
          color: transaction.status === 'completed' ? 'text-[#00E880]' : 
                 transaction.status === 'pending' ? 'text-yellow-400' : 'text-red-400',
          bgColor: transaction.status === 'completed' ? 'bg-green-900/20' : 
                   transaction.status === 'pending' ? 'bg-yellow-900/20' : 'bg-red-900/20',
          status: transaction.status
        });
      });
  }

  // Add recent registrations
  if (networkData?.recentReferrals) {
    networkData.recentReferrals.forEach((referral: any) => {
      activities.push({
        date: new Date(referral.date),
        type: 'registration',
        title: 'Novo cadastro',
        description: `${referral.name} - Código: ${referral.code}`,
        icon: UserPlus,
        color: 'text-purple-400',
        bgColor: 'bg-purple-900/20'
      });
    });
  }

  // Add code click activities (show as new click event)
  if (codesData) {
    codesData.forEach((code: any) => {
      if (code.totalClicks > 0) {
        activities.push({
          date: new Date(code.updatedAt || code.createdAt),
          type: 'click',
          title: 'Novo clique',
          description: `Clique registrado no código ${code.code}`,
          icon: MousePointerClick,
          color: 'text-blue-400',
          bgColor: 'bg-blue-900/20'
        });
      }
    });
  }

  // Sort activities by date (most recent first)
  activities.sort((a, b) => b.date.getTime() - a.date.getTime());

  // Apply filters and show only today's activities
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const filteredActivities = activities.filter(activity => {
    // Only show today's activities
    const isToday = activity.date >= today;
    const matchesType = filterType === 'all' || activity.type === filterType;
    const matchesSearch = searchTerm === '' ||
      activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.description.toLowerCase().includes(searchTerm.toLowerCase());
    return isToday && matchesType && matchesSearch;
  });

  return (
    <AffiliateLayout activeSection="history">
      <div className="space-y-6">
        {/* Responsive Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-gray-900/50 to-gray-950/50 backdrop-blur-sm rounded-2xl p-4 md:p-6 mb-4"
        >
          <div className="flex items-center gap-3 md:gap-4">
            <div className="p-2 md:p-3 bg-gray-800 rounded-xl">
              <History className="w-5 h-5 md:w-6 md:h-6 text-gray-400" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">Histórico de Atividades</h1>
              <p className="text-gray-400 text-xs md:text-sm">Acompanhe todas as suas atividades e movimentações</p>
            </div>
          </div>
        </motion.div>

        {/* Premium Daily Stats Cards */}
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
                <span className="text-xs text-gray-400">Hoje</span>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-white">
                {(() => {
                  const count = activities.filter(a => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return a.date >= today && a.type === 'commission';
                  }).length;
                  return count === 0 ? '—' : count;
                })()}
              </p>
              <p className="text-xs md:text-sm text-gray-400">Comissões hoje</p>
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
                  <UserPlus className="w-5 h-5 md:w-6 md:h-6 text-purple-400" />
                </div>
                <span className="text-xs text-gray-400">Hoje</span>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-white">
                {(() => {
                  const count = activities.filter(a => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return a.date >= today && a.type === 'registration';
                  }).length;
                  return count === 0 ? '—' : count;
                })()}
              </p>
              <p className="text-xs md:text-sm text-gray-400">Cadastros hoje</p>
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
                  <MousePointerClick className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />
                </div>
                <span className="text-xs text-gray-400">Hoje</span>
              </div>
              <p className="text-2xl md:text-3xl font-bold text-white">
                {(() => {
                  const count = activities.filter(a => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return a.date >= today && a.type === 'click';
                  }).length;
                  return count === 0 ? '—' : count;
                })()}
              </p>
              <p className="text-xs md:text-sm text-gray-400">Cliques hoje</p>
            </div>
          </motion.div>
        </div>

        {/* Premium Filter Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="relative rounded-3xl overflow-hidden"
        >
          <div className="relative bg-[#1a1f2e] border border-gray-700 rounded-3xl p-4 md:p-6">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar atividade..."
                  className="pl-10 bg-gray-900/50 border-gray-700 text-white rounded-xl"
                />
              </div>
              
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full md:w-[200px] bg-gray-900 border-gray-700 text-white">
                  <Filter className="w-4 h-4 mr-2 text-gray-400" />
                  <SelectValue placeholder="Tipo de atividade" />
                </SelectTrigger>
                <SelectContent className="bg-gray-950 border-gray-700">
                  <SelectItem value="all" className="text-white hover:bg-gray-900">Todas</SelectItem>
                  <SelectItem value="commission" className="text-white hover:bg-gray-900">Comissões</SelectItem>
                  <SelectItem value="registration" className="text-white hover:bg-gray-900">Cadastros</SelectItem>
                  <SelectItem value="click" className="text-white hover:bg-gray-900">Cliques</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </motion.div>

        {/* Premium Activity Timeline */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="relative"
        >
          <div className="relative rounded-3xl overflow-hidden">
            {/* Inner Card */}
            <div className="relative bg-[#1a1f2e] border border-gray-700 rounded-3xl overflow-hidden">
              {/* Pattern Background */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0" style={{
                  backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.05) 10px, rgba(255,255,255,.05) 20px)`
                }} />
              </div>
              {/* Content */}
              <div className="relative">
                <div className="bg-gradient-to-r from-gray-900/50 to-gray-950/50 backdrop-blur-sm p-4 md:p-6 border-b border-gray-800">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg md:text-xl font-bold text-white">Linha do Tempo - Hoje</h3>
                    <span className="text-xs md:text-sm text-gray-400">
                      {filteredActivities.length} {filteredActivities.length === 1 ? 'atividade hoje' : 'atividades hoje'}
                    </span>
                  </div>
                </div>
                <div className="p-4 md:p-6">
              {filteredActivities.length > 0 ? (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {filteredActivities.map((activity, i) => {
                    const Icon = activity.icon;
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex gap-4"
                      >
                        {/* Timeline Line */}
                        <div className="flex flex-col items-center pt-2">
                          <div className={`p-3 rounded-full ${activity.bgColor} border border-gray-700`}>
                            <Icon className={`w-5 h-5 ${activity.color}`} />
                          </div>
                          {i < filteredActivities.length - 1 && (
                            <div className="w-px h-full bg-gradient-to-b from-gray-700 to-transparent mt-2" />
                          )}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 pb-6">
                          <div className="bg-gradient-to-r from-gray-900/80 to-gray-950/80 rounded-xl border border-gray-800 p-4 hover:border-gray-700 transition-all">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-white font-medium flex items-center gap-2">
                                  {activity.title}
                                  <ChevronRight className="w-4 h-4 text-gray-600" />
                                </p>
                                <p className="text-gray-400 text-sm mt-1">{activity.description}</p>
                              </div>
                              <span className="text-xs text-gray-500 whitespace-nowrap">
                                {format(activity.date, "dd/MM 'às' HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <History className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">
                    {searchTerm || filterType !== 'all'
                      ? 'Nenhuma atividade encontrada hoje com os filtros aplicados'
                      : 'Nenhuma atividade registrada hoje'}
                  </p>
                  <p className="text-gray-500 text-sm mt-2">
                    {searchTerm || filterType !== 'all'
                      ? 'Tente ajustar os filtros'
                      : 'As atividades de hoje aparecerão aqui'}
                  </p>
                </div>
              )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>


      </div>
    </AffiliateLayout>
  );
}