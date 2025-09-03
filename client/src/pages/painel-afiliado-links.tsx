import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AffiliateLayout } from "@/components/affiliate/affiliate-layout";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import QRCode from "qrcode";
import { 
  Link2,
  Copy,
  QrCode,
  Share2,
  Download,
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  MousePointerClick,
  Mouse,
  Users,
  UserPlus,
  TrendingUp,
  Calendar,
  Filter,
  Search,
  DollarSign,
  X,
  Settings,
  Facebook
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { apiRequest } from "@/lib/queryClient";
import { formatBRL, formatNumber } from "@/lib/format";
import { formatZeroValue, formatStatValue } from "@/lib/format-zero-values";

export function PainelAfiliadoLinks() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDeposits, setFilterDeposits] = useState("all");
  const [qrCodeData, setQrCodeData] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPixelModalOpen, setIsPixelModalOpen] = useState(false);
  const [selectedCodeForPixel, setSelectedCodeForPixel] = useState<any>(null);
  const [pixelId, setPixelId] = useState("");
  const [newLinkData, setNewLinkData] = useState({
    code: "",
    name: "",
    utm_source: "",
    utm_medium: "",
    utm_campaign: "",
    utm_content: "",
    utm_term: ""
  });

  const baseUrl = "https://mania-brasil.com";
  
  // Fetch affiliate codes from API with real-time updates
  const { data: codes = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/affiliate/codes'],
    queryFn: async () => {
      const token = localStorage.getItem('affiliateToken');
      const response = await fetch(`/api/affiliate/codes?t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch codes');
      const data = await response.json();
      return data;
    },
    refetchInterval: 5000, // Real-time updates every 5 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    staleTime: 0,
    gcTime: 0
  });

  // Create code mutation
  const createCodeMutation = useMutation({
    mutationFn: async (data: { code: string; name: string }) => {
      // Check if code starts with 'AFF' (case insensitive)
      if (data.code.toUpperCase().startsWith('AFF')) {
        throw new Error("Códigos iniciados com 'AFF' são exclusivos para clientes!");
      }
      
      const token = localStorage.getItem('affiliateToken');
      const response = await fetch('/api/affiliate/codes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create code');
      }
      return response.json();
    },
    onSuccess: async (data) => {
      
      // Reset form first
      setIsCreateModalOpen(false);
      setNewLinkData({
        code: "",
        name: "",
        utm_source: "",
        utm_medium: "",
        utm_campaign: "",
        utm_content: "",
        utm_term: ""
      });
      
      // Show success message
      toast({
        title: "Código criado!",
        description: "Seu novo código foi criado com sucesso",
        duration: 3000
      });
      
      // Update list without page reload
      await queryClient.setQueryData(['/api/affiliate/codes'], (oldData: any) => {
        const newCodes = oldData ? [...oldData] : [];
        // Add the new code at the beginning
        newCodes.unshift(data.code);
        return newCodes;
      });
      
      // Also invalidate to ensure fresh data on next fetch
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/codes'] });
    },
    onError: (error: any) => {
      // Check for specific error types
      const message = error.message?.toLowerCase();
      let description = "Não foi possível criar o código";
      
      if (message?.includes("ras") && message?.includes("reservados")) {
        description = "Códigos iniciados com 'RAS' são exclusivos para clientes diretos!";
      } else if (message?.includes("já está em uso") || message?.includes("already exists")) {
        description = "Este código já existe! Escolha um código diferente.";
      } else if (message?.includes("3-20 caracteres")) {
        description = "O código deve ter entre 3 e 20 caracteres alfanuméricos";
      } else if (error.message) {
        description = error.message;
      }
      
      toast({
        title: "Erro ao criar código",
        description,
        variant: "destructive",
        duration: 5000
      });
    }
  });

  // Update pixel mutation
  const updatePixelMutation = useMutation({
    mutationFn: async (data: { codeId: number; pixelId: string }) => {
      const token = localStorage.getItem('affiliateToken');
      const response = await fetch(`/api/affiliate/codes/${data.codeId}/pixel`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ pixelId: data.pixelId })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update pixel ID');
      }
      return response.json();
    },
    onSuccess: async (data) => {
      
      // Reset form and close modal
      setIsPixelModalOpen(false);
      setSelectedCodeForPixel(null);
      setPixelId("");
      
      // Force immediate refetch to get updated data
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/codes'] });
      await refetch();
      
      toast({
        title: "Pixel configurado!",
        description: data.message || "Facebook Pixel ID foi configurado com sucesso"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao configurar pixel",
        description: error.message || "Não foi possível configurar o Pixel ID",
        variant: "destructive"
      });
    }
  });

  // Delete code mutation
  const deleteCodeMutation = useMutation({
    mutationFn: async (id: number) => {
      const token = localStorage.getItem('affiliateToken');
      const response = await fetch(`/api/affiliate/codes/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete code');
      }
      return response.json();
    },
    onSuccess: () => {
      // Immediate refetch after deletion
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/codes'] });
      refetch();
      toast({
        title: "Código deletado!",
        description: "O código foi removido com sucesso"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao deletar código",
        description: error.message || "Não foi possível deletar o código",
        variant: "destructive"
      });
    }
  });

  const handleCopyLink = (code: string) => {
    const url = `${baseUrl}/?ref=${code}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copiado!",
      description: "Link copiado para a área de transferência"
    });
  };

  const handleGenerateQR = async (code: string) => {
    try {
      const url = `${baseUrl}/?ref=${code}`;
      const qrCodeDataUrl = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeData(qrCodeDataUrl);
    } catch (error) {
      toast({
        title: "Erro ao gerar QR Code",
        description: "Não foi possível gerar o QR Code",
        variant: "destructive"
      });
    }
  };

  const handleCreateCode = () => {
    if (!newLinkData.code) {
      toast({
        title: "Código obrigatório",
        description: "Por favor, insira um código para o link",
        variant: "destructive"
      });
      return;
    }

    createCodeMutation.mutate({
      code: newLinkData.code,
      name: newLinkData.name || newLinkData.code
    });
  };

  const handleDeleteCode = (id: number, totalRegistrations: number) => {
    if (totalRegistrations > 0) {
      toast({
        title: "Não é possível deletar",
        description: "Este código já possui cadastros associados",
        variant: "destructive"
      });
      return;
    }
    
    deleteCodeMutation.mutate(id);
  };

  const handleOpenPixelModal = (code: any) => {
    setSelectedCodeForPixel(code);
    setPixelId(code.facebookPixelId || "");
    setIsPixelModalOpen(true);
  };

  const handleUpdatePixel = () => {
    if (!selectedCodeForPixel) return;

    // Enhanced security validation for Facebook Pixel ID
    if (pixelId && pixelId.trim() !== "") {
      const cleanPixelId = pixelId.trim();
      
      // Security check 1: Remove any non-numeric characters
      const sanitizedPixelId = cleanPixelId.replace(/[^0-9]/g, '');
      
      // Security check 2: Detect if non-numeric characters were present (potential XSS attempt)
      if (sanitizedPixelId !== cleanPixelId) {
        toast({
          title: "Segurança: ID inválido",
          description: "Detectado caracteres inválidos. Use apenas números do Facebook Business Manager",
          variant: "destructive"
        });
        return;
      }
      
      // Security check 3: Validate exact format (15-16 digits only)
      if (!/^\d{15,16}$/.test(sanitizedPixelId)) {
        toast({
          title: "Formato inválido",
          description: "O Pixel ID do Facebook deve ter exatamente 15 ou 16 dígitos",
          variant: "destructive"
        });
        return;
      }
      
      // Security check 4: Detect suspicious patterns (all zeros, sequential, etc)
      if (/^0+$/.test(sanitizedPixelId) || 
          /^(\d)\1+$/.test(sanitizedPixelId) || 
          sanitizedPixelId === '123456789012345' ||
          sanitizedPixelId === '1234567890123456') {
        toast({
          title: "ID suspeito detectado",
          description: "Use um Pixel ID real do seu Facebook Business Manager",
          variant: "destructive"
        });
        return;
      }
      
      // Security check 5: Basic check for reasonable Facebook Pixel ID pattern
      // Most real Facebook Pixel IDs don't start with 0 and have varied digits
      if (sanitizedPixelId.startsWith('0')) {
        toast({
          title: "ID possivelmente inválido",
          description: "Verifique se este é um Pixel ID válido do Facebook",
          variant: "destructive"
        });
        return;
      }
    }

    updatePixelMutation.mutate({
      codeId: selectedCodeForPixel.id,
      pixelId: pixelId.trim()
    });
  };

  // Apply filters
  const filteredCodes = codes.filter((code: any) => {
    // Search filter
    const matchesSearch = searchTerm === "" || 
      code.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (code.name && code.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Status filter
    const matchesStatus = filterStatus === "all" || 
      (filterStatus === "active" && code.totalRegistrations > 0) ||
      (filterStatus === "inactive" && code.totalRegistrations === 0);
    
    // Deposits filter
    const matchesDeposits = filterDeposits === "all" || 
      (filterDeposits === "with" && (code.completedDeposits > 0 || code.pendingDeposits > 0)) ||
      (filterDeposits === "without" && code.completedDeposits === 0 && code.pendingDeposits === 0);
    
    return matchesSearch && matchesStatus && matchesDeposits;
  });
  
  // Check if any filters are active
  const hasActiveFilters = searchTerm !== "" || filterStatus !== "all" || filterDeposits !== "all";
  
  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setFilterStatus("all");
    setFilterDeposits("all");
  };

  return (
    <AffiliateLayout activeSection="links">
      <div className="space-y-6">
        {/* Animated Background Elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-[#00E880]/10 to-transparent rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-600/10 to-transparent rounded-full blur-3xl animate-pulse delay-700" />
        </div>

        {/* Compact Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-gray-900/50 to-gray-950/50 backdrop-blur-sm rounded-xl md:rounded-2xl p-4 md:p-6 mb-4 md:mb-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 md:p-3 bg-gray-800 rounded-xl">
                <Link2 className="w-5 h-5 md:w-6 md:h-6 text-gray-400" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold text-white">Meus Links</h1>
                <p className="text-gray-400 text-xs md:text-sm">Crie e gerencie seus links de rastreamento personalizados</p>
              </div>
            </div>
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-[#00E880] text-black hover:opacity-90 rounded-xl">
                    <Plus className="w-4 h-4 mr-2" />
                    <span className="hidden md:inline">Criar Novo Link</span>
                    <span className="md:hidden">Novo Link</span>
                  </Button>
                </DialogTrigger>
            <DialogContent className="bg-gray-950 border border-gray-700">
              <DialogHeader>
                <DialogTitle className="text-white">Criar Novo Código de Afiliado</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Crie um código único para rastrear seus links
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label className="text-gray-300">Código *</Label>
                  <Input
                    value={newLinkData.code}
                    onChange={(e) => setNewLinkData({...newLinkData, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')})}
                    placeholder="Ex: INSTA2025"
                    className="bg-gray-900 border-gray-700 text-white"
                    maxLength={20}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Apenas letras e números, 3-20 caracteres
                  </p>
                </div>
                <div>
                  <Label className="text-gray-300">Nome do Link (opcional)</Label>
                  <Input
                    value={newLinkData.name}
                    onChange={(e) => setNewLinkData({...newLinkData, name: e.target.value})}
                    placeholder="Ex: Instagram Stories Janeiro"
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                </div>
                <div className="pt-4 flex gap-3 justify-end">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsCreateModalOpen(false)}
                    className="border-gray-700 text-gray-300 hover:bg-gray-900"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleCreateCode}
                    disabled={createCodeMutation.isPending}
                    className="bg-[#00E880] text-black hover:opacity-90"
                  >
                    {createCodeMutation.isPending ? 'Criando...' : 'Criar Código'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          {/* Facebook Pixel Configuration Modal */}
          <Dialog open={isPixelModalOpen} onOpenChange={setIsPixelModalOpen}>
            <DialogContent className="bg-gray-950 border border-gray-700">
              <DialogHeader>
                <DialogTitle className="text-white flex items-center gap-2">
                  <Facebook className="w-5 h-5 text-blue-500" />
                  Configurar Facebook Pixel
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  Configure o Facebook Pixel para rastrear conversões do link: {selectedCodeForPixel?.code}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label className="text-gray-300">Facebook Pixel ID</Label>
                  <Input
                    value={pixelId}
                    onChange={(e) => {
                      // Security: Only allow numeric input
                      const value = e.target.value;
                      const numericOnly = value.replace(/[^0-9]/g, '');
                      
                      // Warn if non-numeric characters were attempted
                      if (value !== numericOnly && value.length > 0) {
                        toast({
                          title: "Apenas números",
                          description: "Por segurança, apenas números são permitidos",
                          variant: "destructive",
                          duration: 2000
                        });
                      }
                      
                      setPixelId(numericOnly);
                    }}
                    placeholder="Ex: 687394582716489"
                    className="bg-gray-900 border-gray-700 text-white font-mono"
                    maxLength={16}
                    pattern="[0-9]*"
                    inputMode="numeric"
                    title="Digite apenas números do Facebook Pixel ID"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Digite o ID do seu Facebook Pixel (15-16 dígitos).
                    {pixelId && pixelId.length > 0 && (
                      <span className={pixelId.length >= 15 && pixelId.length <= 16 ? 'text-green-400' : 'text-yellow-400'}>
                        {' '}({pixelId.length} dígitos)
                      </span>
                    )}
                  </p>
                  <div className="mt-3 p-3 bg-gray-900 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-300 mb-2">Como encontrar seu Pixel ID:</h4>
                    <ol className="text-xs text-gray-500 space-y-1">
                      <li>1. Acesse o Facebook Business Manager</li>
                      <li>2. Vá em Eventos &gt; Pixels</li>
                      <li>3. Copie o ID do seu pixel (números apenas)</li>
                    </ol>
                  </div>
                </div>
                {selectedCodeForPixel?.facebookPixelId && (
                  <div className="p-3 bg-blue-900/20 rounded-lg border border-blue-500/30">
                    <p className="text-sm text-blue-400">
                      <Facebook className="w-4 h-4 inline mr-2" />
                      Pixel atual: {selectedCodeForPixel.facebookPixelId}
                    </p>
                  </div>
                )}
                <div className="pt-4 flex gap-3 justify-between">
                  <div>
                    {selectedCodeForPixel?.facebookPixelId && (
                      <Button 
                        variant="destructive"
                        onClick={() => {
                          // Directly call the mutation with empty pixelId to remove
                          updatePixelMutation.mutate({
                            codeId: selectedCodeForPixel.id,
                            pixelId: ""
                          });
                        }}
                        disabled={updatePixelMutation.isPending}
                        className="bg-red-900/50 text-red-400 hover:bg-red-900/70"
                      >
                        Remover Pixel
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsPixelModalOpen(false);
                        setPixelId("");
                        setSelectedCodeForPixel(null);
                      }}
                      className="border-gray-700 text-gray-300 hover:bg-gray-900"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleUpdatePixel}
                      disabled={updatePixelMutation.isPending || (!pixelId && !selectedCodeForPixel?.facebookPixelId)}
                      className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                      {updatePixelMutation.isPending ? 'Salvando...' : 'Salvar Pixel'}
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </motion.div>

        {/* Premium Summary Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ scale: 1.02 }}
            className="relative rounded-2xl overflow-hidden"
          >
            <div className="relative bg-gradient-to-br from-gray-900/95 to-gray-950/95 backdrop-blur-xl border border-gray-800 rounded-xl md:rounded-2xl p-4 md:p-6">
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <div className="p-2.5 md:p-3 bg-gradient-to-br from-[#00E880]/20 to-[#00E880]/5 rounded-xl border border-[#00E880]/20">
                  <Link2 className="w-5 h-5 md:w-6 md:h-6 text-[#00E880]" />
                </div>
                <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Total</span>
              </div>
              {codes.length === 0 ? (
                <div>
                  <p className="text-xl md:text-3xl font-bold text-white">—</p>
                  <p className="text-xs md:text-sm text-gray-400">Nenhum código ativo</p>
                </div>
              ) : (
                <div>
                  <p className="text-xl md:text-3xl font-bold text-white">{codes.length}</p>
                  <p className="text-xs md:text-sm text-gray-400">Códigos Ativos</p>
                </div>
              )}
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
                <div className="p-2.5 md:p-3 bg-gradient-to-br from-blue-500/20 to-blue-500/5 rounded-xl border border-blue-500/20">
                  <Mouse className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />
                </div>
                <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Cliques</span>
              </div>
              {(() => {
                const totalClicks = codes.reduce((acc: number, code: any) => acc + (code.totalClicks || 0), 0);
                return totalClicks === 0 ? (
                  <div>
                    <p className="text-xl md:text-3xl font-bold text-white">—</p>
                    <p className="text-xs md:text-sm text-gray-400">Nenhum clique ainda</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xl md:text-3xl font-bold text-white">{formatNumber(totalClicks)}</p>
                    <p className="text-xs md:text-sm text-gray-400">Cliques Totais</p>
                  </div>
                );
              })()}
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
                <div className="p-2.5 md:p-3 bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 rounded-xl border border-yellow-500/20">
                  <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-yellow-400" />
                </div>
                <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Destaque</span>
              </div>
              {(() => {
                const bestCode = codes.reduce((best: any, code: any) => {
                  const currentPerformance = (code.totalRegistrations || 0) + (code.completedDeposits || 0) / 100;
                  const bestPerformance = best ? (best.totalRegistrations || 0) + (best.completedDeposits || 0) / 100 : 0;
                  return currentPerformance > bestPerformance ? code : best;
                }, null);
                
                return bestCode ? (
                  <div>
                    <p className="text-lg md:text-2xl font-bold text-[#00E880] mb-1">
                      {bestCode.code}
                    </p>
                    <p className="text-sm text-white">
                      {bestCode.name || 'Melhor Código'}
                      <span className="text-xs text-gray-400 ml-2">
                        • {bestCode.totalRegistrations || 0} cadastros
                      </span>
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xl md:text-3xl font-bold text-white">—</p>
                    <p className="text-xs md:text-sm text-gray-400">Sem destaque ainda</p>
                  </div>
                );
              })()}
            </div>
          </motion.div>
        </div>

        {/* Premium Search and Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="relative rounded-3xl overflow-hidden"
        >
          <div className="relative bg-gradient-to-br from-gray-900/95 to-gray-950/95 backdrop-blur-xl border border-gray-800 rounded-xl md:rounded-3xl p-4 md:p-6">
            <div className="space-y-3">
              {/* Search Input */}
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nome ou código..."
                  className="pl-10 bg-gray-900 border-gray-700 text-white w-full"
                />
              </div>
              
              <div className="flex gap-2 md:gap-3">
                {/* Status Filter */}
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="flex-1 md:w-[180px] bg-gray-900 border-gray-700 text-white">
                    <Users className="w-4 h-4 mr-2 text-gray-400" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-950 border-gray-700">
                    <SelectItem value="all" className="text-white hover:bg-gray-900">Todos</SelectItem>
                    <SelectItem value="active" className="text-white hover:bg-gray-900">Com cadastros</SelectItem>
                    <SelectItem value="inactive" className="text-white hover:bg-gray-900">Sem cadastros</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Deposits Filter */}
                <Select value={filterDeposits} onValueChange={setFilterDeposits}>
                  <SelectTrigger className="flex-1 md:w-[180px] bg-gray-900 border-gray-700 text-white">
                    <TrendingUp className="w-4 h-4 mr-2 text-gray-400" />
                    <SelectValue placeholder="Depósitos" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-950 border-gray-700">
                    <SelectItem value="all" className="text-white hover:bg-gray-900">Todos</SelectItem>
                    <SelectItem value="with" className="text-white hover:bg-gray-900">Com depósitos</SelectItem>
                    <SelectItem value="without" className="text-white hover:bg-gray-900">Sem depósitos</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Clear Filters Button */}
                {hasActiveFilters && (
                  <Button 
                    onClick={clearFilters}
                    variant="outline" 
                    className="border-gray-700 text-red-400 hover:bg-gray-900 hover:text-red-300"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Limpar
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Links Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <p className="text-gray-400">Carregando códigos...</p>
          </div>
        ) : filteredCodes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="relative rounded-xl md:rounded-3xl overflow-hidden"
          >
            <div className="relative bg-gradient-to-br from-gray-900/95 to-gray-950/95 backdrop-blur-xl border border-gray-800 rounded-xl md:rounded-3xl p-8 md:p-12 text-center">
              <Link2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-base md:text-lg font-semibold text-white mb-2">
                Nenhum código ativo
              </h3>
              <p className="text-xs md:text-sm text-gray-400 mb-4">
                Crie seu primeiro código de afiliado para começar a rastrear suas conversões
              </p>
              <Button 
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-[#00E880] text-black hover:opacity-90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Código
              </Button>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {filteredCodes.map((code: any, index: number) => {
              const url = `${baseUrl}/?ref=${code.code}`;
              return (
                <motion.div
                  key={code.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="relative rounded-2xl overflow-hidden">
                    <div className="relative bg-gradient-to-br from-gray-900/95 to-gray-950/95 backdrop-blur-xl border border-gray-800 rounded-xl md:rounded-2xl p-4 md:p-6 hover:shadow-lg hover:shadow-[#00E880]/10 transition-all">
                      {/* Code Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white">
                            {code.name || code.code}
                          </h3>
                          <p className="text-sm font-mono text-[#00E880] mt-1">
                            {code.code}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            Criado em {new Date(code.createdAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopyLink(code.code)}
                            className="text-gray-400 hover:text-white hover:bg-gray-800"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenPixelModal(code)}
                            className={`text-gray-400 hover:text-white hover:bg-gray-800 ${code.facebookPixelId ? 'text-blue-400' : ''}`}
                            title={code.facebookPixelId ? "Pixel configurado" : "Configurar Facebook Pixel"}
                          >
                            <Facebook className="w-4 h-4" />
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleGenerateQR(code.code)}
                                className="text-gray-400 hover:text-white hover:bg-gray-800"
                              >
                                <QrCode className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-gray-950 border-gray-700">
                              <DialogHeader>
                                <DialogTitle className="text-white">
                                  QR Code - {code.name || code.code}
                                </DialogTitle>
                              </DialogHeader>
                              <div className="flex flex-col items-center gap-4 mt-4">
                                {qrCodeData && (
                                  <>
                                    <img src={qrCodeData} alt="QR Code" className="border-2 border-gray-700 rounded-lg" />
                                    <Button 
                                      onClick={() => {
                                        const a = document.createElement('a');
                                        a.href = qrCodeData;
                                        a.download = `qrcode-${code.code.toLowerCase()}.png`;
                                        a.click();
                                      }}
                                      className="bg-gradient-to-r from-[#00E880] to-green-600 text-black hover:opacity-90"
                                    >
                                      <Download className="w-4 h-4 mr-2" />
                                      Baixar QR Code
                                    </Button>
                                  </>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteCode(code.id, code.totalRegistrations)}
                            disabled={deleteCodeMutation.isPending}
                            className="text-gray-400 hover:text-red-400 hover:bg-gray-800 disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Link URL */}
                      <div className="mb-4 p-2 bg-gray-950 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Link de afiliado:</p>
                        <p className="text-xs font-mono text-gray-300 truncate">
                          mania-brasil.com/?ref={code.code}
                        </p>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-gray-900 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-blue-400 mb-1">
                            <MousePointerClick className="w-4 h-4" />
                            <span className="text-xs">Cliques</span>
                          </div>
                          <p className="text-xl font-bold text-white">{formatNumber(code.totalClicks || 0)}</p>
                        </div>
                        <div className="bg-gray-900 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-purple-400 mb-1">
                            <Users className="w-4 h-4" />
                            <span className="text-xs">Cadastros</span>
                          </div>
                          <p className="text-xl font-bold text-white">{formatNumber(code.totalRegistrations || 0)}</p>
                        </div>
                      </div>

                      {/* Conversion Stats */}
                      <div className="bg-gradient-to-r from-gray-900/40 to-gray-900/20 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-4 h-4 text-[#00E880]" />
                          <span className="text-xs text-gray-400">Comissões Aprovadas</span>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-[#00E880]">
                            {formatBRL(code.completedCommission || 0)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">{code.completedCount || 0} depósitos aprovados</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AffiliateLayout>
  );
}