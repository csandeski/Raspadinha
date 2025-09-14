import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { MobileLayout } from "@/components/mobile-layout";
import { ArrowLeft, Plane, Play, DollarSign, History, TrendingUp, TrendingDown, Zap, Clock } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Types
interface GameStatus {
  roundId: string | null;
  state: 'waiting' | 'playing' | 'crashed';
  multiplier: number;
  history: number[];
  countdown: number;
  activeBets?: number;
}

interface Bet {
  amount: number;
  roundId?: string;
  status: 'idle' | 'placed' | 'won' | 'lost';
  winMultiplier?: number;
  profit?: number;
}

export default function ManiaFly() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Game state from server
  const [gameStatus, setGameStatus] = useState<GameStatus>({
    roundId: null,
    state: 'waiting',
    multiplier: 0,
    history: [],
    countdown: 0
  });
  
  // Betting state
  const [bet1, setBet1] = useState<Bet>({ amount: 1, status: 'idle' });
  const [bet2, setBet2] = useState<Bet>({ amount: 1, status: 'idle' });
  const [bet1Input, setBet1Input] = useState("1");
  const [bet2Input, setBet2Input] = useState("1");
  const [autoCashout1, setAutoCashout1] = useState("");
  const [autoCashout2, setAutoCashout2] = useState("");
  
  // Polling for game status
  useEffect(() => {
    const pollStatus = async () => {
      try {
        const response = await fetch('/api/games/mania-fly/status');
        const data = await response.json();
        setGameStatus(data);
        
        // Auto cashout logic
        if (data.state === 'playing' && data.multiplier > 0) {
          if (bet1.status === 'placed' && autoCashout1 && parseFloat(autoCashout1) <= data.multiplier) {
            handleCashOut(1);
          }
          if (bet2.status === 'placed' && autoCashout2 && parseFloat(autoCashout2) <= data.multiplier) {
            handleCashOut(2);
          }
        }
        
        // Reset bets when round changes
        if (data.state === 'waiting' && (bet1.roundId !== data.roundId || bet2.roundId !== data.roundId)) {
          if (bet1.status === 'placed' && bet1.roundId !== data.roundId) {
            setBet1(prev => ({ ...prev, status: 'lost' }));
          }
          if (bet2.status === 'placed' && bet2.roundId !== data.roundId) {
            setBet2(prev => ({ ...prev, status: 'lost' }));
          }
        }
        
        // Reset to idle when new round starts
        if (data.state === 'waiting' && gameStatus.state === 'crashed') {
          setBet1(prev => ({ ...prev, status: 'idle', roundId: undefined }));
          setBet2(prev => ({ ...prev, status: 'idle', roundId: undefined }));
        }
      } catch (error) {
        console.error('Error polling status:', error);
      }
    };
    
    // Poll every 100ms for smooth updates
    const interval = setInterval(pollStatus, 100);
    pollStatus(); // Initial poll
    
    return () => clearInterval(interval);
  }, [bet1, bet2, autoCashout1, autoCashout2, gameStatus.state]);
  
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
        amount: data.amount
      });
    },
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/balance'] });
      
      if (variables.betNumber === 1) {
        setBet1({
          amount: variables.amount,
          roundId: response.roundId,
          status: 'placed'
        });
      } else {
        setBet2({
          amount: variables.amount,
          roundId: response.roundId,
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

  // Cash out mutation - SECURE VERSION  
  const cashOutMutation = useMutation({
    mutationFn: async (data: { betNumber: 1 | 2; roundId: string }) => {
      return apiRequest('/api/games/mania-fly/cashout', 'POST', { 
        roundId: data.roundId
      });
    },
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/balance'] });
      
      if (variables.betNumber === 1) {
        setBet1(prev => ({
          ...prev,
          status: 'won',
          winMultiplier: response.multiplier,
          profit: response.profit
        }));
      } else {
        setBet2(prev => ({
          ...prev,
          status: 'won',
          winMultiplier: response.multiplier,
          profit: response.profit
        }));
      }
      
      toast({
        title: "💰 Sacou com sucesso!",
        description: `Multiplicador ${response.multiplier.toFixed(2)}x • Ganhou ${formatMoney(response.profit)}`,
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
    
    if (gameStatus.state !== 'waiting') {
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
    const bet = betNumber === 1 ? bet1 : bet2;
    
    if (bet.status === 'placed' && bet.roundId && gameStatus.state === 'playing') {
      cashOutMutation.mutate({ betNumber, roundId: bet.roundId });
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
            {gameStatus.history.map((item, index) => (
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

        {/* Game Display Area - With Automatic Rounds */}
        <div className="relative h-[300px] mx-4 rounded-xl overflow-hidden bg-gradient-to-b from-[#111111] to-[#0a0a0a] border border-[#00E880]/20 flex items-center justify-center">
          <div className="text-center">
            {gameStatus.state === 'waiting' && (
              <>
                <Clock className="w-20 h-20 text-[#00E880] mx-auto mb-4 animate-pulse" />
                <div className="text-5xl font-bold text-white mb-2">
                  {gameStatus.countdown}s
                </div>
                <div className="text-gray-400">
                  Próximo voo começando...
                </div>
              </>
            )}
            
            {gameStatus.state === 'playing' && (
              <>
                <div 
                  className="absolute"
                  style={{
                    bottom: `${Math.min(80, gameStatus.multiplier * 10)}%`,
                    left: `${Math.min(80, gameStatus.multiplier * 8)}%`,
                    transform: `rotate(-${Math.min(45, gameStatus.multiplier * 3)}deg)`,
                    transition: 'all 0.1s'
                  }}
                >
                  <Plane className="w-16 h-16 text-[#00E880]" />
                </div>
                <div className="text-7xl font-bold mb-4">
                  <span className="text-[#00E880]">{gameStatus.multiplier.toFixed(2)}x</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-gray-400">
                  <TrendingUp className="w-5 h-5" />
                  <span>Voando...</span>
                </div>
              </>
            )}
            
            {gameStatus.state === 'crashed' && (
              <>
                <div className="text-6xl font-bold text-red-500 mb-2 animate-pulse">
                  CRASHED
                </div>
                <div className="text-2xl text-gray-400">
                  @ {gameStatus.multiplier.toFixed(2)}x
                </div>
                <div className="mt-4 flex items-center gap-2 justify-center text-yellow-500">
                  <TrendingDown className="w-5 h-5" />
                  <span>Próximo voo em breve...</span>
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
                
                {bet1.status === 'placed' && gameStatus.state === 'playing' ? (
                  <Button
                    onClick={() => handleCashOut(1)}
                    className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-bold py-3"
                    data-testid="button-bet1-cashout"
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    SACAR {formatMoney(bet1.amount * gameStatus.multiplier)}
                  </Button>
                ) : (
                  <Button
                    onClick={() => handlePlaceBet(1)}
                    className="w-full bg-gradient-to-r from-[#00E880] to-[#00FFB3] hover:from-[#00D070] hover:to-[#00EEA0] text-black font-bold py-3"
                    disabled={gameStatus.state !== 'waiting' || placeBetMutation.isPending}
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
                
                {bet2.status === 'placed' && gameStatus.state === 'playing' ? (
                  <Button
                    onClick={() => handleCashOut(2)}
                    className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-bold py-3"
                    data-testid="button-bet2-cashout"
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    SACAR {formatMoney(bet2.amount * gameStatus.multiplier)}
                  </Button>
                ) : (
                  <Button
                    onClick={() => handlePlaceBet(2)}
                    className="w-full bg-gradient-to-r from-[#00E880] to-[#00FFB3] hover:from-[#00D070] hover:to-[#00EEA0] text-black font-bold py-3"
                    disabled={gameStatus.state !== 'waiting' || placeBetMutation.isPending}
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
                  {gameStatus.history.length > 0 ? gameStatus.history[0].toFixed(2) : '0.00'}x
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Média (10)</div>
                <div className="text-lg font-bold text-white">
                  {gameStatus.history.length > 0 
                    ? (gameStatus.history.reduce((sum, h) => sum + h, 0) / gameStatus.history.length).toFixed(2)
                    : '0.00'}x
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Maior (10)</div>
                <div className="text-lg font-bold text-[#00E880]">
                  {gameStatus.history.length > 0 
                    ? Math.max(...gameStatus.history).toFixed(2)
                    : '0.00'}x
                </div>
              </div>
            </div>
            <div className="mt-3 text-center text-xs text-gray-500">
              RTP: 97% • Min: 1.00x • Max: 500.00x • Rounds automáticos
            </div>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}