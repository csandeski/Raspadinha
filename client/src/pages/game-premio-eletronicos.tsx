import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { getPathWithRef } from "@/lib/url-utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { ProScratchCard } from "@/components/games/ProScratchCard";
import { useAuth } from "@/lib/auth";
import { MobileLayout } from "@/components/mobile-layout";
import GameFeed from "@/components/game-feed";

import { ArrowLeft, Smartphone, Sparkles, Star, Eye, Info, Gift, ShoppingCart, X, ChevronLeft, ChevronRight } from "lucide-react";
import { PrizeModal } from "@/components/PrizeModal";
import { Confetti } from "@/components/confetti";
import { gameEvents } from "@/lib/game-events";
import { balanceTracker } from "@/lib/balance-tracker";
import { MultiplierInfoModal } from "@/components/multiplier-info-modal";
import { LoginRequiredModal } from "@/components/login-required-modal";
import { InsufficientFundsModal } from "@/components/insufficient-funds-modal";
import { WinModal } from "@/components/win-modal";
import { LoseModal } from "@/components/lose-modal";






const getRarity = (value: string): string => {
  if (!value || value === "") return "common";
  const num = parseFloat(value);
  if (isNaN(num)) return "common";
  if (num >= 3000) return "mythic";
  if (num >= 100) return "rare";
  return "common";
};

const getRarityBadge = (value: string): string | null => {
  if (!value || value === "") return null;
  const num = parseFloat(value);
  if (isNaN(num)) return null;
  if (num >= 3000) return "MÍTICA";
  if (num >= 100) return "RARA";
  return null;
};

// Prize value to product info mapping
const getPrizeInfo = (value: string): { icon: string; name: string; path: string } => {
  const prizeValue = parseFloat(value);
  if (!isNaN(prizeValue)) {
    // Convert back to string for comparison with backend values
    const normalizedValue = prizeValue.toFixed(2);
    
    switch (normalizedValue) {
      case "0.50": return { icon: "💸", name: "50 centavos", path: `/premios/eletronicos/0.5.webp` };
      case "1.00": return { icon: "💸", name: "1 real", path: `/premios/eletronicos/1.webp` };
      case "2.00": return { icon: "💸", name: "2 reais", path: `/premios/eletronicos/2.webp` };
      case "3.00": return { icon: "💸", name: "3 reais", path: `/premios/eletronicos/3.webp` };
      case "4.00": return { icon: "💸", name: "4 reais", path: `/premios/eletronicos/4.webp` };
      case "5.00": return { icon: "💸", name: "5 reais", path: `/premios/eletronicos/5.webp` };
      case "10.00": return { icon: "🔌", name: "Cabo USB", path: `/premios/eletronicos/10.webp` };
      case "15.00": return { icon: "📱", name: "Suporte de Celular", path: `/premios/eletronicos/15.webp` };
      case "20.00": return { icon: "📱", name: "Capinha de Celular", path: `/premios/eletronicos/20.webp` };
      case "50.00": return { icon: "🔋", name: "Power Bank", path: `/premios/eletronicos/50.webp` };
      case "100.00": return { icon: "🎧", name: "Fone sem Fio", path: `/premios/eletronicos/100.webp` };
      case "200.00": return { icon: "📺", name: "SmartWatch", path: `/premios/eletronicos/200.webp` };
      case "500.00": return { icon: "💨", name: "Air Fryer", path: `/premios/eletronicos/500.webp` };
      case "1000.00": return { icon: "🎮", name: "Caixa de Som JBL", path: `/premios/eletronicos/1000.webp` };
      case "2000.00": return { icon: "📺", name: "Smart TV 55\" 4K", path: `/premios/eletronicos/2000.webp` };
      case "5000.00": return { icon: "💻", name: "Notebook Dell G15", path: `/premios/eletronicos/5000.webp` };
      case "10000.00": return { icon: "📱", name: "iPhone 16 Pro", path: `/premios/eletronicos/10000.webp` };
      case "100000.00": return { icon: "🍎", name: "Kit Completo Apple", path: `/premios/eletronicos/100000.webp` };
      default: return { icon: "🔌", name: "", path: `/premios/eletronicos/1.webp` };
    }
  }
  
  return { icon: "🔌", name: value, path: `/premios/eletronicos/1.webp` };
};

// Product prizes for display on unrevealed cards
const productPrizes = [
  { value: 0.5 },
  { value: 1 },
  { value: 2 },
  { value: 3 },
  { value: 4 },
  { value: 5 },
  { value: 10 },
  { value: 15 },
  { value: 20 },
  { value: 50 },
  { value: 100 },
  { value: 200 },
  { value: 500 },
  { value: 1000 },
  { value: 2000 },
  { value: 5000 },
  { value: 10000 },
  { value: 100000 }
];

export default function GamePremioEletronicos() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [gameId, setGameId] = useState<string | null>(null);
  const [values, setValues] = useState<string[]>([]);
  const [revealed, setRevealed] = useState<boolean[]>(new Array(9).fill(false));
  const [scratchProgress, setScratchProgress] = useState<number[]>(new Array(9).fill(0));
  const [isLoading, setIsLoading] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [restoringState, setRestoringState] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [won, setWon] = useState(false);
  const [prize, setPrize] = useState(0);
  const [prizeValue, setPrizeValue] = useState("");
  const [multiplier, setMultiplier] = useState<1 | 5 | 10>(1);
  const [hasStartedScratching, setHasStartedScratching] = useState(false);
  const [allCardsRevealed, setAllCardsRevealed] = useState(false);
  const [freePlays, setFreePlays] = useState(0);
  const [resultReady, setResultReady] = useState(false);
  const [hideOverlay, setHideOverlay] = useState(false);
  const [winningIndices, setWinningIndices] = useState<number[]>([]);
  const [showMultiplierInfo, setShowMultiplierInfo] = useState(false);
  const [isGlobalDragging, setIsGlobalDragging] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState<number | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showWinModal, setShowWinModal] = useState(false);
  const [showLoseModal, setShowLoseModal] = useState(false);
  const [showInsufficientFundsModal, setShowInsufficientFundsModal] = useState(false);
  const [insufficientFundsType, setInsufficientFundsType] = useState<"balance" | "bonus">("balance");
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  const { toast } = useToast();
  
  // Preload all prize images on component mount
  useEffect(() => {
    const preloadImages = () => {
      const imagePaths = [
        "/premios/eletronicos/0.5.webp", "/premios/eletronicos/1.webp", "/premios/eletronicos/2.webp",
        "/premios/eletronicos/3.webp", "/premios/eletronicos/4.webp", "/premios/eletronicos/5.webp",
        "/premios/eletronicos/10.webp", "/premios/eletronicos/15.webp", "/premios/eletronicos/20.webp",
        "/premios/eletronicos/50.webp", "/premios/eletronicos/100.webp", "/premios/eletronicos/200.webp",
        "/premios/eletronicos/500.webp", "/premios/eletronicos/1000.webp", "/premios/eletronicos/2000.webp",
        "/premios/eletronicos/5000.webp", "/premios/eletronicos/10000.webp", "/premios/eletronicos/100000.webp"
      ];
      
      imagePaths.forEach((path) => {
        const img = new Image();
        img.src = path;
      });
    };
    
    preloadImages();
  }, []);
  
  // Prize data for display section - ordered from highest to lowest
  const prizeData = [
    { value: 100000, path: "/premios/eletronicos/100000.webp", name: "Kit Completo Apple" },
    { value: 10000, path: "/premios/eletronicos/10000.webp", name: "iPhone 16 Pro" },
    { value: 5000, path: "/premios/eletronicos/5000.webp", name: "Notebook Dell G15" },
    { value: 2000, path: "/premios/eletronicos/2000.webp", name: "Smart TV 55\" 4K" },
    { value: 1000, path: "/premios/eletronicos/1000.webp", name: "Caixa de Som JBL" },
    { value: 500, path: "/premios/eletronicos/500.webp", name: "Air Fryer" },
    { value: 200, path: "/premios/eletronicos/200.webp", name: "SmartWatch" },
    { value: 100, path: "/premios/eletronicos/100.webp", name: "Fone sem Fio" },
    { value: 50, path: "/premios/eletronicos/50.webp", name: "Power Bank" },
    { value: 20, path: "/premios/eletronicos/20.webp", name: "Capinha de Celular" },
    { value: 15, path: "/premios/eletronicos/15.webp", name: "Suporte de Celular" },
    { value: 10, path: "/premios/eletronicos/10.webp", name: "Cabo USB" },
    { value: 5, path: "/premios/eletronicos/5.webp", name: "5 reais" },
    { value: 4, path: "/premios/eletronicos/4.webp", name: "4 reais" },
    { value: 3, path: "/premios/eletronicos/3.webp", name: "3 reais" },
    { value: 2, path: "/premios/eletronicos/2.webp", name: "2 reais" },
    { value: 1, path: "/premios/eletronicos/1.webp", name: "1 real" },
    { value: 0.5, path: "/premios/eletronicos/0.5.webp", name: "50 centavos" }
  ];

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPrize, setSelectedPrize] = useState<{
    image: string;
    name: string;
    value: string;
  } | null>(null);

  // Query for user balance
  const { data: balanceData, refetch: balanceRefetch } = useQuery({
    queryKey: ["/api/user/balance"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  


  // Query for user data
  const { data: userData } = useQuery({
    queryKey: ["/api/user/level"],
    enabled: !!user,
  });

  // Check for existing game state on mount
  const { data: savedSession, isLoading: isLoadingSession } = useQuery({
    queryKey: ["/api/games/restore-state/premio-eletronicos"],
    enabled: !gameStarted,
    retry: false,
  });

  // Scroll to top when entering the page
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  // Track scroll progress for navigation
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      const scrollLeft = container.scrollLeft;
      const scrollWidth = container.scrollWidth - container.clientWidth;
      const progress = scrollWidth > 0 ? (scrollLeft / scrollWidth) * 100 : 0;
      setScrollProgress(progress);
    };
    
    container.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial calculation
    
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Initialize audio elements with iOS/Android compatibility

  


  // State for checking results
  const [isCheckingResult, setIsCheckingResult] = useState(false);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const processingRef = useRef(false);

  
  // Check for free plays on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const freePlaysParam = params.get('freePlays');
    if (freePlaysParam) {
      const plays = parseInt(freePlaysParam);
      if (!isNaN(plays) && plays > 0) {
        setFreePlays(plays);
      }
    }
  }, []);

  // Save game state whenever it changes
  useEffect(() => {
    if (gameStarted && gameId && !restoringState && !gameComplete && !isCheckingResult && !processingRef.current) {
      const gameState = {
        gameId,
        values,
        revealed,
        scratchProgress,
        hasStartedScratching,
        allCardsRevealed,
      };

      apiRequest("/api/games/save-state", "POST", {
        gameType: "premio-eletronicos",
        gameId,
        gameState,
      }).catch((error) => {
        console.error("Failed to save game state:", error);
      });
    }
  }, [gameStarted, gameId, values, revealed, restoringState, gameComplete, isCheckingResult]);

  // Restore game state if exists
  useEffect(() => {
    if (savedSession && (savedSession as any).gameState && !gameComplete) {
      setRestoringState(true);
      const { gameState } = savedSession as any;

      if (gameState.gameId && gameState.values && gameState.values.length === 9) {
        setGameId(gameState.gameId);
        setValues(gameState.values);
        // Ensure revealed state is properly restored
        const revealedState = gameState.revealed || new Array(9).fill(false);
        setRevealed(revealedState.map((r: any) => Boolean(r)));
        setScratchProgress(gameState.scratchProgress || new Array(9).fill(0));
        setHasStartedScratching(gameState.hasStartedScratching || false);
        setAllCardsRevealed(gameState.allCardsRevealed || false);
        setGameStarted(true);
      }

      setTimeout(() => {
        setRestoringState(false);
      }, 100);
    }
  }, [savedSession]);

  const startGame = async (useScratchBonus: boolean = false) => {
    if (isLoading || gameStarted) return;

    // Check if user is not authenticated and it's not a welcome play
    if (!user && !useScratchBonus) {
      // Show login modal for non-authenticated users
      setShowLoginModal(true);
      return;
    }

    // Check if user is not authenticated and has no scratch bonus
    if (!user && ((balanceData as any)?.scratchBonus || 0) === 0 && useScratchBonus) {
      setLocation(getPathWithRef('/register'));
      return;
    }

    // Check for insufficient funds when trying to play
    if (user && balanceData) {
      const gameCost = 1 * multiplier; // Eletrônicos game costs R$1 × multiplier
      
      if (useScratchBonus) {
        // Check scratch bonus
        const bonusCount = (balanceData as any).scratchBonus || 0;
        const requiredBonus = gameCost;
        
        if (bonusCount < requiredBonus) {
          setInsufficientFundsType("bonus");
          setShowInsufficientFundsModal(true);
          return;
        }
      } else {
        // Check real balance
        const realBalance = parseFloat((balanceData as any).balance || "0");
        
        if (realBalance < gameCost) {
          setInsufficientFundsType("balance");
          setShowInsufficientFundsModal(true);
          return;
        }
      }
    }

    setIsLoading(true);
    
    try {
      // Clear any existing sessions first
      await apiRequest("/api/games/clear-game-type/premio-eletronicos", "DELETE").catch(() => {});
      
      const response = await apiRequest(
        "/api/games/premio-eletronicos/create",
        "POST",
        { multiplier, useBonus: useScratchBonus },
      );

      setGameId(response.gameId);
      setValues(response.hiddenValues);
      setRevealed(new Array(9).fill(false));
      setScratchProgress(new Array(9).fill(0));
      setGameStarted(true);
      setGameComplete(false);
      setWon(false);
      setPrize(0);
      setHasStartedScratching(false);
      setAllCardsRevealed(false);

      // Fire Facebook Pixel AddToCart event
      if (typeof window !== 'undefined' && (window as any).fbq) {
        (window as any).fbq('track', 'AddToCart', {
          content_name: 'Raspadinha Eletrônicos',
          content_category: 'raspadinha',
          content_type: 'game',
          value: 1 * multiplier,
          currency: 'BRL',
          content_ids: ['premio-eletronicos']
        });
      }

      // Force immediate updates
      // Immediate level update
      queryClient.invalidateQueries({ queryKey: ["/api/user/level"] });
      queryClient.refetchQueries({ queryKey: ["/api/user/level"] });
      
      // Delay balance refresh to keep the indicator visible
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/user/balance"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user/level"] });
        queryClient.refetchQueries({ queryKey: ["/api/user/level"] }); // Force refetch
        balanceRefetch(); // Force balance update after delay
      }, 300);
    } catch (error: any) {
      toast({
        title: "Erro ao iniciar jogo",
        description: error.error || "Verifique seu saldo e tente novamente",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReveal = async (index: number) => {
    if (!gameStarted || revealed[index] || gameComplete || isCheckingResult || processingRef.current || !gameId) return;


    
    // Vibrate on mobile devices
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    
    // Play scratch sound
    // if (scratchSoundRef.current) { // Som removido
    //   scratchSoundRef.current.currentTime = 0;
    //   scratchSoundRef.current.play().catch(() => {});
    // }

    const newRevealed = [...revealed];
    newRevealed[index] = true;
    setRevealed(newRevealed);
    
    // Check if all cards are revealed
    const allRevealed = newRevealed.every(r => r);
    if (allRevealed && !isCheckingResult && !processingRef.current && gameId && !allCardsRevealed) {
      setAllCardsRevealed(true);
      // Auto check result when all cards are revealed
      checkGameResult();
    }
  };

  const checkGameResult = async () => {
    if (!gameId || isCheckingResult || gameComplete || processingRef.current) return;

    // Immediately set the ref to prevent any other calls
    processingRef.current = true;
    
    // Additional check to prevent multiple calls
    const currentGameId = gameId;
    setIsCheckingResult(true);
    setGameComplete(true); // Set complete immediately to prevent multiple calls

    try {
      const response = await apiRequest(
        `/api/games/premio-eletronicos/${currentGameId}/reveal`,
        "POST",
      );

      setWon(response.won);
      setPrize(response.prize);
      setPrizeValue(response.prizeValue || "");
      setResultReady(true); // Mark result as ready to display

      // Show appropriate modal based on result
      if (response.won && response.prize > 0) {
        setShowWinModal(true);
      } else if (!response.won) {
        setShowLoseModal(true);
      }

      // Add balance change to queue for wins
      if (response.won && response.prize > 0) {
        // Notify balance tracker we're processing local change
        balanceTracker.setLocalChangeProcessing(true);
        
        // Add to queue for proper ordering
        balanceTracker.addLocalBalanceChange(response.prize);
        
        // Re-enable global tracking after a longer delay to prevent duplicates
        setTimeout(() => {
          balanceTracker.setLocalChangeProcessing(false);
        }, 1000); // Increased from 100ms to 1000ms
      }

      // Emit game event for live feed after result is determined
      gameEvents.emitGamePlay({
        name: user ? user.name : "Visitante",
        game: "Eletrônicos",
        bet: 1 * multiplier,
        isReal: true,
        level: (userData as any)?.level || 0
      });

      // Play sound and vibrate based on result
      if (response.won) {
        // playAudioMobile(winSoundRef.current); // Som removido
        // Vibrate for win (longer pattern)
        if ('vibrate' in navigator && navigator.vibrate) {
          navigator.vibrate([100, 50, 100, 50, 200]);
        }
      } else {
        // playAudioMobile(loseSoundRef.current); // Som removido
        // Vibrate for loss (short pattern)
        if ('vibrate' in navigator && navigator.vibrate) {
          navigator.vibrate([50, 30, 50]);
        }
      }

      if (response.won) {
        // Find the matching values
        const valueCount: { [key: string]: number[] } = {};
        values.forEach((value, index) => {
          if (value !== "") {
            if (!valueCount[value]) {
              valueCount[value] = [];
            }
            valueCount[value].push(index);
          }
        });

        // Find the winning combination (3 matching values)
        const winningValue = Object.keys(valueCount).find(
          (value) => valueCount[value].length >= 3
        );

        if (winningValue) {
          setWinningIndices(valueCount[winningValue].slice(0, 3));
        }

        // Refresh balance after win
        queryClient.invalidateQueries({ queryKey: ["/api/user/balance"] });
      }
      
      // Always refresh level after playing (win or lose) since totalWagered increases
      queryClient.invalidateQueries({ queryKey: ["/api/user/level"] });

      // Clear saved game state
      if (currentGameId) {
        // Clear the specific game
        apiRequest(`/api/games/clear-state/${currentGameId}`, "DELETE").catch(() => {});
        // Also clear any premio-eletronicos sessions to prevent "game in progress" bug
        apiRequest(`/api/games/clear-game-type/premio-eletronicos`, "DELETE").catch(() => {});
      }
      
      // Clear gameId to prevent further calls
      setGameId(null);
    } catch (error: any) {
      // Revert gameComplete if there was an error
      setGameComplete(false);
      toast({
        title: "Erro ao verificar resultado",
        description: error.error || "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setIsCheckingResult(false);
    }
  };

  const handlePlayAgain = () => {
    setShowWinModal(false);
    setShowLoseModal(false);
    setGameStarted(false);
    setGameComplete(false);
    setRevealed(new Array(9).fill(false));
    setScratchProgress(new Array(9).fill(0));
    setValues([]);
    setGameId(null);
    setWon(false);
    setPrize(0);
    setPrizeValue("");
    setHasStartedScratching(false);
    setAllCardsRevealed(false);
    setResultReady(false);
    setHideOverlay(false);
    setWinningIndices([]);
    processingRef.current = false;
    setIsGlobalDragging(false);
    setCurrentCardIndex(null);
  };

  // Global drag handling
  const handleGlobalMouseDown = (e: React.MouseEvent) => {
    if (!gameStarted || gameComplete) return;
    setIsGlobalDragging(true);
  };

  const handleGlobalMouseMove = (e: React.MouseEvent) => {
    if (!isGlobalDragging || !gameStarted || gameComplete) return;

    const mouseX = e.clientX;
    const mouseY = e.clientY;

    // Check which card the mouse is over
    cardRefs.current.forEach((cardRef, index) => {
      if (!cardRef) return;
      
      const rect = cardRef.getBoundingClientRect();
      const isOverCard = 
        mouseX >= rect.left && 
        mouseX <= rect.right && 
        mouseY >= rect.top && 
        mouseY <= rect.bottom;

      if (isOverCard && !revealed[index] && currentCardIndex !== index) {
        setCurrentCardIndex(index);
        handleReveal(index);
      }
    });
  };

  const handleGlobalMouseUp = () => {
    setIsGlobalDragging(false);
    setCurrentCardIndex(null);
  };

  const handleGlobalTouchStart = (e: React.TouchEvent) => {
    if (!gameStarted || gameComplete) return;
    setIsGlobalDragging(true);
  };

  const handleGlobalTouchMove = (e: React.TouchEvent) => {
    if (!isGlobalDragging || !gameStarted || gameComplete) return;

    const touch = e.touches[0];
    const touchX = touch.clientX;
    const touchY = touch.clientY;

    // Check which card the touch is over
    cardRefs.current.forEach((cardRef, index) => {
      if (!cardRef) return;
      
      const rect = cardRef.getBoundingClientRect();
      const isOverCard = 
        touchX >= rect.left && 
        touchX <= rect.right && 
        touchY >= rect.top && 
        touchY <= rect.bottom;

      if (isOverCard && !revealed[index] && currentCardIndex !== index) {
        setCurrentCardIndex(index);
        handleReveal(index);
      }
    });
  };

  const handleGlobalTouchEnd = () => {
    setIsGlobalDragging(false);
    setCurrentCardIndex(null);
  };

  const formatPrize = (value: string) => {
    if (!value || value === "") return "📱";
    const num = parseInt(value);
    if (num >= 5000) return `R$${num / 1000}k`;
    return `R$${num}`;
  };

  const getPrizeInfo = (value: string): { icon: string; name: string; path: string } => {
    const prizeValue = parseFloat(value);
    if (!isNaN(prizeValue)) {
      // Convert back to string for comparison with backend values
      const normalizedValue = prizeValue.toFixed(2);
      
      switch (normalizedValue) {
        case "0.50": return { icon: "💰", name: "50 centavos", path: `/premios/eletronicos/0.5.webp` };
        case "1.00": return { icon: "💰", name: "1 real", path: `/premios/eletronicos/1.webp` };
        case "2.00": return { icon: "💰", name: "2 reais", path: `/premios/eletronicos/2.webp` };
        case "3.00": return { icon: "💰", name: "3 reais", path: `/premios/eletronicos/3.webp` };
        case "4.00": return { icon: "💰", name: "4 reais", path: `/premios/eletronicos/4.webp` };
        case "5.00": return { icon: "💰", name: "5 reais", path: `/premios/eletronicos/5.webp` };
        case "10.00": return { icon: "🔌", name: "Cabo USB", path: `/premios/eletronicos/10.webp` };
        case "15.00": return { icon: "📲", name: "Suporte de Celular", path: `/premios/eletronicos/15.webp` };
        case "20.00": return { icon: "📱", name: "Capinha de Celular", path: `/premios/eletronicos/20.webp` };
        case "50.00": return { icon: "🔋", name: "Power Bank", path: `/premios/eletronicos/50.webp` };
        case "100.00": return { icon: "🎧", name: "Fone sem Fio", path: `/premios/eletronicos/100.webp` };
        case "200.00": return { icon: "⌚", name: "SmartWatch", path: `/premios/eletronicos/200.webp` };
        case "500.00": return { icon: "🍳", name: "Air Fryer", path: `/premios/eletronicos/500.webp` };
        case "1000.00": return { icon: "🔊", name: "Caixa de Som JBL", path: `/premios/eletronicos/1000.webp` };
        case "2000.00": return { icon: "📺", name: 'Smart Tv 55" 4k', path: `/premios/eletronicos/2000.webp` };
        case "5000.00": return { icon: "💻", name: "Notebook Dell G15", path: `/premios/eletronicos/5000.webp` };
        case "10000.00": return { icon: "📱", name: "iPhone 16 Pro", path: `/premios/eletronicos/10000.webp` };
        case "100000.00": return { icon: "💻", name: "Kit Completo Apple", path: `/premios/eletronicos/100000.webp` };
        default: return { icon: "📱", name: "Prêmio", path: `/premios/eletronicos/1.webp` };
      }
    }
    
    return { icon: "📱", name: value, path: `/premios/eletronicos/1.webp` };
  };

  return (
    <MobileLayout showBonusMode={false}>
      <div className="flex-1 flex flex-col">
        {/* Main Content */}
        <div className="flex-1 flex flex-col px-4 pt-6 pb-6 max-w-md md:max-w-3xl mx-auto w-full">
          {/* Game Title */}
          <div className="flex items-start gap-4 mb-6">
            <button
              onClick={() => setLocation("/#premios")}
              className="p-2 md:p-3 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors mt-1"
            >
              <ArrowLeft className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl md:text-4xl font-bold text-orange-400">Eletrônicos</h1>
              <p className="text-gray-400 text-sm md:text-base mt-1">
                Raspou, achou 3 iguais, <span className="text-orange-400 font-bold">Ganhou!</span>
              </p>
              {freePlays > 0 && (
                <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 bg-gray-800/50 rounded-full border border-gray-700">
                  <span className="text-orange-400">🎁</span>
                  <span className="text-orange-400 font-bold text-sm md:text-base">{freePlays} jogadas grátis</span>
                </div>
              )}
            </div>
          </div>



          {/* Game Area */}
          <div className="relative mb-6">
            {/* Confetti Effect */}
            <Confetti isActive={gameComplete && won} />
            
            {/* Raspadinha Container */}
            <div
              className={`relative transition-all duration-500`}
            >
              <div
                className={`bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800 backdrop-blur-xl ${gameComplete && resultReady ? "rounded-b-3xl border-b border-l border-r border-gray-700/30" : "rounded-3xl border border-gray-700/30"} p-6 shadow-2xl ${!gameStarted && "opacity-75"} relative overflow-hidden`}
              >
                {/* Gray background with stars pattern */}
                <div className="absolute inset-0 opacity-20">
                  {/* Corner stars */}
                  <div className="absolute top-4 left-4 text-4xl text-gray-300 drop-shadow-lg">★</div>
                  <div className="absolute top-4 right-4 text-4xl text-gray-300 drop-shadow-lg">★</div>
                  <div className="absolute bottom-4 left-4 text-4xl text-gray-300 drop-shadow-lg">★</div>
                  <div className="absolute bottom-4 right-4 text-4xl text-gray-300 drop-shadow-lg">★</div>
                  
                  {/* Medium stars */}
                  <div className="absolute top-1/4 left-1/3 text-2xl text-gray-400/80">★</div>
                  <div className="absolute top-1/3 right-1/4 text-2xl text-gray-400/80">★</div>
                  <div className="absolute bottom-1/4 right-1/3 text-2xl text-gray-400/80">★</div>
                  <div className="absolute bottom-1/3 left-1/4 text-2xl text-gray-400/80">★</div>
                  
                  {/* Small scattered stars */}
                  <div className="absolute top-20 left-20 text-xl text-gray-400/60">★</div>
                  <div className="absolute top-32 right-16 text-xl text-gray-400/60">★</div>
                  <div className="absolute bottom-20 right-20 text-xl text-gray-400/60">★</div>
                  <div className="absolute bottom-32 left-16 text-xl text-gray-400/60">★</div>
                  <div className="absolute top-1/2 left-12 text-lg text-gray-500/50">★</div>
                  <div className="absolute top-1/2 right-12 text-lg text-gray-500/50">★</div>
                </div>
                
                {/* Subtle gradient overlay for depth */}
                <div className={`absolute inset-0 bg-gradient-to-t from-gray-800/20 via-transparent to-transparent ${gameComplete && resultReady ? "rounded-b-3xl" : "rounded-3xl"}`} />
                {/* Message Overlay when game is complete */}
                {/* Eye button always visible when game is complete */}
                {gameComplete && resultReady && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => setHideOverlay(!hideOverlay)}
                    className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-sm z-50 transition-all"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Eye className={`w-5 h-5 ${hideOverlay ? "text-orange-400" : "text-white"}`} />
                  </motion.button>
                )}



                <AnimatePresence>
                  {gameComplete && resultReady && !hideOverlay && (
                    <>
                      {/* Blur overlay */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 rounded-b-3xl z-10"
                      />

                      {/* Result Message */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute inset-0 flex items-center justify-center z-30"
                      >
                        <div className="text-center p-6">
                          <h2
                            className={`text-2xl font-bold mb-2 ${won ? "text-orange-400" : "text-red-400"}`}
                          >
                            {won ? "Parabéns!" : "Não foi desta vez"}
                          </h2>
                          {won ? (
                            <>
                              <img
                                src={getPrizeInfo(prizeValue || prize.toString()).path}
                                alt={getPrizeInfo(prizeValue || prize.toString()).name}
                                className="w-20 h-20 object-contain mx-auto mb-3 filter drop-shadow-2xl animate-shimmer"
                                loading="eager"
                              />
                              <p className="text-2xl font-bold text-orange-400 mb-1">
                                {getPrizeInfo(prizeValue || prize.toString()).name}
                              </p>
                              {multiplier > 1 && prize > 0 ? (
                                <motion.div
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.5 }}
                                  className="mb-2"
                                >
                                  <p className="text-2xl font-bold text-yellow-400 animate-pulse">
                                    R$ {(prize / multiplier).toFixed(2)} x {multiplier} = R$ {prize.toFixed(2)}
                                  </p>
                                </motion.div>
                              ) : (
                                <p className="text-3xl font-bold text-orange-400 mb-2">
                                  {prize > 0 ? `R$ ${prize.toFixed(2)}` : prizeValue}
                                </p>
                              )}
                              <p className="text-gray-300 text-sm">
                                {prize > 0 ? "Prêmio adicionado ao saldo!" : "Parabéns pelo seu prêmio!"}
                              </p>
                            </>
                          ) : (
                            <p className="text-gray-300 text-sm">
                              Tente novamente
                            </p>
                          )}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>

                {/* Integrated Controls Overlay */}
                {!gameStarted && !gameComplete && (
                  <div className="absolute inset-0 flex items-center justify-center z-20 rounded-2xl overflow-hidden">
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ 
                        duration: 0.6, 
                        type: "spring",
                        bounce: 0.4
                      }}
                      className="relative w-full h-full"
                    >
                      {/* Blurred Raspadinhas Background */}
                      <div className="absolute inset-0 grid grid-cols-3 gap-3 p-4 blur-md">
                        {Array(9).fill(null).map((_, index) => (
                          <div key={index} className="relative overflow-hidden rounded-2xl">
                            <div className="w-full h-full bg-gradient-to-br from-gray-600 via-gray-700 to-gray-800 shadow-lg border border-gray-500/30">
                              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent" />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Modern Gradient Background */}
                      <div className="absolute inset-0 bg-black/50 rounded-2xl" />
                      
                      {/* Controls Container */}
                      <div className="relative w-full h-full flex flex-col items-center justify-center p-6">
                        {/* Multiplier Selection */}
                        {!gameStarted && (
                          <motion.div 
                            initial={{ scale: 0.8, opacity: 0, y: 50 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            transition={{ 
                              duration: 0.7,
                              type: "spring",
                              stiffness: 200,
                              damping: 15
                            }}
                            className="relative w-full max-w-md"
                          >
                            {/* Premium Glass Container */}
                            <div className="relative overflow-hidden rounded-[30px] p-1 bg-gradient-to-br from-orange-500/20 via-transparent to-orange-500/20">
                              <div className="relative bg-black/80 backdrop-blur-2xl rounded-[26px] p-4 sm:p-8 border border-white/5">
                                {/* Animated Background Pattern */}
                                <div className="absolute inset-0 opacity-10">
                                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(249,115,22,0.2)_0%,transparent_50%)]" />
                                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_50%,rgba(249,115,22,0.2)_0%,transparent_50%)]" />
                                </div>
                                
                                {/* Title */}
                                <div className="relative mb-4 text-center">
                                  <h4 className="text-sm font-black text-white mb-2 tracking-wider">
                                    MULTIPLICADOR DE GANHOS
                                  </h4>
                                </div>
                                
                                {/* Button Grid */}
                                <div className="grid grid-cols-3 gap-3">
                                  {[1, 5, 10].map((value) => (
                                    <motion.button
                                      key={value}
                                      whileHover={{ scale: 1.02 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => setMultiplier(value as 1 | 5 | 10)}
                                      disabled={gameStarted && !gameComplete}
                                      className="relative group overflow-hidden rounded-2xl"
                                    >
                                      {/* Button Container */}
                                      <div className={`
                                        relative rounded-2xl p-[2px] overflow-hidden
                                        ${multiplier === value 
                                          ? 'bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600' 
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
                                              text-lg sm:text-xl font-black mb-1 transition-all duration-300
                                              ${multiplier === value ? 'text-white' : 'text-gray-400'}
                                            `}>
                                              {value}x
                                            </div>
                                            <div className={`
                                              text-[10px] sm:text-xs font-medium transition-all duration-300 whitespace-nowrap
                                              ${multiplier === value ? 'text-orange-200' : 'text-gray-500'}
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
                                              className="absolute top-1 right-1 w-6 h-6 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/50 z-20"
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
                                <div className="mt-4 flex gap-2 w-full">
                                  {/* Buy Button - Larger */}
                                  <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={gameComplete && resultReady ? handlePlayAgain : (!gameStarted ? () => startGame(false) : undefined)}
                                    disabled={isLoading || isLoadingSession}
                                    className="flex-[2] bg-gradient-to-r from-orange-500 to-orange-400 hover:from-orange-400 hover:to-orange-300 text-white px-4 py-3 md:px-6 md:py-4 rounded-xl font-bold transition-all hover:shadow-xl text-sm md:text-base relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <span className="flex items-center justify-center gap-2 whitespace-nowrap">
                                      <span className="text-white text-sm md:text-base font-black uppercase">
                                        {isLoading ? "..." : gameComplete && resultReady ? "Jogar Novamente" : "Raspar"}
                                      </span>
                                      {!isLoading && !gameStarted && !gameComplete && (
                                        <span className="bg-black/30 px-2 py-0.5 md:px-3 md:py-1 rounded text-white font-bold text-sm md:text-base">R${multiplier},00</span>
                                      )}
                                    </span>
                                  </motion.button>

                                  {/* Scratch Bonus Button - Smaller */}
                                  {!gameStarted && !gameComplete && (
                                    <motion.button
                                      whileHover={{ scale: 1.02 }}
                                      whileTap={{ scale: 0.98 }}
                                      onClick={() => startGame(true)}
                                      disabled={isLoading || isLoadingSession}
                                      className="flex-1 bg-gradient-to-r from-purple-500 to-purple-400 hover:from-purple-400 hover:to-purple-300 text-white px-3 py-2.5 md:px-5 md:py-4 rounded-xl font-bold transition-all hover:shadow-xl relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      <span className="flex items-center justify-center gap-1 whitespace-nowrap">
                                        <span className="text-white text-xs md:text-base font-black uppercase">Bônus</span>
                                        <span className="bg-black/30 px-1.5 py-0.5 md:px-3 md:py-1 rounded text-white font-bold text-xs md:text-base">{1 * multiplier}</span>
                                      </span>
                                    </motion.button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  </div>
                )}

                {/* Raspadinhas Grid */}
                <div 
                  ref={gameContainerRef}
                  className="grid grid-cols-3 gap-2 md:gap-3 relative"
                  onMouseDown={handleGlobalMouseDown}
                  onMouseMove={handleGlobalMouseMove}
                  onMouseUp={handleGlobalMouseUp}
                  onMouseLeave={handleGlobalMouseUp}
                  onTouchStart={handleGlobalTouchStart}
                  onTouchMove={handleGlobalTouchMove}
                  onTouchEnd={handleGlobalTouchEnd}
                >
                  
                  {(gameStarted ? values : Array(9).fill("")).map(
                    (value, index) => (
                      <div 
                        ref={(el) => (cardRefs.current[index] = el)}
                        key={`${gameId}-${index}`} 
                        className={`relative w-full h-24 md:h-36 min-h-[96px] md:min-h-[144px] rounded-2xl overflow-hidden`}>
                        {/* Winning circle indicator */}
                        {winningIndices.includes(index) && hideOverlay && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ 
                              type: "spring",
                              stiffness: 200,
                              damping: 20,
                              delay: 0.6 + (index * 0.1)
                            }}
                            className="absolute inset-0 pointer-events-none z-20"
                          >
                            <div className="absolute inset-0 rounded-2xl border-4 border-orange-400 shadow-[0_0_20px_rgba(251,146,60,0.5)]" />
                            <div className="absolute -inset-1 rounded-2xl border-2 border-orange-400/30 animate-pulse" />
                          </motion.div>
                        )}

                        
                        <ProScratchCard
                          value={
                            <div className="w-full h-full relative overflow-hidden rounded-xl">
                              {gameStarted ? (
                                value ? (
                                  <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ duration: 0.3 }}
                                    className="relative w-full h-full flex flex-col items-center justify-center p-2 bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800 overflow-hidden"
                                  >
                                    {/* Subtle shine effect */}
                                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent" />
                                    
                                    {/* Prize image - larger and all same size */}
                                    <img
                                      src={getPrizeInfo(value).path}
                                      alt={getPrizeInfo(value).name}
                                      className="w-10 h-10 md:w-16 md:h-16 object-contain mb-1 relative z-10"
                                      draggable={false}
                                      loading="eager"
                                    />
                                    
                                    {/* Prize name - max 2 lines */}
                                    <div className="h-6 md:h-10 flex items-center justify-center px-1 w-full relative z-10">
                                      <p className="text-white text-[9px] md:text-sm font-bold text-center leading-[11px] md:leading-tight uppercase line-clamp-2">
                                        {getPrizeInfo(value).name}
                                      </p>
                                    </div>
                                  </motion.div>
                                ) : (
                                  /* Non-prize square - show company logo */
                                  (<motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ duration: 0.3 }}
                                    className="relative w-full h-full flex flex-col items-center justify-center p-2 bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800 overflow-hidden"
                                  >
                                    {/* Subtle shine effect */}
                                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent" />
                                    
                                    {/* Logo */}
                                    <img
                                      src="/logos/logomania.svg"
                                      alt="Logo"
                                      className="w-10 h-10 md:w-16 md:h-16 object-contain mb-1 relative z-10 opacity-30"
                                      draggable={false}
                                    />
                                    
                                    {/* Empty text */}
                                    <p className="text-gray-300 text-[10px] md:text-sm font-bold relative z-10 uppercase">
                                      VAZIO
                                    </p>
                                  </motion.div>)
                                )
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800 rounded-xl flex flex-col items-center justify-center p-2">
                                  {/* Random product image when not started */}
                                  <img
                                    src={getPrizeInfo(productPrizes[index % productPrizes.length].value.toString()).path}
                                    alt={getPrizeInfo(productPrizes[index % productPrizes.length].value.toString()).name}
                                    className="w-10 h-10 object-contain mb-1 opacity-50"
                                    draggable={false}
                                  />
                                  <div className="h-6 flex items-center justify-center px-1 w-full">
                                    <p className="text-gray-300 text-[9px] font-bold text-center leading-[11px] uppercase opacity-50 line-clamp-2">
                                      {getPrizeInfo(productPrizes[index % productPrizes.length].value.toString()).name}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          }
                          index={index}
                          onReveal={() => handleReveal(index)}
                          isDisabled={
                            !gameStarted ||
                            revealed[index] ||
                            gameComplete
                          }
                          revealed={revealed[index]}
                          allRevealed={allCardsRevealed}
                          onScratchStart={() => {
                            if (!hasStartedScratching) {
                              setHasStartedScratching(true);
                            }
                          }}
                          onScratchProgress={(percentage) => {
                            const newProgress = [...scratchProgress];
                            newProgress[index] = percentage;
                            setScratchProgress(newProgress);
                          }}
                        />
                      </div>
                    ),
                  )}
                </div>
              </div>
              
              {/* Play Again Button - Extension of raspadinha */}
              {gameComplete && resultReady && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 -mt-[1px] rounded-b-3xl transition-all hover:shadow-lg overflow-hidden border-l border-r border-b border-gray-700/30"
                >
                  <button
                    onClick={handlePlayAgain}
                    className="w-full py-3 text-white text-sm font-medium transition-all"
                  >
                    Jogar Novamente
                  </button>
                </motion.div>
              )}
            </div>
          </div>

          {/* Tutorial and Information */}
          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Available Prizes Section */}
            <div className="relative">
              {/* Background gradient effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-orange-600/20 via-amber-600/20 to-orange-600/20 blur-3xl -z-10"></div>
              
              <div className="bg-gradient-to-br from-gray-900/95 via-gray-900/90 to-black/95 rounded-3xl p-6 backdrop-blur-xl border border-gray-800/30 shadow-2xl">
                {/* Header with sleek design */}
                <div className="relative mb-6">
                  <div className="flex items-center justify-center gap-3">
                    <div className="h-px w-12 bg-gradient-to-r from-transparent to-orange-400/50"></div>
                    <h3 className="text-white font-bold text-lg tracking-wider">PRÊMIOS</h3>
                    <div className="h-px w-12 bg-gradient-to-l from-transparent to-orange-400/50"></div>
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
                                <ChevronLeft className="w-8 h-8 text-orange-400" />
                              </motion.div>
                              <motion.div 
                                className="flex items-center"
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ duration: 1.8, repeat: 3, delay: 0.1 }}
                              >
                                <ChevronLeft className="w-8 h-8 text-orange-400/80 -ml-4" />
                              </motion.div>
                              <motion.div 
                                className="flex items-center"
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ duration: 1.8, repeat: 3, delay: 0 }}
                              >
                                <ChevronLeft className="w-8 h-8 text-orange-400/60 -ml-4" />
                              </motion.div>
                            </motion.div>
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {/* Create pairs of prizes for 2 rows */}
                    {prizeData.reduce((acc, prize, index) => {
                      if (index % 2 === 0) {
                        acc.push([prize, prizeData[index + 1]].filter(Boolean));
                      }
                      return acc;
                    }, [] as typeof prizeData[]).map((pair, pairIndex) => (
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
                                    fallback.innerHTML = '<span class="text-4xl drop-shadow-2xl filter brightness-110">📱</span>';
                                    fallback.className = 'w-full h-full flex items-center justify-center';
                                    target.parentElement?.appendChild(fallback);
                                  }}
                                />
                              ) : (
                                <div className="relative w-full h-full flex items-center justify-center">
                                  <span className="text-4xl drop-shadow-2xl filter brightness-110">📱</span>
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
                              <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-orange-600 blur-lg opacity-50"></div>
                              <div className="relative font-black text-sm whitespace-nowrap bg-gradient-to-r from-orange-300 to-orange-500 bg-clip-text text-transparent">
                                R$ {prize.value >= 100000 
                                  ? <>100.000<span className="text-xs">,00</span></>
                                  : prize.value >= 10000
                                  ? <>{(prize.value / 1000).toFixed(0)}.000<span className="text-xs">,00</span></>
                                  : prize.value >= 1000
                                  ? <>{prize.value.toLocaleString('pt-BR')}<span className="text-xs">,00</span></>
                                  : prize.value >= 1 && prize.value !== 0.5
                                  ? <>{prize.value.toLocaleString('pt-BR')}<span className="text-xs">,00</span></>
                                  : prize.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                          className="flex items-center gap-1 text-orange-400/60 hover:text-orange-400 cursor-pointer bg-gray-900/80 md:bg-gray-800/90 backdrop-blur-sm rounded-full p-2 md:p-3 border border-gray-700/50 hover:border-orange-400/50 transition-all"
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
                          className="flex items-center gap-1 text-orange-400/60 hover:text-orange-400 cursor-pointer bg-gray-900/80 md:bg-gray-800/90 backdrop-blur-sm rounded-full p-2 md:p-3 border border-gray-700/50 hover:border-orange-400/50 transition-all"
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
                              ? '#fb923c' 
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
            <div className="bg-gray-900/50 rounded-2xl p-4 backdrop-blur-sm">
              <h3 className="text-white font-bold text-lg mb-4 text-center">
                Como Jogar
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">1</span>
                  </div>
                  <p className="text-gray-300">Escolha o <span className="text-orange-400 font-semibold">multiplicador</span> (1x, 5x ou 10x) para aumentar seus ganhos</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">2</span>
                  </div>
                  <p className="text-gray-300">Compre a raspadinha e raspe os 9 quadrados para revelar os prêmios</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">3</span>
                  </div>
                  <p className="text-gray-300">Se encontrar 3 prêmios iguais, você ganha!</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">4</span>
                  </div>
                  <p className="text-gray-300">O valor do prêmio é <span className="text-orange-400 font-semibold">multiplicado</span> e convertido em saldo real</p>
                </div>
              </div>
            </div>

            {/* Game Feed */}
            <GameFeed gameName="Eletrônicos" gameColor="orange" />
          </div>
        </div>
      </div>
      
      {/* Win Modal */}
      <WinModal
        isOpen={showWinModal}
        onClose={() => setShowWinModal(false)}
        prizeImage={getPrizeInfo(prizeValue || prize.toString()).path}
        prizeName={getPrizeInfo(prizeValue || prize.toString()).name}
        prizeValue={prize}
        onPlayAgain={handlePlayAgain}
      />
      
      {/* Lose Modal */}
      <LoseModal
        isOpen={showLoseModal}
        onClose={() => setShowLoseModal(false)}
        onPlayAgain={handlePlayAgain}
      />
      
      {/* Prize Modal */}
      {selectedPrize && (
        <PrizeModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          image={selectedPrize.image}
          name={selectedPrize.name}
          value={selectedPrize.value}
          gameTheme="orange"
        />
      )}
      {/* Multiplier Info Modal */}
      <MultiplierInfoModal
        isOpen={showMultiplierInfo}
        onClose={() => setShowMultiplierInfo(false)}
        gameType="eletronicos"
        gameCost={1}
        themeColor="from-orange-500 to-orange-600"
      />
      {/* Login Required Modal */}
      <LoginRequiredModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
      {/* Info Modal */}
      <AnimatePresence>
        {showInfoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowInfoModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative w-full max-w-sm bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl p-6 shadow-2xl border border-gray-700/50"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setShowInfoModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>

              {/* Title */}
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-orange-400 mb-2">Como Jogar</h3>
                <p className="text-gray-400 text-sm">Eletrônicos</p>
              </div>

              {/* Steps */}
              <div className="space-y-4">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-orange-400 font-bold text-sm">1</span>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">Escolha o Multiplicador</h4>
                    <p className="text-gray-400 text-sm">Selecione 1x, 5x ou 10x para aumentar seus ganhos</p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-orange-400 font-bold text-sm">2</span>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">Compre a Raspadinha</h4>
                    <p className="text-gray-400 text-sm">Clique em "Raspar" ou use o "Bônus" se disponível</p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-orange-400 font-bold text-sm">3</span>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">Raspe os 9 Campos</h4>
                    <p className="text-gray-400 text-sm">Clique e arraste para revelar os prêmios ocultos</p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-orange-400 font-bold text-sm">4</span>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">Ganhe Prêmios!</h4>
                    <p className="text-gray-400 text-sm">Encontre 3 prêmios iguais em qualquer direção para ganhar</p>
                  </div>
                </motion.div>
              </div>

              {/* Tips */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-6 p-4 bg-orange-500/10 rounded-2xl border border-orange-500/20"
              >
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-orange-400 font-semibold mb-1">Dica de Ouro</p>
                    <p className="text-xs text-gray-400">
                      Eletrônicos incríveis esperam por você! iPhones, Smart TVs e muito mais!
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Play button */}
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                onClick={() => setShowInfoModal(false)}
                className="mt-6 w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-xl transition-all transform hover:scale-105"
              >
                Entendi, vamos jogar!
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Insufficient Funds Modal */}
      <InsufficientFundsModal
        isOpen={showInsufficientFundsModal}
        onClose={() => setShowInsufficientFundsModal(false)}
        type={insufficientFundsType}
        requiredAmount={insufficientFundsType === "balance" ? 1 * multiplier : 1 * multiplier}
        currentAmount={insufficientFundsType === "balance" ? parseFloat((balanceData as any)?.balance || "0") : ((balanceData as any)?.scratchBonus || 0)}
      />

    </MobileLayout>
  );
}
