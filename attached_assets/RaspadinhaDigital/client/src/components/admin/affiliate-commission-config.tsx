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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Settings,
  DollarSign,
  Percent,
  TrendingUp,
  Save,
  Shield,
  Star,
  Award,
  Crown,
  Gem,
  Zap,
  Edit,
  Users,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Search,
  X,
  Trash2
} from "lucide-react";

interface TierConfig {
  id: number;
  tier: string;
  percentageRate: string;
  fixedAmount: string;
  minEarnings: string;
}

interface Affiliate {
  id: number;
  name: string;
  email: string;
  affiliateLevel: string;
  commissionType: string;
  fixedCommissionAmount: string;
  currentLevelRate: string;
  customCommissionRate?: string;
  customFixedAmount?: string;
  approvedEarnings: string;
  totalEarnings: string;
  isActive: boolean;
}

const tierIcons = {
  bronze: { icon: Shield, color: "text-orange-600" },
  silver: { icon: Star, color: "text-gray-400" },
  gold: { icon: Award, color: "text-yellow-500" },
  platinum: { icon: Crown, color: "text-purple-400" },
  diamond: { icon: Gem, color: "text-blue-400" },
  special: { icon: Zap, color: "text-pink-500" }
};

const tierColors = {
  bronze: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  silver: "bg-gray-500/10 text-gray-300 border-gray-500/30",
  gold: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  platinum: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  diamond: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  special: "bg-pink-500/10 text-pink-400 border-pink-500/30"
};

export function AffiliateCommissionConfig() {
  const { toast } = useToast();
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);
  const [selectedAffiliateId, setSelectedAffiliateId] = useState<number | null>(() => {
    const stored = localStorage.getItem('selectedAffiliateCommissionId');
    return stored ? parseInt(stored) : null;
  });
  const [editingAffiliate, setEditingAffiliate] = useState(false);
  const [editingTiers, setEditingTiers] = useState(false);
  const [tierConfigs, setTierConfigs] = useState<TierConfig[]>([]);
  const [emailSearch, setEmailSearch] = useState("");
  const [affiliateSettings, setAffiliateSettings] = useState({
    affiliateLevel: "",
    commissionType: "",
    customCommissionRate: "",
    customFixedAmount: ""
  });

  // Fetch tier configurations
  const { data: tierConfigData, isLoading: loadingTiers, refetch: refetchTiers } = useQuery({
    queryKey: ["/api/admin/affiliates/tier-config"],
    refetchInterval: 30000
  });

  // Fetch affiliates
  const { data: affiliatesResponse, isLoading: loadingAffiliates, refetch: refetchAffiliates } = useQuery({
    queryKey: ["/api/admin/affiliates"],
    refetchInterval: 30000
  });
  
  const affiliatesData: Affiliate[] = Array.isArray(affiliatesResponse) 
    ? affiliatesResponse 
    : (affiliatesResponse && typeof affiliatesResponse === 'object' && 'affiliates' in affiliatesResponse) 
      ? (affiliatesResponse as any).affiliates 
      : [];

  useEffect(() => {
    if (tierConfigData && Array.isArray(tierConfigData)) {
      setTierConfigs(tierConfigData);
    }
  }, [tierConfigData]);
  
  // Auto-select affiliate from localStorage
  useEffect(() => {
    if (affiliatesData.length > 0 && selectedAffiliateId && !selectedAffiliate) {
      const affiliate = affiliatesData.find(a => a.id === selectedAffiliateId);
      if (affiliate) {
        setSelectedAffiliate(affiliate);
      }
    }
  }, [affiliatesData, selectedAffiliateId]);

  useEffect(() => {
    if (selectedAffiliate) {
      setAffiliateSettings({
        affiliateLevel: selectedAffiliate.affiliateLevel || 'bronze',
        commissionType: selectedAffiliate.commissionType || 'percentage',
        customCommissionRate: selectedAffiliate.customCommissionRate || "",
        customFixedAmount: selectedAffiliate.customFixedAmount || ""
      });
      // Save selected affiliate ID to localStorage
      localStorage.setItem('selectedAffiliateCommissionId', selectedAffiliate.id.toString());
      setSelectedAffiliateId(selectedAffiliate.id);
    }
  }, [selectedAffiliate]);

  // Update tier configuration
  const updateTierMutation = useMutation({
    mutationFn: async (tier: TierConfig) => {
      return await apiRequest(`/api/admin/affiliates/tier-config/${tier.tier}`, "PUT", {
        percentageRate: tier.percentageRate,
        fixedAmount: tier.fixedAmount,
        minEarnings: tier.minEarnings
      });
    },
    onSuccess: () => {
      toast({
        title: "Configuração Atualizada",
        description: "As configurações de tier foram atualizadas com sucesso.",
      });
      refetchTiers();
      setEditingTiers(false);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar configurações de tier.",
        variant: "destructive"
      });
    }
  });

  // Update affiliate commission settings
  const updateAffiliateMutation = useMutation({
    mutationFn: async (data: { affiliateId: number; settings: any }) => {
      return await apiRequest(`/api/admin/affiliates/${data.affiliateId}/commission-settings`, "PUT", data.settings);
    },
    onSuccess: async (response, variables) => {
      toast({
        title: "Configurações Atualizadas",
        description: "As configurações de comissão do afiliado foram atualizadas com sucesso.",
      });
      
      // Invalidate and refetch all affiliate data
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/affiliates"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/affiliates/complete"] });
      
      // Wait a bit for the backend to complete the update
      setTimeout(async () => {
        const result = await refetchAffiliates();
        
        // Update selected affiliate with fresh data
        if (result.data) {
          const updatedList = Array.isArray(result.data) 
            ? result.data 
            : (result.data as any)?.affiliates || [];
          
          const updatedAffiliate = updatedList.find((a: Affiliate) => a.id === variables.affiliateId);
          if (updatedAffiliate) {
            setSelectedAffiliate(updatedAffiliate);
            setAffiliateSettings({
              affiliateLevel: updatedAffiliate.affiliateLevel || 'bronze',
              commissionType: updatedAffiliate.commissionType || 'percentage',
              customCommissionRate: updatedAffiliate.customCommissionRate || "",
              customFixedAmount: updatedAffiliate.customFixedAmount || ""
            });
          }
        }
      }, 500);
      
      setEditingAffiliate(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar configurações do afiliado.",
        variant: "destructive"
      });
    }
  });

  const handleSaveTierConfigs = () => {
    tierConfigs.forEach(tier => {
      updateTierMutation.mutate(tier);
    });
  };

  const handleSaveAffiliateSettings = () => {
    if (!selectedAffiliate) return;

    const settings: any = {
      affiliateLevel: affiliateSettings.affiliateLevel || 'bronze',
      commissionType: affiliateSettings.commissionType || 'percentage'
    };

    // Automatically detect if custom values are being used
    const hasCustomValues = affiliateSettings.customCommissionRate || affiliateSettings.customFixedAmount;

    if (hasCustomValues) {
      if (affiliateSettings.commissionType === 'percentage') {
        settings.customCommissionRate = affiliateSettings.customCommissionRate || null;
        settings.customFixedAmount = null; // Clear fixed amount when using percentage
      } else {
        settings.customFixedAmount = affiliateSettings.customFixedAmount || null;
        settings.customCommissionRate = null; // Clear percentage when using fixed
      }
    } else {
      // Clear both custom values when not using custom
      settings.customCommissionRate = null;
      settings.customFixedAmount = null;
    }
    updateAffiliateMutation.mutate({
      affiliateId: selectedAffiliate.id,
      settings
    });
  };

  const handleRemoveCustomRate = () => {
    setAffiliateSettings(prev => ({
      ...prev,
      customCommissionRate: "",
      customFixedAmount: ""
    }));
  };

  const getTierIcon = (tier: string) => {
    const config = tierIcons[tier as keyof typeof tierIcons] || tierIcons.bronze;
    const Icon = config.icon;
    return <Icon className={`w-5 h-5 ${config.color}`} />;
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="tier-config" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-zinc-800/50">
          <TabsTrigger value="tier-config" className="data-[state=active]:bg-zinc-700">
            <Settings className="w-4 h-4 mr-2" />
            Configuração de Tiers
          </TabsTrigger>
          <TabsTrigger value="affiliate-settings" className="data-[state=active]:bg-zinc-700">
            <Users className="w-4 h-4 mr-2" />
            Configuração Individual
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tier-config" className="space-y-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">Configuração de Tiers</CardTitle>
                  <CardDescription>
                    Configure os valores de comissão para cada tier de afiliado
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {editingTiers ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => setEditingTiers(false)}
                        className="border-zinc-700"
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleSaveTierConfigs}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Salvar Alterações
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={() => setEditingTiers(true)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Editar Configurações
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingTiers ? (
                <div className="flex items-center justify-center py-10">
                  <RefreshCw className="w-6 h-6 animate-spin text-zinc-400" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800">
                      <TableHead>Tier</TableHead>
                      <TableHead>Taxa Percentual (%)</TableHead>
                      <TableHead>Valor Fixo (R$)</TableHead>
                      <TableHead>Ganhos Mínimos (R$)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tierConfigs.map((tier) => (
                      <TableRow key={tier.tier} className="border-zinc-800">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTierIcon(tier.tier)}
                            <Badge className={tierColors[tier.tier as keyof typeof tierColors]}>
                              {tier.tier.toUpperCase()}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Percent className="w-4 h-4 text-zinc-400" />
                            {editingTiers ? (
                              <Input
                                type="number"
                                value={tier.percentageRate}
                                onChange={(e) => {
                                  const updated = tierConfigs.map(t =>
                                    t.tier === tier.tier
                                      ? { ...t, percentageRate: e.target.value }
                                      : t
                                  );
                                  setTierConfigs(updated);
                                }}
                                className="w-24 bg-zinc-800 border-zinc-700"
                              />
                            ) : (
                              <span className="font-bold text-green-400">
                                {tier.percentageRate}%
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-zinc-400" />
                            {editingTiers ? (
                              <Input
                                type="number"
                                value={tier.fixedAmount}
                                onChange={(e) => {
                                  const updated = tierConfigs.map(t =>
                                    t.tier === tier.tier
                                      ? { ...t, fixedAmount: e.target.value }
                                      : t
                                  );
                                  setTierConfigs(updated);
                                }}
                                className="w-24 bg-zinc-800 border-zinc-700"
                              />
                            ) : (
                              <span className="font-bold text-blue-400">
                                R$ {parseFloat(tier.fixedAmount).toFixed(2)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-zinc-400" />
                            {editingTiers && tier.tier !== 'special' ? (
                              <Input
                                type="number"
                                value={tier.minEarnings}
                                onChange={(e) => {
                                  const updated = tierConfigs.map(t =>
                                    t.tier === tier.tier
                                      ? { ...t, minEarnings: e.target.value }
                                      : t
                                  );
                                  setTierConfigs(updated);
                                }}
                                className="w-32 bg-zinc-800 border-zinc-700"
                              />
                            ) : (
                              <span className="text-zinc-300">
                                {tier.tier === 'special' 
                                  ? 'Manual' 
                                  : `R$ ${parseFloat(tier.minEarnings).toLocaleString('pt-BR')}`
                                }
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              <Alert className="mt-4 bg-blue-500/10 border-blue-500/30">
                <AlertCircle className="h-4 w-4 text-blue-400" />
                <AlertDescription className="text-blue-200">
                  O tier <strong>ESPECIAL</strong> é atribuído manualmente e permite configuração customizada por afiliado.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="affiliate-settings" className="space-y-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-2xl">Configuração Individual de Afiliados</CardTitle>
              <CardDescription>
                Busque e selecione um afiliado para configurar suas comissões
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Lista de Afiliados */}
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Buscar Afiliado</Label>
                      <Badge variant="outline" className="text-zinc-400">
                        {affiliatesData.filter((a: Affiliate) => 
                          a.email.toLowerCase().includes(emailSearch.toLowerCase()) ||
                          a.name.toLowerCase().includes(emailSearch.toLowerCase())
                        ).length} afiliados
                      </Badge>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 w-4 h-4" />
                      <Input
                        type="text"
                        placeholder="Buscar por e-mail ou nome..."
                        value={emailSearch}
                        onChange={(e) => setEmailSearch(e.target.value)}
                        className="pl-10 pr-10 bg-zinc-800 border-zinc-700"
                      />
                      {emailSearch && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEmailSearch("")}
                          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                    {loadingAffiliates ? (
                      <div className="flex items-center justify-center py-10">
                        <RefreshCw className="w-6 h-6 animate-spin text-zinc-400" />
                      </div>
                    ) : affiliatesData.length === 0 ? (
                      <div className="flex items-center justify-center py-10">
                        <p className="text-zinc-400">Nenhum afiliado cadastrado</p>
                      </div>
                    ) : (
                      affiliatesData
                        .filter((affiliate: Affiliate) => 
                          affiliate.email.toLowerCase().includes(emailSearch.toLowerCase()) ||
                          affiliate.name.toLowerCase().includes(emailSearch.toLowerCase())
                        )
                        .map((affiliate: Affiliate) => (
                        <Card
                          key={affiliate.id}
                          className={`bg-zinc-800/50 border-zinc-700 cursor-pointer transition-all ${
                            selectedAffiliate?.id === affiliate.id
                              ? 'ring-2 ring-green-500 bg-zinc-800'
                              : 'hover:bg-zinc-800'
                          }`}
                          onClick={() => setSelectedAffiliate(affiliate)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-white">{affiliate.name}</p>
                                <p className="text-sm text-zinc-400">{affiliate.email}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                {getTierIcon(affiliate.affiliateLevel)}
                                <Badge className={tierColors[affiliate.affiliateLevel as keyof typeof tierColors]}>
                                  {affiliate.affiliateLevel.toUpperCase()}
                                </Badge>
                              </div>
                            </div>
                            <div className="mt-3 flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-1">
                                {affiliate.commissionType === 'percentage' ? (
                                  <>
                                    <Percent className="w-3 h-3 text-green-400" />
                                    <span className="text-green-400">
                                      {affiliate.customCommissionRate || affiliate.currentLevelRate}%
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <DollarSign className="w-3 h-3 text-blue-400" />
                                    <span className="text-blue-400">
                                      R$ {
                                        affiliate.customFixedAmount
                                          ? parseFloat(affiliate.customFixedAmount).toFixed(2)
                                          : parseFloat(affiliate.fixedCommissionAmount).toFixed(2)
                                      }
                                    </span>
                                  </>
                                )}
                              </div>
                              {(affiliate.customCommissionRate || affiliate.customFixedAmount) && (
                                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                                  CUSTOM
                                </Badge>
                              )}
                              <Separator orientation="vertical" className="h-4" />
                              <span className="text-zinc-400">
                                Total: R$ {parseFloat(affiliate.totalEarnings).toLocaleString('pt-BR')}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </div>

                {/* Configurações do Afiliado Selecionado */}
                <div className="space-y-4">
                  {selectedAffiliate ? (
                    <>
                      <div className="flex items-center justify-between">
                        <Label>Configurações de Comissão</Label>
                        {editingAffiliate ? (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingAffiliate(false);
                                setAffiliateSettings({
                                  affiliateLevel: selectedAffiliate.affiliateLevel,
                                  commissionType: selectedAffiliate.commissionType,
                                  customCommissionRate: selectedAffiliate.customCommissionRate || "",
                                  customFixedAmount: selectedAffiliate.customFixedAmount || ""
                                });
                              }}
                              className="border-zinc-700"
                            >
                              Cancelar
                            </Button>
                            <Button
                              size="sm"
                              onClick={handleSaveAffiliateSettings}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Save className="w-4 h-4 mr-2" />
                              Salvar
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => setEditingAffiliate(true)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </Button>
                        )}
                      </div>

                      <Card className="bg-zinc-800/50 border-zinc-700">
                        <CardContent className="p-6 space-y-4">
                          {/* Current Tier Information */}
                          {!editingAffiliate && (
                            <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-700">
                              <div className="flex items-center justify-between mb-3">
                                <Label className="text-sm text-zinc-400">Elo Atual</Label>
                                <div className="flex items-center gap-2">
                                  {getTierIcon(selectedAffiliate.affiliateLevel)}
                                  <Badge className={tierColors[selectedAffiliate.affiliateLevel as keyof typeof tierColors]}>
                                    {selectedAffiliate.affiliateLevel.toUpperCase()}
                                  </Badge>
                                </div>
                              </div>
                              <Separator className="bg-zinc-700 mb-3" />
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-zinc-400">Taxa Padrão do Elo:</span>
                                  <span className="font-medium text-white">
                                    {selectedAffiliate.currentLevelRate}%
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-zinc-400">Valor Fixo do Elo:</span>
                                  <span className="font-medium text-white">
                                    R$ {parseFloat(selectedAffiliate.fixedCommissionAmount).toFixed(2)}
                                  </span>
                                </div>
                                {(selectedAffiliate.customCommissionRate || selectedAffiliate.customFixedAmount) && (
                                  <>
                                    <Separator className="bg-zinc-700 my-2" />
                                    <div className="p-2 bg-purple-500/10 rounded border border-purple-500/30">
                                      <div className="flex items-center justify-between text-sm mb-1">
                                        <span className="text-purple-400 font-medium">Taxa Customizada Ativa:</span>
                                        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                                          CUSTOM
                                        </Badge>
                                      </div>
                                      <div className="text-sm text-purple-300">
                                        {selectedAffiliate.commissionType === 'percentage' 
                                          ? `${selectedAffiliate.customCommissionRate}%`
                                          : `R$ ${parseFloat(selectedAffiliate.customFixedAmount || '0').toFixed(2)}`
                                        }
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Commission Settings */}
                          {editingAffiliate && (
                            <div className="space-y-4">
                              {/* Commission Type Selection - Always Available */}
                              <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-700">
                                <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                                  <Settings className="w-4 h-4" />
                                  Tipo de Comissão
                                </h3>
                                
                                <RadioGroup
                                  value={affiliateSettings.commissionType}
                                  onValueChange={(value) => 
                                    setAffiliateSettings(prev => ({ ...prev, commissionType: value }))
                                  }
                                >
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="percentage" id="percentage" />
                                    <Label htmlFor="percentage" className="flex items-center gap-2 cursor-pointer">
                                      <Percent className="w-4 h-4 text-green-400" />
                                      Percentual do Depósito
                                    </Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="fixed" id="fixed" />
                                    <Label htmlFor="fixed" className="flex items-center gap-2 cursor-pointer">
                                      <DollarSign className="w-4 h-4 text-blue-400" />
                                      Valor Fixo por Depósito
                                    </Label>
                                  </div>
                                </RadioGroup>
                                
                                {/* Show tier default values */}
                                <div className="mt-3 p-3 bg-zinc-800/50 rounded border border-zinc-700">
                                  <p className="text-xs text-zinc-400 mb-1">Valor do tier {selectedAffiliate.affiliateLevel.toUpperCase()}:</p>
                                  <p className="text-sm font-medium text-white">
                                    {affiliateSettings.commissionType === 'percentage' 
                                      ? `${tierConfigs.find(t => t.tier === selectedAffiliate.affiliateLevel)?.percentageRate || '40'}%`
                                      : `R$ ${parseFloat(tierConfigs.find(t => t.tier === selectedAffiliate.affiliateLevel)?.fixedAmount || '0').toFixed(2)}`
                                    }
                                  </p>
                                </div>
                              </div>
                              
                              {/* Custom Commission Settings - Optional */}
                              <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
                                <h3 className="text-purple-400 font-medium mb-3 flex items-center gap-2">
                                  <Gem className="w-4 h-4" />
                                  Configuração Custom (Opcional)
                                </h3>
                                <p className="text-xs text-zinc-400 mb-3">
                                  Defina valores personalizados diferentes do tier atual
                                </p>
                                
                                {/* Custom Value Input */}
                                <div className="space-y-3">
                                  {affiliateSettings.commissionType === 'percentage' ? (
                                    <div>
                                      <Label className="text-sm text-zinc-400">Taxa Percentual Customizada (%)</Label>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        placeholder={`Deixe vazio para usar ${tierConfigs.find(t => t.tier === selectedAffiliate.affiliateLevel)?.percentageRate || '40'}%`}
                                        value={affiliateSettings.customCommissionRate}
                                        onChange={(e) => setAffiliateSettings(prev => ({ 
                                          ...prev, 
                                          customCommissionRate: e.target.value,
                                          customFixedAmount: "" 
                                        }))}
                                        className="bg-zinc-800 border-zinc-700 text-white"
                                      />
                                    </div>
                                  ) : (
                                    <div>
                                      <Label className="text-sm text-zinc-400">Valor Fixo Customizado (R$)</Label>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        placeholder={`Deixe vazio para usar R$ ${parseFloat(tierConfigs.find(t => t.tier === selectedAffiliate.affiliateLevel)?.fixedAmount || '0').toFixed(2)}`}
                                        value={affiliateSettings.customFixedAmount}
                                        onChange={(e) => setAffiliateSettings(prev => ({ 
                                          ...prev, 
                                          customFixedAmount: e.target.value,
                                          customCommissionRate: "" 
                                        }))}
                                        className="bg-zinc-800 border-zinc-700 text-white"
                                      />
                                    </div>
                                  )}
                                  
                                  {/* Reset Button */}
                                  {(affiliateSettings.customCommissionRate || affiliateSettings.customFixedAmount) && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setAffiliateSettings(prev => ({
                                          ...prev,
                                          customCommissionRate: "",
                                          customFixedAmount: ""
                                        }));
                                      }}
                                      className="h-7 px-2 text-xs hover:bg-red-500/20 hover:text-red-400"
                                    >
                                      <Trash2 className="w-3 h-3 mr-1" />
                                      Remover Custom
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Old Custom Rate Config - Remove duplicated code */}


                          {/* Current Values Display */}
                          {!editingAffiliate && (
                            <div className="space-y-3 pt-4 border-t border-zinc-700">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-zinc-400">Comissão Atual:</span>
                                <span className="font-bold text-lg">
                                  {selectedAffiliate.commissionType === 'percentage' ? (
                                    <span className="text-green-400">
                                      {selectedAffiliate.customCommissionRate || selectedAffiliate.currentLevelRate}%
                                    </span>
                                  ) : (
                                    <span className="text-blue-400">
                                      R$ {
                                        selectedAffiliate.customFixedAmount
                                          ? parseFloat(selectedAffiliate.customFixedAmount).toFixed(2)
                                          : parseFloat(selectedAffiliate.fixedCommissionAmount).toFixed(2)
                                      }
                                    </span>
                                  )}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-zinc-400">Ganhos Aprovados:</span>
                                <span className="font-bold text-yellow-400">
                                  R$ {parseFloat(selectedAffiliate.approvedEarnings).toLocaleString('pt-BR')}
                                </span>
                              </div>
                              {(selectedAffiliate.customCommissionRate || selectedAffiliate.customFixedAmount) && (
                                <div className="flex items-center justify-between pt-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingAffiliate(true);
                                      setAffiliateSettings(prev => ({
                                        ...prev,
                                        customCommissionRate: "",
                                        customFixedAmount: ""
                                      }));
                                    }}
                                    className="text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                                  >
                                    <Trash2 className="w-3 h-3 mr-1" />
                                    Remover Taxa Customizada
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </>
                  ) : (
                    <Card className="bg-zinc-800/50 border-zinc-700">
                      <CardContent className="p-12 text-center">
                        <Users className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                        <p className="text-zinc-400">
                          Selecione um afiliado para configurar suas comissões
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}