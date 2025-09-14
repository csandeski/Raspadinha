import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { MobileLayout } from "@/components/mobile-layout";
import { ArrowLeft, Trophy, Coins, Target, Play, Plane, Cloud, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatMoney } from "@/lib/utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface ManiaFlyGameState {
  multiplier: number;
  status: 'waiting' | 'flying' | 'crashed' | 'collected';
  prize: number;
  altitude: number;
}

export default function ManiaFly() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [gameState, setGameState] = useState<ManiaFlyGameState>({
    multiplier: 1.0,
    status: 'waiting',
    prize: 0,
    altitude: 0
  });
  const [betAmount, setBetAmount] = useState(1);
  const [autoCollect, setAutoCollect] = useState<number | null>(null);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>(0);
  
  // Query user balance
  const { data: userWallet } = useQuery<{
    balance: string;
    scratchBonus: number;
  }>({
    queryKey: ['/api/user/balance'],
  });

  const balance = parseFloat(userWallet?.balance || "0");

  // Start game mutation
  const startGameMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/games/mania-fly/start', {
        method: 'POST',
        body: JSON.stringify({ betAmount })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/balance'] });
      startFlight();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao iniciar jogo",
        description: error.message || "Tente novamente",
        variant: "destructive"
      });
    }
  });

  // Collect prize mutation
  const collectPrizeMutation = useMutation({
    mutationFn: async () => {
      const prize = betAmount * gameState.multiplier;
      return apiRequest('/api/games/mania-fly/collect', {
        method: 'POST',
        body: JSON.stringify({ 
          multiplier: gameState.multiplier,
          prize 
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/balance'] });
      const prize = betAmount * gameState.multiplier;
      setGameState(prev => ({ ...prev, status: 'collected', prize }));
      toast({
        title: "Prêmio coletado!",
        description: `Você ganhou ${formatMoney(prize)}!`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao coletar prêmio",
        description: error.message || "Tente novamente",
        variant: "destructive"
      });
    }
  });

  // Start flight animation
  const startFlight = () => {
    setGameState({
      multiplier: 1.0,
      status: 'flying',
      prize: 0,
      altitude: 0
    });
    startTimeRef.current = Date.now();
    animate();
  };

  // Animation loop
  const animate = () => {
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    
    // Exponential growth with randomness
    const baseMultiplier = Math.pow(1.15, elapsed);
    const randomFactor = 1 + (Math.random() - 0.5) * 0.02;
    const newMultiplier = Math.min(baseMultiplier * randomFactor, 100);
    
    // Random crash chance increases with multiplier
    const crashChance = Math.min(elapsed * 0.02, 0.5); // Max 50% chance
    if (Math.random() < crashChance / 60) { // Per frame crash check
      setGameState(prev => ({ ...prev, status: 'crashed', multiplier: newMultiplier }));
      toast({
        title: "O avião voou longe demais!",
        description: "Tente novamente",
        variant: "destructive"
      });
      return;
    }
    
    // Update altitude and multiplier
    setGameState(prev => ({
      ...prev,
      multiplier: newMultiplier,
      altitude: Math.min(elapsed * 50, 500)
    }));
    
    // Check auto-collect
    if (autoCollect && newMultiplier >= autoCollect) {
      collectPrizeMutation.mutate();
      return;
    }
    
    // Continue animation if still flying
    if (gameState.status === 'flying') {
      animationRef.current = requestAnimationFrame(animate);
    }
  };

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Stop animation when status changes
  useEffect(() => {
    if (gameState.status !== 'flying' && animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, [gameState.status]);

  const handleStartGame = () => {
    if (betAmount > balance) {
      toast({
        title: "Saldo insuficiente",
        description: "Você não tem saldo suficiente para esta aposta",
        variant: "destructive"
      });
      return;
    }
    startGameMutation.mutate();
  };

  const handleCollect = () => {
    if (gameState.status === 'flying') {
      collectPrizeMutation.mutate();
    }
  };

  return (
    <MobileLayout 
      title="Mania Fly"
      showBackButton
      onBackClick={() => setLocation("/")}
    >
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white">
        {/* Header */}
        <div className="bg-gradient-to-b from-sky-900/50 to-transparent p-4">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => setLocation("/")}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent">
              Mania Fly
            </h1>
          </div>

          {/* Balance Display */}
          <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-xl p-3 backdrop-blur-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Saldo:</span>
              <span className="text-green-400 font-bold text-lg">
                {formatMoney(balance)}
              </span>
            </div>
          </div>
        </div>

        {/* Game Area */}
        <div className="relative h-[400px] bg-gradient-to-b from-sky-400 via-sky-500 to-blue-600 mx-4 rounded-2xl overflow-hidden shadow-2xl">
          {/* Clouds Background */}
          <div className="absolute inset-0">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute bg-white/20 rounded-full"
                style={{
                  width: `${80 + i * 20}px`,
                  height: `${40 + i * 10}px`,
                  left: `${20 + i * 15}%`,
                  top: `${20 + i * 15}%`,
                }}
                animate={{
                  x: [-100, 500],
                }}
                transition={{
                  duration: 20 + i * 5,
                  repeat: Infinity,
                  ease: "linear",
                  delay: i * 2,
                }}
              />
            ))}
          </div>

          {/* Airplane */}
          <AnimatePresence>
            {(gameState.status === 'flying' || gameState.status === 'collected') && (
              <motion.div
                className="absolute left-1/2 transform -translate-x-1/2"
                initial={{ bottom: 50 }}
                animate={{ 
                  bottom: 50 + gameState.altitude,
                  rotate: gameState.status === 'flying' ? -15 : 0
                }}
                exit={{ bottom: 50, rotate: 45 }}
                transition={{ type: "spring", stiffness: 50 }}
              >
                <Plane className="w-16 h-16 text-white drop-shadow-2xl" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Multiplier Display */}
          <div className="absolute inset-0 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {gameState.status === 'waiting' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className="text-center"
                >
                  <h2 className="text-3xl font-bold text-white mb-2">Pronto para voar?</h2>
                  <p className="text-white/80">Clique em jogar para começar</p>
                </motion.div>
              )}

              {gameState.status === 'flying' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className="text-center"
                >
                  <TrendingUp className="w-12 h-12 text-green-400 mx-auto mb-2" />
                  <div className="text-6xl font-black text-white drop-shadow-2xl">
                    {gameState.multiplier.toFixed(2)}x
                  </div>
                  <div className="text-2xl text-green-300 mt-2">
                    {formatMoney(betAmount * gameState.multiplier)}
                  </div>
                </motion.div>
              )}

              {gameState.status === 'crashed' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5, rotate: -180 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className="text-center"
                >
                  <div className="text-6xl mb-4">💥</div>
                  <h2 className="text-3xl font-bold text-red-400">Crash!</h2>
                  <p className="text-white/80 mt-2">O avião voou longe demais</p>
                  <p className="text-red-300 mt-1">Multiplicador: {gameState.multiplier.toFixed(2)}x</p>
                </motion.div>
              )}

              {gameState.status === 'collected' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className="text-center"
                >
                  <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-2" />
                  <h2 className="text-3xl font-bold text-green-400">Prêmio Coletado!</h2>
                  <p className="text-2xl text-white mt-2">
                    {formatMoney(gameState.prize)}
                  </p>
                  <p className="text-green-300 mt-1">
                    Multiplicador: {gameState.multiplier.toFixed(2)}x
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 space-y-4">
          {/* Bet Amount */}
          <div className="bg-gray-800/50 rounded-xl p-4 backdrop-blur-sm">
            <label className="text-sm text-gray-400 mb-2 block">Valor da Aposta</label>
            <div className="flex gap-2">
              {[1, 5, 10, 20].map(value => (
                <button
                  key={value}
                  onClick={() => setBetAmount(value)}
                  className={`flex-1 py-2 px-3 rounded-lg font-bold transition-all ${
                    betAmount === value
                      ? 'bg-sky-500 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  R$ {value}
                </button>
              ))}
            </div>
          </div>

          {/* Auto Collect */}
          <div className="bg-gray-800/50 rounded-xl p-4 backdrop-blur-sm">
            <label className="text-sm text-gray-400 mb-2 block">Coletar Automático em:</label>
            <div className="flex gap-2">
              <button
                onClick={() => setAutoCollect(null)}
                className={`px-3 py-2 rounded-lg font-bold transition-all ${
                  autoCollect === null
                    ? 'bg-gray-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                OFF
              </button>
              {[2, 3, 5, 10].map(value => (
                <button
                  key={value}
                  onClick={() => setAutoCollect(value)}
                  className={`flex-1 py-2 px-3 rounded-lg font-bold transition-all ${
                    autoCollect === value
                      ? 'bg-sky-500 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {value}x
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {gameState.status === 'waiting' || gameState.status === 'crashed' || gameState.status === 'collected' ? (
              <Button
                onClick={handleStartGame}
                disabled={startGameMutation.isPending || balance < betAmount}
                className="flex-1 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold py-4 rounded-xl text-lg shadow-xl disabled:opacity-50"
              >
                <Play className="w-5 h-5 mr-2" />
                Jogar ({formatMoney(betAmount)})
              </Button>
            ) : (
              <Button
                onClick={handleCollect}
                disabled={gameState.status !== 'flying' || collectPrizeMutation.isPending}
                className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 rounded-xl text-lg shadow-xl disabled:opacity-50 animate-pulse"
              >
                <Coins className="w-5 h-5 mr-2" />
                Coletar ({formatMoney(betAmount * gameState.multiplier)})
              </Button>
            )}
          </div>

          {/* Game Info */}
          <div className="bg-gradient-to-r from-gray-800/30 to-gray-700/30 rounded-xl p-4 backdrop-blur-sm border border-gray-700/50">
            <h3 className="text-sm font-bold text-sky-400 mb-2">Como Jogar:</h3>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>• O avião decola e o multiplicador aumenta</li>
              <li>• Colete seu prêmio antes que o avião voe longe demais</li>
              <li>• Quanto mais alto, maior o prêmio, mas maior o risco</li>
              <li>• Configure coleta automática para garantir ganhos</li>
            </ul>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}