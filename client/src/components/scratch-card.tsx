import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface ScratchCardProps {
  gameType: string;
  onComplete: (result: any) => void;
  symbols: string[];
  isWinner: boolean;
  prize: number;
}

export default function ScratchCard({ 
  gameType, 
  onComplete, 
  symbols, 
  isWinner, 
  prize 
}: ScratchCardProps) {
  const [scratchedCells, setScratchedCells] = useState<boolean[]>(Array(9).fill(false));
  const [isGameComplete, setIsGameComplete] = useState(false);
  const { toast } = useToast();

  const handleCellScratch = (index: number) => {
    if (scratchedCells[index] || isGameComplete) return;

    const newScratchedCells = [...scratchedCells];
    newScratchedCells[index] = true;
    setScratchedCells(newScratchedCells);

    // Check if game is complete (at least 3 cells scratched)
    const scratchedCount = newScratchedCells.filter(Boolean).length;
    if (scratchedCount >= 3 && !isGameComplete) {
      setIsGameComplete(true);
      
      setTimeout(() => {
        // Reveal all cells
        setScratchedCells(Array(9).fill(true));
        
        // Show result
        if (isWinner) {
          toast({
            title: "🎉 Parabéns!",
            description: `Você ganhou R$ ${prize.toFixed(2)}!`,
            duration: 5000,
          });
        } else {
          toast({
            title: "😔 Que pena!",
            description: "Não foi desta vez. Tente novamente!",
            duration: 3000,
          });
        }
        
        onComplete({
          won: isWinner,
          prize,
          scratchedCells: newScratchedCells,
        });
      }, 1000);
    }
  };

  const getCellContent = (index: number) => {
    if (!scratchedCells[index]) return null;
    return symbols[index];
  };

  return (
    <div className="max-w-md mx-auto glass-effect rounded-xl p-6">
      <div className="game-header">
        <h2 className="game-title">
          {gameType === "pix_na_conta" && "PIX na Conta"}
          {gameType === "sonho_consumo" && "Sonho de Consumo"}
          {gameType === "me_mimei" && "Me Mimei"}
          {gameType === "super_premios" && "Super Prêmios"}
        </h2>
        <p className="game-instructions">
          Raspe 3 ou mais símbolos para revelar o resultado!
        </p>
      </div>

      <div className="raspadinha-grid mb-6">
        {Array.from({ length: 9 }).map((_, index) => (
          <div
            key={index}
            className="raspadinha-cell raspadinha-animation"
            onClick={() => handleCellScratch(index)}
          >
            {!scratchedCells[index] && (
              <div className="raspadinha-overlay">
                <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-500 rounded-lg flex items-center justify-center">
                  <i className="fas fa-hand-pointer text-gray-600 text-xl"></i>
                </div>
              </div>
            )}
            {scratchedCells[index] && (
              <div className="raspadinha-symbol fade-in">
                {getCellContent(index)}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="game-actions">
        <p className="text-white/80 mb-4">
          {isGameComplete 
            ? "Jogo finalizado!" 
            : `Células riscadas: ${scratchedCells.filter(Boolean).length}/9`
          }
        </p>
        
        {isGameComplete && (
          <div className="text-center">
            <div className="mb-4">
              <div className="winner-celebration">
                {isWinner ? "🎉" : "😔"}
              </div>
              <p className="text-xl font-bold text-white mb-2">
                {isWinner ? "Parabéns!" : "Que pena!"}
              </p>
              {isWinner && (
                <p className="prize-amount">
                  Você ganhou R$ {prize.toFixed(2)}
                </p>
              )}
            </div>
            
            <div className="flex space-x-4">
              <button 
                className="btn-secondary flex-1"
                onClick={() => window.location.href = "/"}
              >
                <i className="fas fa-home mr-2"></i>
                Início
              </button>
              <button 
                className="btn-primary flex-1"
                onClick={() => window.location.href = "/"}
              >
                <i className="fas fa-play mr-2"></i>
                Jogar Novamente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
