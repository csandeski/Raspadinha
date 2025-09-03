import React, { useState, useEffect } from 'react';
import { Shield, RefreshCw, TrendingUp, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';

interface TestResult {
  timestamp: string;
  gameType: string;
  multiplier: number;
  result: string;
  prize: string | null;
  actualPrize: string | null;
  cost: number;
  profit: number;
}

export function AdminProbabilityTestPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [gameType, setGameType] = useState<'pix' | 'me-mimei' | 'eletronicos' | 'super-premios'>('pix');
  const [multiplier, setMultiplier] = useState(1);
  const [testCount, setTestCount] = useState(100);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check admin authentication
  useEffect(() => {
    const checkAuth = async () => {
      const sessionId = localStorage.getItem("adminSessionId");
      if (!sessionId) {
        setLocation("/admin/login");
        return;
      }

      try {
        const response = await fetch("/api/admin/check", {
          headers: {
            Authorization: `Bearer ${sessionId}`,
          },
        });
        if (!response.ok) {
          throw new Error("Unauthorized");
        }
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Auth check failed:", error);
        localStorage.removeItem("adminSessionId");
        setLocation("/admin/login");
      }
    };

    checkAuth();
  }, [setLocation]);

  const gameNames = {
    'pix': 'PIX',
    'me-mimei': 'Me Mimei',
    'eletronicos': 'Eletrônicos',
    'super-premios': 'Super Prêmios'
  };

  const baseCosts = {
    'pix': 1,
    'me-mimei': 1,
    'eletronicos': 1,
    'super-premios': 20
  };

  const createGameMutation = useMutation({
    mutationFn: async (data: { type: string; multiplier: number }) => {
      const sessionId = localStorage.getItem("adminSessionId");
      const response = await fetch(`/api/admin/games/premio-${data.type}/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionId}`,
        },
        body: JSON.stringify({ multiplier: data.multiplier })
      });
      return response.json();
    }
  });

  const revealCardMutation = useMutation({
    mutationFn: async (data: { gameId: string; index: number; type: string }) => {
      const sessionId = localStorage.getItem("adminSessionId");
      const response = await fetch(`/api/admin/games/premio-${data.type}/${data.gameId}/reveal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionId}`,
        },
        body: JSON.stringify({ index: data.index })
      });
      return response.json();
    }
  });

  const runTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    const results: TestResult[] = [];

    for (let i = 0; i < testCount; i++) {
      try {
        // Create game
        const createResult = await createGameMutation.mutateAsync({ 
          type: gameType, 
          multiplier 
        });

        if (!createResult.success) {
          console.error('Failed to create game:', createResult);
          continue;
        }

        const gameId = createResult.gameId;
        const revealedCards: any[] = [];

        // Reveal all 9 cards
        for (let cardIndex = 0; cardIndex < 9; cardIndex++) {
          const revealResult = await revealCardMutation.mutateAsync({
            gameId,
            index: cardIndex,
            type: gameType
          });

          if (revealResult.success) {
            revealedCards.push(revealResult);
          }
        }

        // Check if we won (3 matching values)
        const valueCounts = new Map<string, number>();
        revealedCards.forEach(card => {
          if (card.value && card.value !== '') {
            const count = valueCounts.get(card.value) || 0;
            valueCounts.set(card.value, count + 1);
          }
        });

        let wonValue: string | null = null;
        let actualPrize: string | null = null;
        Array.from(valueCounts.entries()).forEach(([value, count]) => {
          if (count >= 3 && !wonValue) {
            wonValue = value;
            // Find the actual prize from the last reveal
            const lastReveal = revealedCards[revealedCards.length - 1];
            if (lastReveal.allRevealed && lastReveal.won) {
              actualPrize = lastReveal.prize;
            }
          }
        });

        const cost = baseCosts[gameType] * multiplier;
        const profit = actualPrize ? parseFloat(actualPrize) - cost : -cost;

        results.push({
          timestamp: new Date().toISOString(),
          gameType,
          multiplier,
          result: wonValue ? 'WIN' : 'LOSS',
          prize: wonValue,
          actualPrize,
          cost,
          profit
        });

        // Update UI every 10 games
        if (i % 10 === 0) {
          setTestResults([...results]);
        }

      } catch (error) {
        console.error('Test error:', error);
      }

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setTestResults(results);
    setIsRunning(false);

    // Calculate stats
    const wins = results.filter(r => r.result === 'WIN').length;
    const winRate = (wins / results.length * 100).toFixed(2);
    const totalProfit = results.reduce((sum, r) => sum + r.profit, 0);

    toast({
      title: "Teste Concluído",
      description: `Taxa de vitória: ${winRate}% | Lucro total: R$ ${totalProfit.toFixed(2)}`
    });
  };

  // Calculate statistics
  const stats = React.useMemo(() => {
    if (testResults.length === 0) return null;

    const wins = testResults.filter(r => r.result === 'WIN');
    const losses = testResults.filter(r => r.result === 'LOSS');
    const winRate = (wins.length / testResults.length * 100).toFixed(2);
    
    const prizeDistribution = new Map<string, number>();
    wins.forEach(w => {
      if (w.prize) {
        prizeDistribution.set(w.prize, (prizeDistribution.get(w.prize) || 0) + 1);
      }
    });

    const totalCost = testResults.reduce((sum, r) => sum + r.cost, 0);
    const totalPrizes = testResults.reduce((sum, r) => sum + (r.actualPrize ? parseFloat(r.actualPrize) : 0), 0);
    const totalProfit = totalPrizes - totalCost;
    const houseEdge = ((totalCost - totalPrizes) / totalCost * 100).toFixed(2);

    return {
      totalTests: testResults.length,
      wins: wins.length,
      losses: losses.length,
      winRate,
      prizeDistribution: Array.from(prizeDistribution.entries()).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0])),
      totalCost,
      totalPrizes,
      totalProfit,
      houseEdge
    };
  }, [testResults]);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-950">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-green-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-950">
      <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-8 h-8 text-green-400" />
        <h1 className="text-3xl font-bold text-white">Teste de Probabilidades</h1>
      </div>

      {/* Controls */}
      <div className="bg-black/50 border-zinc-800 backdrop-blur-sm rounded-xl p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">Configurações do Teste</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Jogo</label>
            <select
              value={gameType}
              onChange={(e) => setGameType(e.target.value as any)}
              className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              disabled={isRunning}
            >
              {Object.entries(gameNames).map(([value, name]) => (
                <option key={value} value={value}>{name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Multiplicador</label>
            <select
              value={multiplier}
              onChange={(e) => setMultiplier(Number(e.target.value))}
              className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              disabled={isRunning}
            >
              <option value={0}>Grátis (Bônus)</option>
              <option value={1}>1x</option>
              <option value={5}>5x</option>
              <option value={10}>10x</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Quantidade de Testes</label>
            <input
              type="number"
              value={testCount}
              onChange={(e) => setTestCount(Number(e.target.value))}
              min={10}
              max={1000}
              step={10}
              className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              disabled={isRunning}
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={runTests}
              disabled={isRunning}
              className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-700 text-black font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Testando...
                </>
              ) : (
                <>
                  <TrendingUp className="w-5 h-5" />
                  Iniciar Teste
                </>
              )}
            </button>
          </div>
        </div>

        {isRunning && (
          <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-400" />
            <p className="text-sm text-yellow-400">
              Executando {testResults.length} de {testCount} testes...
            </p>
          </div>
        )}
      </div>

      {/* Statistics */}
      {stats && (
        <div className="bg-black/50 border-zinc-800 backdrop-blur-sm rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Estatísticas</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <p className="text-sm text-gray-400">Total de Testes</p>
              <p className="text-2xl font-bold text-white">{stats.totalTests}</p>
            </div>
            
            <div className="bg-gray-800/50 rounded-lg p-4">
              <p className="text-sm text-gray-400">Taxa de Vitória</p>
              <p className="text-2xl font-bold text-green-400">{stats.winRate}%</p>
            </div>
            
            <div className="bg-gray-800/50 rounded-lg p-4">
              <p className="text-sm text-gray-400">Margem da Casa</p>
              <p className="text-2xl font-bold text-blue-400">{stats.houseEdge}%</p>
            </div>
            
            <div className="bg-gray-800/50 rounded-lg p-4">
              <p className="text-sm text-gray-400">Lucro Total</p>
              <p className={`text-2xl font-bold ${stats.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                R$ {stats.totalProfit.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Prize Distribution */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Distribuição de Prêmios</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {stats.prizeDistribution.map(([prize, count]) => (
                <div key={prize} className="bg-gray-800/30 rounded-lg p-3">
                  <p className="text-sm text-gray-400">R$ {parseFloat(prize).toFixed(2)}</p>
                  <p className="text-lg font-semibold text-white">
                    {count} ({(count / stats.wins * 100).toFixed(1)}%)
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results Table */}
      {testResults.length > 0 && (
        <div className="bg-black/50 border-zinc-800 backdrop-blur-sm rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Últimos Resultados</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-sm font-medium text-gray-400 pb-3">#</th>
                  <th className="text-left text-sm font-medium text-gray-400 pb-3">Resultado</th>
                  <th className="text-left text-sm font-medium text-gray-400 pb-3">Prêmio</th>
                  <th className="text-left text-sm font-medium text-gray-400 pb-3">Valor Real</th>
                  <th className="text-left text-sm font-medium text-gray-400 pb-3">Custo</th>
                  <th className="text-left text-sm font-medium text-gray-400 pb-3">Lucro</th>
                </tr>
              </thead>
              <tbody>
                {testResults.slice(-20).reverse().map((result, index) => (
                  <tr key={index} className="border-b border-gray-800/50">
                    <td className="py-3 text-sm text-gray-400">
                      {testResults.length - index}
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        result.result === 'WIN' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {result.result}
                      </span>
                    </td>
                    <td className="py-3 text-sm text-white">
                      {result.prize ? `R$ ${parseFloat(result.prize).toFixed(2)}` : '-'}
                    </td>
                    <td className="py-3 text-sm text-white">
                      {result.actualPrize ? `R$ ${parseFloat(result.actualPrize).toFixed(2)}` : '-'}
                    </td>
                    <td className="py-3 text-sm text-gray-400">
                      R$ {result.cost.toFixed(2)}
                    </td>
                    <td className={`py-3 text-sm font-semibold ${
                      result.profit >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      R$ {result.profit.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}