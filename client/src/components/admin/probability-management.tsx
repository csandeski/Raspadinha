import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Save, Percent, Trophy, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface GameProbability {
  id: number;
  gameType: string;
  enabled: boolean;
  forceWin: boolean;
  forceLose: boolean;
  winProbability: string;
  updatedAt: Date;
}

const gameNames: Record<string, string> = {
  'pix': 'PIX',
  'me_mimei': 'Me Mimei',
  'eletronicos': 'Eletrônicos',
  'super': 'Super Prêmios'
};

export function ProbabilityManagement() {
  const { toast } = useToast();
  const [editedProbabilities, setEditedProbabilities] = useState<Record<string, GameProbability>>({});

  const { data: probabilities, isLoading } = useQuery<GameProbability[]>({
    queryKey: ['/api/admin/game-probabilities'],
  });

  useEffect(() => {
    if (probabilities) {
      const probabilityMap: Record<string, GameProbability> = {};
      probabilities.forEach(p => {
        probabilityMap[p.gameType] = { ...p };
      });
      setEditedProbabilities(probabilityMap);
    }
  }, [probabilities]);

  const updateMutation = useMutation({
    mutationFn: async (updates: GameProbability[]) => {
      const response = await fetch('/api/admin/game-probabilities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminSessionId')}`,
        },
        body: JSON.stringify({ probabilities: updates }),
      });

      if (!response.ok) {
        throw new Error('Falha ao atualizar probabilidades');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/game-probabilities'] });
      toast({
        description: "Probabilidades atualizadas com sucesso",
      });
    },
    onError: (error) => {
      toast({
        description: error.message || "Erro ao atualizar probabilidades",
      });
    },
  });

  const handleToggleEnabled = (gameType: string) => {
    setEditedProbabilities(prev => ({
      ...prev,
      [gameType]: {
        ...prev[gameType],
        enabled: !prev[gameType]?.enabled,
      }
    }));
  };

  const handleModeChange = (gameType: string, mode: 'percentage' | 'forceWin' | 'forceLose') => {
    setEditedProbabilities(prev => ({
      ...prev,
      [gameType]: {
        ...prev[gameType],
        forceWin: mode === 'forceWin',
        forceLose: mode === 'forceLose',
      }
    }));
  };

  const handleProbabilityChange = (gameType: string, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      setEditedProbabilities(prev => ({
        ...prev,
        [gameType]: {
          ...prev[gameType],
          winProbability: value,
        }
      }));
    }
  };

  const handleSave = () => {
    const updates = Object.values(editedProbabilities);
    updateMutation.mutate(updates);
  };

  const hasChanges = () => {
    // Check all game types, not just the ones from backend
    const gameTypes = ['pix', 'me_mimei', 'eletronicos', 'super'];
    
    return gameTypes.some(gameType => {
      const edited = editedProbabilities[gameType];
      const original = probabilities?.find(p => p.gameType === gameType);
      
      // If there's no edited version, no changes
      if (!edited) return false;
      
      // If there's no original, but edited exists, there are changes
      if (!original) return true;
      
      // Compare values
      return (
        edited.enabled !== original.enabled ||
        edited.forceWin !== original.forceWin ||
        edited.forceLose !== original.forceLose ||
        edited.winProbability !== original.winProbability
      );
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-green-400" />
      </div>
    );
  }

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
              <Percent className="w-8 h-8 text-[#00E880]" />
            </motion.div>
            Controle de Probabilidades
          </motion.h2>
          <p className="text-zinc-400">Gerencie as probabilidades de vitória para cada tipo de raspadinha</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Badges de status */}
          <Badge variant="outline" className="border-[#00E880] text-[#00E880]">
            Jogos: 4
          </Badge>
          
          <Button
            onClick={handleSave}
            disabled={!hasChanges() || updateMutation.isPending}
            className="bg-[#00E880] hover:bg-[#00E880]/80 text-black font-semibold"
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {['pix', 'me_mimei', 'eletronicos', 'super'].map((gameType) => {
          const probability = editedProbabilities[gameType] || {
            gameType,
            enabled: false,
            forceWin: false,
            forceLose: false,
            winProbability: '30',
          };

          const getActiveMode = () => {
            if (probability.forceWin) return 'forceWin';
            if (probability.forceLose) return 'forceLose';
            return 'percentage';
          };

          const activeMode = getActiveMode();

          return (
            <Card key={gameType} className="bg-black/50 border-zinc-800 backdrop-blur-sm overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      gameType === 'pix' && "bg-blue-500/20",
                      gameType === 'me_mimei' && "bg-pink-500/20",
                      gameType === 'eletronicos' && "bg-orange-500/20",
                      gameType === 'super' && "bg-green-500/20"
                    )}>
                      <Percent className={cn(
                        "h-5 w-5",
                        gameType === 'pix' && "text-blue-400",
                        gameType === 'me_mimei' && "text-pink-400",
                        gameType === 'eletronicos' && "text-orange-400",
                        gameType === 'super' && "text-green-400"
                      )} />
                    </div>
                    {gameNames[gameType]}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor={`${gameType}-enabled`} className="text-sm text-gray-400">
                      Ativo
                    </Label>
                    <Switch
                      id={`${gameType}-enabled`}
                      checked={probability.enabled}
                      onCheckedChange={() => handleToggleEnabled(gameType)}
                      className="data-[state=checked]:bg-green-500"
                    />
                  </div>
                </div>

                {probability.enabled && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => handleModeChange(gameType, 'percentage')}
                        className={cn(
                          "p-3 rounded-lg border-2 transition-all duration-200",
                          activeMode === 'percentage'
                            ? "border-green-500 bg-green-500/10"
                            : "border-zinc-700 hover:border-zinc-600"
                        )}
                      >
                        <Percent className="h-4 w-4 mx-auto mb-1 text-gray-400" />
                        <span className="text-xs text-gray-300">Percentual</span>
                      </button>
                      <button
                        onClick={() => handleModeChange(gameType, 'forceWin')}
                        className={cn(
                          "p-3 rounded-lg border-2 transition-all duration-200",
                          activeMode === 'forceWin'
                            ? "border-green-500 bg-green-500/10"
                            : "border-zinc-700 hover:border-zinc-600"
                        )}
                      >
                        <Trophy className="h-4 w-4 mx-auto mb-1 text-green-400" />
                        <span className="text-xs text-gray-300">Sempre Ganhar</span>
                      </button>
                      <button
                        onClick={() => handleModeChange(gameType, 'forceLose')}
                        className={cn(
                          "p-3 rounded-lg border-2 transition-all duration-200",
                          activeMode === 'forceLose'
                            ? "border-red-500 bg-red-500/10"
                            : "border-zinc-700 hover:border-zinc-600"
                        )}
                      >
                        <X className="h-4 w-4 mx-auto mb-1 text-red-400" />
                        <span className="text-xs text-gray-300">Sempre Perder</span>
                      </button>
                    </div>

                    {activeMode === 'percentage' && (
                      <div className="space-y-2">
                        <Label className="text-sm text-gray-400">
                          Probabilidade de Vitória (%)
                        </Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={probability.winProbability}
                            onChange={(e) => handleProbabilityChange(gameType, e.target.value)}
                            className="bg-black/50 border-zinc-700 text-white"
                          />
                          <span className="text-gray-400">%</span>
                        </div>
                        <p className="text-xs text-gray-500">
                          Chance de ganhar qualquer prêmio neste jogo
                        </p>
                      </div>
                    )}

                    {activeMode === 'forceWin' && (
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                        <p className="text-sm text-green-400">
                          Todos os jogadores ganharão neste jogo
                        </p>
                      </div>
                    )}

                    {activeMode === 'forceLose' && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                        <p className="text-sm text-red-400">
                          Todos os jogadores perderão neste jogo
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-300 mb-2">Notas Importantes:</h4>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>• As configurações afetam apenas novos jogos criados após as alterações</li>
          <li>• O modo "Sempre Ganhar" garante que o jogador sempre encontre 3 símbolos iguais</li>
          <li>• O modo "Sempre Perder" garante que o jogador nunca encontre 3 símbolos iguais</li>
          <li>• A probabilidade percentual define a chance geral de vitória em cada jogo</li>
          <li>• A conta de teste (teste@gmail.com) sempre ganha independente das configurações</li>
        </ul>
      </div>
    </div>
  );
}