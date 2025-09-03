import { useState, useEffect } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  User,
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
  Network,
  Star,
  Award,
  Crown,
  Gem,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Plus,
  Save,
  Globe,
  MessageSquare
} from "lucide-react";
import CountUp from "react-countup";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  commissionType?: string;
  customCommissionRate?: string;
  customFixedAmount?: string;
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

interface AffiliateCommission {
  id: number;
  affiliateId: number;
  affiliateName: string;
  affiliateEmail: string;
  userId: number;
  userName: string;
  userEmail: string;
  depositId: number;
  depositAmount: number;
  commissionRate: number;
  commissionAmount: number;
  status: string;
  processedAt?: string;
  createdAt: string;
}

interface AffiliateStatistics {
  total: {
    totalAffiliates: number;
    totalCommissions: number;
    totalCommissionValue: number;
    pendingCommissions: number;
    approvedCommissions: number;
    paidCommissions: number;
    totalDeposits: number;
  };
  monthly: Array<{
    month: string;
    totalCommissions: number;
    totalValue: number;
    totalDeposits: number;
  }>;
}

const getLevelInfo = (level: string) => {
  switch (level?.toLowerCase()) {
    case 'diamante':
    case 'diamond':
      return { 
        icon: Gem, 
        color: 'text-cyan-400', 
        bg: 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20',
        borderColor: 'border-cyan-400/30',
        percentage: 70,
        nextLevel: null,
        gradient: 'from-cyan-400 to-blue-400'
      };
    case 'platina':
    case 'platinum':
      return { 
        icon: Crown, 
        color: 'text-purple-400', 
        bg: 'bg-gradient-to-r from-purple-500/20 to-pink-500/20',
        borderColor: 'border-purple-400/30',
        percentage: 60,
        nextLevel: 'Diamante',
        gradient: 'from-purple-400 to-pink-400'
      };
    case 'ouro':
    case 'gold':
      return { 
        icon: Trophy, 
        color: 'text-yellow-400', 
        bg: 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20',
        borderColor: 'border-yellow-400/30',
        percentage: 50,
        nextLevel: 'Platina',
        gradient: 'from-yellow-400 to-orange-400'
      };
    case 'prata':
    case 'silver':
      return { 
        icon: Award, 
        color: 'text-gray-300', 
        bg: 'bg-gradient-to-r from-gray-400/20 to-slate-400/20',
        borderColor: 'border-gray-400/30',
        percentage: 45,
        nextLevel: 'Ouro',
        gradient: 'from-gray-400 to-slate-400'
      };
    default:
      return { 
        icon: Shield, 
        color: 'text-orange-400', 
        bg: 'bg-gradient-to-r from-orange-500/20 to-red-500/20',
        borderColor: 'border-orange-400/30',
        percentage: 40,
        nextLevel: 'Prata',
        gradient: 'from-orange-400 to-red-400'
      };
  }
};

// Commission Configuration Modal Component
const CommissionConfigModal = ({ affiliate, onClose }: { affiliate: Affiliate; onClose: () => void }) => {
  const { toast } = useToast();
  const [commissionType, setCommissionType] = useState(affiliate.commissionType || 'percentage');
  const [customRate, setCustomRate] = useState(affiliate.customCommissionRate || '');
  const [customFixed, setCustomFixed] = useState(affiliate.customFixedAmount || '');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch tier configurations
  const { data: tierConfigData } = useQuery<any[]>({
    queryKey: ["/api/admin/affiliates/tier-config"],
  });

  const currentTierConfig = tierConfigData?.find((tier: any) => 
    tier.tier.toLowerCase() === affiliate.level?.toLowerCase()
  );

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const sessionId = localStorage.getItem("adminSessionId");
      const response = await fetch(`/api/admin/affiliates/${affiliate.id}/commission`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionId}`
        },
        body: JSON.stringify({
          commissionType,
          customCommissionRate: commissionType === 'percentage' ? customRate : null,
          customFixedAmount: commissionType === 'fixed' ? customFixed : null
        })
      });

      if (!response.ok) {
        throw new Error('Falha ao atualizar configuração');
      }

      toast({
        title: "✅ Configuração atualizada",
        description: `Comissão individual configurada para ${affiliate.name}`,
      });

      onClose();
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível atualizar a configuração",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveCustom = async () => {
    setIsLoading(true);
    try {
      const sessionId = localStorage.getItem("adminSessionId");
      const response = await fetch(`/api/admin/affiliates/${affiliate.id}/commission`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${sessionId}`
        }
      });

      if (!response.ok) {
        throw new Error('Falha ao remover configuração');
      }

      toast({
        title: "✅ Configuração removida",
        description: `${affiliate.name} voltará a usar as taxas do nível ${affiliate.level}`,
      });

      onClose();
    } catch (error) {
      toast({
        title: "Erro ao remover",
        description: "Não foi possível remover a configuração",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const hasCustomConfig = affiliate.customCommissionRate || affiliate.customFixedAmount;
  const effectiveRate = hasCustomConfig 
    ? (commissionType === 'percentage' ? customRate : customFixed)
    : (commissionType === 'percentage' 
        ? currentTierConfig?.percentageRate 
        : currentTierConfig?.fixedAmount);

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <div className="bg-zinc-800/50 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-400">Nível Atual</span>
          <Badge className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 border-0">
            {affiliate.level || 'Bronze'}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-400">Taxa do Nível</span>
          <span className="text-white font-medium">
            {currentTierConfig?.percentageRate || '40'}% / R$ {currentTierConfig?.fixedAmount || '10,00'}
          </span>
        </div>
        {hasCustomConfig && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Taxa Personalizada</span>
            <span className="text-[#00E880] font-medium">
              {affiliate.commissionType === 'percentage' 
                ? `${affiliate.customCommissionRate}%`
                : `R$ ${affiliate.customFixedAmount}`}
            </span>
          </div>
        )}
      </div>

      {/* Commission Type Selection */}
      <div className="space-y-3">
        <Label>Tipo de Comissão</Label>
        <RadioGroup value={commissionType} onValueChange={setCommissionType}>
          <div className="flex items-center space-x-2 p-3 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors">
            <RadioGroupItem value="percentage" id="percentage" />
            <Label htmlFor="percentage" className="flex-1 cursor-pointer">
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4 text-[#00E880]" />
                <span>Porcentagem do Depósito</span>
              </div>
            </Label>
          </div>
          <div className="flex items-center space-x-2 p-3 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors">
            <RadioGroupItem value="fixed" id="fixed" />
            <Label htmlFor="fixed" className="flex-1 cursor-pointer">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#00E880]" />
                <span>Valor Fixo por Depósito</span>
              </div>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Custom Value Input */}
      <div className="space-y-3">
        <Label>
          {commissionType === 'percentage' ? 'Taxa Personalizada (%)' : 'Valor Fixo (R$)'}
        </Label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              type="number"
              value={commissionType === 'percentage' ? customRate : customFixed}
              onChange={(e) => {
                if (commissionType === 'percentage') {
                  setCustomRate(e.target.value);
                } else {
                  setCustomFixed(e.target.value);
                }
              }}
              placeholder={commissionType === 'percentage' 
                ? `Padrão: ${currentTierConfig?.percentageRate || '40'}%`
                : `Padrão: R$ ${currentTierConfig?.fixedAmount || '10,00'}`}
              className="bg-black/50 border-zinc-700 pl-8"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
              {commissionType === 'percentage' ? '%' : 'R$'}
            </div>
          </div>
        </div>
        {(customRate || customFixed) && (
          <Alert className="bg-[#00E880]/10 border-[#00E880]/30">
            <AlertCircle className="h-4 w-4 text-[#00E880]" />
            <AlertDescription className="text-zinc-300">
              Esta configuração substituirá a taxa padrão do nível {affiliate.level}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3">
        {hasCustomConfig && (
          <Button
            variant="outline"
            onClick={handleRemoveCustom}
            disabled={isLoading}
            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Remover Personalização
          </Button>
        )}
        <div className="flex gap-3 ml-auto">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            className="bg-[#00E880] hover:bg-[#00E880]/90 text-black"
            onClick={handleSave}
            disabled={isLoading || (!customRate && commissionType === 'percentage') || (!customFixed && commissionType === 'fixed')}
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar Configuração
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Partners Management Component
const PartnersManagement = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch partners data
  const { data: partnersData, isLoading } = useQuery({
    queryKey: ["/api/admin/partners"],
    queryFn: async () => {
      const sessionId = localStorage.getItem("adminSessionId");
      const response = await fetch("/api/admin/partners", {
        headers: { Authorization: `Bearer ${sessionId}` }
      });
      if (!response.ok) throw new Error("Failed to fetch partners");
      return response.json();
    },
    refetchInterval: 30000,
  });

  const filteredPartners = partnersData?.partners?.filter((partner: any) => {
    const matchesSearch = !searchTerm || 
      partner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      partner.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      partner.cpf.includes(searchTerm);
    
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && partner.isActive) ||
      (statusFilter === "inactive" && !partner.isActive);
    
    return matchesSearch && matchesStatus;
  }) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 text-zinc-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      {partnersData?.summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900/60 rounded-lg border border-zinc-800 p-6"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <Network className="w-6 h-6 text-purple-400" />
              </div>
              <Badge className="bg-purple-500/10 text-purple-400 border-0">
                {partnersData.summary.activePartners}/{partnersData.summary.totalPartners}
              </Badge>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-white">
                <CountUp end={partnersData.summary.totalPartners} duration={2} />
              </p>
              <p className="text-sm text-zinc-400 mt-1">Total de Parceiros</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-zinc-900/60 rounded-lg border border-zinc-800 p-6"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-[#00E880]/10 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-[#00E880]" />
              </div>
              <TrendingUp className="w-4 h-4 text-green-400" />
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-white">
                R$ <CountUp end={partnersData.summary.totalEarnings || 0} decimals={2} duration={2} />
              </p>
              <p className="text-sm text-zinc-400 mt-1">Ganhos Totais</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-zinc-900/60 rounded-lg border border-zinc-800 p-6"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <MousePointer className="w-6 h-6 text-blue-400" />
              </div>
              <Activity className="w-4 h-4 text-blue-400" />
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-white">
                <CountUp end={partnersData.summary.totalClicks || 0} duration={2} separator="." />
              </p>
              <p className="text-sm text-zinc-400 mt-1">Cliques Totais</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-zinc-900/60 rounded-lg border border-zinc-800 p-6"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-orange-400" />
              </div>
              <Percent className="w-4 h-4 text-orange-400" />
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-white">
                <CountUp end={partnersData.summary.totalRegistrations || 0} duration={2} />
              </p>
              <p className="text-sm text-zinc-400 mt-1">Conversões</p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            placeholder="Buscar parceiro por nome, email ou CPF..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-zinc-900/50 border-zinc-800 focus:border-[#00E880]"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-zinc-900/50 border-zinc-800">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Partners Table */}
      <div className="bg-zinc-900/60 rounded-lg border border-zinc-800">
        <div className="p-6 border-b border-zinc-800">
          <h3 className="text-lg font-semibold text-white">Lista de Parceiros</h3>
          <p className="text-sm text-zinc-400 mt-1">Todos os parceiros cadastrados pelos afiliados</p>
        </div>
        <div className="p-6">
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800">
                  <TableHead>Parceiro</TableHead>
                  <TableHead>Afiliado</TableHead>
                  <TableHead>Comissão</TableHead>
                  <TableHead>Ganhos</TableHead>
                  <TableHead>Performance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPartners.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-zinc-400 py-8">
                      Nenhum parceiro encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPartners.map((partner: any) => (
                    <TableRow key={partner.id} className="border-zinc-800">
                      <TableCell>
                        <div>
                          <p className="font-medium text-white">{partner.name}</p>
                          <p className="text-xs text-zinc-400">{partner.email}</p>
                          <p className="text-xs text-zinc-500">CPF: {partner.cpf}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm text-white">{partner.affiliateName}</p>
                          <p className="text-xs text-zinc-400">{partner.affiliateEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-[#00E880]/10 text-[#00E880] border-0">
                          {partner.commissionDisplay}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-[#00E880]">
                            R$ {partner.metrics.totalEarnings.toFixed(2)}
                          </p>
                          {partner.metrics.pendingEarnings > 0 && (
                            <p className="text-xs text-yellow-400">
                              R$ {partner.metrics.pendingEarnings.toFixed(2)} pendente
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs">
                            <MousePointer className="w-3 h-3 text-zinc-400" />
                            <span className="text-zinc-300">{partner.metrics.totalClicks} cliques</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <UserCheck className="w-3 h-3 text-zinc-400" />
                            <span className="text-zinc-300">{partner.metrics.totalRegistrations} registros</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <Percent className="w-3 h-3 text-zinc-400" />
                            <span className="text-zinc-300">{partner.metrics.conversionRate}% conversão</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={partner.isActive ? "bg-green-500/10 text-green-400 border-0" : "bg-red-500/10 text-red-400 border-0"}>
                          {partner.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export default function AffiliatesManagementPremium() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [copiedText, setCopiedText] = useState("");

  const [newAffiliate, setNewAffiliate] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    commission_rate: 40
  });

  // Fetch affiliates data
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

  // Fetch commissions
  const { data: commissionsData, isLoading: isLoadingCommissions } = useQuery({
    queryKey: ["/api/admin/affiliates/commissions"],
    queryFn: async () => {
      const sessionId = localStorage.getItem("adminSessionId");
      const response = await fetch("/api/admin/affiliates/commissions", {
        headers: { Authorization: `Bearer ${sessionId}` }
      });
      if (!response.ok) throw new Error("Failed to fetch commissions");
      return response.json();
    },
  });

  // Fetch statistics
  const { data: statisticsData } = useQuery({
    queryKey: ["/api/admin/affiliates/statistics"],
    queryFn: async () => {
      const sessionId = localStorage.getItem("adminSessionId");
      const response = await fetch("/api/admin/affiliates/statistics", {
        headers: { Authorization: `Bearer ${sessionId}` }
      });
      if (!response.ok) throw new Error("Failed to fetch statistics");
      return response.json();
    },
  });

  // Fetch affiliate details
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

  // Create affiliate mutation
  const createAffiliateMutation = useMutation({
    mutationFn: async (data: typeof newAffiliate) => {
      const sessionId = localStorage.getItem("adminSessionId");
      return await apiRequest("/api/admin/affiliates/create", "POST", data);
    },
    onSuccess: (data) => {
      toast({
        title: "✅ Afiliado criado com sucesso",
        description: (
          <div className="space-y-2">
            <p>Email: {data.email}</p>
            <p>Senha: {data.password}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(data.password, "Senha")}
            >
              <Copy className="w-3 h-3 mr-1" />
              Copiar senha
            </Button>
          </div>
        ),
      });
      setShowCreateModal(false);
      setNewAffiliate({
        name: "",
        email: "",
        phone: "",
        password: "",
        commission_rate: 40
      });
      refetch();
    },
    onError: () => {
      toast({
        title: "Erro ao criar afiliado",
        description: "Verifique os dados e tente novamente",
        variant: "destructive",
      });
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (data: { affiliateId: number; newPassword: string }) => {
      const sessionId = localStorage.getItem("adminSessionId");
      return await apiRequest(`/api/admin/affiliates/${data.affiliateId}/reset-password`, "POST", {
        password: data.newPassword
      });
    },
    onSuccess: () => {
      toast({
        title: "✅ Senha atualizada",
        description: "Nova senha definida com sucesso",
      });
      setShowPasswordModal(false);
      setNewPassword("");
    },
    onError: () => {
      toast({
        title: "Erro ao resetar senha",
        variant: "destructive",
      });
    },
  });

  // Update affiliate mutation
  const updateAffiliateMutation = useMutation({
    mutationFn: async (data: { id: number; updates: any }) => {
      const sessionId = localStorage.getItem("adminSessionId");
      return await apiRequest(`/api/admin/affiliates/${data.id}`, "PATCH", data.updates);
    },
    onSuccess: () => {
      toast({
        title: "✅ Afiliado atualizado",
      });
      refetch();
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar",
        variant: "destructive",
      });
    },
  });

  // Process withdrawal mutation
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
        title: "✅ Saque processado",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/affiliate-withdrawals"] });
    },
    onError: () => {
      toast({
        title: "Erro ao processar saque",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    toast({
      title: "📋 Copiado!",
      description: `${label} copiado para a área de transferência`,
    });
    setTimeout(() => setCopiedText(""), 2000);
  };

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const formatPhone = (value: string) => {
    // Remove tudo que não é dígito
    const numbers = value.replace(/\D/g, '');
    
    // Limita a 11 dígitos
    const limited = numbers.substring(0, 11);
    
    // Aplica a formatação
    if (limited.length <= 2) {
      return limited;
    } else if (limited.length <= 7) {
      return `(${limited.substring(0, 2)}) ${limited.substring(2)}`;
    } else if (limited.length <= 10) {
      return `(${limited.substring(0, 2)}) ${limited.substring(2, 6)}-${limited.substring(6)}`;
    } else {
      return `(${limited.substring(0, 2)}) ${limited.substring(2, 7)}-${limited.substring(7)}`;
    }
  };

  // Commissions are approved automatically when payment is confirmed - no manual approval needed

  const filteredAffiliates = affiliatesData?.affiliates?.filter((affiliate: Affiliate) => {
    const matchesSearch = affiliate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          affiliate.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && affiliate.is_active) ||
                         (statusFilter === "inactive" && !affiliate.is_active);
    
    return matchesSearch && matchesStatus;
  }) || [];

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
      {/* Header Section */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-[#00E880]/10 rounded-lg">
          <Zap className="w-6 h-6 text-[#00E880]" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Sistema de Afiliados</h2>
          <p className="text-sm text-zinc-400">Gerencie afiliados, comissões e parceiros da plataforma</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Afiliados Ativos */}
        <div className="bg-zinc-900/60 rounded-lg p-5 border border-zinc-800">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-zinc-400 text-sm mb-2">Afiliados Ativos</p>
              <p className="text-3xl font-bold text-white">
                <CountUp end={stats.activeAffiliates} duration={2} />
              </p>
              <p className="text-xs text-zinc-500 mt-2">De {stats.totalAffiliates} total</p>
            </div>
            <div className="p-2 bg-[#00E880]/10 rounded-lg">
              <CheckCircle className="w-6 h-6 text-[#00E880]" />
            </div>
          </div>
        </div>

        {/* Total de Registros */}
        <div className="bg-zinc-900/60 rounded-lg p-5 border border-zinc-800">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-zinc-400 text-sm mb-2">Total de Registros</p>
              <p className="text-3xl font-bold text-white">
                <CountUp end={stats.totalRegistrations} duration={2} separator="." />
              </p>
              <p className="text-xs text-zinc-500 mt-2">Usuários cadastrados</p>
            </div>
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Activity className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Valor Gerado */}
        <div className="bg-zinc-900/60 rounded-lg p-5 border border-zinc-800">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-zinc-400 text-sm mb-2">Valor Gerado</p>
              <p className="text-3xl font-bold text-white">
                R$ <CountUp end={stats.totalEarnings} duration={2} separator="." decimals={2} decimal="," />
              </p>
              <p className="text-xs text-zinc-500 mt-2">Em comissões</p>
            </div>
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        {/* Taxa de Conversão */}
        <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-lg p-5 border border-orange-500/30">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-orange-200 text-sm mb-2">Taxa de Conversão</p>
              <p className="text-3xl font-bold text-white">
                <CountUp end={stats.conversionRate} duration={2} decimals={1} decimal="," />%
              </p>
              <p className="text-xs text-orange-300 mt-2">Média de depósitos</p>
            </div>
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList className="bg-zinc-900/50 border border-zinc-800 p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white">
              <Users className="w-4 h-4 mr-2" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="partners" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white">
              <Network className="w-4 h-4 mr-2" />
              Parceiros
            </TabsTrigger>
            <TabsTrigger value="commissions" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white">
              <DollarSign className="w-4 h-4 mr-2" />
              Comissões
            </TabsTrigger>
            <TabsTrigger value="performance" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white">
              <BarChart3 className="w-4 h-4 mr-2" />
              Performance
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => refetch()}
              variant="outline"
              size="sm"
              className="bg-transparent border-zinc-700 hover:bg-zinc-800"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-[#00E880] hover:bg-[#00E880]/90 text-black font-medium"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Novo Afiliado
            </Button>
          </div>
        </div>

        {/* Tab: Overview */}
        <TabsContent value="overview" className="space-y-4">
          {/* Search and Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input
                placeholder="Buscar por nome, email ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-zinc-900/50 border-zinc-800 focus:border-[#00E880]"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] bg-zinc-900/50 border-zinc-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Affiliates Table */}
          <div className="bg-zinc-900/60 rounded-lg border border-zinc-800">
            <div className="p-6 border-b border-zinc-800">
              <h3 className="text-lg font-semibold text-white">Lista de Afiliados</h3>
              <p className="text-sm text-zinc-400 mt-1">Todos os afiliados cadastrados na plataforma</p>
            </div>
            <div className="p-6">
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800">
                      <TableHead>Afiliado</TableHead>
                      <TableHead>Nível</TableHead>
                      <TableHead>Comissão</TableHead>
                      <TableHead>Ganhos</TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-zinc-400" />
                        </TableCell>
                      </TableRow>
                    ) : filteredAffiliates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10 text-zinc-400">
                          Nenhum afiliado encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAffiliates.map((affiliate: Affiliate) => {
                        const levelInfo = getLevelInfo(affiliate.level);
                        const LevelIcon = levelInfo.icon;
                        
                        return (
                          <TableRow key={affiliate.id} className="border-zinc-800 hover:bg-zinc-800/30">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <motion.div 
                                  className="relative"
                                  whileHover={{ scale: 1.1 }}
                                >
                                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${levelInfo.gradient} p-[2px]`}>
                                    <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center">
                                      <span className="text-white font-bold text-lg">
                                        {affiliate.name.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                  </div>
                                  {affiliate.is_active && (
                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-zinc-900" />
                                  )}
                                </motion.div>
                                <div>
                                  <p className="font-semibold text-white">{affiliate.name}</p>
                                  <p className="text-sm text-zinc-400">{affiliate.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={`${levelInfo.bg} ${levelInfo.color} border ${levelInfo.borderColor}`}>
                                <LevelIcon className="w-3 h-3 mr-1" />
                                {affiliate.level} ({levelInfo.percentage}%)
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="border-[#00E880]/30 text-[#00E880]">
                                  {affiliate.commission_rate}%
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-zinc-400">Total:</span>
                                  <span className="font-semibold text-white">
                                    R$ {affiliate.total_earnings.toFixed(2)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 text-xs">
                                  <span className="text-green-400">
                                    ✓ R$ {affiliate.paid_earnings.toFixed(2)}
                                  </span>
                                  {affiliate.pending_earnings > 0 && (
                                    <span className="text-yellow-400">
                                      ⏳ R$ {affiliate.pending_earnings.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm">
                                  <MousePointer className="w-3 h-3 text-zinc-500" />
                                  <span className="text-zinc-300">{affiliate.total_clicks}</span>
                                  <span className="text-zinc-500">cliques</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <UserPlus className="w-3 h-3 text-zinc-500" />
                                  <span className="text-zinc-300">{affiliate.total_registrations}</span>
                                  <span className="text-zinc-500">registros</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <DollarSign className="w-3 h-3 text-zinc-500" />
                                  <span className="text-zinc-300">{affiliate.total_deposits}</span>
                                  <span className="text-zinc-500">depósitos</span>
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
                                className="data-[state=checked]:bg-[#00E880]"
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-zinc-800"
                                  onClick={() => {
                                    setSelectedAffiliate(affiliate);
                                    setShowDetailsModal(true);
                                  }}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-zinc-800"
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
                                  size="icon"
                                  className="h-8 w-8 hover:bg-zinc-800"
                                  onClick={() => {
                                    copyToClipboard(affiliate.email, "Email");
                                  }}
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-zinc-800"
                                  onClick={() => {
                                    setSelectedAffiliate(affiliate);
                                    setShowCommissionModal(true);
                                  }}
                                >
                                  <Settings className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </div>
        </TabsContent>

        {/* Tab: Partners */}
        <TabsContent value="partners" className="space-y-4">
          <PartnersManagement />
        </TabsContent>

        {/* Tab: Commissions */}
        <TabsContent value="commissions" className="space-y-4">
          {/* Statistics Cards */}
          {statisticsData && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-zinc-900/60 rounded-lg border border-zinc-800 p-6"
              >
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 bg-[#00E880]/10 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-[#00E880]" />
                  </div>
                  <TrendingUp className="w-4 h-4 text-green-400" />
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-bold text-white">
                    R$ <CountUp end={statisticsData.total.totalCommissionValue || 0} decimals={2} duration={2} />
                  </p>
                  <p className="text-sm text-zinc-400 mt-1">Total em Comissões</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-zinc-900/60 rounded-lg border border-zinc-800 p-6"
              >
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6 text-yellow-400" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-yellow-400" />
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-bold text-white">
                    R$ <CountUp end={statisticsData.total.pendingCommissions || 0} decimals={2} duration={2} />
                  </p>
                  <p className="text-sm text-zinc-400 mt-1">Comissões Pendentes</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-zinc-900/60 rounded-lg border border-zinc-800 p-6"
              >
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  </div>
                  <ArrowUp className="w-4 h-4 text-green-400" />
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-bold text-white">
                    R$ <CountUp end={statisticsData.total.paidCommissions || 0} decimals={2} duration={2} />
                  </p>
                  <p className="text-sm text-zinc-400 mt-1">Comissões Pagas</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-zinc-900/60 rounded-lg border border-zinc-800 p-6"
              >
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-blue-400" />
                  </div>
                  <Activity className="w-4 h-4 text-blue-400" />
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-bold text-white">
                    R$ <CountUp end={statisticsData.total.totalDeposits || 0} decimals={2} duration={2} />
                  </p>
                  <p className="text-sm text-zinc-400 mt-1">Total em Depósitos</p>
                </div>
              </motion.div>
            </div>
          )}

          {/* Commissions Table */}
          <div className="bg-zinc-900/60 rounded-lg border border-zinc-800">
            <div className="p-6 border-b border-zinc-800">
              <h3 className="text-lg font-semibold text-white">Comissões Confirmadas</h3>
              <p className="text-sm text-zinc-400 mt-1">
                Exibindo apenas comissões de depósitos pagos e confirmados
              </p>
            </div>
            <div className="p-6">
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800">
                      <TableHead>ID</TableHead>
                      <TableHead>Afiliado</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Depósito</TableHead>
                      <TableHead>Taxa</TableHead>
                      <TableHead>Comissão</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Processado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingCommissions ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-10">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-zinc-400" />
                        </TableCell>
                      </TableRow>
                    ) : !commissionsData || commissionsData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-10 text-zinc-400">
                          Nenhuma comissão encontrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      commissionsData.map((commission: AffiliateCommission) => (
                        <TableRow key={commission.id} className="border-zinc-800 hover:bg-zinc-800/30">
                          <TableCell>
                            <Badge variant="outline">#{commission.id}</Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-white">{commission.affiliateName}</p>
                              <p className="text-xs text-zinc-400">{commission.affiliateEmail}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-white">{commission.userName}</p>
                              <p className="text-xs text-zinc-400">{commission.userEmail}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-bold text-[#00E880]">
                                R$ {(parseFloat(String(commission.depositAmount || "0")) || 0).toFixed(2)}
                              </p>
                              <Badge variant="outline" className="text-xs">
                                #{commission.depositId}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-purple-500/10 text-purple-400">
                              {parseFloat(String(commission.commissionRate || "0")) || 0}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <p className="font-bold text-yellow-400">
                              R$ {(parseFloat(String(commission.commissionAmount || "0")) || 0).toFixed(2)}
                            </p>
                          </TableCell>
                          <TableCell>
                            {commission.status === 'pending' && (
                              <Badge className="bg-yellow-500/10 text-yellow-400">
                                <Clock className="w-3 h-3 mr-1" />
                                Aguardando Pagamento
                              </Badge>
                            )}
                            {commission.status === 'completed' && (
                              <Badge className="bg-green-500/10 text-green-400">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Confirmado
                              </Badge>
                            )}
                            {commission.status === 'cancelled' && (
                              <Badge className="bg-red-500/10 text-red-400">
                                <XCircle className="w-3 h-3 mr-1" />
                                Cancelado
                              </Badge>
                            )}
                            {commission.status === 'approved' && (
                              <Badge className="bg-green-500/10 text-green-400">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Confirmado
                              </Badge>
                            )}
                            {commission.status === 'paid' && (
                              <Badge className="bg-blue-500/10 text-blue-400">
                                <CreditCard className="w-3 h-3 mr-1" />
                                Pago ao Afiliado
                              </Badge>
                            )}
                            {commission.status === 'rejected' && (
                              <Badge className="bg-red-500/10 text-red-400">
                                <XCircle className="w-3 h-3 mr-1" />
                                Cancelado
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <p className="text-sm text-zinc-300">
                              {format(new Date(commission.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                            <p className="text-xs text-zinc-400">
                              {format(new Date(commission.createdAt), "HH:mm", { locale: ptBR })}
                            </p>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-zinc-400">
                              {commission.processedAt ? (
                                <div>
                                  <p className="text-xs">Processado em:</p>
                                  <p className="text-white">
                                    {format(new Date(commission.processedAt), "dd/MM/yyyy", { locale: ptBR })}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-zinc-500">-</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </div>
        </TabsContent>

        {/* Tab: Performance */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top Performers */}
            <div className="bg-zinc-900/60 rounded-lg border border-zinc-800">
              <div className="p-6 border-b border-zinc-800">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  Top Performers
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {affiliatesData?.affiliates
                    ?.sort((a: Affiliate, b: Affiliate) => b.total_earnings - a.total_earnings)
                    .slice(0, 5)
                    .map((affiliate: Affiliate, index: number) => {
                      const levelInfo = getLevelInfo(affiliate.level);
                      return (
                        <motion.div
                          key={affiliate.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-center justify-between p-3 rounded-lg bg-black/30 hover:bg-black/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                              index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                              index === 1 ? 'bg-gray-400/20 text-gray-300' :
                              index === 2 ? 'bg-orange-500/20 text-orange-400' :
                              'bg-zinc-800 text-zinc-400'
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium text-white">{affiliate.name}</p>
                              <Badge className={`${levelInfo.bg} ${levelInfo.color} border-0 text-xs`}>
                                {affiliate.level}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-[#00E880]">
                              R$ {affiliate.total_earnings.toFixed(2)}
                            </p>
                            <p className="text-xs text-zinc-400">
                              {affiliate.total_deposits} conversões
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-zinc-900/60 rounded-lg border border-zinc-800">
              <div className="p-6 border-b border-zinc-800">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                  <Activity className="w-5 h-5 text-blue-400" />
                  Atividade Recente
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {affiliatesData?.affiliates
                    ?.sort((a: Affiliate, b: Affiliate) => new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime())
                    .slice(0, 5)
                    .map((affiliate: Affiliate, index: number) => (
                      <motion.div
                        key={affiliate.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center justify-between p-3 rounded-lg bg-black/30 hover:bg-black/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                          <div>
                            <p className="font-medium text-white">{affiliate.name}</p>
                            <p className="text-xs text-zinc-400">
                              {format(new Date(affiliate.last_activity), "dd/MM HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <MousePointer className="w-3 h-3 text-zinc-400" />
                          <span className="text-zinc-300">{affiliate.total_clicks}</span>
                        </div>
                      </motion.div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

      </Tabs>

      {/* Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-4xl bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-xl">Detalhes do Afiliado</DialogTitle>
            <DialogDescription>
              Informações completas e estatísticas
            </DialogDescription>
          </DialogHeader>
          
          {selectedAffiliate && (
            <div className="space-y-4">
              {/* Personal Info */}
              <div className="bg-zinc-900/60 rounded-lg border border-zinc-800">
                <div className="p-6 border-b border-zinc-800">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Informações Pessoais
                  </h3>
                </div>
                <div className="p-6 grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-zinc-400">Nome</Label>
                    <p className="text-white font-medium">{selectedAffiliate.name}</p>
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
                    <Label className="text-zinc-400">Telefone</Label>
                    <p className="text-white">{formatPhone(selectedAffiliate.phone || '')}</p>
                  </div>
                  <div>
                    <Label className="text-zinc-400">Membro desde</Label>
                    <p className="text-white">
                      {format(new Date(selectedAffiliate.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Links and Codes */}
              {affiliateDetails && (
                <div className="bg-zinc-900/60 rounded-lg border border-zinc-800">
                  <div className="p-6 border-b border-zinc-800">
                    <h3 className="text-lg font-semibold text-white">Links e Códigos</h3>
                  </div>
                  <div className="p-6">
                    <Tabs defaultValue="links">
                      <TabsList>
                        <TabsTrigger value="links">Links</TabsTrigger>
                        <TabsTrigger value="codes">Códigos</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="links" className="space-y-2">
                        {affiliateDetails.links?.length === 0 ? (
                          <p className="text-zinc-400 text-center py-4">Nenhum link criado</p>
                        ) : (
                          affiliateDetails.links?.map((link: any) => (
                            <div key={link.id} className="p-3 bg-zinc-800/50 rounded-lg">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <p className="font-medium text-white">{link.name}</p>
                                  <p className="text-sm text-zinc-400 font-mono">{link.url}</p>
                                </div>
                                <div className="flex items-center gap-4 text-sm">
                                  <div className="text-center">
                                    <p className="text-zinc-500">Cliques</p>
                                    <p className="text-white font-bold">{link.clicks}</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-zinc-500">Registros</p>
                                    <p className="text-white font-bold">{link.registrations}</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-zinc-500">Taxa</p>
                                    <p className="text-white font-bold">{link.conversion_rate}%</p>
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
                          ))
                        )}
                      </TabsContent>
                      
                      <TabsContent value="codes" className="space-y-2">
                        {affiliateDetails.codes?.length === 0 ? (
                          <p className="text-zinc-400 text-center py-4">Nenhum código criado</p>
                        ) : (
                          affiliateDetails.codes?.map((code: any) => (
                            <div key={code.id} className="p-3 bg-zinc-800/50 rounded-lg">
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
                                    <p className="text-zinc-500">Cliques</p>
                                    <p className="text-white font-bold">{code.clicks}</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-zinc-500">Registros</p>
                                    <p className="text-white font-bold">{code.registrations}</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-zinc-500">Depósitos</p>
                                    <p className="text-white font-bold">{code.deposits}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Password Reset Modal */}
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
                  <RefreshCw className="w-4 h-4 mr-1" />
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
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Anote esta senha! Ela não poderá ser recuperada depois.
              </AlertDescription>
            </Alert>
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

      {/* Create Affiliate Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl">
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
                  placeholder="João Silva"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newAffiliate.email}
                  onChange={(e) => setNewAffiliate({ ...newAffiliate, email: e.target.value })}
                  className="bg-black/50 border-zinc-700"
                  placeholder="joao@email.com"
                />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  value={newAffiliate.phone}
                  onChange={(e) => setNewAffiliate({ ...newAffiliate, phone: formatPhone(e.target.value) })}
                  className="bg-black/50 border-zinc-700"
                  placeholder="(11) 99999-9999"
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
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(false)}
            >
              Cancelar
            </Button>
            <Button
              className="bg-gradient-to-r from-[#00E880] to-emerald-400 hover:from-[#00E880]/90 hover:to-emerald-400/90 text-black"
              onClick={() => createAffiliateMutation.mutate(newAffiliate)}
              disabled={!newAffiliate.name || !newAffiliate.email || !newAffiliate.password}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Criar Afiliado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Commission Configuration Modal */}
      <Dialog open={showCommissionModal} onOpenChange={setShowCommissionModal}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configuração de Comissão</DialogTitle>
            <DialogDescription>
              Configure a comissão individual para {selectedAffiliate?.name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedAffiliate && (
            <CommissionConfigModal 
              affiliate={selectedAffiliate}
              onClose={() => {
                setShowCommissionModal(false);
                refetch();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}