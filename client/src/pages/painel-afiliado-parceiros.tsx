import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  UserPlus,
  Copy,
  Check,
  TrendingUp,
  DollarSign,
  Eye,
  Ban,
  Settings,
  Search,
  Filter,
  Download,
  AlertCircle,
  ChevronRight,
  Mail,
  Smartphone,
  Key,
  User,
  Info,
  ExternalLink,
  Phone,
  Trash2,
  Edit2,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { AffiliateLayout } from "@/components/affiliate/affiliate-layout";
import { 
  calculatePartnerCommissionLimits, 
  validatePartnerCommission,
  type AffiliateCommission 
} from "@/utils/commission-limits";

// Helper function to format phone number
function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

export function PainelAfiliadoParceiros() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<any>(null);
  const [editingPartner, setEditingPartner] = useState<any>(null);
  const [editPartnerForm, setEditPartnerForm] = useState<any>(null);
  const [showCredentials, setShowCredentials] = useState<any>(null);
  const [commissionLimits, setCommissionLimits] = useState<any>(null);
  const [commissionError, setCommissionError] = useState<string>("");
  const [editCommissionLimits, setEditCommissionLimits] = useState<any>(null);
  const [editCommissionError, setEditCommissionError] = useState<string>("");
  const [showResetPassword, setShowResetPassword] = useState<any>(null);
  const [editTab, setEditTab] = useState<"account" | "commission">("account");
  const [showDeleteDialog, setShowDeleteDialog] = useState<any>(null);
  const [newPartnerForm, setNewPartnerForm] = useState({
    name: "",
    email: "",
    phone: "",
    commissionRate: "",
    commissionType: "percentage"
  });

  // Get affiliate data to show the invite code and commission info
  const { data: affiliateData } = useQuery({
    queryKey: ['/api/affiliate/info']
  });

  // Get partners list
  const { data: partnersData, isLoading } = useQuery({
    queryKey: ['/api/affiliate/partners']
  });

  // Get partner stats
  const { data: statsData } = useQuery({
    queryKey: ['/api/affiliate/partners/stats']
  });

  const stats = (statsData as any) || {
    totalPartners: 0,
    activePartners: 0,
    totalEarnings: "0.00",
    monthlyEarnings: "0.00",
    totalClicks: 0,
    totalConversions: 0
  };

  const partners = (partnersData as any[]) || [];
  const filteredPartners = partners.filter((partner: any) =>
    partner.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    partner.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate commission limits when affiliate data or commission type changes
  useEffect(() => {
    if (affiliateData) {
      const data = affiliateData as any;
      
      
      // Properly extract commission data from backend response
      let commissionType = data.commission_type || 'fixed';
      let commissionValue = 0;
      
      if (commissionType === 'fixed') {
        // For fixed commission, use fixed_commission_amount or currentLevelRate
        commissionValue = parseFloat(data.fixed_commission_amount || data.currentLevelRate || '7');
      } else {
        // For percentage commission, use commission_rate
        commissionValue = parseFloat(data.commission_rate || '0');
      }
      
      const affiliateCommission: AffiliateCommission = {
        type: commissionType as 'fixed' | 'percentage',
        value: commissionValue
      };
      
      
      const limits = calculatePartnerCommissionLimits(
        affiliateCommission,
        newPartnerForm.commissionType as 'percentage' | 'fixed'
      );
      
      
      setCommissionLimits(limits);
    }
  }, [affiliateData, newPartnerForm.commissionType]);

  // Calculate commission limits when editing partner
  useEffect(() => {
    if (affiliateData && editPartnerForm) {
      const data = affiliateData as any;
      
      // Properly extract commission data from backend response
      let commissionType = data.commission_type || 'fixed';
      let commissionValue = 0;
      
      if (commissionType === 'fixed') {
        commissionValue = parseFloat(data.fixed_commission_amount || data.currentLevelRate || '7');
      } else {
        commissionValue = parseFloat(data.commission_rate || '0');
      }
      
      const affiliateCommission: AffiliateCommission = {
        type: commissionType as 'fixed' | 'percentage',
        value: commissionValue
      };
      
      const limits = calculatePartnerCommissionLimits(
        affiliateCommission,
        editPartnerForm.commissionType as 'percentage' | 'fixed'
      );
      
      setEditCommissionLimits(limits);
    }
  }, [affiliateData, editPartnerForm?.commissionType]);

  // Validate edit partner commission value
  useEffect(() => {
    if (affiliateData && editPartnerForm?.commissionRate) {
      const data = affiliateData as any;
      
      let commissionType = data.commission_type || 'fixed';
      let commissionValue = 0;
      
      if (commissionType === 'fixed') {
        commissionValue = parseFloat(data.fixed_commission_amount || data.currentLevelRate || '7');
      } else {
        commissionValue = parseFloat(data.commission_rate || '0');
      }
      
      const affiliateCommission: AffiliateCommission = {
        type: commissionType as 'fixed' | 'percentage',
        value: commissionValue
      };
      
      const validation = validatePartnerCommission(
        affiliateCommission,
        editPartnerForm.commissionType as 'percentage' | 'fixed',
        parseFloat(editPartnerForm.commissionRate)
      );
      
      setEditCommissionError(validation.error || "");
    } else {
      setEditCommissionError("");
    }
  }, [affiliateData, editPartnerForm?.commissionType, editPartnerForm?.commissionRate]);

  // Validate commission value on change
  useEffect(() => {
    if (affiliateData && newPartnerForm.commissionRate) {
      const data = affiliateData as any;
      
      // Properly extract commission data from backend response (same logic as above)
      let commissionType = data.commission_type || 'fixed';
      let commissionValue = 0;
      
      if (commissionType === 'fixed') {
        // For fixed commission, use fixed_commission_amount or currentLevelRate
        commissionValue = parseFloat(data.fixed_commission_amount || data.currentLevelRate || '7');
      } else {
        // For percentage commission, use commission_rate
        commissionValue = parseFloat(data.commission_rate || '0');
      }
      
      const affiliateCommission: AffiliateCommission = {
        type: commissionType as 'fixed' | 'percentage',
        value: commissionValue
      };
      
      const validation = validatePartnerCommission(
        affiliateCommission,
        newPartnerForm.commissionType as 'percentage' | 'fixed',
        parseFloat(newPartnerForm.commissionRate)
      );
      
      setCommissionError(validation.error || "");
    } else {
      setCommissionError("");
    }
  }, [affiliateData, newPartnerForm.commissionType, newPartnerForm.commissionRate]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast({
      title: "Código copiado!",
      description: `Código ${code} copiado para a área de transferência.`
    });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleEditPartner = (partner: any) => {
    setEditingPartner(partner);
    setEditPartnerForm({
      name: partner.name,
      email: partner.email,
      phone: partner.phone || "",
      commissionType: partner.commissionType,
      commissionRate: partner.commissionType === 'percentage' 
        ? partner.commissionRate 
        : partner.fixedCommissionAmount
    });
    setEditCommissionError("");
  };

  const createPartner = useMutation({
    mutationFn: async (data: typeof newPartnerForm) => {
      return apiRequest('/api/affiliate/partners/create', 'POST', data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/partners'] });
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/partners/stats'] });
      setShowCreateDialog(false);
      setShowCredentials({
        name: (data as any).partner.name,
        email: (data as any).partner.email,
        password: (data as any).password,
        code: (data as any).partner.code
      });
      setNewPartnerForm({
        name: "",
        email: "",
        phone: "",
        commissionRate: "10",
        commissionType: "percentage"
      });
      toast({
        title: "Parceiro criado com sucesso!",
        description: "As credenciais foram geradas. Certifique-se de salvá-las."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar parceiro",
        description: error.message || "Erro ao criar parceiro",
        variant: "destructive"
      });
    }
  });

  const handleCopyCredentials = () => {
    if (!showCredentials) return;
    const text = `
Credenciais do Parceiro
-----------------------
Nome: ${showCredentials.name}
Email: ${showCredentials.email}
Senha: ${showCredentials.password}
Código: ${showCredentials.code}
Link de acesso: https://mania-brasil.com/parceiros
    `.trim();
    navigator.clipboard.writeText(text);
    toast({
      title: "Credenciais copiadas!",
      description: "As credenciais foram copiadas para a área de transferência."
    });
  };

  const togglePartnerStatus = useMutation({
    mutationFn: async ({ partnerId, isActive }: { partnerId: number; isActive: boolean }) => {
      return apiRequest(`/api/affiliate/partners/${partnerId}/toggle`, 'POST', 
        { isActive: !isActive }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/partners'] });
      toast({
        title: "Status atualizado",
        description: "O status do parceiro foi atualizado com sucesso."
      });
    }
  });

  const updatePartnerCommission = useMutation({
    mutationFn: async ({ partnerId, data }: { partnerId: number; data: any }) => {
      return apiRequest(`/api/affiliate/partners/${partnerId}/commission`, 'PUT', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/partners'] });
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/partners/stats'] });
      setEditingPartner(null);
      setEditPartnerForm(null);
      toast({
        title: "Comissão atualizada",
        description: "A comissão do parceiro foi atualizada com sucesso."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar comissão",
        description: error.message || "Erro ao atualizar comissão do parceiro",
        variant: "destructive"
      });
    }
  });

  const resetPartnerPassword = useMutation({
    mutationFn: async (partnerId: number) => {
      return apiRequest(`/api/affiliate/partners/${partnerId}/reset-password`, 'POST');
    },
    onSuccess: (data: any) => {
      setShowResetPassword({
        partnerId: data.partnerId,
        name: data.name,
        email: data.email,
        newPassword: data.newPassword
      });
      toast({
        title: "Senha redefinida",
        description: "Uma nova senha foi gerada para o parceiro."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao redefinir senha",
        description: error.message || "Erro ao redefinir senha do parceiro",
        variant: "destructive"
      });
    }
  });

  // Delete partner mutation
  const deletePartnerMutation = useMutation({
    mutationFn: async (partnerId: number) => {
      return apiRequest(`/api/affiliate/partners/${partnerId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/partners'] });
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/partners/stats'] });
      setShowDeleteDialog(null);
      toast({
        title: "Parceiro excluído!",
        description: "O parceiro foi excluído com sucesso.",
      });
    },
    onError: (error: any) => {
      const errorData = error.response?.data || error;
      if (errorData.hasCommissions) {
        toast({
          title: "Não é possível excluir",
          description: "Este parceiro possui comissões registradas e não pode ser excluído.",
          variant: "destructive"
        });
      } else if (errorData.hasWithdrawals) {
        toast({
          title: "Não é possível excluir",
          description: "Este parceiro possui histórico de saques e não pode ser excluído.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Erro ao excluir parceiro",
          description: error.message || "Erro ao excluir o parceiro",
          variant: "destructive"
        });
      }
    }
  });

  return (
    <AffiliateLayout activeSection="parceiros">
      <div className="space-y-3 md:space-y-6">
        {/* Compact Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-gray-900/95 to-gray-950/95 backdrop-blur-xl rounded-xl md:rounded-2xl p-4 md:p-6 mb-3 md:mb-4 border border-gray-800"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 md:p-3 bg-gray-800/30 rounded-xl">
                <Users className="w-5 h-5 md:w-6 md:h-6 text-gray-400" />
              </div>
              <div>
                <h1 className="text-base md:text-xl font-bold text-white">Gerenciar Parceiros</h1>
                <p className="text-xs md:text-sm text-gray-400">Convide e gerencie seus parceiros subafiliados</p>
              </div>
            </div>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Criar Parceiro
            </Button>
          </div>
        </motion.div>

        {/* Partner Login Link */}
        <div className="bg-gray-900/95 backdrop-blur-xl rounded-xl p-3 md:p-4 border border-gray-800">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-purple-500/10 rounded-lg p-2">
                <ExternalLink className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-xs md:text-sm text-gray-400">Link do Painel do Parceiro</p>
                <p className="text-white font-medium">https://mania-brasil.com/parceiros</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText("https://mania-brasil.com/parceiros");
                toast({
                  title: "Link copiado!",
                  description: "O link do painel do parceiro foi copiado."
                });
              }}
              className="border-purple-600/50 text-purple-400 hover:bg-purple-600/10"
            >
              <Copy className="mr-2 h-4 w-4" />
              Copiar Link
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ scale: 1.02 }}
            className="relative rounded-2xl overflow-hidden"
          >
            <div className="relative bg-gradient-to-br from-gray-900/95 to-gray-950/95 backdrop-blur-xl border border-gray-800 rounded-xl md:rounded-2xl p-4 md:p-6">
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <div className="p-2.5 md:p-3 bg-gray-800/30 rounded-xl border border-gray-700/50">
                  <Users className="w-5 h-5 md:w-6 md:h-6 text-purple-400" />
                </div>
                <span className="text-xs text-gray-400">Total</span>
              </div>
              <p className="text-xl md:text-3xl font-bold text-white">
                {stats.totalPartners}
              </p>
              <p className="text-xs md:text-sm text-gray-400">Parceiros cadastrados</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.02 }}
            className="relative rounded-2xl overflow-hidden"
          >
            <div className="relative bg-gradient-to-br from-gray-900/95 to-gray-950/95 backdrop-blur-xl border border-gray-800 rounded-xl md:rounded-2xl p-4 md:p-6">
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <div className="p-2.5 md:p-3 bg-gray-800/30 rounded-xl border border-gray-700/50">
                  <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-green-400" />
                </div>
                <span className="text-xs text-gray-400">Ativos</span>
              </div>
              <p className="text-xl md:text-3xl font-bold text-white">
                {stats.activePartners}
              </p>
              <p className="text-xs md:text-sm text-gray-400">Parceiros ativos</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.02 }}
            className="relative rounded-2xl overflow-hidden"
          >
            <div className="relative bg-gradient-to-br from-gray-900/95 to-gray-950/95 backdrop-blur-xl border border-gray-800 rounded-xl md:rounded-2xl p-4 md:p-6">
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <div className="p-2.5 md:p-3 bg-gray-800/30 rounded-xl border border-gray-700/50">
                  <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-[#00E880]" />
                </div>
                <span className="text-xs text-gray-400">Total</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg md:text-2xl font-medium text-white">R$</span>
                <span className="text-xl md:text-3xl font-bold text-white">
                  {stats.totalEarnings}
                </span>
              </div>
              <p className="text-xs md:text-sm text-gray-400">Ganhos com parceiros</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            whileHover={{ scale: 1.02 }}
            className="relative rounded-2xl overflow-hidden"
          >
            <div className="relative bg-gradient-to-br from-gray-900/95 to-gray-950/95 backdrop-blur-xl border border-gray-800 rounded-xl md:rounded-2xl p-4 md:p-6">
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <div className="p-2.5 md:p-3 bg-gray-800/30 rounded-xl border border-gray-700/50">
                  <DollarSign className="w-6 h-6 text-indigo-400" />
                </div>
                <span className="text-xs text-gray-400">Mês</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg md:text-2xl font-medium text-white">R$</span>
                <span className="text-xl md:text-3xl font-bold text-white">
                  {stats.monthlyEarnings}
                </span>
              </div>
              <p className="text-xs md:text-sm text-gray-400">Ganhos este mês</p>
            </div>
          </motion.div>
        </div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-[#1a1f2e]/95 backdrop-blur-sm rounded-2xl p-4 border border-gray-700"
        >
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome ou email..."
                className="pl-10 bg-gray-900/50 border-gray-700 text-white placeholder-gray-500"
              />
            </div>
            <Button 
              variant="outline" 
              className="border-gray-700 hover:bg-gray-800 text-gray-300 hover:text-white"
            >
              <Filter className="mr-2 h-4 w-4" />
              Filtros
            </Button>
            <Button 
              variant="outline" 
              className="border-gray-700 hover:bg-gray-800 text-gray-300 hover:text-white"
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </div>
        </motion.div>

        {/* Partners Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-gradient-to-br from-gray-900/95 to-gray-950/95 backdrop-blur-xl rounded-xl md:rounded-2xl border border-gray-800"
        >
          <div className="p-4 md:p-6">
            <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 md:w-5 md:h-5 text-purple-400" />
              Lista de Parceiros
            </h3>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
              </div>
            ) : filteredPartners.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">
                  {searchTerm ? "Nenhum parceiro encontrado" : "Você ainda não tem parceiros"}
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  Convide parceiros para expandir sua rede e aumentar seus ganhos
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPartners.map((partner: any, index: number) => (
                  <div key={partner.id} className="bg-gray-800/50 rounded-xl p-4 md:p-5 space-y-3 border border-gray-700/50 hover:bg-gray-800/60 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm md:text-base font-medium text-white">{partner.name}</p>
                        <p className="text-[10px] md:text-xs text-gray-400 mt-0.5">{partner.email}</p>
                        {partner.phone && (
                          <p className="text-[10px] md:text-xs text-gray-500 mt-0.5">
                            {formatPhone(partner.phone)}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant={partner.isActive ? "default" : "secondary"}
                        className={cn(
                          "text-[10px] md:text-xs",
                          partner.isActive
                            ? "bg-green-500/10 text-green-400 border-green-500/20"
                            : "bg-gray-500/10 text-gray-400 border-gray-600"
                        )}
                      >
                        {partner.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs md:text-sm">
                      <div>
                        <span className="text-gray-500">Cadastros:</span>
                        <span className="text-gray-300 ml-1">{partner.totalRegistrations || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Depósitos:</span>
                        <span className="text-gray-300 ml-1">{partner.totalDeposits || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Ganhos:</span>
                        <span className="text-[#00E880] font-medium ml-1">R${partner.totalEarnings || "0.00"}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Comissão:</span>
                        <span className="text-purple-400 font-medium ml-1">
                          {partner.commissionType === "percentage"
                            ? `${partner.commissionRate}%`
                            : `R$ ${partner.fixedCommissionAmount}`}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 bg-gray-700/50 border-gray-600 hover:bg-gray-700 text-xs md:text-sm"
                        onClick={() => setSelectedPartner(partner)}
                      >
                        <Eye className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                        Ver Detalhes
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 bg-gray-700/50 border-gray-600 hover:bg-gray-700 text-xs md:text-sm"
                        onClick={() => handleEditPartner(partner)}
                      >
                        <Edit2 className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="hover:bg-gray-700 text-gray-400 hover:text-white text-xs md:text-sm px-2 md:px-3"
                        onClick={() => togglePartnerStatus.mutate({
                          partnerId: partner.id,
                          isActive: partner.isActive
                        })}
                        title={partner.isActive ? "Desativar" : "Ativar"}
                      >
                        {partner.isActive ? (
                          <Ban className="w-3 h-3 md:w-4 md:h-4" />
                        ) : (
                          <Check className="w-3 h-3 md:w-4 md:h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="hover:bg-red-500/10 text-red-400 hover:text-red-300 text-xs md:text-sm px-2 md:px-3"
                        onClick={() => setShowDeleteDialog(partner)}
                        title="Excluir parceiro"
                      >
                        <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Create Partner Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="bg-gray-900 border-gray-800 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">Criar Novo Parceiro</DialogTitle>
              <DialogDescription className="text-gray-400">
                Preencha os dados do parceiro. A senha será gerada automaticamente.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-300">Nome Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="name"
                    value={newPartnerForm.name}
                    onChange={(e) => setNewPartnerForm({ ...newPartnerForm, name: e.target.value })}
                    placeholder="Nome do parceiro"
                    className="pl-10 bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={newPartnerForm.email}
                    onChange={(e) => setNewPartnerForm({ ...newPartnerForm, email: e.target.value })}
                    placeholder="email@exemplo.com"
                    className="pl-10 bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-300">
                  Telefone <span className="text-red-400">*</span>
                </Label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="phone"
                    value={newPartnerForm.phone}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      if (value.length <= 11) {
                        setNewPartnerForm({ ...newPartnerForm, phone: value });
                      }
                    }}
                    placeholder="(11) 98765-4321"
                    className="pl-10 bg-gray-800 border-gray-700 text-white"
                    required
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="commissionType" className="text-gray-300">Tipo de Comissão</Label>
                    <select
                      id="commissionType"
                      value={newPartnerForm.commissionType}
                      onChange={(e) => setNewPartnerForm({ ...newPartnerForm, commissionType: e.target.value, commissionRate: "" })}
                      className="w-full bg-gray-800 border-gray-700 text-white rounded-lg px-3 py-2"
                    >
                      <option value="percentage">Porcentagem</option>
                      <option value="fixed">Valor Fixo</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="commissionRate" className="text-gray-300">
                      {newPartnerForm.commissionType === "percentage" ? "Taxa (%)" : "Valor (R$)"}
                    </Label>
                    <Input
                      id="commissionRate"
                      type="number"
                      step={newPartnerForm.commissionType === "percentage" ? "0.1" : "0.01"}
                      value={newPartnerForm.commissionRate}
                      onChange={(e) => setNewPartnerForm({ ...newPartnerForm, commissionRate: e.target.value })}
                      placeholder={
                        commissionLimits 
                          ? newPartnerForm.commissionType === "percentage" 
                            ? `Máx: ${commissionLimits.maxPercentage.toFixed(1)}%`
                            : `Máx: R$ ${commissionLimits.maxFixed.toFixed(2)}`
                          : newPartnerForm.commissionType === "percentage" ? "10" : "50.00"
                      }
                      className={cn(
                        "bg-gray-800 border-gray-700 text-white",
                        commissionError && "border-red-500"
                      )}
                    />
                  </div>
                </div>
                
                {/* Commission Limits Info */}
                {commissionLimits && (
                  <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-blue-300">
                        <p className="font-medium mb-1">Limite de Comissão</p>
                        <p className="text-xs opacity-90">{commissionLimits.explanation}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Commission Error */}
                {commissionError && (
                  <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-red-300">{commissionError}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  onClick={() => setShowCreateDialog(false)}
                  variant="outline"
                  className="flex-1 border-gray-700"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    // Validate phone before creating
                    const cleanPhone = newPartnerForm.phone.replace(/\D/g, '');
                    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
                      toast({
                        title: "Telefone inválido",
                        description: "Digite um telefone válido com DDD + número (10 ou 11 dígitos).",
                        variant: "destructive"
                      });
                      return;
                    }
                    createPartner.mutate(newPartnerForm);
                  }}
                  disabled={
                    createPartner.isPending || 
                    !newPartnerForm.name || 
                    !newPartnerForm.email || 
                    !newPartnerForm.phone ||
                    !newPartnerForm.commissionRate ||
                    !!commissionError
                  }
                  className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                >
                  {createPartner.isPending ? "Criando..." : "Criar Parceiro"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Credentials Dialog */}
        {showCredentials && (
          <Dialog open={!!showCredentials} onOpenChange={() => setShowCredentials(null)}>
            <DialogContent className="bg-gray-900 border-gray-800 max-w-md">
              <DialogHeader>
                <DialogTitle className="text-white">Parceiro Criado com Sucesso!</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Guarde estas credenciais com segurança. A senha não poderá ser recuperada.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="bg-gray-800 rounded-lg p-4 space-y-3">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Nome</p>
                    <p className="text-white font-medium">{showCredentials.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Email</p>
                    <p className="text-white">{showCredentials.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Senha</p>
                    <p className="text-yellow-400 font-mono">{showCredentials.password}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Código do Parceiro</p>
                    <p className="text-purple-400 font-mono text-lg">{showCredentials.code}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Link de Acesso</p>
                    <p className="text-blue-400 text-sm">https://mania-brasil.com/parceiros-login</p>
                  </div>
                </div>

                <div className="bg-purple-500/10 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-purple-400 mt-0.5" />
                    <p className="text-sm text-purple-400">
                      Envie estas credenciais para o parceiro de forma segura.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={handleCopyCredentials}
                    variant="outline"
                    className="flex-1 border-gray-700"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar Credenciais
                  </Button>
                  <Button
                    onClick={() => setShowCredentials(null)}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Partner Configuration Modal - Lateral Sliding */}
        <AnimatePresence>
          {editingPartner && editPartnerForm && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-40"
                onClick={() => {
                  setEditingPartner(null);
                  setEditPartnerForm(null);
                  setEditCommissionError("");
                  setEditTab("account");
                }}
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed right-0 top-0 h-full w-full md:w-[400px] bg-gray-900 shadow-xl z-50 overflow-y-auto"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white">Configurar Parceiro</h3>
                    <button
                      onClick={() => {
                        setEditingPartner(null);
                        setEditPartnerForm(null);
                        setEditCommissionError("");
                        setEditTab("account");
                      }}
                      className="p-2 hover:bg-gray-800 rounded-lg transition-all"
                    >
                      <X className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
              
              <div className="space-y-4">
                {/* Tabs */}
                <div className="flex gap-2 p-1 bg-gray-800/50 rounded-lg">
                  <Button
                    variant={editTab === "account" ? "default" : "ghost"}
                    onClick={() => setEditTab("account")}
                    className={cn(
                      "flex-1",
                      editTab === "account"
                        ? "bg-purple-600 hover:bg-purple-700 text-white"
                        : "text-gray-400 hover:text-white hover:bg-gray-700"
                    )}
                  >
                    <User className="mr-2 h-4 w-4" />
                    Conta
                  </Button>
                  <Button
                    variant={editTab === "commission" ? "default" : "ghost"}
                    onClick={() => setEditTab("commission")}
                    className={cn(
                      "flex-1",
                      editTab === "commission"
                        ? "bg-purple-600 hover:bg-purple-700 text-white"
                        : "text-gray-400 hover:text-white hover:bg-gray-700"
                    )}
                  >
                    <DollarSign className="mr-2 h-4 w-4" />
                    Comissão
                  </Button>
                </div>

                {/* Account Tab */}
                {editTab === "account" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-name" className="text-gray-300">Nome</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="edit-name"
                          value={editPartnerForm.name || editingPartner.name}
                          onChange={(e) => setEditPartnerForm({ ...editPartnerForm, name: e.target.value })}
                          placeholder="Nome do parceiro"
                          className="pl-10 bg-gray-800 border-gray-700 text-white"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="edit-email" className="text-gray-300">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="edit-email"
                          type="email"
                          value={editPartnerForm.email || editingPartner.email}
                          onChange={(e) => setEditPartnerForm({ ...editPartnerForm, email: e.target.value })}
                          placeholder="email@exemplo.com"
                          className="pl-10 bg-gray-800 border-gray-700 text-white"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="edit-phone" className="text-gray-300">Telefone</Label>
                      <div className="relative">
                        <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="edit-phone"
                          value={(() => {
                            const phone = editPartnerForm.phone || editingPartner.phone || '';
                            const cleaned = phone.replace(/\D/g, '');
                            if (cleaned.length === 11) {
                              return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
                            }
                            if (cleaned.length === 10) {
                              return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
                            }
                            return phone;
                          })()}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            if (value.length <= 11) {
                              setEditPartnerForm({ ...editPartnerForm, phone: value });
                            }
                          }}
                          placeholder="(11) 98765-4321"
                          className="pl-10 bg-gray-800 border-gray-700 text-white"
                        />
                      </div>
                    </div>

                    {/* Reset Password Button */}
                    <div className="pt-3 border-t border-gray-800">
                      <Button
                        variant="outline"
                        onClick={() => {
                          resetPartnerPassword.mutate(editingPartner.id);
                        }}
                        disabled={resetPartnerPassword.isPending}
                        className="w-full border-yellow-600/50 text-yellow-400 hover:bg-yellow-600/10 hover:border-yellow-600"
                      >
                        <Key className="mr-2 h-4 w-4" />
                        {resetPartnerPassword.isPending ? "Gerando nova senha..." : "Redefinir Senha do Parceiro"}
                      </Button>
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        Gere uma nova senha caso o parceiro tenha esquecido
                      </p>
                    </div>
                  </div>
                )}

                {/* Commission Tab */}
                {editTab === "commission" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-gray-300">Tipo de Comissão</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant={editPartnerForm.commissionType === "percentage" ? "default" : "outline"}
                          onClick={() => setEditPartnerForm({ ...editPartnerForm, commissionType: "percentage" })}
                          className={cn(
                            editPartnerForm.commissionType === "percentage"
                              ? "bg-purple-600 hover:bg-purple-700"
                              : "border-gray-700"
                          )}
                        >
                          Percentual
                        </Button>
                        <Button
                          type="button"
                          variant={editPartnerForm.commissionType === "fixed" ? "default" : "outline"}
                          onClick={() => setEditPartnerForm({ ...editPartnerForm, commissionType: "fixed" })}
                          className={cn(
                            editPartnerForm.commissionType === "fixed"
                              ? "bg-purple-600 hover:bg-purple-700"
                              : "border-gray-700"
                          )}
                        >
                          Fixa
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300">
                        {editPartnerForm.commissionType === "percentage" 
                          ? "Taxa de Comissão (%)" 
                          : "Valor Fixo (R$)"}
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={editPartnerForm.commissionRate}
                        onChange={(e) => setEditPartnerForm({ ...editPartnerForm, commissionRate: e.target.value })}
                        placeholder={editPartnerForm.commissionType === "percentage" ? "Ex: 10" : "Ex: 5.00"}
                        className={cn(
                          "bg-gray-800 border-gray-700 text-white",
                          editCommissionError && "border-red-500"
                        )}
                      />
                      
                      {editCommissionLimits && (
                        <div className="bg-blue-500/10 rounded-lg p-3 mt-2">
                          <div className="flex items-start gap-2">
                            <Info className="w-4 h-4 text-blue-400 mt-0.5" />
                            <div className="text-xs text-blue-400">
                              <p className="font-medium mb-1">Limite de comissão:</p>
                              <p>
                                {editPartnerForm.commissionType === "percentage"
                                  ? `Máximo ${editCommissionLimits.maxPercentage.toFixed(1)}%`
                                  : `Máximo R$ ${editCommissionLimits.maxFixed.toFixed(2)}`}
                              </p>
                              <p className="text-blue-400/70 mt-1">{editCommissionLimits.explanation}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {editCommissionError && (
                        <p className="text-red-400 text-sm mt-1">{editCommissionError}</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingPartner(null);
                      setEditPartnerForm(null);
                      setEditCommissionError("");
                      setEditTab("account");
                    }}
                    className="flex-1 border-gray-700"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => {
                      updatePartnerCommission.mutate({
                        partnerId: editingPartner.id,
                        data: {
                          name: editPartnerForm.name || editingPartner.name,
                          email: editPartnerForm.email || editingPartner.email,
                          phone: editPartnerForm.phone || editingPartner.phone,
                          commissionType: editPartnerForm.commissionType,
                          commissionRate: editPartnerForm.commissionRate
                        }
                      });
                    }}
                    disabled={!!editCommissionError || !editPartnerForm.commissionRate || updatePartnerCommission.isPending}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                  >
                    {updatePartnerCommission.isPending ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </div>
              </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Partner Details Modal - Lateral Sliding */}
        <AnimatePresence>
          {selectedPartner && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-40"
                onClick={() => setSelectedPartner(null)}
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed right-0 top-0 h-full w-full md:w-[400px] bg-gray-900 shadow-xl z-50 overflow-y-auto"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white">Detalhes do Parceiro</h3>
                    <button
                      onClick={() => setSelectedPartner(null)}
                      className="p-2 hover:bg-gray-800 rounded-lg transition-all"
                    >
                      <X className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
              
              <div className="space-y-6">
                {/* Basic Info Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                    <div className="flex-1">
                      <p className="text-xs text-gray-400 mb-1">Nome</p>
                      <p className="text-lg font-medium text-white">{selectedPartner.name}</p>
                    </div>
                    <Badge
                      className={cn(
                        "ml-3",
                        selectedPartner.isActive
                          ? "bg-green-500/10 text-green-400 border-green-400/20"
                          : "bg-gray-500/10 text-gray-400 border-gray-400/20"
                      )}
                    >
                      {selectedPartner.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Email</p>
                      <p className="text-white break-all">{selectedPartner.email}</p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Telefone</p>
                      <p className="text-white">
                        {selectedPartner.phone ? formatPhone(selectedPartner.phone) : 'Não informado'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Statistics Section */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-white">Estatísticas</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-white">
                        {selectedPartner.totalRegistrations || 0}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">Cadastros</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-white">
                        {selectedPartner.totalDeposits || 0}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">Depósitos</p>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg p-4 text-center border border-green-500/20">
                    <div className="flex items-baseline justify-center gap-1.5">
                      <span className="text-xl font-medium text-green-400">R$</span>
                      <span className="text-3xl font-bold text-green-400">
                        {selectedPartner.totalEarnings || "0.00"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Total de Ganhos</p>
                  </div>
                </div>

                {/* Commission Configuration Section */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-white">Configuração de Comissão</h4>
                  <div className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 rounded-lg p-4 border border-purple-500/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Tipo de Comissão</p>
                        <p className="text-white font-medium">
                          {selectedPartner.commissionType === "percentage"
                            ? "Comissão Percentual"
                            : "Comissão Fixa"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400 mb-1">Valor</p>
                        <p className="text-2xl font-bold text-purple-400">
                          {selectedPartner.commissionType === "percentage"
                            ? `${selectedPartner.commissionRate}%`
                            : `R$ ${selectedPartner.fixedCommissionAmount}`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Show Reset Password Dialog */}
        {showResetPassword && (
          <Dialog open={!!showResetPassword} onOpenChange={() => setShowResetPassword(null)}>
            <DialogContent className="bg-gray-900 border-gray-800 max-w-md">
              <DialogHeader>
                <DialogTitle className="text-white">Nova Senha Gerada</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Copie e envie esta nova senha para o parceiro
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Parceiro</p>
                      <p className="text-white font-medium">{showResetPassword.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Email</p>
                      <p className="text-gray-300">{showResetPassword.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Nova Senha</p>
                      <div className="bg-black/50 rounded p-3 font-mono text-green-400 text-lg">
                        {showResetPassword.newPassword}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-500/10 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5" />
                    <div className="text-sm text-yellow-400">
                      <p className="font-medium mb-1">Importante!</p>
                      <p className="text-yellow-400/80">
                        Copie esta senha agora. Por segurança, ela não será exibida novamente.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowResetPassword(null)}
                    className="flex-1 border-gray-700"
                  >
                    Fechar
                  </Button>
                  <Button
                    onClick={() => {
                      const text = `
Nova Senha do Parceiro
----------------------
Nome: ${showResetPassword.name}
Email: ${showResetPassword.email}
Senha: ${showResetPassword.newPassword}
Link de acesso: https://mania-brasil.com/parceiros
                      `.trim();
                      navigator.clipboard.writeText(text);
                      toast({
                        title: "Copiado!",
                        description: "As informações foram copiadas para a área de transferência."
                      });
                    }}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar Informações
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Delete Partner Confirmation Dialog */}
        {showDeleteDialog && (
          <Dialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
            <DialogContent className="bg-gray-900 border-gray-800 max-w-md">
              <DialogHeader>
                <DialogTitle className="text-white">Confirmar Exclusão</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Tem certeza que deseja excluir este parceiro?
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Nome</span>
                      <span className="text-white font-medium">{showDeleteDialog.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Email</span>
                      <span className="text-gray-300">{showDeleteDialog.email}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Ganhos</span>
                      <span className="text-green-400 font-medium">R${showDeleteDialog.totalEarnings || "0.00"}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-red-500/10 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
                    <div className="text-sm text-red-400">
                      <p className="font-medium mb-1">Atenção!</p>
                      <p className="text-red-400/80">
                        Esta ação não pode ser desfeita. O parceiro só pode ser excluído se não tiver comissões ou saques registrados.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteDialog(null)}
                    className="flex-1 border-gray-700"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => {
                      deletePartnerMutation.mutate(showDeleteDialog.id);
                    }}
                    disabled={deletePartnerMutation.isPending}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  >
                    {deletePartnerMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Excluindo...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir Parceiro
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AffiliateLayout>
  );
}