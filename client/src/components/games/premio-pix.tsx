import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ScratchCard } from "./ScratchCard";
import { useQuery } from "@tanstack/react-query";

interface PremioPIXProps {
  onComplete: (won: boolean, prize: number) => void;
}

export function PremioPIX({ onComplete }: PremioPIXProps) {
  const [gameId, setGameId] = useState<string | null>(null);
  const [values, setValues] = useState<string[]>([]);
  const [revealed, setRevealed] = useState<boolean[]>(new Array(9).fill(false));
  const [isLoading, setIsLoading] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [isScratching, setIsScratching] = useState(false);
  const [restoringState, setRestoringState] = useState(false);
  const { toast } = useToast();

  // Check for existing game state on mount
  const { data: savedSession, isLoading: isLoadingSession } = useQuery({
    queryKey: ['/api/games/restore-state/premio-pix'],
    enabled: !gameStarted,
    retry: false,
  });

  // Save game state whenever it changes
  useEffect(() => {
    if (gameStarted && gameId && !restoringState) {
      const gameState = {
        gameId,
        values,
        revealed,
      };

      apiRequest('/api/games/save-state', 'POST', {
        gameType: 'premio-pix',
        gameId,
        gameState,
      }).catch(error => {
        console.error('Failed to save game state:', error);
      });
    }
  }, [gameId, values, revealed, gameStarted, restoringState]);

  // Restore saved game state
  useEffect(() => {
    if (savedSession && !gameStarted && !restoringState) {
      setRestoringState(true);
      const { gameState } = savedSession;
      
      setGameId(gameState.gameId);
      setValues(gameState.values || []);
      setRevealed(gameState.revealed || new Array(9).fill(false));
      setGameStarted(true);
      
      toast({ description: "Seu jogo anterior foi restaurado. Continue raspando!" });
      
      setTimeout(() => setRestoringState(false), 100);
    }
  }, [savedSession, gameStarted, toast, restoringState]);

  const startGame = async () => {
    // Check if there's already an active session
    if (savedSession) {
      toast({ description: "Você já tem um jogo em andamento. Finalize-o antes de iniciar outro." });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest('/api/games/premio-pix/create', 'POST');
      setGameId(response.gameId);
      setValues(response.hiddenValues);
      setGameStarted(true);
      
      // Refresh balance
      await queryClient.invalidateQueries({ queryKey: ['/api/user/balance'] });
    } catch (error: any) {
      toast({ description: error.message || "Verifique seu saldo e tente novamente" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReveal = (index: number) => {
    if (revealed[index] || isScratching) return;
    
    setIsScratching(true);
    const newRevealed = [...revealed];
    newRevealed[index] = true;
    setRevealed(newRevealed);

    // Allow next raspadinha after animation
    setTimeout(() => {
      setIsScratching(false);
    }, 600);

    // Check if all cards are revealed
    if (newRevealed.filter(r => r).length === 9) {
      // Check for winning condition (3 matching non-empty values)
      const valueCounts = values.reduce((acc, val) => {
        if (val && val !== '') {
          acc[val] = (acc[val] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const winningValue = Object.entries(valueCounts).find(([_, count]) => count >= 3);
      
      if (winningValue) {
        checkResult(true, parseInt(winningValue[0]));
      } else {
        checkResult(false, 0);
      }
    }
  };

  const checkResult = async (won: boolean, prize: number) => {
    try {
      const response = await apiRequest(`/api/games/premio-pix/${gameId}/reveal`, 'POST');
      
      const prizeText = response.won 
        ? (response.prize > 0 ? `R$ ${response.prize.toFixed(2)}` : response.prizeValue || "Prêmio especial")
        : "Tente novamente!";
        
      toast({
        title: response.won ? "🎉 Parabéns!" : "😢 Não foi dessa vez",
        description: response.won 
          ? `Você ganhou ${prizeText}!` 
          : "Tente novamente!",
      });

      // Refresh balance and user data
      await queryClient.invalidateQueries({ queryKey: ['/api/user/balance'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      
      setTimeout(() => {
        // Clear saved game state
        if (gameId) {
          apiRequest(`/api/games/clear-state/${gameId}`, 'DELETE').catch(console.error);
        }
        onComplete(response.won, response.prize || 0);
      }, 2000);

    } catch (error: any) {
      toast({ description: error.message || "Tente novamente" });
    }
  };

  const formatPrize = (value: string) => {
    if (!value || value === '') return '🎁';
    const num = parseInt(value);
    if (num >= 1000) return `R$${num/1000}k`;
    return `R$${num}`;
  };

  return (
    <div className="w-full max-w-md mx-auto p-4">
      {!gameStarted ? (
        <div className="text-center space-y-6">
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-white">Raspadinha PIX</h2>
            <p className="text-gray-300">Raspe e encontre 3 prêmios iguais para ganhar!</p>
            
            <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-2xl p-6 border border-green-500/30">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Custo:</span>
                  <span className="text-xl font-bold text-green-400">R$ 1,00</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Prêmio máximo:</span>
                  <span className="text-xl font-bold text-yellow-400">R$ 1.000</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-xl p-4 space-y-2">
              <p className="text-sm text-gray-400">Possíveis prêmios:</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gray-700/50 rounded-lg p-2 text-center">
                  <span className="text-green-400 font-semibold">R$ 5</span>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-2 text-center">
                  <span className="text-green-400 font-semibold">R$ 10</span>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-2 text-center">
                  <span className="text-green-400 font-semibold">R$ 25</span>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-2 text-center">
                  <span className="text-green-400 font-semibold">R$ 50</span>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-2 text-center">
                  <span className="text-green-400 font-semibold">R$ 100</span>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-2 text-center">
                  <span className="text-yellow-400 font-semibold">R$ 1.000</span>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={startGame}
            disabled={isLoading}
            className="w-full py-4 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {isLoading ? "Iniciando..." : "Jogar por R$ 1,00"}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Raspadinha PIX</h2>
            <p className="text-gray-300">Encontre 3 prêmios iguais!</p>
          </div>

          <motion.div 
            className="grid grid-cols-3 gap-3"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            {values.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="relative aspect-square"
              >
                <ScratchCard
                  value={
                    <div className="w-full h-full flex items-center justify-center">
                      <span className={`text-2xl font-bold ${
                        value === '' ? 'text-gray-500' : 
                        parseInt(value) >= 1000 ? 'text-yellow-400' : 'text-green-400'
                      }`}>
                        {formatPrize(value)}
                      </span>
                    </div>
                  }
                  index={index}
                  onReveal={() => handleReveal(index)}
                  isDisabled={isScratching || revealed[index]}
                  revealed={revealed[index]}
                />
              </motion.div>
            ))}
          </motion.div>

          <div className="text-center text-sm text-gray-400">
            {revealed.filter(r => r).length}/9 raspadas
          </div>
        </div>
      )}
    </div>
  );
}