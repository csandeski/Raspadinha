import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, DollarSign, Users, Settings } from 'lucide-react';

export function ReferralConfig() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    paymentType: 'all_deposits',
    paymentAmount: '12.00',
    isActive: true
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/admin/referral-config', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setConfig({
          paymentType: data.payment_type || data.paymentType || 'all_deposits',
          paymentAmount: data.payment_amount || data.paymentAmount || '12.00',
          isActive: data.is_active !== undefined ? data.is_active : (data.isActive !== undefined ? data.isActive : true)
        });
      }
    } catch (error) {
      // Error handled in UI
      toast({
        title: "Erro",
        description: "Erro ao carregar configurações",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    
    try {
      const response = await fetch('/api/admin/referral-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(config)
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Configurações salvas com sucesso",
        });
      } else {
        toast({
          title: "Erro",
          description: data.message || "Erro ao salvar configurações",
          variant: "destructive"
        });
      }
    } catch (error) {
      // Error handled in UI
      toast({
        title: "Erro",
        description: "Erro ao salvar configurações",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configurações de Indicação
        </CardTitle>
        <CardDescription>
          Configure como funcionam as comissões do sistema de indicação
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="active">Sistema de indicação ativo</Label>
            <p className="text-sm text-muted-foreground">
              Ativa ou desativa o pagamento de comissões
            </p>
          </div>
          <Switch
            id="active"
            checked={config.isActive}
            onCheckedChange={(checked) => 
              setConfig(prev => ({ ...prev, isActive: checked }))
            }
          />
        </div>

        {/* Payment Amount */}
        <div className="space-y-2">
          <Label htmlFor="amount" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Valor da comissão (R$)
          </Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0.01"
            value={config.paymentAmount}
            onChange={(e) => 
              setConfig(prev => ({ ...prev, paymentAmount: e.target.value }))
            }
            placeholder="12.00"
            className="max-w-xs"
          />
          <p className="text-sm text-muted-foreground">
            Valor fixo pago em reais por cada depósito qualificado
          </p>
        </div>

        {/* Payment Type */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Tipo de pagamento
          </Label>
          <RadioGroup
            value={config.paymentType}
            onValueChange={(value) => 
              setConfig(prev => ({ ...prev, paymentType: value }))
            }
          >
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="first_deposit" id="first" />
              <div className="space-y-1">
                <Label htmlFor="first" className="font-normal cursor-pointer">
                  Apenas no primeiro depósito
                </Label>
                <p className="text-sm text-muted-foreground">
                  Paga comissão apenas quando o indicado faz o primeiro depósito (mínimo R$ 15)
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="all_deposits" id="all" />
              <div className="space-y-1">
                <Label htmlFor="all" className="font-normal cursor-pointer">
                  Todos os depósitos
                </Label>
                <p className="text-sm text-muted-foreground">
                  Paga comissão toda vez que o indicado faz um depósito
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* Current Settings Summary */}
        <div className="rounded-lg bg-muted p-4 space-y-2">
          <h4 className="font-medium text-sm">Configuração atual:</h4>
          <div className="text-sm space-y-1">
            <p>• Sistema: <span className="font-medium">{config.isActive ? 'Ativo' : 'Inativo'}</span></p>
            <p>• Valor por depósito: <span className="font-medium">R$ {config.paymentAmount}</span></p>
            <p>• Tipo de pagamento: <span className="font-medium">
              {config.paymentType === 'first_deposit' ? 'Apenas primeiro depósito' : 'Todos os depósitos'}
            </span></p>
          </div>
        </div>

        {/* Save Button */}
        <Button 
          onClick={handleSave}
          disabled={saving}
          className="w-full"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar Configurações'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}