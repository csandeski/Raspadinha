import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
} from "recharts";
import {
  Monitor,
  Smartphone,
  Users,
  UserCheck,
  Globe,
  Activity,
  TrendingUp,
  RefreshCw,
  Calendar,
  MapPin,
  Chrome,
  Smartphone as PhoneIcon,
  Monitor as DesktopIcon,
  Tablet,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function SiteAccessesManagement() {
  const [timeRange, setTimeRange] = useState("7d");

  // Fetch site access stats
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ["/api/admin/site-accesses/stats", timeRange],
    queryFn: async () => {
      const sessionId = localStorage.getItem("adminSessionId");
      const response = await fetch(`/api/admin/site-accesses/stats?timeRange=${timeRange}`, {
        headers: {
          Authorization: `Bearer ${sessionId}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch site access stats");
      return response.json();
    },
    refetchInterval: 30000,
  });

  // Fetch recent accesses
  const { data: accesses, isLoading: accessesLoading, refetch: refetchAccesses } = useQuery({
    queryKey: ["/api/admin/site-accesses", { page: 1, limit: 20 }],
    queryFn: async () => {
      const sessionId = localStorage.getItem("adminSessionId");
      const response = await fetch(`/api/admin/site-accesses?page=1&limit=20`, {
        headers: {
          Authorization: `Bearer ${sessionId}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch site accesses");
      return response.json();
    },
  });

  const handleRefresh = () => {
    refetchStats();
    refetchAccesses();
  };

  // Device type data for pie chart
  const deviceData = [
    { name: "Mobile", value: stats?.mobileUsers || 0, color: "#00E880" },
    { name: "Desktop", value: stats?.desktopUsers || 0, color: "#8B5CF6" },
  ];

  // Access trend data
  const trendData = stats?.accessTrend || [];

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case "mobile":
        return <PhoneIcon className="w-4 h-4" />;
      case "tablet":
        return <Tablet className="w-4 h-4" />;
      default:
        return <DesktopIcon className="w-4 h-4" />;
    }
  };

  const getBrowserColor = (browser: string) => {
    const lowerBrowser = browser.toLowerCase();
    if (lowerBrowser.includes("chrome")) return "bg-green-500/20 text-green-400 border-green-500/30";
    if (lowerBrowser.includes("firefox")) return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    if (lowerBrowser.includes("safari")) return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
  };

  if (statsLoading || accessesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00E880]"></div>
      </div>
    );
  }

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
              <Globe className="w-8 h-8 text-[#00E880]" />
            </motion.div>
            Análise de Acessos
          </motion.h2>
          <p className="text-zinc-400">Monitoramento em tempo real dos visitantes do site</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Badges de status no header */}
          <div className="flex gap-2">
            <Badge variant="outline" className="border-[#00E880] text-[#00E880]">
              Total: {stats?.totalAccesses || 0}
            </Badge>
            {stats?.activeNow > 0 && (
              <Badge variant="outline" className="border-green-500 text-green-400 animate-pulse">
                Online: {stats?.activeNow}
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            onClick={handleRefresh}
            className="bg-black/50 border-zinc-800 backdrop-blur-sm hover:bg-zinc-800/50"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
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
                  <p className="text-zinc-400 text-sm mb-1">Total de Acessos</p>
                  <p className="text-3xl font-bold text-white">
                    <CountUp end={stats?.totalAccesses || 0} duration={1.5} separator="." />
                  </p>
                  <p className="text-xs text-zinc-500 mt-2">Últimos {timeRange === "7d" ? "7 dias" : "30 dias"}</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-[#00E880]/20 to-[#00E880]/30 rounded-xl">
                  <Activity className="w-6 h-6 text-[#00E880]" />
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
                  <p className="text-zinc-400 text-sm mb-1">Visitantes Únicos</p>
                  <p className="text-3xl font-bold text-white">
                    <CountUp end={stats?.uniqueVisitors || 0} duration={1.5} separator="." />
                  </p>
                  <p className="text-xs text-purple-400 mt-2">IPs únicos</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl">
                  <Users className="w-6 h-6 text-purple-400" />
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
                  <p className="text-zinc-400 text-sm mb-1">Usuários Registrados</p>
                  <p className="text-3xl font-bold text-white">
                    <CountUp end={stats?.registeredAccesses || 0} duration={1.5} separator="." />
                  </p>
                  <p className="text-xs text-blue-400 mt-2">
                    {((stats?.registeredAccesses / stats?.totalAccesses) * 100 || 0).toFixed(1)}% do total
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl">
                  <UserCheck className="w-6 h-6 text-blue-400" />
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
                  <p className="text-zinc-400 text-sm mb-1">Taxa de Conversão</p>
                  <p className="text-3xl font-bold text-white">
                    <CountUp 
                      end={((stats?.registeredAccesses / stats?.uniqueVisitors) * 100 || 0)} 
                      decimals={1} 
                      duration={1.5} 
                      suffix="%"
                    />
                  </p>
                  <p className="text-xs text-amber-400 mt-2">Visitantes → Registros</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-amber-500/20 to-amber-600/20 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Access Trend Chart */}
        <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Tendência de Acessos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorAccess" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00E880" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#00E880" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181B",
                      border: "1px solid #27272A",
                      borderRadius: "8px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="accesses"
                    stroke="#00E880"
                    fillOpacity={1}
                    fill="url(#colorAccess)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Device Type Chart */}
        <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Dispositivos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deviceData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {deviceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181B",
                      border: "1px solid #27272A",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Accesses Table */}
      <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white">Acessos Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Horário</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">IP</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Dispositivo</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Navegador</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Página</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {accesses?.accesses?.map((access: any) => (
                  <tr key={access.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                    <td className="py-3 px-4 text-sm text-zinc-300">
                      {format(new Date(access.createdAt), "dd/MM HH:mm", { locale: ptBR })}
                    </td>
                    <td className="py-3 px-4 text-sm text-zinc-300 font-mono">{access.ipAddress}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {getDeviceIcon(access.deviceType)}
                        <span className="text-sm text-zinc-300">{access.deviceType}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={getBrowserColor(access.browser || "Unknown")}>
                        {access.browser || "Unknown"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-zinc-300">{access.pageUrl}</td>
                    <td className="py-3 px-4">
                      {access.isRegistered ? (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          Registrado
                        </Badge>
                      ) : (
                        <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30">
                          Visitante
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}