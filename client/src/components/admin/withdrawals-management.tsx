import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Copy,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Download,
  Activity,
  Ban,
  User,
  Mail,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Calendar,
  Zap,
  Check,
  X,
  Eye,
  MoreVertical,
  Users,
  UserCheck,
  Shield,
  Lock,
  Send,
  EyeOff,
  FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { WithdrawalReceipt } from "@/components/withdrawal-receipt";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Withdrawal {
  id: number;
  displayId: string;
  userId: number;
  userName: string;
  userEmail: string;
  amount: string;
  pixKey: string;
  pixKeyType: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
  processedAt?: string;
  adminNotes?: string;
  // Receipt fields
  endToEndId?: string;
  transactionHash?: string;
  originName?: string;
  originCnpj?: string;
  destinationName?: string;
  destinationDocument?: string;
}

export default function WithdrawalsManagement() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [withdrawalType, setWithdrawalType] = useState<"players" | "affiliates" | "partners">("players");

  const [isApproving, setIsApproving] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptWithdrawal, setReceiptWithdrawal] = useState<Withdrawal | null>(null);

  // Invalidate queries when withdrawal type changes
  useEffect(() => {
    const queryKey = withdrawalType === "players" 
      ? "/api/admin/withdrawals" 
      : withdrawalType === "affiliates"
      ? "/api/admin/affiliate-withdrawals"
      : "/api/admin/partner-withdrawals";
    queryClient.invalidateQueries({ queryKey: [queryKey] });
  }, [withdrawalType]);

  // Fetch withdrawals based on type
  const { data: withdrawals, isLoading } = useQuery<Withdrawal[]>({
    queryKey: [
      withdrawalType === "players" 
        ? "/api/admin/withdrawals" 
        : withdrawalType === "affiliates"
        ? "/api/admin/affiliate-withdrawals"
        : "/api/admin/partner-withdrawals"
    ],
    queryFn: async () => {
      const sessionId = localStorage.getItem("adminSessionId");
      const endpoint = withdrawalType === "players" 
        ? "/api/admin/withdrawals" 
        : withdrawalType === "affiliates"
        ? "/api/admin/affiliate-withdrawals"
        : "/api/admin/partner-withdrawals";
      
      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${sessionId}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch withdrawals");
      const data = await response.json();
      
      // Transform affiliate withdrawals to match player withdrawal structure
      if (withdrawalType === "affiliates") {
        return data.map((w: any) => ({
          id: w.id,
          displayId: w.displayId || w.id.toString(),
          userId: w.affiliate_id,
          userName: w.affiliate_name || 'Afiliado',
          userEmail: w.affiliate_email || '',
          amount: w.amount,
          pixKey: w.pix_key || '',
          pixKeyType: w.pix_key_type || 'pix',
          status: w.status,
          requestedAt: w.requested_at,
          processedAt: w.processed_at,
          adminNotes: w.admin_notes
        }));
      }
      
      // Partner withdrawals already come in the correct format from backend
      return data;
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Process withdrawal
  const processWithdrawalMutation = useMutation({
    mutationFn: async ({ withdrawalId, action, adminNotes, adminPassword }: { 
      withdrawalId: number; 
      action: "approve" | "reject" | "paid"; 
      adminNotes?: string;
      adminPassword?: string;
    }) => {
      const sessionId = localStorage.getItem("adminSessionId");
      const endpoint = withdrawalType === "players" 
        ? `/api/admin/withdrawals/${withdrawalId}/${action}`
        : withdrawalType === "affiliates"
        ? `/api/admin/affiliate-withdrawals/${withdrawalId}`
        : `/api/admin/partner-withdrawals/${withdrawalId}`;
      
      const response = await fetch(endpoint, {
        method: withdrawalType === "players" ? "POST" : "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionId}`,
        },
        body: JSON.stringify(
          withdrawalType === "players" 
            ? { adminNotes, adminPassword }
            : { action, admin_notes: adminNotes }
        ),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to process withdrawal");
      }
      
      return data;
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Sucesso",
        description: data.message || `Saque ${variables.action === "approve" ? "aprovado" : variables.action === "paid" ? "marcado como pago" : "rejeitado"} com sucesso`,
      });
      const queryKey = withdrawalType === "players" 
        ? "/api/admin/withdrawals" 
        : withdrawalType === "affiliates"
        ? "/api/admin/affiliate-withdrawals"
        : "/api/admin/partner-withdrawals";
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      setShowProcessModal(false);
      setAdminNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao processar saque",
        variant: "destructive",
      });
    },
  });

  const filteredWithdrawals = withdrawals?.filter((withdrawal) => {
    const matchesSearch = 
      String(withdrawal.displayId).includes(searchTerm) ||
      (withdrawal.userName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (withdrawal.userEmail || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (withdrawal.pixKey || "").includes(searchTerm);
    
    const matchesStatus = filterStatus === "all" || withdrawal.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Não informado";
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Data inválida";
    
    return date.toLocaleDateString("pt-BR", {
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
      description: "Chave PIX copiada para a área de transferência",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 font-semibold px-3 py-1">
            <Clock className="w-3 h-3 mr-1" />
            Pendente
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 font-semibold px-3 py-1">
            <CheckCircle className="w-3 h-3 mr-1" />
            Pago
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30 font-semibold px-3 py-1">
            <XCircle className="w-3 h-3 mr-1" />
            Rejeitado
          </Badge>
        );
      default:
        return null;
    }
  };

  const pendingCount = withdrawals?.filter(w => w.status === "pending").length || 0;

  // Calculate stats
  const withdrawalStats = {
    total: withdrawals?.length || 0,
    pending: withdrawals?.filter(w => w.status === "pending").length || 0,
    approved: withdrawals?.filter(w => w.status === "approved").length || 0,
    rejected: withdrawals?.filter(w => w.status === "rejected").length || 0,
    totalAmount: withdrawals?.reduce((sum, w) => sum + parseFloat(w.amount), 0) || 0,
    pendingAmount: withdrawals?.filter(w => w.status === "pending").reduce((sum, w) => sum + parseFloat(w.amount), 0) || 0,
  };

  // Chart data
  const statusDistribution = [
    { name: "Pendentes", value: withdrawalStats.pending, color: "#fb923c" },
    { name: "Pagos", value: withdrawalStats.approved, color: "#00E880" },
    { name: "Rejeitados", value: withdrawalStats.rejected, color: "#ef4444" },
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
              <DollarSign className="w-8 h-8 text-[#00E880]" />
            </motion.div>
            Gerenciamento de Saques
          </motion.h2>
          <p className="text-zinc-400">Processe e acompanhe todas as solicitações de saque</p>
        </div>
        
        {/* Badges de status no header */}
        <div className="flex gap-2">
          <Badge variant="outline" className="border-[#00E880] text-[#00E880]">
            Total: {withdrawalStats.total}
          </Badge>
          {withdrawalStats.pending > 0 && (
            <Badge variant="outline" className="border-amber-500 text-amber-400 animate-pulse">
              Pendentes: {withdrawalStats.pending}
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
                  <p className="text-zinc-400 text-sm mb-1">Saques Pendentes</p>
                  <p className="text-3xl font-bold text-white">
                    <CountUp end={withdrawalStats.pending} duration={1.5} />
                  </p>
                  <p className="text-amber-400 text-sm mt-2">
                    R$ {withdrawalStats.pendingAmount.toFixed(2)}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-br from-amber-500/20 to-amber-600/20 rounded-xl">
                  <Clock className="w-6 h-6 text-amber-400" />
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
                  <p className="text-zinc-400 text-sm mb-1">Saques Pagos</p>
                  <p className="text-3xl font-bold text-white">
                    <CountUp end={withdrawalStats.approved} duration={1.5} />
                  </p>
                  <Badge className="mt-2 bg-[#00E880]/10 text-[#00E880] border-[#00E880]/20">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    +23%
                  </Badge>
                </div>
                <div className="p-3 bg-gradient-to-br from-[#00E880]/20 to-[#00E880]/30 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-[#00E880]" />
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
                  <p className="text-zinc-400 text-sm mb-1">Saques Rejeitados</p>
                  <p className="text-3xl font-bold text-white">
                    <CountUp end={withdrawalStats.rejected} duration={1.5} />
                  </p>
                  <p className="text-red-400 text-xs mt-2">
                    {withdrawalStats.total > 0 ? ((withdrawalStats.rejected / withdrawalStats.total) * 100).toFixed(1) : 0}% do total
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-xl">
                  <XCircle className="w-6 h-6 text-red-400" />
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
                  <p className="text-zinc-400 text-sm mb-1">Volume Total</p>
                  <p className="text-2xl font-bold text-white">
                    R$ <CountUp end={withdrawalStats.totalAmount} duration={1.5} decimals={2} />
                  </p>
                  <Badge className="mt-2 bg-purple-500/10 text-purple-400 border-purple-500/20">
                    <Activity className="w-3 h-3 mr-1" />
                    Esta semana
                  </Badge>
                </div>
                <div className="p-3 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl">
                  <Wallet className="w-6 h-6 text-purple-400" />
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
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
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
                  <span className="text-zinc-400 text-sm">{status.value} saques</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Weekly Volume */}
        <Card className="lg:col-span-2 bg-black/50 border-zinc-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#00E880]" />
              Volume Semanal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={[
                { day: "Seg", amount: 2500 },
                { day: "Ter", amount: 3200 },
                { day: "Qua", amount: 2800 },
                { day: "Qui", amount: 4100 },
                { day: "Sex", amount: 3900 },
                { day: "Sáb", amount: 2200 },
                { day: "Dom", amount: 1800 },
              ]}>
                <defs>
                  <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00E880" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#00E880" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="day" stroke="#71717a" />
                <YAxis stroke="#71717a" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                  formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Volume']}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#00E880"
                  fillOpacity={1}
                  fill="url(#colorVolume)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros */}
      <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ rotate: 0 }}
                animate={{ rotate: 180 }}
                transition={{ duration: 0.5 }}
              >
                <Filter className="w-5 h-5 text-[#00E880]" />
              </motion.div>
              <h3 className="text-lg font-semibold text-white">Filtros e Busca</h3>
            </div>
            
            {/* Toggle entre Jogadores, Afiliados e Parceiros */}
            <div className="flex items-center gap-2 bg-zinc-900/50 rounded-lg p-1 border border-zinc-700">
              <Button
                variant={withdrawalType === "players" ? "default" : "ghost"}
                size="sm"
                onClick={() => setWithdrawalType("players")}
                className={`${
                  withdrawalType === "players"
                    ? "bg-[#00E880] text-black hover:bg-[#00E880]/90"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                } font-medium transition-all`}
              >
                <Users className="w-4 h-4 mr-2" />
                Jogadores
              </Button>
              <Button
                variant={withdrawalType === "affiliates" ? "default" : "ghost"}
                size="sm"
                onClick={() => setWithdrawalType("affiliates")}
                className={`${
                  withdrawalType === "affiliates"
                    ? "bg-[#00E880] text-black hover:bg-[#00E880]/90"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                } font-medium transition-all`}
              >
                <UserCheck className="w-4 h-4 mr-2" />
                Afiliados
              </Button>
              <Button
                variant={withdrawalType === "partners" ? "default" : "ghost"}
                size="sm"
                onClick={() => setWithdrawalType("partners")}
                className={`${
                  withdrawalType === "partners"
                    ? "bg-[#00E880] text-black hover:bg-[#00E880]/90"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                } font-medium transition-all`}
              >
                <Shield className="w-4 h-4 mr-2" />
                Parceiros
              </Button>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-400" />
              <Input
                type="text"
                placeholder={
                  withdrawalType === "players" 
                    ? "Buscar por ID, nome, email ou chave PIX..." 
                    : withdrawalType === "affiliates"
                    ? "Buscar por ID, afiliado, email ou chave PIX..."
                    : "Buscar por ID, parceiro, email ou chave PIX..."
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-zinc-900/50 border-zinc-700 text-white placeholder-zinc-500 focus:border-[#00E880] focus:ring-[#00E880]/20"
              />
            </div>
            
            <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
              <SelectTrigger className="w-[200px] bg-zinc-900/50 border-zinc-700 text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    Pendentes ({pendingCount})
                  </div>
                </SelectItem>
                <SelectItem value="approved">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#00E880]" />
                    Pagos
                  </div>
                </SelectItem>
                <SelectItem value="rejected">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-400" />
                    Rejeitados
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals"] })}
              className="border-zinc-700 hover:bg-zinc-800 text-zinc-400 hover:text-white"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Withdrawals Table */}
      <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm">
        <CardHeader className="border-b border-zinc-800">
          <CardTitle className="text-2xl font-bold text-[#00E880]">Lista de Saques</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00E880]" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900/50">
                    <TableHead className="text-zinc-400 font-semibold uppercase tracking-wider text-xs">ID</TableHead>
                    <TableHead className="text-zinc-400 font-semibold uppercase tracking-wider text-xs">Usuário</TableHead>
                    <TableHead className="text-zinc-400 font-semibold uppercase tracking-wider text-xs">Valor</TableHead>
                    <TableHead className="text-zinc-400 font-semibold uppercase tracking-wider text-xs">Chave PIX</TableHead>
                    <TableHead className="text-zinc-400 font-semibold uppercase tracking-wider text-xs">Tipo</TableHead>
                    <TableHead className="text-zinc-400 font-semibold uppercase tracking-wider text-xs">Status</TableHead>
                    <TableHead className="text-zinc-400 font-semibold uppercase tracking-wider text-xs">Solicitado em</TableHead>
                    <TableHead className="text-zinc-400 font-semibold uppercase tracking-wider text-xs">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!filteredWithdrawals || filteredWithdrawals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-64">
                        <div className="flex flex-col items-center justify-center space-y-4">
                          <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-[#00E880]/20 to-purple-500/20 blur-3xl" />
                            <motion.div
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ duration: 0.5 }}
                              className="relative p-6 bg-zinc-900/50 rounded-full border border-zinc-800"
                            >
                              <Wallet className="w-16 h-16 text-zinc-600" />
                            </motion.div>
                          </div>
                          <div className="text-center space-y-2">
                            <h3 className="text-xl font-semibold text-zinc-300">
                              Nenhum saque {withdrawalType === "affiliates" ? "de afiliados" : ""} encontrado
                            </h3>
                            <p className="text-sm text-zinc-500 max-w-md">
                              {filterStatus === "pending" 
                                ? "Não há solicitações de saque pendentes no momento"
                                : filterStatus === "approved"
                                ? "Não há saques aprovados para exibir"
                                : filterStatus === "rejected"
                                ? "Não há saques rejeitados para exibir"
                                : "Não há saques para exibir com os filtros atuais"
                              }
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setFilterStatus("all");
                              setSearchTerm("");
                            }}
                            className="bg-zinc-900/50 border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800"
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Limpar Filtros
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredWithdrawals.map((withdrawal) => (
                      <TableRow key={withdrawal.id} className="border-zinc-800 hover:bg-zinc-800/30 transition-colors">
                        <TableCell className="text-white font-mono font-bold">#{withdrawal.displayId}</TableCell>
                        <TableCell>
                          <div>
                            <p className="text-white font-semibold">{withdrawal.userName}</p>
                            <p className="text-zinc-400 text-sm">{withdrawal.userEmail}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-[#00E880] font-bold text-lg">
                            R$ {formatMoney(withdrawal.amount)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-300 font-mono text-sm">{withdrawal.pixKey}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="hover:bg-zinc-700/50 text-zinc-400 hover:text-white"
                              onClick={() => copyToClipboard(withdrawal.pixKey)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-zinc-300 font-medium">{withdrawal.pixKeyType}</TableCell>
                        <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
                        <TableCell className="text-zinc-400 text-sm">
                          {formatDate(withdrawal.requestedAt)}
                        </TableCell>
                        <TableCell>
                          {withdrawal.status === "pending" ? (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 transition-all"
                                onClick={() => {
                                  setSelectedWithdrawal(withdrawal);
                                  setShowProcessModal(true);
                                }}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all"
                                onClick={() => {
                                  setSelectedWithdrawal(withdrawal);
                                  setShowProcessModal(true);
                                }}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              {withdrawal.status === "approved" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20"
                                  onClick={() => {
                                    setReceiptWithdrawal(withdrawal);
                                    setShowReceiptModal(true);
                                  }}
                                  data-testid={`button-receipt-${withdrawal.id}`}
                                >
                                  <FileText className="w-4 h-4 mr-1" />
                                  Comprovante
                                </Button>
                              )}
                              <span className="text-zinc-500 text-sm">
                                {withdrawal.processedAt && formatDate(withdrawal.processedAt)}
                              </span>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Process Modal */}
      {showProcessModal && selectedWithdrawal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="bg-black/50 border-zinc-800 max-w-md w-full backdrop-blur-xl shadow-2xl">
            <CardHeader className="border-b border-zinc-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold text-[#00E880]">
                  Processar Saque #{selectedWithdrawal.displayId}
                </CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-zinc-400 hover:text-white"
                  onClick={() => {
                    setShowProcessModal(false);
                    setAdminNotes("");
                  }}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="bg-black/50 p-4 rounded-lg space-y-3 border border-zinc-800">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 font-semibold uppercase tracking-wider text-xs">Usuário:</span>
                    <span className="text-white font-semibold">{selectedWithdrawal.userName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 font-semibold uppercase tracking-wider text-xs">Valor:</span>
                    <span className="text-[#00E880] font-bold text-xl">R$ {selectedWithdrawal.amount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 font-semibold uppercase tracking-wider text-xs">Chave PIX:</span>
                    <span className="text-white font-mono text-sm">{selectedWithdrawal.pixKey}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 font-semibold uppercase tracking-wider text-xs">Tipo:</span>
                    <span className="text-white font-medium">{selectedWithdrawal.pixKeyType}</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-zinc-400 mb-2 block font-semibold uppercase tracking-wider">
                    Observações (opcional)
                  </label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Adicione observações sobre o processamento..."
                    className="bg-black/50 border-zinc-700 text-white min-h-[100px] focus:border-[#00E880] focus:ring-[#00E880] transition-all"
                  />
                </div>

                <div className="flex items-center gap-3 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0" />
                  <p className="text-sm text-orange-400 font-medium">
                    Certifique-se de que o pagamento foi realizado antes de confirmar
                  </p>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    className="flex-1 bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:bg-zinc-700/50 hover:text-white transition-all"
                    onClick={() => {
                      setShowProcessModal(false);
                      setAdminNotes("");
                      setIsApproving(false);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold transform hover:scale-105 transition-all"
                    onClick={() => processWithdrawalMutation.mutate({
                      withdrawalId: selectedWithdrawal.id,
                      action: "reject",
                      adminNotes,
                    })}
                    disabled={processWithdrawalMutation.isPending}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Rejeitar
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold transform hover:scale-105 transition-all"
                    onClick={() => {
                      setIsApproving(true);
                    }}
                    disabled={processWithdrawalMutation.isPending}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Pagar Saque
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Simplified Secure Approval Dialog with Automatic OrinPay */}
      <Dialog open={isApproving} onOpenChange={(open) => {
        setIsApproving(open);
        if (!open) {
          setAdminPassword("");
        }
      }}>
        <DialogContent className="bg-black/95 border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#00E880] flex items-center gap-2">
              <Send className="w-6 h-6" />
              Pagar Saque via OrinPay
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-base mt-3" asChild>
              <div className="space-y-4">
                {/* Withdrawal Details */}
                <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Usuário:</span>
                      <span className="text-white font-semibold">{selectedWithdrawal?.userName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Valor:</span>
                      <span className="text-[#00E880] font-bold text-xl">R$ {selectedWithdrawal?.amount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Chave PIX:</span>
                      <span className="text-white font-mono text-sm">{selectedWithdrawal?.pixKey}</span>
                    </div>
                  </div>
                </div>

                {/* OrinPay Auto Info */}
                <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-purple-400" />
                    <span className="text-sm text-purple-300 font-semibold">
                      PIX será enviado automaticamente via OrinPay API
                    </span>
                  </div>
                </div>

                {/* Security Password Input */}
                <div className="space-y-2">
                  <Label htmlFor="adminPassword" className="text-zinc-300 font-semibold flex items-center gap-2">
                    <Lock className="w-4 h-4 text-[#00E880]" />
                    Senha Administrativa
                  </Label>
                  <div className="relative">
                    <Input
                      id="adminPassword"
                      type={showPassword ? "text" : "password"}
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Digite a senha administrativa"
                      className="bg-black/50 border-zinc-700 text-white pr-10 focus:border-[#00E880] focus:ring-[#00E880]"
                      required
                      autoFocus
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 text-zinc-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-zinc-400" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Warning */}
                <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-400 mt-0.5" />
                    <div className="text-xs text-orange-300">
                      <p>O PIX será processado imediatamente após aprovação.</p>
                    </div>
                  </div>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setIsApproving(false);
                setAdminPassword("");
              }}
              className="bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:bg-zinc-700/50"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!adminPassword) {
                  toast({
                    title: "Erro",
                    description: "Digite a senha administrativa",
                    variant: "destructive",
                  });
                  return;
                }

                if (selectedWithdrawal) {
                  processWithdrawalMutation.mutate({
                    withdrawalId: selectedWithdrawal.id,
                    action: "approve",
                    adminNotes,
                    adminPassword
                  });
                  setIsApproving(false);
                }
              }}
              disabled={processWithdrawalMutation.isPending || !adminPassword}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold transition-all"
            >
              {processWithdrawalMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Enviando PIX...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Pagar e Enviar PIX
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Modal */}
      <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-black/95 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#00E880]">
              Comprovante de Transferência PIX
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Saque #{receiptWithdrawal?.displayId}
            </DialogDescription>
          </DialogHeader>
          {receiptWithdrawal && (
            <WithdrawalReceipt 
              withdrawal={{
                ...receiptWithdrawal,
                processedAt: receiptWithdrawal.processedAt || new Date().toISOString()
              }} 
              isModal={true} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}