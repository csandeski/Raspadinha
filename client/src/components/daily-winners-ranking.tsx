import { useState, useEffect } from "react";
import { Trophy, Medal, Award } from "lucide-react";

interface DailyWinnersRankingProps {
  gameType: string;
}

// Maximum prize values for each game type - all 3 winners show the max prize
const maxPrizesByGame = {
  pix: 100000, // R$ 100.000
  'me-mimei': 100000, // R$ 100.000
  eletronicos: 100000, // R$ 100.000
  'super-premios': 2000000 // R$ 2.000.000
};

// Random Brazilian names for variation
const firstNames = [
  'João', 'Maria', 'Pedro', 'Ana', 'Paulo', 'Julia', 'Carlos', 'Laura',
  'Bruno', 'Beatriz', 'Rafael', 'Fernanda', 'Fernando', 'Amanda', 'Lucas',
  'Camila', 'Marcos', 'Gabriela', 'Gabriel', 'Isabella', 'Thiago', 'Sophia'
];

const lastNames = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Pereira', 'Costa', 'Ferreira',
  'Rodrigues', 'Almeida', 'Nascimento', 'Carvalho', 'Gomes', 'Martins', 'Rocha',
  'Ribeiro', 'Alves', 'Monteiro', 'Barbosa', 'Vieira', 'Soares', 'Castro'
];

export function DailyWinnersRanking({ gameType }: DailyWinnersRankingProps) {
  const [winners, setWinners] = useState<{ position: number; name: string; value: number }[]>([]);

  useEffect(() => {
    // Get maximum prize for this game type
    const maxPrize = maxPrizesByGame[gameType as keyof typeof maxPrizesByGame] || maxPrizesByGame.pix;
    
    // Generate 3 winners, all with the maximum prize
    const todaysWinners = [1, 2, 3].map((position) => {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const formattedName = `${firstName} ${lastName.substring(0, 2)}***`;
      
      return {
        position,
        name: formattedName,
        value: maxPrize
      };
    });
    
    setWinners(todaysWinners);
  }, [gameType]);

  const getTrophyIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-400" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-300" />;
      case 3:
        return <Award className="w-5 h-5 text-orange-600" />;
      default:
        return null;
    }
  };

  const formatValue = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  return (
    <div className="bg-gray-800/50 rounded-xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-5 h-5 text-[#00E880]" />
        <h3 className="text-sm font-bold text-white">Últimos Ganhadores</h3>
      </div>
      
      <div className="space-y-2">
        {winners.map((winner) => (
          <div
            key={winner.position}
            className={`flex items-center justify-between p-2 rounded-lg ${
              winner.position === 1 
                ? 'bg-gradient-to-r from-yellow-900/20 to-yellow-800/10 border border-yellow-700/30' 
                : 'bg-gray-700/30'
            }`}
          >
            <div className="flex items-center gap-3">
              {getTrophyIcon(winner.position)}
              <div className="text-sm font-semibold text-white">{winner.name}</div>
            </div>
            <div className="text-right">
              <div className={`text-sm font-bold ${
                winner.position === 1 ? 'text-yellow-400' : 'text-[#00E880]'
              }`}>
                {formatValue(winner.value)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}