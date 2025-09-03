import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Server, 
  CheckCircle, 
  XCircle, 
  Settings, 
  Shield,
  AlertCircle,
  Info,
  Key,
  Wallet,
  CreditCard,
  TrendingUp,
  Activity,
  Link,
  ExternalLink,
  Copy,
  Eye,
  EyeOff
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import DiscordWebhookConfig from "./discord-webhook-config";

export default function ApiManagement() {
  const { toast } = useToast();
  const [primaryApi, setPrimaryApi] = useState<"ironpay" | "orinpay" | "horsepay">("ironpay");
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [orinpayConfig, setOrinpayConfig] = useState({
    token: "",
    webhookUrl: ""
  });
  const [horsepayConfig, setHorsepayConfig] = useState({
    clientKey: "",
    clientSecret: "",
    webhookUrl: ""
  });
  const [ironpayConfig, setIronpayConfig] = useState({
    apiKey: "",
    webhookUrl: ""
  });

  // Fetch current API configuration
  const { data: apiConfig, refetch } = useQuery({
    queryKey: ["/api/admin/payment-providers"],
    queryFn: async () => {
      const sessionId = localStorage.getItem("adminSessionId");
      const response = await fetch("/api/admin/payment-providers", {
        headers: {
          Authorization: `Bearer ${sessionId}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch API config");
      return response.json();
    },
  });

  useEffect(() => {
    if (apiConfig) {
      const primary = apiConfig.providers?.find((p: any) => p.isPrimary);
      setPrimaryApi(primary?.provider || "ironpay");
      
      const orinpayProvider = apiConfig.providers?.find((p: any) => p.provider === "orinpay");
      if (orinpayProvider) {
        setOrinpayConfig({
          token: orinpayProvider.apiToken || "",
          webhookUrl: orinpayProvider.webhookUrl || "https://mania-brasil.com/api/webhook/orinpay"
        });
      }
      
      const horsepayProvider = apiConfig.providers?.find((p: any) => p.provider === "horsepay");
      if (horsepayProvider) {
        setHorsepayConfig({
          clientKey: horsepayProvider.clientKey || "",
          clientSecret: horsepayProvider.clientSecret || "",
          webhookUrl: horsepayProvider.webhookUrl || "https://mania-brasil.com/api/webhook/horsepay"
        });
      }
      
      const ironpayProvider = apiConfig.providers?.find((p: any) => p.provider === "ironpay");
      if (ironpayProvider) {
        setIronpayConfig({
          apiKey: ironpayProvider.apiKey || "",
          webhookUrl: ironpayProvider.webhookUrl || "https://mania-brasil.com/api/webhook/pix"
        });
      }
    }
  }, [apiConfig]);

  // Update API configuration
  const updateConfigMutation = useMutation({
    mutationFn: async (data: any) => {
      const sessionId = localStorage.getItem("adminSessionId");
      return await fetch("/api/admin/payment-config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionId}`,
        },
        body: JSON.stringify(data),
      }).then(res => {
        if (!res.ok) throw new Error("Failed to update config");
        return res.json();
      });
    },
    onSuccess: () => {
      toast({
        title: "Configuração atualizada",
        description: "As configurações de API foram atualizadas com sucesso.",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar as configurações.",
        variant: "destructive",
      });
    },
  });

  const handleApiSwitch = (api: "ironpay" | "orinpay" | "horsepay") => {
    updateConfigMutation.mutate({
      activeProvider: api
    });
  };

  const handleOrinpayConfigSave = () => {
    updateConfigMutation.mutate({
      orinpay: orinpayConfig
    });
  };

  const handleHorsepayConfigSave = () => {
    updateConfigMutation.mutate({
      horsepay: horsepayConfig
    });
  };

  const handleIronpayConfigSave = () => {
    updateConfigMutation.mutate({
      ironpay: ironpayConfig
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "URL copiada para a área de transferência.",
    });
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Gerenciamento de APIs</h2>
          <p className="text-zinc-400 mt-1">Configure e gerencie as APIs de pagamento</p>
        </div>
        <Badge 
          className={`px-3 py-1 ${
            primaryApi === "ironpay" 
              ? "bg-purple-500/20 text-purple-400 border-purple-500/30" 
              : primaryApi === "orinpay"
              ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
              : "bg-orange-500/20 text-orange-400 border-orange-500/30"
          }`}
        >
          <Activity className="w-3 h-3 mr-1 animate-pulse" />
          {primaryApi === "ironpay" ? "IronPay" : primaryApi === "orinpay" ? "OrinPay" : "HorsePay"} Principal
        </Badge>
      </div>

      {/* API Selection Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* IronPay Card */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Card 
            className={`relative overflow-hidden border-2 transition-all cursor-pointer ${
              primaryApi === "ironpay" 
                ? "border-green-500/50 bg-green-500/5" 
                : "border-zinc-800 hover:border-zinc-700 bg-black/40"
            }`}
            onClick={() => handleApiSwitch("ironpay")}
          >
            {primaryApi === "ironpay" && (
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent" />
            )}
            
            <CardHeader className="relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${
                    primaryApi === "ironpay" 
                      ? "bg-green-500/20" 
                      : "bg-zinc-800"
                  }`}>
                    <Server className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-white">IronPay</CardTitle>
                    <CardDescription className="text-zinc-400">
                      API Principal Atual
                    </CardDescription>
                  </div>
                </div>
                {primaryApi === "ironpay" ? (
                  <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                    PRINCIPAL
                  </Badge>
                ) : (
                  <Badge className="bg-zinc-700 text-zinc-400 border-zinc-600">
                    SECUNDÁRIO
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="relative space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-zinc-300">Integração completa</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-zinc-300">PIX processamento automático</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-zinc-300">Webhooks configurados</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-yellow-400" />
                  <span className="text-zinc-300">Taxa: 4.49% + R$ 1,00</span>
                </div>
              </div>

              <Separator className="bg-zinc-800" />

              <div className="space-y-2">
                <Label className="text-zinc-400 text-xs">Status da Conexão</Label>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-sm text-green-400">Conectado e Operacional</span>
                </div>
              </div>

              {primaryApi === "ironpay" ? (
                <Button 
                  className="w-full bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30"
                  disabled
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Provedor Principal Ativo
                </Button>
              ) : (
                <Button 
                  className="w-full bg-zinc-900 text-white hover:bg-zinc-800 border border-zinc-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApiSwitch("ironpay");
                  }}
                >
                  Definir como Principal
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* OrinPay Card */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Card 
            className={`relative overflow-hidden border-2 transition-all cursor-pointer ${
              primaryApi === "orinpay" 
                ? "border-green-500/50 bg-green-500/5" 
                : "border-zinc-800 hover:border-zinc-700 bg-black/40"
            }`}
            onClick={() => handleApiSwitch("orinpay")}
          >
            {primaryApi === "orinpay" && (
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent" />
            )}
            
            <CardHeader className="relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${
                    primaryApi === "orinpay" 
                      ? "bg-green-500/20" 
                      : "bg-zinc-800"
                  }`}>
                    <CreditCard className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-white">OrinPay</CardTitle>
                    <CardDescription className="text-zinc-400">
                      API de Backup
                    </CardDescription>
                  </div>
                </div>
                {primaryApi === "orinpay" ? (
                  <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                    PRINCIPAL
                  </Badge>
                ) : (
                  <Badge className="bg-zinc-700 text-zinc-400 border-zinc-600">
                    SECUNDÁRIO
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="relative space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-zinc-300">PIX e Cartão de Crédito</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-zinc-300">Saques automatizados</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-zinc-300">Webhooks avançados</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span className="text-zinc-300">Taxa: R$ 1,00 (fixa)</span>
                </div>
              </div>

              <Separator className="bg-zinc-800" />

              <div className="space-y-2">
                <Label className="text-zinc-400 text-xs">Status da Conexão</Label>
                <div className="flex items-center gap-2">
                  {orinpayConfig.token ? (
                    <>
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      <span className="text-sm text-green-400">Configurado</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                      <span className="text-sm text-yellow-400">Aguardando Configuração</span>
                    </>
                  )}
                </div>
              </div>

              {primaryApi === "orinpay" ? (
                <Button 
                  className="w-full bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30"
                  disabled
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Provedor Principal Ativo
                </Button>
              ) : (
                <Button 
                  className="w-full bg-zinc-900 text-white hover:bg-zinc-800 border border-zinc-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApiSwitch("orinpay");
                  }}
                >
                  Definir como Principal
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* HorsePay Card */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Card 
            className={`relative overflow-hidden border-2 transition-all cursor-pointer ${
              primaryApi === "horsepay" 
                ? "border-green-500/50 bg-green-500/5" 
                : "border-zinc-800 hover:border-zinc-700 bg-black/40"
            }`}
            onClick={() => handleApiSwitch("horsepay")}
          >
            {primaryApi === "horsepay" && (
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent" />
            )}
            
            <CardHeader className="relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${
                    primaryApi === "horsepay" 
                      ? "bg-green-500/20" 
                      : "bg-zinc-800"
                  }`}>
                    <Wallet className="w-6 h-6 text-orange-400" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-white">HorsePay</CardTitle>
                    <CardDescription className="text-zinc-400">
                      API Terciária
                    </CardDescription>
                  </div>
                </div>
                {primaryApi === "horsepay" ? (
                  <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                    PRINCIPAL
                  </Badge>
                ) : (
                  <Badge className="bg-zinc-700 text-zinc-400 border-zinc-600">
                    SECUNDÁRIO
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="relative space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-zinc-300">PIX rápido e seguro</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-zinc-300">Processamento instantâneo</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-zinc-300">API moderna e estável</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span className="text-zinc-300">Taxa: R$ 0,65 (fixa)</span>
                </div>
              </div>

              <Separator className="bg-zinc-800" />

              <div className="space-y-2">
                <Label className="text-zinc-400 text-xs">Status da Conexão</Label>
                <div className="flex items-center gap-2">
                  {horsepayConfig.clientKey ? (
                    <>
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      <span className="text-sm text-green-400">Configurado</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                      <span className="text-sm text-yellow-400">Aguardando Configuração</span>
                    </>
                  )}
                </div>
              </div>

              {primaryApi === "horsepay" ? (
                <Button 
                  className="w-full bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30"
                  disabled
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Provedor Principal Ativo
                </Button>
              ) : (
                <Button 
                  className="w-full bg-zinc-900 text-white hover:bg-zinc-800 border border-zinc-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApiSwitch("horsepay");
                  }}
                >
                  Definir como Principal
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Configuration Tabs */}
      <Card className="bg-black/40 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Configurações da API</CardTitle>
          <CardDescription className="text-zinc-400">
            Configure as credenciais e webhooks para as APIs de pagamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="orinpay" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-zinc-900">
              <TabsTrigger value="ironpay" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
                IronPay
              </TabsTrigger>
              <TabsTrigger value="orinpay" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
                OrinPay
              </TabsTrigger>
              <TabsTrigger value="horsepay" className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400">
                HorsePay
              </TabsTrigger>
            </TabsList>

            {/* IronPay Configuration */}
            <TabsContent value="ironpay" className="space-y-6 mt-6">
              <div className="p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-purple-400 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm text-purple-400 font-medium">Configure o IronPay</p>
                    <p className="text-xs text-zinc-400">
                      Insira suas credenciais IronPay para ativar esta API de pagamento.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-zinc-300">API Key</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input 
                        type={showApiKeys ? "text" : "password"}
                        value={ironpayConfig.apiKey}
                        onChange={(e) => setIronpayConfig({...ironpayConfig, apiKey: e.target.value})}
                        placeholder="Insira sua API Key do IronPay"
                        className="bg-zinc-900/50 border-zinc-700 text-white placeholder:text-zinc-500"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setShowApiKeys(!showApiKeys)}
                      >
                        {showApiKeys ? (
                          <EyeOff className="w-4 h-4 text-zinc-400" />
                        ) : (
                          <Eye className="w-4 h-4 text-zinc-400" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Obtenha sua API Key no painel IronPay em Configurações → API
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-300">Webhook URL (PIX)</Label>
                  <div className="flex gap-2">
                    <Input 
                      value="https://mania-brasil.com/api/webhook/pix"
                      readOnly
                      className="bg-zinc-900/50 border-zinc-700 text-zinc-300"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="border-zinc-700"
                      onClick={() => copyToClipboard("https://mania-brasil.com/api/webhook/pix")}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Configure esta URL no painel IronPay para receber notificações de pagamento
                  </p>
                </div>

                <Separator className="bg-zinc-800" />

                <div className="flex justify-between items-center p-4 bg-zinc-900/50 rounded-xl">
                  <div>
                    <h4 className="text-sm font-medium text-white mb-2">Informações da Taxa</h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-3 h-3 text-purple-400" />
                        <span className="text-zinc-300">Taxa: 4.49% + R$ 1,00 por transação</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="w-3 h-3 text-blue-400" />
                        <span className="text-zinc-300">Processamento instantâneo</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Métodos suportados:</span>
                        <span className="text-zinc-300">PIX</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="bg-zinc-800" />

                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    className="border-zinc-700 text-zinc-300"
                    onClick={() => setIronpayConfig({ apiKey: "", webhookUrl: "" })}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border border-purple-500/30"
                    onClick={handleIronpayConfigSave}
                    disabled={!ironpayConfig.apiKey}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Salvar Configurações
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* OrinPay Configuration */}
            <TabsContent value="orinpay" className="space-y-6 mt-6">
              <div className="p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-purple-400 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm text-purple-400 font-medium">Configure o OrinPay</p>
                    <p className="text-xs text-zinc-400">
                      Insira suas credenciais OrinPay para ativar esta API de pagamento.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-zinc-300">Token de API</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input 
                        type={showApiKeys ? "text" : "password"}
                        value={orinpayConfig.token}
                        onChange={(e) => setOrinpayConfig({...orinpayConfig, token: e.target.value})}
                        placeholder="Insira seu token OrinPay"
                        className="bg-zinc-900/50 border-zinc-700 text-white placeholder:text-zinc-500"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setShowApiKeys(!showApiKeys)}
                      >
                        {showApiKeys ? (
                          <EyeOff className="w-4 h-4 text-zinc-400" />
                        ) : (
                          <Eye className="w-4 h-4 text-zinc-400" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Obtenha seu token no painel OrinPay em configurações → API
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-300">Webhook URL (Transações)</Label>
                  <div className="flex gap-2">
                    <Input 
                      value="https://mania-brasil.com/api/webhook/orinpay/transaction"
                      readOnly
                      className="bg-zinc-900/50 border-zinc-700 text-zinc-300"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="border-zinc-700"
                      onClick={() => copyToClipboard("https://mania-brasil.com/api/webhook/orinpay/transaction")}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Configure esta URL no painel OrinPay para receber notificações de pagamento
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-300">Webhook URL (Saques)</Label>
                  <div className="flex gap-2">
                    <Input 
                      value="https://mania-brasil.com/api/webhook/orinpay/withdrawal"
                      readOnly
                      className="bg-zinc-900/50 border-zinc-700 text-zinc-300"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="border-zinc-700"
                      onClick={() => copyToClipboard("https://mania-brasil.com/api/webhook/orinpay/withdrawal")}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Configure esta URL para receber atualizações de status de saques
                  </p>
                </div>

                <Separator className="bg-zinc-800" />

                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    className="border-zinc-700 text-zinc-300"
                    onClick={() => setOrinpayConfig({ token: "", webhookUrl: "" })}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border border-purple-500/30"
                    onClick={handleOrinpayConfigSave}
                    disabled={!orinpayConfig.token}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Salvar Configurações
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* HorsePay Configuration */}
            <TabsContent value="horsepay" className="space-y-6 mt-6">
              <div className="p-4 bg-orange-500/10 rounded-xl border border-orange-500/20">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-400 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm text-orange-400 font-medium">Configure o HorsePay</p>
                    <p className="text-xs text-zinc-400">
                      Insira suas credenciais HorsePay para ativar esta API de pagamento com a menor taxa.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-zinc-300">Client Key</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input 
                        type={showApiKeys ? "text" : "password"}
                        value={horsepayConfig.clientKey}
                        onChange={(e) => setHorsepayConfig({...horsepayConfig, clientKey: e.target.value})}
                        placeholder="Insira sua Client Key do HorsePay"
                        className="bg-zinc-900/50 border-zinc-700 text-white placeholder:text-zinc-500"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Obtenha sua Client Key no painel HorsePay em API → Credenciais
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-300">Client Secret</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input 
                        type={showApiKeys ? "text" : "password"}
                        value={horsepayConfig.clientSecret}
                        onChange={(e) => setHorsepayConfig({...horsepayConfig, clientSecret: e.target.value})}
                        placeholder="Insira seu Client Secret do HorsePay"
                        className="bg-zinc-900/50 border-zinc-700 text-white placeholder:text-zinc-500"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setShowApiKeys(!showApiKeys)}
                      >
                        {showApiKeys ? (
                          <EyeOff className="w-4 h-4 text-zinc-400" />
                        ) : (
                          <Eye className="w-4 h-4 text-zinc-400" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Obtenha seu Client Secret no painel HorsePay em API → Credenciais
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-300">Webhook URL (Transações)</Label>
                  <div className="flex gap-2">
                    <Input 
                      value="https://mania-brasil.com/api/webhook/horsepay"
                      readOnly
                      className="bg-zinc-900/50 border-zinc-700 text-zinc-300"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="border-zinc-700"
                      onClick={() => copyToClipboard("https://mania-brasil.com/api/webhook/horsepay")}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Configure esta URL no painel HorsePay para receber notificações de pagamento
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-300">Webhook URL (Saques)</Label>
                  <div className="flex gap-2">
                    <Input 
                      value="https://mania-brasil.com/api/webhook/horsepay-withdrawal"
                      readOnly
                      className="bg-zinc-900/50 border-zinc-700 text-zinc-300"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="border-zinc-700"
                      onClick={() => copyToClipboard("https://mania-brasil.com/api/webhook/horsepay-withdrawal")}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Configure esta URL para receber atualizações de status de saques
                  </p>
                </div>

                <Separator className="bg-zinc-800" />

                <div className="flex justify-between items-center p-4 bg-zinc-900/50 rounded-xl">
                  <div>
                    <h4 className="text-sm font-medium text-white mb-2">Informações da Taxa</h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-3 h-3 text-green-400" />
                        <span className="text-zinc-300">Taxa: R$ 0,65 (fixa) - A menor do mercado!</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="w-3 h-3 text-blue-400" />
                        <span className="text-zinc-300">Processamento instantâneo</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Métodos suportados:</span>
                        <span className="text-zinc-300">PIX</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="bg-zinc-800" />

                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    className="border-zinc-700 text-zinc-300"
                    onClick={() => setHorsepayConfig({ clientKey: "", clientSecret: "", webhookUrl: "" })}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border border-orange-500/30"
                    onClick={handleHorsepayConfigSave}
                    disabled={!horsepayConfig.clientKey || !horsepayConfig.clientSecret}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Salvar Configurações
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Documentation Link */}
      <Card className="bg-gradient-to-r from-zinc-900/50 to-zinc-900/30 border-zinc-800">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-zinc-800 rounded-xl">
                <Link className="w-6 h-6 text-zinc-400" />
              </div>
              <div>
                <h3 className="text-white font-medium">Documentação das APIs</h3>
                <p className="text-sm text-zinc-400">
                  Acesse a documentação completa para integração
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="border-zinc-700 text-zinc-300"
                onClick={() => window.open("https://ironpayapp.com.br/docs", "_blank")}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                IronPay Docs
              </Button>
              <Button
                variant="outline"
                className="border-zinc-700 text-zinc-300"
                onClick={() => window.open("https://orinpay.com.br/api/docs", "_blank")}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                OrinPay Docs
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Discord Webhooks Configuration */}
      <Card className="bg-black/40 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Notificações Discord</CardTitle>
          <CardDescription className="text-zinc-400">
            Configure webhooks para receber notificações no Discord sobre eventos importantes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DiscordWebhookConfig />
        </CardContent>
      </Card>
    </div>
  );
}