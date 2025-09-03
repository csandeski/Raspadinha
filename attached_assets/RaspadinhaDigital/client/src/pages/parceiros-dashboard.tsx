import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PartnerLayout } from "@/components/partner/partner-layout";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

import { 
  DollarSign, 
  Users, 
  MousePointerClick, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  Link2, 
  Eye, 
  BarChart3, 
  Target, 
  Activity, 
  Clock, 
  CreditCard,
  Wallet,
  Trophy,
  Award,
  Star,
  Zap,
  ChartBar,
  UserCheck,
  HandCoins,
  PiggyBank,
  Banknote,
  BookOpen,
  Sparkles,
  ChevronRight,
  MessageSquare
} from "lucide-react";
// CountUp removed - using static values instead
import { formatBRL, formatNumber } from "@/lib/format";
import { formatZeroValue, formatStatValue } from "@/lib/format-zero-values";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useMemo, memo, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
  Legend
} from "recharts";
import { 
  usePartnerInfo, 
  usePartnerEarnings, 
  usePartnerDashboardStats, 
  usePartnerPerformance,
  usePartnerLevelInfo 
} from "@/hooks/usePartnerData";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

// Memoized chart component to prevent re-renders
const PerformanceChart = memo(({ data }: { data: any[] }) => (
  <ResponsiveContainer width="100%" height={300}>
    <AreaChart data={data}>
      <defs>
        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#00E880" stopOpacity={0.8}/>
          <stop offset="95%" stopColor="#00E880" stopOpacity={0}/>
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
      <XAxis dataKey="date" stroke="#9CA3AF" />
      <YAxis stroke="#9CA3AF" />
      <Tooltip 
        contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px' }}
        labelStyle={{ color: '#9CA3AF' }}
      />
      <Area 
        type="monotone" 
        dataKey="revenue" 
        stroke="#00E880" 
        fillOpacity={1} 
        fill="url(#colorRevenue)" 
      />
    </AreaChart>
  </ResponsiveContainer>
));

export default function ParceirosDashboard() {
  const [previousData, setPreviousData] = useState<any>(null);
  const [, setLocation] = useLocation();
  
  // IMMEDIATE TOKEN CHECK - REDIRECT IF NO TOKEN
  useEffect(() => {
    const token = localStorage.getItem('partnerToken');
    if (!token) {
      // No token - force redirect immediately
      window.location.href = '/parceiros-login';
    }
  }, []);
  
  // Check for valid token
  const token = localStorage.getItem('partnerToken');
  const hasToken = !!token;
  
  // If no token, don't render anything and redirect
  if (!hasToken) {
    window.location.href = '/parceiros-login';
    return null;
  }
  
  // Use optimized hooks - but disable if no token
  const { data: partnerInfo, isLoading: infoLoading, error: infoError } = usePartnerInfo();
  const { data: earningsData, isLoading: earningsLoading, error: earningsError } = usePartnerEarnings();
  const { data: dashboardStats, isLoading: statsLoading, error: statsError } = usePartnerDashboardStats();
  const { data: performanceData, isLoading: perfLoading, error: perfError } = usePartnerPerformance();
  
  // Handle authentication errors
  useEffect(() => {
    const hasAuthError = [infoError, earningsError, statsError, perfError].some(
      error => error && (error as any)?.status === 401
    );
    
    if (hasAuthError) {
      // Clear expired token and redirect
      localStorage.removeItem('partnerToken');
      window.location.href = '/parceiros-login';
    }
  }, [infoError, earningsError, statsError, perfError]);
  
  // Fetch deposit statistics with real-time updates
  const { data: depositStats } = useQuery({
    queryKey: ['/api/partner/deposits-stats'],
    refetchInterval: hasToken ? 5000 : false, // Only update if token exists
    refetchOnWindowFocus: hasToken,
    refetchOnMount: true,
    staleTime: 0,
    enabled: hasToken,
    retry: false, // Don't retry on errors
    queryFn: async () => {
      const response = await fetch('/api/partner/deposits-stats', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('partnerToken');
          window.location.href = '/parceiros-login';
          throw new Error('Unauthorized');
        }
        return {
          totalDeposits: 0,
          completedDeposits: 0,
          pendingDeposits: 0,
          cancelledDeposits: 0,
          completedRate: '0',
          pendingRate: '0',
          cancelledRate: '0',
          completedAmount: '0.00',
          pendingAmount: '0.00',
          cancelledAmount: '0.00'
        };
      }
      
      return response.json();
    }
  });
  // Use memoized level calculations with safe defaults (Partners don't have levels)
  const approvedEarnings = (partnerInfo as any)?.approvedEarnings || 0;
  const { currentLevel, nextLevel, progressToNext } = usePartnerLevelInfo(approvedEarnings);
  const currentCommissionRate = (partnerInfo as any)?.commissionRate || 0;

  // Memoize calculations to avoid re-computing with safe defaults
  const metrics = useMemo(() => ({
    totalClicks: (partnerInfo as any)?.totalClicks || 0,
    totalRegistrations: (partnerInfo as any)?.totalRegistrations || 0,
    totalDeposits: (partnerInfo as any)?.totalDeposits || 0,
    totalEarnings: parseFloat((partnerInfo as any)?.totalEarnings || '0'),
    pendingEarnings: parseFloat((partnerInfo as any)?.pendingEarnings || '0'),
    availableBalance: parseFloat((earningsData as any)?.availableBalance || '0'),
    totalWithdrawn: parseFloat((earningsData as any)?.totalWithdrawn || '0')
  }), [partnerInfo, earningsData]);
  
  // Calculate conversion rate
  const conversionRate = metrics.totalClicks > 0 ? ((metrics.totalRegistrations / metrics.totalClicks) * 100).toFixed(1) : '0.0';
  const depositRate = metrics.totalRegistrations > 0 ? ((metrics.totalDeposits / metrics.totalRegistrations) * 100).toFixed(1) : '0.0';
  
  // Calculate growth percentages (comparing with previous data)
  const clicksGrowth = previousData?.totalClicks 
    ? ((metrics.totalClicks - previousData.totalClicks) / previousData.totalClicks * 100).toFixed(0) 
    : 0;
  const registrationsGrowth = previousData?.totalRegistrations
    ? ((metrics.totalRegistrations - previousData.totalRegistrations) / previousData.totalRegistrations * 100).toFixed(0)
    : 0;
  const earningsGrowth = previousData?.totalEarnings
    ? ((metrics.totalEarnings - previousData.totalEarnings) / previousData.totalEarnings * 100).toFixed(0)
    : 0;
    
  // Update previous data for growth comparison
  useEffect(() => {
    if (partnerInfo && !previousData) {
      setPreviousData({
        totalClicks: metrics.totalClicks,
        totalRegistrations: metrics.totalRegistrations,
        totalEarnings: metrics.totalEarnings
      });
    }
  }, [partnerInfo, metrics, previousData]);
  
  // Format chart data from performance API
  const chartData = performanceData?.monthly || [];
  const recentActivity = dashboardStats?.recentActivity || [];

  return (
    <PartnerLayout activeSection="dashboard">
      <div className="space-y-3 md:space-y-6">
        {/* Animated Background Elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-[#00E880]/10 to-transparent rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-600/10 to-transparent rounded-full blur-3xl animate-pulse delay-700" />
        </div>

        {/* Professional KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
          {/* Revenue Card - Enhanced */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ scale: 1.02, y: -2 }}
            className="group relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-[#00E880] rounded-xl md:rounded-2xl blur-xl opacity-10 md:opacity-20 group-hover:opacity-30 transition-opacity" />
            <div className="relative bg-gradient-to-br from-gray-900/95 to-gray-950/95 backdrop-blur-xl rounded-xl md:rounded-2xl p-4 md:p-6 border border-gray-800 hover:border-[#00E880]/30 transition-all">
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <div className="relative">
                  <div className="p-2.5 md:p-3 bg-gradient-to-br from-[#00E880]/20 to-[#00E880]/5 rounded-xl border border-[#00E880]/20">
                    <HandCoins className="w-5 h-5 md:w-6 md:h-6 text-[#00E880]" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-[#00E880] rounded-full animate-ping" />
                </div>
                {Number(earningsGrowth) !== 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${
                      Number(earningsGrowth) > 0 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {Number(earningsGrowth) > 0 ? <TrendingUp className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(Number(earningsGrowth))}%
                  </motion.div>
                )}
              </div>
              
              <div className="space-y-1">
                <p className="text-xs md:text-xs text-gray-400 uppercase tracking-wider font-semibold">Receita Total</p>
                {earningsLoading ? (
                  <Skeleton className="h-9 w-32" />
                ) : metrics.totalEarnings === 0 ? (
                  <div>
                    <p className="text-xl md:text-2xl font-bold text-gray-500">—</p>
                    <p className="text-xs text-gray-500 mt-1">Aguardando comissões</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xl md:text-2xl font-bold bg-gradient-to-r from-[#00E880] to-emerald-400 bg-clip-text text-transparent">
                      {formatBRL(metrics.totalEarnings)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Acumulado total</p>
                  </div>
                )}
              </div>
              
              <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-gray-800/50">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Disponível</span>
                  <span className="text-[#00E880] font-semibold">
                    {metrics.availableBalance === 0 ? '—' : formatBRL(metrics.availableBalance)}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Clicks Card - Enhanced */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.02, y: -2 }}
            className="group relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl md:rounded-2xl blur-xl opacity-10 md:opacity-20 group-hover:opacity-30 transition-opacity" />
            <div className="relative bg-gradient-to-br from-gray-900/95 to-gray-950/95 backdrop-blur-xl rounded-xl md:rounded-2xl p-4 md:p-6 border border-gray-800 hover:border-blue-500/30 transition-all">
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <div className="relative">
                  <div className="p-2.5 md:p-3 bg-gradient-to-br from-blue-500/20 to-blue-500/5 rounded-xl border border-blue-500/20">
                    <MousePointerClick className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />
                  </div>
                  {metrics.totalClicks > 0 && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                  )}
                </div>
                {Number(clicksGrowth) !== 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${
                      Number(clicksGrowth) > 0 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {Number(clicksGrowth) > 0 ? <TrendingUp className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(Number(clicksGrowth))}%
                  </motion.div>
                )}
              </div>
              
              <div className="space-y-1">
                <p className="text-xs md:text-xs text-gray-400 uppercase tracking-wider font-semibold">Tráfego Total</p>
                {statsLoading ? (
                  <Skeleton className="h-9 w-32" />
                ) : metrics.totalClicks === 0 ? (
                  <div>
                    <p className="text-xl md:text-2xl font-bold text-gray-500">—</p>
                    <p className="text-xs text-gray-500 mt-1">Nenhum clique ainda</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                      {formatNumber(metrics.totalClicks)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Cliques recebidos</p>
                  </div>
                )}
              </div>
              
              <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-gray-800/50">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Taxa de conversão</span>
                  <span className="text-blue-400 font-semibold">
                    {conversionRate}%
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Registrations Card - Enhanced */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.02, y: -2 }}
            className="group relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl md:rounded-2xl blur-xl opacity-10 md:opacity-20 group-hover:opacity-30 transition-opacity" />
            <div className="relative bg-gradient-to-br from-gray-900/95 to-gray-950/95 backdrop-blur-xl rounded-xl md:rounded-2xl p-4 md:p-6 border border-gray-800 hover:border-purple-500/30 transition-all">
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <div className="relative">
                  <div className="p-2.5 md:p-3 bg-gradient-to-br from-purple-500/20 to-purple-500/5 rounded-xl border border-purple-500/20">
                    <UserCheck className="w-5 h-5 md:w-6 md:h-6 text-purple-400" />
                  </div>
                  {metrics.totalRegistrations > 0 && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                  )}
                </div>
                {Number(registrationsGrowth) !== 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${
                      Number(registrationsGrowth) > 0 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {Number(registrationsGrowth) > 0 ? <TrendingUp className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(Number(registrationsGrowth))}%
                  </motion.div>
                )}
              </div>
              
              <div className="space-y-1">
                <p className="text-xs md:text-xs text-gray-400 uppercase tracking-wider font-semibold">Cadastros</p>
                {statsLoading ? (
                  <Skeleton className="h-9 w-32" />
                ) : metrics.totalRegistrations === 0 ? (
                  <div>
                    <p className="text-xl md:text-2xl font-bold text-gray-500">—</p>
                    <p className="text-xs text-gray-500 mt-1">Nenhum cadastro ainda</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xl md:text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                      {formatNumber(metrics.totalRegistrations)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Usuários registrados</p>
                  </div>
                )}
              </div>
              
              <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-gray-800/50">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Taxa de depósito</span>
                  <span className="text-purple-400 font-semibold">
                    {depositRate}%
                  </span>
                </div>
              </div>
            </div>
          </motion.div>


        </div>

        {/* Mobile Summary Card - Only visible on mobile */}
        <div className="md:hidden bg-gradient-to-br from-gray-900/95 to-gray-950/95 backdrop-blur-xl rounded-2xl p-4 border border-gray-800 mb-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">Resumo do Período</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-800/30 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">Pendente</p>
              <p className="text-lg font-bold text-yellow-400">{formatBRL(metrics.pendingEarnings)}</p>
            </div>
            <div className="bg-gray-800/30 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">Disponível</p>
              <p className="text-lg font-bold text-[#00E880]">{formatBRL(metrics.availableBalance)}</p>
            </div>
            <div className="bg-gray-800/30 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">Taxa Conv.</p>
              <p className="text-lg font-bold text-blue-400">{conversionRate}%</p>
            </div>
            <div className="bg-gray-800/30 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">Taxa Dep.</p>
              <p className="text-lg font-bold text-purple-400">{depositRate}%</p>
            </div>
          </div>
        </div>

        {/* Professional Analytics Section */}
        <div className="space-y-3 md:space-y-6 mt-3 md:mt-6">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex items-center justify-between"
          >
            <div>
              <h2 className="text-lg md:text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Análise Detalhada
              </h2>
              <p className="text-sm text-gray-400 mt-1">Métricas e tendências do seu desempenho</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-gray-800/50 text-gray-400 border-gray-700 hover:bg-gray-800/70 transition-colors">
                <Activity className="w-3 h-3 mr-1" />
                Tempo Real
              </Badge>
            </div>
          </motion.div>

          {/* Charts Grid - Hide complex charts on mobile */}
          <div className="hidden md:grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6">
            {/* Revenue Evolution Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="group relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#00E880]/10 to-emerald-500/10 rounded-2xl blur-2xl opacity-30 group-hover:opacity-50 transition-opacity" />
              <div className="relative bg-gradient-to-br from-gray-900/95 to-gray-950/95 backdrop-blur-xl border border-gray-800 rounded-2xl p-6 hover:border-[#00E880]/20 transition-all">
                <div className="flex items-center justify-between mb-3 md:mb-6">
                  <div>
                    <h3 className="text-base md:text-lg font-semibold text-white">
                      Comparação de Status dos Depósitos
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">Últimos 7 dias - Aprovados, Pendentes e Cancelados</p>
                  </div>
                  <div className="p-2 bg-[#00E880]/10 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-[#00E880]" />
                  </div>
                </div>
                {/* Legend for the chart */}
                <div className="flex flex-wrap gap-2 md:gap-4 mb-3 md:mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#00E880]" />
                    <span className="text-xs text-gray-400">Aprovados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#F59E0B]" />
                    <span className="text-xs text-gray-400">Pendentes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#EF4444]" />
                    <span className="text-xs text-gray-400">Cancelados</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00E880" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#00E880" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.6}/>
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorCancelled" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.5}/>
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                      labelStyle={{ color: '#F3F4F6' }}
                      formatter={(value: number, name: string) => {
                        const labels: { [key: string]: string } = {
                          approved: 'Aprovados',
                          pending: 'Pendentes',
                          cancelled: 'Cancelados'
                        };
                        return [`${value}`, labels[name] || name];
                      }}
                    />
                    <Area type="monotone" dataKey="approved" name="approved" stroke="#00E880" fillOpacity={1} fill="url(#colorApproved)" />
                    <Area type="monotone" dataKey="pending" name="pending" stroke="#F59E0B" fillOpacity={1} fill="url(#colorPending)" />
                    <Area type="monotone" dataKey="cancelled" name="cancelled" stroke="#EF4444" fillOpacity={1} fill="url(#colorCancelled)" />
                  </AreaChart>
                </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Deposit Statistics - Enhanced */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="group relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl blur-2xl opacity-30 group-hover:opacity-50 transition-opacity" />
            <div className="relative bg-gradient-to-br from-gray-900/95 to-gray-950/95 backdrop-blur-xl border border-gray-800 rounded-2xl p-6 hover:border-purple-500/20 transition-all">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Análise de Comissões
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">Status e valores das comissões</p>
                </div>
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <CreditCard className="w-5 h-5 text-purple-400" />
                </div>
              </div>
              <div className="space-y-5">
                {/* Completed Deposits */}
                <div className="p-4 bg-gray-800/30 rounded-lg md:rounded-xl border border-gray-700/50">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-[#00E880]" />
                      <span className="text-sm font-medium text-gray-300">Comissões Aprovadas</span>
                    </div>
                    <span className="text-lg font-bold text-[#00E880]">{(depositStats as any)?.completedRate || '0.0'}%</span>
                  </div>
                  <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="absolute inset-0 h-full bg-gradient-to-r from-[#00E880] to-emerald-400 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${Math.min(Math.max(parseFloat((depositStats as any)?.completedRate || '0'), 0), 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2">
                    <p className="text-xs text-gray-500">
                      <span className="text-gray-400 font-semibold">{(depositStats as any)?.completedDeposits || 0}</span> de {(depositStats as any)?.totalDeposits || 0} comissões
                    </p>
                    <p className="text-xs text-[#00E880] font-semibold">
                      Comissão: R$ {(depositStats as any)?.completedAmount || '0.00'}
                    </p>
                  </div>
                </div>
                
                {/* Pending Deposits */}
                <div className="p-4 bg-gray-800/30 rounded-lg md:rounded-xl border border-gray-700/50">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span className="text-sm font-medium text-gray-300">Comissões Pendentes</span>
                    </div>
                    <span className="text-lg font-bold text-amber-400">{(depositStats as any)?.pendingRate || '0.0'}%</span>
                  </div>
                  <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="absolute inset-0 h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${Math.min(Math.max(parseFloat((depositStats as any)?.pendingRate || '0'), 0), 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2">
                    <p className="text-xs text-gray-500">
                      <span className="text-gray-400 font-semibold">{(depositStats as any)?.pendingDeposits || 0}</span> de {(depositStats as any)?.totalDeposits || 0} comissões
                    </p>
                    <p className="text-xs text-amber-400 font-semibold">
                      Comissão: R$ {(depositStats as any)?.pendingAmount || '0.00'}
                    </p>
                  </div>
                </div>
                
                {/* Cancelled Deposits */}
                <div className="p-4 bg-gray-800/30 rounded-lg md:rounded-xl border border-gray-700/50">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-red-400" />
                      <span className="text-sm font-medium text-gray-300">Comissões Canceladas</span>
                    </div>
                    <span className="text-lg font-bold text-red-400">{(depositStats as any)?.cancelledRate || '0.0'}%</span>
                  </div>
                  <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="absolute inset-0 h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${Math.min(Math.max(parseFloat((depositStats as any)?.cancelledRate || '0'), 0), 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2">
                    <p className="text-xs text-gray-500">
                      <span className="text-gray-400 font-semibold">{(depositStats as any)?.cancelledDeposits || 0}</span> de {(depositStats as any)?.totalDeposits || 0} comissões
                    </p>
                    <p className="text-xs text-red-400 font-semibold">
                      Comissão: R$ {(depositStats as any)?.cancelledAmount || '0.00'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

          {/* Mobile-Only Stats Cards */}
          <div className="md:hidden grid grid-cols-1 gap-3">
            {/* Quick Stats Card */}
            <div className="bg-gradient-to-br from-gray-900/95 to-gray-950/95 backdrop-blur-xl rounded-xl p-4 border border-gray-800">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Estatísticas Rápidas</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-800/50">
                  <span className="text-xs text-gray-500">Total de Depósitos</span>
                  <span className="text-sm font-bold text-white">{metrics.totalDeposits}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-800/50">
                  <span className="text-xs text-gray-500">Total Sacado</span>
                  <span className="text-sm font-bold text-white">{formatBRL(metrics.totalWithdrawn)}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs text-gray-500">Comissão</span>
                  <span className="text-sm font-bold text-[#00E880]">{currentCommissionRate}%</span>
                </div>
              </div>
            </div>

            {/* Performance Overview */}
            <div className="bg-gradient-to-br from-gray-900/95 to-gray-950/95 backdrop-blur-xl rounded-xl p-4 border border-gray-800">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Desempenho</h3>
              <div className="space-y-3">
                {depositStats && 'completedRate' in depositStats && (
                  <>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-500">Aprovados</span>
                        <span className="text-xs font-semibold text-[#00E880]">{depositStats.completedRate}%</span>
                      </div>
                      <Progress value={parseFloat(depositStats.completedRate)} className="h-1.5 bg-gray-800" />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-500">Pendentes</span>
                        <span className="text-xs font-semibold text-yellow-400">{depositStats.pendingRate}%</span>
                      </div>
                      <Progress value={parseFloat(depositStats.pendingRate)} className="h-1.5 bg-gray-800" />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-gray-500">Cancelados</span>
                        <span className="text-xs font-semibold text-red-400">{depositStats.cancelledRate}%</span>
                      </div>
                      <Progress value={parseFloat(depositStats.cancelledRate)} className="h-1.5 bg-gray-800" />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tutorial Section - Always Visible */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="mt-4 md:mt-8"
        >
          {/* Tutorial Header */}
          <h2 className="text-lg md:text-xl font-bold text-white">Aprenda a usar o painel</h2>
          <p className="text-sm text-gray-400 mt-1 mb-3 md:mb-4">Siga estes passos simples para ter sucesso como parceiro</p>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-[#00E880]/5 via-purple-600/5 to-blue-600/5 rounded-2xl blur-3xl" />
            <div className="relative bg-gradient-to-br from-gray-900/95 to-gray-950/95 backdrop-blur-xl rounded-xl md:rounded-2xl p-3 md:p-6 border border-gray-800">
              {/* Tutorial Steps */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {/* Step 1 */}
              <div className="p-3 md:p-4 bg-gray-800/30 rounded-lg md:rounded-xl border border-gray-700/50 hover:border-[#00E880]/30 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-[#00E880]/20 rounded-full">
                    <span className="text-[#00E880] font-bold">1</span>
                  </div>
                  <h3 className="text-sm md:text-base font-semibold text-white">Crie Seus Links</h3>
                </div>
                <p className="text-xs md:text-sm text-gray-400 mb-3">
                  Vá em "Links" e crie links personalizados para rastrear de onde vêm seus cliques. Cada link tem QR Code!
                </p>
                <p className="text-xs text-[#00E880] flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Dica: Use nomes como "Instagram Stories"
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-4 bg-gray-800/30 rounded-lg md:rounded-xl border border-gray-700/50 hover:border-purple-500/30 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-purple-500/20 rounded-full">
                    <span className="text-purple-400 font-bold">2</span>
                  </div>
                  <h3 className="text-sm md:text-base font-semibold text-white">Compartilhe</h3>
                </div>
                <p className="text-xs md:text-sm text-gray-400 mb-3">
                  Divulgue seus links no WhatsApp, Instagram, Telegram, TikTok. Quanto mais pessoas clicarem, mais você ganha!
                </p>
                <p className="text-xs text-purple-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Vídeos de prêmios convertem 3x mais
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-4 bg-gray-800/30 rounded-lg md:rounded-xl border border-gray-700/50 hover:border-amber-500/30 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-amber-500/20 rounded-full">
                    <span className="text-amber-400 font-bold">3</span>
                  </div>
                  <h3 className="text-sm md:text-base font-semibold text-white">Acompanhe</h3>
                </div>
                <p className="text-xs md:text-sm text-gray-400 mb-3">
                  Na aba "Rede" você vê quantas pessoas cadastraram com seu link. Veja quem está ativo e quem depositou!
                </p>
                <p className="text-xs text-amber-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Taxa de conversão média: 15%
                </p>
              </div>

              {/* Step 4 */}
              <div className="p-4 bg-gray-800/30 rounded-lg md:rounded-xl border border-gray-700/50 hover:border-cyan-500/30 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-cyan-500/20 rounded-full">
                    <span className="text-cyan-400 font-bold">4</span>
                  </div>
                  <h3 className="text-sm md:text-base font-semibold text-white">Ganhe Comissões</h3>
                </div>
                <p className="text-xs md:text-sm text-gray-400 mb-3">
                  Você ganha sobre TODOS os depósitos! Ganhe mais vendendo mais!
                </p>
                <p className="text-xs text-cyan-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  10 ativos {'>'} 100 inativos
                </p>
              </div>

              {/* Step 5 */}
              <div className="p-4 bg-gray-800/30 rounded-lg md:rounded-xl border border-gray-700/50 hover:border-emerald-500/30 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-emerald-500/20 rounded-full">
                    <span className="text-emerald-400 font-bold">5</span>
                  </div>
                  <h3 className="text-sm md:text-base font-semibold text-white">Solicite Saques</h3>
                </div>
                <p className="text-xs md:text-sm text-gray-400 mb-3">
                  Com saldo disponível, vá em "Saques" e solicite via PIX. Dinheiro cai na hora após aprovação!
                </p>
                <p className="text-xs text-emerald-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Processado em até 24h úteis
                </p>
              </div>

              {/* Step 6 */}
              <div className="p-4 bg-gray-800/30 rounded-lg md:rounded-xl border border-gray-700/50 hover:border-pink-500/30 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-pink-500/20 rounded-full">
                    <span className="text-pink-400 font-bold">6</span>
                  </div>
                  <h3 className="text-sm md:text-base font-semibold text-white">Use Materiais</h3>
                </div>
                <p className="text-xs md:text-sm text-gray-400 mb-3">
                  Em "Materiais" tem banners, textos prontos e imagens. Poste 3x por semana para melhores resultados!
                </p>
                <p className="text-xs text-pink-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Em breve!
                </p>
              </div>
            </div>
            </div>
          </div>
        </motion.div>
      </div>
    </PartnerLayout>
  );
}