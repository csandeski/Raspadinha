import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { ChestGame, ChestGameRef } from "@/components/games/ChestGame";
import { useAuth } from "@/lib/auth";
import { MobileLayout } from "@/components/mobile-layout";
import GameFeed from "@/components/game-feed";
import { ArrowLeft, Info, ChevronLeft, ChevronRight } from "lucide-react";
// Confetti removed
import { LoginRequiredModal } from "@/components/login-required-modal";
import { InsufficientFundsModal } from "@/components/insufficient-funds-modal";
import { PrizeModal } from "@/components/PrizeModal";
import { motion, AnimatePresence } from 'framer-motion';

// Helper function to format currency in Portuguese
function formatReaisName(value: string): string {
  const numValue = parseFloat(value);
  
  // Format for display
  if (numValue >= 1000) {
    const thousands = numValue / 1000;
    if (Number.isInteger(thousands)) {
      return `${thousands} mil reais`;
    } else {
      return `${thousands.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} mil reais`;
    }
  } else if (numValue === 1) {
    return "1 real";
  } else if (numValue === 0.5) {
    return "50 centavos";
  } else if (numValue < 1) {
    const cents = Math.round(numValue * 100);
    return `${cents} centavos`;
  } else if (Number.isInteger(numValue)) {
    return `${numValue} reais`;
  } else {
    return `${numValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} reais`;
  }
}

export default function GameBauPIX() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [won, setWon] = useState(false);
  const [multiplier, setMultiplier] = useState<1 | 5 | 10>(1);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showInsufficientFundsModal, setShowInsufficientFundsModal] = useState(false);
  const [insufficientFundsType, setInsufficientFundsType] = useState<"balance" | "bonus">("balance");
  const [freePlays, setFreePlays] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [selectedPrize, setSelectedPrize] = useState<{ name: string; value: string; image: string } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isGameProcessing, setIsGameProcessing] = useState(false);
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const chestGameRef = useRef<ChestGameRef>(null);
  
  const prizeData = [
    { value: "100000.00", path: "/premios/pix/100000.webp", name: "100 mil reais" },
    { value: "10000.00", path: "/premios/pix/10000.webp", name: "10 mil reais" },
    { value: "5000.00", path: "/premios/pix/5000.webp", name: "5 mil reais" },
    { value: "2000.00", path: "/premios/pix/2000.webp", name: "2 mil reais" },
    { value: "1000.00", path: "/premios/pix/1000.webp", name: "1 mil reais" },
    { value: "500.00", path: "/premios/pix/500.webp", name: "500 reais" },
    { value: "200.00", path: "/premios/pix/200.webp", name: "200 reais" },
    { value: "100.00", path: "/premios/pix/100.webp", name: "100 reais" },
    { value: "50.00", path: "/premios/pix/50.webp", name: "50 reais" },
    { value: "20.00", path: "/premios/pix/20.webp", name: "20 reais" },
    { value: "15.00", path: "/premios/pix/15.webp", name: "15 reais" },
    { value: "10.00", path: "/premios/pix/10.webp", name: "10 reais" },
    { value: "5.00", path: "/premios/pix/5.webp", name: "5 reais" },
    { value: "4.00", path: "/premios/pix/4.webp", name: "4 reais" },
    { value: "3.00", path: "/premios/pix/3.webp", name: "3 reais" },
    { value: "2.00", path: "/premios/pix/2.webp", name: "2 reais" },
    { value: "1.00", path: "/premios/pix/1.webp", name: "1 real" },
    { value: "0.50", path: "/premios/pix/0.5.webp", name: "50 centavos" }
  ];

  const { data: balanceData } = useQuery<{
    balance: string;
    scratchBonus: number;
  }>({
    queryKey: ["/api/user/balance"],
    enabled: !!user,
  });

  const balance = parseFloat(balanceData?.balance || "0");
  const scratchBonus = balanceData?.scratchBonus || 0;

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      const maxScroll = scrollWidth - clientWidth;
      const progress = maxScroll > 0 ? (scrollLeft / maxScroll) * 100 : 0;
      setScrollProgress(progress);
    }
  };

  const startGameWithBalance = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    const betAmount = multiplier;
    if (balance < betAmount) {
      setInsufficientFundsType("balance");
      setShowInsufficientFundsModal(true);
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest("/api/games/scratch", "POST", { 
        gameType: "bau-pix",
        multiplier,
      });

      if (!response.id || !response.values) {
        throw new Error("Invalid game response");
      }

      // Log response for debugging
      console.log('Game response:', response);
      
      const hasWon = response.prizeValue !== null && response.prizeValue !== "" && response.prizeValue !== undefined;
      setWon(hasWon);
      
      // Set result for ChestGame animation
      const resultElement = document.getElementById('chest-game-result');
      if (resultElement) {
        const resultData = {
          ready: true,
          won: hasWon,
          value: hasWon ? response.prizeValue : null,
          prizeName: hasWon ? formatReaisName(response.prizeValue) : null
        };
        console.log('Setting result data:', resultData);
        resultElement.dataset.result = JSON.stringify(resultData);
        resultElement.dataset.gameResponse = JSON.stringify(response);
      }

      // Update balance
      queryClient.invalidateQueries({ queryKey: ["/api/user/balance"] });

      // Show result after animation
      setTimeout(() => {
        setGameComplete(true);
        // No toast notification for chest games
        setTimeout(() => {
          setGameComplete(false);
        }, 3000);
      }, 5000);

    } catch (error: any) {
      console.error("Error starting game:", error);
      toast({
        title: "Erro ao iniciar jogo",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startGameWithBonus = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    const betAmount = multiplier;
    if (scratchBonus < betAmount) {
      setInsufficientFundsType("bonus");
      setShowInsufficientFundsModal(true);
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest("/api/games/scratch", "POST", { 
        gameType: "bau-pix",
        multiplier,
        useBonus: true,
      });

      if (!response.id || !response.values) {
        throw new Error("Invalid game response");
      }

      // Log response for debugging
      console.log('Game response:', response);
      
      const hasWon = response.prizeValue !== null && response.prizeValue !== "" && response.prizeValue !== undefined;
      setWon(hasWon);
      
      // Set result for ChestGame animation
      const resultElement = document.getElementById('chest-game-result');
      if (resultElement) {
        const resultData = {
          ready: true,
          won: hasWon,
          value: hasWon ? response.prizeValue : null,
          prizeName: hasWon ? formatReaisName(response.prizeValue) : null
        };
        console.log('Setting result data:', resultData);
        resultElement.dataset.result = JSON.stringify(resultData);
        resultElement.dataset.gameResponse = JSON.stringify(response);
      }

      // Update balance
      queryClient.invalidateQueries({ queryKey: ["/api/user/balance"] });

      // Show result after animation
      setTimeout(() => {
        setGameComplete(true);
        // No toast notification for chest games
        setTimeout(() => {
          setGameComplete(false);
        }, 3000);
      }, 5000);

    } catch (error: any) {
      console.error("Error starting game:", error);
      toast({
        title: "Erro ao iniciar jogo",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };


  const content = (
    <div className="h-full bg-gray-900 relative flex flex-col">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-24 md:pb-8 max-w-md md:max-w-3xl mx-auto w-full">
        {/* Game Title */}
        <div className="flex items-start gap-4 mb-6">
          <button
            onClick={() => setLocation("/#baus")}
            className="p-2 md:p-3 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors mt-1"
          >
            <ArrowLeft className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl md:text-4xl font-bold text-blue-400 mt-[-5px] mb-[-5px]">Baú do PIX</h1>
            <p className="text-gray-400 text-sm md:text-base mt-1">
              Abra, <span className="text-blue-400 font-bold">ganhe</span> na hora!
            </p>
          </div>
        </div>
        {/* ChestGame Component */}
        {user && (
          <div className="mb-6">
            <ChestGame
              ref={chestGameRef}
              prizes={prizeData}
              betAmount={multiplier}
              multiplier={multiplier}
              balance={balance}
              bonusCount={scratchBonus}
              onPlayWithBalance={startGameWithBalance}
              onPlayWithBonus={startGameWithBonus}
              isLoading={isLoading}
              disabled={false}
              gameColor="blue"
              onProcessingChange={setIsGameProcessing}
            />

            {/* Result area for communication with ChestGame */}
            <div id="chest-game-result" data-result="" className="hidden" />

            {/* Multiplier and Action Buttons Menu - Premio PIX Style */}
            <div className="mt-4">
              <div className="relative bg-black/80 backdrop-blur-2xl rounded-[26px] p-4 sm:p-8 border border-white/5">
                {/* Multiplier Header */}
                <h3 className="text-center text-gray-300 font-bold text-xs sm:text-sm md:text-base mb-4 uppercase tracking-wider">
                  MULTIPLICADOR DE GANHOS
                </h3>
                
                {/* Multiplier Buttons */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
                  {[1, 5, 10].map((value) => (
                    <motion.button
                      key={value}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setMultiplier(value as 1 | 5 | 10)}
                      disabled={isLoading || isGameProcessing}
                      className="relative group overflow-hidden rounded-2xl"
                    >
                      {/* Button Container */}
                      <div className={`
                        relative rounded-2xl p-[2px] overflow-hidden
                        ${multiplier === value 
                          ? 'bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600' 
                          : 'bg-gradient-to-br from-gray-700 to-gray-800'
                        }
                        transition-all duration-500
                      `}>
                        <div className={`
                          relative bg-black rounded-[14px] p-3 sm:p-5 overflow-hidden
                          ${multiplier === value ? 'bg-opacity-60' : 'bg-opacity-80'}
                          transition-all duration-300
                        `}>
                          {/* Content */}
                          <div className="relative z-10">
                            <div className={`
                              text-lg sm:text-xl md:text-2xl font-black mb-1 transition-all duration-300
                              ${multiplier === value ? 'text-white' : 'text-gray-400'}
                            `}>
                              {value}x
                            </div>
                            <div className={`
                              text-[10px] sm:text-xs md:text-sm font-medium transition-all duration-300 whitespace-nowrap
                              ${multiplier === value ? 'text-blue-200' : 'text-gray-500'}
                            `}>
                              R$ {value},00
                            </div>
                          </div>
                          
                          {/* Shine Effect on Hover - Contained */}
                          <div className="absolute inset-0 rounded-[14px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                          </div>
                          
                          {/* Selected Badge */}
                          {multiplier === value && (
                            <motion.div
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ type: "spring", stiffness: 500, damping: 15 }}
                              className="absolute top-1 right-1 w-6 h-6 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/50 z-20"
                            >
                              <div className="w-3 h-3 bg-white rounded-full" />
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2">
                  {/* Buy Button - Larger */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => chestGameRef.current?.playWithBalance()}
                    disabled={isLoading || balance < multiplier || isGameProcessing}
                    className="flex-[2] bg-gradient-to-r from-blue-500 to-blue-400 hover:from-blue-400 hover:to-blue-300 text-white px-4 py-3 md:px-6 md:py-4 rounded-xl font-bold transition-all hover:shadow-xl text-sm md:text-base relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="flex items-center justify-center gap-2 whitespace-nowrap">
                      <span className="text-white text-sm md:text-base font-black uppercase">Abrir</span>
                      <span className="bg-black/30 px-2 py-0.5 md:px-3 md:py-1 rounded text-white font-bold text-sm md:text-base">R${multiplier},00</span>
                    </span>
                  </motion.button>

                  {/* Scratch Bonus Button - Smaller */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => chestGameRef.current?.playWithBonus()}
                    disabled={isLoading || scratchBonus < 1 || isGameProcessing}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-purple-400 hover:from-purple-400 hover:to-purple-300 text-white px-3 py-2.5 md:px-5 md:py-4 rounded-xl font-bold transition-all hover:shadow-xl relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="flex items-center justify-center gap-1 whitespace-nowrap">
                      <span className="text-white text-xs md:text-base font-black uppercase">Bônus</span>
                      <span className="bg-black/30 px-1.5 py-0.5 md:px-3 md:py-1 rounded text-white font-bold text-xs md:text-base">{1 * multiplier}</span>
                    </span>
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Available Prizes Section */}
        <div className="relative mb-6">
          {/* Background gradient effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-blue-600/10 blur-3xl -z-10"></div>
          
          <div className="bg-gradient-to-br from-gray-900/95 via-gray-900/90 to-black/95 rounded-3xl p-6 backdrop-blur-xl border border-gray-800/30 shadow-2xl">
            {/* Header with sleek design */}
            <div className="relative mb-6">
              <div className="flex items-center justify-center gap-3">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-blue-400/50"></div>
                <h3 className="text-white font-bold text-lg tracking-wider">PRÊMIOS</h3>
                <div className="h-px w-12 bg-gradient-to-l from-transparent to-blue-400/50"></div>
              </div>
            </div>
            
            {/* Horizontal scrolling container */}
            <div className="relative -mx-6 px-6 md:-mx-4 md:px-4">
              {/* Scroll indicators */}
              <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-gray-900/95 to-transparent z-10 pointer-events-none md:hidden"></div>
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-900/95 to-transparent z-10 pointer-events-none md:hidden"></div>
              
              <div 
                ref={scrollRef}
                className="relative flex gap-3 overflow-x-auto scrollbar-hide pb-2 scroll-smooth" 
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
                onScroll={handleScroll}
              >
                {/* Clean swipe right indicator */}
                <AnimatePresence>
                  {scrollProgress === 0 && (
                    <motion.div
                      className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <motion.div
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2.5, repeat: 3 }}
                      >
                        {/* Modern arrow indicator */}
                        <motion.div 
                          className="relative flex items-center gap-2"
                          animate={{ x: [0, 15, 0] }}
                          transition={{ duration: 1.8, repeat: 3, ease: "easeInOut" }}
                        >
                          {/* Three arrows pointing left */}
                          <motion.div 
                            className="flex items-center"
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 1.8, repeat: 3, delay: 0.2 }}
                          >
                            <ChevronLeft className="w-8 h-8 text-blue-400" />
                          </motion.div>
                          <motion.div 
                            className="flex items-center"
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 1.8, repeat: 3, delay: 0.1 }}
                          >
                            <ChevronLeft className="w-8 h-8 text-blue-400/80 -ml-4" />
                          </motion.div>
                          <motion.div 
                            className="flex items-center"
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 1.8, repeat: 3, delay: 0 }}
                          >
                            <ChevronLeft className="w-8 h-8 text-blue-400/60 -ml-4" />
                          </motion.div>
                        </motion.div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {/* Create pairs of prizes for 2 rows */}
                {prizeData.reduce((acc: any[], prize, index) => {
                  if (index % 2 === 0) {
                    acc.push([prize, prizeData[index + 1]].filter(Boolean));
                  }
                  return acc;
                }, []).map((pair: any[], pairIndex) => (
                  <div key={`pair-${pairIndex}`} className="flex flex-col gap-3 flex-shrink-0">
                    {pair.map((prize, index) => (
                      <motion.div
                        key={`prize-${pairIndex}-${index}`}
                        initial={{ opacity: 0, scale: 0.8, x: 20 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        transition={{ 
                          delay: pairIndex * 0.1 + index * 0.05,
                          type: "spring",
                          stiffness: 260,
                          damping: 20
                        }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          if (prize.value) {
                            setSelectedPrize({
                              name: prize.name || "",
                              value: prize.value.toString(),
                              image: prize.path || ""
                            });
                            setModalOpen(true);
                          }
                        }}
                        className="relative touch-manipulation w-32"
                      >
                        {/* Modern glass card */}
                        <div className="relative">
                          {/* Main card */}
                          <div className="relative bg-gradient-to-br from-gray-900/90 via-gray-900/70 to-black/90 backdrop-blur-xl rounded-3xl overflow-hidden border border-gray-700/50 shadow-2xl">
                            
                            {/* Inner content */}
                            <div className="relative p-3 flex flex-col items-center">
                              {/* Image container with effects */}
                              <div className="relative w-16 h-16 mb-2">
                                
                                {prize.path ? (
                                  <img
                                    src={prize.path}
                                    alt={`R$ ${prize.value}`}
                                    className="relative w-full h-full object-contain drop-shadow-2xl filter brightness-105 contrast-110"
                                    draggable={false}
                                    loading="eager"
                                    onError={(e) => {
                                      const target = e.currentTarget;
                                      target.style.display = 'none';
                                      const fallback = document.createElement('div');
                                      fallback.innerHTML = '<span class="text-4xl drop-shadow-2xl filter brightness-110">💰</span>';
                                      fallback.className = 'w-full h-full flex items-center justify-center';
                                      target.parentElement?.appendChild(fallback);
                                    }}
                                  />
                                ) : (
                                  <div className="relative w-full h-full flex items-center justify-center">
                                    <span className="text-4xl drop-shadow-2xl filter brightness-110">💰</span>
                                  </div>
                                )}
                              </div>

                              {/* Product name */}
                              <div className="min-h-[2rem] flex items-center mb-1">
                                <p className="text-gray-300 text-xs font-medium tracking-wide text-center leading-tight">
                                  {prize.name || '\u00A0'}
                                </p>
                              </div>

                              {/* Value with gradient text */}
                              <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-600 blur-lg opacity-50"></div>
                                <div className="relative font-black text-sm whitespace-nowrap bg-gradient-to-r from-blue-300 to-blue-500 bg-clip-text text-transparent">
                                  R$ {parseFloat(prize.value) >= 100000 
                                    ? <>100.000<span className="text-xs">,00</span></>
                                    : parseFloat(prize.value) >= 10000
                                    ? <>{(parseFloat(prize.value) / 1000).toFixed(0)}.000<span className="text-xs">,00</span></>
                                    : parseFloat(prize.value) >= 1000
                                    ? <>{parseFloat(prize.value).toLocaleString('pt-BR')}<span className="text-xs">,00</span></>
                                    : parseFloat(prize.value) >= 1 && parseFloat(prize.value) !== 0.5
                                    ? <>{parseFloat(prize.value).toLocaleString('pt-BR')}<span className="text-xs">,00</span></>
                                    : parseFloat(prize.value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Innovative Scroll Navigation */}
            <div className="relative mt-6 h-12">
              {/* Left swipe indicator */}
              <AnimatePresence>
                {scrollProgress > 5 && (
                  <motion.div
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-20"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.button
                      className="flex items-center gap-1 text-blue-400/60 hover:text-blue-400 cursor-pointer bg-gray-900/80 md:bg-gray-800/90 backdrop-blur-sm rounded-full p-2 md:p-3 border border-gray-700/50 hover:border-blue-400/50 transition-all"
                      animate={{ x: [0, -5, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      onClick={() => {
                        if (scrollRef.current) {
                          scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
                        }
                      }}
                    >
                      <ChevronLeft className="w-4 h-4 md:w-6 md:h-6" />
                      <ChevronLeft className="w-4 h-4 md:w-6 md:h-6 -ml-3 md:-ml-4 opacity-60" />
                      <ChevronLeft className="w-4 h-4 md:w-6 md:h-6 -ml-3 md:-ml-4 opacity-30" />
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Right swipe indicator */}
              <AnimatePresence>
                {scrollProgress < 95 && (
                  <motion.div
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-20"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.button
                      className="flex items-center gap-1 text-blue-400/60 hover:text-blue-400 cursor-pointer bg-gray-900/80 md:bg-gray-800/90 backdrop-blur-sm rounded-full p-2 md:p-3 border border-gray-700/50 hover:border-blue-400/50 transition-all"
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      onClick={() => {
                        if (scrollRef.current) {
                          scrollRef.current.scrollTo({ 
                            left: scrollRef.current.scrollWidth, 
                            behavior: 'smooth' 
                          });
                        }
                      }}
                    >
                      <ChevronRight className="w-4 h-4 md:w-6 md:h-6 -mr-3 md:-mr-4 opacity-30" />
                      <ChevronRight className="w-4 h-4 md:w-6 md:h-6 -mr-3 md:-mr-4 opacity-60" />
                      <ChevronRight className="w-4 h-4 md:w-6 md:h-6" />
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Center progress dots */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex gap-1.5">
                  {[0, 25, 50, 75, 100].map((pos) => (
                    <motion.div
                      key={pos}
                      className="w-1.5 h-1.5 rounded-full cursor-pointer"
                      animate={{
                        backgroundColor: scrollProgress >= pos - 10 && scrollProgress <= pos + 10 
                          ? '#60a5fa' 
                          : '#374151',
                        scale: scrollProgress >= pos - 10 && scrollProgress <= pos + 10 ? 1.2 : 1,
                      }}
                      onClick={() => {
                        if (scrollRef.current) {
                          const scrollLeft = (pos / 100) * (scrollRef.current.scrollWidth - scrollRef.current.clientWidth);
                          scrollRef.current.scrollTo({ left: scrollLeft, behavior: 'smooth' });
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tutorial Section */}
        <div className="bg-gray-900/50 rounded-2xl p-4 backdrop-blur-sm mb-8">
          <h3 className="text-white font-bold text-lg mb-4 text-center">
            Como Jogar
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">1</span>
              </div>
              <p className="text-gray-300">Escolha o <span className="text-blue-400 font-semibold">multiplicador</span> (1x, 5x ou 10x) para aumentar seus ganhos</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">2</span>
              </div>
              <p className="text-gray-300">Clique em comprar e assista a roleta girar até parar em um baú</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">3</span>
              </div>
              <p className="text-gray-300">Se o baú parar em um prêmio, você ganha!</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">4</span>
              </div>
              <p className="text-gray-300">O valor do prêmio é <span className="text-blue-400 font-semibold">multiplicado</span> e convertido em saldo real</p>
            </div>
          </div>
        </div>

        {/* Game Feed */}
        <GameFeed gameName="Baú do PIX" gameColor="blue" />
      </div>

      {/* Modals */}
      <LoginRequiredModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
      
      <InsufficientFundsModal
        isOpen={showInsufficientFundsModal}
        onClose={() => setShowInsufficientFundsModal(false)}
        type={insufficientFundsType}
        requiredAmount={multiplier}
        currentAmount={insufficientFundsType === "balance" ? balance : scratchBonus}
      />

      {/* Prize Modal */}
      {selectedPrize && (
        <PrizeModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          image={selectedPrize.image}
          name={selectedPrize.name}
          value={selectedPrize.value}
          gameTheme="blue"
        />
      )}

      {/* Confetti removed */}
    </div>
  );

  return <MobileLayout>{content}</MobileLayout>;
}