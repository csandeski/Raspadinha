import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "../../lib/queryClient";
import { DollarSign, Gift, Trophy } from "lucide-react";
import { ScratchCard } from "./ScratchCard";

// Prize values configuration using .webp images with numeric names
const PRIZE_VALUES = [
  { value: 1000, image: "/premios/pix/1000.webp", label: "R$ 1K" },
  { value: 500, image: "/premios/pix/500.webp", label: "R$ 500" },
  { value: 200, image: "/premios/pix/200.webp", label: "R$ 200" },
  { value: 100, image: "/premios/pix/100.webp", label: "R$ 100" },
  { value: 50, image: "/premios/pix/50.webp", label: "R$ 50" },
  { value: 20, image: "/premios/pix/20.webp", label: "R$ 20" },
  { value: 5, image: "/premios/pix/5.webp", label: "R$ 5" },
  { value: 2, image: "/premios/pix/2.webp", label: "R$ 2" },
  { value: 1, image: "/premios/pix/1.webp", label: "R$ 1" },
  { value: 0.5, image: "/premios/pix/0.5.webp", label: "50 Centavos" }
];

interface PremioPIXContaProps {
  onBack: () => void;
}

export function PremioPIXConta({ onBack }: PremioPIXContaProps) {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [hiddenPrizes, setHiddenPrizes] = useState<number[]>([]);
  const [revealedCards, setRevealedCards] = useState<boolean[]>(Array(9).fill(false));
  const [isRevealing, setIsRevealing] = useState(false);
  const [gameResult, setGameResult] = useState<any>(null);
  const { toast } = useToast();

  const createGame = async () => {
    try {
      const response = await apiRequest({
        url: "/api/games/premio-pix-conta/create",
        method: "POST",
        body: {},
      });
      
      setGameId(response.gameId);
      setHiddenPrizes(response.hiddenValues);
      setGameStarted(true);
      setRevealedCards(Array(9).fill(false));
      setGameResult(null);
      
      // Refresh balance after creating game
      queryClient.invalidateQueries({ queryKey: ['/api/user/balance'] });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível criar o jogo",
        variant: "destructive",
      });
    }
  };

  const handleReveal = (index: number) => {
    if (revealedCards[index] || isRevealing) return;
    
    const newRevealed = [...revealedCards];
    newRevealed[index] = true;
    setRevealedCards(newRevealed);
  };

  const revealAll = async () => {
    if (!gameId || isRevealing) return;
    
    setIsRevealing(true);
    
    try {
      const response = await apiRequest({
        url: `/api/games/premio-pix-conta/${gameId}/reveal`,
        method: "POST",
        body: {},
      });
      
      setGameResult(response);
      
      // Reveal all cards with a staggered animation
      for (let i = 0; i < 9; i++) {
        if (!revealedCards[i]) {
          setTimeout(() => {
            setRevealedCards(prev => {
              const newRevealed = [...prev];
              newRevealed[i] = true;
              return newRevealed;
            });
          }, i * 100);
        }
      }
      
      // Refresh balance and history
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/user/balance'] });
        queryClient.invalidateQueries({ queryKey: ['/api/user/games'] });
      }, 1000);
      
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao revelar o resultado",
        variant: "destructive",
      });
    } finally {
      setIsRevealing(false);
    }
  };

  const playAgain = () => {
    setGameStarted(false);
    setGameId(null);
    setHiddenPrizes([]);
    setRevealedCards(Array(9).fill(false));
    setGameResult(null);
  };

  const getPrizeInfo = (prizeValue: number) => {
    return PRIZE_VALUES.find(p => p.value === prizeValue) || PRIZE_VALUES[PRIZE_VALUES.length - 1];
  };

  const allRevealed = revealedCards.every(card => card);

  return (
    <Card className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden">
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5"></div>
      
      <CardContent className="p-4 md:p-6 relative">
        <div className="flex items-center justify-between mb-4">
          <Button
            onClick={onBack}
            variant="ghost"
            className="text-gray-400 hover:text-white"
          >
            ← Voltar
          </Button>
          <div className="flex items-center space-x-2">
            <DollarSign className="w-6 h-6 text-[#00E880]" />
            <span className="text-xl font-bold">PIX na Conta</span>
          </div>
        </div>

        {!gameStarted ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-[#00E880] to-[#00D470] rounded-full mb-6">
              <DollarSign className="w-12 h-12 text-black" />
            </div>
            <h3 className="text-3xl font-bold mb-4">PIX na Conta</h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Raspe 9 quadrados e encontre 3 valores iguais para ganhar!
              Prêmios de até R$ 1.000 direto no PIX!
            </p>
            <div className="bg-gray-800/50 rounded-lg p-4 mb-6 max-w-sm mx-auto">
              <div className="text-sm text-gray-400 mb-2">Custo por Raspadinha</div>
              <div className="text-2xl font-bold text-[#00E880]">R$ 20,00</div>
            </div>
            <Button
              onClick={createGame}
              size="lg"
              className="bg-gradient-to-r from-[#00E880] to-[#00D470] text-black hover:from-[#00D470] hover:to-[#00C060] font-bold px-8"
            >
              Comprar Raspadinha
            </Button>
          </div>
        ) : (
          <div>
            <div className="mb-6 text-center">
              <p className="text-gray-400 text-sm mb-2">
                Raspe os quadrados e encontre 3 valores iguais!
              </p>
              <div className="flex items-center justify-center space-x-4">
                <div className="text-xs text-gray-500">
                  Revelados: {revealedCards.filter(r => r).length}/9
                </div>
                {!allRevealed && (
                  <Button
                    onClick={revealAll}
                    size="sm"
                    variant="secondary"
                    disabled={isRevealing}
                    className="bg-gray-800 hover:bg-gray-700"
                  >
                    Revelar Todos
                  </Button>
                )}
              </div>
            </div>

            {/* 3x3 Grid of Raspadinhas */}
            <div className="grid grid-cols-3 gap-3 mb-6 max-w-md mx-auto">
              {hiddenPrizes.map((prizeValue, index) => {
                const prizeInfo = getPrizeInfo(prizeValue);
                
                return (
                  <div
                    key={index}
                    className="relative aspect-square"
                    onClick={() => handleReveal(index)}
                  >
                    <ScratchCard
                      width={100}
                      height={100}
                      revealed={revealedCards[index]}
                      className="w-full h-full"
                    >
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg overflow-hidden">
                        <img 
                          src={prizeInfo.image} 
                          alt={prizeInfo.label}
                          className="w-4/5 h-4/5 object-contain"
                        />
                      </div>
                    </ScratchCard>
                  </div>
                );
              })}
            </div>

            {/* Result Display */}
            {gameResult && allRevealed && (
              <div className="text-center">
                {gameResult.won ? (
                  <div className="bg-gradient-to-br from-[#00E880]/20 to-[#00D470]/20 rounded-xl p-6 mb-4">
                    <Trophy className="w-12 h-12 text-[#00E880] mx-auto mb-2" />
                    <h3 className="text-2xl font-bold text-[#00E880] mb-2">
                      PARABÉNS!
                    </h3>
                    <p className="text-lg text-white mb-1">
                      Você encontrou 3 valores de
                    </p>
                    <p className="text-3xl font-bold text-[#00E880]">
                      R$ {gameResult.prize.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-400 mt-2">
                      O valor foi creditado na sua conta!
                    </p>
                  </div>
                ) : (
                  <div className="bg-gray-800/50 rounded-xl p-6 mb-4">
                    <h3 className="text-xl font-bold text-gray-400 mb-2">
                      Não foi dessa vez!
                    </h3>
                    <p className="text-gray-500">
                      Tente novamente para ganhar até R$ 1.000!
                    </p>
                  </div>
                )}
                
                <Button
                  onClick={playAgain}
                  size="lg"
                  className="bg-gradient-to-r from-[#00E880] to-[#00D470] text-black hover:from-[#00D470] hover:to-[#00C060] font-bold"
                >
                  Jogar Novamente
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}