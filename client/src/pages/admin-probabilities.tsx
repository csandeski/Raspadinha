import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertCircle, Save, Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Prize {
  id: number;
  prize_key: string;
  prize_name: string;
  prize_value: number;
  probability: number;
  multiplier: number;
  rarity: string;
  color: string;
}

interface GameProbabilities {
  prizes: Prize[];
  totalProbability: string;
  isValid: boolean;
}

const GAMES = [
  { id: 'premio_pix', name: 'Prêmio PIX', icon: '💰' },
  { id: 'premio_me_mimei', name: 'Me Mimei', icon: '💄' },
  { id: 'premio_eletronicos', name: 'Eletrônicos', icon: '📱' },
  { id: 'premio_super_premios', name: 'Super Prêmios', icon: '🎁' }
];

export default function AdminProbabilities() {
  const [selectedGame, setSelectedGame] = useState('premio_pix');
  const [editedPrizes, setEditedPrizes] = useState<Prize[]>([]);
  const [totalProb, setTotalProb] = useState(0);

  // Fetch probabilities for selected game
  const { data: gameProbs, isLoading } = useQuery<GameProbabilities>({
    queryKey: [`/api/admin/custom-probabilities/${selectedGame}`],
    enabled: !!selectedGame
  });

  // Update probabilities mutation
  const updateProbMutation = useMutation({
    mutationFn: async (prizes: Prize[]) => {
      const response = await fetch(`/api/admin/custom-probabilities/${selectedGame}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminSessionId')}`
        },
        body: JSON.stringify({ prizes })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao atualizar probabilidades');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Probabilidades atualizadas com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/custom-probabilities/${selectedGame}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Initialize edited prizes when data loads
  useEffect(() => {
    if (gameProbs?.prizes) {
      setEditedPrizes(gameProbs.prizes);
      calculateTotal(gameProbs.prizes);
    }
  }, [gameProbs]);

  const calculateTotal = (prizes: Prize[]) => {
    const total = prizes.reduce((sum, prize) => sum + parseFloat(prize.probability.toString()), 0);
    setTotalProb(total);
  };

  const handleProbabilityChange = (prizeKey: string, newProb: string) => {
    const updated = editedPrizes.map(prize => 
      prize.prize_key === prizeKey 
        ? { ...prize, probability: parseFloat(newProb) || 0 }
        : prize
    );
    setEditedPrizes(updated);
    calculateTotal(updated);
  };

  const handleSave = () => {
    if (Math.abs(totalProb - 100) > 0.01) {
      toast({
        title: "Erro",
        description: `As probabilidades devem somar 100%. Total atual: ${totalProb.toFixed(2)}%`,
        variant: "destructive"
      });
      return;
    }
    updateProbMutation.mutate(editedPrizes);
  };

  const getRarityColor = (rarity: string) => {
    switch(rarity) {
      case 'common': return 'text-gray-500';
      case 'rare': return 'text-blue-500';
      case 'epic': return 'text-purple-500';
      case 'legendary': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-yellow-500" />
          Gerenciar Probabilidades dos Jogos
        </h1>
        <p className="text-muted-foreground mt-2">
          Configure a probabilidade de cada prêmio individualmente
        </p>
      </div>

      <Tabs value={selectedGame} onValueChange={setSelectedGame}>
        <TabsList className="grid grid-cols-4 w-full mb-6">
          {GAMES.map(game => (
            <TabsTrigger key={game.id} value={game.id} className="flex items-center gap-2">
              <span className="text-xl">{game.icon}</span>
              <span>{game.name}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {GAMES.map(game => (
          <TabsContent key={game.id} value={game.id}>
            <Card className="p-6">
              {isLoading ? (
                <div className="text-center py-8">Carregando probabilidades...</div>
              ) : (
                <>
                  <div className="mb-4">
                    <Alert className={totalProb === 100 ? "border-green-500" : "border-yellow-500"}>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Total de Probabilidades: {totalProb.toFixed(2)}%</strong>
                        {totalProb !== 100 && (
                          <span className="text-red-500 ml-2">
                            (Deve ser exatamente 100%)
                          </span>
                        )}
                      </AlertDescription>
                    </Alert>
                  </div>

                  <div className="space-y-3">
                    {editedPrizes.map(prize => (
                      <div key={prize.prize_key} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                        <div className="flex-1">
                          <div className="font-medium flex items-center gap-2">
                            <span className={getRarityColor(prize.rarity)}>
                              {prize.prize_name}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              (Valor: R$ {prize.prize_value})
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Multiplicador: {prize.multiplier}x
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={prize.probability}
                            onChange={(e) => handleProbabilityChange(prize.prize_key, e.target.value)}
                            className="w-24 text-right"
                            disabled={prize.prize_key === 'lose'}
                          />
                          <span className="text-muted-foreground">%</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex justify-end">
                    <Button 
                      onClick={handleSave}
                      disabled={Math.abs(totalProb - 100) > 0.01 || updateProbMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      <Save className="h-4 w-4" />
                      {updateProbMutation.isPending ? 'Salvando...' : 'Salvar Probabilidades'}
                    </Button>
                  </div>
                </>
              )}
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}