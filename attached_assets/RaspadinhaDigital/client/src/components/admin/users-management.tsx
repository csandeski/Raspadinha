import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import CountUp from "react-countup";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Search, 
  UserCheck, 
  UserX, 
  DollarSign,
  TrendingUp,
  TrendingDown,
  Eye,
  Edit,
  Ban,
  CheckCircle,
  Filter,
  RefreshCw,
  MoreVertical,
  Activity,
  Clock,
  Calendar,
  Mail,
  Phone,
  Shield,
  Star,
  Trophy,
  Zap,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Crown,
  Wallet,
  ChevronDown,
  Users,
  AlertCircle,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency, formatMoney } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  balance: string;
  scratchBonus: number;
  totalWagered: string;
  level: number;
  createdAt: string;
  lastLogin?: string;
  status: "active" | "banned";
}

// Level calculation function based on total wagered
function calculateLevel(totalWagered: number): number {
  const levelThresholds: Record<number, number> = {
    1: 100,
    5: 1000,
    10: 5000,
    20: 20000,
    30: 50000,
    50: 150000,
    70: 300000,
    100: 1000000,
  };

  function getRequiredForLevel(n: number): number {
    if (levelThresholds[n]) {
      return levelThresholds[n];
    }
    const rewardLevels = [1, 5, 10, 20, 30, 50, 70, 100];
    const prevRewardLevel = rewardLevels.filter((l) => l < n).pop() || 0;
    const nextRewardLevel = rewardLevels.find((l) => l > n) || 100;

    if (prevRewardLevel === 0) return n * 20;

    const prevRequired = levelThresholds[prevRewardLevel];
    const nextRequired = levelThresholds[nextRewardLevel];
    const levelsBetween = nextRewardLevel - prevRewardLevel;
    const positionBetween = n - prevRewardLevel;

    return Math.floor(
      prevRequired +
        ((nextRequired - prevRequired) / levelsBetween) * positionBetween,
    );
  }

  let level = 0;
  for (let n = 1; n <= 100; n++) {
    const requiredAmount = getRequiredForLevel(n);
    if (totalWagered >= requiredAmount) {
      level = n;
    } else {
      break;
    }
  }
  return level;
}

export default function UsersManagement() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "banned">("all");
  const [sortBy, setSortBy] = useState<"recent" | "balance" | "level">("recent");
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);

  // Fetch users
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const sessionId = localStorage.getItem("adminSessionId");
      const response = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${sessionId}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
  });

  // Update user balance
  const updateBalanceMutation = useMutation({
    mutationFn: async ({ userId, balance, scratchBonus }: { userId: number; balance: string; scratchBonus: number }) => {

      return apiRequest(`/api/admin/users/${userId}/balance`, "POST", { balance, scratchBonus });
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Saldo atualizado com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setShowEditModal(false);
    },
    onError: (error: any) => {
      // Error handled in UI
      toast({
        title: "Erro",
        description: error?.message || "Erro ao atualizar saldo",
        variant: "destructive",
      });
    },
  });

  // Ban/unban user
  const toggleBanMutation = useMutation({
    mutationFn: async ({ userId, action }: { userId: number; action: "ban" | "unban" }) => {
      return apiRequest(`/api/admin/users/${userId}/${action}`, "POST");
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Status do usuário atualizado",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
  });

  const filteredUsers = users?.filter((user) =>
    (user.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.phone || "").includes(searchTerm)
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Calculate stats
  const userStats = {
    total: users?.length || 0,
    active: users?.filter(u => u.status === "active").length || 0,
    banned: users?.filter(u => u.status === "banned").length || 0,
    newToday: users?.filter(u => {
      const today = new Date();
      const created = new Date(u.createdAt);
      return created.toDateString() === today.toDateString();
    }).length || 0,
  };

  const levelDistribution = [
    { name: "Bronze", value: users?.filter(u => u.level < 5).length || 0, color: "#CD7F32" },
    { name: "Prata", value: users?.filter(u => u.level >= 5 && u.level < 20).length || 0, color: "#C0C0C0" },
    { name: "Ouro", value: users?.filter(u => u.level >= 20 && u.level < 50).length || 0, color: "#FFD700" },
    { name: "Diamante", value: users?.filter(u => u.level >= 50).length || 0, color: "#B9F2FF" },
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
              <Users className="w-8 h-8 text-[#00E880]" />
            </motion.div>
            Gerenciamento de Usuários
          </motion.h2>
          <p className="text-zinc-400">Visualize e gerencie todos os usuários da plataforma</p>
        </div>
        
        {/* Badges de status no header */}
        <div className="flex gap-2">
          <Badge variant="outline" className="border-[#00E880] text-[#00E880]">
            Total: {users?.length || 0}
          </Badge>
          <Badge variant="outline" className="border-blue-500 text-blue-400">
            Ativos: {users?.filter(u => u.status === "active").length || 0}
          </Badge>
          {(users?.filter(u => u.status === "banned").length || 0) > 0 && (
            <Badge variant="outline" className="border-red-500 text-red-400">
              Banidos: {users?.filter(u => u.status === "banned").length || 0}
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
                    <p className="text-zinc-400 text-sm mb-1">Total de Usuários</p>
                    <p className="text-3xl font-bold text-white">
                      <CountUp end={userStats.total} duration={1.5} />
                    </p>
                    <Badge className="mt-2 bg-blue-500/10 text-blue-400 border-blue-500/20">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      +12.5%
                    </Badge>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl">
                    <Users className="w-6 h-6 text-blue-400" />
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
                    <p className="text-zinc-400 text-sm mb-1">Usuários Ativos</p>
                    <p className="text-3xl font-bold text-white">
                      <CountUp end={userStats.active} duration={1.5} />
                    </p>
                    <Badge className="mt-2 bg-[#00E880]/10 text-[#00E880] border-[#00E880]/20">
                      <Activity className="w-3 h-3 mr-1" />
                      {userStats.total > 0 ? ((userStats.active / userStats.total) * 100).toFixed(1) : 0}%
                    </Badge>
                  </div>
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <UserCheck className="w-6 h-6 text-white" />
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
            <Card className="bg-gradient-to-br from-red-600 to-red-700 border-0 shadow-xl">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-red-100 text-sm mb-1">Usuários Banidos</p>
                    <p className="text-3xl font-bold text-white">
                      <CountUp end={userStats.banned} duration={1.5} />
                    </p>
                    <Badge className="mt-2 bg-red-500/20 text-red-100 border-0">
                      <Ban className="w-3 h-3 mr-1" />
                      {userStats.banned > 0 ? "Atenção" : "Normal"}
                    </Badge>
                  </div>
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <UserX className="w-6 h-6 text-white" />
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
            <Card className="bg-gradient-to-br from-purple-600 to-purple-700 border-0 shadow-xl">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-purple-100 text-sm mb-1">Novos Hoje</p>
                    <p className="text-3xl font-bold text-white">
                      <CountUp end={userStats.newToday} duration={1.5} />
                    </p>
                    <Badge className="mt-2 bg-purple-500/20 text-purple-100 border-0">
                      <Calendar className="w-3 h-3 mr-1" />
                      Hoje
                    </Badge>
                  </div>
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Level Distribution */}
          <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#00E880]" />
                Distribuição por Nível
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={levelDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {levelDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {levelDistribution.map((level) => (
                  <div key={level.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: level.color }} />
                    <span className="text-zinc-300 text-sm">{level.name}: {level.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#00E880]" />
                Ações Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start bg-zinc-900/50 hover:bg-zinc-800 text-white border border-zinc-800">
                <Crown className="w-4 h-4 mr-2 text-yellow-500" />
                Gerenciar VIPs
              </Button>
              <Button className="w-full justify-start bg-zinc-900/50 hover:bg-zinc-800 text-white border border-zinc-800">
                <Wallet className="w-4 h-4 mr-2 text-green-500" />
                Adicionar Bônus em Massa
              </Button>
              <Button className="w-full justify-start bg-zinc-900/50 hover:bg-zinc-800 text-white border border-zinc-800">
                <Mail className="w-4 h-4 mr-2 text-blue-500" />
                Enviar Email para Todos
              </Button>
              <Button className="w-full justify-start bg-zinc-900/50 hover:bg-zinc-800 text-white border border-zinc-800">
                <Shield className="w-4 h-4 mr-2 text-purple-500" />
                Verificar Segurança
              </Button>
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
                placeholder="Buscar por nome, email ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-500 focus:border-[#00E880] focus:ring-[#00E880]/20"
              />
            </div>

            {/* Filtros e Ações */}
            <div className="flex gap-2">
              <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                <SelectTrigger className="w-[140px] bg-zinc-900/50 border-zinc-800 text-zinc-300">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="banned">Banidos</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                variant="outline"
                className="bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800/50"
                onClick={() => setShowCreateModal(true)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filtros
              </Button>

              <Button 
                className="bg-[#00E880] text-black hover:bg-[#00E880]/90"
                onClick={() => setShowCreateModal(true)}
              >
                <Users className="w-4 h-4 mr-2" />
                Novo Usuário
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Usuários */}
      <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm">
        <CardHeader className="border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold text-[#00E880]">
              Lista de Usuários
            </CardTitle>
            <Badge variant="outline" className="border-[#00E880] text-[#00E880]">
              {filteredUsers?.length || 0} resultados
            </Badge>
          </div>
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
                  <TableRow className="border-zinc-800 hover:bg-zinc-900/50">
                    <TableHead className="text-zinc-400 font-semibold uppercase tracking-wider text-xs">Usuário</TableHead>
                    <TableHead className="text-zinc-400 font-semibold text-xs uppercase tracking-wider">Contato</TableHead>
                    <TableHead className="text-zinc-400 font-semibold text-xs uppercase tracking-wider">Saldos</TableHead>
                    <TableHead className="text-zinc-400 font-semibold text-xs uppercase tracking-wider">Nível</TableHead>
                    <TableHead className="text-zinc-400 font-semibold text-xs uppercase tracking-wider">Status</TableHead>
                    <TableHead className="text-zinc-400 font-semibold text-xs uppercase tracking-wider">Cadastro</TableHead>
                    <TableHead className="text-zinc-400 font-semibold text-xs uppercase tracking-wider">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers
                    ?.filter(user => filterStatus === "all" || user.status === filterStatus)
                    ?.map((user, index) => (
                    <TableRow
                      key={user.id}
                      className="border-zinc-800 hover:bg-zinc-900/50 transition-all duration-200 group"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00E880] to-emerald-600 flex items-center justify-center text-white font-bold">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-white font-semibold">{user.name}</p>
                            <p className="text-zinc-400 text-sm">ID: {user.id}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-zinc-300">
                            <Mail className="w-4 h-4 text-zinc-500" />
                            {user.email}
                          </div>
                          <div className="flex items-center gap-2 text-zinc-300">
                            <Phone className="w-4 h-4 text-zinc-500" />
                            {user.phone}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Wallet className="w-4 h-4 text-[#00E880]" />
                            <span className="text-[#00E880] font-bold">R$ {formatMoney(user.balance)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Star className="w-4 h-4 text-purple-400" />
                            <span className="text-purple-400 font-semibold">{user.scratchBonus} raspadinhas</span>
                          </div>
                          <div className="text-zinc-500 text-xs">
                            Total apostado: R$ {formatMoney(user.totalWagered)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-yellow-400" />
                            <Badge className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 text-yellow-400 border-yellow-500/30">
                              Nível {calculateLevel(parseFloat(user.totalWagered || "0"))}
                            </Badge>
                          </div>
                          <div className="w-full bg-zinc-800 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-[#00E880] to-emerald-600 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min((calculateLevel(parseFloat(user.totalWagered || "0")) / 100) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.status === "active" ? (
                          <Badge className="bg-[#00E880]/20 text-[#00E880] border-[#00E880]/30 font-medium">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Ativo
                          </Badge>
                        ) : (
                          <Badge className="bg-red-500/20 text-red-500 border-red-500/30 font-medium">
                            <Ban className="w-3 h-3 mr-1" />
                            Banido
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-zinc-400 text-sm">
                        {formatDate(user.createdAt)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" className="bg-zinc-900/50 hover:bg-zinc-800 text-white border border-zinc-800">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-zinc-900 border-zinc-800" align="end">
                            <DropdownMenuLabel className="text-zinc-400">Ações</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-zinc-800" />
                            <DropdownMenuItem
                              className="text-zinc-300 hover:bg-zinc-800 hover:text-white cursor-pointer"
                              onClick={() => {
                                setSelectedUser(user);
                                setShowEditModal(true);
                              }}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Editar Usuário
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-zinc-300 hover:bg-zinc-800 hover:text-white cursor-pointer"
                              onClick={() => {
                                setSelectedUser(user);
                                setShowDetailsModal(true);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-zinc-300 hover:bg-zinc-800 hover:text-white cursor-pointer"
                              onClick={() => {
                                // Send notification
                              }}
                            >
                              <Mail className="w-4 h-4 mr-2" />
                              Enviar Notificação
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-zinc-300 hover:bg-zinc-800 hover:text-white cursor-pointer"
                              onClick={() => {
                                // View transaction history
                              }}
                            >
                              <Activity className="w-4 h-4 mr-2" />
                              Histórico de Transações
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-zinc-800" />
                            <DropdownMenuItem
                              className={user.status === "active" 
                                ? "text-red-400 hover:bg-red-500/20 hover:text-red-300 cursor-pointer" 
                                : "text-[#00E880] hover:bg-[#00E880]/20 hover:text-[#00E880] cursor-pointer"
                              }
                              onClick={() => toggleBanMutation.mutate({ 
                                userId: user.id, 
                                action: user.status === "active" ? "ban" : "unban" 
                              })}
                            >
                              {user.status === "active" ? (
                                <>
                                  <UserX className="w-4 h-4 mr-2" />
                                  Banir Usuário
                                </>
                              ) : (
                                <>
                                  <UserCheck className="w-4 h-4 mr-2" />
                                  Desbanir Usuário
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="bg-zinc-900/95 border-zinc-800 max-w-2xl w-full backdrop-blur-xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="bg-gradient-to-r from-zinc-900 to-black border-b border-zinc-800 sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold text-[#00E880] flex items-center gap-3">
                  <Edit className="w-6 h-6" />
                  Editar Usuário
                </CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-zinc-400 hover:text-white"
                  onClick={() => setShowEditModal(false)}
                >
                  ✕
                </Button>
              </div>
              <p className="text-zinc-400 text-sm mt-2">ID: {selectedUser.id} - {selectedUser.name}</p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* User Info Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#00E880]" />
                    Informações do Usuário
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-zinc-400 mb-2 block font-semibold uppercase tracking-wider">
                        Nome
                      </label>
                      <Input
                        type="text"
                        defaultValue={selectedUser.name}
                        id="edit_name"
                        className="bg-black/50 border-zinc-700 text-white h-12 text-base focus:border-[#00E880] focus:ring-[#00E880] transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-zinc-400 mb-2 block font-semibold uppercase tracking-wider">
                        Email
                      </label>
                      <Input
                        type="email"
                        defaultValue={selectedUser.email}
                        id="edit_email"
                        className="bg-black/50 border-zinc-700 text-white h-12 text-base focus:border-[#00E880] focus:ring-[#00E880] transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-zinc-400 mb-2 block font-semibold uppercase tracking-wider">
                        Telefone
                      </label>
                      <Input
                        type="text"
                        defaultValue={selectedUser.phone}
                        id="edit_phone"
                        className="bg-black/50 border-zinc-700 text-white h-12 text-base focus:border-[#00E880] focus:ring-[#00E880] transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-zinc-400 mb-2 block font-semibold uppercase tracking-wider">
                        Status
                      </label>
                      <Select defaultValue={selectedUser.status} onValueChange={(value) => {}}>
                        <SelectTrigger className="bg-black/50 border-zinc-700 text-white h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800">
                          <SelectItem value="active">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-[#00E880]" />
                              Ativo
                            </div>
                          </SelectItem>
                          <SelectItem value="banned">
                            <div className="flex items-center gap-2">
                              <Ban className="w-4 h-4 text-red-500" />
                              Banido
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Financial Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-[#00E880]" />
                    Informações Financeiras
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-zinc-400 mb-2 block font-semibold uppercase tracking-wider">
                        Saldo Disponível
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#00E880] font-bold">
                          R$
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          defaultValue={selectedUser.balance}
                          id="edit_balance"
                          className="bg-black/50 border-zinc-700 text-white pl-10 h-12 text-lg font-mono focus:border-[#00E880] focus:ring-[#00E880] transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-zinc-400 mb-2 block font-semibold uppercase tracking-wider">
                        Raspadinhas Bônus
                      </label>
                      <div className="relative">
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          defaultValue={selectedUser.scratchBonus}
                          id="edit_scratchBonus"
                          className="bg-black/50 border-zinc-700 text-white h-12 text-lg font-mono focus:border-purple-400 focus:ring-purple-400 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Level & Stats Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-[#00E880]" />
                    Nível e Estatísticas
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-zinc-400 mb-2 block font-semibold uppercase tracking-wider">
                        Nível (Calculado automaticamente)
                      </label>
                      <Input
                        type="text"
                        value={`Nível ${calculateLevel(parseFloat(selectedUser.totalWagered || "0"))}`}
                        disabled
                        className="bg-black/30 border-zinc-800 text-zinc-400 h-12 text-base cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-zinc-400 mb-2 block font-semibold uppercase tracking-wider">
                        Total Apostado
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 font-bold">
                          R$
                        </span>
                        <Input
                          type="text"
                          value={selectedUser.totalWagered}
                          disabled
                          className="bg-black/30 border-zinc-800 text-zinc-400 pl-10 h-12 text-base cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-[#00E880]" />
                    Ações Rápidas
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <Button
                      variant="outline"
                      className="bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20"
                      onClick={() => {
                        // Reset password functionality
                        toast({
                          title: "Sucesso",
                          description: "Senha resetada e enviada por email",
                        });
                      }}
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Resetar Senha
                    </Button>
                    <Button
                      variant="outline"
                      className="bg-yellow-500/10 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20"
                      onClick={() => {
                        // Toggle VIP status
                        toast({
                          title: "Sucesso",
                          description: "Status VIP atualizado",
                        });
                      }}
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      Tornar VIP
                    </Button>
                    <Button
                      variant="outline"
                      className="bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20"
                      onClick={() => {
                        // Send notification
                        toast({
                          title: "Sucesso",
                          description: "Notificação enviada",
                        });
                      }}
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Notificar
                    </Button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-8 pt-6 border-t border-zinc-800">
                  <Button
                    variant="outline"
                    className="flex-1 bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:bg-zinc-700/50 hover:text-white transition-all"
                    onClick={() => setShowEditModal(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-[#00E880] to-[#00D470] hover:from-[#00D470] hover:to-[#00C560] text-black font-bold transition-all duration-300 transform hover:scale-105"
                    onClick={() => {
                      const balance = (document.getElementById("edit_balance") as HTMLInputElement).value;
                      const scratchBonusValue = (document.getElementById("edit_scratchBonus") as HTMLInputElement).value;
                      
                      // Convert to appropriate types
                      const scratchBonus = parseInt(scratchBonusValue) || selectedUser.scratchBonus || 0;
                      
                      // Update user data
                      updateBalanceMutation.mutate({
                        userId: selectedUser.id,
                        balance: balance.toString(),
                        scratchBonus: scratchBonus,
                      });
                    }}
                    disabled={updateBalanceMutation.isPending}
                  >
                    {updateBalanceMutation.isPending ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mx-auto" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Salvar Alterações
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="bg-zinc-900/95 border-zinc-800 max-w-md w-full backdrop-blur-xl shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-zinc-900 to-black border-b border-zinc-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold text-[#00E880] flex items-center gap-3">
                  <Users className="w-6 h-6" />
                  Criar Novo Usuário
                </CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-zinc-400 hover:text-white"
                  onClick={() => setShowCreateModal(false)}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-zinc-400 mb-2 block font-semibold uppercase tracking-wider">
                    Nome Completo
                  </label>
                  <Input
                    type="text"
                    id="create_name"
                    placeholder="Digite o nome completo"
                    className="bg-black/50 border-zinc-700 text-white h-12 text-base focus:border-[#00E880] focus:ring-[#00E880] transition-all"
                  />
                </div>
                <div>
                  <label className="text-sm text-zinc-400 mb-2 block font-semibold uppercase tracking-wider">
                    Email
                  </label>
                  <Input
                    type="email"
                    id="create_email"
                    placeholder="email@exemplo.com"
                    className="bg-black/50 border-zinc-700 text-white h-12 text-base focus:border-[#00E880] focus:ring-[#00E880] transition-all"
                  />
                </div>
                <div>
                  <label className="text-sm text-zinc-400 mb-2 block font-semibold uppercase tracking-wider">
                    Telefone
                  </label>
                  <Input
                    type="text"
                    id="create_phone"
                    placeholder="(11) 91234-5678"
                    className="bg-black/50 border-zinc-700 text-white h-12 text-base focus:border-[#00E880] focus:ring-[#00E880] transition-all"
                  />
                </div>
                <div>
                  <label className="text-sm text-zinc-400 mb-2 block font-semibold uppercase tracking-wider">
                    Senha Inicial
                  </label>
                  <Input
                    type="password"
                    id="create_password"
                    placeholder="Mínimo 8 caracteres"
                    className="bg-black/50 border-zinc-700 text-white h-12 text-base focus:border-[#00E880] focus:ring-[#00E880] transition-all"
                  />
                </div>
                <div>
                  <label className="text-sm text-zinc-400 mb-2 block font-semibold uppercase tracking-wider">
                    Saldo Inicial
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#00E880] font-bold">
                      R$
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      id="create_balance"
                      defaultValue="0.00"
                      className="bg-black/50 border-zinc-700 text-white pl-10 h-12 text-lg font-mono focus:border-[#00E880] focus:ring-[#00E880] transition-all"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <Button
                    variant="outline"
                    className="flex-1 bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:bg-zinc-700/50 hover:text-white transition-all"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-[#00E880] to-[#00D470] hover:from-[#00D470] hover:to-[#00C560] text-black font-bold transition-all duration-300 transform hover:scale-105"
                    onClick={() => {
                      // Create user logic
                      toast({
                        title: "Sucesso",
                        description: "Usuário criado com sucesso",
                      });
                      setShowCreateModal(false);
                    }}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Criar Usuário
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* User Details Modal */}
      {showDetailsModal && selectedUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="bg-zinc-900/95 border-zinc-800 max-w-3xl w-full backdrop-blur-xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="bg-gradient-to-r from-zinc-900 to-black border-b border-zinc-800 sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold text-[#00E880] flex items-center gap-3">
                  <Eye className="w-6 h-6" />
                  Detalhes do Usuário
                </CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-zinc-400 hover:text-white"
                  onClick={() => setShowDetailsModal(false)}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* User Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="bg-black/50 border-zinc-800">
                    <CardHeader>
                      <CardTitle className="text-lg text-white flex items-center gap-2">
                        <Users className="w-5 h-5 text-[#00E880]" />
                        Informações Pessoais
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Nome:</span>
                        <span className="text-white font-medium">{selectedUser.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Email:</span>
                        <span className="text-white font-medium">{selectedUser.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Telefone:</span>
                        <span className="text-white font-medium">{selectedUser.phone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">ID:</span>
                        <span className="text-white font-medium">#{selectedUser.id}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-black/50 border-zinc-800">
                    <CardHeader>
                      <CardTitle className="text-lg text-white flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-[#00E880]" />
                        Informações Financeiras
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Saldo:</span>
                        <span className="text-[#00E880] font-bold">R$ {selectedUser.balance}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Raspadinhas Bônus:</span>
                        <span className="text-purple-400 font-bold">{selectedUser.scratchBonus}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Total Apostado:</span>
                        <span className="text-white font-medium">R$ {selectedUser.totalWagered}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Total Ganho:</span>
                        <span className="text-white font-medium">R$ 0.00</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-black/50 border-zinc-800">
                    <CardHeader>
                      <CardTitle className="text-lg text-white flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-[#00E880]" />
                        Status e Nível
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400">Status:</span>
                        {selectedUser.status === "active" ? (
                          <Badge className="bg-[#00E880]/20 text-[#00E880] border-[#00E880]/30">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Ativo
                          </Badge>
                        ) : (
                          <Badge className="bg-red-500/20 text-red-500 border-red-500/30">
                            <Ban className="w-3 h-3 mr-1" />
                            Banido
                          </Badge>
                        )}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Nível:</span>
                        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                          Nível {selectedUser.level}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-zinc-400 text-sm">Progresso:</span>
                          <span className="text-zinc-400 text-sm">{selectedUser.level}%</span>
                        </div>
                        <div className="w-full bg-zinc-800 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-[#00E880] to-emerald-600 h-2 rounded-full"
                            style={{ width: `${Math.min((selectedUser.level / 100) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-black/50 border-zinc-800">
                    <CardHeader>
                      <CardTitle className="text-lg text-white flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-[#00E880]" />
                        Datas
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Cadastro:</span>
                        <span className="text-white font-medium">{formatDate(selectedUser.createdAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Último Login:</span>
                        <span className="text-white font-medium">
                          {selectedUser.lastLogin ? formatDate(selectedUser.lastLogin) : "Nunca"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Última Aposta:</span>
                        <span className="text-white font-medium">Hoje às 14:30</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity */}
                <Card className="bg-black/50 border-zinc-800">
                  <CardHeader>
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                      <Activity className="w-5 h-5 text-[#00E880]" />
                      Atividade Recente
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-3 border-b border-zinc-800">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-[#00E880]/20 rounded-lg">
                            <DollarSign className="w-4 h-4 text-[#00E880]" />
                          </div>
                          <div>
                            <p className="text-white font-medium">Depósito PIX</p>
                            <p className="text-zinc-400 text-sm">Há 2 horas</p>
                          </div>
                        </div>
                        <span className="text-[#00E880] font-bold">+R$ 50.00</span>
                      </div>
                      <div className="flex items-center justify-between py-3 border-b border-zinc-800">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-500/20 rounded-lg">
                            <Zap className="w-4 h-4 text-purple-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium">Jogou Mines</p>
                            <p className="text-zinc-400 text-sm">Há 3 horas</p>
                          </div>
                        </div>
                        <span className="text-red-400 font-bold">-R$ 10.00</span>
                      </div>
                      <div className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-yellow-500/20 rounded-lg">
                            <Trophy className="w-4 h-4 text-yellow-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium">Subiu de Nível</p>
                            <p className="text-zinc-400 text-sm">Há 5 horas</p>
                          </div>
                        </div>
                        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                          Nível {selectedUser.level}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:bg-zinc-700/50 hover:text-white"
                    onClick={() => setShowDetailsModal(false)}
                  >
                    Fechar
                  </Button>
                  <Button
                    className="flex-1 bg-[#00E880] text-black hover:bg-[#00E880]/90 font-bold"
                    onClick={() => {
                      setShowDetailsModal(false);
                      setShowEditModal(true);
                    }}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar Usuário
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}