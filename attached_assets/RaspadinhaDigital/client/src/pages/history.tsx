import { useAuth } from "../lib/auth.tsx";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { MobileLayout } from "@/components/mobile-layout";
import { useState } from "react";
import { Clock, TrendingUp, Trophy, DollarSign, Gift, Gamepad2, Eye, Bomb, Gem, Copy, CheckCircle, ArrowLeft, ChevronLeft, ChevronRight, Package, Skull, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function History() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedGame, setSelectedGame] = useState<any>(null);
  const [showGameModal, setShowGameModal] = useState(false);
  const [dateFilter, setDateFilter] = useState<'today' | 'month' | 'all'>('all');
  const [copiedId, setCopiedId] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  if (!user) {
    setLocation("/login");
    return null;
  }

  const { data: games, isLoading: gamesLoading } = useQuery({
    queryKey: ["/api/games/history"],
    refetchInterval: 5000,
  });

  // Filter games by date
  const filterGamesByDate = (gamesList: any[]) => {
    if (dateFilter === 'all') return gamesList;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    return gamesList.filter((game: any) => {
      const gameDate = new Date(game.createdAt || game.playedAt);
      
      if (dateFilter === 'today') {
        return gameDate >= today;
      } else if (dateFilter === 'month') {
        return gameDate >= thisMonth;
      }
      
      return true;
    });
  };

  // Separate games by type - Include esquilo with prize games
  const allPrizeGames = Array.isArray(games) ? games.filter((game: any) => 
    ['pix', 'me_mimei', 'eletronicos', 'super', 'esquilo'].includes(game.gameType)
  ) : [];
  
  // Apply date filter
  const prizeGames = filterGamesByDate(allPrizeGames);
  
  // Pagination calculations
  const totalPages = Math.ceil(prizeGames.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedGames = prizeGames.slice(startIndex, endIndex);
  
  // Reset to page 1 when filter changes
  const handleFilterChange = (filter: 'today' | 'month' | 'all') => {
    setDateFilter(filter);
    setCurrentPage(1);
  };

  // Get prize image for each game type and value
  const getPrizeImage = (gameType: string, value: number) => {
    switch (gameType) {
      case 'pix':
        // PIX money images
        const pixImages: { [key: number]: string } = {
          0.5: '/premios/pix/0.5.webp',
          1: '/premios/pix/1.webp',
          2: '/premios/pix/2.webp',
          3: '/premios/pix/3.webp',
          4: '/premios/pix/4.webp',
          5: '/premios/pix/5.webp',
          10: '/premios/pix/10.webp',
          15: '/premios/pix/15.webp',
          20: '/premios/pix/20.webp',
          50: '/premios/pix/50.webp',
          100: '/premios/pix/100.webp',
          200: '/premios/pix/200.webp',
          500: '/premios/pix/500.webp',
          1000: '/premios/pix/1000.webp',
          2000: '/premios/pix/2000.webp',
          5000: '/premios/pix/5000.webp',
          10000: '/premios/pix/10000.webp',
          100000: '/premios/pix/100000.webp'
        };
        return pixImages[value] || null;
      
      case 'me_mimei':
        const meMimeiImages: { [key: number]: string } = {
          0.5: '/premios/me-mimei/0.5.webp',
          1: '/premios/me-mimei/1.webp',
          2: '/premios/me-mimei/2.webp',
          3: '/premios/me-mimei/3.webp',
          4: '/premios/me-mimei/4.webp',
          5: '/premios/me-mimei/5.webp',
          10: '/premios/me-mimei/10.webp',
          15: '/premios/me-mimei/15.webp',
          20: '/premios/me-mimei/20.webp',
          50: '/premios/me-mimei/50.webp',
          100: '/premios/me-mimei/100.webp',
          200: '/premios/me-mimei/200.webp',
          500: '/premios/me-mimei/500.webp',
          1000: '/premios/me-mimei/1000.webp',
          2000: '/premios/me-mimei/2000.webp',
          5000: '/premios/me-mimei/5000.webp',
          10000: '/premios/me-mimei/10000.webp',
          100000: '/premios/me-mimei/100000.webp'
        };
        return meMimeiImages[value] || null;
      
      case 'eletronicos':
        const eletronicosImages: { [key: number]: string } = {
          0.5: '/premios/eletronicos/0.5.webp',
          1: '/premios/eletronicos/1.webp',
          2: '/premios/eletronicos/2.webp',
          3: '/premios/eletronicos/3.webp',
          4: '/premios/eletronicos/4.webp',
          5: '/premios/eletronicos/5.webp',
          10: '/premios/eletronicos/10.webp',
          15: '/premios/eletronicos/15.webp',
          20: '/premios/eletronicos/20.webp',
          50: '/premios/eletronicos/50.webp',
          100: '/premios/eletronicos/100.webp',
          200: '/premios/eletronicos/200.webp',
          500: '/premios/eletronicos/500.webp',
          1000: '/premios/eletronicos/1000.webp',
          2000: '/premios/eletronicos/2000.webp',
          5000: '/premios/eletronicos/5000.webp',
          10000: '/premios/eletronicos/10000.webp',
          100000: '/premios/eletronicos/100000.webp'
        };
        return eletronicosImages[value] || null;
      
      case 'super':
        const superPremiosImages: { [key: number]: string } = {
          10: '/premios/super-premios/10.webp',
          20: '/premios/super-premios/20.webp',
          40: '/premios/super-premios/40.webp',
          60: '/premios/super-premios/60.webp',
          80: '/premios/super-premios/80.webp',
          100: '/premios/super-premios/100.webp',
          200: '/premios/super-premios/200.webp',
          300: '/premios/super-premios/300.webp',
          400: '/premios/super-premios/400.webp',
          1000: '/premios/super-premios/1000.webp',
          2000: '/premios/super-premios/2000.webp',
          4000: '/premios/super-premios/4000.webp',
          10000: '/premios/super-premios/10000.webp',
          20000: '/premios/super-premios/20000.webp',
          40000: '/premios/super-premios/40000.webp',
          100000: '/premios/super-premios/100000.webp',
          200000: '/premios/super-premios/200000.webp',
          2000000: '/premios/super-premios/2000000.webp'
        };
        return superPremiosImages[value] || null;
      
      case 'esquilo':
        // For Esquilo Mania, use themed images based on multiplier values
        if (value <= 2) return '/premios/jogo-esquilo/apple.png';
        if (value <= 5) return '/premios/jogo-esquilo/pinecone.png';
        if (value <= 10) return '/premios/jogo-esquilo/ring.png';
        if (value <= 50) return '/premios/jogo-esquilo/acorn.png';
        if (value <= 100) return '/premios/jogo-esquilo/golden-acorn.png';
        return '/premios/jogo-esquilo/chest-open.png';
      
      default:
        return null;
    }
  };

  // Helper function to truncate long names
  const truncateName = (name: string, maxLength: number = 12): string => {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength - 2) + '..';
  };

  // Get prize name for each game type and value
  const getPrizeName = (gameType: string, value: number, game?: any) => {
    // Handle empty/zero values
    if (!value || value === 0) {
      return "Tente novamente";
    }
    
    switch (gameType) {
      case 'pix':
        // PIX prizes by value
        const pixPrizes: { [key: number]: string } = {
          0.50: '50 centavos',
          1.00: '1 real',
          2.00: '2 reais',
          3.00: '3 reais',
          4.00: '4 reais',
          5.00: '5 reais',
          10.00: '10 reais',
          15.00: '15 reais',
          20.00: '20 reais',
          50.00: '50 reais',
          100.00: '100 reais',
          200.00: '200 reais',
          500.00: '500 reais',
          1000.00: '1 mil reais',
          2000.00: '2 mil reais',
          5000.00: '5 mil reais',
          10000.00: '10 mil reais',
          100000.00: '100 mil reais'
        };
        const pixName = pixPrizes[value] || `R$ ${value.toFixed(2)}`;
        return truncateName(pixName);
        
      case 'me_mimei':
        // Me Mimei product mapping
        const meMimeiPrizes: { [key: number]: string } = {
          0.50: '50 centavos',
          1.00: '1 real',
          2.00: '2 reais',
          3.00: '3 reais',
          4.00: '4 reais',
          5.00: '5 reais',
          10.00: 'Batom Boca Rosa',
          15.00: 'Máscara Ruby Rose',
          20.00: 'Iluminador Bruna Tavares',
          50.00: 'Perfume Egeo Dolce',
          100.00: 'Bolsa Petite Jolie',
          200.00: 'Kit WEPINK',
          500.00: 'Perfume Good Girl',
          1000.00: 'Kit Completo Bruna Tavares',
          2000.00: 'Kit Kerastase',
          5000.00: 'Bolsa Luxo Michael Kors',
          10000.00: 'Dyson Secador',
          100000.00: 'Anel Vivara Diamante'
        };
        const meMimeiName = meMimeiPrizes[value] || `R$ ${value.toFixed(2)}`;
        return truncateName(meMimeiName);
      
      case 'eletronicos':
        const eletronicosPrizes: { [key: number]: string } = {
          0.50: '50 centavos',
          1.00: '1 real',
          2.00: '2 reais',
          3.00: '3 reais',
          4.00: '4 reais',
          5.00: '5 reais',
          10.00: 'Cabo USB',
          15.00: 'Suporte de Celular',
          20.00: 'Capinha de Celular',
          50.00: 'Power Bank',
          100.00: 'Fone sem Fio',
          200.00: 'SmartWatch',
          500.00: 'Air Fryer',
          1000.00: 'Caixa de Som JBL',
          2000.00: 'Smart TV 55" 4K',
          5000.00: 'Notebook Dell G15',
          10000.00: 'iPhone 16 Pro',
          100000.00: 'Kit Completo Apple'
        };
        const eletronicosName = eletronicosPrizes[value] || `R$ ${value.toFixed(2)}`;
        return truncateName(eletronicosName);
      
      case 'super':
        const superPremiosPrizes: { [key: number]: string } = {
          10.00: '10 reais',
          20.00: '20 reais',
          40.00: '40 reais',
          60.00: '60 reais',
          80.00: '80 reais',
          100.00: '100 reais',
          200.00: 'Óculos',
          300.00: 'Capacete',
          400.00: 'Bicicleta',
          1000.00: 'HoverBoard',
          2000.00: 'Patinete Elétrico',
          4000.00: 'Scooter Elétrica',
          10000.00: 'Buggy',
          20000.00: 'Moto CG',
          200000.00: 'Jeep Compass',
          500000.00: 'Super Sorte'
        };
        const superName = superPremiosPrizes[value] || `R$ ${value.toFixed(2)}`;
        return truncateName(superName);
      
      case 'esquilo':
        // For Esquilo Mania, show multiplier or special prizes
        if (game && game.finalMultiplier) {
          return `${game.finalMultiplier.toFixed(2)}x`;
        }
        return `R$ ${value.toFixed(2)}`;
      
      default:
        return `R$ ${value.toFixed(2)}`;
    }
  };

  // Game type mappings
  const getGameDetails = (gameType: string) => {
    const gameInfo: Record<string, { name: string; icon: React.ReactNode; color: string; description: string }> = {

      // Premio games  
      pix: { 
        name: "Raspadinha Pix", 
        icon: <Trophy className="w-5 h-5" />, 
        color: "text-blue-400",
        description: "Até R$ 2.000 em PIX"
      },
      me_mimei: { 
        name: "Raspadinha Me mimei", 
        icon: <Trophy className="w-5 h-5" />, 
        color: "text-pink-400",
        description: "Produtos de beleza e moda"
      },
      eletronicos: { 
        name: "Raspadinha Eletrônico", 
        icon: <Trophy className="w-5 h-5" />, 
        color: "text-orange-400",
        description: "iPhone, MacBook e mais"
      },
      super: { 
        name: "Raspadinha Super", 
        icon: <Trophy className="w-5 h-5" />, 
        color: "text-green-400",
        description: "Até R$ 20.000 em prêmios"
      },
      esquilo: {
        name: "Esquilo Mania",
        icon: <Trophy className="w-5 h-5" />,
        color: "text-amber-700",
        description: "Abra baús e ganhe prêmios"
      }
    };
    
    return gameInfo[gameType] || { 
      name: gameType.replace(/_/g, ' ').replace(/-/g, ' '), 
      icon: <Gamepad2 className="w-5 h-5" />, 
      color: "text-gray-400",
      description: "Jogo de raspadinha"
    };
  };

  // Get game result details
  const getGameResult = (game: any) => {
    const won = parseFloat(game.prize || '0') > 0;
    
    try {
      const gameData = game.gameData ? JSON.parse(game.gameData) : null;
      
      // For raspadinha games (all types)
      if (gameData && gameData.revealedSymbols) {
        const symbols = gameData.revealedSymbols || [];
        const matchingSymbol = gameData.matchingSymbol;
        const matchCount = gameData.matchCount || 0;
        
        return {
          won,
          details: matchingSymbol ? `Encontrou ${matchCount} símbolos "${matchingSymbol}"` : "Nenhuma combinação vencedora",
          symbols: symbols.length ? symbols.join(', ') : 'Símbolos não registrados'
        };
      }
    } catch (e) {
      // If JSON parsing fails, continue with default handling
    }
    
    // For all games - show prize if won
    return {
      won,
      details: won ? `Ganhou ${game.prizeValue || `R$ ${parseFloat(game.prize).toFixed(2)}`}` : "Não ganhou desta vez",
      symbols: null
    };
  };

  return (
    <MobileLayout>
      <div className="min-h-full bg-gradient-to-b from-[#0E1015] via-[#1a1b23] to-[#0E1015]">
        <div className="max-w-md md:max-w-3xl mx-auto px-4 py-6 md:px-6 md:py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setLocation('/profile')}
                className="p-2 md:p-3 hover:bg-gray-900 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 md:w-6 md:h-6 text-gray-400" />
              </button>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">Histórico</h1>
                <p className="text-gray-400 text-sm md:text-base">Acompanhe suas raspadinhas</p>
              </div>
            </div>
          </div>



          {/* Date Filter Buttons */}
          <div className="flex gap-2 md:gap-3 mb-4">
            <button
              onClick={() => handleFilterChange('today')}
              className={`flex-1 px-4 py-2.5 md:py-3 rounded-xl font-medium md:text-lg transition-all ${
                dateFilter === 'today'
                  ? 'bg-[#00E880] text-black shadow-[0_0_20px_rgba(0,232,128,0.3)]'
                  : 'bg-gray-900/50 text-gray-400 hover:text-white border border-gray-800'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => handleFilterChange('month')}
              className={`flex-1 px-4 py-2.5 md:py-3 rounded-xl font-medium md:text-lg transition-all ${
                dateFilter === 'month'
                  ? 'bg-[#00E880] text-black shadow-[0_0_20px_rgba(0,232,128,0.3)]'
                  : 'bg-gray-900/50 text-gray-400 hover:text-white border border-gray-800'
              }`}
            >
              Este mês
            </button>
            <button
              onClick={() => handleFilterChange('all')}
              className={`flex-1 px-4 py-2.5 md:py-3 rounded-xl font-medium md:text-lg transition-all ${
                dateFilter === 'all'
                  ? 'bg-[#00E880] text-black shadow-[0_0_20px_rgba(0,232,128,0.3)]'
                  : 'bg-gray-900/50 text-gray-400 hover:text-white border border-gray-800'
              }`}
            >
              Todos
            </button>
          </div>



          {/* Prize Games History */}
          <div className="space-y-4">
              {gamesLoading ? (
                <div className="text-center py-12">
                  <div className="loading-spinner mx-auto mb-4"></div>
                  <p className="text-gray-400">Carregando prêmios...</p>
                </div>
              ) : prizeGames.length > 0 ? (
                <div className="space-y-3 md:space-y-4">
                  {paginatedGames.map((game: any, index: number) => {
                    const gameDetails = getGameDetails(game.gameType);
                    const won = parseFloat(game.prize) > 0;
                    
                    return (
                      <div key={game.gameId || game.id || `game-${index}`} className="bg-gradient-to-r from-gray-900/80 to-gray-800/80 backdrop-blur-xl rounded-2xl p-4 md:p-6 border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className={`font-semibold md:text-lg ${game.gameType === 'esquilo' ? 'text-amber-700' : gameDetails.color}`}>
                              {gameDetails.name}
                            </h3>
                            <p className="text-xs md:text-sm text-gray-400">
                              {new Date(game.createdAt || game.playedAt).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm md:text-base text-gray-400 mb-1">
                              R$ {parseFloat(game.cost || game.betAmount || '0').toFixed(2)}
                            </div>
                            {game.gameType === 'esquilo' ? (
                              game.winAmount > 0 ? (
                                <span className="font-bold text-[#00E880] md:text-lg">
                                  R$ {game.winAmount.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-red-400 font-medium md:text-lg">R$ 0.00</span>
                              )
                            ) : (
                              won ? (
                                <span className="font-bold text-[#00E880] md:text-lg">
                                  {game.prizeValue || `R$ ${parseFloat(game.prize).toFixed(2)}`}
                                </span>
                              ) : (
                                <span className="text-red-400 font-medium md:text-lg">R$ 0.00</span>
                              )
                            )}
                          </div>
                        </div>
                        
                        {/* View Details Button */}
                        <button
                          onClick={() => {
                            setSelectedGame(game);
                            setShowGameModal(true);
                          }}
                          className="mt-3 w-full bg-gray-800/50 hover:bg-gray-700/50 text-white py-2.5 md:py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                        >
                          <Eye className="w-4 h-4 md:w-5 md:h-5" />
                          <span className="text-sm md:text-base font-medium">Ver Detalhes</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="bg-gray-900/50 rounded-full p-6 w-24 h-24 md:w-32 md:h-32 mx-auto mb-4 flex items-center justify-center">
                    <Trophy className="w-12 h-12 md:w-16 md:h-16 text-gray-600" />
                  </div>
                  <p className="text-gray-400 font-medium md:text-lg">Nenhuma raspadinha por aqui!</p>
                  <p className="text-gray-500 text-sm md:text-base mt-1">Jogue as raspadinhas agora!</p>
                </div>
              )}
            </div>


            {/* Pagination Controls */}
            {totalPages > 1 && prizeGames.length > 0 && (
              <div className="mt-6 md:mt-8 flex items-center justify-between bg-gradient-to-r from-gray-900/80 to-gray-800/80 backdrop-blur-xl rounded-2xl p-4 md:p-6 border border-gray-700/50">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className={`flex items-center gap-2 px-4 py-2.5 md:px-6 md:py-3 rounded-xl font-medium transition-all ${
                    currentPage === 1
                      ? 'bg-gray-800/50 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-700/50 text-white hover:bg-gray-600/50 shadow-lg'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="hidden sm:inline md:text-lg">Anterior</span>
                </button>
                
                <div className="flex items-center gap-2 text-white">
                  <span className="text-sm md:text-base text-gray-400">Página</span>
                  <span className="font-bold text-lg md:text-xl text-[#00E880]">{currentPage}</span>
                  <span className="text-sm md:text-base text-gray-400">de</span>
                  <span className="font-bold text-lg md:text-xl text-white">{totalPages}</span>
                </div>
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className={`flex items-center gap-2 px-4 py-2.5 md:px-6 md:py-3 rounded-xl font-medium transition-all ${
                    currentPage === totalPages
                      ? 'bg-gray-800/50 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-700/50 text-white hover:bg-gray-600/50 shadow-lg'
                  }`}
                >
                  <span className="hidden sm:inline md:text-lg">Próxima</span>
                  <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              </div>
            )}


        </div>
      </div>
      {/* Game Details Modal */}
      {showGameModal && selectedGame && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm overflow-y-auto pt-24 pb-20 px-4">
          <div className="bg-gray-900 rounded-2xl max-w-md md:max-w-2xl w-full mx-auto">
            {/* Modal Header */}
            <div className="bg-gray-900 p-4 md:p-6 border-b border-gray-800 rounded-t-2xl flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-lg md:text-xl font-bold text-white">Detalhes</h3>
                  {selectedGame.displayId && (
                    <div className="flex items-center gap-2 bg-gray-800/50 px-3 py-1 rounded-lg">
                      <span className="text-gray-400 text-sm">#</span>
                      <span className="text-white font-mono text-sm">{selectedGame.displayId}</span>
                      <button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(selectedGame.displayId.toString());
                            setCopiedId(true);
                            setTimeout(() => setCopiedId(false), 2000);
                            toast({ description: "ID #${selectedGame.displayId} copiado para a área de transferência" });
                          } catch (error) {
                            toast({
                              title: "Erro ao copiar",
                              description: "Não foi possível copiar o ID",
                              variant: "destructive",
                            });
                          }
                        }}
                        className="p-2 hover:bg-gray-700/50 rounded-lg transition-all duration-200 group"
                      >
                        {copiedId ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-400 group-hover:text-white" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-400">
                  {getGameDetails(selectedGame.gameType).name} - {new Date(selectedGame.createdAt || selectedGame.playedAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowGameModal(false);
                  setSelectedGame(null);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Game Content */}
            <div className="p-4 md:p-6">
              {/* Show different content based on game type */}
              {['pix', 'me_mimei', 'eletronicos', 'super', 'esquilo'].includes(selectedGame.gameType) ? (
                // Prize Games - Show 3x3 grid
                <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4">
                  {(() => {
                  let prizes: any[] = [];
                  try {
                    // Parse from result field (premio games)
                    if (selectedGame.result) {
                      const resultData = JSON.parse(selectedGame.result);
                      if (resultData.hiddenValues) {
                        prizes = resultData.hiddenValues.map((value: string) => {
                          const numValue = parseFloat(value) || 0;
                          return { 
                            value: numValue, 
                            name: getPrizeName(selectedGame.gameType, numValue, selectedGame),
                            prizeValue: resultData.prizeValue // Store the actual prize value string
                          };
                        });
                      }
                    }
                  } catch (e) {
                    console.error('Error parsing game data:', e);
                  }

                  // If no prizes data, show empty grid
                  if (prizes.length === 0) {
                    prizes = Array(9).fill({ value: 0, name: '?' });
                  }

                  // Find winning values (3 matching)
                  let winningValue: number | null = null;
                  const valueCounts: { [key: number]: number } = {};
                  
                  prizes.forEach((p: any) => {
                    if (p.value > 0) {
                      valueCounts[p.value] = (valueCounts[p.value] || 0) + 1;
                    }
                  });
                  
                  // Find the value that appears 3 or more times
                  Object.entries(valueCounts).forEach(([value, count]) => {
                    if (count >= 3 && parseFloat(selectedGame.prize) > 0) {
                      winningValue = parseFloat(value);
                    }
                  });

                  return prizes.map((prize: any, index: number) => {
                    const isWinning = winningValue && prize.value === winningValue;
                    return (
                      <div
                        key={index}
                        className={`bg-gray-800/50 rounded-lg aspect-square flex flex-col items-center justify-center border relative overflow-hidden ${
                          isWinning ? 'border-[#00E880] bg-[#00E880]/10' : 'border-gray-700'
                        }`}
                      >
                        {/* Prize Image or icon based on game type */}
                        <>
                          {(() => {
                            const prizeImage = getPrizeImage(selectedGame.gameType, prize.value);
                            if (prizeImage && prize.value > 0) {
                              return (
                                <img 
                                  src={prizeImage} 
                                  alt={prize.name}
                                  className={`w-14 h-14 object-contain ${isWinning ? 'animate-pulse' : ''}`}
                                  onError={(e) => {
                                    e.currentTarget.src = '/logos/logomania.svg';
                                    e.currentTarget.className = 'w-14 h-14 object-contain opacity-30';
                                  }}
                                />
                              );
                            } else if (prize.value > 0) {
                              // Show dollar sign for monetary values without images
                              return <DollarSign className={`w-10 h-10 ${isWinning ? 'text-[#00E880]' : 'text-gray-400'}`} />;
                            } else {
                              // Show logo for empty/zero values
                              return (
                                <img 
                                  src="/logos/logomania.svg" 
                                  alt="Vazio"
                                  className="w-14 h-14 object-contain opacity-30"
                                />
                              );
                            }
                          })()}
                          <span className={`text-xs mt-1 text-center px-1 ${isWinning ? 'text-[#00E880]' : 'text-gray-400'}`}>
                            {prize.value > 0 ? prize.name : 'VAZIO'}
                          </span>
                          {prize.value > 0 && (
                            <span className={`text-sm font-bold ${isWinning ? 'text-[#00E880]' : 'text-white'}`}>
                              R$ {parseFloat(prize.value).toFixed(2)}
                            </span>
                          )}
                        </>
                      </div>
                    );
                  });
                })()}
                </div>
              ) : selectedGame.gameType === 'esquilo' ? (
                // Esquilo Game - Show boxes grid
                <div className="space-y-4">
                  {/* Main game info */}
                  <div className="bg-gray-800/50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Aposta</span>
                      <span className="text-white font-bold">R$ {selectedGame.betAmount?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Multiplicador Final</span>
                      <span className={`font-bold ${selectedGame.finalMultiplier > 0 ? 'text-[#00E880]' : 'text-red-400'}`}>
                        {selectedGame.finalMultiplier?.toFixed(2) || '0.00'}x
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Ganhos</span>
                      <span className={`font-bold ${selectedGame.winAmount > 0 ? 'text-[#00E880]' : 'text-gray-500'}`}>
                        R$ {selectedGame.winAmount?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                    {selectedGame.bonusActivated && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Bônus Ativado</span>
                        <span className="text-yellow-400 font-bold">
                          {selectedGame.activeBonusMultiplier ? `${selectedGame.activeBonusMultiplier}x` : 'Sim'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Boxes Grid - 3x3 - Showing all boxes with correct images */}
                  <div>
                    <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                      <Package className="w-5 h-5 text-[#00E880]" />
                      Baús do Jogo
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      {(() => {
                        // Parse boxes and openedBoxes if they are strings
                        let boxes = selectedGame.boxes || [];
                        let openedBoxes = selectedGame.openedBoxes || [];
                        
                        // Handle if boxes is a JSON string
                        if (typeof boxes === 'string') {
                          try {
                            boxes = JSON.parse(boxes);
                          } catch (e) {
                            boxes = [];
                          }
                        }
                        
                        // Handle if openedBoxes is a JSON string
                        if (typeof openedBoxes === 'string') {
                          try {
                            openedBoxes = JSON.parse(openedBoxes);
                          } catch (e) {
                            openedBoxes = [];
                          }
                        }
                        
                        const activeBonusMultiplier = selectedGame.activeBonusMultiplier || null;
                        
                        // Define chest images based on type
                        const getChestImage = (type: string, multiplier: number) => {
                          if (type === 'fox') {
                            return '/premios/jogo-esquilo/fox.png';
                          }
                          
                          // Based on multiplier value, return appropriate prize image
                          if (multiplier <= 0.4) return '/premios/jogo-esquilo/apple.png';
                          if (multiplier <= 0.8) return '/premios/jogo-esquilo/pinecone.png';
                          if (multiplier <= 1.2) return '/premios/jogo-esquilo/ring.png';
                          if (multiplier <= 2) return '/premios/jogo-esquilo/acorn.png';
                          return '/premios/jogo-esquilo/golden-acorn.png';
                        };
                        
                        // Ensure we have 9 boxes
                        const displayBoxes = Array(9).fill(null).map((_, index) => {
                          const box = boxes[index] || { type: 'unknown', multiplier: 0 };
                          const isOpened = openedBoxes.includes(index);
                          
                          return (
                            <div
                              key={index}
                              className={`
                                aspect-square rounded-lg flex flex-col items-center justify-center p-2 relative
                                bg-gray-800/50
                                ${isOpened 
                                  ? 'border-2 border-[#00E880] shadow-[0_0_10px_rgba(0,232,128,0.4)]' 
                                  : 'border border-gray-700'
                                }
                              `}
                            >
                              {box.type === 'fox' ? (
                                // Fox chest
                                <>
                                  <img 
                                    src={getChestImage('fox', 0)} 
                                    alt="Raposa"
                                    className="w-12 h-12 object-contain mb-1"
                                    onError={(e) => {
                                      e.currentTarget.src = '/logos/logomania.svg';
                                    }}
                                  />
                                  <span className="text-xs text-red-400 font-bold">Raposa</span>
                                </>
                              ) : box.type && box.type !== 'unknown' ? (
                                // Prize chest
                                <>
                                  <img 
                                    src={getChestImage(box.type, box.multiplier || 0)} 
                                    alt="Prêmio"
                                    className="w-12 h-12 object-contain mb-1"
                                    onError={(e) => {
                                      e.currentTarget.src = '/premios/jogo-esquilo/chest-closed.png';
                                    }}
                                  />
                                  <span className="text-xs text-white font-bold">
                                    {box.multiplier ? `${box.multiplier}x` : '?'}
                                  </span>
                                  {activeBonusMultiplier && isOpened && (
                                    <span className="text-[10px] text-yellow-400 absolute top-1 right-1">
                                      ×{activeBonusMultiplier}
                                    </span>
                                  )}
                                </>
                              ) : (
                                // Unknown/closed chest
                                <>
                                  <img 
                                    src="/premios/jogo-esquilo/chest-closed.png" 
                                    alt="Baú Fechado"
                                    className="w-12 h-12 object-contain mb-1 opacity-50"
                                    onError={(e) => {
                                      e.currentTarget.src = '/logos/logomania.svg';
                                    }}
                                  />
                                  <span className="text-xs text-gray-500">Não revelado</span>
                                </>
                              )}
                              
                              {/* Opened indicator */}
                              {isOpened && (
                                <div className="absolute top-1 left-1">
                                  <div className="w-2 h-2 bg-[#00E880] rounded-full animate-pulse" />
                                </div>
                              )}
                            </div>
                          );
                        });
                        
                        return displayBoxes;
                      })()}
                    </div>
                  </div>

                  {/* Game Status */}
                  <div className="bg-gray-800/50 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Status</span>
                      <span className={`font-bold px-3 py-1 rounded-full text-sm ${
                        selectedGame.status === 'won' || selectedGame.status === 'cashed_out'
                          ? 'bg-green-900/50 text-green-400'
                          : selectedGame.status === 'lost'
                          ? 'bg-red-900/50 text-red-400'
                          : 'bg-yellow-900/50 text-yellow-400'
                      }`}>
                        {selectedGame.status === 'won' || selectedGame.status === 'cashed_out' ? 'Vitória' : 
                         selectedGame.status === 'lost' ? 'Derrota' : 'Em Andamento'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                // Other Minigames - Show specific game details
                <div className="space-y-4">
                  {selectedGame.gameType === 'sorte' && (
                    <div>
                      <div className="grid grid-cols-3 gap-2">
                        {(() => {
                          let values: string[] = [];
                          let clickedIndices: number[] = [];
                          let mode = 'bronze';
                          
                          try {
                            if (selectedGame.gameData) {
                              const gameData = JSON.parse(selectedGame.gameData);
                              values = gameData.revealedValues || gameData.revealedSymbols || [];
                              clickedIndices = gameData.clickedIndices || gameData.selectedIndices || [];
                              mode = gameData.mode || 'bronze';
                            }
                          } catch (e) {
                            console.error('Error parsing sorte game data:', e);
                          }
                          
                          // Ensure we have 9 values
                          while (values.length < 9) {
                            values.push('?');
                          }
                          
                          // Get mode info
                          const gameModes: Record<string, { color: string; name: string }> = {
                            bronze: { color: '#CD7F32', name: 'BRONZE' },
                            prata: { color: '#C0C0C0', name: 'PRATA' },
                            ouro: { color: '#FFD700', name: 'OURO' },
                            diamante: { color: '#87CEEB', name: 'DIAMANTE' }
                          };
                          
                          const modeInfo = gameModes[mode] || gameModes.bronze;
                          
                          // Function to get gradient based on value and mode
                          const getGradient = (value: string, mode: string) => {
                            const numValue = parseFloat(value);
                            const modeInfo = gameModes[mode];
                            
                            // Get prizes for current mode
                            const prizes = {
                              bronze: [1, 10, 100],
                              prata: [5, 50, 500],
                              ouro: [10, 100, 1000],
                              diamante: [100, 1000, 10000]
                            }[mode] || [1, 10, 100];
                            
                            // Determine value level: low (clara), medium (média), high (escura)
                            let colorLevel = 'low';
                            if (numValue >= prizes[2]) colorLevel = 'high';
                            else if (numValue >= prizes[1]) colorLevel = 'medium';
                            
                            if (mode === 'bronze') {
                              if (colorLevel === 'low') return 'linear-gradient(135deg, #E3A857, #F5BE6D, #FFD599)'; // Claro
                              if (colorLevel === 'medium') return 'linear-gradient(135deg, #CD7F32, #E59548, #F5A85E)'; // Médio
                              return 'linear-gradient(135deg, #8B4513, #A0522D, #6B3410)'; // Escuro
                            } else if (mode === 'prata') {
                              if (colorLevel === 'low') return 'linear-gradient(135deg, #E5E5E5, #F0F0F0, #FAFAFA)'; // Claro
                              if (colorLevel === 'medium') return 'linear-gradient(135deg, #C0C0C0, #D3D3D3, #DCDCDC)'; // Médio
                              return 'linear-gradient(135deg, #808080, #696969, #505050)'; // Escuro
                            } else if (mode === 'ouro') {
                              if (colorLevel === 'low') return 'linear-gradient(135deg, #FFE066, #FFF099, #FFFACD)'; // Claro
                              if (colorLevel === 'medium') return 'linear-gradient(135deg, #FFD700, #FFDF00, #FFE033)'; // Médio
                              return 'linear-gradient(135deg, #B8860B, #9B6F00, #7D5700)'; // Escuro
                            } else {
                              if (colorLevel === 'low') return 'linear-gradient(135deg, #C6F6FF, #E0F7FF, #F0FCFF)'; // Claro
                              if (colorLevel === 'medium') return 'linear-gradient(135deg, #40E0D0, #5EEAE0, #7CF3E8)'; // Médio
                              return 'linear-gradient(135deg, #00BFFF, #0099CC, #006699)'; // Escuro
                            }
                          };
                          
                          const getRadialGradient = (value: string, mode: string) => {
                            const numValue = parseFloat(value);
                            
                            // Get prizes for current mode
                            const prizes = {
                              bronze: [1, 10, 100],
                              prata: [5, 50, 500],
                              ouro: [10, 100, 1000],
                              diamante: [100, 1000, 10000]
                            }[mode] || [1, 10, 100];
                            
                            // Determine value level: low (clara), medium (média), high (escura)
                            let colorLevel = 'low';
                            if (numValue >= prizes[2]) colorLevel = 'high';
                            else if (numValue >= prizes[1]) colorLevel = 'medium';
                            
                            if (mode === 'bronze') {
                              if (colorLevel === 'low') return 'radial-gradient(circle at 30% 30%, #FFD599, #E3A857)'; // Claro
                              if (colorLevel === 'medium') return 'radial-gradient(circle at 30% 30%, #F5A85E, #CD7F32)'; // Médio
                              return 'radial-gradient(circle at 30% 30%, #A0522D, #6B3410)'; // Escuro
                            } else if (mode === 'prata') {
                              if (colorLevel === 'low') return 'radial-gradient(circle at 30% 30%, #FAFAFA, #E5E5E5)'; // Claro
                              if (colorLevel === 'medium') return 'radial-gradient(circle at 30% 30%, #DCDCDC, #C0C0C0)'; // Médio
                              return 'radial-gradient(circle at 30% 30%, #696969, #505050)'; // Escuro
                            } else if (mode === 'ouro') {
                              if (colorLevel === 'low') return 'radial-gradient(circle at 30% 30%, #FFFACD, #FFE066)'; // Claro
                              if (colorLevel === 'medium') return 'radial-gradient(circle at 30% 30%, #FFE033, #FFD700)'; // Médio
                              return 'radial-gradient(circle at 30% 30%, #9B6F00, #7D5700)'; // Escuro
                            } else {
                              if (colorLevel === 'low') return 'radial-gradient(circle at 30% 30%, #F0FCFF, #C6F6FF)'; // Claro
                              if (colorLevel === 'medium') return 'radial-gradient(circle at 30% 30%, #7CF3E8, #40E0D0)'; // Médio
                              return 'radial-gradient(circle at 30% 30%, #0099CC, #006699)'; // Escuro
                            }
                          };
                          
                          return (
                            <>
                              {/* Mode indicator */}
                              <div className="col-span-3 mb-2 text-center">
                                <span 
                                  className="inline-block px-3 py-1 rounded-lg text-sm font-bold"
                                  style={{ backgroundColor: modeInfo.color + '30', color: modeInfo.color }}
                                >
                                  Modo {modeInfo.name}
                                </span>
                              </div>
                              
                              {/* Game grid */}
                              {values.slice(0, 9).map((value: string, index: number) => {
                                const isClicked = clickedIndices.includes(index);
                                
                                return (
                                  <div
                                    key={index}
                                    className={`rounded-lg aspect-square flex items-center justify-center relative overflow-hidden ${
                                      isClicked ? 'border-4 border-white' : ''
                                    }`}
                                    style={{
                                      background: getGradient(value, mode)
                                    }}
                                  >
                                    <div className="w-14 h-14 rounded-full shadow-2xl flex items-center justify-center border-2"
                                      style={{
                                        borderColor: 'rgba(255, 255, 255, 0.5)',
                                        background: getRadialGradient(value, mode),
                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.6), inset 0 2px 4px rgba(255, 255, 255, 0.4)'
                                      }}
                                    >
                                      <span 
                                        className="text-base font-black text-white"
                                        style={{
                                          textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 0 1px 0 #000, 1px 0 0 #000, 0 -1px 0 #000, -1px 0 0 #000'
                                        }}
                                      >
                                        {value}
                                      </span>
                                    </div>
                                    
                                  </div>
                                );
                              })}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Game Result */}
              <div className="bg-gray-800/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">Apostou:</span>
                  <span className="text-white font-medium">R$ {parseFloat(selectedGame.cost || selectedGame.betAmount || '0').toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Ganhou:</span>
                  <span className={`font-bold ${(selectedGame.gameType === 'esquilo' ? selectedGame.winAmount : parseFloat(selectedGame.prize)) > 0 ? 'text-[#00E880]' : 'text-red-400'}`}>
                    R$ {(selectedGame.gameType === 'esquilo' ? (selectedGame.winAmount || 0) : parseFloat(selectedGame.prize || '0')).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => {
                  setShowGameModal(false);
                  setSelectedGame(null);
                }}
                className="mt-4 w-full bg-[#00E880] text-black py-3 rounded-xl font-bold hover:bg-[#00D470] transition-all duration-300"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </MobileLayout>
  );
}