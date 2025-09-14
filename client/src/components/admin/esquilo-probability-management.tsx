import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Save, AlertCircle, TestTube, Gamepad2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

interface EsquiloProbability {
  id?: number;
  prizeType: string;
  multiplier: number;
  probability: number;
  forDemo: boolean;
}

const prizeNames: Record<string, string> = {
  'pinecone': 'Pinha',
  'acorn': 'Bolota',
  'apple': 'Maçã',
  'ring': 'Anel',
  'goldenacorn': 'Bolota Dourada'
};

const prizeColors: Record<string, string> = {
  'pinecone': 'text-amber-600',
  'acorn': 'text-yellow-600',
  'apple': 'text-red-500',
  'ring': 'text-purple-600',
  'goldenacorn': 'text-yellow-400'
};

export function EsquiloProbabilityManagement() {
  const { toast } = useToast();
  const [editedProbabilities, setEditedProbabilities] = useState<EsquiloProbability[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const { data: probabilities, isLoading } = useQuery<EsquiloProbability[]>({
    queryKey: ['/api/admin/esquilo-probabilities', isDemoMode],
    queryFn: async () => {
      const url = `/api/admin/esquilo-probabilities${isDemoMode ? '?demo=true' : ''}`;
      
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
    if (probabilities && probabilities.length > 0) {
      setEditedProbabilities([...probabilities]);
      setHasChanges(false);
    } else {
      // Set default probabilities if none exist
      setEditedProbabilities([
        { prizeType: 'pinecone', multiplier: 0.3, probability: 30, forDemo: isDemoMode },
        { prizeType: 'acorn', multiplier: 0.5, probability: 25, forDemo: isDemoMode },
        { prizeType: 'apple', multiplier: 0.8, probability: 25, forDemo: isDemoMode },
        { prizeType: 'ring', multiplier: 2.0, probability: 15, forDemo: isDemoMode },
        { prizeType: 'goldenacorn', multiplier: 5.0, probability: 5, forDemo: isDemoMode }
      ]);
    }
  }, [probabilities, isDemoMode]);

  const updateMutation = useMutation({
    mutationFn: async (prizes: EsquiloProbability[]) => {
      const response = await fetch('/api/admin/esquilo-probabilities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminSessionId')}`,
        },
        body: JSON.stringify({ 
          prizes: prizes.map(p => ({
            prizeType: p.prizeType,
            multiplier: p.multiplier,
            probability: p.probability
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
      queryClient.invalidateQueries({ queryKey: ['/api/admin/esquilo-probabilities', isDemoMode] });
      toast({
        title: "Sucesso",
        description: `Probabilidades do Esquilo Mania ${isDemoMode ? '(Demo)' : ''} atualizadas!`,
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

  const handleProbabilityChange = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    const newProbabilities = [...editedProbabilities];
    newProbabilities[index].probability = numValue;
    setEditedProbabilities(newProbabilities);
    setHasChanges(true);
  };

  const handleSave = () => {
    const total = editedProbabilities.reduce((sum, p) => sum + (parseFloat(String(p.probability)) || 0), 0);
    if (Math.abs(total - 100) > 0.01) {
      toast({
        title: "Erro",
        description: `A soma das probabilidades deve ser exatamente 100%. Total atual: ${total.toFixed(2)}%`,
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate(editedProbabilities);
  };
  
  const handleReset = () => {
    const defaultProbabilities = [
      { prizeType: 'pinecone', multiplier: 0.3, probability: 30, forDemo: isDemoMode },
      { prizeType: 'acorn', multiplier: 0.5, probability: 25, forDemo: isDemoMode },
      { prizeType: 'apple', multiplier: 0.8, probability: 25, forDemo: isDemoMode },
      { prizeType: 'ring', multiplier: 2.0, probability: 15, forDemo: isDemoMode },
      { prizeType: 'goldenacorn', multiplier: 5.0, probability: 5, forDemo: isDemoMode }
    ];
    
    setEditedProbabilities(defaultProbabilities);
    setHasChanges(true);
    
    toast({
      title: "Valores Restaurados",
      description: "As probabilidades foram resetadas para os valores padrão (30%, 25%, 25%, 15%, 5%)",
    });
  };

  const totalProbability = editedProbabilities.reduce((sum, p) => sum + (parseFloat(String(p.probability)) || 0), 0);
  const isValid = Math.abs(totalProbability - 100) < 0.01;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Gamepad2 className="w-7 h-7" />
              Esquilo Mania - Probabilidades
            </h2>
            <p className="text-green-100 mt-1">
              Configure as probabilidades dos prêmios (sempre terá 2 raposas)
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="demo-mode" className="text-white">
                {isDemoMode ? 'Demo (CPF: 999.999.999-99)' : 'Normal'}
              </Label>
              <Switch
                id="demo-mode"
                checked={isDemoMode}
                onCheckedChange={setIsDemoMode}
                className="data-[state=checked]:bg-green-400"
              />
            </div>
            {isDemoMode && (
              <Badge className="bg-yellow-500 text-black">
                <TestTube className="w-3 h-3 mr-1" />
                Modo Demo
              </Badge>
            )}
          </div>
        </div>
      </div>

      <Card className="border-green-500/20">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {editedProbabilities.map((prize, index) => (
                <motion.div
                  key={prize.prizeType}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-[#1a1f2e]/50 rounded-xl p-4 border border-gray-800"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={cn("font-semibold text-lg", prizeColors[prize.prizeType])}>
                      {prizeNames[prize.prizeType]}
                    </span>
                    <Badge variant="secondary" className="bg-green-500/10 text-green-400 border-green-500/20">
                      {prize.multiplier}x
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-400">Probabilidade (%)</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={prize.probability}
                        onChange={(e) => handleProbabilityChange(index, e.target.value)}
                        className="bg-[#0a0e1a] border-gray-700"
                      />
                      <span className="text-sm text-gray-500">%</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="bg-[#1a1f2e]/50 rounded-xl p-4 border border-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {!isValid && (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                  <span className={cn(
                    "font-semibold",
                    isValid ? "text-green-400" : "text-red-400"
                  )}>
                    Total: {totalProbability.toFixed(2)}%
                  </span>
                  {isValid && (
                    <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                      Válido
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-gray-400">
                  Deve somar exatamente 100%
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={handleReset}
                className="border-purple-500/20 hover:bg-purple-500/10"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Resetar para Padrão
              </Button>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (probabilities) {
                      setEditedProbabilities([...probabilities]);
                      setHasChanges(false);
                    }
                  }}
                  disabled={!hasChanges || updateMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!hasChanges || !isValid || updateMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {updateMutation.isPending ? (
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
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}