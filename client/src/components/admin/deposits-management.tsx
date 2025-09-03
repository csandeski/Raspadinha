import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DollarSign,
  TrendingUp,
  Search,
  Copy,
  CheckCircle,
  Clock,
  XCircle,
  Activity,
  RefreshCw,
  Download,
  CreditCard,
  BarChart3,
  Users,
  Calendar,
  ArrowUpRight,
  Filter,
  Sparkles,
  Wallet,
  Timer,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatMoney } from "@/lib/utils";
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

interface Deposit {
  id: number;
  displayId: string;
  userId: number;
  userName: string;
  userEmail: string;
  amount: string;
  pixTransactionId?: string;
  transactionId?: string;
  status: "pending" | "completed" | "failed" | "cancelled" | "expired";
  paymentProvider?: string;
  createdAt: string;
  completedAt?: string;
}

interface DepositStats {
  totalDeposits: number;
  totalAmount: string;
  todayDeposits: number;
  todayAmount: string;
  pendingCount: number;
  pendingAmount: string;
}

export default function DepositsManagement() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "completed" | "failed" | "cancelled">("all");

  // Fetch deposits
  const { data: deposits, isLoading } = useQuery<Deposit[]>({
    queryKey: ["/api/admin/deposits"],
    queryFn: async () => {
      const sessionId = localStorage.getItem("adminSessionId");
      const response = await fetch("/api/admin/deposits", {
        headers: {
          Authorization: `Bearer ${sessionId}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch deposits");
      return response.json();
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch deposit stats
  const { data: stats } = useQuery<DepositStats>({
    queryKey: ["/api/admin/deposits/stats"],
    queryFn: async () => {
      const sessionId = localStorage.getItem("adminSessionId");
      const response = await fetch("/api/admin/deposits/stats", {
        headers: {
          Authorization: `Bearer ${sessionId}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
  });

  const filteredDeposits = deposits?.filter((deposit) => {
    const matchesSearch = 
      String(deposit.id).includes(searchTerm) ||
      String(deposit.displayId).includes(searchTerm) ||
      (deposit.userName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (deposit.userEmail || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (deposit.pixTransactionId || "").includes(searchTerm) ||
      (deposit.transactionId || "").includes(searchTerm);
    
    const matchesStatus = filterStatus === "all" || deposit.status === filterStatus;
    
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
      description: "ID da transação copiado para a área de transferência",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30">Pendente</Badge>;
      case "completed":
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Concluído</Badge>;
      case "failed":
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Falhou</Badge>;
      case "cancelled":
        return <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30">Cancelado</Badge>;
      case "expired":
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Expirado</Badge>;
      default:
        return <Badge className="bg-purple-500/20 text-purple-500 border-purple-500/30">Sem Status</Badge>;
    }
  };

  // Enhanced statistics
  const enhancedStats = {
    totalDeposits: stats?.totalDeposits || 0,
    totalAmount: parseFloat(stats?.totalAmount || "0"),
    todayDeposits: stats?.todayDeposits || 0,
    todayAmount: parseFloat(stats?.todayAmount || "0"),
    pendingCount: stats?.pendingCount || 0,
    pendingAmount: parseFloat(stats?.pendingAmount || "0"),
    avgDeposit: stats?.totalDeposits ? parseFloat(stats?.totalAmount || "0") / stats.totalDeposits : 0,
    completionRate: stats?.totalDeposits ? ((stats.totalDeposits - (stats?.pendingCount || 0)) / stats.totalDeposits * 100) : 0,
  };

  // Chart data
  const depositTrend = Array.from({length: 7}, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dayDeposits = deposits?.filter(d => new Date(d.createdAt).toDateString() === date.toDateString()) || [];
    const amount = dayDeposits.reduce((sum, d) => sum + parseFloat(d.amount), 0);
    const count = dayDeposits.length;
    
    return {
      day: date.toLocaleDateString('pt-BR', { weekday: 'short' }),
      amount,
      count,
    };
  });

  const statusDistribution = [
    { name: "Concluídos", value: deposits?.filter(d => d.status === "completed").length || 0, color: "#10b981" },
    { name: "Pendentes", value: deposits?.filter(d => d.status === "pending").length || 0, color: "#f59e0b" },
    { name: "Falhas", value: deposits?.filter(d => d.status === "failed").length || 0, color: "#ef4444" },
    { name: "Cancelados", value: deposits?.filter(d => d.status === "cancelled").length || 0, color: "#71717a" },
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
              <CreditCard className="w-8 h-8 text-[#00E880]" />
            </motion.div>
            Gerenciamento de Depósitos
          </motion.h2>
          <p className="text-zinc-400">Acompanhe todos os depósitos realizados na plataforma</p>
        </div>
        
        {/* Badges de status no header */}
        <div className="flex gap-2">
          <Badge variant="outline" className="border-[#00E880] text-[#00E880]">
            Total: {stats?.totalDeposits || 0}
          </Badge>
          <Badge variant="outline" className="border-blue-500 text-blue-400">
            Hoje: {stats?.todayDeposits || 0}
          </Badge>
          {(stats?.pendingCount || 0) > 0 && (
            <Badge variant="outline" className="border-amber-500 text-amber-400">
              Pendentes: {stats?.pendingCount || 0}
            </Badge>
          )}
        </div>
      </div>

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
                  <p className="text-zinc-400 text-sm mb-1">Receita Total</p>
                  <p className="text-3xl font-bold text-white">
                    R$ <CountUp end={enhancedStats.totalAmount} duration={1.5} decimals={2} separator="." decimal="," />
                  </p>
                  <p className="text-xs text-[#00E880] mt-2">
                    <span className="font-bold">
                      <CountUp end={enhancedStats.totalDeposits} duration={1} />
                    </span> depósitos
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-br from-[#00E880]/20 to-[#00E880]/30 rounded-xl">
                  <DollarSign className="w-6 h-6 text-[#00E880]" />
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
                  <p className="text-zinc-400 text-sm mb-1">Hoje</p>
                  <p className="text-3xl font-bold text-white">
                    R$ <CountUp end={enhancedStats.todayAmount} duration={1.5} decimals={2} separator="." decimal="," />
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <Activity className="w-4 h-4 text-white/70" />
                    <span className="text-white/70 text-xs">
                      <CountUp end={enhancedStats.todayDeposits} duration={1} /> depósitos
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Calendar className="w-6 h-6 text-white" />
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
          <Card className="bg-gradient-to-br from-amber-500 to-orange-600 border-0 text-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white/90 text-sm mb-1">Pendentes</p>
                  <p className="text-3xl font-bold">
                    <CountUp end={enhancedStats.pendingCount} duration={1.5} />
                  </p>
                  <p className="text-white/70 text-xs mt-2">
                    R$ <CountUp end={enhancedStats.pendingAmount} duration={1} decimals={2} />
                  </p>
                </div>
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Clock className="w-6 h-6 text-white animate-pulse" />
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
          <Card className="bg-gradient-to-br from-purple-500 to-pink-600 border-0 text-white">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white/90 text-sm mb-1">Taxa de Conclusão</p>
                  <p className="text-3xl font-bold">
                    <CountUp end={enhancedStats.completionRate} duration={1.5} decimals={1} />%
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <Sparkles className="w-4 h-4 text-white/70" />
                    <span className="text-white/70 text-xs">
                      Depósito médio: R$ <CountUp end={enhancedStats.avgDeposit} duration={1} decimals={2} />
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <CheckCircle className="w-6 h-6 text-white" />
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
                  <span className="text-zinc-400 text-sm">{status.value} depósitos</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Deposit Trend */}
        <Card className="lg:col-span-2 bg-black/50 border-zinc-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#00E880]" />
              Tendência de Depósitos (7 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={depositTrend}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00E880" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#00E880" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="day" stroke="#71717a" />
                <YAxis stroke="#71717a" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                  formatter={(value: number, name: string) => {
                    if (name === 'amount') return [`R$ ${value.toFixed(2)}`, 'Valor'];
                    return [value, 'Quantidade'];
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#00E880"
                  fillOpacity={1}
                  fill="url(#colorAmount)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros e Ações */}
      <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Busca */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input
                type="text"
                placeholder="Buscar por ID, nome, email ou transação..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-[#00E880] focus:ring-[#00E880]/20"
              />
            </div>

            {/* Filtros */}
            <div className="flex gap-2">
              <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                <SelectTrigger className="w-[140px] bg-zinc-900/50 border-zinc-800 text-zinc-300">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="completed">Concluídos</SelectItem>
                  <SelectItem value="failed">Falhas</SelectItem>
                  <SelectItem value="cancelled">Cancelados</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                variant="outline"
                className="bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800/50"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deposits Table */}
      <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm">
        <CardHeader className="border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold text-[#00E880]">Histórico de Depósitos</CardTitle>
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: isLoading ? 360 : 0 }}
                transition={{ duration: 1, repeat: isLoading ? Infinity : 0, ease: "linear" }}
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'text-[#00E880]' : 'text-zinc-500'}`} />
              </motion.div>
              <Badge variant="outline" className="border-[#00E880] text-[#00E880]">
                {filteredDeposits?.length || 0} depósitos
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-zinc-500">Carregando depósitos...</div>
            </div>
          ) : filteredDeposits && filteredDeposits.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-zinc-900/50">
                    <TableHead className="text-zinc-400 font-semibold uppercase tracking-wider text-xs">ID</TableHead>
                    <TableHead className="text-zinc-400 font-semibold uppercase tracking-wider text-xs">Display ID</TableHead>
                    <TableHead className="text-zinc-400 font-semibold uppercase tracking-wider text-xs">Transaction ID</TableHead>
                    <TableHead className="text-zinc-400 font-semibold uppercase tracking-wider text-xs">Usuário</TableHead>
                    <TableHead className="text-zinc-400 font-semibold uppercase tracking-wider text-xs">Valor</TableHead>
                    <TableHead className="text-zinc-400 font-semibold uppercase tracking-wider text-xs">Provedor</TableHead>
                    <TableHead className="text-zinc-400 font-semibold uppercase tracking-wider text-xs">Status</TableHead>
                    <TableHead className="text-zinc-400 font-semibold uppercase tracking-wider text-xs">Data</TableHead>
                    <TableHead className="text-zinc-400 font-semibold uppercase tracking-wider text-xs">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDeposits.map((deposit, index) => (
                    <motion.tr 
                      key={deposit.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-zinc-800 hover:bg-zinc-900/50 transition-colors"
                    >
                      <TableCell className="font-mono text-zinc-300">
                        <span className="text-xs">{deposit.id}</span>
                      </TableCell>
                      <TableCell className="font-mono text-zinc-300">
                        <span className="text-xs">{deposit.displayId}</span>
                      </TableCell>
                      <TableCell>
                        {deposit.transactionId || deposit.pixTransactionId ? (
                          <div className="flex items-center gap-2">
                            <code className="bg-zinc-900 px-2 py-1 rounded text-xs text-zinc-400 block whitespace-nowrap overflow-x-auto max-w-[300px]">
                              {deposit.transactionId || deposit.pixTransactionId}
                            </code>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => copyToClipboard(deposit.transactionId || deposit.pixTransactionId || "")}
                              className="h-7 w-7 hover:bg-zinc-800"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-zinc-500">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-white font-medium">{deposit.userName}</p>
                          <p className="text-zinc-500 text-sm">{deposit.userEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-[#00E880] font-bold text-lg">
                          R$ {formatMoney(deposit.amount)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {deposit.paymentProvider ? (
                          <Badge 
                            variant="outline" 
                            className={`${
                              deposit.paymentProvider === 'orinpay' 
                                ? 'border-blue-500 text-blue-500' 
                                : 'border-purple-500 text-purple-500'
                            }`}
                          >
                            {deposit.paymentProvider === 'orinpay' ? 'OrinPay' : 'IronPay'}
                          </Badge>
                        ) : (
                          <span className="text-zinc-500">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(deposit.status || "pending")}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="text-white">{formatDate(deposit.createdAt).split(" ")[0]}</p>
                          <p className="text-zinc-500">{formatDate(deposit.createdAt).split(" ")[1]}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {deposit.status === "pending" && (
                            <div className="flex items-center gap-1">
                              <Timer className="w-4 h-4 text-orange-500 animate-pulse" />
                              <span className="text-orange-500 text-xs">Verificando</span>
                            </div>
                          )}
                          {deposit.status === "completed" && (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                          {deposit.status === "failed" && (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          )}
                          {deposit.status === "cancelled" && (
                            <XCircle className="w-4 h-4 text-zinc-500" />
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
              <Wallet className="w-16 h-16 text-zinc-700" />
              <p className="text-zinc-500">Nenhum depósito encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}