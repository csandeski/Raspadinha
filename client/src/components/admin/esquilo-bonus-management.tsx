import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, AlertCircle, Sparkles, Percent, RotateCcw, TestTube } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

interface BonusProbability {
  id?: number;
  multiplier: number;
  probability: number;
  forDemo: boolean;
}

export function EsquiloBonusManagement() {
  const { toast } = useToast();
  const [editedProbabilities, setEditedProbabilities] = useState<BonusProbability[]>([]);
  const [bonusChance, setBonusChance] = useState(10);
  const [bonusCostMultiplier, setBonusCostMultiplier] = useState(20);
  const [hasChanges, setHasChanges] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Get bonus chance
  const { data: bonusChanceData } = useQuery<{ bonusChance: number }>({
    queryKey: ['/api/admin/esquilo-bonus-chance'],
    queryFn: async () => {
      const response = await fetch('/api/admin/esquilo-bonus-chance', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminSessionId')}`,
        },
      });
      if (!response.ok) throw new Error('Falha ao buscar chance do bônus');
      return response.json();
    },
  });

  // Get bonus cost multiplier
  const { data: bonusCostData } = useQuery<{ bonusCostMultiplier: number }>({
    queryKey: ['/api/admin/esquilo-bonus-cost'],
    queryFn: async () => {
      const response = await fetch('/api/admin/esquilo-bonus-cost', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminSessionId')}`,
        },
      });
      if (!response.ok) throw new Error('Falha ao buscar multiplicador do custo do bônus');
      return response.json();
    },
  });

  // Get bonus probabilities
  const { data: probabilities, isLoading } = useQuery<BonusProbability[]>({
    queryKey: ['/api/admin/esquilo-bonus-probabilities', isDemoMode],
    queryFn: async () => {
      const url = `/api/admin/esquilo-bonus-probabilities${isDemoMode ? '?demo=true' : ''}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminSessionId')}`,
        },
      });
      if (!response.ok) throw new Error('Falha ao buscar probabilidades do bônus');
      return response.json();
    },
  });

  useEffect(() => {
    if (probabilities && probabilities.length > 0) {
      // Ensure probability values are numbers
      setEditedProbabilities(probabilities.map(p => ({
        ...p,
        multiplier: Number(p.multiplier),
        probability: Number(p.probability || 0)
      })));
      setHasChanges(false);
    } else {
      // Set default probabilities if none exist
      setEditedProbabilities([
        { multiplier: 1.5, probability: 30, forDemo: isDemoMode },
        { multiplier: 2.0, probability: 25, forDemo: isDemoMode },
        { multiplier: 3.0, probability: 20, forDemo: isDemoMode },
        { multiplier: 5.0, probability: 12, forDemo: isDemoMode },
        { multiplier: 10.0, probability: 8, forDemo: isDemoMode },
        { multiplier: 20.0, probability: 3.5, forDemo: isDemoMode },
        { multiplier: 50.0, probability: 1.0, forDemo: isDemoMode },
        { multiplier: 100.0, probability: 0.5, forDemo: isDemoMode }
      ]);
    }
  }, [probabilities, isDemoMode]);

  useEffect(() => {
    if (bonusChanceData) {
      setBonusChance(bonusChanceData.bonusChance);
    }
  }, [bonusChanceData]);

  useEffect(() => {
    if (bonusCostData) {
      setBonusCostMultiplier(bonusCostData.bonusCostMultiplier);
    }
  }, [bonusCostData]);

  // Update bonus probabilities
  const updateProbabilitiesMutation = useMutation({
    mutationFn: async (multipliers: BonusProbability[]) => {
      const response = await fetch('/api/admin/esquilo-bonus-probabilities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminSessionId')}`,
        },
        body: JSON.stringify({ 
          multipliers: multipliers.map(m => ({
            multiplier: m.multiplier,
            probability: m.probability
          })),
          demo: isDemoMode
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Falha ao atualizar probabilidades');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/esquilo-bonus-probabilities', isDemoMode] });
      toast({
        title: "Sucesso",
        description: `Probabilidades do Modo Bônus ${isDemoMode ? '(Demo)' : ''} atualizadas!`,
      });
      setHasChanges(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update bonus chance
  const updateBonusChanceMutation = useMutation({
    mutationFn: async (chance: number) => {
      const response = await fetch('/api/admin/esquilo-bonus-chance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminSessionId')}`,
        },
        body: JSON.stringify({ bonusChance: chance }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Falha ao atualizar chance do bônus');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/esquilo-bonus-chance'] });
      toast({
        title: "Sucesso",
        description: "Chance do Modo Bônus atualizada!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update bonus cost multiplier
  const updateBonusCostMutation = useMutation({
    mutationFn: async (multiplier: number) => {
      const response = await fetch('/api/admin/esquilo-bonus-cost', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminSessionId')}`,
        },
        body: JSON.stringify({ bonusCostMultiplier: multiplier }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Falha ao atualizar multiplicador do custo do bônus');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/esquilo-bonus-cost'] });
      toast({
        title: "Sucesso",
        description: "Multiplicador do custo do bônus atualizado!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleProbabilityChange = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    const newProbabilities = [...editedProbabilities];
    newProbabilities[index].probability = numValue;
    setEditedProbabilities(newProbabilities);
    setHasChanges(true);
  };

  const handleSave = () => {
    updateProbabilitiesMutation.mutate(editedProbabilities);
  };

  const handleResetToDefaults = () => {
    const defaults = isDemoMode ? [
      { multiplier: 1.5, probability: 20, forDemo: true },
      { multiplier: 2.0, probability: 20, forDemo: true },
      { multiplier: 3.0, probability: 20, forDemo: true },
      { multiplier: 5.0, probability: 15, forDemo: true },
      { multiplier: 10.0, probability: 10, forDemo: true },
      { multiplier: 20.0, probability: 8, forDemo: true },
      { multiplier: 50.0, probability: 5, forDemo: true },
      { multiplier: 100.0, probability: 2, forDemo: true }
    ] : [
      { multiplier: 1.5, probability: 30, forDemo: false },
      { multiplier: 2.0, probability: 25, forDemo: false },
      { multiplier: 3.0, probability: 20, forDemo: false },
      { multiplier: 5.0, probability: 12, forDemo: false },
      { multiplier: 10.0, probability: 8, forDemo: false },
      { multiplier: 20.0, probability: 3.5, forDemo: false },
      { multiplier: 50.0, probability: 1.0, forDemo: false },
      { multiplier: 100.0, probability: 0.5, forDemo: false }
    ];

    setEditedProbabilities(defaults);
    setHasChanges(true);
  };

  const totalProbability = editedProbabilities.reduce((sum, p) => sum + Number(p.probability || 0), 0);
  const isValid = Math.abs(totalProbability - 100) < 0.01;

  const getMultiplierColor = (multiplier: number) => {
    if (multiplier >= 50) return 'text-yellow-400';
    if (multiplier >= 20) return 'text-purple-500';
    if (multiplier >= 10) return 'text-pink-500';
    if (multiplier >= 5) return 'text-blue-500';
    if (multiplier >= 3) return 'text-green-500';
    return 'text-gray-400';
  };

  return (
    <div className="space-y-6">
      {/* Bonus Mode Activation Chance */}
      <Card className="bg-gray-900/95 border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            Chance de Ativação do Modo Bônus
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label>Chance de ativar o modo bônus ao abrir um baú (%)</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    type="number"
                    value={bonusChance}
                    onChange={(e) => setBonusChance(parseFloat(e.target.value) || 0)}
                    min="0"
                    max="100"
                    step="0.5"
                    className="w-32 bg-gray-800 border-gray-700"
                  />
                  <span className="text-gray-400">%</span>
                </div>
              </div>
              <Button
                onClick={() => updateBonusChanceMutation.mutate(bonusChance)}
                disabled={updateBonusChanceMutation.isPending || bonusChance < 0 || bonusChance > 100}
                className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700"
              >
                {updateBonusChanceMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar Chance
              </Button>
            </div>
            <p className="text-sm text-gray-400">
              Esta é a chance de ativar o modo bônus quando o jogador abre um baú com prêmio (não raposa).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Bonus Cost Multiplier */}
      <Card className="bg-gray-900/95 border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-green-400" />
            Custo da Compra do Bônus
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label>Multiplicador do valor da aposta (quantas vezes o valor da aposta)</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    type="number"
                    value={bonusCostMultiplier}
                    onChange={(e) => setBonusCostMultiplier(parseFloat(e.target.value) || 1)}
                    min="1"
                    max="100"
                    step="1"
                    className="w-32 bg-gray-800 border-gray-700"
                  />
                  <span className="text-gray-400">x</span>
                </div>
              </div>
              <Button
                onClick={() => updateBonusCostMutation.mutate(bonusCostMultiplier)}
                disabled={updateBonusCostMutation.isPending || bonusCostMultiplier < 1 || bonusCostMultiplier > 100}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
              >
                {updateBonusCostMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar Custo
              </Button>
            </div>
            <p className="text-sm text-gray-400">
              Define quantas vezes o valor da aposta será cobrado para comprar o bônus. 
              Exemplo: Com multiplicador 20x e aposta de R$ 1,00, o bônus custará R$ 20,00.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Bonus Multipliers Probabilities */}
      <Card className="bg-gray-900/95 border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Percent className="w-5 h-5 text-purple-400" />
              Probabilidades dos Multiplicadores do Modo Bônus
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={isDemoMode}
                  onCheckedChange={setIsDemoMode}
                  className="data-[state=checked]:bg-purple-600"
                />
                <Label className="flex items-center gap-1 cursor-pointer">
                  <TestTube className="w-4 h-4" />
                  Modo Demo
                </Label>
              </div>
              <Button
                onClick={handleResetToDefaults}
                variant="outline"
                size="sm"
                className="border-gray-700"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Resetar
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {editedProbabilities.map((prob, index) => (
                  <motion.div
                    key={prob.multiplier}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative"
                  >
                    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                      <div className="flex items-center justify-between mb-3">
                        <Badge className={cn("font-bold text-lg", getMultiplierColor(prob.multiplier))}>
                          {prob.multiplier}x
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-gray-400">Probabilidade (%)</Label>
                        <Input
                          type="number"
                          value={prob.probability}
                          onChange={(e) => handleProbabilityChange(index, e.target.value)}
                          min="0"
                          max="100"
                          step="0.1"
                          className="bg-gray-900/50 border-gray-700 text-center"
                        />
                        <div className="h-2 bg-gray-900/50 rounded-full overflow-hidden">
                          <motion.div
                            className={cn("h-full", 
                              prob.multiplier >= 50 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                              prob.multiplier >= 20 ? 'bg-gradient-to-r from-purple-400 to-purple-500' :
                              prob.multiplier >= 10 ? 'bg-gradient-to-r from-pink-400 to-pink-500' :
                              prob.multiplier >= 5 ? 'bg-gradient-to-r from-blue-400 to-blue-500' :
                              'bg-gradient-to-r from-green-400 to-green-500'
                            )}
                            initial={{ width: 0 }}
                            animate={{ width: `${prob.probability}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Total Probability */}
              <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Total de Probabilidades:</span>
                  <Badge className={cn(
                    "text-lg font-bold",
                    isValid ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                  )}>
                    {totalProbability ? Number(totalProbability).toFixed(2) : '0.00'}%
                  </Badge>
                </div>
                {!isValid && (
                  <div className="flex items-center gap-2 mt-2 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>A soma das probabilidades deve ser exatamente 100%</span>
                  </div>
                )}
              </div>

              {/* Save Button */}
              <div className="flex justify-end gap-4">
                <Button
                  onClick={handleSave}
                  disabled={!isValid || !hasChanges || updateProbabilitiesMutation.isPending}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  {updateProbabilitiesMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Salvar Probabilidades
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}