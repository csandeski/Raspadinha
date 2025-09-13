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

import { ArrowLeft, Gift, Sparkles, Star, Eye, Info, ShoppingCart, X, ChevronLeft, ChevronRight } from "lucide-react";
import { PrizeModal } from "@/components/PrizeModal";
import { Confetti } from "@/components/confetti";
import { MultiplierInfoModal } from "@/components/multiplier-info-modal";
import { LoginRequiredModal } from "@/components/login-required-modal";
import { InsufficientFundsModal } from "@/components/insufficient-funds-modal";
import { WinModal } from "@/components/win-modal";
import { LoseModal } from "@/components/lose-modal";



import { gameEvents } from "@/lib/game-events";
import { balanceTracker } from "@/lib/balance-tracker";

// Money images now use .webp format with numeric naming

// Prize value to image mapping (new .webp format)
const getPrizeImage = (value: string): string => {
  // Handle numeric values - convert to .webp path
  const prizeValue = parseFloat(value);
  if (!isNaN(prizeValue)) {
    // Convert to the simple filename format (0.5, 1, 2, 3, etc.)
    const filename = prizeValue === 0.5 ? "0.5" : prizeValue.toString();
    return `/premios/pix/${filename}.webp`;
  }
  
  // Fallback for text-based values - return generic path
  return `/premios/pix/1.webp`;
};

const getRarity = (value: string): string => {
  return "common";
};

const getRarityBadge = (value: string): string | null => {
  return null;
};

export default function GamePremioPIX() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const [gameId, setGameId] = useState<string | null>(null);
  const [values, setValues] = useState<string[]>([]);
  const [revealed, setRevealed] = useState<boolean[]>(new Array(9).fill(false));
  const [scratchProgress, setScratchProgress] = useState<number[]>(
    new Array(9).fill(0),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [restoringState, setRestoringState] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [won, setWon] = useState(false);
  const [prize, setPrize] = useState(0);
  const [prizeValue, setPrizeValue] = useState("");
  const [multiplier, setMultiplier] = useState<1 | 5 | 10>(1);
  const [freePlays, setFreePlays] = useState(0);
  const [hasStartedScratching, setHasStartedScratching] = useState(false);
  const [allCardsRevealed, setAllCardsRevealed] = useState(false);
  const [resultReady, setResultReady] = useState(false);
  const [hideOverlay, setHideOverlay] = useState(false);
  const [winningIndices, setWinningIndices] = useState<number[]>([]);
  const [isWelcomeUser, setIsWelcomeUser] = useState(false);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [isGlobalDragging, setIsGlobalDragging] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState<number | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showInsufficientFundsModal, setShowInsufficientFundsModal] = useState(false);
  const [insufficientFundsType, setInsufficientFundsType] = useState<"balance" | "bonus">("balance");
  const [showWinModal, setShowWinModal] = useState(false);
  const [showLoseModal, setShowLoseModal] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const balanceChangeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const bonusChangeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [balanceChange, setBalanceChange] = useState<{ amount: number; isBonus: boolean } | null>(null);
  const [bonusChange, setBonusChange] = useState<number | null>(null);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      const progress = (scrollLeft / (scrollWidth - clientWidth)) * 100;
      setScrollProgress(Math.min(100, Math.max(0, progress)));
    }
  };

  const { toast } = useToast();
  
  // Preload all prize images on component mount
  useEffect(() => {
    const preloadImages = () => {
      const imagePaths = [
        "/premios/pix/0.5.webp", "/premios/pix/1.webp", "/premios/pix/2.webp",
        "/premios/pix/3.webp", "/premios/pix/4.webp", "/premios/pix/5.webp",
        "/premios/pix/10.webp", "/premios/pix/15.webp", "/premios/pix/20.webp",
        "/premios/pix/50.webp", "/premios/pix/100.webp", "/premios/pix/200.webp",
        "/premios/pix/500.webp", "/premios/pix/1000.webp", "/premios/pix/2000.webp",
        "/premios/pix/5000.webp", "/premios/pix/10000.webp", "/premios/pix/100000.webp"
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
    { value: 100000, path: "/premios/pix/100000.webp", name: "100 mil reais" },
    { value: 10000, path: "/premios/pix/10000.webp", name: "10 mil reais" },
    { value: 5000, path: "/premios/pix/5000.webp", name: "5 mil reais" },
    { value: 2000, path: "/premios/pix/2000.webp", name: "2 mil reais" },
    { value: 1000, path: "/premios/pix/1000.webp", name: "1 mil reais" },
    { value: 500, path: "/premios/pix/500.webp", name: "500 reais" },
    { value: 200, path: "/premios/pix/200.webp", name: "200 reais" },
    { value: 100, path: "/premios/pix/100.webp", name: "100 reais" },
    { value: 50, path: "/premios/pix/50.webp", name: "50 reais" },
    { value: 20, path: "/premios/pix/20.webp", name: "20 reais" },
    { value: 15, path: "/premios/pix/15.webp", name: "15 reais" },
    { value: 10, path: "/premios/pix/10.webp", name: "10 reais" },
    { value: 5, path: "/premios/pix/5.webp", name: "5 reais" },
    { value: 4, path: "/premios/pix/4.webp", name: "4 reais" },
    { value: 3, path: "/premios/pix/3.webp", name: "3 reais" },
    { value: 2, path: "/premios/pix/2.webp", name: "2 reais" },
    { value: 1, path: "/premios/pix/1.webp", name: "1 real" },
    { value: 0.5, path: "/premios/pix/0.5.webp", name: "50 centavos" }
  ];
  
  // Audio refs
  const processingRef = useRef<boolean>(false);

  // Function to get prize name by value
  const getPrizeName = (value: string): string => {
    const numValue = parseFloat(value);
    const prizeInfo = prizeData.find(p => p.value === numValue);
    return prizeInfo?.name || `${numValue} reais`;
  };

  // Prize data
  const prizes = [
    { value: 0.5, image: getPrizeImage("0.5") },
    { value: 1, image: getPrizeImage("1") },
    { value: 2, image: getPrizeImage("2") },
    { value: 3, image: getPrizeImage("3") },
    { value: 4, image: getPrizeImage("4") },
    { value: 5, image: getPrizeImage("5") },
    { value: 10, image: getPrizeImage("10") },
    { value: 15, image: getPrizeImage("15") },
    { value: 20, image: getPrizeImage("20") },
    { value: 50, image: getPrizeImage("50") },
    { value: 100, image: getPrizeImage("100") },
    { value: 200, image: getPrizeImage("200") },
    { value: 500, image: getPrizeImage("500") },
    { value: 1000, image: getPrizeImage("1000") },
    { value: 2000, image: getPrizeImage("2000") },
    { value: 5000, image: getPrizeImage("5000") },
    { value: 10000, image: getPrizeImage("10000") },
    { value: 100000, image: getPrizeImage("100000") }
  ];

  // Check for free plays from URL params and localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const freePlaysParam = params.get("freePlays");
    const welcomeParam = params.get("welcome");
    
    if (welcomeParam === "true") {
      setIsWelcomeUser(true);
      // Check localStorage for free plays
      const storedFreePlays = localStorage.getItem('freePlaysAvailable');
      if (storedFreePlays) {
        setFreePlays(parseInt(storedFreePlays) || 0);
      }
    } else if (freePlaysParam) {
      setFreePlays(parseInt(freePlaysParam) || 0);
    }
  }, [location]);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPrize, setSelectedPrize] = useState<{
    image: string;
    name: string;
    value: string;
  } | null>(null);
  const [showMultiplierInfo, setShowMultiplierInfo] = useState(false);

  // Query for user balance (only if user is logged in)
  const { data: balanceData, refetch: balanceRefetch } = useQuery<{
    balance: string;
    scratchBonus: number;
  }>({
    queryKey: ["/api/user/balance"],
    refetchInterval: 30000, // Refresh every 30 seconds
    enabled: !!user, // Only query if user is logged in
  });
  
  // Track balance changes
  useEffect(() => {
    if (balanceData && user) {
      const newBalance = parseFloat(balanceData.balance);
      const newScratchBonus = balanceData.scratchBonus;
      
      // Check for balance changes
      const storedBalance = localStorage.getItem('lastBalance');
      const storedBonus = localStorage.getItem('lastScratchBonus');
      
      if (storedBalance && storedBonus) {
        const lastBalance = parseFloat(storedBalance);
        const lastBonus = parseInt(storedBonus);
        
        // Real money balance change
        if (newBalance !== lastBalance) {
          const change = newBalance - lastBalance;
          
          // Cancel previous timer if exists
          if (balanceChangeTimerRef.current) {
            clearTimeout(balanceChangeTimerRef.current);
          }
          
          setBalanceChange({ amount: change, isBonus: false });
          
          // Set new timer
          balanceChangeTimerRef.current = setTimeout(() => {
            setBalanceChange(null);
            balanceChangeTimerRef.current = null;
          }, 3000);
        }
        
        // Scratch bonus change
        if (newScratchBonus !== lastBonus) {
          const change = newScratchBonus - lastBonus;
          
          // Cancel previous timer if exists
          if (bonusChangeTimerRef.current) {
            clearTimeout(bonusChangeTimerRef.current);
          }
          
          setBonusChange(change);
          
          // Set new timer
          bonusChangeTimerRef.current = setTimeout(() => {
            setBonusChange(null);
            bonusChangeTimerRef.current = null;
          }, 3000);
        }
      }
      
      // Update stored values
      localStorage.setItem('lastBalance', newBalance.toString());
      localStorage.setItem('lastScratchBonus', newScratchBonus.toString());
    }
  }, [balanceData, user]);

  // Check for existing game state on mount (only if user is logged in)
  const { data: savedSession, isLoading: isLoadingSession } = useQuery({
    queryKey: ["/api/games/restore-state/premio-pix"],
    enabled: !gameStarted && !!user, // Only query if user is logged in
    retry: false,
  });

  // Scroll to top when entering the page
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Initialize audio elements with iOS/Android compatibility

  


  // Save game state whenever it changes
  useEffect(() => {
    if (gameStarted && gameId && !restoringState && !gameComplete) {
      const gameState = {
        gameId,
        values,
        revealed,
        scratchProgress,
        hasStartedScratching,
        allCardsRevealed,
      };

      apiRequest("/api/games/save-state", "POST", {
        gameType: "premio-pix",
        gameId,
        gameState,
      }).catch((error) => {
        console.error("Failed to save game state:", error);
      });
    }
  }, [gameStarted, gameId, values, revealed, restoringState, gameComplete]);

  // Restore game state if exists
  useEffect(() => {
    if (savedSession && (savedSession as any).gameState && !gameComplete) {
      setRestoringState(true);
      const { gameState } = savedSession as any;

      if (
        gameState.gameId &&
        gameState.values &&
        gameState.values.length === 9
      ) {
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
    if (!user && !isWelcomeUser && !useScratchBonus) {
      // Show login modal for non-authenticated users
      setShowLoginModal(true);
      return;
    }

    // Check if non-authenticated user has no scratch bonus
    if (!user && (balanceData?.scratchBonus || 0) === 0 && useScratchBonus) {
      setLocation(getPathWithRef('/register'));
      return;
    }

    // Check for insufficient funds when trying to play
    if (user && balanceData) {
      const gameCost = 1 * multiplier; // PIX game costs R$1 × multiplier
      
      if (useScratchBonus) {
        // Check scratch bonus
        const bonusCount = balanceData.scratchBonus || 0;
        const requiredBonus = gameCost;
        
        if (bonusCount < requiredBonus) {
          setInsufficientFundsType("bonus");
          setShowInsufficientFundsModal(true);
          return;
        }
      } else {
        // Check real balance
        const realBalance = parseFloat(balanceData.balance || "0");
        
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
      await apiRequest("/api/games/clear-game-type/premio-pix", "DELETE").catch(
        () => {},
      );

      const response = await apiRequest(
        "/api/games/premio-pix/create",
        "POST",
        {
          multiplier,
          useBonus: useScratchBonus,
          isWelcomeUser: isWelcomeUser && !user, // Flag for non-authenticated welcome users
        },
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
          content_name: 'Raspadinha PIX',
          content_category: 'raspadinha',
          content_type: 'game',
          value: 1 * multiplier,
          currency: 'BRL',
          content_ids: ['premio-pix']
        });
      }

      // Force immediate updates
      if (user) {
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
      }
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

  const [isRevealing, setIsRevealing] = useState(false);
  const [isCheckingResult, setIsCheckingResult] = useState(false);

  const handleReveal = async (index: number) => {
    if (!gameStarted || revealed[index] || gameComplete || isCheckingResult || processingRef.current)
      return;


    
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
    const allRevealed = newRevealed.every((r) => r);
    if (allRevealed && !isCheckingResult && !processingRef.current) {
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
        `/api/games/premio-pix/${currentGameId}/reveal`,
        "POST",
      );

      setWon(response.won);
      setPrize(response.prize);
      setPrizeValue(response.prizeValue || response.prize.toString());
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
        if (multiplier === 1) {
          balanceTracker.addLocalBalanceChange(response.prize);
        } else {
          balanceTracker.addLocalBalanceChange(response.prize);
        }
        
        // Re-enable global tracking after a longer delay to prevent duplicates
        setTimeout(() => {
          balanceTracker.setLocalChangeProcessing(false);
        }, 1000); // Increased from 100ms to 1000ms
      }

      // Emit game event for live feed after result is determined
      gameEvents.emitGamePlay({
        name: user ? user.name : "Visitante",
        game: "Raspadinha PIX",
        bet: 1 * multiplier,
        isReal: true,
        level: 0
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
        apiRequest(`/api/games/clear-state/${currentGameId}`, "DELETE").catch(
          () => {},
        );
        // Also clear any premio-pix sessions to prevent "game in progress" bug
        apiRequest(`/api/games/clear-game-type/premio-pix`, "DELETE").catch(
          () => {},
        );
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
    // Check if non-authenticated user has no more free plays
    if (!user && freePlays <= 0) {
      (window as any).openAuthModal('register');
      return;
    }
    
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
    if (!value || value === "") return "🎁";
    const num = parseInt(value);
    if (num >= 1000) return `R$${num / 1000}k`;
    return `R$${num}`;
  };

  const getPrizeInfo = (value: string) => {
    if (!value || value === "") return { icon: "🎁", name: "" };

    // Handle text-based PIX prizes directly
    if (value.includes("Pix R$")) {
      return { icon: "💵", name: value };
    }

    // Map numeric values to proper names
    const nameMap: Record<string, string> = {
      "0.5": "0.50 centavos",
      "1": "1 real",
      "2": "2 reais",
      "3": "3 reais",
      "4": "4 reais",
      "5": "5 reais",
      "10": "10 reais",
      "15": "15 reais",
      "20": "20 reais",
      "50": "50 reais",
      "100": "100 reais",
      "200": "200 reais",
      "500": "500 reais",
      "1000": "1000 reais",
      "2000": "2000 reais",
      "5000": "5000 reais",
      "10000": "10000 reais",
      "100000": "100000 reais"
    };

    return { icon: "💵", name: nameMap[value] || `${value} reais` };
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
              <h1 className="text-2xl md:text-4xl font-bold text-blue-400 mt-[-5px] mb-[-5px]">Pix na Conta</h1>
              <p className="text-gray-400 text-sm md:text-base mt-1">
                Raspou, achou 3 iguais, <span className="text-blue-400 font-bold">Ganhou!</span>
              </p>
              {freePlays > 0 && (
                <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 bg-gray-800/50 rounded-full border border-gray-700">
                  <span className="text-blue-400">🎁</span>
                  <span className="text-blue-400 font-bold text-sm md:text-base">{freePlays} jogadas grátis</span>
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
                    <Eye className={`w-5 h-5 ${hideOverlay ? "text-blue-400" : "text-white"}`} />
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
                            className={`text-2xl font-bold mb-2 ${won ? "text-blue-400" : "text-red-400"}`}
                          >
                            {won ? "Parabéns!" : "Não foi desta vez"}
                          </h2>
                          {won ? (
                            <>
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{
                                  type: "spring",
                                  stiffness: 260,
                                  damping: 20,
                                  delay: 0.3,
                                }}
                                className="mb-3"
                              >
                                <img
                                  src={getPrizeImage(prizeValue || prize.toString())}
                                  alt={prizeValue || `R$ ${prize}`}
                                  className="w-32 h-32 mx-auto object-contain drop-shadow-2xl animate-float"
                                />
                              </motion.div>
                              <div className="mb-2">
                                <p className="text-xl font-bold text-white">
                                  {getPrizeName(prizeValue || prize.toString())}
                                </p>
                              </div>
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
                                <p className="text-3xl font-bold text-blue-400 mb-2 animate-pulse">
                                  R$ {prize.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                              )}
                              <p className="text-gray-300 text-sm">
                                {prize > 0 ? "Prêmio adicionado ao saldo!" : "Prêmio conquistado!"}
                              </p>
                            </>
                          ) : (
                            <>
                              {/* Lose animation container */}
                              <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                                className="relative"
                              >
                                {/* Background glow effect */}
                                <motion.div
                                  className="absolute inset-0 -m-12"
                                  animate={{
                                    background: [
                                      "radial-gradient(circle at center, rgba(239, 68, 68, 0.1) 0%, transparent 70%)",
                                      "radial-gradient(circle at center, rgba(239, 68, 68, 0.2) 0%, transparent 60%)",
                                      "radial-gradient(circle at center, rgba(239, 68, 68, 0.1) 0%, transparent 70%)"
                                    ]
                                  }}
                                  transition={{
                                    duration: 3,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                  }}
                                />
                                
                                {/* X icon with animation */}
                                <motion.div
                                  initial={{ scale: 0, rotate: -180 }}
                                  animate={{ scale: 1, rotate: 0 }}
                                  transition={{ 
                                    type: "spring",
                                    stiffness: 200,
                                    damping: 15,
                                    delay: 0.2
                                  }}
                                  className="mb-4 mx-auto w-16 h-16 relative"
                                >
                                  {/* Outer circle with gradient */}
                                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-red-500/20 to-red-600/20 backdrop-blur-sm" />
                                  
                                  {/* Inner X mark */}
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <motion.div
                                      animate={{
                                        scale: [1, 1.1, 1],
                                      }}
                                      transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                      }}
                                      className="relative"
                                    >
                                      <X className="w-8 h-8 text-red-400" strokeWidth={3} />
                                    </motion.div>
                                  </div>
                                  
                                  {/* Subtle ring animation */}
                                  <motion.div
                                    className="absolute inset-0 rounded-full border-2 border-red-400/30"
                                    animate={{
                                      scale: [1, 1.2, 1],
                                      opacity: [0.5, 0, 0.5]
                                    }}
                                    transition={{
                                      duration: 2,
                                      repeat: Infinity,
                                      ease: "easeInOut"
                                    }}
                                  />
                                </motion.div>
                                
                                {/* Text content with gradient */}
                                <div className="text-center space-y-3">
                                  <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                    className="text-lg font-medium text-gray-200"
                                  >
                                    Tente novamente
                                  </motion.p>
                                  
                                  <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.4 }}
                                    className="px-4 py-1.5 bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-full inline-block backdrop-blur-sm border border-red-400/20"
                                  >
                                    <p className="text-xs text-gray-300">
                                      A sorte está ao seu lado
                                    </p>
                                  </motion.div>
                                </div>
                              </motion.div>
                            </>
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
                      <div className="absolute inset-0 grid grid-cols-3 gap-3 p-4 blur-sm">
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
                            <div className="relative overflow-hidden rounded-[30px] p-1 bg-gradient-to-br from-blue-500/20 via-transparent to-blue-500/20">
                              <div className="relative bg-black/80 backdrop-blur-2xl rounded-[26px] p-4 sm:p-8 border border-white/5">
                                {/* Animated Background Pattern */}
                                <div className="absolute inset-0 opacity-10">
                                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(59,130,246,0.2)_0%,transparent_50%)]" />
                                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_50%,rgba(59,130,246,0.2)_0%,transparent_50%)]" />
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
                                <div className="mt-4 flex gap-2 w-full">
                                  {/* Buy Button - Larger */}
                                  <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={gameComplete && resultReady ? handlePlayAgain : (!gameStarted ? () => startGame(false) : undefined)}
                                    disabled={
                                      isLoading ||
                                      isLoadingSession
                                    }
                                    className="flex-[2] bg-gradient-to-r from-blue-500 to-blue-400 hover:from-blue-400 hover:to-blue-300 text-white px-4 py-3 md:px-6 md:py-4 rounded-xl font-bold transition-all hover:shadow-xl text-sm md:text-base relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
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
                                      disabled={
                                        isLoading ||
                                        isLoadingSession
                                      }
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

                {/* Raspadinhas Grid with enhanced effects */}
                <div 
                  ref={gameContainerRef}
                  className="grid grid-cols-3 gap-3 md:gap-4 relative"
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
                        className={`relative w-full h-24 md:h-36 min-h-[96px] md:min-h-[144px] rounded-2xl overflow-hidden`}
                      >
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
                            <div className="absolute inset-0 rounded-2xl border-4 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.5)]" />
                            <div className="absolute -inset-1 rounded-2xl border-2 border-blue-400/30 animate-pulse" />
                          </motion.div>
                        )}

                        
                        {gameStarted ? (
                          <ProScratchCard
                            value={
                              <div className="w-full h-full relative overflow-hidden rounded-xl">
                                {value !== "" ? (
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
                                      src={getPrizeImage(value)}
                                      alt={`R$ ${value}`}
                                      className="w-10 h-10 md:w-16 md:h-16 object-contain mb-1 relative z-10"
                                      draggable={false}
                                      loading="eager"
                                    />
                                    
                                    {/* Prize name */}
                                    <p className="text-white text-[10px] md:text-sm font-bold text-center px-1 w-full relative z-10 uppercase">
                                      {getPrizeName(value)}
                                    </p>
                                  </motion.div>
                                ) : (
                                  /* Non-prize square - matching gray design */
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
                                )}
                              </div>
                            }
                            index={index}
                            onReveal={() => handleReveal(index)}
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
                            isDisabled={
                              !gameStarted || revealed[index] || gameComplete
                            }
                            revealed={revealed[index]}
                            allRevealed={allCardsRevealed}
                          />
                        ) : (
                          /* Empty card when game hasn't started */
                          <div className="w-full h-full bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800 rounded-xl flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-gray-500/30 flex items-center justify-center">
                              <span className="text-2xl opacity-20">?</span>
                            </div>
                          </div>
                        )}
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
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 -mt-[1px] rounded-b-3xl transition-all hover:shadow-lg overflow-hidden border-l border-r border-b border-gray-700/30"
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
            <div className="bg-gray-900/50 rounded-2xl p-4 backdrop-blur-sm">
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
                  <p className="text-gray-300">Compre a raspadinha e raspe os 9 quadrados para revelar os prêmios</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">3</span>
                  </div>
                  <p className="text-gray-300">Se encontrar 3 prêmios iguais, você ganha!</p>
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
            <GameFeed gameName="Pix na Conta" gameColor="blue" />
          </div>
        </div>
      </div>
      
      {/* Win Modal */}
      <WinModal
        isOpen={showWinModal}
        onClose={() => setShowWinModal(false)}
        prizeImage={getPrizeImage(prizeValue || prize.toString())}
        prizeName={getPrizeName(prizeValue || prize.toString())}
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
          gameTheme="blue"
        />
      )}
      {/* Multiplier Info Modal */}
      <MultiplierInfoModal
        isOpen={showMultiplierInfo}
        onClose={() => setShowMultiplierInfo(false)}
        gameType="pix"
        gameCost={1}
        themeColor="from-blue-500 to-blue-600"
      />
      {/* Login Required Modal */}
      <LoginRequiredModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
      {/* Insufficient Funds Modal */}
      <InsufficientFundsModal
        isOpen={showInsufficientFundsModal}
        onClose={() => setShowInsufficientFundsModal(false)}
        type={insufficientFundsType}
        requiredAmount={insufficientFundsType === "balance" ? 1 * multiplier : 1 * multiplier}
        currentAmount={insufficientFundsType === "balance" ? parseFloat(balanceData?.balance || "0") : (balanceData?.scratchBonus || 0)}
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
                <h3 className="text-2xl font-bold text-blue-400 mb-2">Como Jogar</h3>
                <p className="text-gray-400 text-sm">Pix na Conta</p>
              </div>

              {/* Steps */}
              <div className="space-y-4">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-400 font-bold text-sm">1</span>
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
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-400 font-bold text-sm">2</span>
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
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-400 font-bold text-sm">3</span>
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
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-400 font-bold text-sm">4</span>
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
                className="mt-6 p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20"
              >
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-400 font-semibold mb-1">Dica de Ouro</p>
                    <p className="text-xs text-gray-400">
                      Multiplicadores maiores aumentam o valor dos prêmios mas custam mais!
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
                className="mt-6 w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-xl transition-all transform hover:scale-105"
              >
                Entendi, vamos jogar!
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </MobileLayout>
  );
}
