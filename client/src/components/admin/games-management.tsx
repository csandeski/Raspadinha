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
  Trophy,
  Search,
  DollarSign,
  TrendingUp,
  GamepadIcon,
  Gift,
  Activity,
  TrendingDown,
  RefreshCw,
  Download,
  BarChart3,
  Users,
  Target,
  Zap,
  Coins,
  Percent,
  AlertTriangle,
  Filter,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles
} from "lucide-react";
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
  Cell,
  Legend
} from "recharts";

interface Game {
  id: number;
  displayId: string;
  userId: number;
  userName: string;
  userEmail: string;
  gameType: string;
  cost: string;
  prize: string;
  won: boolean;
  playedAt: string;
  isMinigame: boolean;
}

interface GameStats {
  totalGames: number;
  totalRevenue: string;
  totalPrizes: string;
  winRate: number;
  gamesPerType: Record<string, number>;
}

export default function GamesManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterResult, setFilterResult] = useState<"all" | "won" | "lost">("all");

  // Fetch games
  const { data: games, isLoading } = useQuery<Game[]>({
    queryKey: ["/api/admin/games"],
    queryFn: async () => {
      const sessionId = localStorage.getItem("adminSessionId");
      const response = await fetch("/api/admin/games", {
        headers: {
          Authorization: `Bearer ${sessionId}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch games");
      const allGames = await response.json();
      // Filter out minigames and only return premio games
      return allGames.filter((game: Game) => !game.isMinigame);
    },
  });

  // Fetch game stats
  const { data: stats } = useQuery<GameStats>({
    queryKey: ["/api/admin/games/stats"],
    queryFn: async () => {
      const sessionId = localStorage.getItem("adminSessionId");
      const response = await fetch("/api/admin/games/stats", {
        headers: {
          Authorization: `Bearer ${sessionId}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
  });

  const filteredGames = games?.filter((game) => {
    const matchesSearch = 
      String(game.displayId).includes(searchTerm) ||
      game.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      game.userEmail.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesResult = 
      filterResult === "all" ||
      (filterResult === "won" && game.won) ||
      (filterResult === "lost" && !game.won);
    
    return matchesSearch && matchesResult;
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

  const getGameTypeBadge = (gameType: string) => {
    const gameTypeNames: Record<string, string> = {
      pix: "PIX",
      me_mimei: "Me Mimei",
      eletronicos: "Eletrônicos",
      super: "Super Prêmios"
    };

    const displayName = gameTypeNames[gameType] || gameType;
    
    return <Badge className="bg-purple-500/20 text-purple-500 border-purple-500/30">{displayName}</Badge>;
  };

  // Enhanced statistics calculations
  const enhancedStats = {
    totalGames: stats?.totalGames || 0,
    totalRevenue: parseFloat(stats?.totalRevenue || "0"),
    totalPrizes: parseFloat(stats?.totalPrizes || "0"),
    profit: parseFloat(stats?.totalRevenue || "0") - parseFloat(stats?.totalPrizes || "0"),
    winRate: stats?.winRate || 0,
    todayGames: games?.filter(g => new Date(g.playedAt).toDateString() === new Date().toDateString()).length || 0,
    todayRevenue: games?.filter(g => new Date(g.playedAt).toDateString() === new Date().toDateString())
      .reduce((sum, g) => sum + parseFloat(g.cost), 0) || 0,
  };

  // Chart data - only show raspadinha types
  const gameTypeDistribution = Object.entries(stats?.gamesPerType || {})
    .filter(([type]) => ['pix', 'me_mimei', 'eletronicos', 'super'].includes(type))
    .map(([type, count]) => ({
      name: type === 'pix' ? 'PIX' :
            type === 'me_mimei' ? 'Me Mimei' :
            type === 'eletronicos' ? 'Eletrônicos' :
            type === 'super' ? 'Super Prêmios' : type,
      value: count,
      color: type === 'pix' ? '#3b82f6' :
             type === 'me_mimei' ? '#ec4899' :
             type === 'eletronicos' ? '#f59e0b' :
             type === 'super' ? '#00E880' : '#8b5cf6'
    }));

  // Revenue trend data (last 7 days)
  const revenueTrend = Array.from({length: 7}, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dayGames = games?.filter(g => new Date(g.playedAt).toDateString() === date.toDateString()) || [];
    const revenue = dayGames.reduce((sum, g) => sum + parseFloat(g.cost), 0);
    const prizes = dayGames.reduce((sum, g) => sum + (g.won ? parseFloat(g.prize) : 0), 0);
    
    return {
      day: date.toLocaleDateString('pt-BR', { weekday: 'short' }),
      revenue,
      prizes,
      profit: revenue - prizes
    };
  });

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
              <GamepadIcon className="w-8 h-8 text-[#00E880]" />
            </motion.div>
            Gerenciamento de Jogos
          </motion.h2>
          <p className="text-zinc-400">Visualize e analise todos os jogos da plataforma</p>
        </div>
        
        {/* Badges de status no header */}
        <div className="flex gap-2">
          <Badge variant="outline" className="border-[#00E880] text-[#00E880]">
            Total: {enhancedStats.totalGames}
          </Badge>
          {enhancedStats.todayGames > 0 && (
            <Badge variant="outline" className="border-blue-500 text-blue-400">
              Hoje: {enhancedStats.todayGames}
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
                  <p className="text-zinc-400 text-sm mb-1">Total de Jogos</p>
                  <p className="text-3xl font-bold text-white">
                    <CountUp end={enhancedStats.totalGames} duration={1.5} separator="." />
                  </p>
                  <p className="text-xs text-blue-400 mt-2">
                    +{enhancedStats.todayGames} hoje
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl">
                  <Trophy className="w-6 h-6 text-blue-400" />
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
                  <p className="text-green-100 text-sm mb-1">Receita Total</p>
                  <p className="text-3xl font-bold text-white">
                    R$ <CountUp end={enhancedStats.totalRevenue} duration={1.5} decimals={2} separator="." decimal="," />
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <TrendingUp className="w-4 h-4 text-green-300" />
                    <span className="text-green-200 text-xs">
                      +R$ <CountUp end={enhancedStats.todayRevenue} duration={1} decimals={2} /> hoje
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <DollarSign className="w-6 h-6 text-white" />
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
                  <p className="text-purple-100 text-sm mb-1">Prêmios Pagos</p>
                  <p className="text-3xl font-bold text-white">
                    R$ <CountUp end={enhancedStats.totalPrizes} duration={1.5} decimals={2} separator="." decimal="," />
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <Gift className="w-4 h-4 text-purple-300" />
                    <span className="text-purple-200 text-xs">
                      <CountUp end={enhancedStats.winRate} duration={1} decimals={1} />% taxa de vitória
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Coins className="w-6 h-6 text-white" />
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
                  <p className={`text-sm mb-1 ${enhancedStats.profit >= 0 ? 'text-emerald-100' : 'text-red-100'}`}>
                    Lucro Total
                  </p>
                  <p className="text-3xl font-bold text-white">
                    R$ <CountUp end={enhancedStats.profit} duration={1.5} decimals={2} separator="." decimal="," />
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    {enhancedStats.profit >= 0 ? (
                      <ArrowUpRight className="w-4 h-4 text-emerald-300" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-red-300" />
                    )}
                    <span className={`text-xs ${enhancedStats.profit >= 0 ? 'text-emerald-200' : 'text-red-200'}`}>
                      {((enhancedStats.profit / enhancedStats.totalRevenue) * 100).toFixed(1)}% margem
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Game Type Distribution */}
        <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Filter className="w-5 h-5 text-[#00E880]" />
              Distribuição por Tipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={gameTypeDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={1000}
                >
                  {gameTypeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value) => <span style={{ color: '#e4e4e7' }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue Trend */}
        <Card className="lg:col-span-2 bg-black/50 border-zinc-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#00E880]" />
              Tendência de Receita (7 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={revenueTrend}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00E880" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#00E880" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="day" stroke="#71717a" />
                <YAxis stroke="#71717a" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                  formatter={(value: number) => [`R$ ${value.toFixed(2)}`, '']}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#00E880"
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                  strokeWidth={2}
                  name="Receita"
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorProfit)"
                  strokeWidth={2}
                  name="Lucro"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Game Type Distribution */}
      {stats?.gamesPerType && (
        <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm">
          <CardHeader className="border-b border-zinc-800">
            <CardTitle className="text-xl font-bold text-[#00E880]">Distribuição por Tipo de Jogo</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(stats.gamesPerType).map(([type, count]) => (
                <div key={type} className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800 hover:bg-zinc-800/50 transition-all cursor-pointer group">
                  <p className="text-zinc-400 text-sm font-semibold uppercase tracking-wider mb-2">{type}</p>
                  <p className="text-white font-bold text-2xl group-hover:text-[#00E880] transition-colors">{count}</p>
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
                placeholder="Buscar por ID, nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-zinc-900/50 border-zinc-700 text-white focus:border-[#00E880] transition-colors"
              />
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant={filterResult === "all" ? "default" : "outline"}
                onClick={() => setFilterResult("all")}
                className={filterResult === "all" 
                  ? "bg-gradient-to-r from-gray-500 to-gray-600 text-white font-bold hover:from-gray-600 hover:to-gray-700 transform hover:scale-105 transition-all" 
                  : "bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:bg-zinc-700/50 hover:text-white transition-all"
                }
              >
                Todos
              </Button>
              <Button
                size="sm"
                variant={filterResult === "won" ? "default" : "outline"}
                onClick={() => setFilterResult("won")}
                className={filterResult === "won" 
                  ? "bg-gradient-to-r from-green-500 to-green-600 text-white font-bold hover:from-green-600 hover:to-green-700 transform hover:scale-105 transition-all" 
                  : "bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:bg-zinc-700/50 hover:text-white transition-all"
                }
              >
                Venceu
              </Button>
              <Button
                size="sm"
                variant={filterResult === "lost" ? "default" : "outline"}
                onClick={() => setFilterResult("lost")}
                className={filterResult === "lost" 
                  ? "bg-gradient-to-r from-red-500 to-red-600 text-white font-bold hover:from-red-600 hover:to-red-700 transform hover:scale-105 transition-all" 
                  : "bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:bg-zinc-700/50 hover:text-white transition-all"
                }
              >
                Perdeu
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Games Table */}
      <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm">
        <CardHeader className="border-b border-zinc-800">
          <CardTitle className="text-xl font-bold text-[#00E880]">Histórico de Jogos</CardTitle>
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
                  <TableRow className="border-zinc-800 bg-zinc-900/50">
                    <TableHead className="text-zinc-400 font-semibold uppercase tracking-wider text-xs">ID</TableHead>
                    <TableHead className="text-zinc-400 font-semibold uppercase tracking-wider text-xs">Usuário</TableHead>
                    <TableHead className="text-zinc-400 font-semibold uppercase tracking-wider text-xs">Jogo</TableHead>
                    <TableHead className="text-zinc-400 font-semibold uppercase tracking-wider text-xs">Custo</TableHead>
                    <TableHead className="text-zinc-400 font-semibold uppercase tracking-wider text-xs">Prêmio</TableHead>
                    <TableHead className="text-zinc-400 font-semibold uppercase tracking-wider text-xs">Resultado</TableHead>
                    <TableHead className="text-zinc-400 font-semibold uppercase tracking-wider text-xs">Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGames?.map((game) => (
                    <TableRow key={game.id} className="border-zinc-800 hover:bg-zinc-900/50 transition-colors">
                      <TableCell className="text-white font-mono font-bold">#{game.displayId}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-white font-semibold">{game.userName}</p>
                          <p className="text-zinc-400 text-sm">{game.userEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getGameTypeBadge(game.gameType)}</TableCell>
                      <TableCell className="text-zinc-300 font-medium">R$ {game.cost}</TableCell>
                      <TableCell className={game.won ? "text-[#00E880] font-bold" : "text-zinc-500"}>
                        {game.won ? `R$ ${game.prize}` : "-"}
                      </TableCell>
                      <TableCell>
                        {game.won ? (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 font-semibold">
                            Venceu
                          </Badge>
                        ) : (
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/30 font-semibold">
                            Perdeu
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-zinc-400 text-sm">
                        {formatDate(game.playedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredGames?.length === 0 && (
                <div className="text-center py-12">
                  <GamepadIcon className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
                  <p className="text-zinc-400 text-lg">Nenhum jogo encontrado</p>
                  <p className="text-zinc-500 text-sm mt-2">Ajuste os filtros para ver outros resultados</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}