import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CountUp from "react-countup";
import { 
  Calendar,
  CalendarRange,
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Users,
  Gamepad2,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Filter,
  ChevronDown,
  RefreshCw,
  Download,
  Eye,
  FileText,
  BarChart3,
  Activity,
  Target,
  Trophy,
  Zap,
  AlertCircle,
  Info
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, subDays, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";

interface EnhancedDashboardProps {
  stats: any;
}

// Predefined date ranges
const dateRanges = [
  { value: "today", label: "Hoje", icon: Clock },
  { value: "yesterday", label: "Ontem", icon: Clock },
  { value: "last7days", label: "Últimos 7 dias", icon: Calendar },
  { value: "last30days", label: "Últimos 30 dias", icon: Calendar },
  { value: "thisMonth", label: "Este mês", icon: CalendarRange },
  { value: "lastMonth", label: "Mês passado", icon: CalendarRange },
  { value: "custom", label: "Personalizado", icon: Filter }
];

export default function EnhancedDashboard({ stats: initialStats }: EnhancedDashboardProps) {
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState("today");
  const [customDateRange, setCustomDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({ from: undefined, to: undefined });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Fetch stats with date filter
  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ["/api/admin/stats", selectedPeriod, customDateRange],
    queryFn: async () => {
      const sessionId = localStorage.getItem("adminSessionId");
      
      let url = `/api/admin/stats?period=${selectedPeriod}`;
      
      if (selectedPeriod === "custom" && customDateRange.from && customDateRange.to) {
        url = `/api/admin/stats?startDate=${format(customDateRange.from, 'yyyy-MM-dd')}&endDate=${format(customDateRange.to, 'yyyy-MM-dd')}`;
      }
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${sessionId}`,
        },
      });
      
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
    initialData: initialStats,
    refetchInterval: 30000,
  });
  
  // Format currency with Brazilian format
  const formatCurrency = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };
  
  // Format percentage change
  const formatChange = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    const isPositive = num >= 0;
    return (
      <span className={`flex items-center gap-1 ${isPositive ? 'text-[#00E880]' : 'text-red-400'}`}>
        {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
        {Math.abs(num).toFixed(1)}%
      </span>
    );
  };
  
  // Get period label
  const getPeriodLabel = () => {
    if (selectedPeriod === "custom" && customDateRange.from && customDateRange.to) {
      return `${format(customDateRange.from, 'dd/MM/yyyy')} - ${format(customDateRange.to, 'dd/MM/yyyy')}`;
    }
    return dateRanges.find(r => r.value === selectedPeriod)?.label || "Hoje";
  };
  
  // Main KPI cards
  const kpiCards = [
    {
      title: "Receita Confirmada",
      value: stats?.metrics?.revenue?.confirmed || "0.00",
      grossValue: stats?.metrics?.revenue?.gross || "0.00",
      change: stats?.metrics?.revenue?.change || 0,
      comparison: stats?.metrics?.revenue?.comparison || "0.00",
      icon: DollarSign,
      color: "from-[#00E880] to-emerald-600",
      description: "Depósitos confirmados via PIX",
      showGross: true
    },
    {
      title: "Novos Usuários",
      value: stats?.metrics?.users?.newInPeriod || 0,
      change: stats?.metrics?.users?.change || 0,
      comparison: stats?.metrics?.users?.comparison || 0,
      icon: Users,
      color: "from-blue-500 to-cyan-600",
      description: "Cadastros no período"
    },
    {
      title: "Jogos Realizados",
      value: stats?.metrics?.games?.total || 0,
      change: stats?.metrics?.games?.change || 0,
      comparison: stats?.metrics?.games?.comparison || 0,
      icon: Gamepad2,
      color: "from-purple-500 to-pink-600",
      description: "Raspadinhas jogadas"
    },
    {
      title: "Lucro do Período",
      value: stats?.metrics?.profit?.amount || "0.00",
      change: stats?.metrics?.profit?.change || 0,
      comparison: stats?.metrics?.profit?.comparison || "0.00",
      icon: Wallet,
      color: "from-orange-500 to-amber-600",
      description: "Receita - Saques - Prêmios"
    }
  ];
  
  // Performance metrics
  const performanceMetrics = [
    {
      label: "Taxa de Conversão",
      value: parseFloat(stats?.kpis?.conversionRate || 0),
      target: 50,
      icon: Target,
      format: (v: number) => `${v.toFixed(1)}%`
    },
    {
      label: "Taxa de Retenção",
      value: parseFloat(stats?.kpis?.retentionRate || 0),
      target: 70,
      icon: Users,
      format: (v: number) => `${v.toFixed(1)}%`
    },
    {
      label: "Taxa de Vitória",
      value: parseFloat(stats?.kpis?.winRate || 0),
      target: 15,
      icon: Trophy,
      format: (v: number) => `${v.toFixed(1)}%`
    },
    {
      label: "Ticket Médio",
      value: parseFloat(stats?.kpis?.avgDeposit || 0),
      target: 100,
      icon: DollarSign,
      format: (v: number) => formatCurrency(v)
    }
  ];
  
  // Game distribution data
  const gameDistributionData = [
    { name: "PIX", value: stats?.gameDistribution?.pix || 0, color: "#3b82f6" },
    { name: "Me Mimei", value: stats?.gameDistribution?.meMimei || 0, color: "#ec4899" },
    { name: "Eletrônicos", value: stats?.gameDistribution?.eletronicos || 0, color: "#f59e0b" },
    { name: "Super Prêmios", value: stats?.gameDistribution?.superPremios || 0, color: "#00E880" }
  ];
  
  // Calculate game distribution percentages
  const totalGames = gameDistributionData.reduce((sum, game) => sum + game.value, 0);
  const gameDistributionWithPercentage = gameDistributionData.map(game => ({
    ...game,
    percentage: totalGames > 0 ? ((game.value / totalGames) * 100).toFixed(1) : "0"
  }));

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Date Filter */}
      <div className="bg-black/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-3xl font-bold text-white flex items-center gap-3"
            >
              <BarChart3 className="w-9 h-9 text-[#00E880]" />
              Dashboard Administrativo
            </motion.h1>
            <p className="text-zinc-400 mt-1">
              Análise detalhada do período: <span className="text-[#00E880] font-semibold">{getPeriodLabel()}</span>
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Period Selector */}
            <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-[240px] justify-start text-left font-normal bg-zinc-900 border-zinc-800 hover:bg-zinc-800"
                >
                  <CalendarRange className="mr-2 h-4 w-4 text-[#00E880]" />
                  {getPeriodLabel()}
                  <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-zinc-900 border-zinc-800" align="end">
                <div className="p-3 space-y-2">
                  {dateRanges.map((range) => (
                    <Button
                      key={range.value}
                      variant={selectedPeriod === range.value ? "default" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => {
                        setSelectedPeriod(range.value);
                        if (range.value !== "custom") {
                          setShowDatePicker(false);
                        }
                      }}
                    >
                      <range.icon className="mr-2 h-4 w-4" />
                      {range.label}
                    </Button>
                  ))}
                </div>
                
                {selectedPeriod === "custom" && (
                  <div className="border-t border-zinc-800 p-3">
                    <CalendarComponent
                      mode="range"
                      selected={customDateRange}
                      onSelect={(range: any) => {
                        setCustomDateRange(range || { from: undefined, to: undefined });
                      }}
                      locale={ptBR}
                      className="rounded-md"
                    />
                    <Button
                      className="w-full mt-3 bg-[#00E880] text-black hover:bg-[#00E880]/90"
                      onClick={() => setShowDatePicker(false)}
                      disabled={!customDateRange.from || !customDateRange.to}
                    >
                      Aplicar Período
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
            
            {/* Quick Actions */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                refetch();
                toast({
                  title: "Atualizando dados...",
                  description: "As estatísticas estão sendo recarregadas"
                });
              }}
              className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800"
            >
              <RefreshCw className={`w-5 h-5 text-zinc-400 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800"
            >
              <Download className="w-5 h-5 text-zinc-400" />
            </Button>
            
            <Badge variant="outline" className="border-[#00E880] text-[#00E880] px-3 py-1">
              <Activity className="w-3 h-3 mr-1 animate-pulse" />
              Ao vivo
            </Badge>
          </div>
        </div>
      </div>
      
      {/* Main KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm hover:border-zinc-700 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-zinc-400">{card.title}</CardDescription>
                  <div className={`p-2 rounded-xl bg-gradient-to-br ${card.color.split(' ')[1]} ${card.color.split(' ')[2]}/20`}>
                    <card.icon className="w-5 h-5 text-[#00E880]" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-3xl font-bold text-white">
                    {typeof card.value === 'string' && card.value.includes('.') ? (
                      <CountUp 
                        end={parseFloat(card.value)} 
                        duration={2.5} 
                        separator="." 
                        decimal="," 
                        decimals={2}
                        prefix="R$ "
                      />
                    ) : (
                      <CountUp end={card.value} duration={2.5} separator="." />
                    )}
                  </p>
                  
                  {card.showGross && (
                    <p className="text-xs text-zinc-500 mt-1">
                      Faturamento bruto: R$ <CountUp end={parseFloat(card.grossValue)} duration={2.5} separator="." decimal="," decimals={2} />
                    </p>
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">{card.description}</span>
                  {formatChange(card.change)}
                </div>
                
                {card.comparison !== undefined && parseFloat(card.comparison) > 0 && (
                  <div className="pt-2 border-t border-zinc-800">
                    <p className="text-xs text-zinc-500">
                      Período anterior: {typeof card.comparison === 'string' ? formatCurrency(card.comparison) : card.comparison}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
      
      {/* Detailed Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="overview" className="data-[state=active]:bg-[#00E880] data-[state=active]:text-black">
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="performance" className="data-[state=active]:bg-[#00E880] data-[state=active]:text-black">
            Performance
          </TabsTrigger>
          <TabsTrigger value="games" className="data-[state=active]:bg-[#00E880] data-[state=active]:text-black">
            Jogos
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          {/* Revenue Chart */}
          <Card className="bg-black/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Evolução da Receita</CardTitle>
              <CardDescription className="text-zinc-400">
                Receita diária dos últimos 7 dias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={stats?.charts?.dailyRevenue || []}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00E880" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#00E880" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#71717a"
                    tickFormatter={(value) => format(new Date(value), 'dd/MM', { locale: ptBR })}
                  />
                  <YAxis 
                    stroke="#71717a"
                    tickFormatter={(value) => formatCurrency(value).replace('R$', '')}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#18181b', 
                      border: '1px solid #27272a', 
                      borderRadius: '8px' 
                    }}
                    labelStyle={{ color: '#fff' }}
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => format(new Date(label), 'dd/MM/yyyy', { locale: ptBR })}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#00E880"
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-black/50 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-zinc-400">Total de Saques</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(stats?.metrics?.withdrawals?.total || 0)}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {stats?.metrics?.withdrawals?.pending || 0} pendentes
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-black/50 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-zinc-400">Jogadores Únicos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-white">
                  <CountUp end={stats?.kpis?.uniquePlayers || 0} duration={2.5} separator="." />
                </p>
                <p className="text-xs text-zinc-500 mt-1">No período selecionado</p>
              </CardContent>
            </Card>
            
            <Card className="bg-black/50 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-zinc-400">Valor Médio Raspadinha</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(stats?.kpis?.avgScratchValue || 0)}
                </p>
                <p className="text-xs text-zinc-500 mt-1">Por jogo</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {performanceMetrics.map((metric, index) => (
              <Card key={metric.label} className="bg-black/50 border-zinc-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-zinc-400">{metric.label}</CardTitle>
                    <metric.icon className="w-4 h-4 text-[#00E880]" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {metric.format(metric.value)}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Meta: {metric.format(metric.target)}
                    </p>
                  </div>
                  <Progress 
                    value={(metric.value / metric.target) * 100} 
                    className="h-2"
                  />
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">Performance</span>
                    <span className={`font-semibold ${
                      metric.value >= metric.target ? 'text-[#00E880]' : 'text-orange-400'
                    }`}>
                      {((metric.value / metric.target) * 100).toFixed(0)}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="games" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Game Distribution Pie Chart */}
            <Card className="bg-black/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Distribuição por Tipo</CardTitle>
                <CardDescription className="text-zinc-400">
                  Jogos realizados no período
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={gameDistributionWithPercentage}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ percentage }) => `${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {gameDistributionWithPercentage.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#18181b',
                        border: '1px solid #27272a',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            {/* Game Statistics */}
            <Card className="bg-black/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">Estatísticas de Jogos</CardTitle>
                <CardDescription className="text-zinc-400">
                  Métricas detalhadas do período
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-zinc-900/50 rounded-lg">
                  <span className="text-zinc-300">Total de Jogos</span>
                  <span className="text-white font-semibold">
                    {stats?.metrics?.games?.total || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-zinc-900/50 rounded-lg">
                  <span className="text-zinc-300">Receita em Jogos</span>
                  <span className="text-white font-semibold">
                    {formatCurrency(stats?.metrics?.games?.revenue || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-zinc-900/50 rounded-lg">
                  <span className="text-zinc-300">Prêmios Pagos</span>
                  <span className="text-white font-semibold">
                    {formatCurrency(stats?.metrics?.games?.payout || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-zinc-900/50 rounded-lg">
                  <span className="text-zinc-300">Taxa de Vitória</span>
                  <span className="text-white font-semibold">
                    {stats?.kpis?.winRate || 0}%
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Footer Info */}
      <Card className="bg-black/50 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-zinc-400">
            <Info className="w-4 h-4" />
            <p className="text-sm">
              Todas as estatísticas são calculadas usando o fuso horário de Brasília (GMT-3). 
              Os dados são atualizados automaticamente a cada 30 segundos.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}