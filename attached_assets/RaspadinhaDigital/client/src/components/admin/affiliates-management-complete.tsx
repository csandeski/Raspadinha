import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Activity,
  Key,
  Lock,
  Link,
  Code,
  BarChart3,
  FileText,
  Shield,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Hash,
  Percent,
  ChevronUp,
  ChevronDown,
  Info,
  QrCode,
  Share2,
  Network
} from "lucide-react";
import CountUp from "react-countup";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Tipos de dados
interface Affiliate {
  id: number;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  pix_key: string;
  pix_key_type: string;
  commission_rate: number;
  total_earnings: number;
  paid_earnings: number;
  pending_earnings: number;
  total_clicks: number;
  total_registrations: number;
  total_deposits: number;
  is_active: boolean;
  level: string;
  created_at: string;
  last_activity: string;
}

interface AffiliateWithdrawal {
  id: number;
  affiliate_id: number;
  affiliate_name: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  pix_key: string;
  pix_key_type: string;
  requested_at: string;
  processed_at?: string;
  notes?: string;
}

interface AffiliateCode {
  id: number;
  code: string;
  clicks: number;
  registrations: number;
  deposits: number;
  created_at: string;
}

interface AffiliateLink {
  id: number;
  name: string;
  url: string;
  clicks: number;
  registrations: number;
  deposits: number;
  conversion_rate: number;
  created_at: string;
}

// Função para calcular o nível do afiliado baseado nos ganhos aprovados
const calculateAffiliateLevel = (approvedEarnings: number) => {
  if (approvedEarnings >= 100000) return { name: 'Diamante', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10', percentage: 70 };
  if (approvedEarnings >= 50000) return { name: 'Platina', color: 'text-purple-400', bgColor: 'bg-purple-500/10', percentage: 60 };
  if (approvedEarnings >= 20000) return { name: 'Ouro', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', percentage: 50 };
  if (approvedEarnings >= 5000) return { name: 'Prata', color: 'text-gray-400', bgColor: 'bg-gray-500/10', percentage: 45 };
  return { name: 'Bronze', color: 'text-orange-400', bgColor: 'bg-orange-500/10', percentage: 40 };
};

export default function AffiliatesManagementComplete() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [copiedText, setCopiedText] = useState("");

  // Dados do novo afiliado
  const [newAffiliate, setNewAffiliate] = useState({
    name: "",
    email: "",
    phone: "",
    cpf: "",
    password: "",
    pix_key: "",
    pix_key_type: "cpf",
    commission_rate: 40
  });

  // Fetch all affiliates with complete data
  const { data: affiliatesData, isLoading, refetch } = useQuery({
    queryKey: ["/api/admin/affiliates/complete"],
    queryFn: async () => {
      const sessionId = localStorage.getItem("adminSessionId");
      const response = await fetch("/api/admin/affiliates/complete", {
        headers: { Authorization: `Bearer ${sessionId}` }
      });
      if (!response.ok) throw new Error("Failed to fetch affiliates");
      return response.json();
    },
    refetchInterval: 30000,
  });

  // Fetch withdrawals
  const { data: withdrawalsData } = useQuery({
    queryKey: ["/api/admin/affiliate-withdrawals"],
    queryFn: async () => {
      const sessionId = localStorage.getItem("adminSessionId");
      const response = await fetch("/api/admin/affiliate-withdrawals", {
        headers: { Authorization: `Bearer ${sessionId}` }
      });
      if (!response.ok) throw new Error("Failed to fetch withdrawals");
      return response.json();
    },
  });

  // Fetch affiliate codes and links for selected affiliate
  const { data: affiliateDetails } = useQuery({
    queryKey: ["/api/admin/affiliate-details", selectedAffiliate?.id],
    queryFn: async () => {
      if (!selectedAffiliate) return null;
      const sessionId = localStorage.getItem("adminSessionId");
      const response = await fetch(`/api/admin/affiliates/${selectedAffiliate.id}/details`, {
        headers: { Authorization: `Bearer ${sessionId}` }
      });
      if (!response.ok) throw new Error("Failed to fetch affiliate details");
      return response.json();
    },
    enabled: !!selectedAffiliate,
  });

  // Criar novo afiliado
  const createAffiliateMutation = useMutation({
    mutationFn: async (data: typeof newAffiliate) => {
      const sessionId = localStorage.getItem("adminSessionId");
      return await apiRequest("/api/admin/affiliates/create", "POST", data);
    },
    onSuccess: (data) => {
      toast({
        title: "Afiliado criado com sucesso",
        description: `Login: ${data.email} | Senha: ${data.password}`,
      });
      setShowCreateModal(false);
      setNewAffiliate({
        name: "",
        email: "",
        phone: "",
        cpf: "",
        password: "",
        pix_key: "",
        pix_key_type: "cpf",
        commission_rate: 40
      });
      refetch();
    },
    onError: () => {
      toast({
        title: "Erro ao criar afiliado",
        description: "Tente novamente",
        variant: "destructive",
      });
    },
  });

  // Resetar senha do afiliado
  const resetPasswordMutation = useMutation({
    mutationFn: async (data: { affiliateId: number; newPassword: string }) => {
      const sessionId = localStorage.getItem("adminSessionId");
      return await apiRequest(`/api/admin/affiliates/${data.affiliateId}/reset-password`, "POST", {
        password: data.newPassword
      });
    },
    onSuccess: () => {
      toast({
        title: "Senha atualizada",
        description: "A nova senha foi definida com sucesso",
      });
      setShowPasswordModal(false);
      setNewPassword("");
    },
    onError: () => {
      toast({
        title: "Erro ao resetar senha",
        description: "Tente novamente",
        variant: "destructive",
      });
    },
  });

  // Atualizar status do afiliado
  const updateAffiliateMutation = useMutation({
    mutationFn: async (data: { id: number; updates: any }) => {
      const sessionId = localStorage.getItem("adminSessionId");
      return await apiRequest(`/api/admin/affiliates/${data.id}`, "PATCH", data.updates);
    },
    onSuccess: () => {
      toast({
        title: "Afiliado atualizado",
        description: "As informações foram atualizadas com sucesso",
      });
      refetch();
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar",
        description: "Tente novamente",
        variant: "destructive",
      });
    },
  });

  // Processar saque
  const processWithdrawalMutation = useMutation({
    mutationFn: async (data: { withdrawalId: number; action: 'approve' | 'reject' | 'paid'; notes?: string }) => {
      const sessionId = localStorage.getItem("adminSessionId");
      return await apiRequest(`/api/admin/affiliate-withdrawals/${data.withdrawalId}`, "PATCH", {
        action: data.action,
        notes: data.notes
      });
    },
    onSuccess: () => {
      toast({
        title: "Saque processado",
        description: "O saque foi processado com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/affiliate-withdrawals"] });
    },
    onError: () => {
      toast({
        title: "Erro ao processar saque",
        description: "Tente novamente",
        variant: "destructive",
      });
    },
  });

  // Função para copiar texto
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    toast({
      title: "Copiado!",
      description: `${label} copiado para a área de transferência`,
    });
    setTimeout(() => setCopiedText(""), 2000);
  };

  // Função para gerar senha aleatória
  const generateRandomPassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // Filtrar afiliados
  const filteredAffiliates = affiliatesData?.affiliates?.filter((affiliate: Affiliate) => {
    const matchesSearch = affiliate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          affiliate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          affiliate.cpf.includes(searchTerm);
    
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && affiliate.is_active) ||
                         (statusFilter === "inactive" && !affiliate.is_active);
    
    return matchesSearch && matchesStatus;
  }) || [];

  // Calcular estatísticas
  const stats = {
    totalAffiliates: affiliatesData?.affiliates?.length || 0,
    activeAffiliates: affiliatesData?.affiliates?.filter((a: Affiliate) => a.is_active).length || 0,
    totalEarnings: affiliatesData?.totalEarnings || 0,
    pendingPayouts: affiliatesData?.pendingPayouts || 0,
    totalClicks: affiliatesData?.totalClicks || 0,
    totalRegistrations: affiliatesData?.totalRegistrations || 0,
    totalDeposits: affiliatesData?.totalDeposits || 0,
    conversionRate: affiliatesData?.conversionRate || 0
  };

  return (
    <div className="space-y-6">
      {/* Header com estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-black/50 border-zinc-800">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-zinc-400 text-sm">Total de Afiliados</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    <CountUp end={stats.totalAffiliates} duration={2} />
                  </p>
                  <Badge className="mt-2 bg-[#00E880]/10 text-[#00E880] border-[#00E880]/20">
                    <UserCheck className="w-3 h-3 mr-1" />
                    {stats.activeAffiliates} ativos
                  </Badge>
                </div>
                <div className="p-3 rounded-xl bg-[#00E880]/10">
                  <Users className="w-6 h-6 text-[#00E880]" />
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
          <Card className="bg-black/50 border-zinc-800">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-zinc-400 text-sm">Comissões Totais</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    R$ <CountUp end={stats.totalEarnings} duration={2} decimals={2} decimal="," separator="." />
                  </p>
                  <Badge className="mt-2 bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                    <Clock className="w-3 h-3 mr-1" />
                    R$ {stats.pendingPayouts.toFixed(2)} pendente
                  </Badge>
                </div>
                <div className="p-3 rounded-xl bg-yellow-500/10">
                  <DollarSign className="w-6 h-6 text-yellow-400" />
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
          <Card className="bg-black/50 border-zinc-800">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-zinc-400 text-sm">Conversões</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    <CountUp end={stats.totalDeposits} duration={2} />
                  </p>
                  <Badge className="mt-2 bg-blue-500/10 text-blue-400 border-blue-500/20">
                    <Target className="w-3 h-3 mr-1" />
                    {stats.conversionRate.toFixed(1)}% taxa
                  </Badge>
                </div>
                <div className="p-3 rounded-xl bg-blue-500/10">
                  <TrendingUp className="w-6 h-6 text-blue-400" />
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
          <Card className="bg-black/50 border-zinc-800">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-zinc-400 text-sm">Cliques Totais</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    <CountUp end={stats.totalClicks} duration={2} />
                  </p>
                  <Badge className="mt-2 bg-purple-500/10 text-purple-400 border-purple-500/20">
                    <MousePointer className="w-3 h-3 mr-1" />
                    {stats.totalRegistrations} registros
                  </Badge>
                </div>
                <div className="p-3 rounded-xl bg-purple-500/10">
                  <Activity className="w-6 h-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Tabs principais */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList className="bg-zinc-900">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="withdrawals">Saques</TabsTrigger>
            <TabsTrigger value="commissions">Comissões</TabsTrigger>
            <TabsTrigger value="network">Rede</TabsTrigger>
            <TabsTrigger value="settings">Configurações</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => refetch()}
              variant="outline"
              size="sm"
              className="bg-zinc-900 border-zinc-800"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-[#00E880] hover:bg-[#00E880]/90 text-black"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Novo Afiliado
            </Button>
          </div>
        </div>

        {/* Tab: Visão Geral */}
        <TabsContent value="overview" className="space-y-4">
          {/* Filtros */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <Input
                    placeholder="Buscar por nome, email ou CPF..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-black/50 border-zinc-700"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px] bg-black/50 border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativos</SelectItem>
                    <SelectItem value="inactive">Inativos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tabela de Afiliados */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle>Afiliados</CardTitle>
              <CardDescription>Gerencie todos os afiliados da plataforma</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Afiliado</TableHead>
                      <TableHead>Nível</TableHead>
                      <TableHead>Comissão</TableHead>
                      <TableHead>Ganhos</TableHead>
                      <TableHead>Conversões</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAffiliates.map((affiliate: Affiliate) => {
                      const level = calculateAffiliateLevel(affiliate.paid_earnings);
                      return (
                        <TableRow key={affiliate.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                                <span className="text-white font-semibold">
                                  {affiliate.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-white">{affiliate.name}</p>
                                <p className="text-sm text-zinc-400">{affiliate.email}</p>
                                <p className="text-xs text-zinc-500">CPF: {affiliate.cpf}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${level.bgColor} ${level.color} border-0`}>
                              <Trophy className="w-3 h-3 mr-1" />
                              {level.name} ({level.percentage}%)
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-green-500/30 text-green-400">
                              {affiliate.commission_rate}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="text-white font-medium">
                                R$ {affiliate.total_earnings.toFixed(2)}
                              </p>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-green-400">
                                  Pago: R$ {affiliate.paid_earnings.toFixed(2)}
                                </span>
                                {affiliate.pending_earnings > 0 && (
                                  <span className="text-yellow-400">
                                    Pendente: R$ {affiliate.pending_earnings.toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center gap-2">
                                <MousePointer className="w-3 h-3 text-zinc-400" />
                                <span className="text-zinc-300">{affiliate.total_clicks} cliques</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <UserPlus className="w-3 h-3 text-zinc-400" />
                                <span className="text-zinc-300">{affiliate.total_registrations} registros</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <DollarSign className="w-3 h-3 text-zinc-400" />
                                <span className="text-zinc-300">{affiliate.total_deposits} depósitos</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={affiliate.is_active}
                              onCheckedChange={(checked) => {
                                updateAffiliateMutation.mutate({
                                  id: affiliate.id,
                                  updates: { is_active: checked }
                                });
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedAffiliate(affiliate);
                                  setShowDetailsModal(true);
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedAffiliate(affiliate);
                                  setShowPasswordModal(true);
                                  setNewPassword(generateRandomPassword());
                                }}
                              >
                                <Key className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  copyToClipboard(affiliate.email, "Email");
                                }}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Saques */}
        <TabsContent value="withdrawals" className="space-y-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle>Solicitações de Saque</CardTitle>
              <CardDescription>Gerencie os saques dos afiliados</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Afiliado</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Chave PIX</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawalsData?.map((withdrawal: AffiliateWithdrawal) => (
                      <TableRow key={withdrawal.id}>
                        <TableCell>#{withdrawal.id}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-white">{withdrawal.affiliate_name}</p>
                            <p className="text-sm text-zinc-400">ID: {withdrawal.affiliate_id}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-semibold text-white">
                            R$ {withdrawal.amount.toFixed(2)}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant="outline" className="text-xs">
                              {withdrawal.pix_key_type.toUpperCase()}
                            </Badge>
                            <p className="text-sm text-zinc-400">{withdrawal.pix_key}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            withdrawal.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' :
                            withdrawal.status === 'approved' ? 'bg-blue-500/10 text-blue-400' :
                            withdrawal.status === 'paid' ? 'bg-green-500/10 text-green-400' :
                            'bg-red-500/10 text-red-400'
                          }>
                            {withdrawal.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                            {withdrawal.status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {withdrawal.status === 'paid' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {withdrawal.status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
                            {withdrawal.status === 'pending' ? 'Pendente' :
                             withdrawal.status === 'approved' ? 'Aprovado' :
                             withdrawal.status === 'paid' ? 'Pago' : 'Rejeitado'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p className="text-zinc-300">
                              {format(new Date(withdrawal.requested_at), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                            <p className="text-zinc-500">
                              {format(new Date(withdrawal.requested_at), "HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {withdrawal.status === 'pending' && (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-green-400 hover:text-green-300"
                                onClick={() => {
                                  processWithdrawalMutation.mutate({
                                    withdrawalId: withdrawal.id,
                                    action: 'approve'
                                  });
                                }}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-400 hover:text-red-300"
                                onClick={() => {
                                  processWithdrawalMutation.mutate({
                                    withdrawalId: withdrawal.id,
                                    action: 'reject'
                                  });
                                }}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                          {withdrawal.status === 'approved' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-400 border-green-400/30"
                              onClick={() => {
                                processWithdrawalMutation.mutate({
                                  withdrawalId: withdrawal.id,
                                  action: 'paid'
                                });
                              }}
                            >
                              Marcar como Pago
                            </Button>
                          )}
                          {withdrawal.status === 'paid' && (
                            <Badge className="bg-green-500/10 text-green-400">
                              Concluído
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Outras tabs podem ser adicionadas aqui */}
      </Tabs>

      {/* Modal de Detalhes do Afiliado */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-4xl bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle>Detalhes do Afiliado</DialogTitle>
            <DialogDescription>
              Informações completas e configurações do afiliado
            </DialogDescription>
          </DialogHeader>
          
          {selectedAffiliate && affiliateDetails && (
            <div className="space-y-4">
              {/* Informações Pessoais */}
              <Card className="bg-black/50 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-lg">Informações Pessoais</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-zinc-400">Nome</Label>
                    <p className="text-white">{selectedAffiliate.name}</p>
                  </div>
                  <div>
                    <Label className="text-zinc-400">Email</Label>
                    <div className="flex items-center gap-2">
                      <p className="text-white">{selectedAffiliate.email}</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(selectedAffiliate.email, "Email")}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-zinc-400">CPF</Label>
                    <p className="text-white">{selectedAffiliate.cpf}</p>
                  </div>
                  <div>
                    <Label className="text-zinc-400">Telefone</Label>
                    <p className="text-white">{selectedAffiliate.phone}</p>
                  </div>
                  <div>
                    <Label className="text-zinc-400">Chave PIX</Label>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{selectedAffiliate.pix_key_type.toUpperCase()}</Badge>
                      <p className="text-white">{selectedAffiliate.pix_key}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-zinc-400">Cadastrado em</Label>
                    <p className="text-white">
                      {format(new Date(selectedAffiliate.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Links e Códigos */}
              <Card className="bg-black/50 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-lg">Links e Códigos</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="links">
                    <TabsList>
                      <TabsTrigger value="links">Links</TabsTrigger>
                      <TabsTrigger value="codes">Códigos</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="links" className="space-y-2">
                      {affiliateDetails.links?.map((link: AffiliateLink) => (
                        <div key={link.id} className="p-3 bg-zinc-800 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-white">{link.name}</p>
                              <p className="text-sm text-zinc-400">{link.url}</p>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <div className="text-center">
                                <p className="text-zinc-400">Cliques</p>
                                <p className="text-white font-semibold">{link.clicks}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-zinc-400">Registros</p>
                                <p className="text-white font-semibold">{link.registrations}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-zinc-400">Conversão</p>
                                <p className="text-white font-semibold">{link.conversion_rate.toFixed(1)}%</p>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(link.url, "Link")}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </TabsContent>
                    
                    <TabsContent value="codes" className="space-y-2">
                      {affiliateDetails.codes?.map((code: AffiliateCode) => (
                        <div key={code.id} className="p-3 bg-zinc-800 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Badge className="bg-[#00E880]/10 text-[#00E880]">
                                {code.code}
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(code.code, "Código")}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <div className="text-center">
                                <p className="text-zinc-400">Cliques</p>
                                <p className="text-white font-semibold">{code.clicks}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-zinc-400">Registros</p>
                                <p className="text-white font-semibold">{code.registrations}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-zinc-400">Depósitos</p>
                                <p className="text-white font-semibold">{code.deposits}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Reset de Senha */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle>Resetar Senha do Afiliado</DialogTitle>
            <DialogDescription>
              Defina uma nova senha para {selectedAffiliate?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Nova Senha</Label>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-black/50 border-zinc-700"
                />
                <Button
                  variant="outline"
                  onClick={() => setNewPassword(generateRandomPassword())}
                >
                  Gerar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(newPassword, "Senha")}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="p-3 bg-yellow-500/10 rounded-lg">
              <p className="text-sm text-yellow-400">
                ⚠️ Anote esta senha! Ela não poderá ser recuperada depois.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPasswordModal(false)}
            >
              Cancelar
            </Button>
            <Button
              className="bg-[#00E880] hover:bg-[#00E880]/90 text-black"
              onClick={() => {
                if (selectedAffiliate && newPassword) {
                  resetPasswordMutation.mutate({
                    affiliateId: selectedAffiliate.id,
                    newPassword
                  });
                }
              }}
            >
              Resetar Senha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Criar Afiliado */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle>Criar Novo Afiliado</DialogTitle>
            <DialogDescription>
              Preencha os dados para criar um novo afiliado
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome Completo</Label>
                <Input
                  value={newAffiliate.name}
                  onChange={(e) => setNewAffiliate({ ...newAffiliate, name: e.target.value })}
                  className="bg-black/50 border-zinc-700"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newAffiliate.email}
                  onChange={(e) => setNewAffiliate({ ...newAffiliate, email: e.target.value })}
                  className="bg-black/50 border-zinc-700"
                />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  value={newAffiliate.phone}
                  onChange={(e) => setNewAffiliate({ ...newAffiliate, phone: e.target.value })}
                  className="bg-black/50 border-zinc-700"
                />
              </div>
              <div>
                <Label>CPF</Label>
                <Input
                  value={newAffiliate.cpf}
                  onChange={(e) => setNewAffiliate({ ...newAffiliate, cpf: e.target.value })}
                  className="bg-black/50 border-zinc-700"
                />
              </div>
              <div>
                <Label>Senha</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={newAffiliate.password}
                    onChange={(e) => setNewAffiliate({ ...newAffiliate, password: e.target.value })}
                    className="bg-black/50 border-zinc-700"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setNewAffiliate({ ...newAffiliate, password: generateRandomPassword() })}
                  >
                    Gerar
                  </Button>
                </div>
              </div>
              <div>
                <Label>Taxa de Comissão (%)</Label>
                <Input
                  type="number"
                  value={newAffiliate.commission_rate}
                  onChange={(e) => setNewAffiliate({ ...newAffiliate, commission_rate: parseInt(e.target.value) })}
                  className="bg-black/50 border-zinc-700"
                />
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-4">
              <Label>Dados PIX</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Tipo de Chave</Label>
                  <Select
                    value={newAffiliate.pix_key_type}
                    onValueChange={(value) => setNewAffiliate({ ...newAffiliate, pix_key_type: value })}
                  >
                    <SelectTrigger className="bg-black/50 border-zinc-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cpf">CPF</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="phone">Telefone</SelectItem>
                      <SelectItem value="random">Aleatória</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Chave PIX</Label>
                  <Input
                    value={newAffiliate.pix_key}
                    onChange={(e) => setNewAffiliate({ ...newAffiliate, pix_key: e.target.value })}
                    className="bg-black/50 border-zinc-700"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(false)}
            >
              Cancelar
            </Button>
            <Button
              className="bg-[#00E880] hover:bg-[#00E880]/90 text-black"
              onClick={() => createAffiliateMutation.mutate(newAffiliate)}
            >
              Criar Afiliado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}