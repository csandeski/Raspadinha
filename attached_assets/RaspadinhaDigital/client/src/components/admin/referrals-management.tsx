import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  UserPlus,
  TrendingUp,
  Search,
  Copy,
  CheckCircle,
  Clock,
  XCircle,
  Activity,
  RefreshCw,
  Download,
  Users,
  BarChart3,
  DollarSign,
  Wallet,
  Calendar,
  ArrowUpRight,
  Filter,
  Sparkles,
  Gift,
  Timer,
  AlertCircle,
  Share2,
  Link2,
  Target,
  Trophy,
  PiggyBank,
  HandCoins,
  Settings,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  PieChart,
  Pie,
  Cell
} from "recharts";

interface Referral {
  id: number;
  referrerId: number;
  referrerName: string;
  referrerEmail: string;
  referredId: number;
  referredName: string;
  referredEmail: string;
  status: "pending" | "validated" | "cancelled";
  validatedAt?: string;
  createdAt: string;
  totalEarnings: string;
  withdrawnEarnings: string;
  pendingEarnings: string;
  depositsMade: number;
  totalDeposited: string;
}

interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  pendingReferrals: number;
  totalEarnings: string;
  paidEarnings: string;
  pendingEarnings: string;
  conversionRate: number;
  averageEarningsPerReferral: string;
  topReferrers: Array<{
    userId: number;
    name: string;
    referralCount: number;
    totalEarnings: string;
  }>;
}

export default function ReferralsManagement() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "validated" | "cancelled">("all");
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [config, setConfig] = useState({
    paymentType: 'all_deposits',
    paymentAmount: '12.00',
    isActive: true
  });

  // Fetch config on mount
  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const sessionId = localStorage.getItem("adminSessionId");
      const response = await fetch('/api/admin/referral-config', {
        headers: {
          Authorization: `Bearer ${sessionId}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setConfig({
          paymentType: data.payment_type || data.paymentType || 'all_deposits',
          paymentAmount: data.payment_amount || data.paymentAmount || '12.00',
          isActive: data.is_active !== undefined ? data.is_active : (data.isActive !== undefined ? data.isActive : true)
        });
      }
    } catch (error) {
      // Error handled in UI
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    
    try {
      const sessionId = localStorage.getItem("adminSessionId");
      const response = await fetch('/api/admin/referral-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionId}`,
        },
        body: JSON.stringify(config)
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Configurações salvas com sucesso",
        });
      } else {
        toast({
          title: "Erro",
          description: data.message || "Erro ao salvar configurações",
          variant: "destructive"
        });
      }
    } catch (error) {
      // Error handled in UI
      toast({
        title: "Erro",
        description: "Erro ao salvar configurações",
        variant: "destructive"
      });
    } finally {
      setSavingConfig(false);
    }
  };

  // Fetch referrals
  const { data: referrals, isLoading, refetch } = useQuery<Referral[]>({
    queryKey: ["/api/admin/referrals"],
    queryFn: async () => {
      const sessionId = localStorage.getItem("adminSessionId");
      const response = await fetch("/api/admin/referrals", {
        headers: {
          Authorization: `Bearer ${sessionId}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch referrals");
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch referral stats
  const { data: stats } = useQuery<ReferralStats>({
    queryKey: ["/api/admin/referrals/stats"],
    queryFn: async () => {
      const sessionId = localStorage.getItem("adminSessionId");
      const response = await fetch("/api/admin/referrals/stats", {
        headers: {
          Authorization: `Bearer ${sessionId}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
  });

  const filteredReferrals = referrals?.filter((referral) => {
    const matchesSearch = 
      String(referral.id).includes(searchTerm) ||
      (referral.referrerName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (referral.referrerEmail || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (referral.referredName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (referral.referredEmail || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || referral.status === filterStatus;
    
    return matchesSearch && matchesStatus;
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado",
      description: "Link de indicação copiado para a área de transferência",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30">Pendente</Badge>;
      case "validated":
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Validado</Badge>;
      case "cancelled":
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Cancelado</Badge>;
      default:
        return null;
    }
  };

  // Enhanced statistics
  const enhancedStats = {
    totalReferrals: stats?.totalReferrals || 0,
    activeReferrals: stats?.activeReferrals || 0,
    pendingReferrals: stats?.pendingReferrals || 0,
    totalEarnings: parseFloat(stats?.totalEarnings || "0"),
    paidEarnings: parseFloat(stats?.paidEarnings || "0"),
    pendingEarnings: parseFloat(stats?.pendingEarnings || "0"),
    conversionRate: stats?.conversionRate || 0,
    averageEarningsPerReferral: parseFloat(stats?.averageEarningsPerReferral || "0"),
  };

  // Chart data - referrals over time
  const referralTrend = Array.from({length: 7}, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dayReferrals = referrals?.filter(r => new Date(r.createdAt).toDateString() === date.toDateString()) || [];
    const validated = dayReferrals.filter(r => r.status === "validated").length;
    const pending = dayReferrals.filter(r => r.status === "pending").length;
    
    return {
      day: date.toLocaleDateString('pt-BR', { weekday: 'short' }),
      total: dayReferrals.length,
      validated,
      pending,
    };
  });

  // Status distribution
  const statusDistribution = [
    { name: "Validados", value: referrals?.filter(r => r.status === "validated").length || 0, color: "#10b981" },
    { name: "Pendentes", value: referrals?.filter(r => r.status === "pending").length || 0, color: "#f59e0b" },
    { name: "Cancelados", value: referrals?.filter(r => r.status === "cancelled").length || 0, color: "#ef4444" },
  ];

  return (
    <div className="space-y-6">
      {/* Header da Página */}
      <div className="flex items-center justify-between">
        <div>
          <motion.h2 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-3xl font-bold text-white mb-2 flex items-center gap-3"
          >
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1, delay: 0.5 }}
            >
              <UserPlus className="w-8 h-8 text-[#00E880]" />
            </motion.div>
            Sistema de Indicações
          </motion.h2>
          <p className="text-zinc-400">Gerencie todas as indicações e comissões do programa Indique e Ganhe</p>
        </div>
        
        {/* Badges de status no header */}
        <div className="flex gap-2">
          <Badge variant="outline" className="border-[#00E880] text-[#00E880]">
            Total: {enhancedStats.totalReferrals}
          </Badge>
          {enhancedStats.pendingReferrals > 0 && (
            <Badge variant="outline" className="border-amber-500 text-amber-400 animate-pulse">
              Pendentes: {enhancedStats.pendingReferrals}
            </Badge>
          )}
        </div>
      </div>

      {/* Configuration Card */}
      <Card className="bg-gradient-to-br from-zinc-900/50 to-black/50 border-zinc-800 backdrop-blur-sm">
        <CardHeader className="border-b border-zinc-800">
          <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#00E880]" />
            Configurações do Sistema de Indicação
          </CardTitle>
          <CardDescription className="text-zinc-400">
            Configure os valores e regras de pagamento para o programa de indicações
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {loadingConfig ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 text-[#00E880] animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Active Status */}
              <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
                <div className="space-y-1">
                  <Label className="text-white font-medium">Sistema de Indicação</Label>
                  <p className="text-sm text-zinc-400">
                    {config.isActive ? 'Sistema ativo - indicações estão sendo processadas' : 'Sistema desativado - novas indicações não serão processadas'}
                  </p>
                </div>
                <Switch
                  checked={config.isActive}
                  onCheckedChange={(checked) => setConfig({ ...config, isActive: checked })}
                  className="data-[state=checked]:bg-[#00E880]"
                />
              </div>

              {/* Payment Amount */}
              <div className="space-y-2">
                <Label htmlFor="payment-amount" className="text-white font-medium">
                  Valor da Comissão (R$)
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <Input
                    id="payment-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={config.paymentAmount}
                    onChange={(e) => setConfig({ ...config, paymentAmount: e.target.value })}
                    className="pl-10 bg-zinc-900/50 border-zinc-800 text-white placeholder-zinc-500 focus:border-[#00E880] focus:ring-[#00E880]"
                    placeholder="12.00"
                  />
                </div>
                <p className="text-sm text-zinc-400">
                  Valor fixo em reais que será pago por cada indicação validada
                </p>
              </div>

              {/* Payment Type */}
              <div className="space-y-3">
                <Label className="text-white font-medium">Tipo de Pagamento</Label>
                <RadioGroup value={config.paymentType} onValueChange={(value) => setConfig({ ...config, paymentType: value })}>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors">
                      <RadioGroupItem value="first_deposit" id="first_deposit" className="mt-1" />
                      <label htmlFor="first_deposit" className="flex-1 cursor-pointer">
                        <div className="font-medium text-white">Pagar apenas no primeiro depósito</div>
                        <div className="text-sm text-zinc-400 mt-1">
                          O indicador recebe a comissão apenas quando o indicado faz seu primeiro depósito
                        </div>
                      </label>
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors">
                      <RadioGroupItem value="all_deposits" id="all_deposits" className="mt-1" />
                      <label htmlFor="all_deposits" className="flex-1 cursor-pointer">
                        <div className="font-medium text-white">Pagar em todos os depósitos</div>
                        <div className="text-sm text-zinc-400 mt-1">
                          O indicador recebe a comissão sempre que o indicado faz um depósito
                        </div>
                      </label>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleSaveConfig}
                  disabled={savingConfig}
                  className="bg-[#00E880] text-black hover:bg-[#00E880]/90 font-medium"
                >
                  {savingConfig ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Salvar Configurações
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-zinc-400 text-sm mb-1">Indicações Totais</p>
                  <p className="text-3xl font-bold text-white">
                    <CountUp end={enhancedStats.totalReferrals} duration={1.5} />
                  </p>
                  <Badge className="mt-2 bg-[#00E880]/10 text-[#00E880] border-[#00E880]/20">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {enhancedStats.activeReferrals} ativas
                  </Badge>
                </div>
                <div className="p-3 bg-gradient-to-br from-[#00E880]/20 to-[#00E880]/30 rounded-xl">
                  <Share2 className="w-6 h-6 text-[#00E880]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-zinc-400 text-sm mb-1">Ganhos Totais</p>
                  <p className="text-3xl font-bold text-white">
                    R$ <CountUp end={enhancedStats.totalEarnings} duration={1.5} decimals={2} />
                  </p>
                  <p className="text-xs text-blue-400 mt-2">
                    R$ {enhancedStats.averageEarningsPerReferral.toFixed(2)} por indicação
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl">
                  <DollarSign className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-zinc-400 text-sm mb-1">Comissões Pagas</p>
                  <p className="text-3xl font-bold text-white">
                    R$ <CountUp end={enhancedStats.paidEarnings} duration={1.5} decimals={2} />
                  </p>
                  <p className="text-xs text-amber-400 mt-2">
                    R$ {enhancedStats.pendingEarnings.toFixed(2)} pendente
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl">
                  <HandCoins className="w-6 h-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-orange-100 text-sm mb-1">Taxa de Conversão</p>
                  <p className="text-3xl font-bold text-white">
                    <CountUp end={enhancedStats.conversionRate} duration={1.5} decimals={1} />%
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <Target className="w-4 h-4 text-orange-300" />
                    <span className="text-orange-200 text-xs">
                      <CountUp end={enhancedStats.pendingReferrals} duration={1} /> pendentes
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Activity className="w-6 h-6 text-white animate-pulse" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution */}
        <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Filter className="w-5 h-5 text-[#00E880]" />
              Distribuição por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={60}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {statusDistribution.map((status) => (
                <div key={status.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
                    <span className="text-zinc-300 text-sm">{status.name}</span>
                  </div>
                  <span className="text-zinc-400 text-sm">{status.value} indicações</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Referral Trend */}
        <Card className="lg:col-span-2 bg-black/50 border-zinc-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#00E880]" />
              Tendência de Indicações (7 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={referralTrend}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00E880" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#00E880" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="day" stroke="#71717a" />
                <YAxis stroke="#71717a" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#00E880"
                  fillOpacity={1}
                  fill="url(#colorTotal)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Referrers */}
      {stats?.topReferrers && stats.topReferrers.length > 0 && (
        <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm">
          <CardHeader className="border-b border-zinc-800">
            <CardTitle className="text-xl font-bold text-[#00E880]">Top Indicadores</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {stats.topReferrers.slice(0, 3).map((referrer, index) => (
                <div
                  key={referrer.userId}
                  className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-3 rounded-full ${
                      index === 0 ? 'bg-yellow-500/20' :
                      index === 1 ? 'bg-gray-400/20' :
                      'bg-orange-600/20'
                    }`}>
                      <Trophy className={`w-6 h-6 ${
                        index === 0 ? 'text-yellow-500' :
                        index === 1 ? 'text-gray-400' :
                        'text-orange-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-semibold">{referrer.name}</p>
                      <p className="text-zinc-500 text-sm">#{index + 1} Indicador</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400 text-sm">Indicações</span>
                      <span className="text-white font-semibold">{referrer.referralCount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400 text-sm">Ganhos</span>
                      <span className="text-[#00E880] font-semibold">R$ {referrer.totalEarnings}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <Input
                type="text"
                placeholder="Buscar por nome, email ou ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-zinc-900/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-[#00E880] transition-colors"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={filterStatus === "all" ? "default" : "outline"}
                onClick={() => setFilterStatus("all")}
                className={filterStatus === "all" 
                  ? "bg-gradient-to-r from-[#00E880] to-[#00D470] text-black font-bold hover:from-[#00D470] hover:to-[#00C560] transform hover:scale-105 transition-all" 
                  : "bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:bg-zinc-700/50 hover:text-white transition-all"
                }
              >
                Todos
              </Button>
              <Button
                size="sm"
                variant={filterStatus === "pending" ? "default" : "outline"}
                onClick={() => setFilterStatus("pending")}
                className={filterStatus === "pending" 
                  ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold hover:from-orange-600 hover:to-orange-700 transform hover:scale-105 transition-all" 
                  : "bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:bg-zinc-700/50 hover:text-white transition-all"
                }
              >
                <Clock className="w-4 h-4 mr-1" />
                Pendentes
              </Button>
              <Button
                size="sm"
                variant={filterStatus === "validated" ? "default" : "outline"}
                onClick={() => setFilterStatus("validated")}
                className={filterStatus === "validated" 
                  ? "bg-gradient-to-r from-green-500 to-green-600 text-white font-bold hover:from-green-600 hover:to-green-700 transform hover:scale-105 transition-all" 
                  : "bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:bg-zinc-700/50 hover:text-white transition-all"
                }
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Validados
              </Button>
              <Button
                size="sm"
                variant={filterStatus === "cancelled" ? "default" : "outline"}
                onClick={() => setFilterStatus("cancelled")}
                className={filterStatus === "cancelled" 
                  ? "bg-gradient-to-r from-red-500 to-red-600 text-white font-bold hover:from-red-600 hover:to-red-700 transform hover:scale-105 transition-all" 
                  : "bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:bg-zinc-700/50 hover:text-white transition-all"
                }
              >
                <XCircle className="w-4 h-4 mr-1" />
                Cancelados
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referrals Table */}
      <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm">
        <CardHeader className="border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold text-[#00E880]">Histórico de Indicações</CardTitle>
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: isLoading ? 360 : 0 }}
                transition={{ duration: 1, repeat: isLoading ? Infinity : 0, ease: "linear" }}
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'text-[#00E880]' : 'text-zinc-500'}`} />
              </motion.div>
              <Badge variant="outline" className="border-[#00E880] text-[#00E880]">
                {filteredReferrals?.length || 0} indicações
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-zinc-500">Carregando indicações...</div>
            </div>
          ) : filteredReferrals && filteredReferrals.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-zinc-900/50">
                    <TableHead className="text-zinc-400 font-semibold uppercase tracking-wider text-xs">ID</TableHead>
                    <TableHead className="text-zinc-400 font-semibold uppercase tracking-wider text-xs">Indicador</TableHead>
                    <TableHead className="text-zinc-400 font-semibold uppercase tracking-wider text-xs">Indicado</TableHead>
                    <TableHead className="text-zinc-400 font-semibold uppercase tracking-wider text-xs">Status</TableHead>
                    <TableHead className="text-zinc-400 font-semibold uppercase tracking-wider text-xs">Ganhos</TableHead>
                    <TableHead className="text-zinc-400 font-semibold uppercase tracking-wider text-xs">Depósitos</TableHead>
                    <TableHead className="text-zinc-400 font-semibold uppercase tracking-wider text-xs">Data</TableHead>
                    <TableHead className="text-zinc-400 font-semibold uppercase tracking-wider text-xs">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReferrals.map((referral, index) => (
                    <motion.tr 
                      key={referral.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-zinc-800 hover:bg-zinc-900/50 transition-colors"
                    >
                      <TableCell className="font-mono text-zinc-300">
                        <span className="text-xs">{referral.id}</span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-white font-medium">{referral.referrerName}</p>
                          <p className="text-zinc-500 text-sm">{referral.referrerEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-white font-medium">{referral.referredName}</p>
                          <p className="text-zinc-500 text-sm">{referral.referredEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(referral.status)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[#00E880] font-bold">R$ {referral.totalEarnings}</span>
                            <span className="text-zinc-500 text-xs">total</span>
                          </div>
                          {parseFloat(referral.pendingEarnings) > 0 && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-orange-500" />
                              <span className="text-orange-500 text-xs">
                                R$ {referral.pendingEarnings} pendente
                              </span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-white">{referral.depositsMade}</span>
                            <span className="text-zinc-500 text-xs">depósitos</span>
                          </div>
                          <span className="text-zinc-400 text-xs">
                            R$ {referral.totalDeposited} total
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="text-white">{formatDate(referral.createdAt).split(" ")[0]}</p>
                          <p className="text-zinc-500">{formatDate(referral.createdAt).split(" ")[1]}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {referral.status === "pending" && (
                            <div className="flex items-center gap-1">
                              <Timer className="w-4 h-4 text-orange-500 animate-pulse" />
                              <span className="text-orange-500 text-xs">Aguardando</span>
                            </div>
                          )}
                          {referral.status === "validated" && (
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <span className="text-green-500 text-xs">Ativo</span>
                            </div>
                          )}
                          {referral.status === "cancelled" && (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <UserPlus className="w-16 h-16 text-zinc-700" />
              <p className="text-zinc-500">Nenhuma indicação encontrada</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}