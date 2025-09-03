import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Users,
  UserPlus,
  DollarSign,
  TrendingUp,
  Eye,
  Edit,
  Ban,
  CheckCircle,
  XCircle,
  Clock,
  Wallet,
  Link,
  AlertCircle,
  Percent,
  Award,
  Target,
  UserCheck,
  BarChart3,
  CreditCard,
  HandshakeIcon
} from "lucide-react";

// Custom apiRequest for admin routes
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

interface Affiliate {
  id: number;
  name: string;
  email: string;
  phone: string;
  affiliateLevel: string;
  commissionType: string;
  customCommissionRate?: string;
  customFixedAmount?: string;
  currentLevelRate: string;
  totalEarnings: string;
  pendingEarnings: string;
  paidEarnings: string;
  totalClicks: number;
  totalRegistrations: number;
  totalDeposits: number;
  isActive: boolean;
  createdAt: string;
}

interface Partner {
  id: number;
  affiliateId: number;
  affiliateName?: string;
  name: string;
  email: string;
  phone: string;
  code: string;
  commissionType: string;
  commissionRate?: string;
  fixedCommissionAmount?: string;
  totalEarnings: string;
  pendingEarnings: string;
  totalClicks: number;
  totalRegistrations: number;
  totalDeposits: number;
  isActive: boolean;
  createdAt: string;
}

interface Conversion {
  id: number;
  affiliateId?: number;
  partnerId?: number;
  userId: number;
  userName?: string;
  conversionType: string;
  conversionValue: string;
  commission: string;
  commissionRate?: string;
  status: string;
  createdAt: string;
}

export function AffiliatesPartnersManagement() {
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [editingAffiliate, setEditingAffiliate] = useState<Affiliate | null>(null);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch affiliates
  const { data: affiliates = [], isLoading: loadingAffiliates } = useQuery({
    queryKey: ['/api/admin/affiliates'],
    queryFn: () => apiRequest('/api/admin/affiliates'),
    refetchInterval: 30000,
  });

  // Fetch partners
  const { data: partners = [], isLoading: loadingPartners } = useQuery({
    queryKey: ['/api/admin/partners'],
    queryFn: () => apiRequest('/api/admin/partners'),
    refetchInterval: 30000,
  });

  // Fetch conversions
  const { data: conversions = [], isLoading: loadingConversions } = useQuery({
    queryKey: ['/api/admin/conversions'],
    queryFn: () => apiRequest('/api/admin/conversions'),
    refetchInterval: 30000,
  });

  // Update affiliate mutation
  const updateAffiliateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest(`/api/admin/affiliates/${id}`, 'PATCH', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/affiliates'] });
      toast({
        title: "Sucesso",
        description: "Afiliado atualizado com sucesso",
      });
      setEditingAffiliate(null);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update partner mutation
  const updatePartnerMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest(`/api/admin/partners/${id}`, 'PATCH', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/partners'] });
      toast({
        title: "Sucesso",
        description: "Parceiro atualizado com sucesso",
      });
      setEditingPartner(null);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Approve pending commissions mutation
  const approvePendingCommissionsMutation = useMutation({
    mutationFn: (type: 'affiliate' | 'partner') =>
      apiRequest(`/api/admin/${type}s/approve-pending-commissions`, 'POST'),
    onSuccess: (_, type) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/affiliates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/partners'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/conversions'] });
      toast({
        title: "Sucesso",
        description: `Comissões de ${type === 'affiliate' ? 'afiliados' : 'parceiros'} aprovadas`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Calculate total stats
  const totalAffiliateEarnings = affiliates.reduce((sum: number, a: Affiliate) => 
    sum + parseFloat(a.totalEarnings || '0'), 0
  );
  const totalAffiliatePending = affiliates.reduce((sum: number, a: Affiliate) => 
    sum + parseFloat(a.pendingEarnings || '0'), 0
  );
  const activeAffiliates = affiliates.filter((a: Affiliate) => a.isActive).length;

  const totalPartnerEarnings = partners.reduce((sum: number, p: Partner) => 
    sum + parseFloat(p.totalEarnings || '0'), 0
  );
  const totalPartnerPending = partners.reduce((sum: number, p: Partner) => 
    sum + parseFloat(p.pendingEarnings || '0'), 0
  );
  const activePartners = partners.filter((p: Partner) => p.isActive).length;

  const pendingConversions = conversions.filter((c: Conversion) => c.status === 'pending').length;
  const totalCommissions = conversions.reduce((sum: number, c: Conversion) => 
    sum + parseFloat(c.commission || '0'), 0
  );

  // Filter affiliates based on search
  const filteredAffiliates = affiliates.filter((affiliate: Affiliate) =>
    affiliate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    affiliate.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter partners based on search
  const filteredPartners = partners.filter((partner: Partner) =>
    partner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    partner.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    partner.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Users className="w-5 h-5 text-green-500" />
              Afiliados Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">{activeAffiliates}</div>
            <p className="text-sm text-muted-foreground">de {affiliates.length} total</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <HandshakeIcon className="w-5 h-5 text-blue-500" />
              Parceiros Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-500">{activePartners}</div>
            <p className="text-sm text-muted-foreground">de {partners.length} total</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border-yellow-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              Comissões Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-500">
              R$ {(totalAffiliatePending + totalPartnerPending).toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground">{pendingConversions} conversões</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-purple-500" />
              Total Pago
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-500">
              R$ {(totalAffiliateEarnings + totalPartnerEarnings).toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground">em comissões</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          onClick={() => approvePendingCommissionsMutation.mutate('affiliate')}
          className="bg-green-600 hover:bg-green-700"
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          Aprovar Comissões Afiliados
        </Button>
        <Button
          onClick={() => approvePendingCommissionsMutation.mutate('partner')}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          Aprovar Comissões Parceiros
        </Button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Input
            placeholder="Buscar por nome, email ou código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="affiliates" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="affiliates">
            <Users className="w-4 h-4 mr-2" />
            Afiliados ({affiliates.length})
          </TabsTrigger>
          <TabsTrigger value="partners">
            <HandshakeIcon className="w-4 h-4 mr-2" />
            Parceiros ({partners.length})
          </TabsTrigger>
          <TabsTrigger value="conversions">
            <BarChart3 className="w-4 h-4 mr-2" />
            Conversões ({conversions.length})
          </TabsTrigger>
        </TabsList>

        {/* Affiliates Tab */}
        <TabsContent value="affiliates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gerenciamento de Afiliados</CardTitle>
              <CardDescription>
                Visualize e gerencie todos os afiliados cadastrados no sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Nível</TableHead>
                    <TableHead>Comissão</TableHead>
                    <TableHead>Total Ganho</TableHead>
                    <TableHead>Pendente</TableHead>
                    <TableHead>Parceiros</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAffiliates.map((affiliate: Affiliate) => {
                    const affiliatePartners = partners.filter((p: Partner) => p.affiliateId === affiliate.id);
                    return (
                      <TableRow key={affiliate.id}>
                        <TableCell>#{affiliate.id}</TableCell>
                        <TableCell className="font-medium">{affiliate.name}</TableCell>
                        <TableCell>{affiliate.email}</TableCell>
                        <TableCell>
                          <Badge className={
                            affiliate.affiliateLevel === 'diamante' ? 'bg-cyan-500' :
                            affiliate.affiliateLevel === 'ouro' ? 'bg-yellow-500' :
                            affiliate.affiliateLevel === 'prata' ? 'bg-gray-400' :
                            affiliate.affiliateLevel === 'bronze' ? 'bg-orange-600' :
                            'bg-green-500'
                          }>
                            {affiliate.affiliateLevel || 'Bronze'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {affiliate.commissionType === 'percentage' ? (
                            <span className="flex items-center gap-1">
                              <Percent className="w-3 h-3" />
                              {affiliate.customCommissionRate || affiliate.currentLevelRate}%
                            </span>
                          ) : (
                            <span>R$ {affiliate.customFixedAmount || '7.00'}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-green-500 font-semibold">
                          R$ {affiliate.totalEarnings}
                        </TableCell>
                        <TableCell className="text-yellow-500">
                          R$ {affiliate.pendingEarnings}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{affiliatePartners.length}</Badge>
                        </TableCell>
                        <TableCell>
                          {affiliate.isActive ? (
                            <Badge className="bg-green-500">Ativo</Badge>
                          ) : (
                            <Badge variant="destructive">Inativo</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedAffiliate(affiliate)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingAffiliate(affiliate)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Affiliate Details Modal */}
          {selectedAffiliate && (
            <Card>
              <CardHeader>
                <CardTitle>Detalhes do Afiliado: {selectedAffiliate.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Total de Cliques</Label>
                    <p className="text-2xl font-bold">{selectedAffiliate.totalClicks || 0}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Registros</Label>
                    <p className="text-2xl font-bold">{selectedAffiliate.totalRegistrations || 0}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Depósitos</Label>
                    <p className="text-2xl font-bold">{selectedAffiliate.totalDeposits || 0}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Taxa de Conversão</Label>
                    <p className="text-2xl font-bold">
                      {selectedAffiliate.totalClicks > 0 
                        ? ((selectedAffiliate.totalRegistrations / selectedAffiliate.totalClicks) * 100).toFixed(1)
                        : 0}%
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground">Parceiros Vinculados</Label>
                  <div className="mt-2 space-y-2">
                    {partners
                      .filter((p: Partner) => p.affiliateId === selectedAffiliate.id)
                      .map((partner: Partner) => (
                        <div key={partner.id} className="flex justify-between items-center p-2 bg-muted rounded">
                          <span>{partner.name} ({partner.code})</span>
                          <span className="text-green-500">R$ {partner.totalEarnings}</span>
                        </div>
                      ))}
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={() => setSelectedAffiliate(null)}
                  className="w-full"
                >
                  Fechar
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Partners Tab */}
        <TabsContent value="partners" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gerenciamento de Parceiros</CardTitle>
              <CardDescription>
                Visualize e gerencie todos os parceiros vinculados aos afiliados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Afiliado</TableHead>
                    <TableHead>Comissão</TableHead>
                    <TableHead>Total Ganho</TableHead>
                    <TableHead>Pendente</TableHead>
                    <TableHead>Conversões</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPartners.map((partner: Partner) => {
                    const affiliate = affiliates.find((a: Affiliate) => a.id === partner.affiliateId);
                    return (
                      <TableRow key={partner.id}>
                        <TableCell>#{partner.id}</TableCell>
                        <TableCell className="font-medium">{partner.name}</TableCell>
                        <TableCell>{partner.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{partner.code}</Badge>
                        </TableCell>
                        <TableCell>{affiliate?.name || 'N/A'}</TableCell>
                        <TableCell>
                          {partner.commissionType === 'percentage' ? (
                            <span className="flex items-center gap-1">
                              <Percent className="w-3 h-3" />
                              {partner.commissionRate}%
                            </span>
                          ) : (
                            <span>R$ {partner.fixedCommissionAmount}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-green-500 font-semibold">
                          R$ {partner.totalEarnings}
                        </TableCell>
                        <TableCell className="text-yellow-500">
                          R$ {partner.pendingEarnings}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{partner.totalRegistrations} registros</div>
                            <div>{partner.totalDeposits} depósitos</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {partner.isActive ? (
                            <Badge className="bg-green-500">Ativo</Badge>
                          ) : (
                            <Badge variant="destructive">Inativo</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedPartner(partner)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingPartner(partner)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Partner Details Modal */}
          {selectedPartner && (
            <Card>
              <CardHeader>
                <CardTitle>Detalhes do Parceiro: {selectedPartner.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Total de Cliques</Label>
                    <p className="text-2xl font-bold">{selectedPartner.totalClicks || 0}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Registros</Label>
                    <p className="text-2xl font-bold">{selectedPartner.totalRegistrations || 0}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Depósitos</Label>
                    <p className="text-2xl font-bold">{selectedPartner.totalDeposits || 0}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Taxa de Conversão</Label>
                    <p className="text-2xl font-bold">
                      {selectedPartner.totalClicks > 0 
                        ? ((selectedPartner.totalRegistrations / selectedPartner.totalClicks) * 100).toFixed(1)
                        : 0}%
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground">Afiliado Responsável</Label>
                  <div className="mt-2 p-3 bg-muted rounded">
                    {(() => {
                      const affiliate = affiliates.find((a: Affiliate) => a.id === selectedPartner.affiliateId);
                      return affiliate ? (
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{affiliate.name}</span>
                          <span className="text-muted-foreground">{affiliate.email}</span>
                        </div>
                      ) : (
                        <span>Afiliado não encontrado</span>
                      );
                    })()}
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={() => setSelectedPartner(null)}
                  className="w-full"
                >
                  Fechar
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Conversions Tab */}
        <TabsContent value="conversions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Conversões</CardTitle>
              <CardDescription>
                Todas as conversões de afiliados e parceiros
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Afiliado/Parceiro</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Comissão</TableHead>
                    <TableHead>Taxa</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conversions.slice(0, 100).map((conversion: Conversion) => {
                    const affiliate = conversion.affiliateId 
                      ? affiliates.find((a: Affiliate) => a.id === conversion.affiliateId)
                      : null;
                    const partner = conversion.partnerId
                      ? partners.find((p: Partner) => p.id === conversion.partnerId)
                      : null;
                    
                    return (
                      <TableRow key={conversion.id}>
                        <TableCell>#{conversion.id}</TableCell>
                        <TableCell>
                          {format(new Date(conversion.createdAt), "dd/MM/yy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={conversion.conversionType === 'registration' ? 'secondary' : 'default'}>
                            {conversion.conversionType === 'registration' ? 'Registro' : 'Depósito'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {partner ? (
                            <div>
                              <div className="font-medium text-blue-500">P: {partner.name}</div>
                              <div className="text-xs text-muted-foreground">({partner.code})</div>
                            </div>
                          ) : affiliate ? (
                            <div>
                              <div className="font-medium text-green-500">A: {affiliate.name}</div>
                              <div className="text-xs text-muted-foreground">{affiliate.affiliateLevel}</div>
                            </div>
                          ) : (
                            'N/A'
                          )}
                        </TableCell>
                        <TableCell>{conversion.userName || `User #${conversion.userId}`}</TableCell>
                        <TableCell className="font-semibold">R$ {conversion.conversionValue}</TableCell>
                        <TableCell className="font-semibold text-green-500">
                          R$ {conversion.commission}
                        </TableCell>
                        <TableCell>
                          {conversion.commissionRate ? `${conversion.commissionRate}%` : 'Fixo'}
                        </TableCell>
                        <TableCell>
                          {conversion.status === 'completed' ? (
                            <Badge className="bg-green-500">Pago</Badge>
                          ) : conversion.status === 'pending' ? (
                            <Badge className="bg-yellow-500">Pendente</Badge>
                          ) : (
                            <Badge variant="destructive">Cancelado</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}