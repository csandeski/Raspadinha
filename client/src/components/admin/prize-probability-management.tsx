import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Save, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw,
  TrendingUp,
  DollarSign,
  Gift,
  Zap,
  Trophy,
  Info,
  History,
  Lock,
  Unlock,
  Calculator,
  BarChart3,
  Settings
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Prize {
  value: string;
  name: string;
  probability: number;
  order: number;
}

interface GameProbability {
  gameKey: string;
  name: string;
  cost: string;
  image: string;
  isActive: boolean;
  prizes: Prize[];
  totalProbability: number;
}

const gameIcons = {
  'premio-pix': DollarSign,
  'premio-me-mimei': Gift,
  'premio-eletronicos': Zap,
  'premio-super-premios': Trophy
};

const gameColors = {
  'premio-pix': 'from-green-500 to-emerald-600',
  'premio-me-mimei': 'from-pink-500 to-rose-600',
  'premio-eletronicos': 'from-blue-500 to-cyan-600',
  'premio-super-premios': 'from-purple-500 to-violet-600'
};

export default function PrizeProbabilityManagement() {
  const [activeGame, setActiveGame] = useState<string>('premio-pix');
  const [editedProbabilities, setEditedProbabilities] = useState<Record<string, GameProbability>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showHistory, setShowHistory] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const { toast } = useToast();

  // Fetch game probabilities
  const { data: games, isLoading, refetch } = useQuery({
    queryKey: ['/api/admin/prize-probabilities'],
    queryFn: async () => {
      const sessionId = localStorage.getItem("adminSessionId");
      const response = await fetch("/api/admin/prize-probabilities", {
        headers: {
          Authorization: `Bearer ${sessionId}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch probabilities");
      const data = await response.json();
      
      // Transform the data to match the expected format
      const transformedData = Object.entries(data).map(([gameType, probabilities]: [string, any]) => {
        const gameNames: Record<string, string> = {
          'premio-pix': 'Prêmio PIX',
          'premio-me-mimei': 'Me Mimei',
          'premio-eletronicos': 'Eletrônicos',
          'premio-super-premios': 'Super Prêmios'
        };
        
        const gameCosts: Record<string, string> = {
          'premio-pix': '1.00',
          'premio-me-mimei': '1.00',
          'premio-eletronicos': '1.00',
          'premio-super-premios': '20.00'
        };
        
        return {
          gameKey: gameType,
          name: gameNames[gameType] || gameType,
          cost: gameCosts[gameType] || '1.00',
          image: '',
          isActive: true,
          prizes: probabilities.map((p: any) => ({
            value: p.prizeValue,
            name: p.prizeName,
            probability: parseFloat(p.probability),
            order: 0
          })),
          totalProbability: probabilities.reduce((sum: number, p: any) => sum + parseFloat(p.probability), 0)
        };
      });
      
      return transformedData;
    },
  });

  // Fetch history
  const { data: history } = useQuery({
    queryKey: ['/api/admin/probabilities/history'],
    queryFn: async () => {
      const sessionId = localStorage.getItem("adminSessionId");
      const response = await fetch("/api/admin/probabilities/history", {
        headers: {
          Authorization: `Bearer ${sessionId}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch history");
      return response.json();
    },
    enabled: showHistory,
  });

  // Save probabilities mutation
  const saveMutation = useMutation({
    mutationFn: async (data: { gameKey: string; probabilities: Prize[] }) => {
      const sessionId = localStorage.getItem("adminSessionId");
      
      // Transform the data to match the backend format
      const transformedProbs = data.probabilities.map(p => ({
        prizeValue: parseFloat(p.value),
        probability: p.probability
      }));
      
      const response = await fetch(`/api/admin/prize-probabilities/${data.gameKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionId}`,
        },
        body: JSON.stringify({ probabilities: transformedProbs }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save probabilities");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Probabilidades salvas com sucesso",
      });
      setHasChanges(false);
      setIsEditMode(false);
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar probabilidades",
        variant: "destructive",
      });
    },
  });

  // Initialize edited probabilities when data loads
  useEffect(() => {
    if (games && !Object.keys(editedProbabilities).length) {
      const initial: Record<string, GameProbability> = {};
      games.forEach((game: GameProbability) => {
        initial[game.gameKey] = {
          ...game,
          totalProbability: game.prizes.reduce((sum, p) => sum + p.probability, 0)
        };
      });
      setEditedProbabilities(initial);
    }
  }, [games]);

  const handleProbabilityChange = (gameKey: string, prizeIndex: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    if (numValue < 0 || numValue > 100) return;

    const updated = { ...editedProbabilities };
    if (!updated[gameKey]) return;

    updated[gameKey].prizes[prizeIndex].probability = numValue;
    updated[gameKey].totalProbability = updated[gameKey].prizes.reduce(
      (sum, p) => sum + p.probability, 
      0
    );

    setEditedProbabilities(updated);
    setHasChanges(true);
    validateGame(gameKey, updated[gameKey]);
  };

  const handleSliderChange = (gameKey: string, prizeIndex: number, value: number[]) => {
    handleProbabilityChange(gameKey, prizeIndex, value[0].toString());
  };

  const validateGame = (gameKey: string, game: GameProbability) => {
    const errors = { ...validationErrors };
    const total = game.totalProbability;

    if (Math.abs(total - 100) > 0.01) {
      errors[gameKey] = `Total: ${total.toFixed(2)}% (deve ser 100%)`;
    } else {
      delete errors[gameKey];
    }

    setValidationErrors(errors);
  };

  const canSave = (gameKey: string) => {
    const game = editedProbabilities[gameKey];
    if (!game) return false;
    return Math.abs(game.totalProbability - 100) < 0.01;
  };

  const handleSave = (gameKey: string) => {
    const game = editedProbabilities[gameKey];
    if (!game || !canSave(gameKey)) return;

    saveMutation.mutate({
      gameKey,
      probabilities: game.prizes,
    });
  };

  const distributeEqually = (gameKey: string) => {
    const game = editedProbabilities[gameKey];
    if (!game) return;

    const equalProb = 100 / game.prizes.length;
    const updated = { ...editedProbabilities };
    updated[gameKey].prizes = updated[gameKey].prizes.map(p => ({
      ...p,
      probability: parseFloat(equalProb.toFixed(2))
    }));
    
    // Adjust last item for rounding errors
    const total = updated[gameKey].prizes.reduce((sum, p) => sum + p.probability, 0);
    if (total !== 100) {
      updated[gameKey].prizes[updated[gameKey].prizes.length - 1].probability += 100 - total;
    }
    
    updated[gameKey].totalProbability = 100;
    setEditedProbabilities(updated);
    setHasChanges(true);
    validateGame(gameKey, updated[gameKey]);
  };

  const resetToDefaults = (gameKey: string) => {
    const original = games?.find((g: GameProbability) => g.gameKey === gameKey);
    if (!original) return;

    const updated = { ...editedProbabilities };
    updated[gameKey] = {
      ...original,
      totalProbability: original.prizes.reduce((sum, p) => sum + p.probability, 0)
    };
    
    setEditedProbabilities(updated);
    setHasChanges(false);
    validateGame(gameKey, updated[gameKey]);
  };

  const formatPrizeValue = (value: string, gameKey: string) => {
    if (gameKey === 'premio-pix' || gameKey === 'premio-super-premios') {
      return `R$ ${parseFloat(value).toFixed(2)}`;
    }
    return value;
  };

  const getProbabilityColor = (probability: number) => {
    if (probability === 0) return 'text-gray-500';
    if (probability < 1) return 'text-red-500';
    if (probability < 5) return 'text-orange-500';
    if (probability < 10) return 'text-yellow-500';
    if (probability < 20) return 'text-green-500';
    return 'text-emerald-500';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-[#00E880]" />
      </div>
    );
  }

  const currentGame = editedProbabilities[activeGame];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-zinc-900 to-black border-zinc-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl text-white">
                Gerenciamento de Probabilidades
              </CardTitle>
              <p className="text-zinc-400 mt-2">
                Configure as probabilidades de prêmios para cada jogo de raspadinha
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
                className="border-zinc-700 hover:bg-zinc-800"
              >
                <History className="w-4 h-4 mr-2" />
                Histórico
              </Button>
              <Button
                variant={isEditMode ? "destructive" : "outline"}
                size="sm"
                onClick={() => setIsEditMode(!isEditMode)}
                className={isEditMode ? "" : "border-zinc-700 hover:bg-zinc-800"}
              >
                {isEditMode ? <Unlock className="w-4 h-4 mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                {isEditMode ? "Modo Edição" : "Visualização"}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Game Tabs */}
      <Tabs value={activeGame} onValueChange={setActiveGame}>
        <TabsList className="grid grid-cols-4 w-full bg-zinc-900 border border-zinc-800">
          {games?.map((game: GameProbability) => {
            const Icon = gameIcons[game.gameKey as keyof typeof gameIcons];
            const hasError = validationErrors[game.gameKey];
            return (
              <TabsTrigger 
                key={game.gameKey} 
                value={game.gameKey}
                className="relative data-[state=active]:bg-zinc-800"
              >
                <Icon className="w-4 h-4 mr-2" />
                {game.name}
                {hasError && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={activeGame} className="space-y-4">
          {currentGame && (
            <>
              {/* Game Info Card */}
              <Card className="bg-gradient-to-br from-zinc-900 to-black border-zinc-800">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-lg bg-gradient-to-br ${gameColors[activeGame as keyof typeof gameColors]}`}>
                        {gameIcons[activeGame as keyof typeof gameIcons] && 
                          (() => {
                            const Icon = gameIcons[activeGame as keyof typeof gameIcons];
                            return <Icon className="w-6 h-6 text-white" />;
                          })()
                        }
                      </div>
                      <div>
                        <p className="text-sm text-zinc-500">Custo do Jogo</p>
                        <p className="text-xl font-bold text-white">R$ {currentGame.cost}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500">Total de Prêmios</p>
                      <p className="text-xl font-bold text-white">{currentGame.prizes.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500">Status</p>
                      <Badge variant={currentGame.isActive ? "default" : "secondary"}>
                        {currentGame.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Probability Total */}
              <Card className="bg-gradient-to-br from-zinc-900 to-black border-zinc-800">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-zinc-500">Probabilidade Total</p>
                        <p className={`text-3xl font-bold ${
                          Math.abs(currentGame.totalProbability - 100) < 0.01 
                            ? 'text-[#00E880]' 
                            : 'text-red-500'
                        }`}>
                          {currentGame.totalProbability.toFixed(2)}%
                        </p>
                      </div>
                      {isEditMode && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => distributeEqually(activeGame)}
                            className="border-zinc-700 hover:bg-zinc-800"
                          >
                            <Calculator className="w-4 h-4 mr-2" />
                            Distribuir Igualmente
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resetToDefaults(activeGame)}
                            className="border-zinc-700 hover:bg-zinc-800"
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Restaurar Padrão
                          </Button>
                        </div>
                      )}
                    </div>
                    <Progress 
                      value={Math.min(currentGame.totalProbability, 100)} 
                      className="h-3 bg-zinc-800"
                    />
                    {validationErrors[activeGame] && (
                      <Alert className="border-red-500 bg-red-950/50">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        <AlertDescription className="text-red-400">
                          {validationErrors[activeGame]}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Prizes List */}
              <Card className="bg-gradient-to-br from-zinc-900 to-black border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-lg text-white">Configuração de Prêmios</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {currentGame.prizes.map((prize, index) => (
                      <motion.div
                        key={`${activeGame}-${index}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-all"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#00E880] to-emerald-600 flex items-center justify-center text-white font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <p className="text-sm text-zinc-500">Prêmio</p>
                              <p className="text-lg font-semibold text-white">
                                {formatPrizeValue(prize.value, activeGame)}
                              </p>
                              {prize.name && (
                                <p className="text-xs text-zinc-600">{prize.name}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex-1">
                            {isEditMode ? (
                              <div className="space-y-2">
                                <div className="flex items-center gap-4">
                                  <Slider
                                    value={[prize.probability]}
                                    onValueChange={(value) => handleSliderChange(activeGame, index, value)}
                                    max={100}
                                    step={0.01}
                                    className="flex-1"
                                    disabled={!isEditMode}
                                  />
                                  <Input
                                    type="number"
                                    value={prize.probability}
                                    onChange={(e) => handleProbabilityChange(activeGame, index, e.target.value)}
                                    className="w-24 bg-zinc-800 border-zinc-700 text-white"
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    disabled={!isEditMode}
                                  />
                                  <span className="text-zinc-400 w-8">%</span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-4">
                                <Progress 
                                  value={prize.probability} 
                                  className="flex-1 h-2 bg-zinc-800"
                                />
                                <span className={`font-semibold ${getProbabilityColor(prize.probability)}`}>
                                  {prize.probability.toFixed(2)}%
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex justify-end">
                            <Badge 
                              variant={prize.probability > 0 ? "default" : "secondary"}
                              className={prize.probability > 0 ? "bg-[#00E880]" : ""}
                            >
                              {prize.probability > 0 ? "Ativo" : "Desativado"}
                            </Badge>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Save Button */}
              {isEditMode && hasChanges && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="sticky bottom-4 z-10"
                >
                  <Card className="bg-gradient-to-r from-[#00E880] to-emerald-600 border-0">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Info className="w-5 h-5 text-white" />
                          <p className="text-white font-medium">
                            Você tem alterações não salvas
                          </p>
                        </div>
                        <Button
                          onClick={() => handleSave(activeGame)}
                          disabled={!canSave(activeGame) || saveMutation.isPending}
                          size="lg"
                          className="bg-white text-black hover:bg-zinc-100"
                        >
                          {saveMutation.isPending ? (
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4 mr-2" />
                          )}
                          Salvar Alterações
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* History Modal */}
      <AnimatePresence>
        {showHistory && history && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowHistory(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto"
            >
              <h3 className="text-xl font-bold text-white mb-4">Histórico de Alterações</h3>
              <div className="space-y-3">
                {history.map((entry: any, index: number) => (
                  <div key={index} className="p-3 bg-zinc-800 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-zinc-400">
                        {new Date(entry.createdAt).toLocaleString('pt-BR')}
                      </span>
                      <Badge>{entry.gameKey}</Badge>
                    </div>
                    <p className="text-sm text-zinc-300">
                      Alterado por: {entry.updatedBy}
                    </p>
                  </div>
                ))}
              </div>
              <Button
                onClick={() => setShowHistory(false)}
                className="mt-4 w-full"
                variant="outline"
              >
                Fechar
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}