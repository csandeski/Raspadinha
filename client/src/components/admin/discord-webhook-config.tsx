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
  MessageSquare,
  DollarSign,
  UserPlus,
  Send,
  HelpCircle,
  CheckCircle,
  XCircle,
  AlertCircle,
  Copy,
  TestTube
} from "lucide-react";
import { motion } from "framer-motion";
import { Separator } from "@/components/ui/separator";

interface WebhookConfig {
  new_user: string;
  deposit_pending: string;
  deposit_paid: string;
  withdrawal: string;
  support: string;
}

const webhookTypes = [
  {
    type: 'new_user',
    label: 'Novo Usuário',
    description: 'Notifica quando um novo usuário se cadastra',
    icon: UserPlus,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20'
  },
  {
    type: 'deposit_pending',
    label: 'Depósito Pendente',
    description: 'Notifica quando um depósito é criado (aguardando pagamento)',
    icon: DollarSign,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/20'
  },
  {
    type: 'deposit_paid',
    label: 'Depósito Confirmado',
    description: 'Notifica quando um depósito é confirmado',
    icon: DollarSign,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20'
  },
  {
    type: 'withdrawal',
    label: 'Saque Realizado',
    description: 'Notifica quando um saque é solicitado',
    icon: Send,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20'
  },
  {
    type: 'support',
    label: 'Ticket de Suporte',
    description: 'Notifica quando um novo ticket de suporte é aberto',
    icon: HelpCircle,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20'
  }
];

export default function DiscordWebhookConfig() {
  const { toast } = useToast();
  const [webhooks, setWebhooks] = useState<WebhookConfig>({
    new_user: '',
    deposit_pending: '',
    deposit_paid: '',
    withdrawal: '',
    support: ''
  });

  // Fetch current Discord webhook configuration
  const { data: webhookData, refetch } = useQuery({
    queryKey: ["/api/admin/discord-webhooks"],
    queryFn: async () => {
      const sessionId = localStorage.getItem("adminSessionId");
      const response = await fetch("/api/admin/discord-webhooks", {
        headers: {
          Authorization: `Bearer ${sessionId}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch Discord webhooks");
      return response.json();
    },
  });

  useEffect(() => {
    if (webhookData) {
      const newWebhooks: WebhookConfig = {
        new_user: '',
        deposit_pending: '',
        deposit_paid: '',
        withdrawal: '',
        support: ''
      };
      
      webhookData.forEach((webhook: any) => {
        if (webhook.webhookType in newWebhooks) {
          newWebhooks[webhook.webhookType as keyof WebhookConfig] = webhook.webhookUrl || '';
        }
      });
      
      setWebhooks(newWebhooks);
    }
  }, [webhookData]);

  // Save webhook configuration
  const saveWebhookMutation = useMutation({
    mutationFn: async ({ type, url }: { type: string; url: string }) => {
      const sessionId = localStorage.getItem("adminSessionId");
      const response = await fetch("/api/admin/discord-webhooks", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionId}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          webhookType: type,
          webhookUrl: url || null
        }),
      });
      if (!response.ok) throw new Error("Failed to save webhook");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Webhook configurado!",
        description: "A configuração do webhook foi salva com sucesso.",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar webhook",
        description: "Não foi possível salvar a configuração do webhook.",
        variant: "destructive",
      });
      // Error handled in UI
    }
  });

  // Test webhook
  const testWebhookMutation = useMutation({
    mutationFn: async (type: string) => {
      const sessionId = localStorage.getItem("adminSessionId");
      const response = await fetch("/api/admin/test-discord-webhook", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionId}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          webhookType: type
        }),
      });
      if (!response.ok) throw new Error("Failed to test webhook");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Teste enviado!",
        description: "Uma notificação de teste foi enviada para o Discord.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao testar webhook",
        description: "Não foi possível enviar a notificação de teste.",
        variant: "destructive",
      });
      // Error handled in UI
    }
  });

  const handleSaveWebhook = (type: string) => {
    const url = webhooks[type as keyof WebhookConfig];
    saveWebhookMutation.mutate({ type, url });
  };

  const handleTestWebhook = (type: string) => {
    testWebhookMutation.mutate(type);
  };

  const copyWebhookExample = () => {
    const example = "https://discord.com/api/webhooks/1234567890/abcdefghijklmnopqrstuvwxyz";
    navigator.clipboard.writeText(example);
    toast({
      title: "Copiado!",
      description: "Exemplo de webhook copiado para a área de transferência.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Info Box */}
      <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm text-blue-400 font-medium">Como configurar webhooks do Discord</p>
            <ol className="text-xs text-zinc-400 space-y-1 list-decimal list-inside">
              <li>Acesse as configurações do seu servidor Discord</li>
              <li>Vá em "Integrações" → "Webhooks"</li>
              <li>Clique em "Novo Webhook"</li>
              <li>Escolha o canal onde deseja receber as notificações</li>
              <li>Copie a URL do webhook e cole no campo correspondente abaixo</li>
            </ol>
            <div className="flex items-center gap-2 mt-2">
              <code className="text-xs bg-zinc-900 px-2 py-1 rounded text-zinc-300">
                https://discord.com/api/webhooks/...
              </code>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={copyWebhookExample}
              >
                <Copy className="w-3 h-3 text-zinc-400" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Webhook Configurations */}
      <div className="space-y-4">
        {webhookTypes.map((webhook) => {
          const Icon = webhook.icon;
          const value = webhooks[webhook.type as keyof WebhookConfig];
          const isConfigured = !!value;

          return (
            <motion.div
              key={webhook.type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-xl border ${webhook.borderColor} ${webhook.bgColor}`}
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 bg-zinc-900 rounded-lg ${webhook.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-white font-medium">{webhook.label}</h4>
                      <p className="text-xs text-zinc-400 mt-1">{webhook.description}</p>
                    </div>
                  </div>
                  <Badge 
                    className={isConfigured 
                      ? "bg-green-500/20 text-green-400 border-green-500/30" 
                      : "bg-zinc-700 text-zinc-400 border-zinc-600"
                    }
                  >
                    {isConfigured ? (
                      <><CheckCircle className="w-3 h-3 mr-1" /> Configurado</>
                    ) : (
                      <><XCircle className="w-3 h-3 mr-1" /> Não configurado</>
                    )}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-300 text-xs">URL do Webhook</Label>
                  <div className="flex gap-2">
                    <Input
                      type="url"
                      value={value}
                      onChange={(e) => setWebhooks({
                        ...webhooks,
                        [webhook.type]: e.target.value
                      })}
                      placeholder="https://discord.com/api/webhooks/..."
                      className="bg-zinc-900/50 border-zinc-700 text-white placeholder:text-zinc-500"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-zinc-700 text-zinc-300"
                      onClick={() => handleTestWebhook(webhook.type)}
                      disabled={!isConfigured || testWebhookMutation.isPending}
                    >
                      <TestTube className="w-4 h-4 mr-1" />
                      Testar
                    </Button>
                    <Button
                      size="sm"
                      className={`${webhook.bgColor} ${webhook.color} hover:opacity-80 border ${webhook.borderColor}`}
                      onClick={() => handleSaveWebhook(webhook.type)}
                      disabled={saveWebhookMutation.isPending}
                    >
                      Salvar
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Separator className="bg-zinc-800" />
      
      <div className="flex justify-between items-center">
        <div className="text-sm text-zinc-400">
          Configure cada webhook individualmente e teste para garantir que está funcionando
        </div>
        <Button
          variant="outline"
          className="border-zinc-700 text-zinc-300"
          onClick={() => {
            setWebhooks({
              new_user: '',
              deposit_pending: '',
              deposit_paid: '',
              withdrawal: '',
              support: ''
            });
          }}
        >
          Limpar Todos
        </Button>
      </div>
    </div>
  );
}