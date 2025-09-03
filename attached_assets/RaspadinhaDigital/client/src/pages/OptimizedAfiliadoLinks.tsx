import { useState, useMemo, useCallback, memo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OptimizedAffiliateLayout } from "@/components/affiliate/OptimizedAffiliateLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Link2, 
  Copy, 
  ExternalLink, 
  MousePointerClick, 
  Users, 
  DollarSign,
  Plus,
  Search,
  Filter,
  QrCode,
  Share2,
  Eye,
  TrendingUp,
  Calendar,
  Hash,
  Globe
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";
import { formatNumber } from "@/lib/format";
import { debounce } from "@/utils/performance";

// Memoized link card component
const LinkCard = memo(({ 
  link, 
  onCopy, 
  onShowQR 
}: { 
  link: any; 
  onCopy: (url: string) => void;
  onShowQR: (link: any) => void;
}) => {
  const conversionRate = link.clicks > 0 
    ? ((link.registrations / link.clicks) * 100).toFixed(1) 
    : '0.0';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className="bg-gradient-to-br from-gray-900/50 to-gray-950/50 backdrop-blur-sm rounded-xl p-4 border border-gray-800"
    >
      <div className="space-y-3">
        {/* Link URL */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-xs text-gray-500 mb-1">Link Personalizado</p>
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-[#00E880]" />
              <code className="text-sm text-white bg-gray-800/50 px-2 py-1 rounded">
                {link.shortUrl || link.url}
              </code>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onCopy(link.url)}
              className="h-8 w-8"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onShowQR(link)}
              className="h-8 w-8"
            >
              <QrCode className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => window.open(link.url, '_blank')}
              className="h-8 w-8"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* UTM Tags */}
        {link.utmParams && (
          <div className="flex flex-wrap gap-1">
            {Object.entries(link.utmParams).map(([key, value]) => (
              <Badge key={key} variant="secondary" className="text-xs">
                {key}: {value as string}
              </Badge>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-800/30 rounded-lg p-2">
            <div className="flex items-center gap-1">
              <MousePointerClick className="w-3 h-3 text-blue-400" />
              <span className="text-xs text-gray-400">Cliques</span>
            </div>
            <p className="text-lg font-bold text-white">{formatNumber(link.clicks)}</p>
          </div>
          <div className="bg-gray-800/30 rounded-lg p-2">
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3 text-green-400" />
              <span className="text-xs text-gray-400">Cadastros</span>
            </div>
            <p className="text-lg font-bold text-white">{formatNumber(link.registrations)}</p>
          </div>
          <div className="bg-gray-800/30 rounded-lg p-2">
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-purple-400" />
              <span className="text-xs text-gray-400">Taxa</span>
            </div>
            <p className="text-lg font-bold text-white">{conversionRate}%</p>
          </div>
        </div>

        {/* Created Date */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Criado em {new Date(link.createdAt).toLocaleDateString('pt-BR')}</span>
          {link.lastClickAt && (
            <span>Último clique: {new Date(link.lastClickAt).toLocaleDateString('pt-BR')}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
});

export function OptimizedAfiliadoLinks() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<{ url: string; dataUrl: string } | null>(null);
  const [newLinkData, setNewLinkData] = useState({
    url: "",
    utmSource: "",
    utmMedium: "",
    utmCampaign: "",
    utmContent: "",
    utmTerm: ""
  });

  // Fetch links with optimized caching
  const { data: links, isLoading } = useQuery({
    queryKey: ["/api/affiliate/links"],
    staleTime: 2 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchInterval: 60000,
    refetchOnWindowFocus: false
  });

  // Create link mutation
  const createLinkMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/affiliate/links", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/affiliate/links"] });
      toast({
        title: "Link criado!",
        description: "Seu link personalizado foi criado com sucesso"
      });
      setShowCreateModal(false);
      setNewLinkData({
        url: "",
        utmSource: "",
        utmMedium: "",
        utmCampaign: "",
        utmContent: "",
        utmTerm: ""
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar link",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Debounced search handler
  const debouncedSearch = useMemo(
    () => debounce((value: string) => {
      setSearchTerm(value);
    }, 300),
    []
  );

  // Filter links based on search
  const filteredLinks = useMemo(() => {
    if (!links) return [];
    if (!searchTerm) return links;
    
    return links.filter((link: any) => 
      link.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (link.utmParams && Object.values(link.utmParams).some((v: any) => 
        v?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      ))
    );
  }, [links, searchTerm]);

  // Copy link handler
  const handleCopyLink = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copiado!",
        description: "O link foi copiado para sua área de transferência"
      });
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o link",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Generate QR Code
  const handleShowQR = useCallback(async (link: any) => {
    try {
      const dataUrl = await QRCode.toDataURL(link.url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#00E880',
          light: '#1F2937'
        }
      });
      setQrCodeData({ url: link.url, dataUrl });
    } catch (error) {
      toast({
        title: "Erro ao gerar QR Code",
        description: "Não foi possível gerar o código QR",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Handle create link
  const handleCreateLink = useCallback(() => {
    const baseUrl = "https://mania-brasil.com";
    const params = new URLSearchParams();
    
    // Add affiliate code
    const affiliateCode = localStorage.getItem('affiliateCode') || 'DEFAULT';
    params.append('ref', affiliateCode);
    
    // Add UTM parameters
    if (newLinkData.utmSource) params.append('utm_source', newLinkData.utmSource);
    if (newLinkData.utmMedium) params.append('utm_medium', newLinkData.utmMedium);
    if (newLinkData.utmCampaign) params.append('utm_campaign', newLinkData.utmCampaign);
    if (newLinkData.utmContent) params.append('utm_content', newLinkData.utmContent);
    if (newLinkData.utmTerm) params.append('utm_term', newLinkData.utmTerm);
    
    const fullUrl = `${baseUrl}?${params.toString()}`;
    
    createLinkMutation.mutate({
      url: fullUrl,
      utmParams: {
        source: newLinkData.utmSource,
        medium: newLinkData.utmMedium,
        campaign: newLinkData.utmCampaign,
        content: newLinkData.utmContent,
        term: newLinkData.utmTerm
      }
    });
  }, [newLinkData, createLinkMutation]);

  return (
    <OptimizedAffiliateLayout activeSection="links">
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-gray-900/50 to-gray-950/50 backdrop-blur-sm rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-xl">
                <Link2 className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Meus Links</h1>
                <p className="text-gray-400">Gerencie seus links de afiliado</p>
              </div>
            </div>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-[#00E880] to-[#00C86C] hover:from-[#00C86C] hover:to-[#00E880]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Link
            </Button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar links..."
              onChange={(e) => debouncedSearch(e.target.value)}
              className="pl-10 bg-gray-800/50 border-gray-700"
            />
          </div>
        </motion.div>

        {/* Links Grid */}
        {isLoading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-800/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredLinks.map((link: any) => (
              <LinkCard
                key={link.id}
                link={link}
                onCopy={handleCopyLink}
                onShowQR={handleShowQR}
              />
            ))}
          </div>
        )}

        {/* Create Link Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-900 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-xl font-bold text-white mb-4">Criar Link Personalizado</h2>
              
              <div className="space-y-4">
                <div>
                  <Label>UTM Source</Label>
                  <Input
                    placeholder="Ex: instagram, facebook, whatsapp"
                    value={newLinkData.utmSource}
                    onChange={(e) => setNewLinkData({...newLinkData, utmSource: e.target.value})}
                    className="bg-gray-800/50 border-gray-700"
                  />
                </div>
                
                <div>
                  <Label>UTM Medium</Label>
                  <Input
                    placeholder="Ex: social, email, cpc"
                    value={newLinkData.utmMedium}
                    onChange={(e) => setNewLinkData({...newLinkData, utmMedium: e.target.value})}
                    className="bg-gray-800/50 border-gray-700"
                  />
                </div>
                
                <div>
                  <Label>UTM Campaign</Label>
                  <Input
                    placeholder="Ex: black_friday, lancamento"
                    value={newLinkData.utmCampaign}
                    onChange={(e) => setNewLinkData({...newLinkData, utmCampaign: e.target.value})}
                    className="bg-gray-800/50 border-gray-700"
                  />
                </div>
                
                <div>
                  <Label>UTM Content (opcional)</Label>
                  <Input
                    placeholder="Ex: banner1, video2"
                    value={newLinkData.utmContent}
                    onChange={(e) => setNewLinkData({...newLinkData, utmContent: e.target.value})}
                    className="bg-gray-800/50 border-gray-700"
                  />
                </div>
                
                <div>
                  <Label>UTM Term (opcional)</Label>
                  <Input
                    placeholder="Ex: keyword1, termo2"
                    value={newLinkData.utmTerm}
                    onChange={(e) => setNewLinkData({...newLinkData, utmTerm: e.target.value})}
                    className="bg-gray-800/50 border-gray-700"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateLink}
                  disabled={createLinkMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-[#00E880] to-[#00C86C]"
                >
                  {createLinkMutation.isPending ? "Criando..." : "Criar Link"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {/* QR Code Modal */}
        {qrCodeData && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-900 rounded-2xl p-6 max-w-sm w-full"
            >
              <h2 className="text-xl font-bold text-white mb-4">QR Code</h2>
              <div className="bg-white p-4 rounded-xl mb-4">
                <img src={qrCodeData.dataUrl} alt="QR Code" className="w-full" />
              </div>
              <p className="text-xs text-gray-400 mb-4 break-all">{qrCodeData.url}</p>
              <Button
                onClick={() => setQrCodeData(null)}
                className="w-full"
              >
                Fechar
              </Button>
            </motion.div>
          </div>
        )}
      </div>
    </OptimizedAffiliateLayout>
  );
}