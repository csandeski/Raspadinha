import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import {
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Search,
  RefreshCw,
  LogOut,
  Eye,
  Edit,
  Gamepad2,
  Gift,
  BarChart3,
  Activity,
  Calendar,
  CreditCard,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Trophy,
  Sparkles,
  ShoppingBag,
  Target,
  PercentIcon,
  UserPlus,
  Wallet,
  PiggyBank,
  BadgeDollarSign
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BonusCodesManagement } from "@/components/admin/bonus-codes-management";
import DepositsManagement from "@/components/admin/deposits-management";
import { CouponsManagement } from "@/components/admin/coupons-management";
import { MarketingLinksManagement } from "@/components/admin/marketing-links-management";
import { ChatManagement } from "@/components/admin/chat-management";
import { ReferralConfig } from "@/components/admin/referral-config";
import { AffiliatesPartnersManagement } from "@/components/admin/affiliates-partners-management";

// Custom apiRequest for admin routes that includes session ID
const apiRequest = async (url: string, method: string = "GET", data?: any) => {
  const sessionId = localStorage.getItem('adminSessionId');
  
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': sessionId ? `Bearer ${sessionId}` : '',
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
};

interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  balance: string;
  bonusBalance: string;
  xp: number;
  createdAt: string;
}

interface GameRecord {
  id: number;
  userId: number;
  userName: string;
  gameType: string;
  cost: string;
  prize: string;
  won: boolean;
  result: string;
  playedAt: string;
}

interface Transaction {
  id: number;
  userId: number;
  userName: string;
  type: string;
  amount: string;
  status: string;
  createdAt: string;
  details: any;
}

interface DashboardStats {
  totalUsers: number;
  totalDeposits: string;
  totalWithdrawals: string;
  totalProfit: string;
  todayDeposits: string;
  todayWithdrawals: string;
  todayProfit: string;
  activeUsers: number;
  pendingWithdrawals: number;
  totalGames: number;
  todayGames: number;
  totalRewards: string;
  // Raspadinha specific stats
  totalScratchCards: number;
  todayScratchCards: number;
  scratchCardRevenue: string;
  scratchCardPayout: string;
  pixGames: number;
  meMimeiGames: number;
  eletronicosGames: number;
  superPremiosGames: number;
  avgScratchValue: string;
  winRate: number;
  retentionRate: number;
  avgDeposit: string;
  conversionRate: number;
}

export default function AdminPanel() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newBalance, setNewBalance] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");

  // Tab route mapping
  const tabRoutes: Record<string, string> = {
    dashboard: "Dashboard",
    users: "Usuários",
    games: "Jogos", 
    deposits: "Depósitos",
    transactions: "Transações",
    "bonus-codes": "Códigos Bônus",
    coupons: "Cupons",
    marketing: "Marketing",
    chat: "Chat Suporte"
  };

  // Check admin auth
  const { data: adminAuth, isLoading: isAuthLoading } = useQuery({
    queryKey: ["/api/admin/check"],
    queryFn: async () => {
      const sessionId = localStorage.getItem('adminSessionId');
      if (!sessionId) throw new Error('No session');
      
      const response = await fetch('/api/admin/check', {
        headers: {
          'Authorization': `Bearer ${sessionId}`
        }
      });
      
      if (!response.ok) throw new Error('Invalid session');
      return response.json();
    },
    retry: false,
  });

  useEffect(() => {
    if (!isAuthLoading && !adminAuth) {
      setLocation("/admin-login");
    }
  }, [adminAuth, isAuthLoading, setLocation]);

  // Dashboard stats
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ["/api/admin/stats"],
    queryFn: () => apiRequest("/api/admin/stats"),
    enabled: !!adminAuth,
  });

  // Users list
  const { data: users, refetch: refetchUsers } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: () => apiRequest("/api/admin/users"),
    enabled: !!adminAuth,
  });

  // Games history
  const { data: games, refetch: refetchGames } = useQuery({
    queryKey: ["/api/admin/games"],
    queryFn: () => apiRequest("/api/admin/games"),
    enabled: !!adminAuth,
  });

  // Transactions history
  const { data: transactions, refetch: refetchTransactions } = useQuery({
    queryKey: ["/api/admin/transactions"],
    queryFn: () => apiRequest("/api/admin/transactions"),
    enabled: !!adminAuth,
  });

  // User details
  const { data: userDetails } = useQuery({
    queryKey: ["/api/admin/users", selectedUserId],
    queryFn: () => apiRequest(`/api/admin/users/${selectedUserId}`, "GET"),
    enabled: !!selectedUserId,
  });

  // Update user balance
  const updateBalanceMutation = useMutation({
    mutationFn: ({ userId, balance }: { userId: number; balance: string }) =>
      apiRequest(`/api/admin/users/${userId}/balance`, "POST", { balance }),
    onSuccess: () => {
      toast({ description: "Saldo atualizado com sucesso!" });
      refetchUsers();
      refetchStats();
      setEditingUser(null);
      setNewBalance("");
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar saldo",
        variant: "destructive",
      });
    },
  });

  // Logout
  const handleLogout = async () => {
    try {
      await apiRequest("/api/admin/logout", "POST");
      localStorage.removeItem('adminSessionId');
      setLocation("/admin-login");
    } catch (error) {
      console.error("Logout error:", error);
      localStorage.removeItem('adminSessionId');
      setLocation("/admin-login");
    }
  };

  // Filter users based on search
  const filteredUsers = users?.filter((user: User) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phone.includes(searchTerm)
  );

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Painel Administrativo</h1>
            <p className="text-sm text-gray-400 mt-1">/admin/{activeTab} - {tabRoutes[activeTab]}</p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              onClick={() => {
                refetchStats();
                refetchUsers();
                refetchGames();
                refetchTransactions();
              }}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
            <Button onClick={handleLogout} variant="destructive" size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-10 w-full max-w-6xl">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="games">Jogos</TabsTrigger>
            <TabsTrigger value="deposits">Depósitos</TabsTrigger>
            <TabsTrigger value="transactions">Transações</TabsTrigger>
            <TabsTrigger value="bonus-codes">Códigos</TabsTrigger>
            <TabsTrigger value="coupons">Cupons</TabsTrigger>
            <TabsTrigger value="marketing">Marketing</TabsTrigger>
            <TabsTrigger value="referrals">Indicação</TabsTrigger>
            <TabsTrigger value="affiliates">Afiliados</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Main Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-zinc-900 to-black border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400">Total de Usuários</CardTitle>
                  <Users className="h-4 w-4 text-[#00E880]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stats?.totalUsers || 0}</div>
                  <p className="text-xs text-[#00E880]">
                    {stats?.activeUsers || 0} ativos (7 dias)
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-zinc-900 to-black border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400">Receita Total</CardTitle>
                  <TrendingUp className="h-4 w-4 text-[#00E880]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">R$ {stats?.totalDeposits || "0.00"}</div>
                  <p className="text-xs text-[#00E880]">
                    R$ {stats?.todayDeposits || "0.00"} hoje
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-zinc-900 to-black border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400">Receita Raspadinhas</CardTitle>
                  <Gamepad2 className="h-4 w-4 text-[#00E880]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">R$ {stats?.scratchCardRevenue || "0.00"}</div>
                  <p className="text-xs text-orange-400">
                    Prêmios: R$ {stats?.scratchCardPayout || "0.00"}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-zinc-900 to-black border-zinc-800">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400">Lucro Total</CardTitle>
                  <DollarSign className="h-4 w-4 text-[#00E880]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-[#00E880]">
                    R$ {stats?.totalProfit || "0.00"}
                  </div>
                  <p className="text-xs text-zinc-400">
                    R$ {stats?.todayProfit || "0.00"} hoje
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Raspadinha Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-zinc-900 to-black border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-zinc-400">Total Raspadinhas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stats?.totalScratchCards || 0}</div>
                  <p className="text-xs text-zinc-400">
                    Hoje: {stats?.todayScratchCards || 0}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-zinc-900 to-black border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-zinc-400">Taxa de Vitória</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-[#00E880]">{stats?.winRate || "0"}%</div>
                  <p className="text-xs text-zinc-400">
                    Média ideal: 28-32%
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-zinc-900 to-black border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-zinc-400">Valor Médio</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">R$ {stats?.avgScratchValue || "0.00"}</div>
                  <p className="text-xs text-zinc-400">
                    Por raspadinha vendida
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-zinc-900 to-black border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-zinc-400">Ticket Médio</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">R$ {stats?.avgDeposit || "0.00"}</div>
                  <p className="text-xs text-zinc-400">
                    Por depósito realizado
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Game Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-gradient-to-br from-zinc-900 to-black border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-lg text-white">Distribuição por Jogo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-zinc-800/50 rounded-lg">
                      <span className="text-zinc-300 flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full" />
                        Premio PIX
                      </span>
                      <span className="text-white font-bold">
                        {stats?.pixGames || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-zinc-800/50 rounded-lg">
                      <span className="text-zinc-300 flex items-center gap-2">
                        <div className="w-3 h-3 bg-pink-500 rounded-full" />
                        Me Mimei
                      </span>
                      <span className="text-white font-bold">
                        {stats?.meMimeiGames || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-zinc-800/50 rounded-lg">
                      <span className="text-zinc-300 flex items-center gap-2">
                        <div className="w-3 h-3 bg-orange-500 rounded-full" />
                        Eletrônicos
                      </span>
                      <span className="text-white font-bold">
                        {stats?.eletronicosGames || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-zinc-800/50 rounded-lg">
                      <span className="text-zinc-300 flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full" />
                        Super Prêmios
                      </span>
                      <span className="text-white font-bold">
                        {stats?.superPremiosGames || 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-zinc-900 to-black border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-lg text-white">Métricas de Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-zinc-400">Taxa de Conversão</span>
                      <span className="text-white font-bold">{stats?.conversionRate || "0"}%</span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-2">
                      <div
                        className="bg-[#00E880] h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(stats?.conversionRate || 0, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-zinc-400">Retenção (7 dias)</span>
                      <span className="text-white font-bold">{stats?.retentionRate || "0"}%</span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-2">
                      <div
                        className="bg-[#00E880] h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(stats?.retentionRate || 0, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">Saques Pendentes</span>
                      <span className="text-xl font-bold text-yellow-500">
                        {stats?.pendingWithdrawals || 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Usuários Cadastrados</CardTitle>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Buscar usuário..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Saldo</TableHead>
                      <TableHead>Bônus</TableHead>
                      <TableHead>XP</TableHead>
                      <TableHead>Cadastro</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers?.map((user: User) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.id}</TableCell>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.phone}</TableCell>
                        <TableCell>
                          {editingUser?.id === user.id ? (
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                value={newBalance}
                                onChange={(e) => setNewBalance(e.target.value)}
                                className="w-24"
                                step="0.01"
                              />
                              <Button
                                size="sm"
                                onClick={() =>
                                  updateBalanceMutation.mutate({
                                    userId: user.id,
                                    balance: newBalance,
                                  })
                                }
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingUser(null);
                                  setNewBalance("");
                                }}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <span className="font-semibold text-green-500">
                              R$ {user.balance}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>R$ {user.bonusBalance}</TableCell>
                        <TableCell>{user.xp || 0}</TableCell>
                        <TableCell>
                          {format(new Date(user.createdAt), "dd/MM/yy", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedUserId(user.id)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingUser(user);
                                setNewBalance(user.balance);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* User Details Modal */}
            {selectedUserId && userDetails && (
              <Card>
                <CardHeader>
                  <CardTitle>Detalhes do Usuário #{selectedUserId}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-400">Total Depositado</p>
                      <p className="text-xl font-bold text-green-500">
                        R$ {userDetails.totalDeposited || "0.00"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Total Ganho</p>
                      <p className="text-xl font-bold text-blue-500">
                        R$ {userDetails.totalWon || "0.00"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Total Sacado</p>
                      <p className="text-xl font-bold text-red-500">
                        R$ {userDetails.totalWithdrawn || "0.00"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Total de Jogos</p>
                      <p className="text-xl font-bold">{userDetails.totalGames || 0}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Últimos Jogos</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Jogo</TableHead>
                          <TableHead>Custo</TableHead>
                          <TableHead>Prêmio</TableHead>
                          <TableHead>Data</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userDetails.recentGames?.map((game: GameRecord) => (
                          <TableRow key={game.id}>
                            <TableCell>{game.gameType}</TableCell>
                            <TableCell>R$ {game.cost}</TableCell>
                            <TableCell
                              className={game.won ? "text-green-500" : "text-red-500"}
                            >
                              R$ {game.prize}
                            </TableCell>
                            <TableCell>
                              {format(new Date(game.playedAt), "dd/MM HH:mm", { locale: ptBR })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => setSelectedUserId(null)}
                    className="w-full"
                  >
                    Fechar
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Games Tab */}
          <TabsContent value="games" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Jogos</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Jogo</TableHead>
                      <TableHead>Custo</TableHead>
                      <TableHead>Prêmio</TableHead>
                      <TableHead>Resultado</TableHead>
                      <TableHead>Data/Hora</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {games?.slice(0, 50).map((game: GameRecord) => (
                      <TableRow key={game.id}>
                        <TableCell>{game.id}</TableCell>
                        <TableCell>{game.userName}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Gamepad2 className="w-4 h-4" />
                            {game.gameType}
                          </div>
                        </TableCell>
                        <TableCell>R$ {game.cost}</TableCell>
                        <TableCell className={game.won ? "text-green-500" : "text-gray-400"}>
                          R$ {game.prize}
                        </TableCell>
                        <TableCell>
                          {game.won ? (
                            <span className="flex items-center gap-1 text-green-500">
                              <Trophy className="w-4 h-4" /> Ganhou
                            </span>
                          ) : (
                            <span className="text-gray-400">Perdeu</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {format(new Date(game.playedAt), "dd/MM/yy HH:mm", { locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Transações Financeiras</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data/Hora</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions?.slice(0, 50).map((transaction: Transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>{transaction.id}</TableCell>
                        <TableCell>{transaction.userName}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {transaction.type === "deposit" ? (
                              <>
                                <TrendingUp className="w-4 h-4 text-green-500" />
                                <span className="text-green-500">Depósito</span>
                              </>
                            ) : transaction.type === "withdrawal" ? (
                              <>
                                <TrendingDown className="w-4 h-4 text-red-500" />
                                <span className="text-red-500">Saque</span>
                              </>
                            ) : (
                              <>
                                <Gift className="w-4 h-4 text-blue-500" />
                                <span className="text-blue-500">Recompensa</span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">R$ {transaction.amount}</TableCell>
                        <TableCell>
                          {transaction.status === "completed" ? (
                            <span className="flex items-center gap-1 text-green-500">
                              <CheckCircle className="w-4 h-4" /> Concluído
                            </span>
                          ) : transaction.status === "pending" ? (
                            <span className="flex items-center gap-1 text-yellow-500">
                              <Clock className="w-4 h-4" /> Pendente
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-500">
                              <XCircle className="w-4 h-4" /> Cancelado
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {format(new Date(transaction.createdAt), "dd/MM/yy HH:mm", {
                            locale: ptBR,
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Deposits Tab */}
          <TabsContent value="deposits" className="space-y-6">
            <DepositsManagement />
          </TabsContent>

          {/* Bonus Codes Tab */}
          <TabsContent value="bonus-codes" className="space-y-6">
            <BonusCodesManagement />
          </TabsContent>

          {/* Coupons Tab */}
          <TabsContent value="coupons" className="space-y-6">
            <CouponsManagement />
          </TabsContent>

          {/* Marketing Tab */}
          <TabsContent value="marketing" className="space-y-6">
            <MarketingLinksManagement />
          </TabsContent>

          {/* Referrals Tab */}
          <TabsContent value="referrals" className="space-y-6">
            <ReferralConfig />
          </TabsContent>

          {/* Affiliates Tab */}
          <TabsContent value="affiliates" className="space-y-6">
            <AffiliatesPartnersManagement />
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat" className="space-y-6">
            <ChatManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}