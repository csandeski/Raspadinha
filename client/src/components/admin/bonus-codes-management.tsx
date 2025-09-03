import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, Gift, TrendingUp, Users, Calendar } from "lucide-react";
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

interface BonusCodeUsage {
  userId: number;
  userName: string;
  userEmail: string;
  code: string;
  amount: number;
  usedAt: string;
}

interface BonusCodeStats {
  totalUsages: number;
  totalBonusAwarded: number;
  todayUsages: number;
  uniqueUsers: number;
}

export function BonusCodesManagement() {
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch bonus code usage data
  const { data: bonusUsages, isLoading: usagesLoading } = useQuery({
    queryKey: ["/api/admin/bonus-codes/usage"],
    queryFn: () => apiRequest("/api/admin/bonus-codes/usage"),
  });

  // Fetch bonus code stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/admin/bonus-codes/stats"],
    queryFn: () => apiRequest("/api/admin/bonus-codes/stats"),
  });

  // Filter usages based on search
  const filteredUsages = bonusUsages?.filter((usage: BonusCodeUsage) =>
    usage.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    usage.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    usage.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              <Gift className="w-8 h-8 text-[#00E880]" />
            </motion.div>
            Gerenciamento de Códigos de Bônus
          </motion.h2>
          <p className="text-zinc-400">Monitore o uso de códigos promocionais e bônus</p>
        </div>
        
        {/* Badges de status no header */}
        <div className="flex gap-2">
          <Badge className="border-[#00E880] text-[#00E880]">
            Total: {stats?.totalUsages || 0} usos
          </Badge>
          {stats?.todayUsages > 0 && (
            <Badge className="border-blue-500 text-blue-400">
              Hoje: {stats.todayUsages}
            </Badge>
          )}
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-zinc-400 text-sm mb-1">Total de Usos</p>
                  <p className="text-3xl font-bold text-white">
                    <CountUp end={stats?.totalUsages || 0} duration={1.5} />
                  </p>
                  <p className="text-xs text-zinc-500 mt-2">Códigos resgatados</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-[#00E880]/20 to-[#00E880]/30 rounded-xl">
                  <Gift className="w-6 h-6 text-[#00E880]" />
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
                  <p className="text-zinc-400 text-sm mb-1">Total Distribuído</p>
                  <p className="text-3xl font-bold text-white">
                    <CountUp end={stats?.totalBonusAwarded || 0} duration={1.5} />
                  </p>
                  <p className="text-xs text-zinc-500 mt-2">Raspadinhas distribuídas</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-purple-400" />
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
                  <p className="text-zinc-400 text-sm mb-1">Usos Hoje</p>
                  <p className="text-3xl font-bold text-white">
                    <CountUp end={stats?.todayUsages || 0} duration={1.5} />
                  </p>
                  <p className="text-xs text-zinc-500 mt-2">Resgatados hoje</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl">
                  <Calendar className="w-6 h-6 text-blue-400" />
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
                  <p className="text-zinc-400 text-sm mb-1">Usuários Únicos</p>
                  <p className="text-3xl font-bold text-white">
                    <CountUp end={stats?.uniqueUsers || 0} duration={1.5} />
                  </p>
                  <p className="text-xs text-zinc-500 mt-2">Resgataram códigos</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-xl">
                  <Users className="w-6 h-6 text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Search and Table */}
      <Card className="bg-black/50 border-zinc-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold text-white">Histórico de Códigos Bônus</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                type="text"
                placeholder="Buscar por nome, email ou código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-black/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-green-400/50 focus:ring-green-400/50 transition-all"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-700 hover:bg-zinc-800/50">
                  <TableHead className="text-zinc-400 uppercase text-xs font-semibold">ID</TableHead>
                  <TableHead className="text-zinc-400 uppercase text-xs font-semibold">Usuário</TableHead>
                  <TableHead className="text-zinc-400 uppercase text-xs font-semibold">Email</TableHead>
                  <TableHead className="text-zinc-400 uppercase text-xs font-semibold">Código</TableHead>
                  <TableHead className="text-zinc-400 uppercase text-xs font-semibold">Prêmio</TableHead>
                  <TableHead className="text-zinc-400 uppercase text-xs font-semibold">Data/Hora</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usagesLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-zinc-400 py-12">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filteredUsages?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-zinc-400 py-12">
                      Nenhum código resgatado ainda
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsages?.map((usage: BonusCodeUsage, index: number) => (
                    <TableRow key={index} className="border-zinc-700 hover:bg-zinc-800/50 transition-colors">
                      <TableCell className="text-white font-mono">{usage.userId}</TableCell>
                      <TableCell className="text-white">{usage.userName}</TableCell>
                      <TableCell className="text-zinc-400 text-sm">{usage.userEmail}</TableCell>
                      <TableCell>
                        <Badge className="bg-purple-400/20 text-purple-400 border-purple-400/50">
                          {usage.code}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-green-400/20 text-green-400 border-green-400/50">
                          {usage.amount} raspadinhas
                        </Badge>
                      </TableCell>
                      <TableCell className="text-zinc-400 text-sm">
                        {format(new Date(usage.usedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}