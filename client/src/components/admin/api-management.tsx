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
  CheckCircle, 
  Settings, 
  Shield,
  AlertCircle,
  Key,
  CreditCard,
  TrendingUp,
  Activity,
  ExternalLink,
  Copy,
  Eye,
  EyeOff
} from "lucide-react";
import { motion } from "framer-motion";
import { Separator } from "@/components/ui/separator";
import DiscordWebhookConfig from "./discord-webhook-config";

export default function ApiManagement() {
  const { toast } = useToast();
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [orinpayConfig, setOrinpayConfig] = useState({
    token: "",
    webhookUrl: "https://mania-brasil.com/api/webhook/orinpay"
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
      const orinpayProvider = apiConfig.providers?.find((p: any) => p.provider === "orinpay");
      if (orinpayProvider) {
        setOrinpayConfig({
          token: orinpayProvider.apiToken || "",
          webhookUrl: orinpayProvider.webhookUrl || "https://mania-brasil.com/api/webhook/orinpay"
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

  const handleOrinpayConfigSave = () => {
    updateConfigMutation.mutate({
      orinpay: orinpayConfig
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
          <p className="text-zinc-400 mt-1">Configure e gerencie a API de pagamento OrinPay</p>
        </div>
        <Badge className="px-3 py-1 bg-blue-500/20 text-blue-400 border-blue-500/30">
          <Activity className="w-3 h-3 mr-1 animate-pulse" />
          OrinPay Ativo
        </Badge>
      </div>

      {/* OrinPay Main Card */}
      <motion.div
        whileHover={{ scale: 1.01 }}
        className="w-full"
      >
        <Card className="relative overflow-hidden border-2 border-green-500/50 bg-green-500/5">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent" />
          
          <CardHeader className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-green-500/20">
                  <CreditCard className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-xl text-white">OrinPay</CardTitle>
                  <CardDescription className="text-zinc-400">
                    Gateway de Pagamento Principal
                  </CardDescription>
                </div>
              </div>
              <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                ATIVO
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="relative space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-zinc-300">PIX instantâneo</span>
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
                  <span className="text-zinc-300">Taxa competitiva</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-400 text-xs">Status da Conexão</Label>
                <div className="flex items-center gap-2">
                  {orinpayConfig.token ? (
                    <>
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      <span className="text-sm text-green-400">Conectado e Operacional</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                      <span className="text-sm text-yellow-400">Aguardando Configuração</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Configuration Section */}
      <Card className="bg-black/40 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Configurações OrinPay</CardTitle>
          <CardDescription className="text-zinc-400">
            Configure as credenciais e webhooks para a API OrinPay
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm text-blue-400 font-medium">Configuração OrinPay</p>
                <p className="text-xs text-zinc-400">
                  Insira sua API Key OrinPay para ativar todos os recursos de pagamento.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-300">API Token</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input 
                    type={showApiKeys ? "text" : "password"}
                    value={orinpayConfig.token}
                    onChange={(e) => setOrinpayConfig({...orinpayConfig, token: e.target.value})}
                    placeholder="Insira sua API Key do OrinPay"
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
                Obtenha sua API Key no painel OrinPay em Configurações → API
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">Webhook URL</Label>
              <div className="flex gap-2">
                <Input 
                  value={orinpayConfig.webhookUrl}
                  onChange={(e) => setOrinpayConfig({...orinpayConfig, webhookUrl: e.target.value})}
                  className="bg-zinc-900/50 border-zinc-700 text-white"
                />
                <Button
                  size="icon"
                  variant="outline"
                  className="bg-zinc-900 border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                  onClick={() => copyToClipboard(orinpayConfig.webhookUrl)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-zinc-500">
                Configure esta URL como webhook no painel OrinPay
              </p>
            </div>

            <Separator className="bg-zinc-800" />

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                className="bg-zinc-900 border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                onClick={() => setOrinpayConfig({ token: "", webhookUrl: "https://mania-brasil.com/api/webhook/orinpay" })}
              >
                Cancelar
              </Button>
              <Button
                className="bg-blue-500 hover:bg-blue-600 text-white"
                onClick={handleOrinpayConfigSave}
                disabled={updateConfigMutation.isPending}
              >
                <Key className="w-4 h-4 mr-2" />
                {updateConfigMutation.isPending ? "Salvando..." : "Salvar Configuração"}
              </Button>
            </div>
          </div>

          <Separator className="bg-zinc-800" />

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-zinc-400" />
              <h3 className="text-lg font-semibold text-white">Informações da Integração</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <Label className="text-zinc-400 text-xs">Endpoint Base</Label>
                <p className="text-zinc-300 font-mono text-xs bg-zinc-900 p-2 rounded border border-zinc-700">
                  https://www.orinpay.com.br/api
                </p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-zinc-400 text-xs">Produto PIX</Label>
                <p className="text-zinc-300 font-mono text-xs bg-zinc-900 p-2 rounded border border-zinc-700">
                  Estrategia Digital V2
                </p>
              </div>
            </div>

            <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
              <div className="flex items-center gap-2 text-sm text-green-400">
                <Shield className="w-4 h-4" />
                <span>Integração segura e validada</span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Todas as transações são processadas de forma segura através da API OrinPay.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Discord Webhooks */}
      <DiscordWebhookConfig />
    </div>
  );
}