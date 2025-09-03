import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Save, AlertCircle, Sparkles, Trash2, TestTube, Package, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface ChestProbability {
  id: number;
  game_type: string;
  prize_value: string;
  prize_name: string;
  probability: number;
  order: number;
}

const gameNames: Record<string, string> = {
  'bau_pix': 'Baú PIX',
  'bau_me_mimei': 'Baú Me Mimei',
  'bau_eletronicos': 'Baú Eletrônicos',
  'bau_super': 'Baú Super Prêmios'
};

const gameColors: Record<string, string> = {
  'bau_pix': 'border-blue-500',
  'bau_me_mimei': 'border-pink-500',
  'bau_eletronicos': 'border-orange-500',
  'bau_super': 'border-green-500'
};

export function ChestProbabilityManagement() {
  const { toast } = useToast();
  const [selectedGame, setSelectedGame] = useState<string>('bau_pix');
  const [editedProbabilities, setEditedProbabilities] = useState<ChestProbability[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [targetWinRate, setTargetWinRate] = useState<number>(() => {
    // Load saved target win rate for current game from localStorage
    const savedRates = localStorage.getItem('chestProbabilityWinRates');
    if (savedRates) {
      const rates = JSON.parse(savedRates);
      return rates[selectedGame] || 30;
    }
    return 30;
  });

  const { data: probabilities, isLoading } = useQuery<ChestProbability[]>({
    queryKey: ['/api/admin/chest-probabilities', selectedGame, isDemoMode],
    queryFn: async () => {
      const url = isDemoMode 
        ? `/api/admin/chest-probabilities/${selectedGame}?demo=true`
        : `/api/admin/chest-probabilities/${selectedGame}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminSessionId')}`,
        },
      });
      if (!response.ok) throw new Error('Falha ao buscar probabilidades');
      return response.json();
    },
  });

  useEffect(() => {
    if (probabilities) {
      setEditedProbabilities([...probabilities]);
      setHasChanges(false);
      
      // Calculate current total probability from saved values
      const currentTotal = probabilities.reduce((sum, p) => sum + p.probability, 0);
      if (currentTotal > 0 && currentTotal <= 100) {
        setTargetWinRate(currentTotal);
        // Save this rate for the current game
        const savedRates = localStorage.getItem('chestProbabilityWinRates');
        const rates = savedRates ? JSON.parse(savedRates) : {};
        rates[selectedGame] = currentTotal;
        localStorage.setItem('chestProbabilityWinRates', JSON.stringify(rates));
      }
    }
  }, [probabilities, selectedGame]);

  const updateMutation = useMutation({
    mutationFn: async (prizes: ChestProbability[]) => {
      const response = await fetch(`/api/admin/chest-probabilities/${selectedGame}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminSessionId')}`,
        },
        body: JSON.stringify({ 
          prizes: prizes.map(p => ({
            prizeValue: p.prize_value,
            prizeName: p.prize_name,
            probability: p.probability,
            order: p.order
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
      queryClient.invalidateQueries({ queryKey: ['/api/admin/chest-probabilities', selectedGame, isDemoMode] });
      toast({
        description: isDemoMode 
          ? "Probabilidades DEMO dos baús atualizadas com sucesso"
          : "Probabilidades dos baús atualizadas com sucesso",
      });
      setHasChanges(false);
    },
    onError: (error) => {
      toast({
        description: error.message || "Erro ao atualizar probabilidades",
      });
    },
  });

  const handleProbabilityChange = (index: number, value: string) => {
    const newProbabilities = [...editedProbabilities];
    const numValue = parseFloat(value) || 0;
    newProbabilities[index] = {
      ...newProbabilities[index],
      probability: numValue
    };
    setEditedProbabilities(newProbabilities);
    setHasChanges(true);
  };

  const calculateTotal = () => {
    if (!editedProbabilities || editedProbabilities.length === 0) return 0;
    return editedProbabilities.reduce((sum, p) => sum + (p.probability || 0), 0);
  };

  const handleSave = () => {
    const total = calculateTotal();
    if (total > 100) {
      toast({
        description: `A soma das probabilidades não pode exceder 100%. Total atual: ${total.toFixed(4)}%`,
      });
      return;
    }
    updateMutation.mutate(editedProbabilities);
  };

  const handleAutoDistribute = () => {
    if (!editedProbabilities || editedProbabilities.length === 0) return;

    // Calculate inverse of prize values for weighting (smaller prizes get higher probability)
    const prizeValues = editedProbabilities.map(p => parseFloat(p.prize_value) || 1);
    const maxValue = Math.max(...prizeValues);
    const weights = prizeValues.map(value => maxValue / value);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    // Distribute target win rate proportionally
    const newProbabilities = editedProbabilities.map((prize, index) => ({
      ...prize,
      probability: (weights[index] / totalWeight) * targetWinRate
    }));

    setEditedProbabilities(newProbabilities);
    setHasChanges(true);
    
    toast({
      description: `Probabilidades distribuídas automaticamente para ${targetWinRate}% de taxa de vitória`,
    });
  };

  const handleClearAll = () => {
    const clearedProbabilities = editedProbabilities.map(prize => ({
      ...prize,
      probability: 0
    }));

    setEditedProbabilities(clearedProbabilities);
    setHasChanges(true);
    
    toast({
      description: "Todas as probabilidades foram zeradas",
    });
  };

  const formatPrizeValue = (value: string) => {
    const numValue = parseFloat(value);
    return `R$ ${numValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-green-400" />
      </div>
    );
  }

  const totalProbability = Number(calculateTotal()) || 0;
  const isValidTotal = totalProbability <= 100;

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
              <Package className="w-8 h-8 text-[#00E880]" />
            </motion.div>
            Probabilidades dos Baús
          </motion.h2>
          <p className="text-zinc-400">Configure a probabilidade de cada prêmio dos jogos de baú</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Demo mode toggle */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 rounded-lg border border-zinc-700">
            <Label htmlFor="demo-toggle" className="text-sm font-medium text-zinc-300 cursor-pointer">
              {isDemoMode ? (
                <span className="flex items-center gap-1.5">
                  <FlaskConical className="w-4 h-4 text-yellow-500" />
                  <span className="text-yellow-500">Modo Demo</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <span>Modo Regular</span>
                </span>
              )}
            </Label>
            <Switch
              id="demo-toggle"
              checked={isDemoMode}
              onCheckedChange={setIsDemoMode}
              className="data-[state=checked]:bg-yellow-500"
            />
          </div>
          
          {/* Badge de status */}
          <Badge variant="outline" className={cn(
            "border-2",
            isDemoMode ? "border-yellow-500 text-yellow-400" : (
              isValidTotal ? "border-[#00E880] text-[#00E880]" : "border-red-500 text-red-400"
            )
          )}>
            {isDemoMode && "DEMO - "}Total: {totalProbability.toFixed(2)}%
          </Badge>
          
          <Select value={selectedGame} onValueChange={(game) => {
            setSelectedGame(game);
            // Load saved win rate for the selected game
            const savedRates = localStorage.getItem('chestProbabilityWinRates');
            if (savedRates) {
              const rates = JSON.parse(savedRates);
              setTargetWinRate(rates[game] || 30);
            } else {
              setTargetWinRate(30);
            }
          }}>
            <SelectTrigger className="w-48 bg-zinc-900 border-zinc-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              {Object.entries(gameNames).map(([value, label]) => (
                <SelectItem key={value} value={value} className="text-white hover:bg-zinc-800">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateMutation.isPending || !isValidTotal}
            className={cn(
              "font-semibold",
              isDemoMode 
                ? "bg-yellow-500 hover:bg-yellow-600 text-black" 
                : "bg-green-500 hover:bg-green-600 text-black"
            )}
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar {isDemoMode ? "Demo" : "Alterações"}
          </Button>
        </div>
      </div>

      {/* Demo mode warning */}
      {isDemoMode && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4"
        >
          <div className="flex items-start gap-3">
            <FlaskConical className="w-5 h-5 text-yellow-500 mt-0.5" />
            <div>
              <h3 className="text-yellow-500 font-semibold mb-1">Modo Demo Ativado</h3>
              <p className="text-yellow-400/80 text-sm">
                Você está editando as probabilidades DEMO dos baús que são usadas apenas para contas de teste com CPF 99999999999.
                Essas configurações não afetam usuários reais e permitem testes seguros do sistema.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      <Card className="bg-zinc-900 border-zinc-800">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <label className="text-sm text-gray-400">Taxa de Vitória Total (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={targetWinRate}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    setTargetWinRate(value);
                    // Save to localStorage
                    const savedRates = localStorage.getItem('chestProbabilityWinRates');
                    const rates = savedRates ? JSON.parse(savedRates) : {};
                    rates[selectedGame] = value;
                    localStorage.setItem('chestProbabilityWinRates', JSON.stringify(rates));
                  }}
                  className="w-24 mt-1 bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <Button
                onClick={handleAutoDistribute}
                variant="outline"
                className="border-zinc-700 hover:bg-zinc-800"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Configurar Automático
              </Button>
              <Button
                onClick={handleClearAll}
                variant="outline"
                className="border-red-700 hover:bg-red-900/30 text-red-400"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Limpar Tudo
              </Button>
            </div>
            <div className="text-sm text-gray-400">
              <span>Os {targetWinRate}% serão distribuídos entre todos os prêmios de forma inversamente proporcional ao valor.</span>
            </div>
          </div>
        </div>
      </Card>

      <Card className={cn("bg-zinc-900 border-2", gameColors[selectedGame])}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">
              Prêmios - {gameNames[selectedGame]}
            </h3>
            <div className={cn(
              "px-3 py-1 rounded-lg text-sm font-medium",
              isValidTotal 
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : "bg-red-500/20 text-red-400 border border-red-500/30"
            )}>
              Total: {totalProbability.toFixed(4)}%
            </div>
          </div>

          {!isValidTotal && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">
                  A soma das probabilidades deve ser exatamente 100%
                </span>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-4 text-xs font-medium text-gray-400 uppercase tracking-wider border-b border-zinc-800 pb-2">
              <div>Valor</div>
              <div className="col-span-2">Prêmio</div>
              <div>Probabilidade (%)</div>
            </div>

            {editedProbabilities.map((prize, index) => (
              <div key={prize.id || index} className="grid grid-cols-4 gap-4 items-center py-2 hover:bg-zinc-800/50 rounded px-2 -mx-2">
                <div className="text-sm font-medium text-white">
                  {formatPrizeValue(prize.prize_value)}
                </div>
                <div className="col-span-2 text-sm text-gray-300">
                  {prize.prize_name}
                </div>
                <div>
                  <Input
                    type="number"
                    value={prize.probability}
                    onChange={(e) => handleProbabilityChange(index, e.target.value)}
                    step="0.00001"
                    min="0"
                    max="100"
                    className="bg-zinc-800 border-zinc-700 text-white text-sm"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-zinc-800">
            <div className="text-xs text-gray-400">
              <p>• Valores menores têm maior probabilidade de aparecer</p>
              <p>• A soma de todas as probabilidades deve ser exatamente 100%</p>
              <p>• Use até 5 casas decimais para ajustes precisos</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}