import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import {
  Plus,
  Edit,
  Trash2,
  Copy,
  Calendar,
  DollarSign,
  Users,
  Activity,
  X,
  Check,
  AlertCircle,
  Ticket,
  PercentIcon,
  Gift,
  Tag,
  TrendingUp,
  CheckCircle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

interface Coupon {
  id: number;
  code: string;
  description: string;
  bonusType: 'raspadinhas' | 'percentage';
  bonusAmount: number;
  minDeposit: string;
  usageLimit: number | null;
  perUserLimit: number;
  usageCount: number;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  statistics?: {
    totalUses: number;
    uniqueUsers: number;
    totalDeposits: string;
    remainingUses: number | null;
  };
}

interface CouponUse {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  depositId: number;
  depositAmount: string;
  usedAt: string;
}

export function CouponsManagement() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isUsesOpen, setIsUsesOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [selectedCouponUses, setSelectedCouponUses] = useState<CouponUse[]>([]);
  
  // Form state for create/edit
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    minDeposit: '',
    usageLimit: '',
    perUserLimit: '1',
    expiresAt: ''
  });

  // Fetch coupons
  const { data: coupons, isLoading, refetch } = useQuery({
    queryKey: ['/api/admin/coupons'],
    queryFn: () => apiRequest('/api/admin/coupons'),
  });

  // Create coupon mutation
  const createCouponMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/admin/coupons', 'POST', data),
    onSuccess: () => {
      toast({
        title: "Cupom criado com sucesso!",
        description: "O novo cupom está disponível para uso.",
      });
      setIsCreateOpen(false);
      resetForm();
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar cupom",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update coupon mutation
  const updateCouponMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest(`/api/admin/coupons/${id}`, 'PUT', data),
    onSuccess: () => {
      toast({
        title: "Cupom atualizado com sucesso!",
      });
      setIsEditOpen(false);
      resetForm();
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar cupom",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete coupon mutation
  const deleteCouponMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/admin/coupons/${id}`, 'DELETE'),
    onSuccess: () => {
      toast({
        title: "Cupom excluído com sucesso!",
      });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir cupom",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Fetch coupon uses
  const fetchCouponUses = async (couponId: number) => {
    try {
      const data = await apiRequest(`/api/admin/coupons/${couponId}/uses`);
      setSelectedCouponUses(data.uses || []);
    } catch (error) {
      toast({
        title: "Erro ao buscar usos do cupom",
        description: "Não foi possível carregar os detalhes de uso.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      minDeposit: '',
      usageLimit: '',
      perUserLimit: '1',
      expiresAt: ''
    });
    setSelectedCoupon(null);
  };

  const handleCreate = () => {
    const data = {
      ...formData,
      minDeposit: parseFloat(formData.minDeposit),
      usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
      perUserLimit: parseInt(formData.perUserLimit),
      expiresAt: formData.expiresAt || null
    };
    createCouponMutation.mutate(data);
  };

  const handleUpdate = () => {
    if (!selectedCoupon) return;
    
    const data = {
      description: formData.description,
      minDeposit: parseFloat(formData.minDeposit),
      usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
      perUserLimit: parseInt(formData.perUserLimit),
      expiresAt: formData.expiresAt || null,
      isActive: selectedCoupon.isActive
    };
    
    updateCouponMutation.mutate({ id: selectedCoupon.id, data });
  };

  const toggleCouponStatus = (coupon: Coupon) => {
    updateCouponMutation.mutate({
      id: coupon.id,
      data: { isActive: !coupon.isActive }
    });
  };

  const openEditDialog = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setFormData({
      code: coupon.code,
      description: coupon.description,
      minDeposit: coupon.minDeposit,
      usageLimit: coupon.usageLimit?.toString() || '',
      perUserLimit: coupon.perUserLimit.toString(),
      expiresAt: coupon.expiresAt ? format(new Date(coupon.expiresAt), 'yyyy-MM-dd') : ''
    });
    setIsEditOpen(true);
  };

  const openUsesDialog = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    fetchCouponUses(coupon.id);
    setIsUsesOpen(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Código copiado!",
      description: `${text} foi copiado para a área de transferência.`,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-zinc-400">Carregando cupons...</div>
      </div>
    );
  }

  // Calculate stats
  const activeCoupons = coupons?.filter((c: Coupon) => c.isActive).length || 0;
  const totalUses = coupons?.reduce((sum: number, c: Coupon) => sum + c.usageCount, 0) || 0;
  const totalValue = coupons?.reduce((sum: number, c: Coupon) => sum + (c.statistics?.totalDeposits ? parseFloat(c.statistics.totalDeposits) : 0), 0) || 0;

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
            Gerenciamento de Cupons
          </motion.h2>
          <p className="text-zinc-400">Gerencie cupons de desconto e promoções</p>
        </div>
        
        {/* Badges de status no header */}
        <div className="flex gap-2">
          <Badge variant="outline" className="border-[#00E880] text-[#00E880]">
            Total: {coupons?.length || 0}
          </Badge>
          {activeCoupons > 0 && (
            <Badge variant="outline" className="border-green-500 text-green-400">
              Ativos: {activeCoupons}
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
                  <p className="text-zinc-400 text-sm mb-1">Cupons Ativos</p>
                  <p className="text-3xl font-bold text-white">
                    <CountUp end={activeCoupons} duration={1.5} />
                  </p>
                  <p className="text-xs text-green-400 mt-2">
                    De {coupons?.length || 0} total
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-br from-[#00E880]/20 to-[#00E880]/30 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-[#00E880]" />
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
                  <p className="text-zinc-400 text-sm mb-1">Total de Usos</p>
                  <p className="text-3xl font-bold text-white">
                    <CountUp end={totalUses} duration={1.5} />
                  </p>
                  <p className="text-xs text-purple-400 mt-2">
                    Cupons utilizados
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl">
                  <Activity className="w-6 h-6 text-purple-400" />
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
                  <p className="text-zinc-400 text-sm mb-1">Valor Gerado</p>
                  <p className="text-3xl font-bold text-white">
                    R$ <CountUp end={totalValue} duration={1.5} decimals={2} separator="." decimal="," />
                  </p>
                  <p className="text-xs text-blue-400 mt-2">
                    Em depósitos
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl">
                  <DollarSign className="w-6 h-6 text-blue-400" />
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
          <Card className="bg-gradient-to-br from-orange-600 to-orange-700 border-0 shadow-xl">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-orange-100 text-sm mb-1">Taxa de Conversão</p>
                  <p className="text-3xl font-bold text-white">
                    <CountUp end={coupons?.length ? (totalUses / coupons.length * 100) : 0} duration={1.5} decimals={1} />%
                  </p>
                  <p className="text-orange-200 text-xs mt-2">
                    Média de uso
                  </p>
                </div>
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Actions and Table */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Cupons Cadastrados</CardTitle>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#00E880] hover:bg-[#00D470] text-black font-semibold">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Cupom
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-900 border-zinc-800">
                <DialogHeader>
                  <DialogTitle className="text-white">Criar Novo Cupom</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="code" className="text-zinc-300">Código do Cupom</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="SORTE2025"
                      className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description" className="text-zinc-300">Descrição</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Bônus de boas-vindas para novos usuários"
                      className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                    />
                  </div>

                  <div>
                    <Label htmlFor="minDeposit" className="text-zinc-300">Depósito Mínimo (R$)</Label>
                    <Input
                      id="minDeposit"
                      type="number"
                      step="0.01"
                      value={formData.minDeposit}
                      onChange={(e) => setFormData({ ...formData, minDeposit: e.target.value })}
                      placeholder="10.00"
                      className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                    />
                    <p className="text-xs text-zinc-500 mt-1">
                      Bônus automático: R$15=1, R$20=3, R$30=6, R$40=12, R$50=24, R$60=30, R$80=45, R$100=60, R$150=100, R$200=150, R$300+=250 raspadinhas
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="usageLimit" className="text-zinc-300">Limite de Uso Total (vazio = ilimitado)</Label>
                    <Input
                      id="usageLimit"
                      type="number"
                      value={formData.usageLimit}
                      onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                      placeholder="100"
                      className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="perUserLimit" className="text-zinc-300">Limite por Usuário</Label>
                    <Input
                      id="perUserLimit"
                      type="number"
                      value={formData.perUserLimit}
                      onChange={(e) => setFormData({ ...formData, perUserLimit: e.target.value })}
                      placeholder="1"
                      className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="expiresAt" className="text-zinc-300">Data de Expiração (opcional)</Label>
                    <Input
                      id="expiresAt"
                      type="date"
                      value={formData.expiresAt}
                      onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                    />
                  </div>
                </div>
                <DialogFooter className="border-t border-zinc-800 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsCreateOpen(false)}
                    className="border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleCreate} 
                    disabled={createCouponMutation.isPending}
                    className="bg-[#00E880] hover:bg-[#00D470] text-black font-semibold"
                  >
                    {createCouponMutation.isPending ? "Criando..." : "Criar Cupom"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800">
                  <TableHead className="text-zinc-400">Código</TableHead>
                  <TableHead className="text-zinc-400">Descrição</TableHead>
                  <TableHead className="text-zinc-400">Tipo de Bônus</TableHead>
                  <TableHead className="text-zinc-400">Depósito Mín.</TableHead>
                  <TableHead className="text-zinc-400">Usos</TableHead>
                  <TableHead className="text-zinc-400">Status</TableHead>
                  <TableHead className="text-zinc-400">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons?.map((coupon: Coupon) => (
                  <TableRow key={coupon.id} className="border-zinc-800 hover:bg-zinc-800/50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#00E880]">{coupon.code}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(coupon.code)}
                          className="hover:bg-zinc-700"
                        >
                          <Copy className="w-3 h-3 text-zinc-400" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-white">{coupon.description}</TableCell>
                    <TableCell>
                      <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/50">
                        <Ticket className="w-3 h-3 mr-1" />
                        Raspadinhas por faixa
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white">R$ {coupon.minDeposit}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-white">{coupon.statistics?.totalUses || 0} usos</span>
                        {coupon.usageLimit && (
                          <span className="text-xs text-zinc-500">
                            Limite: {coupon.usageLimit}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={coupon.isActive 
                        ? "bg-green-600/20 text-green-400 border-green-600/50" 
                        : "bg-zinc-700 text-zinc-400 border-zinc-600"
                      }>
                        {coupon.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(coupon)}
                          className="border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleCouponStatus(coupon)}
                          className="border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600"
                        >
                          {coupon.isActive ? (
                            <X className="w-3 h-3 text-red-400" />
                          ) : (
                            <Check className="w-3 h-3 text-green-400" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openUsesDialog(coupon)}
                          className="border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600"
                        >
                          <Users className="w-3 h-3" />
                        </Button>
                        {coupon.statistics?.totalUses === 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteCouponMutation.mutate(coupon.id)}
                            disabled={deleteCouponMutation.isPending}
                            className="border-zinc-700 hover:bg-red-600/20 hover:border-red-600/50 hover:text-red-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Editar Cupom</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-zinc-300">Código do Cupom</Label>
              <Input 
                value={formData.code} 
                disabled 
                className="bg-zinc-800 border-zinc-700 text-white disabled:opacity-50"
              />
            </div>
            <div>
              <Label htmlFor="edit-description" className="text-zinc-300">Descrição</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
              />
            </div>

            <div>
              <Label htmlFor="edit-minDeposit" className="text-zinc-300">Depósito Mínimo (R$)</Label>
              <Input
                id="edit-minDeposit"
                type="number"
                step="0.01"
                value={formData.minDeposit}
                onChange={(e) => setFormData({ ...formData, minDeposit: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
              />
              <p className="text-xs text-zinc-500 mt-1">
                Bônus automático: R$15=1, R$20=3, R$30=6, R$40=12, R$50=24, R$60=30, R$80=45, R$100=60, R$150=100, R$200=150, R$300+=250 raspadinhas
              </p>
            </div>
            <div>
              <Label htmlFor="edit-usageLimit" className="text-zinc-300">Limite de Uso Total (vazio = ilimitado)</Label>
              <Input
                id="edit-usageLimit"
                type="number"
                value={formData.usageLimit}
                onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
              />
            </div>
            <div>
              <Label htmlFor="edit-perUserLimit" className="text-zinc-300">Limite por Usuário</Label>
              <Input
                id="edit-perUserLimit"
                type="number"
                value={formData.perUserLimit}
                onChange={(e) => setFormData({ ...formData, perUserLimit: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
              />
            </div>
            <div>
              <Label htmlFor="edit-expiresAt" className="text-zinc-300">Data de Expiração (opcional)</Label>
              <Input
                id="edit-expiresAt"
                type="date"
                value={formData.expiresAt}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
              />
            </div>
          </div>
          <DialogFooter className="border-t border-zinc-800 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsEditOpen(false)}
              className="border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleUpdate} 
              disabled={updateCouponMutation.isPending}
              className="bg-[#00E880] hover:bg-[#00D470] text-black font-semibold"
            >
              {updateCouponMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Uses Dialog */}
      <Dialog open={isUsesOpen} onOpenChange={setIsUsesOpen}>
        <DialogContent className="max-w-4xl bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">
              Usos do Cupom {selectedCoupon?.code}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800">
                  <TableHead className="text-zinc-400">Usuário</TableHead>
                  <TableHead className="text-zinc-400">Email</TableHead>
                  <TableHead className="text-zinc-400">Valor do Depósito</TableHead>
                  <TableHead className="text-zinc-400">Data de Uso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedCouponUses.length === 0 ? (
                  <TableRow className="border-zinc-800">
                    <TableCell colSpan={4} className="text-center text-zinc-500">
                      Nenhum uso registrado para este cupom
                    </TableCell>
                  </TableRow>
                ) : (
                  selectedCouponUses.map((use) => (
                    <TableRow key={use.id} className="border-zinc-800 hover:bg-zinc-800/50">
                      <TableCell className="text-white">{use.userName}</TableCell>
                      <TableCell className="text-white">{use.userEmail}</TableCell>
                      <TableCell className="text-white">R$ {use.depositAmount}</TableCell>
                      <TableCell className="text-white">
                        {format(new Date(use.usedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}