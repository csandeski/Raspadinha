import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Edit,
  Trash2,
  Copy,
  BarChart3,
  MousePointer,
  Users,
  TrendingUp,
  Link,
  Instagram,
  MessageCircle,
  Youtube,
  Facebook,
  ExternalLink,
  QrCode,
  Eye,
  EyeOff
} from "lucide-react";
import { TbBrandTiktok } from "react-icons/tb";
import QRCode from "qrcode";

interface MarketingLink {
  id: number;
  name: string;
  source: string;
  url: string;
  shortCode: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  description: string;
  isActive: boolean;
  totalClicks: number;
  totalRegistrations: number;
  totalDeposits: number;
  conversionRate: string;
  createdAt: string;
  updatedAt: string;
}

const sourceIcons: Record<string, any> = {
  instagram: Instagram,
  tiktok: TbBrandTiktok,
  whatsapp: MessageCircle,
  youtube: Youtube,
  facebook: Facebook,
};

const sourceColors: Record<string, string> = {
  instagram: "bg-gradient-to-br from-purple-600 to-pink-500",
  tiktok: "bg-black",
  whatsapp: "bg-green-600",
  youtube: "bg-red-600",
  facebook: "bg-blue-600",
  outros: "bg-gray-600"
};

export function MarketingLinksManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editingLink, setEditingLink] = useState<MarketingLink | null>(null);
  const [showQrCode, setShowQrCode] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [selectedLink, setSelectedLink] = useState<MarketingLink | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    source: "instagram",
    utmSource: "",
    utmMedium: "social",
    utmCampaign: "",
    utmContent: "",
    description: "",
    isActive: true
  });

  // Fetch marketing links
  const { data: links = [], isLoading } = useQuery<MarketingLink[]>({
    queryKey: ["/api/admin/marketing-links"],
  });

  // Create link mutation
  const createLinkMutation = useMutation({
    mutationFn: (data: typeof formData) => 
      apiRequest("/api/admin/marketing-links", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/marketing-links"] });
      toast({
        title: "Link criado",
        description: "Link de marketing criado com sucesso!",
      });
      setShowDialog(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar link",
        variant: "destructive",
      });
    },
  });

  // Update link mutation
  const updateLinkMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: typeof formData }) => 
      apiRequest(`/api/admin/marketing-links/${id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/marketing-links"] });
      toast({
        title: "Link atualizado",
        description: "Link de marketing atualizado com sucesso!",
      });
      setShowDialog(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar link",
        variant: "destructive",
      });
    },
  });

  // Delete link mutation
  const deleteLinkMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/admin/marketing-links/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/marketing-links"] });
      toast({
        title: "Link excluído",
        description: "Link de marketing excluído com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir link",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      source: "instagram",
      utmSource: "",
      utmMedium: "social",
      utmCampaign: "",
      utmContent: "",
      description: "",
      isActive: true
    });
    setEditingLink(null);
  };

  const handleSubmit = () => {
    // Auto-fill UTM parameters if not provided
    const dataToSubmit = {
      ...formData,
      utmSource: formData.utmSource || formData.source,
      utmCampaign: formData.utmCampaign || formData.name.toLowerCase().replace(/\s+/g, '_')
    };

    if (editingLink) {
      updateLinkMutation.mutate({ id: editingLink.id, data: dataToSubmit });
    } else {
      createLinkMutation.mutate(dataToSubmit);
    }
  };

  const handleEdit = (link: MarketingLink) => {
    setEditingLink(link);
    setFormData({
      name: link.name,
      source: link.source,
      utmSource: link.utmSource || "",
      utmMedium: link.utmMedium || "social",
      utmCampaign: link.utmCampaign || "",
      utmContent: link.utmContent || "",
      description: link.description || "",
      isActive: link.isActive
    });
    setShowDialog(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir este link?")) {
      deleteLinkMutation.mutate(id);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Link copiado para a área de transferência",
    });
  };

  const generateQrCode = async (link: MarketingLink) => {
    try {
      const url = await QRCode.toDataURL(link.url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeUrl(url);
      setSelectedLink(link);
      setShowQrCode(true);
    } catch (error) {
      // Error handled in UI
      toast({
        title: "Erro",
        description: "Erro ao gerar QR Code",
        variant: "destructive",
      });
    }
  };

  const getSourceIcon = (source: string) => {
    const Icon = sourceIcons[source] || Link;
    return <Icon className="h-4 w-4" />;
  };

  const getSourceBadgeColor = (source: string) => {
    const colors: Record<string, string> = {
      instagram: "bg-gradient-to-r from-purple-500 to-pink-500",
      tiktok: "bg-black",
      whatsapp: "bg-green-500",
      youtube: "bg-red-500",
      facebook: "bg-blue-500",
    };
    return colors[source] || "bg-gray-500";
  };

  // Statistics cards
  const totalClicks = (links as MarketingLink[]).reduce((sum, link) => sum + link.totalClicks, 0);
  const totalRegistrations = (links as MarketingLink[]).reduce((sum, link) => sum + link.totalRegistrations, 0);
  const totalDeposits = (links as MarketingLink[]).reduce((sum, link) => sum + link.totalDeposits, 0);
  const avgConversionRate = links.length > 0 
    ? (totalRegistrations / (totalClicks || 1) * 100).toFixed(2) 
    : "0.00";

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
              <Link className="w-8 h-8 text-[#00E880]" />
            </motion.div>
            Links de Marketing
          </motion.h2>
          <p className="text-zinc-400">Gerencie links de rastreamento para suas campanhas</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Badges de status no header */}
          <div className="flex gap-2">
            <Badge variant="outline" className="border-[#00E880] text-[#00E880]">
              Total: {links.length || 0}
            </Badge>
            <Badge variant="outline" className="border-blue-500 text-blue-400">
              Ativos: {(links as MarketingLink[]).filter(l => l.isActive).length || 0}
            </Badge>
          </div>
          <Button onClick={() => { resetForm(); setShowDialog(true); }} className="bg-[#00E880] hover:bg-[#00E880]/80 text-black">
            <Plus className="h-4 w-4 mr-2" />
            Novo Link
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
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
                  <p className="text-zinc-400 text-sm mb-1">Cliques Totais</p>
                  <p className="text-3xl font-bold text-white">
                    <CountUp end={totalClicks} duration={1.5} separator="." />
                  </p>
                  <p className="text-xs text-blue-400 mt-2">Total de cliques</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl">
                  <MousePointer className="w-6 h-6 text-blue-400" />
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
                  <p className="text-zinc-400 text-sm mb-1">Cadastros</p>
                  <p className="text-3xl font-bold text-white">
                    <CountUp end={totalRegistrations} duration={1.5} separator="." />
                  </p>
                  <p className="text-xs text-[#00E880] mt-2">Conversões totais</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-[#00E880]/20 to-[#00E880]/30 rounded-xl">
                  <Users className="w-6 h-6 text-[#00E880]" />
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
                  <p className="text-zinc-400 text-sm mb-1">Depósitos</p>
                  <p className="text-3xl font-bold text-white">
                    <CountUp end={totalDeposits} duration={1.5} separator="." />
                  </p>
                  <p className="text-xs text-purple-400 mt-2">Depósitos realizados</p>
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
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-zinc-400 text-sm mb-1">Taxa de Conversão</p>
                  <p className="text-3xl font-bold text-white">
                    <CountUp end={parseFloat(avgConversionRate)} duration={1.5} decimals={2} suffix="%" />
                  </p>
                  <p className="text-xs text-orange-400 mt-2">Média geral</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-xl">
                  <BarChart3 className="w-6 h-6 text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Links Table */}
      <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900/50">
                <TableHead className="text-zinc-400 font-semibold uppercase tracking-wider text-xs">Status</TableHead>
                <TableHead className="text-zinc-400 font-semibold uppercase tracking-wider text-xs">Nome</TableHead>
                <TableHead className="text-zinc-400 font-semibold uppercase tracking-wider text-xs">Fonte</TableHead>
                <TableHead className="text-zinc-400 font-semibold uppercase tracking-wider text-xs">Link</TableHead>
                <TableHead className="text-center text-zinc-400 font-semibold uppercase tracking-wider text-xs">Cliques</TableHead>
                <TableHead className="text-center text-zinc-400 font-semibold uppercase tracking-wider text-xs">Cadastros</TableHead>
                <TableHead className="text-center text-zinc-400 font-semibold uppercase tracking-wider text-xs">Taxa</TableHead>
                <TableHead className="text-zinc-400 font-semibold uppercase tracking-wider text-xs">Criado em</TableHead>
                <TableHead className="text-right text-zinc-400 font-semibold uppercase tracking-wider text-xs">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    Carregando links...
                  </TableCell>
                </TableRow>
              ) : (links as MarketingLink[]).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    Nenhum link criado ainda
                  </TableCell>
                </TableRow>
              ) : (
                (links as MarketingLink[]).map((link) => (
                  <TableRow key={link.id} className="border-zinc-800 hover:bg-zinc-900/50 transition-colors">
                    <TableCell>
                      {link.isActive ? (
                        <Badge className="bg-green-500/90 hover:bg-green-500 text-white border-0">
                          <Eye className="h-3 w-3 mr-1" />
                          Ativo
                        </Badge>
                      ) : (
                        <Badge className="bg-zinc-700 hover:bg-zinc-600 text-zinc-300 border-0">
                          <EyeOff className="h-3 w-3 mr-1" />
                          Inativo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-white">{link.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded ${getSourceBadgeColor(link.source)} text-white`}>
                          {getSourceIcon(link.source)}
                        </div>
                        <span className="capitalize text-zinc-300">{link.source}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded">
                          src={link.shortCode}
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(link.url)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                        {link.totalClicks}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                        {link.totalRegistrations}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                        {link.conversionRate}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-zinc-400">
                      {new Date(link.createdAt).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => generateQrCode(link)}
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(link.url, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(link)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(link.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl bg-black/50 border-zinc-800 backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingLink ? "Editar Link de Marketing" : "Criar Novo Link de Marketing"}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Crie links rastreáveis para suas campanhas de marketing
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name" className="text-zinc-200">Nome da Campanha</Label>
                <Input
                  id="name"
                  placeholder="Ex: Black Friday Instagram"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-400"
                />
              </div>
              <div>
                <Label htmlFor="source" className="text-zinc-200">Fonte de Tráfego</Label>
                <Select
                  value={formData.source}
                  onValueChange={(value) => setFormData({ ...formData, source: value })}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="description" className="text-zinc-200">Descrição (opcional)</Label>
              <Textarea
                id="description"
                placeholder="Descreva o objetivo desta campanha..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-400"
              />
            </div>

            <div className="space-y-4 border-t border-zinc-700 pt-4">
              <h3 className="font-medium text-zinc-200">Parâmetros UTM (Avançado)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="utmSource" className="text-zinc-200">UTM Source</Label>
                  <Input
                    id="utmSource"
                    placeholder="Auto: usa a fonte selecionada"
                    value={formData.utmSource}
                    onChange={(e) => setFormData({ ...formData, utmSource: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-400"
                  />
                </div>
                <div>
                  <Label htmlFor="utmMedium" className="text-zinc-200">UTM Medium</Label>
                  <Input
                    id="utmMedium"
                    placeholder="social"
                    value={formData.utmMedium}
                    onChange={(e) => setFormData({ ...formData, utmMedium: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-400"
                  />
                </div>
                <div>
                  <Label htmlFor="utmCampaign" className="text-zinc-200">UTM Campaign</Label>
                  <Input
                    id="utmCampaign"
                    placeholder="Auto: usa o nome da campanha"
                    value={formData.utmCampaign}
                    onChange={(e) => setFormData({ ...formData, utmCampaign: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-400"
                  />
                </div>
                <div>
                  <Label htmlFor="utmContent" className="text-zinc-200">UTM Content</Label>
                  <Input
                    id="utmContent"
                    placeholder="Opcional"
                    value={formData.utmContent}
                    onChange={(e) => setFormData({ ...formData, utmContent: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-400"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-zinc-700 pt-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive" className="text-zinc-200">Link ativo</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} className="border-zinc-700 text-zinc-200 hover:bg-zinc-800">
              Cancelar
            </Button>
            <Button onClick={handleSubmit} className="bg-[#00E880] hover:bg-[#00E880]/80 text-black">
              {editingLink ? "Salvar Alterações" : "Criar Link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={showQrCode} onOpenChange={setShowQrCode}>
        <DialogContent className="bg-black/50 border-zinc-800 backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle className="text-white">QR Code - {selectedLink?.name}</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Escaneie ou baixe o QR Code para compartilhar
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center space-y-4 py-4">
            {qrCodeUrl && (
              <>
                <img src={qrCodeUrl} alt="QR Code" className="border rounded" />
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    className="border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = qrCodeUrl;
                      a.download = `qrcode-${selectedLink?.shortCode}.png`;
                      a.click();
                    }}
                  >
                    Baixar QR Code
                  </Button>
                  <Button onClick={() => copyToClipboard(selectedLink?.url || '')} className="bg-[#00E880] hover:bg-[#00E880]/80 text-black">
                    Copiar Link
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}