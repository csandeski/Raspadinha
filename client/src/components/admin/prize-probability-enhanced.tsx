import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  Save, 
  Gift, 
  DollarSign,
  Heart,
  Smartphone,
  Trophy,
  Sparkles,
  AlertCircle,
  Plus,
  Trash2,
  RefreshCw,
  Wand2
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminTheme } from "@/contexts/admin-theme-context";

interface PrizeProbability {
  id?: number;
  game_type: string;
  prize_value: string;
  prize_name: string;
  probability: number;
  order: number;
}

const gameConfig = {
  'pix': {
    name: 'Prêmios - PIX',
    icon: DollarSign,
    color: 'from-blue-500 to-blue-600',
    borderColor: 'border-blue-500',
    defaultPrizes: [
      { value: '0.5', name: '50 centavos', probability: 30.0 },
      { value: '1', name: '1 real', probability: 25.0 },
      { value: '2', name: '2 reais', probability: 20.0 },
      { value: '3', name: '3 reais', probability: 10.0 },
      { value: '4', name: '4 reais', probability: 6.0 },
      { value: '5', name: '5 reais', probability: 4.0 },
      { value: '10', name: '10 reais', probability: 2.5 },
      { value: '15', name: '15 reais', probability: 1.0 },
      { value: '20', name: '20 reais', probability: 0.8 },
      { value: '50', name: '50 reais', probability: 0.3 },
      { value: '100', name: '100 reais', probability: 0.15 },
      { value: '200', name: '200 reais', probability: 0.08 },
      { value: '500', name: '500 reais', probability: 0.03 },
      { value: '1000', name: '1 mil reais', probability: 0.015 },
      { value: '2000', name: '2 mil reais', probability: 0.008 },
      { value: '5000', name: '5 mil reais', probability: 0.003 },
      { value: '10000', name: '10 mil reais', probability: 0.001 },
      { value: '100000', name: '100 mil reais', probability: 0.0001 }
    ]
  },
  'me_mimei': {
    name: 'Prêmios - Me Mimei',
    icon: Heart,
    color: 'from-pink-500 to-pink-600',
    borderColor: 'border-pink-500',
    defaultPrizes: [
      { value: '0.50', name: '50 centavos', probability: 20.0 },
      { value: '1.00', name: '1 real', probability: 10.0 },
      { value: '2.00', name: '2 reais', probability: 8.0 },
      { value: '3.00', name: '3 reais', probability: 6.0 },
      { value: '4.00', name: '4 reais', probability: 5.0 },
      { value: '5.00', name: '5 reais', probability: 4.0 },
      { value: '10.00', name: 'Batom Boca Rosa', probability: 3.0 },
      { value: '15.00', name: 'Máscara Ruby Rose', probability: 2.0 },
      { value: '20.00', name: 'Iluminador Bruna Tavares', probability: 1.5 },
      { value: '50.00', name: 'Perfume Egeo Dolce', probability: 1.0 },
      { value: '100.00', name: 'Bolsa Petite Jolie', probability: 0.5 },
      { value: '200.00', name: 'Kit WEPINK', probability: 0.3 },
      { value: '500.00', name: 'Perfume Good Girl', probability: 0.2 },
      { value: '1000.00', name: 'Kit Completo Bruna Tavares', probability: 0.1 },
      { value: '2000.00', name: 'Kit Kerastase', probability: 0.05 },
      { value: '5000.00', name: 'Bolsa Luxo Michael Kors', probability: 0.02 },
      { value: '10000.00', name: 'Dyson Secador', probability: 0.01 },
      { value: '100000.00', name: 'Anel Vivara Diamante', probability: 0.001 }
    ]
  },
  'eletronicos': {
    name: 'Prêmios - Eletrônicos',
    icon: Smartphone,
    color: 'from-orange-500 to-orange-600',
    borderColor: 'border-orange-500',
    defaultPrizes: [
      { value: '0.50', name: '50 centavos', probability: 20.0 },
      { value: '1.00', name: '1 real', probability: 10.0 },
      { value: '2.00', name: '2 reais', probability: 8.0 },
      { value: '3.00', name: '3 reais', probability: 6.0 },
      { value: '4.00', name: '4 reais', probability: 5.0 },
      { value: '5.00', name: '5 reais', probability: 4.0 },
      { value: '10.00', name: 'Cabo USB', probability: 3.0 },
      { value: '15.00', name: 'Suporte de Celular', probability: 2.0 },
      { value: '20.00', name: 'Capinha de Celular', probability: 1.5 },
      { value: '50.00', name: 'Power Bank', probability: 1.0 },
      { value: '100.00', name: 'Fone sem Fio', probability: 0.5 },
      { value: '200.00', name: 'SmartWatch', probability: 0.3 },
      { value: '500.00', name: 'Air Fryer', probability: 0.2 },
      { value: '1000.00', name: 'Caixa de Som JBL', probability: 0.1 },
      { value: '2000.00', name: 'Smart TV 55" 4K', probability: 0.05 },
      { value: '5000.00', name: 'Notebook Dell G15', probability: 0.02 },
      { value: '10000.00', name: 'iPhone 16 Pro', probability: 0.01 },
      { value: '100000.00', name: 'Kit Completo Apple', probability: 0.001 }
    ]
  },
  'super': {
    name: 'Prêmios - Super Prêmios',
    icon: Trophy,
    color: 'from-green-500 to-green-600',
    borderColor: 'border-green-500',
    defaultPrizes: [
      { value: '10.00', name: '10 reais', probability: 30.0 },
      { value: '20.00', name: '20 reais', probability: 15.0 },
      { value: '40.00', name: '40 reais', probability: 8.0 },
      { value: '60.00', name: '60 reais', probability: 5.0 },
      { value: '80.00', name: '80 reais', probability: 3.0 },
      { value: '100.00', name: '100 reais', probability: 2.0 },
      { value: '200.00', name: 'Óculos', probability: 1.0 },
      { value: '300.00', name: 'Capacete', probability: 0.5 },
      { value: '400.00', name: 'Bicicleta', probability: 0.3 },
      { value: '1000.00', name: 'HoverBoard', probability: 0.2 },
      { value: '2000.00', name: 'Patinete Elétrico', probability: 0.1 },
      { value: '4000.00', name: 'Scooter Elétrica', probability: 0.05 },
      { value: '10000.00', name: 'Buggy', probability: 0.02 },
      { value: '20000.00', name: 'Moto CG', probability: 0.01 },
      { value: '200000.00', name: 'Jeep Compass', probability: 0.001 },
      { value: '500000.00', name: 'Super Sorte', probability: 0.0001 }
    ]
  }
};

export function PrizeProbabilityEnhanced() {
  const { toast } = useToast();
  const { theme } = useAdminTheme();
  const [selectedGame, setSelectedGame] = useState<string>('pix');
  const [prizes, setPrizes] = useState<PrizeProbability[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: serverPrizes, isLoading, refetch } = useQuery<PrizeProbability[]>({
    queryKey: ['/api/admin/prize-probabilities', selectedGame],
    queryFn: async () => {
      const response = await fetch(`/api/admin/prize-probabilities/${selectedGame}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminSessionId')}`,
        },
      });
      if (!response.ok) {
        if (response.status === 404) return [];
        throw new Error('Falha ao buscar probabilidades');
      }
      return response.json();
    },
  });

  useEffect(() => {
    if (serverPrizes && serverPrizes.length > 0) {
      setPrizes(serverPrizes);
    } else {
      // Use default prizes if no server data
      const config = gameConfig[selectedGame as keyof typeof gameConfig];
      if (config) {
        setPrizes(config.defaultPrizes.map((p, index) => ({
          game_type: selectedGame,
          prize_value: p.value,
          prize_name: p.name,
          probability: p.probability,
          order: index
        })));
      }
    }
    setHasChanges(false);
  }, [serverPrizes, selectedGame]);

  const updateMutation = useMutation({
    mutationFn: async (prizesToUpdate: PrizeProbability[]) => {
      const response = await fetch(`/api/admin/prize-probabilities/${selectedGame}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminSessionId')}`,
        },
        body: JSON.stringify({ 
          prizes: prizesToUpdate.map(p => ({
            prizeValue: p.prize_value,
            prizeName: p.prize_name,
            probability: p.probability,
            order: p.order
          }))
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Falha ao atualizar probabilidades');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/prize-probabilities', selectedGame] });
      toast({
        description: "✅ Probabilidades atualizadas com sucesso",
      });
      setHasChanges(false);
      refetch();
    },
    onError: (error) => {
      toast({
        description: `❌ ${error.message || "Erro ao atualizar probabilidades"}`,
        variant: "destructive"
      });
    },
  });

  const handleProbabilityChange = (index: number, value: string) => {
    const newPrizes = [...prizes];
    newPrizes[index] = {
      ...newPrizes[index],
      probability: parseFloat(value) || 0
    };
    setPrizes(newPrizes);
    setHasChanges(true);
  };

  const handleNameChange = (index: number, value: string) => {
    const newPrizes = [...prizes];
    newPrizes[index] = {
      ...newPrizes[index],
      prize_name: value
    };
    setPrizes(newPrizes);
    setHasChanges(true);
  };

  const handleValueChange = (index: number, value: string) => {
    const newPrizes = [...prizes];
    newPrizes[index] = {
      ...newPrizes[index],
      prize_value: value
    };
    setPrizes(newPrizes);
    setHasChanges(true);
  };

  const addPrize = () => {
    const newPrize: PrizeProbability = {
      game_type: selectedGame,
      prize_value: '1',
      prize_name: 'Novo Prêmio',
      probability: 0,
      order: prizes.length
    };
    setPrizes([...prizes, newPrize]);
    setHasChanges(true);
  };

  const removePrize = (index: number) => {
    const newPrizes = prizes.filter((_, i) => i !== index);
    setPrizes(newPrizes);
    setHasChanges(true);
  };

  const resetToDefaults = () => {
    const config = gameConfig[selectedGame as keyof typeof gameConfig];
    if (config) {
      setPrizes(config.defaultPrizes.map((p, index) => ({
        game_type: selectedGame,
        prize_value: p.value,
        prize_name: p.name,
        probability: p.probability,
        order: index
      })));
      setHasChanges(true);
    }
  };

  const autoDistribute = () => {
    if (prizes.length === 0) return;
    
    // Sort prizes by value (ascending)
    const sortedPrizes = [...prizes].sort((a, b) => 
      parseFloat(a.prize_value) - parseFloat(b.prize_value)
    );
    
    // Calculate probabilities using exponential decay
    const totalPrizes = sortedPrizes.length;
    let remainingProb = 100;
    const distributedPrizes = [];
    
    // Base distribution percentages for different prize tiers
    const getBaseProbability = (index: number, total: number) => {
      const position = index / (total - 1); // 0 to 1, where 0 is smallest prize
      
      if (position <= 0.3) {
        // First 30% of prizes (smallest) get 60% of total probability
        return 60 / (total * 0.3);
      } else if (position <= 0.6) {
        // Middle 30% get 30% of total probability
        return 30 / (total * 0.3);
      } else if (position <= 0.9) {
        // Next 30% get 9% of total probability
        return 9 / (total * 0.3);
      } else {
        // Last 10% (biggest prizes) share 1% of total probability
        return 1 / (total * 0.1);
      }
    };
    
    // Calculate initial probabilities
    let tempProbs: number[] = [];
    for (let i = 0; i < totalPrizes; i++) {
      tempProbs.push(getBaseProbability(i, totalPrizes));
    }
    
    // Normalize to exactly 100%
    const sumProbs = tempProbs.reduce((a, b) => a + b, 0);
    tempProbs = tempProbs.map(p => (p / sumProbs) * 100);
    
    // Apply probabilities to prizes
    for (let i = 0; i < sortedPrizes.length; i++) {
      const prize = sortedPrizes[i];
      let probability = tempProbs[i];
      
      // Round to reasonable precision
      if (probability >= 10) {
        probability = Math.round(probability * 10) / 10; // 1 decimal
      } else if (probability >= 1) {
        probability = Math.round(probability * 100) / 100; // 2 decimals
      } else if (probability >= 0.1) {
        probability = Math.round(probability * 1000) / 1000; // 3 decimals
      } else {
        probability = Math.round(probability * 10000) / 10000; // 4 decimals
      }
      
      distributedPrizes.push({
        ...prize,
        probability
      });
    }
    
    // Final adjustment to ensure exactly 100%
    const currentSum = distributedPrizes.reduce((sum, p) => sum + p.probability, 0);
    const diff = 100 - currentSum;
    
    if (Math.abs(diff) > 0.001) {
      // Add difference to the prize with highest probability
      const maxProbIndex = distributedPrizes.reduce((maxIdx, p, idx, arr) => 
        p.probability > arr[maxIdx].probability ? idx : maxIdx, 0
      );
      distributedPrizes[maxProbIndex].probability = 
        Math.round((distributedPrizes[maxProbIndex].probability + diff) * 1000) / 1000;
    }
    
    // Restore original order
    const finalPrizes = prizes.map(originalPrize => {
      const updated = distributedPrizes.find(p => 
        p.prize_value === originalPrize.prize_value && 
        p.prize_name === originalPrize.prize_name
      );
      return updated || originalPrize;
    });
    
    setPrizes(finalPrizes);
    setHasChanges(true);
    
    toast({
      description: "✅ Probabilidades distribuídas automaticamente (total: 100%)",
    });
  };

  const totalProbability = prizes.reduce((sum, p) => sum + (p.probability || 0), 0);
  const isValidTotal = totalProbability <= 100;
  const config = gameConfig[selectedGame as keyof typeof gameConfig];
  const Icon = config?.icon || Gift;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#00E880]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <motion.h2 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-3xl font-bold text-white mb-2 flex items-center gap-3"
          >
            <Gift className="w-8 h-8 text-[#00E880]" />
            Probabilidades de Prêmios
          </motion.h2>
          <p className={theme === 'dark' ? "text-zinc-400" : "text-gray-600"}>
            Configure as probabilidades de cada prêmio individual das raspadinhas
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={selectedGame} onValueChange={setSelectedGame}>
            <SelectTrigger className={`w-56 ${
              theme === 'dark' ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-gray-300'
            }`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={
              theme === 'dark' ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-gray-300'
            }>
              {Object.entries(gameConfig).map(([value, cfg]) => (
                <SelectItem key={value} value={value} className={
                  theme === 'dark' ? 'text-white hover:bg-zinc-800' : 'text-gray-900 hover:bg-gray-100'
                }>
                  {cfg.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button
            onClick={autoDistribute}
            variant="outline"
            className={
              theme === 'dark'
                ? 'border-zinc-700 hover:bg-zinc-800 text-white'
                : 'border-gray-300 hover:bg-gray-100 text-gray-900'
            }
          >
            <Wand2 className="h-4 w-4 mr-2" />
            Auto Configurar
          </Button>
          
          <Button
            onClick={resetToDefaults}
            variant="outline"
            className={
              theme === 'dark'
                ? 'border-zinc-700 hover:bg-zinc-800 text-white'
                : 'border-gray-300 hover:bg-gray-100 text-gray-900'
            }
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Restaurar Padrões
          </Button>
          
          <Button
            onClick={() => updateMutation.mutate(prizes)}
            disabled={!hasChanges || updateMutation.isPending || !isValidTotal}
            className="bg-[#00E880] hover:bg-[#00B368] text-black font-semibold"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Alterações
          </Button>
        </div>
      </div>

      {/* Total Summary */}
      <Card className={`${
        theme === 'dark' 
          ? 'bg-zinc-900/50 border-zinc-800' 
          : 'bg-white border-gray-200'
      }`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-zinc-400' : 'text-gray-600'
                }`}>Total de Probabilidade</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-2xl font-bold ${
                    isValidTotal 
                      ? 'text-[#00E880]'
                      : 'text-red-500'
                  }`}>
                    {totalProbability.toFixed(6)}%
                  </span>
                  {!isValidTotal && (
                    <Badge variant="destructive">Excede 100%</Badge>
                  )}
                </div>
              </div>
              
              <div className="h-12 w-px bg-zinc-700" />
              
              <Button
                onClick={resetToDefaults}
                variant="outline"
                className={
                  theme === 'dark'
                    ? 'border-zinc-700 hover:bg-zinc-800'
                    : 'border-gray-300 hover:bg-gray-100'
                }
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Restaurar Padrões
              </Button>
            </div>
            
            {!isValidTotal && (
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">
                  A soma deve ser menor ou igual a 100%
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Prize List */}
      <Card className={`border-2 ${config?.borderColor} ${
        theme === 'dark' 
          ? 'bg-zinc-900/50' 
          : 'bg-white'
      }`}>
        <CardHeader className={`bg-gradient-to-r ${config?.color} p-4 rounded-t-lg`}>
          <CardTitle className="text-white flex items-center gap-2">
            <Icon className="w-5 h-5" />
            {config?.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-12 gap-4 pb-4 border-b border-zinc-700">
              <div className="col-span-2 text-xs font-medium text-zinc-400 uppercase">
                Valor (R$)
              </div>
              <div className="col-span-6 text-xs font-medium text-zinc-400 uppercase">
                Prêmio
              </div>
              <div className="col-span-3 text-xs font-medium text-zinc-400 uppercase">
                Probabilidade (%)
              </div>
              <div className="col-span-1"></div>
            </div>

            {/* Prize Items */}
            {prizes.map((prize, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="grid grid-cols-12 gap-4 py-3 hover:bg-zinc-800/30 rounded-lg px-2 -mx-2"
              >
                <div className="col-span-2">
                  <Input
                    type="text"
                    value={prize.prize_value}
                    onChange={(e) => handleValueChange(index, e.target.value)}
                    className={`${
                      theme === 'dark' 
                        ? 'bg-zinc-800 border-zinc-700 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } text-sm`}
                  />
                </div>
                <div className="col-span-6">
                  <Input
                    type="text"
                    value={prize.prize_name}
                    onChange={(e) => handleNameChange(index, e.target.value)}
                    className={`${
                      theme === 'dark' 
                        ? 'bg-zinc-800 border-zinc-700 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } text-sm`}
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    type="number"
                    value={prize.probability}
                    onChange={(e) => handleProbabilityChange(index, e.target.value)}
                    step="0.0001"
                    min="0"
                    max="100"
                    className={`${
                      theme === 'dark' 
                        ? 'bg-zinc-800 border-zinc-700 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } text-sm`}
                  />
                </div>
                <div className="col-span-1">
                  <Button
                    onClick={() => removePrize(index)}
                    variant="ghost"
                    size="icon"
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Add Prize Button */}
          <div className="mt-4 pt-4 border-t border-zinc-700">
            <Button
              onClick={addPrize}
              variant="outline"
              className={
                theme === 'dark'
                  ? 'border-zinc-700 hover:bg-zinc-800'
                  : 'border-gray-300 hover:bg-gray-100'
              }
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Prêmio
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}