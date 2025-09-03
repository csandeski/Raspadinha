import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  MousePointer,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Ban,
  Search,
  Filter,
  Download,
  RefreshCw,
  AlertCircle,
  Zap,
  UserCheck,
  Wallet,
  CreditCard,
  Copy,
  ExternalLink,
  MoreVertical,
  Settings,
  Edit,
  Trash2,
  UserPlus,
  Gift,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Trophy,
  Activity
} from "lucide-react";
import CountUp from "react-countup";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AffiliatesManagement() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedAffiliate, setSelectedAffiliate] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch affiliates data
  const { data: affiliatesData, isLoading, refetch } = useQuery({
    queryKey: ["/api/admin/affiliates"],
    queryFn: async () => {
      const sessionId = localStorage.getItem("adminSessionId");
      const response = await fetch("/api/admin/affiliates", {
        headers: { Authorization: `Bearer ${sessionId}` }
      });
      if (!response.ok) throw new Error("Failed to fetch affiliates");
      return response.json();
    },
    refetchInterval: 30000,
  });

  // Fetch affiliate payouts
  const { data: payoutsData } = useQuery({
    queryKey: ["/api/admin/affiliate-payouts"],
    queryFn: async () => {
      const sessionId = localStorage.getItem("adminSessionId");
      const response = await fetch("/api/admin/affiliate-payouts", {
        headers: { Authorization: `Bearer ${sessionId}` }
      });
      if (!response.ok) throw new Error("Failed to fetch payouts");
      return response.json();
    },
  });

  // Fetch recent conversions
  const { data: conversionsData } = useQuery({
    queryKey: ["/api/admin/affiliate-conversions"],
    queryFn: async () => {
      const sessionId = localStorage.getItem("adminSessionId");
      const response = await fetch("/api/admin/affiliate-conversions", {
        headers: { Authorization: `Bearer ${sessionId}` }
      });
      if (!response.ok) throw new Error("Failed to fetch conversions");
      return response.json();
    },
  });

  // Update affiliate status
  const updateAffiliateMutation = useMutation({
    mutationFn: async (data: { id: number; isActive: boolean }) => {
      const sessionId = localStorage.getItem("adminSessionId");
      return await apiRequest(`/api/admin/affiliates/${data.id}`, "PATCH", {
        isActive: data.isActive
      });
    },
    onSuccess: () => {
      toast({
        title: "Status atualizado",
        description: "O status do afiliado foi atualizado com sucesso",
      });
      refetch();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar status do afiliado",
        variant: "destructive",
      });
    },
  });

  // Approve payout
  const approvePayoutMutation = useMutation({
    mutationFn: async (payoutId: number) => {
      const sessionId = localStorage.getItem("adminSessionId");
      return await apiRequest(`/api/admin/affiliate-payouts/${payoutId}/approve`, "POST");
    },
    onSuccess: () => {
      toast({
        title: "Saque aprovado",
        description: "O pagamento foi processado com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/affiliate-payouts"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao aprovar saque",
        variant: "destructive",
      });
    },
  });

  // Reject payout
  const rejectPayoutMutation = useMutation({
    mutationFn: async (payoutId: number) => {
      const sessionId = localStorage.getItem("adminSessionId");
      return await apiRequest(`/api/admin/affiliate-payouts/${payoutId}/reject`, "POST");
    },
    onSuccess: () => {
      toast({
        title: "Saque rejeitado",
        description: "O saque foi rejeitado com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/affiliate-payouts"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao rejeitar saque",
        variant: "destructive",
      });
    },
  });

  // Filter affiliates
  const filteredAffiliates = affiliatesData?.affiliates?.filter((affiliate: any) => {
    const matchesSearch = affiliate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          affiliate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          affiliate.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && affiliate.isActive) ||
                         (statusFilter === "inactive" && !affiliate.isActive);
    return matchesSearch && matchesStatus;
  }) || [];

  // Calculate stats
  const stats = {
    totalAffiliates: affiliatesData?.affiliates?.length || 0,
    activeAffiliates: affiliatesData?.affiliates?.filter((a: any) => a.isActive).length || 0,
    totalCommissions: affiliatesData?.totalCommissions || "0.00",
    pendingPayouts: payoutsData?.filter((p: any) => p.status === "pending").length || 0,
    totalPaid: affiliatesData?.totalPaid || "0.00",
    conversionRate: affiliatesData?.conversionRate || 0
  };

  const copyAffiliateLink = (code: string) => {
    navigator.clipboard.writeText(`https://mania-brasil.com/?ref=${code}`);
    toast({
      title: "Link copiado!",
      description: "Link de afiliado copiado para área de transferência",
    });
  };

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
            Gerenciamento de Afiliados
          </motion.h2>
          <p className="text-zinc-400">Gerencie afiliados, comissões e saques</p>
        </div>
        
        {/* Badges de status no header */}
        <div className="flex gap-2">
          <Badge variant="outline" className="border-[#00E880] text-[#00E880]">
            Total: {stats.totalAffiliates}
          </Badge>
          {stats.pendingPayouts > 0 && (
            <Badge variant="outline" className="border-amber-500 text-amber-400 animate-pulse">
              Saques Pendentes: {stats.pendingPayouts}
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
                  <p className="text-zinc-400 text-sm mb-1">Total Afiliados</p>
                  <p className="text-3xl font-bold text-white">
                    <CountUp end={stats.totalAffiliates} duration={1.5} />
                  </p>
                  <p className="text-xs text-zinc-500 mt-2">
                    <span className="text-[#00E880]">{stats.activeAffiliates}</span> ativos
                  </p>
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
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-zinc-400 text-sm mb-1">Comissões Total</p>
                  <p className="text-3xl font-bold text-white">
                    R$ <CountUp end={parseFloat(stats.totalCommissions)} decimals={2} duration={1.5} />
                  </p>
                  <Badge className="mt-2 bg-[#00E880]/10 text-[#00E880] border-[#00E880]/20">
                    <ArrowUpRight className="w-3 h-3 mr-1" />
                    +12% este mês
                  </Badge>
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
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-zinc-400 text-sm mb-1">Saques Pendentes</p>
                  <p className="text-3xl font-bold text-white">
                    <CountUp end={stats.pendingPayouts} duration={1.5} />
                  </p>
                  <p className="text-amber-400 text-xs mt-2">Aguardando aprovação</p>
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
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-zinc-400 text-sm mb-1">Taxa Conversão</p>
                  <p className="text-3xl font-bold text-white">
                    <CountUp end={stats.conversionRate} suffix="%" duration={1.5} />
                  </p>
                  <p className="text-blue-400 text-xs mt-2">Cliques → Cadastros</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl">
                  <Target className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-black/50 border border-zinc-800">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="affiliates">Afiliados</TabsTrigger>
          <TabsTrigger value="payouts">Saques</TabsTrigger>
          <TabsTrigger value="conversions">Conversões</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Affiliates */}
            <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Top Afiliados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {affiliatesData?.topAffiliates?.map((affiliate: any, index: number) => (
                  <div key={affiliate.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                        ${index === 0 ? 'bg-yellow-500/20 text-yellow-500' : 
                          index === 1 ? 'bg-gray-400/20 text-gray-400' :
                          index === 2 ? 'bg-orange-600/20 text-orange-600' :
                          'bg-zinc-700 text-zinc-400'}`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-white font-medium">{affiliate.name}</p>
                        <p className="text-xs text-zinc-400">{affiliate.code}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-green-500 font-medium">R$ {affiliate.totalEarnings}</p>
                      <p className="text-xs text-zinc-400">{affiliate.conversions} conversões</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-500" />
                  Atividade Recente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {conversionsData?.slice(0, 5).map((conversion: any) => (
                  <div key={conversion.id} className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg">
                    <div className={`p-2 rounded-lg ${
                      conversion.type === 'registration' ? 'bg-blue-500/10' : 'bg-green-500/10'
                    }`}>
                      {conversion.type === 'registration' ? 
                        <UserPlus className="w-4 h-4 text-blue-500" /> :
                        <DollarSign className="w-4 h-4 text-green-500" />
                      }
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm">
                        {conversion.type === 'registration' ? 'Novo cadastro' : 'Depósito realizado'}
                      </p>
                      <p className="text-xs text-zinc-400 mt-1">
                        {conversion.affiliateName} • {conversion.userName}
                      </p>
                      {conversion.amount && (
                        <p className="text-xs text-green-500 mt-1">
                          R$ {conversion.amount} → R$ {conversion.commission} comissão
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500">
                      {format(new Date(conversion.createdAt), "HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Affiliates Tab */}
        <TabsContent value="affiliates" className="space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 w-4 h-4" />
              <Input
                placeholder="Buscar por nome, email ou código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-black/50 border-zinc-800 backdrop-blur-sm text-white"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-black/50 border border-zinc-800 backdrop-blur-sm rounded-lg text-white"
            >
              <option value="all">Todos Status</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
            <Button
              onClick={() => refetch()}
              className="bg-zinc-800 hover:bg-zinc-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>

          {/* Affiliates Table */}
          <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800">
                    <TableHead className="text-zinc-400">Afiliado</TableHead>
                    <TableHead className="text-zinc-400">Código</TableHead>
                    <TableHead className="text-zinc-400">Status</TableHead>
                    <TableHead className="text-zinc-400">Cliques</TableHead>
                    <TableHead className="text-zinc-400">Cadastros</TableHead>
                    <TableHead className="text-zinc-400">Depósitos</TableHead>
                    <TableHead className="text-zinc-400">Comissões</TableHead>
                    <TableHead className="text-zinc-400">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAffiliates.map((affiliate: any) => (
                    <TableRow key={affiliate.id} className="border-zinc-800">
                      <TableCell>
                        <div>
                          <p className="text-white font-medium">{affiliate.name}</p>
                          <p className="text-xs text-zinc-400">{affiliate.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-purple-400 bg-purple-500/10 px-2 py-1 rounded text-xs">
                            {affiliate.code}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyAffiliateLink(affiliate.code)}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={affiliate.isActive ? "default" : "secondary"}>
                          {affiliate.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-white">{affiliate.totalClicks || 0}</TableCell>
                      <TableCell className="text-white">{affiliate.totalRegistrations || 0}</TableCell>
                      <TableCell className="text-white">{affiliate.totalDeposits || 0}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-green-500 font-medium">R$ {affiliate.totalEarnings || "0.00"}</p>
                          <p className="text-xs text-amber-500">R$ {affiliate.pendingEarnings || "0.00"} pendente</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedAffiliate(affiliate);
                              setShowEditModal(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => updateAffiliateMutation.mutate({
                              id: affiliate.id,
                              isActive: !affiliate.isActive
                            })}
                          >
                            {affiliate.isActive ? 
                              <Ban className="w-4 h-4 text-red-500" /> :
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            }
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payouts Tab */}
        <TabsContent value="payouts" className="space-y-4">
          <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Solicitações de Saque</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800">
                    <TableHead className="text-zinc-400">Afiliado</TableHead>
                    <TableHead className="text-zinc-400">Valor</TableHead>
                    <TableHead className="text-zinc-400">Chave PIX</TableHead>
                    <TableHead className="text-zinc-400">Status</TableHead>
                    <TableHead className="text-zinc-400">Data</TableHead>
                    <TableHead className="text-zinc-400">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payoutsData?.map((payout: any) => (
                    <TableRow key={payout.id} className="border-zinc-800">
                      <TableCell>
                        <div>
                          <p className="text-white font-medium">{payout.affiliateName}</p>
                          <p className="text-xs text-zinc-400">{payout.affiliateCode}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-green-500 font-medium">R$ {payout.amount}</p>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs text-zinc-400">{payout.pixKey}</code>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          payout.status === 'pending' ? 'default' :
                          payout.status === 'approved' ? 'default' :
                          'secondary'
                        } className={
                          payout.status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
                          payout.status === 'approved' ? 'bg-green-500/10 text-green-500' :
                          'bg-red-500/10 text-red-500'
                        }>
                          {payout.status === 'pending' ? 'Pendente' :
                           payout.status === 'approved' ? 'Aprovado' :
                           'Rejeitado'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-zinc-400 text-sm">
                        {format(new Date(payout.requestedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {payout.status === 'pending' && (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              className="bg-green-500/10 text-green-500 hover:bg-green-500/20"
                              onClick={() => approvePayoutMutation.mutate(payout.id)}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              className="bg-red-500/10 text-red-500 hover:bg-red-500/20"
                              onClick={() => rejectPayoutMutation.mutate(payout.id)}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conversions Tab */}
        <TabsContent value="conversions" className="space-y-4">
          <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Conversões Recentes</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800">
                    <TableHead className="text-zinc-400">Tipo</TableHead>
                    <TableHead className="text-zinc-400">Afiliado</TableHead>
                    <TableHead className="text-zinc-400">Usuário</TableHead>
                    <TableHead className="text-zinc-400">Valor</TableHead>
                    <TableHead className="text-zinc-400">Comissão</TableHead>
                    <TableHead className="text-zinc-400">Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conversionsData?.map((conversion: any) => (
                    <TableRow key={conversion.id} className="border-zinc-800">
                      <TableCell>
                        <Badge variant="outline" className={
                          conversion.type === 'registration' ? 
                          'border-blue-500 text-blue-500' : 
                          'border-green-500 text-green-500'
                        }>
                          {conversion.type === 'registration' ? 'Cadastro' : 'Depósito'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-white">{conversion.affiliateName}</p>
                          <p className="text-xs text-zinc-400">{conversion.affiliateCode}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-white">{conversion.userName || '-'}</TableCell>
                      <TableCell className="text-white">
                        {conversion.amount ? `R$ ${conversion.amount}` : '-'}
                      </TableCell>
                      <TableCell className="text-green-500 font-medium">
                        {conversion.commission ? `R$ ${conversion.commission}` : '-'}
                      </TableCell>
                      <TableCell className="text-zinc-400 text-sm">
                        {format(new Date(conversion.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Affiliate Modal */}
      {selectedAffiliate && (
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="bg-zinc-900 border-zinc-800">
            <DialogHeader>
              <DialogTitle className="text-white">Detalhes do Afiliado</DialogTitle>
              <DialogDescription className="text-zinc-400">
                Visualize e edite as informações do afiliado
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label className="text-zinc-400">Nome</Label>
                <p className="text-white">{selectedAffiliate.name}</p>
              </div>
              
              <div>
                <Label className="text-zinc-400">Email</Label>
                <p className="text-white">{selectedAffiliate.email}</p>
              </div>
              
              <div>
                <Label className="text-zinc-400">Código</Label>
                <div className="flex items-center gap-2">
                  <code className="text-purple-400 bg-purple-500/10 px-3 py-1 rounded">
                    {selectedAffiliate.code}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyAffiliateLink(selectedAffiliate.code)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <Separator className="bg-zinc-800" />
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-zinc-400">Total de Cliques</Label>
                  <p className="text-white text-xl font-bold">{selectedAffiliate.totalClicks || 0}</p>
                </div>
                <div>
                  <Label className="text-zinc-400">Cadastros</Label>
                  <p className="text-white text-xl font-bold">{selectedAffiliate.totalRegistrations || 0}</p>
                </div>
                <div>
                  <Label className="text-zinc-400">Total Ganho</Label>
                  <p className="text-green-500 text-xl font-bold">R$ {selectedAffiliate.totalEarnings || "0.00"}</p>
                </div>
                <div>
                  <Label className="text-zinc-400">Pendente</Label>
                  <p className="text-amber-500 text-xl font-bold">R$ {selectedAffiliate.pendingEarnings || "0.00"}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-zinc-400">Status</Label>
                <Badge variant={selectedAffiliate.isActive ? "default" : "secondary"} className="mt-2">
                  {selectedAffiliate.isActive ? "Ativo" : "Inativo"}
                </Badge>
              </div>
            </div>
            
            <DialogFooter>
              <Button
                onClick={() => {
                  updateAffiliateMutation.mutate({
                    id: selectedAffiliate.id,
                    isActive: !selectedAffiliate.isActive
                  });
                  setShowEditModal(false);
                }}
                className={selectedAffiliate.isActive ? 
                  "bg-red-500 hover:bg-red-600" : 
                  "bg-green-500 hover:bg-green-600"
                }
              >
                {selectedAffiliate.isActive ? "Desativar" : "Ativar"} Afiliado
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}