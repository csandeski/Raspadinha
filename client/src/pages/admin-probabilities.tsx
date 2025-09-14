import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, RotateCcw, Percent, History, AlertCircle, CheckCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ScratchGame {
  id: number;
  game_key: string;
  title: string;
  active: boolean;
}

interface GamePrize {
  id: number;
  game_key: string;
  prize_value: number;
  display_name: string;
  asset_path: string;
  active: boolean;
}

interface PrizeProbability {
  id: number;
  prize_id: number;
  probability: string;
  prize_value: number;
  display_name: string;
  asset_path: string;
}

interface AuditLogEntry {
  id: number;
  admin_username: string;
  changes: any;
  created_at: string;
}

export default function AdminProbabilities() {
  const { toast } = useToast();
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [editedProbabilities, setEditedProbabilities] = useState<Record<number, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch games
  const { data: gamesData, isLoading: gamesLoading } = useQuery({
    queryKey: ["/api/admin/scratch-games"],
    enabled: true,
  });

  // Fetch probabilities for selected game
  const { data: probabilitiesData, isLoading: probabilitiesLoading, refetch: refetchProbabilities } = useQuery({
    queryKey: [`/api/admin/scratch-games/${selectedGame}/probabilities`],
    enabled: !!selectedGame,
  });

  // Fetch audit log for selected game
  const { data: auditLogData } = useQuery({
    queryKey: [`/api/admin/scratch-games/${selectedGame}/audit-log`],
    enabled: !!selectedGame,
  });

  // Update probabilities mutation
  const updateProbabilitiesMutation = useMutation({
    mutationFn: async (data: { gameKey: string; probabilities: { prizeId: number; probability: number }[] }) => {
      return apiRequest(`/api/admin/scratch-games/${data.gameKey}/probabilities`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ probabilities: data.probabilities }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Probabilidades atualizadas com sucesso!",
      });
      setEditedProbabilities({});
      setHasChanges(false);
      refetchProbabilities();
      queryClient.invalidateQueries({ queryKey: [`/api/admin/scratch-games/${selectedGame}/audit-log`] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message || "Erro ao atualizar probabilidades",
        variant: "destructive",
      });
    },
  });

  // Distribute equally mutation
  const distributeEquallyMutation = useMutation({
    mutationFn: async (gameKey: string) => {
      return apiRequest(`/api/admin/scratch-games/${gameKey}/distribute-equally`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Probabilidades distribuídas igualmente!",
      });
      setEditedProbabilities({});
      setHasChanges(false);
      refetchProbabilities();
    },
  });

  // Reset to defaults mutation
  const resetDefaultsMutation = useMutation({
    mutationFn: async (gameKey: string) => {
      return apiRequest(`/api/admin/scratch-games/${gameKey}/reset-defaults`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Probabilidades resetadas para o padrão!",
      });
      setEditedProbabilities({});
      setHasChanges(false);
      refetchProbabilities();
    },
  });

  // Calculate total probability
  const calculateTotal = () => {
    if (!probabilitiesData?.probabilities) return 0;
    
    let total = 0;
    probabilitiesData.probabilities.forEach((prob: PrizeProbability) => {
      const value = editedProbabilities[prob.prize_id] !== undefined
        ? parseFloat(editedProbabilities[prob.prize_id] || "0")
        : parseFloat(prob.probability);
      total += value;
    });
    
    return total;
  };

  // Handle probability change
  const handleProbabilityChange = (prizeId: number, value: string) => {
    // Allow only numbers and dots
    if (!/^\d*\.?\d*$/.test(value) && value !== "") return;
    
    setEditedProbabilities({
      ...editedProbabilities,
      [prizeId]: value,
    });
    setHasChanges(true);
  };

  // Handle save
  const handleSave = () => {
    if (!selectedGame || !probabilitiesData?.probabilities) return;
    
    const probabilities = probabilitiesData.probabilities.map((prob: PrizeProbability) => ({
      prizeId: prob.prize_id,
      probability: editedProbabilities[prob.prize_id] !== undefined
        ? parseFloat(editedProbabilities[prob.prize_id] || "0")
        : parseFloat(prob.probability),
    }));
    
    updateProbabilitiesMutation.mutate({
      gameKey: selectedGame,
      probabilities,
    });
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Select first game by default
  useEffect(() => {
    if (gamesData?.games && gamesData.games.length > 0 && !selectedGame) {
      setSelectedGame(gamesData.games[0].game_key);
    }
  }, [gamesData, selectedGame]);

  const total = calculateTotal();
  const isValidTotal = Math.abs(total - 100) < 0.001;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Gerenciamento de Probabilidades
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Configure as probabilidades de prêmios para cada jogo de raspadinha
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Games List */}
          <div className="lg:col-span-1">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Jogos</CardTitle>
                <CardDescription>Selecione um jogo para editar</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {gamesLoading ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-1 p-2">
                    {gamesData?.games?.map((game: ScratchGame) => (
                      <button
                        key={game.game_key}
                        onClick={() => {
                          setSelectedGame(game.game_key);
                          setEditedProbabilities({});
                          setHasChanges(false);
                        }}
                        className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                          selectedGame === game.game_key
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-gray-100 dark:hover:bg-gray-800"
                        }`}
                      >
                        <div className="font-medium">{game.title}</div>
                        <div className="text-sm opacity-70">{game.game_key}</div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {selectedGame ? (
              <Tabs defaultValue="probabilities" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="probabilities">Probabilidades</TabsTrigger>
                  <TabsTrigger value="history">Histórico</TabsTrigger>
                </TabsList>

                {/* Probabilities Tab */}
                <TabsContent value="probabilities" className="space-y-4">
                  {/* Total Summary */}
                  <Alert className={isValidTotal ? "border-green-500" : "border-red-500"}>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Soma Total das Probabilidades</AlertTitle>
                    <AlertDescription className="flex items-center gap-4">
                      <span className="text-2xl font-bold">
                        {total.toFixed(3)}%
                      </span>
                      {isValidTotal ? (
                        <Badge className="bg-green-500">Válido</Badge>
                      ) : (
                        <Badge className="bg-red-500">Inválido - deve ser 100%</Badge>
                      )}
                    </AlertDescription>
                  </Alert>

                  {/* Actions */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Ações Rápidas</CardTitle>
                    </CardHeader>
                    <CardContent className="flex gap-4 flex-wrap">
                      <Button
                        onClick={handleSave}
                        disabled={!hasChanges || !isValidTotal || updateProbabilitiesMutation.isPending}
                        data-testid="button-save-probabilities"
                      >
                        {updateProbabilitiesMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        Salvar Alterações
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditedProbabilities({});
                          setHasChanges(false);
                        }}
                        disabled={!hasChanges}
                        data-testid="button-cancel-changes"
                      >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Cancelar
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => selectedGame && distributeEquallyMutation.mutate(selectedGame)}
                        disabled={distributeEquallyMutation.isPending}
                        data-testid="button-distribute-equally"
                      >
                        {distributeEquallyMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Percent className="mr-2 h-4 w-4" />
                        )}
                        Distribuir Igualmente
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => selectedGame && resetDefaultsMutation.mutate(selectedGame)}
                        disabled={resetDefaultsMutation.isPending}
                        data-testid="button-reset-defaults"
                      >
                        {resetDefaultsMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <RotateCcw className="mr-2 h-4 w-4" />
                        )}
                        Resetar Padrão
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Probabilities Table */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Configuração de Probabilidades</CardTitle>
                      <CardDescription>
                        Ajuste a probabilidade de cada prêmio. A soma deve ser exatamente 100%.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {probabilitiesLoading ? (
                        <div className="flex justify-center p-8">
                          <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                      ) : (
                        <ScrollArea className="h-[500px]">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Prêmio</TableHead>
                                <TableHead>Valor</TableHead>
                                <TableHead>Probabilidade (%)</TableHead>
                                <TableHead>Esperança</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {probabilitiesData?.probabilities?.map((prob: PrizeProbability) => {
                                const currentProb = editedProbabilities[prob.prize_id] !== undefined
                                  ? parseFloat(editedProbabilities[prob.prize_id] || "0")
                                  : parseFloat(prob.probability);
                                const expectedValue = (prob.prize_value * currentProb) / 100;
                                
                                return (
                                  <TableRow key={prob.prize_id}>
                                    <TableCell className="font-medium">
                                      {prob.display_name}
                                    </TableCell>
                                    <TableCell>
                                      {formatCurrency(prob.prize_value)}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <Input
                                          type="text"
                                          value={
                                            editedProbabilities[prob.prize_id] !== undefined
                                              ? editedProbabilities[prob.prize_id]
                                              : prob.probability
                                          }
                                          onChange={(e) =>
                                            handleProbabilityChange(prob.prize_id, e.target.value)
                                          }
                                          className="w-32"
                                          placeholder="0.000"
                                          data-testid={`input-probability-${prob.prize_id}`}
                                        />
                                        <span className="text-gray-500">%</span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-gray-600">
                                      {formatCurrency(expectedValue)}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* History Tab */}
                <TabsContent value="history">
                  <Card>
                    <CardHeader>
                      <CardTitle>Histórico de Alterações</CardTitle>
                      <CardDescription>
                        Últimas 20 alterações realizadas neste jogo
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[600px]">
                        <div className="space-y-4">
                          {auditLogData?.auditLog?.length === 0 ? (
                            <p className="text-center text-gray-500 py-8">
                              Nenhuma alteração registrada ainda
                            </p>
                          ) : (
                            auditLogData?.auditLog?.map((entry: AuditLogEntry) => (
                              <div
                                key={entry.id}
                                className="border rounded-lg p-4 space-y-2"
                              >
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-2">
                                    <History className="h-4 w-4 text-gray-500" />
                                    <span className="font-medium">{entry.admin_username}</span>
                                  </div>
                                  <span className="text-sm text-gray-500">
                                    {format(new Date(entry.created_at), "dd/MM/yyyy HH:mm", {
                                      locale: ptBR,
                                    })}
                                  </span>
                                </div>
                                {entry.changes.action ? (
                                  <div className="text-sm">
                                    <Badge variant="outline">
                                      {entry.changes.action === "distribute_equally"
                                        ? "Distribuição Igual"
                                        : entry.changes.action === "reset_to_defaults"
                                        ? "Reset para Padrão"
                                        : entry.changes.action}
                                    </Badge>
                                    {entry.changes.probability && (
                                      <span className="ml-2">
                                        Probabilidade: {entry.changes.probability}%
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-sm space-y-1">
                                    <div className="font-medium">Alterações:</div>
                                    {entry.changes.old && entry.changes.new && (
                                      <div className="grid grid-cols-2 gap-4 text-xs">
                                        <div>
                                          <span className="text-gray-500">Antes:</span>
                                          <ul className="mt-1">
                                            {entry.changes.old.slice(0, 3).map((item: any, idx: number) => (
                                              <li key={idx}>
                                                {item.name}: {item.probability}%
                                              </li>
                                            ))}
                                            {entry.changes.old.length > 3 && (
                                              <li>... e mais {entry.changes.old.length - 3}</li>
                                            )}
                                          </ul>
                                        </div>
                                        <div>
                                          <span className="text-gray-500">Depois:</span>
                                          <ul className="mt-1">
                                            {entry.changes.new.slice(0, 3).map((item: any, idx: number) => (
                                              <li key={idx}>
                                                ID {item.prizeId}: {item.probability}%
                                              </li>
                                            ))}
                                            {entry.changes.new.length > 3 && (
                                              <li>... e mais {entry.changes.new.length - 3}</li>
                                            )}
                                          </ul>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            ) : (
              <Card className="h-[600px] flex items-center justify-center">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Selecione um jogo
                  </h3>
                  <p className="text-gray-500 mt-2">
                    Escolha um jogo na lista à esquerda para gerenciar suas probabilidades
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}