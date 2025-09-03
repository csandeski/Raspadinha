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
  RefreshCw
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
      { value: '0.50', name: 'R$ 0,50', probability: 43.0 },
      { value: '1.00', name: 'R$ 1,00', probability: 6.6 },
      { value: '2.00', name: 'R$ 2,00', probability: 3.3 },
      { value: '3.00', name: 'R$ 3,00', probability: 2.2 },
      { value: '4.00', name: 'R$ 4,00', probability: 1.69 },
      { value: '5.00', name: 'R$ 5,00', probability: 1.3 },
      { value: '10.00', name: 'R$ 10,00', probability: 0.6 },
      { value: '15.00', name: 'R$ 15,00', probability: 0.4 },
      { value: '20.00', name: 'R$ 20,00', probability: 0.3 },
      { value: '50.00', name: 'R$ 50,00', probability: 0.1 }
    ]
  },
  'me_mimei': {
    name: 'Prêmios - Me Mimei',
    icon: Heart,
    color: 'from-pink-500 to-pink-600',
    borderColor: 'border-pink-500',
    defaultPrizes: [
      { value: '5.00', name: 'Kit Básico de Beleza', probability: 20.0 },
      { value: '10.00', name: 'Perfume Importado', probability: 10.0 },
      { value: '15.00', name: 'Kit Maquiagem', probability: 8.0 },
      { value: '20.00', name: 'Secador de Cabelo', probability: 5.0 },
      { value: '30.00', name: 'Kit Skincare Premium', probability: 3.0 },
      { value: '50.00', name: 'Vale-presente Sephora', probability: 2.0 },
      { value: '75.00', name: 'Kit Spa Completo', probability: 1.0 },
      { value: '100.00', name: 'Chapinha Profissional', probability: 0.5 },
      { value: '150.00', name: 'Kit Luxo de Beleza', probability: 0.3 },
      { value: '200.00', name: 'Vale Salão Premium', probability: 0.2 }
    ]
  },
  'eletronicos': {
    name: 'Prêmios - Eletrônicos',
    icon: Smartphone,
    color: 'from-orange-500 to-orange-600',
    borderColor: 'border-orange-500',
    defaultPrizes: [
      { value: '10.00', name: 'Fone de Ouvido Básico', probability: 15.0 },
      { value: '20.00', name: 'Powerbank 10000mAh', probability: 10.0 },
      { value: '30.00', name: 'Caixa Bluetooth', probability: 7.0 },
      { value: '50.00', name: 'Mouse Gamer', probability: 5.0 },
      { value: '75.00', name: 'Teclado Mecânico', probability: 3.0 },
      { value: '100.00', name: 'Smartwatch', probability: 2.0 },
      { value: '200.00', name: 'Tablet Android', probability: 1.0 },
      { value: '300.00', name: 'Console Videogame', probability: 0.5 },
      { value: '500.00', name: 'Smartphone', probability: 0.3 },
      { value: '1000.00', name: 'Notebook', probability: 0.1 }
    ]
  },
  'super': {
    name: 'Prêmios - Super Prêmios',
    icon: Trophy,
    color: 'from-green-500 to-green-600',
    borderColor: 'border-green-500',
    defaultPrizes: [
      { value: '50.00', name: 'Vale Compras R$ 50', probability: 10.0 },
      { value: '100.00', name: 'Vale Combustível', probability: 5.0 },
      { value: '200.00', name: 'Vale Supermercado', probability: 3.0 },
      { value: '300.00', name: 'Vale Shopping', probability: 2.0 },
      { value: '500.00', name: 'TV 32"', probability: 1.0 },
      { value: '1000.00', name: 'iPhone 13', probability: 0.5 },
      { value: '2000.00', name: 'Geladeira Premium', probability: 0.3 },
      { value: '5000.00', name: 'Moto Elétrica', probability: 0.1 },
      { value: '10000.00', name: 'Viagem Nacional', probability: 0.05 },
      { value: '50000.00', name: 'Carro 0km', probability: 0.01 }
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
      prize_value: '1.00',
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
                    {totalProbability.toFixed(4)}%
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
                    step="0.01"
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