import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Save,
  RefreshCw,
  RotateCcw,
  Percent,
  Target,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  BarChart3,
  Sparkles,
  Gamepad2,
  Trophy,
  Gift,
  DollarSign,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

// Custom apiRequest for admin routes
const apiRequest = async (url: string, method: string = "GET", data?: any) => {
  const sessionId = localStorage.getItem('adminSessionId');
  
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': sessionId ? `Bearer ${sessionId}` : '',
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
};

interface Prize {
  value: string;
  name: string;
  probability: number;
  order: number;
}

interface Game {
  id: number;
  game_key: string;
  name: string;
  image_url: string;
  cost: string;
  is_active: boolean;
  prizes?: Prize[];
  probabilities?: Prize[];
}

interface GameProbabilities {
  [key: string]: Prize[];
}

// Game display configuration
const gameConfig: Record<string, { 
  displayName: string; 
  color: string; 
  icon: JSX.Element;
  description: string;
}> = {
  'premio_pix_conta': { 
    displayName: 'PIX na Conta', 
    color: 'border-blue-500',
    icon: <DollarSign className="w-5 h-5" />,
    description: 'Prêmios em dinheiro direto na conta'
  },
  'premio_me_mimei': { 
    displayName: 'Me Mimei', 
    color: 'border-pink-500',
    icon: <Gift className="w-5 h-5" />,
    description: 'Prêmios especiais de autocuidado'
  },
  'premio_eletronicos': { 
    displayName: 'Eletrônicos', 
    color: 'border-orange-500',
    icon: <Gamepad2 className="w-5 h-5" />,
    description: 'Prêmios de eletrônicos e gadgets'
  },
  'premio_super_premios': { 
    displayName: 'Super Prêmios', 
    color: 'border-green-500',
    icon: <Trophy className="w-5 h-5" />,
    description: 'Grandes prêmios e jackpots'
  }
};

export function ProbabilityManagement() {
  const [selectedGame, setSelectedGame] = useState<string>('premio_pix_conta');
  const [editedProbabilities, setEditedProbabilities] = useState<GameProbabilities>({});
  const [hasChanges, setHasChanges] = useState<boolean>(false);

  // Fetch all games
  const { data: games, isLoading: gamesLoading } = useQuery<Game[]>({
    queryKey: ['/api/admin/scratch-games'],
    queryFn: () => apiRequest('/api/admin/scratch-games'),
  });

  // Fetch probabilities for selected game
  const { data: currentProbabilities, refetch: refetchProbabilities } = useQuery({
    queryKey: ['/api/admin/scratch-games', selectedGame, 'probabilities'],
    queryFn: () => apiRequest(`/api/admin/scratch-games/${selectedGame}/probabilities`),
    enabled: !!selectedGame,
  });

  // Initialize edited probabilities when data loads
  useEffect(() => {
    if (currentProbabilities?.probabilities) {
      setEditedProbabilities(prev => ({
        ...prev,
        [selectedGame]: currentProbabilities.probabilities
      }));
      setHasChanges(false);
    }
  }, [currentProbabilities, selectedGame]);

  // Update probabilities mutation
  const updateProbabilitiesMutation = useMutation({
    mutationFn: async ({ gameKey, probabilities }: { gameKey: string; probabilities: Prize[] }) => {
      return apiRequest(`/api/admin/scratch-games/${gameKey}/probabilities`, 'PUT', {
        probabilities: probabilities.map(p => ({
          value: p.value,
          name: p.name,
          probability: p.probability,
          order: p.order
        }))
      });
    },
    onSuccess: (_, { gameKey }) => {
      toast({
        title: "Probabilidades atualizadas",
        description: `As probabilidades do jogo ${gameConfig[gameKey]?.displayName || gameKey} foram atualizadas com sucesso!`,
      });
      refetchProbabilities();
      setHasChanges(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Distribute equally mutation
  const distributeEquallyMutation = useMutation({
    mutationFn: (gameKey: string) => 
      apiRequest(`/api/admin/scratch-games/${gameKey}/distribute-equally`, 'POST'),
    onSuccess: (_, gameKey) => {
      toast({
        title: "Distribuição equalizada",
        description: `As probabilidades foram distribuídas igualmente para ${gameConfig[gameKey]?.displayName}`,
      });
      refetchProbabilities();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao distribuir",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reset to defaults mutation
  const resetDefaultsMutation = useMutation({
    mutationFn: (gameKey: string) => 
      apiRequest(`/api/admin/scratch-games/${gameKey}/reset-defaults`, 'POST'),
    onSuccess: (_, gameKey) => {
      toast({
        title: "Valores padrão restaurados",
        description: `As probabilidades foram resetadas para os valores padrão para ${gameConfig[gameKey]?.displayName}`,
      });
      refetchProbabilities();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao resetar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleProbabilityChange = (prizeIndex: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    const currentGameProbabilities = editedProbabilities[selectedGame] || [];
    const updatedProbabilities = [...currentGameProbabilities];
    updatedProbabilities[prizeIndex] = {
      ...updatedProbabilities[prizeIndex],
      probability: numValue
    };
    
    setEditedProbabilities(prev => ({
      ...prev,
      [selectedGame]: updatedProbabilities
    }));
    setHasChanges(true);
  };

  const calculateTotal = (gameKey: string) => {
    const probabilities = editedProbabilities[gameKey] || [];
    return probabilities.reduce((sum, p) => sum + (p.probability || 0), 0);
  };

  const handleSave = () => {
    const total = calculateTotal(selectedGame);
    if (Math.abs(total - 100) > 0.01) {
      toast({
        title: "Soma inválida",
        description: `A soma das probabilidades deve ser exatamente 100%. Total atual: ${total.toFixed(2)}%`,
        variant: "destructive",
      });
      return;
    }
    
    updateProbabilitiesMutation.mutate({
      gameKey: selectedGame,
      probabilities: editedProbabilities[selectedGame]
    });
  };

  const formatValue = (value: string) => {
    const num = parseFloat(value);
    return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (gamesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#00E880]" />
      </div>
    );
  }

  const activeGames = games?.filter(g => g.game_key.startsWith('premio_')) || [];
  const currentTotal = calculateTotal(selectedGame);
  const isValidTotal = Math.abs(currentTotal - 100) < 0.01;

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
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1, delay: 0.5 }}
            >
              <Percent className="w-8 h-8 text-[#00E880]" />
            </motion.div>
            Gerenciamento de Probabilidades
          </motion.h2>
          <p className="text-zinc-400">Configure as probabilidades de vitória para cada jogo de raspadinha</p>
        </div>
        
        <div className="flex gap-2">
          <Badge variant="outline" className={cn(
            "border-2",
            isValidTotal ? "border-[#00E880] text-[#00E880]" : "border-red-500 text-red-400"
          )}>
            Total: {currentTotal.toFixed(2)}%
          </Badge>
          {hasChanges && (
            <Badge className="border-yellow-500 text-yellow-400">
              Alterações não salvas
            </Badge>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {activeGames.map((game, index) => {
          const config = gameConfig[game.game_key];
          const gameTotal = calculateTotal(game.game_key);
          const isSelected = selectedGame === game.game_key;
          
          return (
            <motion.div
              key={game.game_key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card 
                className={cn(
                  "bg-black/50 border-zinc-800 cursor-pointer transition-all",
                  isSelected && "ring-2 ring-[#00E880] border-[#00E880]"
                )}
                onClick={() => setSelectedGame(game.game_key)}
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-zinc-400 text-sm mb-1">{config?.displayName}</p>
                      <p className="text-2xl font-bold text-white">
                        <CountUp end={gameTotal} decimals={1} duration={0.5} />%
                      </p>
                      <p className="text-xs text-zinc-500 mt-2">Probabilidade Total</p>
                    </div>
                    <div className={cn(
                      "p-3 rounded-xl",
                      `bg-gradient-to-br ${config?.color.replace('border-', 'from-')}/20 ${config?.color.replace('border-', 'to-')}/30`
                    )}>
                      {config?.icon}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Game Tabs */}
      <Tabs value={selectedGame} onValueChange={setSelectedGame}>
        <TabsList className="grid grid-cols-4 w-full">
          {activeGames.map(game => {
            const config = gameConfig[game.game_key];
            return (
              <TabsTrigger key={game.game_key} value={game.game_key}>
                <div className="flex items-center gap-2">
                  {config?.icon}
                  {config?.displayName}
                </div>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {activeGames.map(game => {
          const config = gameConfig[game.game_key];
          const gameProbabilities = editedProbabilities[game.game_key] || [];
          const gameTotal = calculateTotal(game.game_key);
          const isValid = Math.abs(gameTotal - 100) < 0.01;
          
          return (
            <TabsContent key={game.game_key} value={game.game_key}>
              <Card className={cn("bg-black/50 border-2", config?.color)}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                        {config?.icon}
                        {config?.displayName}
                      </CardTitle>
                      <p className="text-sm text-zinc-400 mt-1">{config?.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => distributeEquallyMutation.mutate(game.game_key)}
                        disabled={distributeEquallyMutation.isPending}
                        className="border-zinc-700 hover:bg-zinc-800"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Distribuir Igualmente
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => resetDefaultsMutation.mutate(game.game_key)}
                        disabled={resetDefaultsMutation.isPending}
                        className="border-zinc-700 hover:bg-zinc-800"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Resetar Padrão
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Validation Alert */}
                  {!isValid && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <div className="flex items-center gap-2 text-red-400">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm">
                          A soma das probabilidades deve ser exatamente 100%. Total atual: {gameTotal.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Probabilities Table */}
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-zinc-700">
                          <TableHead className="text-zinc-400">Prêmio</TableHead>
                          <TableHead className="text-zinc-400">Valor</TableHead>
                          <TableHead className="text-zinc-400">Probabilidade (%)</TableHead>
                          <TableHead className="text-zinc-400 text-right">Chance (1 em X)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {gameProbabilities.map((prize, index) => {
                          const chance = prize.probability > 0 ? (100 / prize.probability).toFixed(1) : '∞';
                          return (
                            <TableRow key={index} className="border-zinc-700">
                              <TableCell className="text-white font-medium">{prize.name}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="border-zinc-600">
                                  {formatValue(prize.value)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="100"
                                  value={prize.probability}
                                  onChange={(e) => handleProbabilityChange(index, e.target.value)}
                                  className="w-24 bg-zinc-800 border-zinc-700 text-white"
                                  disabled={updateProbabilitiesMutation.isPending}
                                />
                              </TableCell>
                              <TableCell className="text-right text-zinc-400">
                                1 em {chance}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Total Row */}
                  <div className="mt-4 p-4 bg-zinc-900 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isValid ? (
                          <CheckCircle className="w-5 h-5 text-[#00E880]" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-500" />
                        )}
                        <span className={cn(
                          "font-semibold",
                          isValid ? "text-[#00E880]" : "text-red-400"
                        )}>
                          Probabilidade Total: {gameTotal.toFixed(2)}%
                        </span>
                      </div>
                      
                      {selectedGame === game.game_key && (
                        <Button
                          onClick={handleSave}
                          disabled={!hasChanges || !isValid || updateProbabilitiesMutation.isPending}
                          className="bg-[#00E880] hover:bg-[#00E880]/90 text-black font-semibold"
                        >
                          {updateProbabilitiesMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Salvando...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4 mr-2" />
                              Salvar Alterações
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Info Text */}
                  <div className="mt-4 text-xs text-zinc-400">
                    <p>• A soma de todas as probabilidades deve ser exatamente 100%</p>
                    <p>• Valores menores têm maior probabilidade de aparecer normalmente</p>
                    <p>• Use até 2 casas decimais para ajustes precisos</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}