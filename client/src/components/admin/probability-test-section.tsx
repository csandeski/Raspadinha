import React, { useState } from 'react';
import { Shield, RefreshCw, TrendingUp, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

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

export default function AdminProbabilityTestSection() {
  const { toast } = useToast();
  const [gameType, setGameType] = useState<'pix' | 'me-mimei' | 'eletronicos' | 'super-premios'>('pix');
  const [multiplier, setMultiplier] = useState(1);
  const [testCount, setTestCount] = useState(100);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

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

  const batchTestMutation = useMutation({
    mutationFn: async (data: { type: string; multiplier: number; count: number }) => {
      return apiRequest(
        `/api/admin/games/premio-${data.type}/batch-test`,
        'POST',
        { multiplier: data.multiplier, count: data.count }
      );
    }
  });

  const runTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    try {
      // Run batch test in a single request
      const batchResult = await batchTestMutation.mutateAsync({
        type: gameType,
        multiplier,
        count: testCount
      });
      
      if (!batchResult.results) {
        throw new Error('No results returned from batch test');
      }
      
      // Process all results at once
      const processedResults: TestResult[] = batchResult.results.map((game: any) => ({
        timestamp: new Date().toISOString(),
        gameType,
        multiplier,
        result: game.won ? 'WIN' : 'LOSS',
        prize: game.prize,
        actualPrize: game.prize,
        cost: game.cost,
        profit: game.profit
      }));
      
      setTestResults(processedResults);
      
      toast({
        description: `Teste concluído! ${processedResults.length} jogos simulados.`
      });
    } catch (error) {
      // Error handled in UI
      toast({
        description: "Erro ao executar teste",
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  const stats = React.useMemo(() => {
    if (testResults.length === 0) return null;
    
    const wins = testResults.filter(r => r.result === 'WIN');
    const losses = testResults.filter(r => r.result === 'LOSS');
    const winRate = (wins.length / testResults.length * 100).toFixed(2);
    
    const prizeDistribution = new Map<string, number>();
    wins.forEach(w => {
      const prizeValue = w.actualPrize || '0';
      prizeDistribution.set(prizeValue, (prizeDistribution.get(prizeValue) || 0) + 1);
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

  return (
    <div className="space-y-6">
      <div className="bg-black/50 border-zinc-800 backdrop-blur-sm rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-gradient-to-br from-[#00E880] to-[#00B368] rounded-2xl shadow-lg shadow-[#00E880]/20">
            <Shield className="w-6 h-6 text-black" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Teste de Probabilidades</h2>
            <p className="text-gray-400">Simule jogos para verificar as configurações de probabilidade</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Tipo de Jogo</label>
            <select
              value={gameType}
              onChange={(e) => setGameType(e.target.value as any)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-[#00E880] focus:outline-none"
              disabled={isRunning}
            >
              {Object.entries(gameNames).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Multiplicador</label>
            <select
              value={multiplier}
              onChange={(e) => setMultiplier(Number(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-[#00E880] focus:outline-none"
              disabled={isRunning}
            >
              <option value="0">Grátis/Bônus</option>
              <option value="1">1x (R$ {baseCosts[gameType]})</option>
              <option value="5">5x (R$ {baseCosts[gameType] * 5})</option>
              <option value="10">10x (R$ {baseCosts[gameType] * 10})</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Quantidade de Testes</label>
            <select
              value={testCount}
              onChange={(e) => setTestCount(Number(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-[#00E880] focus:outline-none"
              disabled={isRunning}
            >
              <option value="10">10 jogos</option>
              <option value="50">50 jogos</option>
              <option value="100">100 jogos</option>
              <option value="500">500 jogos</option>
              <option value="1000">1000 jogos</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={runTests}
              disabled={isRunning}
              className={`w-full px-4 py-2 rounded-lg font-semibold transition-all ${
                isRunning 
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-[#00E880] to-[#00D470] text-black hover:from-[#00D470] hover:to-[#00C060] shadow-lg shadow-[#00E880]/20'
              }`}
            >
              {isRunning ? (
                <>
                  <RefreshCw className="inline-block w-4 h-4 mr-2 animate-spin" />
                  Executando...
                </>
              ) : (
                'Executar Teste'
              )}
            </button>
          </div>
        </div>
        
        {isRunning && (
          <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-center gap-2 text-blue-400">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Executando teste... {testResults.length} de {testCount} jogos</span>
            </div>
            <div className="mt-2 w-full bg-gray-800 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(testResults.length / testCount) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="bg-black/50 border-zinc-800 backdrop-blur-sm rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#00E880]" />
            Estatísticas do Teste
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <p className="text-sm text-gray-400">Taxa de Vitória</p>
              <p className="text-2xl font-bold text-green-400">{stats.winRate}%</p>
              <p className="text-xs text-gray-500 mt-1">{stats.wins} vitórias</p>
            </div>
            
            <div className="bg-gray-800/50 rounded-lg p-4">
              <p className="text-sm text-gray-400">Total de Jogos</p>
              <p className="text-2xl font-bold text-white">{stats.totalTests}</p>
              <p className="text-xs text-gray-500 mt-1">{stats.losses} derrotas</p>
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
  );
}