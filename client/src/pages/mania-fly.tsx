import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { MobileLayout } from "@/components/mobile-layout";
import { ArrowLeft, Plane, Play, DollarSign, History, TrendingUp, TrendingDown, Zap } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Types
interface Bet {
  amount: number;
  autoCashout?: number;
  status: 'idle' | 'placed' | 'won' | 'lost';
  winMultiplier?: number;
  profit?: number;
}

export default function ManiaFly() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Game state - simplified
  const [currentMultiplier, setCurrentMultiplier] = useState(0.00);
  const [gameStatus, setGameStatus] = useState<'waiting' | 'flying' | 'crashed'>('waiting');
  const [history, setHistory] = useState<number[]>([2.34, 1.45, 5.67, 1.23, 3.89, 10.45, 1.56, 2.78, 1.12, 4.56]);
  const [gameInterval, setGameInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Betting state
  const [bet1, setBet1] = useState<Bet>({ amount: 1, status: 'idle' });
  const [bet2, setBet2] = useState<Bet>({ amount: 1, status: 'idle' });
  const [bet1Input, setBet1Input] = useState("1");
  const [bet2Input, setBet2Input] = useState("1");
  const [autoCashout1, setAutoCashout1] = useState("");
  const [autoCashout2, setAutoCashout2] = useState("");
  
  // Query user balance
  const { data: userWallet } = useQuery<{
    balance: string;
    scratchBonus: number;
  }>({
    queryKey: ['/api/user/balance'],
  });

  const balance = parseFloat(userWallet?.balance || "0");

  // Place bet mutation
  const placeBetMutation = useMutation({
    mutationFn: async (data: { betNumber: 1 | 2; amount: number }) => {
      return apiRequest('/api/games/mania-fly/bet', 'POST', { 
        amount: data.amount,
        roundId: `round-${Date.now()}`
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/balance'] });
      
      if (variables.betNumber === 1) {
        setBet1({
          amount: variables.amount,
          autoCashout: autoCashout1 ? parseFloat(autoCashout1) : undefined,
          status: 'placed'
        });
      } else {
        setBet2({
          amount: variables.amount,
          autoCashout: autoCashout2 ? parseFloat(autoCashout2) : undefined,
          status: 'placed'
        });
      }
      
      toast({
        title: "✅ Aposta realizada!",
        description: `Aposta de ${formatMoney(variables.amount)} confirmada`,
        className: "bg-green-900/90 border-green-500"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao fazer aposta",
        description: error.message || "Tente novamente",
        variant: "destructive"
      });
    }
  });

  // Cash out mutation  
  const cashOutMutation = useMutation({
    mutationFn: async (data: { betNumber: 1 | 2; multiplier: number }) => {
      const bet = data.betNumber === 1 ? bet1 : bet2;
      const profit = bet.amount * data.multiplier;
      
      return apiRequest('/api/games/mania-fly/cashout', 'POST', { 
        multiplier: data.multiplier,
        profit,
        roundId: `round-${Date.now()}`
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/balance'] });
      
      const bet = variables.betNumber === 1 ? bet1 : bet2;
      const profit = bet.amount * variables.multiplier;
      
      if (variables.betNumber === 1) {
        setBet1(prev => ({
          ...prev,
          status: 'won',
          winMultiplier: variables.multiplier,
          profit
        }));
      } else {
        setBet2(prev => ({
          ...prev,
          status: 'won',
          winMultiplier: variables.multiplier,
          profit
        }));
      }
      
      toast({
        title: "💰 Sacou com sucesso!",
        description: `Multiplicador ${variables.multiplier.toFixed(2)}x • Ganhou ${formatMoney(profit)}`,
        className: "bg-green-900/90 border-green-500"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao sacar",
        description: error.message || "Tente novamente",
        variant: "destructive"
      });
    }
  });

  // Simple game start
  const startGame = () => {
    // Clear any existing interval
    if (gameInterval) {
      clearInterval(gameInterval);
    }
    
    // Generate random crash point
    const crashPoint = 1 + Math.random() * 10;
    
    // Reset game state
    setGameStatus('flying');
    setCurrentMultiplier(1.00);
    
    // Simple multiplier increase
    let multiplier = 1.00;
    const interval = setInterval(() => {
      multiplier += 0.05;
      setCurrentMultiplier(multiplier);
      
      // Check auto cashout
      if (bet1.status === 'placed' && bet1.autoCashout && multiplier >= bet1.autoCashout) {
        handleCashOut(1);
      }
      if (bet2.status === 'placed' && bet2.autoCashout && multiplier >= bet2.autoCashout) {
        handleCashOut(2);
      }
      
      // Check crash
      if (multiplier >= crashPoint) {
        clearInterval(interval);
        setGameInterval(null);
        setGameStatus('crashed');
        setCurrentMultiplier(crashPoint);
        
        // Update history
        setHistory(prev => [crashPoint, ...prev.slice(0, 9)]);
        
        // Mark active bets as lost
        if (bet1.status === 'placed') {
          setBet1(prev => ({ ...prev, status: 'lost' }));
        }
        if (bet2.status === 'placed') {
          setBet2(prev => ({ ...prev, status: 'lost' }));
        }
        
        // Wait and reset
        setTimeout(() => {
          setGameStatus('waiting');
          setCurrentMultiplier(0);
          setBet1(prev => ({ ...prev, status: 'idle' }));
          setBet2(prev => ({ ...prev, status: 'idle' }));
        }, 3000);
      }
    }, 100);
    
    setGameInterval(interval);
  };

  const handlePlaceBet = (betNumber: 1 | 2) => {
    const amount = betNumber === 1 ? parseFloat(bet1Input) : parseFloat(bet2Input);
    
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Valor inválido",
        description: "Digite um valor válido para apostar",
        variant: "destructive"
      });
      return;
    }
    
    if (amount > balance) {
      toast({
        title: "Saldo insuficiente",
        description: "Você não tem saldo suficiente para esta aposta",
        variant: "destructive"
      });
      return;
    }
    
    if (gameStatus === 'flying') {
      toast({
        title: "Aguarde o próximo round",
        description: "Você só pode apostar antes do avião decolar",
        variant: "destructive"
      });
      return;
    }
    
    placeBetMutation.mutate({ betNumber, amount });
  };

  const handleCashOut = (betNumber: 1 | 2) => {
    if (gameStatus === 'flying' && currentMultiplier > 0) {
      cashOutMutation.mutate({ betNumber, multiplier: currentMultiplier });
    }
  };

  return (
    <MobileLayout 
      title="Mania Fly"
      showBackButton
      onBackClick={() => setLocation("/")}
    >
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        {/* Header */}
        <div className="bg-gradient-to-b from-[#111111] to-transparent p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation("/")}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Plane className="w-6 h-6 text-[#00E880]" />
              <span className="bg-gradient-to-r from-[#00E880] to-[#00FFB3] bg-clip-text text-transparent">
                MANIA FLY
              </span>
            </h1>
          </div>
        </div>

        {/* Multiplier History */}
        <div className="px-4 py-2">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <History className="w-4 h-4 text-gray-500 flex-shrink-0" />
            {history.map((item, index) => (
              <div
                key={index}
                className={cn(
                  "px-3 py-1 rounded-lg font-mono text-sm font-bold flex-shrink-0",
                  item < 1.5 ? "bg-red-900/50 text-red-400" :
                  item < 3 ? "bg-yellow-900/50 text-yellow-400" :
                  item < 10 ? "bg-green-900/50 text-green-400" :
                  "bg-purple-900/50 text-purple-400"
                )}
                data-testid={`history-${index}`}
              >
                {(item || 0).toFixed(2)}x
              </div>
            ))}
          </div>
        </div>

        {/* Game Display Area - Simplified */}
        <div className="relative h-[300px] mx-4 rounded-xl overflow-hidden bg-gradient-to-b from-[#111111] to-[#0a0a0a] border border-[#00E880]/20 flex items-center justify-center">
          <div className="text-center">
            {gameStatus === 'waiting' && (
              <>
                <Plane className="w-20 h-20 text-[#00E880] mx-auto mb-4" />
                <Button
                  onClick={startGame}
                  className="bg-gradient-to-r from-[#00E880] to-[#00FFB3] hover:from-[#00D070] hover:to-[#00EEA0] text-black font-bold px-8 py-3"
                  data-testid="button-start-game"
                >
                  <Play className="w-5 h-5 mr-2" />
                  INICIAR VOO
                </Button>
              </>
            )}
            
            {gameStatus === 'flying' && (
              <>
                <div className="text-7xl font-bold mb-4">
                  <span className="text-[#00E880]">{currentMultiplier.toFixed(2)}x</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-gray-400">
                  <TrendingUp className="w-5 h-5" />
                  <span>Voando...</span>
                </div>
              </>
            )}
            
            {gameStatus === 'crashed' && (
              <>
                <div className="text-6xl font-bold text-red-500 mb-2">
                  CRASHED
                </div>
                <div className="text-2xl text-gray-400">
                  @ {(currentMultiplier || 0).toFixed(2)}x
                </div>
                <div className="mt-4 flex items-center gap-2 justify-center text-yellow-500">
                  <TrendingDown className="w-5 h-5" />
                  <span>Aguarde o próximo voo...</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Betting Controls */}
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bet Panel 1 */}
            <div className="bg-[#111111] rounded-xl p-4 border border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-gray-400">APOSTA 1</span>
                {bet1.status === 'placed' && (
                  <span className="text-xs px-2 py-1 bg-blue-900/50 text-blue-400 rounded">
                    ATIVA
                  </span>
                )}
                {bet1.status === 'won' && (
                  <span className="text-xs px-2 py-1 bg-green-900/50 text-green-400 rounded">
                    GANHOU {bet1.winMultiplier?.toFixed(2)}x
                  </span>
                )}
                {bet1.status === 'lost' && (
                  <span className="text-xs px-2 py-1 bg-red-900/50 text-red-400 rounded">
                    PERDEU
                  </span>
                )}
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Valor da Aposta</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={bet1Input}
                      onChange={(e) => setBet1Input(e.target.value)}
                      className="flex-1 bg-black/50 border-gray-700 text-white"
                      placeholder="0.00"
                      min="1"
                      step="0.5"
                      disabled={bet1.status === 'placed'}
                      data-testid="input-bet1-amount"
                    />
                    <div className="flex gap-1">
                      {[1, 5, 10].map(val => (
                        <button
                          key={val}
                          onClick={() => setBet1Input(val.toString())}
                          className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded transition-colors"
                          disabled={bet1.status === 'placed'}
                          data-testid={`button-bet1-quick-${val}`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Auto Sacar em</label>
                  <Input
                    type="number"
                    value={autoCashout1}
                    onChange={(e) => setAutoCashout1(e.target.value)}
                    className="bg-black/50 border-gray-700 text-white"
                    placeholder="Desativado"
                    min="1.01"
                    step="0.1"
                    disabled={bet1.status === 'placed'}
                    data-testid="input-bet1-auto"
                  />
                </div>
                
                {bet1.status === 'placed' && gameStatus === 'flying' ? (
                  <Button
                    onClick={() => handleCashOut(1)}
                    className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-bold py-3"
                    data-testid="button-bet1-cashout"
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    SACAR {formatMoney(bet1.amount * currentMultiplier)}
                  </Button>
                ) : (
                  <Button
                    onClick={() => handlePlaceBet(1)}
                    className="w-full bg-gradient-to-r from-[#00E880] to-[#00FFB3] hover:from-[#00D070] hover:to-[#00EEA0] text-black font-bold py-3"
                    disabled={gameStatus !== 'waiting' || placeBetMutation.isPending}
                    data-testid="button-bet1-place"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    APOSTAR {formatMoney(parseFloat(bet1Input) || 0)}
                  </Button>
                )}
              </div>
            </div>

            {/* Bet Panel 2 */}
            <div className="bg-[#111111] rounded-xl p-4 border border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-gray-400">APOSTA 2</span>
                {bet2.status === 'placed' && (
                  <span className="text-xs px-2 py-1 bg-blue-900/50 text-blue-400 rounded">
                    ATIVA
                  </span>
                )}
                {bet2.status === 'won' && (
                  <span className="text-xs px-2 py-1 bg-green-900/50 text-green-400 rounded">
                    GANHOU {bet2.winMultiplier?.toFixed(2)}x
                  </span>
                )}
                {bet2.status === 'lost' && (
                  <span className="text-xs px-2 py-1 bg-red-900/50 text-red-400 rounded">
                    PERDEU
                  </span>
                )}
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Valor da Aposta</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={bet2Input}
                      onChange={(e) => setBet2Input(e.target.value)}
                      className="flex-1 bg-black/50 border-gray-700 text-white"
                      placeholder="0.00"
                      min="1"
                      step="0.5"
                      disabled={bet2.status === 'placed'}
                      data-testid="input-bet2-amount"
                    />
                    <div className="flex gap-1">
                      {[1, 5, 10].map(val => (
                        <button
                          key={val}
                          onClick={() => setBet2Input(val.toString())}
                          className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded transition-colors"
                          disabled={bet2.status === 'placed'}
                          data-testid={`button-bet2-quick-${val}`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Auto Sacar em</label>
                  <Input
                    type="number"
                    value={autoCashout2}
                    onChange={(e) => setAutoCashout2(e.target.value)}
                    className="bg-black/50 border-gray-700 text-white"
                    placeholder="Desativado"
                    min="1.01"
                    step="0.1"
                    disabled={bet2.status === 'placed'}
                    data-testid="input-bet2-auto"
                  />
                </div>
                
                {bet2.status === 'placed' && gameStatus === 'flying' ? (
                  <Button
                    onClick={() => handleCashOut(2)}
                    className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-bold py-3"
                    data-testid="button-bet2-cashout"
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    SACAR {formatMoney(bet2.amount * currentMultiplier)}
                  </Button>
                ) : (
                  <Button
                    onClick={() => handlePlaceBet(2)}
                    className="w-full bg-gradient-to-r from-[#00E880] to-[#00FFB3] hover:from-[#00D070] hover:to-[#00EEA0] text-black font-bold py-3"
                    disabled={gameStatus !== 'waiting' || placeBetMutation.isPending}
                    data-testid="button-bet2-place"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    APOSTAR {formatMoney(parseFloat(bet2Input) || 0)}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Game Info */}
          <div className="mt-4 bg-gradient-to-r from-[#00E880]/10 to-[#00FFB3]/10 rounded-xl p-4 border border-[#00E880]/20">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-[#00E880]" />
              <span className="text-sm font-bold text-[#00E880]">ESTATÍSTICAS DO JOGO</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-xs text-gray-500">Último Crash</div>
                <div className="text-lg font-bold text-white">
                  {(history[0] || 0).toFixed(2)}x
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Média (10)</div>
                <div className="text-lg font-bold text-white">
                  {history.length > 0 
                    ? (history.reduce((sum, h) => sum + (h || 0), 0) / history.length).toFixed(2)
                    : '0.00'}x
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Maior (10)</div>
                <div className="text-lg font-bold text-[#00E880]">
                  {history.length > 0 
                    ? Math.max(...history.filter(h => h != null)).toFixed(2)
                    : '0.00'}x
                </div>
              </div>
            </div>
            <div className="mt-3 text-center text-xs text-gray-500">
              RTP: 97% • Min: 1.00x • Max: 500.00x
            </div>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}