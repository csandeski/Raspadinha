import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { MobileLayout } from "@/components/mobile-layout";
import { OptimizedImage, usePreloadImages } from "@/components/optimized-image";
import { LoginRequiredModal } from "@/components/login-required-modal";
import {
  Sparkles,
  AlertTriangle,
  Trophy,
  Info,
  Loader2,
  Gem,
  DollarSign,
  Zap,
  Star,
  Heart,
  Crown,
  Coins,
  Lock,
  Unlock,
  Wallet,
  Ticket,
  TreePine,
  Leaf,
  Minus,
  Plus,
  ChevronLeft,
  ArrowLeft,
} from "lucide-react";

// Import images
import forestBg from "/premios/jogo-esquilo/forest-bg.png";
import chestGrid from "/premios/jogo-esquilo/chest-grid.webp";
import chainLock from "/premios/jogo-esquilo/chain-lock.webp";
import apostaImg from "/premios/jogo-esquilo/bet-label.webp";
import ganhoImg from "/premios/jogo-esquilo/win-label.webp";
import comprarBonusImg from "@/assets/comprar-bonus.png";
import playButtonImg from "/premios/jogo-esquilo/play-button.webp";
import combinedBgImg from "/premios/jogo-esquilo/combined-bg.webp";
import buttonClickSound from "/premios/jogo-esquilo/button-click.mp3";

// Chest images
import chestClosedImg from "/premios/jogo-esquilo/chest-closed.png";
import chestOpenImg from "/premios/jogo-esquilo/chest-open.png";

// Sound effects
import chestOpenSound from "/premios/jogo-esquilo/chest-open.mp3";
import prizeSound from "/premios/jogo-esquilo/prize-win.wav";
import foxSound from "/premios/jogo-esquilo/fox-sound.mp3";
import collectSound from "/premios/jogo-esquilo/collect-sound.mp3";
import bonusChestSound from "/premios/jogo-esquilo/bonus-chest-sound.mp3";

// Prize images
import acornImg from "/premios/jogo-esquilo/acorn.png";
import appleImg from "/premios/jogo-esquilo/apple.png";
import goldenAcornImg from "/premios/jogo-esquilo/golden-acorn.png";
import pineconeImg from "/premios/jogo-esquilo/pinecone.png";
import ringImg from "/premios/jogo-esquilo/ring.png";

// Fox image
import foxImg from "/premios/jogo-esquilo/fox.png";

// Collect button images
import collectChestImg from "/premios/jogo-esquilo/collect-chest.png";
import collectTextImg from "/premios/jogo-esquilo/collect-text.png";

// Sensacional image
import sensacionalImg from "/premios/jogo-esquilo/sensacional.png";

// Small button background
import smallButtonBg from "/premios/jogo-esquilo/small-button-bg.webp";

// Bonus frame image
import bonusFrameImg from "/premios/jogo-esquilo/bonus-frame.png";

// Bonus mode assets
import bonusChestGrid from "/premios/jogo-esquilo/bonus-chest-grid.webp";
import bonusMusic from "/premios/jogo-esquilo/bonus-music.mp3";
import esquiloBonusBanner from "/premios/jogo-esquilo/esquilo-bonus-banner.png";

// Utility function to format currency in Brazilian format
const formatBRL = (value: number): string => {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Function to get appropriate font size based on value length
const getFontSize = (value: string): string => {
  const length = value.length;
  if (length > 10) return "text-xs";
  if (length > 8) return "text-sm";
  if (length > 6) return "text-base";
  return "text-lg";
};

interface GameState {
  gameId: string | null;
  betAmount: number;
  currentWinnings: number;
  gameStatus: "initial" | "playing" | "gameover" | "cashout" | "bonus";
  isActive: boolean;
  openedBoxes: Set<number>;
  boxContents: BoxContent[];
  useBonus: boolean;
  bonusMode?: boolean;
  bonusMultipliers?: number[];
  bonusSelected?: number;
  bonusPurchased?: boolean;
  initialBalanceType?: boolean; // Store the initial balance type before bonus
}

interface BoxContent {
  id: number;
  type:
    | "prize"
    | "fox"
    | "empty"
    | "pinecone"
    | "acorn"
    | "apple"
    | "ring"
    | "goldenacorn";
  multiplier?: number;
  value?: number;
  isRevealed: boolean;
  isOpening?: boolean;
  hasBonus?: boolean;
}

// All critical images to preload
const imageUrls = [
  forestBg,
  chestGrid,
  chainLock,
  apostaImg,
  ganhoImg,
  comprarBonusImg,
  playButtonImg,
  combinedBgImg,
  chestClosedImg,
  chestOpenImg,
  acornImg,
  appleImg,
  goldenAcornImg,
  pineconeImg,
  ringImg,
  foxImg,
  collectChestImg,
  collectTextImg,
  sensacionalImg,
  smallButtonBg,
  bonusFrameImg,
  bonusChestGrid,
  esquiloBonusBanner,
];

// Preload all audio files to avoid delays
const audioUrls = [
  buttonClickSound,
  chestOpenSound,
  prizeSound,
  foxSound,
  collectSound,
  bonusChestSound,
  bonusMusic,
];

// Function to preload audio
const preloadAudio = (urls: string[]) => {
  urls.forEach((url) => {
    const audio = new Audio();
    audio.src = url;
    audio.load();
  });
};

export default function JogoEsquilo() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Preload all critical images
  const imagesLoaded = usePreloadImages(imageUrls);

  const betValues = [1, 3, 5, 10, 20, 50, 100, 200, 500];

  // Get saved bet amount from localStorage
  const getSavedBetAmount = () => {
    const saved = localStorage.getItem("esquilo-last-bet");
    if (saved) {
      const amount = parseInt(saved);
      if (betValues.includes(amount)) {
        return amount;
      }
    }
    return 1; // Default if nothing saved
  };

  // All hooks must be declared before any conditional returns
  const [resourcesLoaded, setResourcesLoaded] = useState(false);
  const [gameState, setGameState] = useState<GameState>({
    gameId: null,
    betAmount: getSavedBetAmount(),
    currentWinnings: 0,
    gameStatus: "initial",
    isActive: false,
    openedBoxes: new Set(),
    boxContents: Array.from({ length: 9 }, (_, i) => ({
      id: i,
      type: "empty" as const,
      isRevealed: false,
    })),
    useBonus: false, // Default to real balance
  });

  const [isLoading, setIsLoading] = useState(false);
  const [selectedBox, setSelectedBox] = useState<number | null>(null);
  const [showGameOver, setShowGameOver] = useState(false);
  const [isRevealingAllBoxes, setIsRevealingAllBoxes] = useState(false);
  const [isShowingChainReturn, setIsShowingChainReturn] = useState(false);
  const [showCashOut, setShowCashOut] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showBonusMode, setShowBonusMode] = useState(false);
  const [bonusChests, setBonusChests] = useState<
    { multiplier: number; isRevealed: boolean; isOpening: boolean }[]
  >([]);
  const [selectedBonusChest, setSelectedBonusChest] = useState<number | null>(
    null,
  );
  const [bonusPrizeWon, setBonusPrizeWon] = useState<number>(0);
  const [isProcessingBonus, setIsProcessingBonus] = useState(false);
  const [activeBonusMultiplier, setActiveBonusMultiplier] = useState<
    number | null
  >(null);
  const bonusAudioRef = useRef<HTMLAudioElement | null>(null);
  const [showInsufficientBalance, setShowInsufficientBalance] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [showClickAnimation, setShowClickAnimation] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [flyingCoins, setFlyingCoins] = useState<
    { id: number; startX: number; startY: number; boxId?: number }[]
  >([]);
  const [animatingWinnings, setAnimatingWinnings] = useState(0);
  const [isAnimatingValue, setIsAnimatingValue] = useState(false);
  const [isProcessingBox, setIsProcessingBox] = useState(false);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [showChestTransition, setShowChestTransition] = useState<Set<number>>(
    new Set(),
  );
  const [showBuyBonusModal, setShowBuyBonusModal] = useState(false);
  const [buyBonusBetAmount, setBuyBonusBetAmount] = useState(1);
  const [isBuyingBonus, setIsBuyingBonus] = useState(false);
  const [bonusCostMultiplier, setBonusCostMultiplier] = useState(20);
  const [showFoxAnimation, setShowFoxAnimation] = useState(false);
  const [showBonusActivationAnimation, setShowBonusActivationAnimation] =
    useState(false);
  const [showMultiplierAnimation, setShowMultiplierAnimation] = useState(false);
  const [multiplierAnimationData, setMultiplierAnimationData] = useState<{
    value: number;
    multiplier: number;
    boxId: number;
  } | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSoundPlayedRef = useRef<{ [key: string]: number }>({});

  // Audio pool for better performance - multiple instances of each sound
  const audioPoolRef = useRef<{ [key: string]: HTMLAudioElement[] }>({});
  const audioPoolIndexRef = useRef<{ [key: string]: number }>({});

  // Fetch user balance only if authenticated
  const { data: userWallet } = useQuery<{
    balance: string;
    scratchBonus: number;
  }>({
    queryKey: ["/api/user/balance"],
    enabled: !!user, // Only fetch if user is logged in
  });

  // Fetch bonus configuration only if authenticated
  const { data: bonusConfig } = useQuery<{
    bonusCostMultiplier: number;
  }>({
    queryKey: ["/api/games/jogo-esquilo/config"],
    enabled: !!user, // Only fetch if user is logged in
  });

  // Update bonus cost multiplier when config is fetched
  useEffect(() => {
    if (bonusConfig) {
      setBonusCostMultiplier(bonusConfig.bonusCostMultiplier);
    }
  }, [bonusConfig]);

  // Optimized audio playing with pool system and debouncing
  const playSound = useCallback((soundUrl: string, volume: number = 0.2, minDelay: number = 50) => {
    try {
      // Debounce - prevent playing the same sound too frequently
      const now = Date.now();
      const lastPlayed = lastSoundPlayedRef.current[soundUrl] || 0;
      if (now - lastPlayed < minDelay) {
        return; // Skip if played too recently
      }
      lastSoundPlayedRef.current[soundUrl] = now;

      // Initialize pool for this sound if not exists
      if (!audioPoolRef.current[soundUrl]) {
        const poolSize = 2; // Reduced pool size for better performance
        audioPoolRef.current[soundUrl] = [];
        audioPoolIndexRef.current[soundUrl] = 0;
        
        for (let i = 0; i < poolSize; i++) {
          const audio = new Audio(soundUrl);
          audio.volume = volume;
          audio.preload = 'auto';
          audioPoolRef.current[soundUrl].push(audio);
        }
      }

      // Get next audio instance from pool (round-robin)
      const pool = audioPoolRef.current[soundUrl];
      const index = audioPoolIndexRef.current[soundUrl] || 0;
      const audio = pool[index];
      
      // Update index for next time
      audioPoolIndexRef.current[soundUrl] = (index + 1) % pool.length;

      // Stop any currently playing instance to avoid overlap
      if (!audio.paused) {
        audio.pause();
      }

      // Reset and play
      audio.currentTime = 0;
      audio.volume = volume;
      
      // Use promise-based play with proper error handling
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          // Only log if it's not an expected abort
          if (error.name !== 'AbortError') {
            console.log('Audio play failed:', error.message);
          }
        });
      }
    } catch (err) {
      console.log("Audio error:", err);
    }
  }, []);

  // Preload and initialize audio pools on mount
  useEffect(() => {
    // Initialize audio pools for frequently used sounds
    const criticalSounds = [
      chestOpenSound,
      prizeSound,
      collectSound,
      foxSound,
      bonusChestSound
    ];

    // Use requestIdleCallback for non-blocking audio preload
    const loadAudio = (sounds: string[]) => {
      sounds.forEach(soundUrl => {
        const poolSize = 2; // Reduced pool size
        audioPoolRef.current[soundUrl] = [];
        audioPoolIndexRef.current[soundUrl] = 0;
        
        for (let i = 0; i < poolSize; i++) {
          const audio = new Audio(soundUrl);
          audio.volume = 0.2;
          audio.preload = 'auto';
          // Don't force play, just preload
          audio.load();
          audioPoolRef.current[soundUrl].push(audio);
        }
      });
    };

    // Load audio when browser is idle
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => loadAudio(criticalSounds), { timeout: 1000 });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => loadAudio(criticalSounds), 100);
    }

    // Mark resources as loaded after a short delay
    const timer = setTimeout(() => {
      setResourcesLoaded(true);
    }, 500);

    return () => {
      clearTimeout(timer);
      // Clean up audio pools
      Object.values(audioPoolRef.current).forEach(pool => {
        pool.forEach(audio => {
          audio.pause();
          audio.src = '';
        });
      });
    };
  }, []);

  // Cleanup bonus audio when leaving the game
  useEffect(() => {
    return () => {
      // Stop and cleanup bonus audio when component unmounts
      if (bonusAudioRef.current) {
        bonusAudioRef.current.pause();
        bonusAudioRef.current.currentTime = 0;
        bonusAudioRef.current = null;
      }
    };
  }, []);

  // No longer redirect to login - allow viewing without authentication

  // Check for active game on mount only once
  const [hasCheckedActiveGame, setHasCheckedActiveGame] = useState(false);

  useEffect(() => {
    const checkActiveGame = async () => {
      // Only check once and only if user is logged in
      if (!user || hasCheckedActiveGame || gameState.isActive) return;

      setHasCheckedActiveGame(true);

      try {
        const response = await apiRequest(
          "/api/games/jogo-esquilo/active",
          "GET",
        );

        if (response.hasActiveGame) {
          // Restore game state
          const restoredBoxes = initializeBoxes();
          const openedBoxesSet = new Set<number>(response.openedBoxes || []);

          // Get active bonus multiplier for proper restoration
          const activeBonusMultiplier = response.activeBonusMultiplier || 1;

          // Restore box contents from backend
          if (response.boxes && Array.isArray(response.boxes)) {
            response.boxes.forEach((box: any, index: number) => {
              if (openedBoxesSet.has(index)) {
                // Box was opened, restore its state with the exact value saved
                // Don't apply bonus multiplier to already opened boxes - they already have final values
                const displayMultiplier = box.multiplier || 0;

                restoredBoxes[index] = {
                  id: index,
                  type: box.type,
                  multiplier: displayMultiplier,
                  value: displayMultiplier
                    ? response.betAmount * displayMultiplier
                    : 0,
                  isRevealed: true,
                  hasBonus: false, // Already opened boxes don't show bonus indicator
                };
              } else {
                // Box not opened yet
                restoredBoxes[index] = {
                  id: index,
                  type: box.type,
                  multiplier: box.multiplier,
                  value: box.multiplier
                    ? response.betAmount * box.multiplier
                    : 0,
                  isRevealed: false,
                };
              }
            });
          }

          // Check if we're in bonus mode
          const inBonusMode = response.bonusActivated && !response.bonusUsed;

          // Set active bonus multiplier if exists
          if (response.activeBonusMultiplier) {
            setActiveBonusMultiplier(response.activeBonusMultiplier);

            // Start bonus music for restored game with active bonus
            setTimeout(() => {
              if (!bonusAudioRef.current) {
                bonusAudioRef.current = new Audio(bonusMusic);
                bonusAudioRef.current.loop = true;
                bonusAudioRef.current.volume = 0.15; // Lower volume
                bonusAudioRef.current.preload = 'auto';
              }
              bonusAudioRef.current
                .play()
                .catch((err) =>
                  console.log("Failed to play bonus music on restore:", err),
                );
            }, 100); // Small delay to avoid blocking
          }

          // Restore bonus chests if in bonus mode
          if (inBonusMode && response.bonusMultipliers) {
            const bonusChestsData = response.bonusMultipliers.map(
              (mult: number) => ({
                multiplier: mult,
                isRevealed: false,
                isOpening: false,
              }),
            );
            setBonusChests(bonusChestsData);
            setShowBonusMode(true);
          }

          setGameState({
            gameId: response.gameId,
            betAmount: response.betAmount,
            currentWinnings: response.betAmount * response.currentMultiplier,
            gameStatus: inBonusMode ? "bonus" : "playing",
            isActive: true,
            openedBoxes: openedBoxesSet,
            boxContents: restoredBoxes,
            useBonus: response.usedBonus || false,
            bonusMultipliers: response.bonusMultipliers,
          });

          // Game restored silently
        }
      } catch (error) {
        console.error("Error checking active game:", error);
      }
    };

    checkActiveGame();
  }, [user, hasCheckedActiveGame, gameState.isActive]);

  // Initialize box contents - hidden until revealed
  const initializeBoxes = (): BoxContent[] => {
    const boxes: BoxContent[] = [];

    // Create 9 hidden boxes - content will be revealed from backend
    for (let i = 0; i < 9; i++) {
      boxes.push({
        id: i,
        type: "empty" as const,
        isRevealed: false,
      });
    }

    return boxes;
  };

  // Create game mutation
  const createGameMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/games/jogo-esquilo/create", "POST", {
        betAmount: gameState.betAmount,
        useBonus: gameState.useBonus,
      });
    },
    onSuccess: (data) => {
      const boxes = initializeBoxes();
      setGameState({
        ...gameState,
        gameId: data.gameId,
        currentWinnings: 0,
        gameStatus: "playing",
        isActive: true,
        openedBoxes: new Set(),
        boxContents: boxes,
        initialBalanceType: gameState.useBonus, // Store the initial balance type
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/balance"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao iniciar jogo",
        description: error.message,
        variant: "destructive",
      });
      setIsUnlocking(false);
    },
  });

  // Buy bonus mutation
  const buyBonusMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/games/jogo-esquilo/buy-bonus", "POST", {
        betAmount: buyBonusBetAmount,
        useBonus: gameState.useBonus, // Use the current balance type from game state
      });
    },
    onSuccess: (data) => {
      const boxes = initializeBoxes();
      
      // Create 8 bonus chests without multipliers (they will be generated on selection)
      const chestsWithState = Array.from({ length: 8 }, () => ({
        multiplier: 0, // Will be revealed after selection
        isRevealed: false,
        isOpening: false
      }));
      
      setGameState({
        ...gameState,
        gameId: data.gameId,
        betAmount: buyBonusBetAmount,
        currentWinnings: 0,
        gameStatus: "bonus", // Set to bonus mode for selection
        isActive: true,
        openedBoxes: new Set(),
        boxContents: boxes,
        initialBalanceType: gameState.useBonus, // Store current balance type before changing
        useBonus: false, // Will be activated after selection
        bonusPurchased: true,
        bonusMultipliers: undefined, // No multipliers yet - will be generated on selection
      });
      
      // Store bonus chests for selection
      setBonusChests(chestsWithState);
      
      // Close modal
      setShowBuyBonusModal(false);
      setIsBuyingBonus(false);
      
      // Show bonus activation animation briefly
      setShowBonusActivationAnimation(true);
      
      // Play bonus chest sound
      playSound(bonusChestSound, 0.3);
      
      // Hide animation and show bonus selection
      setTimeout(() => {
        setShowBonusActivationAnimation(false);
        // Show bonus mode for player to select chests
        setShowBonusMode(true);
      }, 2500);
      
      queryClient.invalidateQueries({ queryKey: ["/api/user/balance"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao comprar bônus",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
      setIsBuyingBonus(false);
    },
  });

  // Play mutation
  const playMutation = useMutation({
    mutationFn: async (action: "continue" | "cashout") => {
      if (!gameState.gameId) throw new Error("Jogo não iniciado");

      return await apiRequest(
        `/api/games/jogo-esquilo/${gameState.gameId}/play`,
        "POST",
        { action },
      );
    },
    onSuccess: (data) => {
      if (data.result === "cashout") {
        setShowCashOut(true);
        setShowConfetti(true);
        setGameState({
          ...gameState,
          gameStatus: "cashout",
          isActive: false,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/user/balance"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const realBalance = parseFloat(userWallet?.balance || "0");
  const bonusBalance = userWallet?.scratchBonus || 0;
  const availableBalance = gameState.useBonus ? bonusBalance : realBalance;

  // Show loading while loading resources
  if (!resourcesLoaded) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-[#0A0E1A] via-[#111827] to-[#0F172A] flex items-center justify-center z-50">
        {/* Soft ambient glow */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 md:w-96 md:h-96 bg-green-500/10 rounded-full blur-3xl" />
        </div>

        {/* Loading content */}
        <div className="relative flex flex-col items-center justify-center w-full px-4">
          {/* Logo with pulse animation */}
          <div className="mb-8 animate-pulse flex justify-center">
            <img
              src="/logos/logomania.svg"
              alt="Mania Brasil"
              className="h-16 md:h-20 w-auto opacity-90 mx-auto"
              style={{ maxWidth: "200px" }}
            />
          </div>

          {/* Modern loading dots */}
          <div className="flex justify-center space-x-2">
            <div
              className="w-3 h-3 bg-green-400 rounded-full animate-bounce"
              style={{ animationDelay: "0ms" }}
            ></div>
            <div
              className="w-3 h-3 bg-green-400 rounded-full animate-bounce"
              style={{ animationDelay: "150ms" }}
            ></div>
            <div
              className="w-3 h-3 bg-green-400 rounded-full animate-bounce"
              style={{ animationDelay: "300ms" }}
            ></div>
          </div>

          {/* Loading text */}
          <p className="mt-6 text-gray-400 text-sm animate-pulse text-center">
            Carregando jogo...
          </p>
        </div>
      </div>
    );
  }

  // Allow rendering even when not authenticated

  const startGame = () => {
    // Check if user is not authenticated
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    
    if (gameState.betAmount > availableBalance) {
      setShowInsufficientBalance(true);
      return;
    }

    // Save bet amount to localStorage
    localStorage.setItem("esquilo-last-bet", gameState.betAmount.toString());

    // Play sound with lower volume using cached audio
    playSound(buttonClickSound, 0.15);

    // Show click animation
    setShowClickAnimation(true);
    setTimeout(() => setShowClickAnimation(false), 800);

    setIsLoading(true);
    setIsUnlocking(true);

    // Animate unlock before starting game
    setTimeout(() => {
      createGameMutation.mutate();
      setTimeout(() => {
        setIsLoading(false);
        setIsUnlocking(false);
      }, 300);
    }, 600);
  };

  const openBox = async (boxId: number) => {
    // Prevent rapid clicks (minimum 300ms between clicks)
    const now = Date.now();
    if (now - lastClickTime < 300) return;
    setLastClickTime(now);

    // Check if already processing another box
    if (isProcessingBox) return;

    // Cancel any pending animations
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }
    setIsAnimatingValue(false);
    setAnimatingWinnings(0);

    // Check if box can be opened
    if (
      !gameState.isActive ||
      gameState.openedBoxes.has(boxId) ||
      !gameState.gameId
    )
      return;

    // Check if box is already being opened (prevent double clicks)
    const box = gameState.boxContents[boxId];
    if (box.isOpening || box.isRevealed) return;

    // Set processing flag to prevent other boxes from being opened
    setIsProcessingBox(true);

    // DON'T add to opened boxes yet - wait for server confirmation
    // This prevents desync if the server rejects the request
    
    // Don't play sound here, will play after knowing the result

    setSelectedBox(boxId);

    // Set opening animation but DON'T mark as opened yet
    const newBoxContents = [...gameState.boxContents];
    newBoxContents[boxId] = { ...box, isOpening: true };
    setGameState({
      ...gameState,
      boxContents: newBoxContents,
      // Don't add to openedBoxes here - wait for server response
    });

    // Show chest open animation immediately
    setShowChestTransition((prev) => new Set([...Array.from(prev), boxId]));
    setTimeout(() => {
      setShowChestTransition((prev) => {
        const newSet = new Set(prev);
        newSet.delete(boxId);
        return newSet;
      });
    }, 250);

    // Shorter delay for faster animation
    setTimeout(async () => {
      try {
        // Double-check that we still have a valid game
        if (!gameState.gameId) {
          setIsProcessingBox(false);
          return;
        }
        // Call backend to get actual result
        const result = await apiRequest(
          `/api/games/jogo-esquilo/${gameState.gameId}/play`,
          "POST",
          { action: "continue", boxId },
        );

        // Now we can safely add to opened boxes since server confirmed it
        const newOpenedBoxes = new Set(gameState.openedBoxes);
        newOpenedBoxes.add(boxId);

        // Update box with actual result from backend
        if (result.result === "fox") {
          // Found fox - game over
          // Play chest open sound for fox using cached audio
          playSound(chestOpenSound, 0.25);

          newBoxContents[boxId] = {
            id: boxId,
            type: "fox",
            isRevealed: true,
            isOpening: false,
            hasBonus: false,
          };

          // Show fox animation and start revealing boxes simultaneously
          setShowFoxAnimation(true);

          // Play fox sound after a small delay for dramatic effect
          setTimeout(() => {
            playSound(foxSound, 0.25, 100); // Added min delay
          }, 300);

          // Don't reveal all boxes immediately, we'll do it with animation
          setGameState({
            ...gameState,
            gameStatus: "gameover",
            isActive: false,
            currentWinnings: 0,
            boxContents: newBoxContents,
            openedBoxes: newOpenedBoxes,
          });

          // Clear processing flag since game is over
          setIsProcessingBox(false);

          // Start revealing boxes immediately (while fox animation is showing)
          setTimeout(() => {
            setIsRevealingAllBoxes(true);

            // Reveal all boxes with animation
            if (result.boxes) {
              let revealIndex = 0;
              const revealInterval = setInterval(() => {
                if (revealIndex >= 9) {
                  clearInterval(revealInterval);
                  setIsRevealingAllBoxes(false);

                  // Smooth transition to reset
                  setTimeout(() => {
                    setIsShowingChainReturn(true);

                    // Fade out animations smoothly
                    setTimeout(() => {
                      // Start fading out
                      setShowFoxAnimation(false);
                      setIsShowingChainReturn(false);

                      // Small delay for fade transition then reset
                      setTimeout(() => {
                        // Stop bonus music if playing
                        if (bonusAudioRef.current) {
                          bonusAudioRef.current.pause();
                          bonusAudioRef.current.currentTime = 0;
                        }
                        resetGame();
                      }, 400); // Smooth fade out
                    }, 800); // Shorter chain animation
                  }, 400); // More pause before chain
                  return;
                }

                // Skip already opened boxes
                if (!newOpenedBoxes.has(revealIndex)) {
                  const serverBox = result.boxes[revealIndex];
                  newBoxContents[revealIndex] = {
                    id: revealIndex,
                    type: serverBox.type === "fox" ? "fox" : serverBox.type,
                    multiplier: serverBox.multiplier || 0,
                    value: serverBox.multiplier
                      ? gameState.betAmount * serverBox.multiplier
                      : 0,
                    isRevealed: true,
                  };

                  setGameState((prev) => ({
                    ...prev,
                    boxContents: [...newBoxContents],
                  }));
                }

                revealIndex++;
              }, 80); // Smoother box reveal animation
            }

            // Fox animation will be hidden during the smooth transition
          }, 600); // Give fox animation more time to show
        } else {
          // Always play chest open sound first with debounce
          playSound(chestOpenSound, 0.2, 100);

          // Check if it's a bonus chest activation
          if (result.bonusActivated && !result.bonusUsed) {
            // Bonus was just activated - show the original prize value (without multiplier)
            
            // Get the prize details from backend
            const prizeMultiplier = result.prizeMultiplier || 0;
            const prizeType = result.prizeType || "prize";
            const prizeValue = gameState.betAmount * prizeMultiplier;
            
            // Mark the current box with the original prize (no bonus multiplier applied)
            newBoxContents[boxId] = {
              id: boxId,
              type: prizeType,
              isRevealed: true,
              isOpening: false,
              hasBonus: false, // Don't show bonus indicator on activation box
              multiplier: prizeMultiplier,
              value: prizeValue
            };
            
            // Update game state with the opened box and add prize value to winnings
            setGameState({
              ...gameState,
              boxContents: newBoxContents,
              openedBoxes: newOpenedBoxes,
              currentWinnings: gameState.currentWinnings + prizeValue, // Add the prize value
              gameStatus: "bonus",
              bonusMultipliers: result.bonusMultipliers || [1.5, 2, 3, 5, 10, 20, 50, 100],
            });
            
            // Create bonus chests with multipliers from backend
            const bonusMultipliers = result.bonusMultipliers || [1.5, 2, 3, 5, 10, 20, 50, 100];
            const chestsWithState = bonusMultipliers.map((mult: number) => ({
              multiplier: mult,
              isRevealed: false,
              isOpening: false
            }));
            
            // Store bonus chests and show selection mode
            setBonusChests(chestsWithState);
            
            // Play bonus chest sound
            playSound(bonusChestSound, 0.3);
            
            // Trigger coin animation for the prize value
            if (prizeValue > 0) {
              // Play prize sound for the winning
              setTimeout(() => {
                playSound(prizeSound, 0.25);
              }, 400);
              
              // Create flying coins animation
              const coins: {
                id: number;
                startX: number;
                startY: number;
                boxId?: number;
              }[] = [];
              const numCoins = 6;
              
              for (let i = 0; i < numCoins; i++) {
                coins.push({
                  id: Date.now() + i,
                  startX: 0,
                  startY: 0,
                  boxId: boxId,
                });
              }
              
              setFlyingCoins(coins);
              
              // Clear coins after animation
              setTimeout(() => {
                setFlyingCoins([]);
              }, 1500);
            }
            
            // Show bonus activation animation
            setShowBonusActivationAnimation(true);
            
            // After animation, show bonus selection
            setTimeout(() => {
              setShowBonusActivationAnimation(false);
              setShowBonusMode(true);
            }, 2500);
            
            // Clear processing since we're waiting for bonus selection
            setIsProcessingBox(false);
            return; // Exit early - waiting for bonus selection
          } else if (result.bonusActivated && result.activeBonusMultiplier) {
            // Bonus is already active with a multiplier
            // Start bonus music after chest sound
            setTimeout(() => {
              if (!bonusAudioRef.current) {
                bonusAudioRef.current = new Audio(bonusMusic);
                bonusAudioRef.current.loop = true;
                bonusAudioRef.current.volume = 0.15; // Lower volume
                bonusAudioRef.current.preload = 'auto';
              }
              bonusAudioRef.current
                .play()
                .catch((err) =>
                  console.log("Failed to play bonus music:", err),
                );
            }, 800); // Start music after chest sound effect
          }

          // Backend now returns the final prizeMultiplier already calculated:
          // - For natural bonus activation: returns base multiplier (no bonus applied)
          // - For active bonus: returns multiplier with bonus already applied
          // - For no bonus: returns base multiplier
          let prizeMultiplier = result.prizeMultiplier || 0;
          const prizeType = result.prizeType || "prize";

          // The prize value directly from backend (already has bonus applied if active)
          const finalValue = gameState.betAmount * prizeMultiplier;
          
          // For display purposes, check if we need to show multiplication animation
          // This happens when bonus is already active (not just activated)
          const showMultiplication = activeBonusMultiplier && 
                                     activeBonusMultiplier > 1 && 
                                     prizeMultiplier > 0 &&
                                     !result.bonusActivated; // Don't show multiplication on the box that activated bonus
          
          // Calculate base value for animation (divide by bonus to get original)
          const baseMultiplier = showMultiplication 
            ? prizeMultiplier / activeBonusMultiplier 
            : prizeMultiplier;
          const baseValue = gameState.betAmount * baseMultiplier;

          // Initially show base value
          newBoxContents[boxId] = {
            id: boxId,
            type: prizeType,
            multiplier: baseMultiplier,
            value: baseValue,
            isRevealed: true,
            isOpening: false,
            hasBonus: false,
          };

          // If bonus is active and this is a prize, trigger multiplication animation
          // But NOT if bonus was just activated on this box
          if (showMultiplication) {
            // Wait a bit to show the base value first
            setTimeout(() => {
              setMultiplierAnimationData({
                value: baseValue,
                multiplier: activeBonusMultiplier,
                boxId: boxId,
              });
              setShowMultiplierAnimation(true);

              // Play prize sound after multiplication animation starts
              setTimeout(() => {
                playSound(prizeSound, 0.25);
              }, 200);

              // After animation completes, update to final value and trigger coin animation
              setTimeout(() => {
                const updatedBoxContents = [...newBoxContents];
                updatedBoxContents[boxId] = {
                  ...updatedBoxContents[boxId],
                  multiplier: prizeMultiplier, // Use the final multiplier from backend
                  value: finalValue,
                  hasBonus: true,
                };
                setGameState((prev) => ({
                  ...prev,
                  boxContents: updatedBoxContents,
                }));

                setShowMultiplierAnimation(false);
                setMultiplierAnimationData(null);

                // Wait a bit after multiplier animation ends, then trigger coin animation
                setTimeout(() => {
                  // Get box position for coin animation
                  const boxElement = document.querySelector(
                    `[data-box-id="${boxId}"]`,
                  );
                  if (boxElement) {
                    const coins: {
                      id: number;
                      startX: number;
                      startY: number;
                      boxId?: number;
                    }[] = [];
                    const numCoins = 8;

                    for (let i = 0; i < numCoins; i++) {
                      coins.push({
                        id: Date.now() + i,
                        startX: 0, // Will be calculated relative to container in the animation
                        startY: 0, // Will be calculated relative to container in the animation
                        boxId: boxId,
                      });
                    }

                    setFlyingCoins(coins);

                    // Animate winnings value when coins reach destination
                    setTimeout(() => {
                      const startValue = gameState.currentWinnings;
                      const endValue = gameState.currentWinnings + finalValue;
                      const duration = 400; // Animação mais rápida para bônus
                      const startTime = Date.now();

                      setIsAnimatingValue(true);

                      const animateValue = () => {
                        const elapsed = Date.now() - startTime;
                        const progress = Math.min(elapsed / duration, 1);
                        const easeProgress = 1 - Math.pow(1 - progress, 3);
                        const currentValue =
                          startValue + (endValue - startValue) * easeProgress;

                        setAnimatingWinnings(currentValue);

                        if (progress < 1) {
                          animationFrameRef.current =
                            requestAnimationFrame(animateValue);
                        } else {
                          animationFrameRef.current = null;
                          setAnimatingWinnings(0);
                          setIsAnimatingValue(false);
                          setGameState((prev) => ({
                            ...prev,
                            currentWinnings: endValue,
                          }));
                          // Liberar o botão SOMENTE após o contador terminar completamente
                          setTimeout(() => {
                            setIsProcessingBox(false);
                          }, 100);
                        }
                      };

                      animateValue();
                    }, 500); // Reduzido para animação mais rápida com bônus

                    // Clear coins after animation
                    setTimeout(() => {
                      setFlyingCoins([]);
                    }, 1200);

                    // Flag será liberada dentro da função animateValue quando terminar
                  } else {
                    // If no coins animation, still need to release flag after all animations
                    // Total time: 300ms (base) + 900ms (multiplier) + 100ms (delay) = 1300ms
                    setTimeout(() => {
                      setIsProcessingBox(false);
                    }, 1300); // Garantir que todas as animações terminem
                  }
                }, 400); // Delay maior após o fim da animação do multiplicador
              }, 900); // Tempo reduzido para animação mais rápida do multiplicador
            }, 300); // Mostra valor base rapidamente
          } else {
            // No bonus active - play prize sound after chest open if it's a valuable prize
            if (prizeMultiplier > 0) {
              setTimeout(() => {
                playSound(prizeSound, 0.25);
              }, 300);
            }

            // Show final value immediately
            newBoxContents[boxId].multiplier = prizeMultiplier;
            newBoxContents[boxId].value = finalValue;
            newBoxContents[boxId].hasBonus = false;

            // Don't update currentWinnings here - will be updated after animation
            // Only update box contents and opened boxes
            setGameState({
              ...gameState,
              boxContents: newBoxContents,
              openedBoxes: newOpenedBoxes,
            });
          }

          // Calculate what will be added to current winnings
          const prizeWithBonus =
            activeBonusMultiplier &&
            activeBonusMultiplier > 1 &&
            prizeMultiplier > 0
              ? finalValue // finalValue already contains the multiplied value
              : gameState.betAmount * prizeMultiplier; // Calculate base value when no bonus is active

          // Calculate new total winnings
          const newWinnings = gameState.currentWinnings + prizeWithBonus;

          // Check if bonus mode is activated (handled by backend)
          if (result.bonusActivated && result.bonusMultiplier) {
            // Calculate winnings for the current box (without bonus, as bonus applies to NEXT boxes)
            const currentBoxWinnings = prizeMultiplier > 0 ? gameState.betAmount * prizeMultiplier : 0;
            const baseWinnings = gameState.currentWinnings + currentBoxWinnings;

            // Mark current box and all previous boxes as opened/revealed
            const allPreviousBoxes = [...newBoxContents];
            // Important: Mark all boxes up to and INCLUDING the current box
            for (let i = 0; i <= boxId; i++) {
              if (i === boxId) {
                // The current box should show the actual prize (bonus activator)
                allPreviousBoxes[i] = {
                  ...allPreviousBoxes[i],
                  isRevealed: true,
                  isOpening: false,
                  multiplier: prizeMultiplier,
                  value: currentBoxWinnings,
                  hasBonus: true, // Mark that this box activated the bonus
                  type: result.prizeType || allPreviousBoxes[i].type,
                };
              } else {
                // Previous boxes just need to be marked as revealed
                allPreviousBoxes[i] = {
                  ...allPreviousBoxes[i],
                  isRevealed: true,
                  isOpening: false,
                };
              }
              newOpenedBoxes.add(i);
            }

            // Activate bonus immediately
            setActiveBonusMultiplier(result.bonusMultiplier);

            // Show bonus activation animation
            setShowBonusActivationAnimation(true);

            // Hide animation after delay
            setTimeout(() => {
              setShowBonusActivationAnimation(false);
            }, 2500);

            // Update game state with bonus active and all boxes properly marked
            setGameState({
              ...gameState,
              gameStatus: "playing", // Keep playing, don't change to bonus
              currentWinnings: baseWinnings,
              boxContents: allPreviousBoxes,
              openedBoxes: newOpenedBoxes,
              initialBalanceType: gameState.initialBalanceType !== undefined ? gameState.initialBalanceType : gameState.useBonus,
              useBonus: true,
              bonusMode: true,
              bonusSelected: result.bonusMultiplier,
            });

            // Clear processing flag after animation completes
            setTimeout(() => {
              setIsProcessingBox(false);
            }, 2500); // After bonus activation animation
            
            // Don't return early - let the rest of the function complete
            // to ensure proper cleanup and state updates
          }

          // Only show flying coins if not handled by bonus multiplier animation
          // AND if bonus was not just activated (no coins for bonus activation)
          if (
            !(
              activeBonusMultiplier &&
              activeBonusMultiplier > 1 &&
              prizeMultiplier > 0
            ) && 
            !(result.bonusActivated && result.bonusMultiplier)
          ) {
            // Get box position for coin animation
            const boxElement = document.querySelector(
              `[data-box-id="${boxId}"]`,
            );
            if (boxElement) {
              const coins: {
                id: number;
                startX: number;
                startY: number;
                boxId?: number;
              }[] = [];
              const numCoins = 8; // Number of coins to fly

              for (let i = 0; i < numCoins; i++) {
                coins.push({
                  id: Date.now() + i,
                  startX: 0, // Will be calculated relative to container in the animation
                  startY: 0, // Will be calculated relative to container in the animation
                  boxId: boxId,
                });
              }

              // Start coin animation after a small delay
              setTimeout(() => {
                setFlyingCoins(coins);

                // Wait for coins to reach destination before animating counter
                animationTimeoutRef.current = setTimeout(() => {
                  // Cancel any existing animation
                  if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current);
                    animationFrameRef.current = null;
                  }

                  setIsAnimatingValue(true); // Start animation flag
                  const startValue = gameState.currentWinnings;
                  const endValue = gameState.currentWinnings + prizeWithBonus;
                  const duration = 500;
                  const startTime = Date.now();

                  const animateValue = () => {
                    const elapsed = Date.now() - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
                    const currentValue =
                      startValue + (endValue - startValue) * easeProgress;

                    setAnimatingWinnings(currentValue);

                    if (progress < 1) {
                      animationFrameRef.current =
                        requestAnimationFrame(animateValue);
                    } else {
                      animationFrameRef.current = null;
                      setAnimatingWinnings(0); // Reset animation state
                      setIsAnimatingValue(false); // End animation flag
                      setGameState((prev) => ({
                        ...prev,
                        currentWinnings: endValue,
                      }));
                    }
                  };

                  animateValue();
                }, 800); // Start counter animation when coins arrive
              }, 300); // Small delay after box opens

              // Clear coins after animation completes
              setTimeout(() => {
                setFlyingCoins([]);
              }, 1500);
            } else {
              // Fallback if element not found
              setGameState({
                ...gameState,
                currentWinnings: newWinnings,
                boxContents: newBoxContents,
                openedBoxes: newOpenedBoxes,
              });
            }
          } else {
            // Bonus is active but animation was handled above, just update box contents
            setGameState({
              ...gameState,
              boxContents: newBoxContents,
              openedBoxes: newOpenedBoxes,
              // Don't update currentWinnings here - it's already handled by bonus animation
            });
          }

          // Show mini celebration
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 1000);

          // Clear processing flag after everything is done
          // Clear processing flag after appropriate delay
          if (result.bonusActivated && result.bonusMultiplier) {
            // Bonus was just activated - flag already handled above
          } else if (
            activeBonusMultiplier &&
            activeBonusMultiplier > 1 &&
            result.prizeMultiplier > 0
          ) {
            // Bonus multiplier animation is playing - flag handled by animation sequence
          } else {
            // Standard case - clear after animations complete
            setTimeout(() => {
              setIsProcessingBox(false);
            }, 2000); // Ensure animations complete
          }
        }

        // Invalidate balance query
        queryClient.invalidateQueries({ queryKey: ["/api/user/balance"] });
      } catch (error: any) {
        console.error("Error opening box:", error);
        setIsProcessingBox(false); // Clear flag on error

        // If it's a "box already opened" error, sync with server state
        if (error?.error?.includes("Baú já foi aberto")) {
          console.log("Baú já foi aberto");
          // Fetch current game state to sync properly
          try {
            const activeGame = await apiRequest(
              `/api/games/jogo-esquilo/active`,
              "GET"
            );
            
            if (activeGame.hasActiveGame && activeGame.gameState) {
              // Sync with server state
              const serverOpenedBoxes = new Set<number>(activeGame.gameState.openedBoxes || []);
              
              // Update local state to match server
              const syncedBoxContents = [...gameState.boxContents];
              activeGame.gameState.boxes?.forEach((box: any, index: number) => {
                if (serverOpenedBoxes.has(index)) {
                  syncedBoxContents[index] = {
                    ...syncedBoxContents[index],
                    type: box.type,
                    multiplier: box.multiplier || 0,
                    isRevealed: true,
                    isOpening: false,
                  };
                }
              });
              
              // Reset the current box that failed
              syncedBoxContents[boxId] = {
                ...syncedBoxContents[boxId],
                isOpening: false,
                isRevealed: serverOpenedBoxes.has(boxId),
              };
              
              setGameState({
                ...gameState,
                boxContents: syncedBoxContents,
                openedBoxes: serverOpenedBoxes,
                currentWinnings: activeGame.gameState.currentWinnings || gameState.currentWinnings,
              });
            } else {
              // Just reset the opening state
              newBoxContents[boxId] = { ...box, isOpening: false };
              setGameState({
                ...gameState,
                boxContents: newBoxContents,
              });
            }
          } catch (syncError) {
            console.error("Erro ao sincronizar estado:", syncError);
            // Just reset the opening state
            newBoxContents[boxId] = { ...box, isOpening: false };
            setGameState({
              ...gameState,
              boxContents: newBoxContents,
            });
          }
        } else {
          // Other errors - reset box state
          newBoxContents[boxId] = { ...box, isOpening: false };
          setGameState({
            ...gameState,
            boxContents: newBoxContents,
            // Don't modify openedBoxes since we didn't add it initially
          });

          // Error handled silently
        }
        setIsProcessingBox(false); // Always clear the flag
      }

      setSelectedBox(null);
    }, 400);
  };

  // Function to handle bonus chest selection
  const selectBonusChest = async (chestId: number) => {
    if (isProcessingBonus || selectedBonusChest !== null) return;
    if (!gameState.gameId) return;

    setIsProcessingBonus(true);
    setSelectedBonusChest(chestId);

    // Play special bonus chest sound
    const audio = new Audio(bonusChestSound);
    audio.volume = 0.3;
    audio
      .play()
      .catch((err) => console.log("Failed to play bonus sound:", err));

    // Update chest to show opening animation
    const newBonusChests = [...bonusChests];
    newBonusChests[chestId] = { ...newBonusChests[chestId], isOpening: true };
    setBonusChests(newBonusChests);

    // Show chest open animation immediately (using 100+ to avoid conflicts with regular chests)
    setShowChestTransition((prev) => new Set([...Array.from(prev), 100 + chestId]));
    setTimeout(() => {
      setShowChestTransition((prev) => {
        const newSet = new Set(prev);
        newSet.delete(100 + chestId);
        return newSet;
      });
    }, 250);

    // Wait for animation then reveal all chests
    setTimeout(async () => {
      try {
        // Call backend to process bonus selection
        const result = await apiRequest(
          `/api/games/jogo-esquilo/${gameState.gameId}/bonus`,
          "POST",
          { chestId },
        );

        const selectedMultiplier = result.selectedMultiplier;

        // Use the allMultipliers returned from backend which has the correct arrangement
        const finalMultipliers = result.allMultipliers || [1.5, 2, 3, 5, 10, 20, 50, 100];

        // Reveal all chests at once with their multipliers
        const allRevealed = finalMultipliers.map((mult: number, idx: number) => ({
          multiplier: mult,
          isOpening: false,
          isRevealed: true,
        }));

        // Add transition for all chests
        for (let i = 0; i < 8; i++) {
          if (i !== chestId) {
            setShowChestTransition((prev) => new Set([...Array.from(prev), 100 + i]));
            setTimeout(() => {
              setShowChestTransition((prev) => {
                const newSet = new Set(prev);
                newSet.delete(100 + i);
                return newSet;
              });
            }, 250);
          }
        }

        setBonusChests(allRevealed);

        // Show sensacional animation for selected chest
        setBonusPrizeWon(selectedMultiplier);

        // Store the active bonus multiplier and play bonus music
        setActiveBonusMultiplier(selectedMultiplier);

        // Start bonus music
        if (!bonusAudioRef.current) {
          bonusAudioRef.current = new Audio(bonusMusic);
          bonusAudioRef.current.loop = true;
          bonusAudioRef.current.volume = 0.25;
        }
        bonusAudioRef.current
          .play()
          .catch((err) => console.log("Failed to play bonus music:", err));

        // Update game state - keep current winnings, activate bonus
        setGameState((prev) => ({
          ...prev,
          gameStatus: "playing",
          useBonus: true,
          bonusMode: true,
          bonusSelected: selectedMultiplier,
        }));

        // Close bonus mode after animation
        setTimeout(() => {
          setShowBonusMode(false);
          setBonusChests([]);
          setSelectedBonusChest(null);
          setBonusPrizeWon(0);
          setIsProcessingBonus(false);
          setIsProcessingBox(false); // Allow continuing the game
        }, 3000);
      } catch (error) {
        console.error("Error selecting bonus chest:", error);
        setIsProcessingBonus(false);
        // Error handled silently
      }
    }, 600);
  };

  const cashOut = () => {
    if (gameState.currentWinnings <= 0) return;

    // Play collect sound
    const audio = new Audio(collectSound);
    audio.volume = 0.2; // Volume baixo
    audio
      .play()
      .catch((err) => console.log("Failed to play collect sound:", err));

    // Reset active bonus multiplier and stop bonus music when cashing out
    setActiveBonusMultiplier(null);
    if (bonusAudioRef.current) {
      bonusAudioRef.current.pause();
      bonusAudioRef.current.currentTime = 0;
    }

    playMutation.mutate("cashout");
  };

  const resetGame = () => {
    // Clear animation states first for smooth transition
    setShowFoxAnimation(false);
    setIsShowingChainReturn(false);
    setShowGameOver(false);

    // Small delay for visual smoothness
    requestAnimationFrame(() => {
      setGameState({
        gameId: null,
        betAmount: getSavedBetAmount(), // Keep saved bet amount
        currentWinnings: 0,
        gameStatus: "initial",
        isActive: false,
        openedBoxes: new Set(),
        boxContents: Array.from({ length: 9 }, (_, i) => ({
          id: i,
          type: "empty" as const,
          isRevealed: false,
        })),
        useBonus: gameState.initialBalanceType !== undefined ? gameState.initialBalanceType : gameState.useBonus, // Restore initial balance type
      });

      // Reset all other states smoothly
      setShowCashOut(false);
      setShowConfetti(false);
      setShowBonusMode(false);
      setBonusChests([]);
      setSelectedBonusChest(null);
      setBonusPrizeWon(0);
      setIsProcessingBonus(false);
      setActiveBonusMultiplier(null);
      setSelectedBox(null);
      setIsAnimatingValue(false); // Reset animation state
      setIsProcessingBox(false); // Reset processing flag
      setLastClickTime(0); // Reset click time
      setShowChestTransition(new Set()); // Reset chest transitions
    });
  };

  const adjustBet = (direction: number) => {
    if (gameState.gameStatus !== "initial") return;
    const currentIndex = betValues.indexOf(gameState.betAmount);
    let newIndex = currentIndex;

    if (direction > 0 && currentIndex < betValues.length - 1) {
      newIndex = currentIndex + 1;
    } else if (direction < 0 && currentIndex > 0) {
      newIndex = currentIndex - 1;
    }

    const newBetAmount = betValues[newIndex];
    setGameState({ ...gameState, betAmount: newBetAmount });
    // Save to localStorage when changed
    localStorage.setItem("esquilo-last-bet", newBetAmount.toString());
  };

  // Grid positions for the 3x3 layout - fine-tuned sides, center fixed
  const gridPositions = [
    // First row
    { top: "28%", left: "14.5%" },
    { top: "28%", left: "40%" },
    { top: "28%", left: "65.5%" },
    // Second row
    { top: "50%", left: "14.5%" },
    { top: "50%", left: "40%" },
    { top: "50%", left: "65.5%" },
    // Third row
    { top: "72%", left: "14.5%" },
    { top: "72%", left: "40%" },
    { top: "72%", left: "65.5%" },
  ];

  return (
    <MobileLayout>
      <div className="min-h-screen relative overflow-hidden">
        {/* Forest Background - Always the same */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${forestBg})` }}
        />

        {/* Overlay for better contrast */}
        <div className="absolute inset-0 bg-black/20" />

        {/* Floating Leaves Animation */}
        <motion.div
          animate={{
            y: [0, 100, 200],
            x: [0, 20, -10],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute top-0 left-1/4 z-10"
        >
          <Leaf className="w-6 h-6 text-green-600/60" />
        </motion.div>
        <motion.div
          animate={{
            y: [0, 150, 300],
            x: [0, -30, 10],
            rotate: [0, -180, -360],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "linear",
            delay: 2,
          }}
          className="absolute top-0 right-1/3 z-10"
        >
          <Leaf className="w-5 h-5 text-yellow-600/50" />
        </motion.div>

        {/* Game Content */}
        <main className="relative z-20 flex flex-col items-center overflow-hidden px-0 py-2">
          <div className="w-full flex flex-col items-center">
            {/* Game Grid with Wooden Board */}
          <div className="relative w-full max-w-2xl mx-auto mb-4 mt-0 sm:mt-8 lg:w-[500px] lg:max-w-[500px] lg:-mt-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative"
              style={{ zIndex: 10 }}
            >
              {/* Wooden Board Background Image - Changes when bonus is active */}
              <OptimizedImage
                src={activeBonusMultiplier ? bonusChestGrid : chestGrid}
                alt="Game Board"
                className="w-full h-auto scale-[1.08] sm:scale-100 origin-center transition-all duration-1000"
                style={{ width: "100%", maxWidth: "100%" }}
                priority={true}
              />

              {/* Back/Pause Button */}
              <button
                onClick={() => {
                  if (gameState.isActive && gameState.gameId) {
                    // If game is active, ask to pause
                    const confirmExit = window.confirm(
                      "Seu jogo será salvo e você poderá continuar mais tarde. Deseja sair?",
                    );
                    if (confirmExit) {
                      // Reset state but game is saved on backend
                      setGameState({
                        gameId: null,
                        betAmount: gameState.betAmount,
                        currentWinnings: 0,
                        gameStatus: "initial",
                        isActive: false,
                        openedBoxes: new Set(),
                        boxContents: initializeBoxes(),
                        useBonus: false,
                      });

                      // Game paused silently

                      // Navigate back after a short delay
                      setTimeout(() => {
                        setLocation("/#minigames");
                      }, 500);
                    }
                  } else {
                    // If no active game, just go back to minigames section
                    setLocation("/#minigames");
                  }
                }}
                className="absolute top-4 left-4 p-2 md:p-3 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors z-30"
                title={gameState.isActive ? "Pausar e sair" : "Voltar"}
              >
                <ArrowLeft className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </button>

              {/* Squirrel with Bonus Banner */}
              {activeBonusMultiplier && (
                <motion.div
                  initial={{ opacity: 0, y: -50 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute transform -translate-x-1/2 z-30"
                  style={{ top: "-10px", left: "36%" }}
                >
                  <div className="relative">
                    <OptimizedImage
                      src={esquiloBonusBanner}
                      alt="Esquilo com Banner"
                      className="w-24 h-auto drop-shadow-2xl"
                      priority={true}
                    />
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{
                        top: "58%",
                        left: "62%",
                        transform: "translateX(-50%)",
                      }}
                    >
                      <motion.span
                        animate={{
                          scale: [1, 1.2, 1],
                          rotate: [-5, 5, -5],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                        className="font-black text-2xl"
                        style={{
                          color: "#00FF00",
                          textShadow: `
                            -1px -1px 0 #000,
                            1px -1px 0 #000,
                            -1px 1px 0 #000,
                            1px 1px 0 #000,
                            0 0 8px rgba(0, 255, 0, 0.8)
                          `,
                        }}
                      >
                        {activeBonusMultiplier}x
                      </motion.span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Multiplier Animation */}
              <AnimatePresence>
                {showMultiplierAnimation &&
                  multiplierAnimationData &&
                  (() => {
                    // Calculate target position based on box id
                    const gridPositions = [
                      { left: "17%", top: "23%" }, // Box 0
                      { left: "40%", top: "23%" }, // Box 1
                      { left: "63%", top: "23%" }, // Box 2
                      { left: "17%", top: "48%" }, // Box 3
                      { left: "40%", top: "48%" }, // Box 4
                      { left: "63%", top: "48%" }, // Box 5
                      { left: "17%", top: "73%" }, // Box 6
                      { left: "40%", top: "73%" }, // Box 7
                      { left: "63%", top: "73%" }, // Box 8
                    ];

                    const targetPosition = gridPositions[
                      multiplierAnimationData.boxId
                    ] || { left: "50%", top: "50%" };

                    return (
                      <>
                        {/* Multiplicador saindo do esquilo até o prêmio */}
                        <motion.div
                          initial={{
                            left: "36%",
                            top: "-10px",
                            opacity: 0,
                            scale: 0.3,
                          }}
                          animate={{
                            left: [
                              "36%",
                              "36%",
                              targetPosition.left,
                              targetPosition.left,
                            ],
                            top: [
                              "-10px",
                              "-10px",
                              targetPosition.top,
                              targetPosition.top,
                            ],
                            opacity: [0, 1, 1, 1, 0],
                            scale: [0.3, 1.5, 1.5, 2, 0],
                          }}
                          transition={{
                            duration: 0.8,
                            times: [0, 0.2, 0.5, 0.8, 1],
                            ease: "easeInOut",
                          }}
                          className="absolute transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
                        >
                          <motion.span
                            animate={{
                              rotate: [0, 360, 720],
                            }}
                            transition={{
                              duration: 0.8,
                              ease: "linear",
                            }}
                            className="font-black text-5xl inline-block"
                            style={{
                              color: "#00FF00",
                              textShadow: `
                              -2px -2px 0 #000,
                              2px -2px 0 #000,
                              -2px 2px 0 #000,
                              2px 2px 0 #000,
                              0 0 25px rgba(0, 255, 0, 1)
                            `,
                            }}
                          >
                            {multiplierAnimationData.multiplier}x
                          </motion.span>
                        </motion.div>

                        {/* Moeda indo para os ganhos após multiplicação */}
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{
                            opacity: [0, 0, 0, 1, 1, 0],
                            scale: [0.5, 0.5, 0.5, 1, 0.8, 0.3],
                            x: [0, 0, 0, 0, -100, -200],
                            y: [0, 0, 0, 0, -100, -200],
                          }}
                          transition={{
                            duration: 1,
                            times: [0, 0.5, 0.7, 0.8, 0.9, 1],
                            ease: "easeOut",
                          }}
                          className="absolute transform -translate-x-1/2 -translate-y-1/2 z-45 pointer-events-none"
                          style={{
                            left: targetPosition.left,
                            top: targetPosition.top,
                          }}
                        >
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-2xl flex items-center justify-center">
                            <span className="text-white font-bold text-xl">
                              ×
                            </span>
                          </div>
                        </motion.div>
                      </>
                    );
                  })()}
              </AnimatePresence>

              {/* Chains and Padlock Overlay */}
              <AnimatePresence>
                {gameState.gameStatus === "initial" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{
                      opacity: 0,
                      y: 200,
                      transition: { duration: 0.5, ease: "easeIn" },
                    }}
                    className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center"
                  >
                    {/* Chain and Lock Image */}
                    <motion.img
                      src={chainLock}
                      alt="Chain Lock"
                      className="w-4/5 lg:w-3/4 h-auto relative z-10 mt-12 lg:mt-14"
                      animate={
                        !isUnlocking
                          ? {
                              y: [0, -5, 0],
                            }
                          : {}
                      }
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />

                    {/* Glow Effect */}
                    {!isUnlocking && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-48 h-48 bg-yellow-400/20 blur-3xl rounded-full animate-pulse"></div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Boxes positioned on the grid */}
              {gameState.boxContents.map((box, index) => (
                <motion.button
                  key={box.id}
                  data-box-id={box.id}
                  onClick={() => openBox(box.id)}
                  disabled={
                    !gameState.isActive ||
                    box.isRevealed ||
                    gameState.gameStatus === "initial" ||
                    isProcessingBox
                  }
                  className={`absolute w-[20%] h-[15%] transition-opacity ${
                    isProcessingBox && !box.isRevealed && gameState.isActive
                      ? "opacity-70"
                      : "opacity-100"
                  }`}
                  style={{
                    top: gridPositions[index].top,
                    left: gridPositions[index].left,
                  }}
                  whileTap={
                    gameState.isActive && !box.isRevealed && !isProcessingBox
                      ? { scale: 0.95 }
                      : {}
                  }
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    opacity: gameState.gameStatus === "initial" ? 0.8 : 1,
                    scale: 1,
                  }}
                  transition={{ delay: index * 0.05 }}
                >
                  <AnimatePresence mode="wait">
                    {!box.isRevealed ? (
                      // Show closed chest or open chest when clicking
                      box.isOpening ? (
                        // Show open chest immediately when clicking
                        <div className="w-full h-full flex items-center justify-center">
                          <OptimizedImage
                            src={chestOpenImg}
                            alt="Open Chest"
                            className="w-full h-full object-contain"
                            priority={true}
                          />
                        </div>
                      ) : (
                        // Show closed chest
                        <div className="w-full h-full flex items-center justify-center">
                          <OptimizedImage
                            src={chestClosedImg}
                            alt="Chest"
                            className="w-full h-full object-contain"
                            priority={false}
                          />
                        </div>
                      )
                    ) : (
                      <motion.div
                        key="open"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="w-full h-full relative flex items-center justify-center"
                      >
                        {/* Show chest open briefly before prize */}
                        {showChestTransition.has(box.id) && (
                          <motion.img
                            src={chestOpenImg}
                            alt="Open Chest"
                            className="absolute w-full h-full object-contain"
                            initial={{ opacity: 1 }}
                            animate={{ opacity: 0 }}
                            transition={{ duration: 0.15, delay: 0.05 }}
                          />
                        )}

                        {/* Prize or Fox - shown immediately without chest background */}
                        {box.type === "fox" ? (
                          <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{
                              scale: [0, 1.2, 1],
                              rotate: [-180, 10, 0],
                            }}
                            transition={{
                              duration: 0.6,
                              type: "spring",
                              damping: 10,
                            }}
                            className="absolute inset-0 flex items-center justify-center"
                          >
                            <OptimizedImage
                              src={foxImg}
                              alt="Fox"
                              className="w-16 h-16 object-contain drop-shadow-2xl relative z-10"
                              priority={false}
                            />
                          </motion.div>
                        ) : box.type === "pinecone" ||
                          box.type === "acorn" ||
                          box.type === "apple" ||
                          box.type === "ring" ||
                          box.type === "goldenacorn" ? (
                          <motion.div
                            initial={{ scale: 0, y: 20 }}
                            animate={{ scale: [0, 1.1, 1], y: [20, -5, 0] }}
                            transition={{ duration: 0.5 }}
                            className="absolute inset-0 flex items-center justify-center"
                          >
                            <div className="flex items-center justify-center h-full">
                              <div className="relative">
                                {/* Select prize image based on type - Bigger */}
                                <img
                                  src={
                                    box.type === "goldenacorn"
                                      ? goldenAcornImg
                                      : box.type === "ring"
                                        ? ringImg
                                        : box.type === "apple"
                                          ? appleImg
                                          : box.type === "acorn"
                                            ? acornImg
                                            : pineconeImg
                                  }
                                  alt="Prize"
                                  className="w-14 h-14 object-contain drop-shadow-lg"
                                />
                                {/* Prize value centered on the image */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span
                                    className="font-black text-[16px]"
                                    style={{
                                      color: box.hasBonus
                                        ? "#00FF00"
                                        : "#FFD700",
                                      textShadow: box.hasBonus
                                        ? `
                                            -1px -1px 0 #000,
                                            1px -1px 0 #000,
                                            -1px 1px 0 #000,
                                            1px 1px 0 #000,
                                            0 0 10px rgba(0, 255, 0, 0.8)
                                          `
                                        : `
                                            -1px -1px 0 #000,
                                            1px -1px 0 #000,
                                            -1px 1px 0 #000,
                                            1px 1px 0 #000,
                                            0 0 8px rgba(255, 215, 0, 0.8)
                                          `,
                                      letterSpacing: "0.3px",
                                      fontWeight: 900,
                                      lineHeight: 1,
                                    }}
                                  >
                                    {box.value ? formatBRL(box.value) : "0,00"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ) : null}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              ))}
            </motion.div>

            {/* Chain Return Animation */}
            <AnimatePresence>
              {isShowingChainReturn && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center"
                >
                  {/* Chain and Lock Image - Same size as initial */}
                  <motion.img
                    src={chainLock}
                    alt="Chain Lock"
                    className="w-4/5 lg:w-3/4 h-auto relative z-10 mt-12 lg:mt-14"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Cash Out Success - Sensacional Screen */}
            <AnimatePresence>
              {showCashOut && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 cursor-pointer"
                  onClick={resetGame}
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", damping: 10, stiffness: 100 }}
                    className="relative"
                  >
                    {/* Sensacional Background Image */}
                    <div className="relative">
                      <img
                        src={sensacionalImg}
                        alt="Sensacional"
                        className="w-80 h-auto"
                      />
                      {/* Value Display */}
                      <div className="absolute bottom-[6%] left-0 right-0 flex justify-center">
                        <span
                          className="font-black text-4xl"
                          style={{
                            color: "#FFC700",
                            textShadow: `
                              -2px -2px 0 #6B4423,
                              2px -2px 0 #6B4423,
                              -2px 2px 0 #6B4423,
                              2px 2px 0 #6B4423,
                              3px 3px 0 #4A2F18,
                              4px 4px 2px rgba(0, 0, 0, 0.3),
                              0 0 30px rgba(255, 199, 0, 0.6)
                            `,
                            letterSpacing: "0.5px",
                            fontWeight: 900,
                            fontFamily:
                              '"Inter", "Segoe UI", system-ui, sans-serif',
                          }}
                        >
                          R$ {formatBRL(gameState.currentWinnings)}
                        </span>
                      </div>
                    </div>
                    {/* Click anywhere text */}
                    <motion.div
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute -bottom-12 left-0 right-0 text-center"
                    >
                      <span className="text-white/70 text-sm">
                        Clique em qualquer lugar para continuar
                      </span>
                    </motion.div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Insufficient Balance Modal */}
            <AnimatePresence>
              {showInsufficientBalance && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/80 backdrop-blur-md rounded-3xl flex items-center justify-center z-30"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 15 }}
                    className="bg-gradient-to-br from-red-900/95 to-black/95 rounded-2xl p-6 text-center max-w-sm mx-4 border-2 border-red-500/50 shadow-2xl"
                  >
                    <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-red-400 mb-2">
                      Saldo Insuficiente
                    </h2>
                    <p className="text-white/80 mb-4">
                      {gameState.useBonus ? (
                        <>
                          Você tem apenas{" "}
                          <span className="font-bold text-yellow-400">
                            {bonusBalance} Mania Bônus
                          </span>
                          .
                        </>
                      ) : (
                        <>
                          Seu saldo real é de apenas{" "}
                          <span className="font-bold text-green-400">
                            R$ {formatBRL(realBalance)}
                          </span>
                          .
                        </>
                      )}
                    </p>
                    <p className="text-white/60 text-sm mb-4">
                      {gameState.useBonus
                        ? "Ganhe mais Mania Bônus ou use saldo real."
                        : "Reduza o valor da aposta ou faça um depósito para continuar jogando."}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setShowInsufficientBalance(false)}
                        className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-bold px-4 py-2 rounded-xl"
                      >
                        Voltar
                      </Button>
                      {!gameState.useBonus && (
                        <Button
                          onClick={() => setLocation("/deposit")}
                          className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold px-4 py-2 rounded-xl"
                        >
                          Depositar
                        </Button>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bet Display - Bottom Left Corner */}
            <div className="absolute -bottom-24 lg:-bottom-20 left-2 lg:left-8 z-30 w-32 sm:w-36">
              <div className="relative">
                <OptimizedImage src={apostaImg} alt="Aposta" className="w-full h-auto" priority={true} />
                <div className="absolute bottom-[25%] left-0 right-0 text-center overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={gameState.betAmount}
                      initial={{
                        opacity: 0,
                        y: 10,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        scale: [1, 1.2, 1],
                      }}
                      exit={{
                        opacity: 0,
                        y: -10,
                      }}
                      transition={{
                        duration: 0.3,
                        ease: "easeOut",
                        scale: {
                          duration: 0.4,
                          ease: "easeInOut",
                        },
                      }}
                      className={`text-white font-black ${getFontSize("R$ " + formatBRL(gameState.betAmount))} inline-block drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]`}
                    >
                      R$ {formatBRL(gameState.betAmount)}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Winnings Display or Buy Bonus Button - Bottom Right Corner */}
            <div
              id="ganho-container"
              className="absolute right-2 lg:right-8 z-30 w-32 sm:w-36 bottom-[-98px] lg:bottom-[-85px]"
            >
              {!gameState.isActive && gameState.gameStatus === "initial" ? (
                // Buy Bonus Button when game is not active
                <motion.div
                  onClick={() => {
                    setBuyBonusBetAmount(gameState.betAmount);
                    setShowBuyBonusModal(true);
                  }}
                  className="relative cursor-pointer"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <OptimizedImage src={comprarBonusImg} alt="Comprar Bônus" className="w-full h-auto" priority={true} />
                  <div className="absolute bottom-[25%] left-0 right-0 text-center">
                    <div
                      className={`text-white font-black ${getFontSize("R$ " + formatBRL(gameState.betAmount * bonusCostMultiplier))} drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]`}
                    >
                      R$ {formatBRL(gameState.betAmount * bonusCostMultiplier)}
                    </div>
                  </div>
                </motion.div>
              ) : (
                // Normal winnings display when game is active
                <div className="relative">
                  <OptimizedImage src={ganhoImg} alt="Ganho" className="w-full h-auto" priority={true} />
                  <div
                    className="absolute bottom-[25%] left-0 right-0 text-center"
                    id="winnings-display"
                  >
                    <div
                      className={`text-white font-black ${getFontSize("R$ " + formatBRL(animatingWinnings > 0 ? animatingWinnings : gameState.currentWinnings))} drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]`}
                    >
                      R${" "}
                      {formatBRL(
                        animatingWinnings > 0
                          ? animatingWinnings
                          : gameState.currentWinnings,
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Flying Coins Animation - Inside game container */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ zIndex: 100 }}
            >
              {flyingCoins.map((coin, index) => {
                // Get box element position relative to game container
                const boxElement =
                  coin.boxId !== undefined
                    ? document.querySelector(`[data-box-id="${coin.boxId}"]`)
                    : null;
                const gameContainer = document.querySelector(
                  ".relative.w-full.max-w-2xl.mx-auto",
                );
                const ganhoDisplay = document.getElementById("ganho-container");

                const boxRect = boxElement?.getBoundingClientRect();
                const containerRect = gameContainer?.getBoundingClientRect();
                const ganhoRect = ganhoDisplay?.getBoundingClientRect();

                // Calculate positions relative to game container
                const startX =
                  boxRect && containerRect
                    ? boxRect.left - containerRect.left + boxRect.width / 2
                    : 200;
                const startY =
                  boxRect && containerRect
                    ? boxRect.top - containerRect.top + boxRect.height / 2
                    : 200;

                // Target is the "GANHO" display - use actual position from getBoundingClientRect
                const targetX =
                  ganhoRect && containerRect
                    ? ganhoRect.left - containerRect.left + ganhoRect.width / 2
                    : containerRect
                      ? containerRect.width - 70
                      : 300;
                const targetY =
                  ganhoRect && containerRect
                    ? ganhoRect.top - containerRect.top + ganhoRect.height / 2
                    : containerRect
                      ? containerRect.height + 100
                      : 400;

                // Create arc path for natural movement
                const midX = startX + (targetX - startX) * 0.5;
                const midY = Math.min(startY, targetY) - 80;

                return (
                  <motion.div
                    key={coin.id}
                    className="absolute pointer-events-none"
                    initial={{
                      left: startX - 15,
                      top: startY - 15,
                      scale: 0,
                      opacity: 0,
                    }}
                    animate={{
                      left: [startX - 15, midX - 15, targetX - 15],
                      top: [startY - 15, midY, targetY - 15],
                      scale: [0, 1.2, 1, 0.6],
                      opacity: [0, 1, 1, 0],
                      rotate: [0, 360, 720],
                    }}
                    transition={{
                      duration: 1,
                      ease: "easeInOut",
                      delay: index * 0.05,
                      times: [0, 0.4, 0.8, 1],
                    }}
                  >
                    <div
                      className="w-[30px] h-[30px] rounded-full relative"
                      style={{
                        background: `
                      radial-gradient(circle at 30% 30%, #FFE066, #FFD700 20%, #FFA500 60%, #FF8C00 90%)
                    `,
                        boxShadow: `
                      0 2px 8px rgba(0, 0, 0, 0.4),
                      0 0 20px rgba(255, 215, 0, 0.6),
                      inset -3px -3px 10px rgba(0, 0, 0, 0.2),
                      inset 3px 3px 10px rgba(255, 255, 255, 0.4)
                    `,
                        border: "1px solid #DAA520",
                      }}
                    >
                      {/* Coin inner circle */}
                      <div
                        className="absolute inset-[20%] rounded-full"
                        style={{
                          background: `
                        radial-gradient(circle at 40% 40%, #FFE066, #FFD700)
                      `,
                          boxShadow: "inset 0 1px 3px rgba(0, 0, 0, 0.3)",
                        }}
                      >
                        <div
                          className="w-full h-full flex items-center justify-center font-black text-xs"
                          style={{
                            color: "#B8860B",
                            textShadow: "0 1px 1px rgba(0, 0, 0, 0.3)",
                          }}
                        >
                          $
                        </div>
                      </div>

                      {/* Shine effect */}
                      <div
                        className="absolute top-[15%] left-[15%] w-[30%] h-[30%] rounded-full"
                        style={{
                          background:
                            "radial-gradient(circle, rgba(255,255,255,0.8), transparent)",
                          filter: "blur(2px)",
                        }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Control Buttons */}
          <div className="w-full max-w-sm space-y-3 lg:max-w-sm">
            {/* Play/Collect Button - Always visible */}
            <div className="flex justify-center -mt-8 lg:-mt-14 mb-4 z-20 relative">
              {gameState.gameStatus === "initial" ? (
                <motion.button
                  onClick={startGame}
                  disabled={
                    isLoading ||
                    gameState.betAmount > availableBalance ||
                    isUnlocking
                  }
                  className={`relative w-32 h-32 lg:w-32 lg:h-32 cursor-pointer disabled:cursor-not-allowed transition-opacity ${
                    isLoading ||
                    gameState.betAmount > availableBalance ||
                    isUnlocking ||
                    isProcessingBox
                      ? "opacity-50"
                      : "opacity-100"
                  }`}
                  whileHover={{
                    scale:
                      !isLoading &&
                      gameState.betAmount <= availableBalance &&
                      !isUnlocking
                        ? 1.1
                        : 1,
                  }}
                  whileTap={{
                    scale:
                      !isLoading &&
                      gameState.betAmount <= availableBalance &&
                      !isUnlocking
                        ? 0.95
                        : 1,
                  }}
                  style={{ zIndex: 20 }}
                >
                  {/* Combined Background with Ears and Green Orb */}
                  <img
                    src={combinedBgImg}
                    alt="Button Background"
                    className="absolute inset-0 w-full h-full object-contain"
                    style={{ zIndex: 0 }}
                  />

                  {/* Glowing Effect */}
                  <motion.div
                    className="absolute inset-0 rounded-full w-[70%] h-[70%] top-[15%] left-[15%]"
                    style={{ zIndex: 1 }}
                    animate={{
                      boxShadow: [
                        "0 0 20px rgba(255,215,0,0.5)",
                        "0 0 40px rgba(255,215,0,0.8)",
                        "0 0 20px rgba(255,215,0,0.5)",
                      ],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />

                  {/* Button Image Rotating in Center */}
                  <motion.img
                    src={playButtonImg}
                    alt="Play"
                    className="absolute w-[50%] h-[50%] object-contain drop-shadow-xl top-[28%] left-[25%]"
                    style={{ zIndex: 2 }}
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 8,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />

                  {/* Click Animation - Beautiful Expanding Glow */}
                  {showClickAnimation && (
                    <>
                      {/* Central Flash */}
                      <motion.div
                        className="absolute inset-0 rounded-full pointer-events-none w-[60%] h-[60%] top-[20%] left-[20%]"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{
                          scale: [0.8, 1.2, 1],
                          opacity: [0, 1, 0],
                        }}
                        transition={{ duration: 0.4 }}
                        style={{
                          background:
                            "radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,215,0,0.6) 50%, transparent 70%)",
                          filter: "blur(2px)",
                        }}
                      />

                      {/* Expanding Ring 1 */}
                      <motion.div
                        className="absolute inset-0 rounded-full pointer-events-none border-4 border-yellow-400"
                        initial={{ scale: 1, opacity: 1 }}
                        animate={{
                          scale: [1, 2, 2.5],
                          opacity: [1, 0.5, 0],
                        }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        style={{
                          boxShadow: "0 0 20px rgba(255,215,0,0.8)",
                        }}
                      />

                      {/* Expanding Ring 2 */}
                      <motion.div
                        className="absolute inset-0 rounded-full pointer-events-none border-2 border-yellow-300"
                        initial={{ scale: 1, opacity: 0.8 }}
                        animate={{
                          scale: [1, 2.2, 2.8],
                          opacity: [0.8, 0.3, 0],
                        }}
                        transition={{
                          duration: 0.8,
                          delay: 0.1,
                          ease: "easeOut",
                        }}
                        style={{
                          boxShadow: "0 0 15px rgba(255,215,0,0.6)",
                        }}
                      />

                      {/* Sparkle Particles */}
                      {[...Array(8)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute w-2 h-2 bg-yellow-300 rounded-full pointer-events-none"
                          initial={{
                            x: 0,
                            y: 0,
                            scale: 0,
                            opacity: 1,
                          }}
                          animate={{
                            x: Math.cos((i * Math.PI * 2) / 8) * 80,
                            y: Math.sin((i * Math.PI * 2) / 8) * 80,
                            scale: [0, 1, 0],
                            opacity: [1, 1, 0],
                          }}
                          transition={{
                            duration: 0.7,
                            delay: 0.05 * i,
                            ease: "easeOut",
                          }}
                          style={{
                            left: "50%",
                            top: "50%",
                            marginLeft: "-4px",
                            marginTop: "-4px",
                            boxShadow: "0 0 6px rgba(255,215,0,0.9)",
                          }}
                        />
                      ))}
                    </>
                  )}
                </motion.button>
              ) : (
                <motion.button
                  onClick={cashOut}
                  disabled={
                    gameState.currentWinnings === 0 ||
                    !gameState.isActive ||
                    isAnimatingValue ||
                    isProcessingBox
                  }
                  className={`relative w-32 h-32 lg:w-32 lg:h-32 cursor-pointer disabled:cursor-not-allowed transition-opacity ${
                    gameState.currentWinnings === 0 ||
                    !gameState.isActive ||
                    isAnimatingValue ||
                    isProcessingBox
                      ? "opacity-50"
                      : "opacity-100"
                  }`}
                  whileHover={{
                    scale:
                      gameState.currentWinnings > 0 &&
                      gameState.isActive &&
                      !isAnimatingValue &&
                      !isProcessingBox
                        ? 1.1
                        : 1,
                  }}
                  whileTap={{
                    scale:
                      gameState.currentWinnings > 0 &&
                      gameState.isActive &&
                      !isAnimatingValue &&
                      !isProcessingBox
                        ? 0.95
                        : 1,
                  }}
                  style={{ zIndex: 20 }}
                >
                  {/* Combined Background with Ears and Green Orb */}
                  <img
                    src={combinedBgImg}
                    alt="Button Background"
                    className="absolute inset-0 w-full h-full object-contain"
                    style={{ zIndex: 0 }}
                  />

                  {/* Collect Chest - Smaller and centered */}
                  <img
                    src={collectChestImg}
                    alt="Collect Chest"
                    className="absolute w-[40%] h-[40%] object-contain top-[30%] left-[30%]"
                    style={{ zIndex: 2 }}
                  />

                  {/* Collect Text - Below the chest */}
                  <img
                    src={collectTextImg}
                    alt="Coletar"
                    className="absolute w-[100%] h-[35%] object-contain top-[58%] left-[0%]"
                    style={{ zIndex: 2 }}
                  />
                </motion.button>
              )}
            </div>

            {/* Bet Controls and Balance Selector - Always visible */}
            <div className="flex items-center justify-center gap-4 -mt-2 mb-1">
              {/* Decrease Button - Left */}
              <motion.button
                whileHover={{
                  scale: gameState.gameStatus === "initial" ? 1.15 : 1,
                }}
                whileTap={{
                  scale: gameState.gameStatus === "initial" ? 0.85 : 1,
                }}
                onClick={() =>
                  gameState.gameStatus === "initial" && adjustBet(-1)
                }
                disabled={
                  gameState.betAmount === 1 ||
                  gameState.gameStatus !== "initial"
                }
                className={`relative w-16 h-16 lg:w-16 lg:h-16 cursor-pointer transition-opacity ${
                  gameState.betAmount === 1 ||
                  gameState.gameStatus !== "initial"
                    ? "opacity-50 cursor-not-allowed"
                    : "opacity-100"
                }`}
              >
                {/* Button Background Image */}
                <img
                  src={smallButtonBg}
                  alt="Button Background"
                  className="absolute inset-0 w-full h-full object-contain"
                />

                {/* Red Overlay Circle */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-[60%] h-[60%] rounded-full bg-gradient-to-b from-red-500 to-red-600 shadow-lg mt-1" />
                </div>

                {/* Minus Icon - Centered */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Minus className="w-6 h-6 text-white z-10" />
                </div>
              </motion.button>

              {/* Balance Type Selector - Middle */}
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm font-bold transition-all ${!gameState.useBonus ? "text-green-400" : "text-white/50"}`}
                >
                  Real
                </span>

                <button
                  onClick={() => {
                    // Check if user is not authenticated
                    if (!user) {
                      setShowLoginModal(true);
                      return;
                    }
                    
                    if (gameState.gameStatus === "initial") {
                      setGameState({
                        ...gameState,
                        useBonus: !gameState.useBonus,
                      });
                    }
                  }}
                  disabled={gameState.gameStatus !== "initial"}
                  className={`relative w-16 h-8 rounded-full transition-all border ${gameState.gameStatus !== "initial" ? "bg-black/20 border-white/10 cursor-not-allowed opacity-50" : "bg-black/30 border-white/20"}`}
                >
                  <motion.div
                    className={`absolute top-1 w-6 h-6 rounded-full shadow-lg ${
                      gameState.useBonus
                        ? "bg-gradient-to-b from-purple-400 to-purple-600"
                        : "bg-gradient-to-b from-green-400 to-green-600"
                    }`}
                    animate={{
                      left: gameState.useBonus ? "34px" : "4px",
                    }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </button>

                <span
                  className={`text-sm font-bold transition-all ${gameState.useBonus ? "text-purple-400" : "text-white/50"}`}
                >
                  Bônus
                </span>
              </div>

              {/* Increase Button - Right */}
              <motion.button
                whileHover={{
                  scale: gameState.gameStatus === "initial" ? 1.15 : 1,
                }}
                whileTap={{
                  scale: gameState.gameStatus === "initial" ? 0.85 : 1,
                }}
                onClick={() =>
                  gameState.gameStatus === "initial" && adjustBet(1)
                }
                disabled={
                  gameState.betAmount === 500 ||
                  gameState.gameStatus !== "initial"
                }
                className={`relative w-16 h-16 lg:w-16 lg:h-16 cursor-pointer transition-opacity ${
                  gameState.betAmount === 500 ||
                  gameState.gameStatus !== "initial"
                    ? "opacity-50 cursor-not-allowed"
                    : "opacity-100"
                }`}
              >
                {/* Button Background Image */}
                <img
                  src={smallButtonBg}
                  alt="Button Background"
                  className="absolute inset-0 w-full h-full object-contain"
                />

                {/* Green Overlay Circle */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-[60%] h-[60%] rounded-full bg-gradient-to-b from-green-500 to-green-600 shadow-lg mt-1" />
                </div>

                {/* Plus Icon - Centered */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Plus className="w-6 h-6 text-white z-10" />
                </div>
              </motion.button>
            </div>

            {/* Removed NOVO JOGO button - not needed */}
          </div>

          {/* Info Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm mt-1 lg:max-w-sm"
          >
            <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4">
              <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Como Jogar
              </h3>
              <div className="space-y-1 text-sm text-white/80">
                <div className="flex items-start gap-2">
                  <span>• Escolha o valor da aposta</span>
                </div>
                <div className="flex items-start gap-2">
                  <span>• Abra os baús para encontrar prêmios</span>
                </div>
                <div className="flex items-start gap-2">
                  <span>• Cuidado! raposas fazem você perder</span>
                </div>
                <div className="flex items-start gap-2">
                  <span>• Baú bônus multiplica os prêmios</span>
                </div>
                <div className="flex items-start gap-2">
                  <span>• Saque a qualquer momento para ganhar</span>
                </div>
              </div>
            </div>
          </motion.div>
          </div>
        </main>

        {/* Confetti */}
        <AnimatePresence>
          {showConfetti && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 pointer-events-none z-50"
            >
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{
                    x: Math.random() * window.innerWidth,
                    y: -20,
                    rotate: 0,
                  }}
                  animate={{
                    y: window.innerHeight + 20,
                    rotate: Math.random() * 360,
                  }}
                  transition={{
                    duration: Math.random() * 2 + 1,
                    ease: "linear",
                  }}
                  className="absolute"
                  style={{
                    left: Math.random() * window.innerWidth,
                  }}
                >
                  {i % 3 === 0 ? (
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  ) : i % 3 === 1 ? (
                    <Heart className="w-4 h-4 text-red-400 fill-red-400" />
                  ) : (
                    <Coins className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fox Animation Overlay */}
        <AnimatePresence>
          {showFoxAnimation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center"
              style={{ pointerEvents: "none" }}
            >
              {/* Dark overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-black/80"
              />

              {/* Red flash effect */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{
                  opacity: [0, 0.5, 0, 0.3, 0],
                }}
                transition={{
                  duration: 1,
                  times: [0, 0.2, 0.4, 0.6, 1],
                }}
                className="absolute inset-0 bg-red-600/50"
              />

              {/* Screen shake container */}
              <motion.div
                animate={{
                  x: [0, -10, 10, -10, 10, 0],
                  y: [0, 10, -10, 10, -10, 0],
                }}
                transition={{
                  duration: 0.5,
                  delay: 0.2,
                  repeat: 2,
                  repeatType: "reverse",
                }}
                className="relative z-10"
              >
                {/* Fox appearing */}
                <motion.div
                  initial={{ scale: 0, rotate: -360 }}
                  animate={{
                    scale: [0, 2, 1.5],
                    rotate: [-360, 20, 0],
                  }}
                  transition={{
                    duration: 0.8,
                    type: "spring",
                    damping: 10,
                  }}
                  className="relative"
                >
                  {/* Danger glow behind fox */}
                  <motion.div
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      repeatType: "reverse",
                    }}
                    className="absolute inset-0 w-48 h-48 bg-red-500/30 blur-3xl rounded-full -z-10"
                    style={{
                      transform: "translate(-50%, -50%)",
                      left: "50%",
                      top: "50%",
                    }}
                  />

                  {/* Fox image */}
                  <img
                    src={foxImg}
                    alt="Fox"
                    className="w-32 h-32 object-contain drop-shadow-2xl"
                    style={{
                      filter: "drop-shadow(0 0 30px rgba(239, 68, 68, 0.8))",
                    }}
                  />
                </motion.div>

                {/* GAME OVER text */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{
                    opacity: [0, 1, 1, 0],
                    y: [30, 0, 0, -10],
                    scale: [0.8, 1.1, 1, 0.9],
                  }}
                  transition={{
                    duration: 1.5,
                    times: [0, 0.3, 0.7, 1],
                    delay: 0.5,
                  }}
                  className="absolute bottom-[-80px] left-1/2 transform -translate-x-1/2"
                >
                  <div
                    className="text-4xl font-black text-red-500 tracking-wider"
                    style={{
                      textShadow:
                        "0 0 20px rgba(239, 68, 68, 0.8), 0 0 40px rgba(239, 68, 68, 0.6), 0 4px 10px rgba(0,0,0,0.8)",
                    }}
                  >
                    GAME OVER
                  </div>
                </motion.div>
              </motion.div>

              {/* Red particles falling */}
              {[...Array(15)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{
                    x: Math.random() * window.innerWidth,
                    y: -20,
                    opacity: 0,
                  }}
                  animate={{
                    y: window.innerHeight + 20,
                    opacity: [0, 1, 1, 0],
                  }}
                  transition={{
                    duration: Math.random() * 2 + 1,
                    delay: Math.random() * 0.5,
                    ease: "linear",
                  }}
                  className="absolute"
                  style={{
                    left: Math.random() * window.innerWidth,
                  }}
                >
                  <div
                    className="w-3 h-3 bg-red-500 rounded-full"
                    style={{
                      boxShadow: "0 0 10px rgba(239, 68, 68, 0.8)",
                    }}
                  />
                </motion.div>
              ))}

              {/* Danger warning stripes on sides */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.8, 0] }}
                transition={{
                  duration: 1,
                  repeat: 2,
                  delay: 0.3,
                }}
                className="absolute top-0 left-0 w-20 h-full"
                style={{
                  background:
                    "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(239, 68, 68, 0.3) 10px, rgba(239, 68, 68, 0.3) 20px)",
                }}
              />
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.8, 0] }}
                transition={{
                  duration: 1,
                  repeat: 2,
                  delay: 0.3,
                }}
                className="absolute top-0 right-0 w-20 h-full"
                style={{
                  background:
                    "repeating-linear-gradient(-45deg, transparent, transparent 10px, rgba(239, 68, 68, 0.3) 10px, rgba(239, 68, 68, 0.3) 20px)",
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bonus Activation Animation */}
      <AnimatePresence>
        {showBonusActivationAnimation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gradient-to-br from-black via-purple-900/20 to-black backdrop-blur-md flex items-center justify-center z-50 overflow-hidden"
          >
            {/* Animated background rays */}
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={`ray-${i}`}
                  className="absolute top-1/2 left-1/2 w-[200%] h-2"
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: [0, 0.3, 0],
                    rotate: [i * 30, i * 30 + 360],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "linear",
                    delay: i * 0.1,
                  }}
                  style={{
                    background: `linear-gradient(90deg, transparent, rgba(255,215,0,0.5), transparent)`,
                    transformOrigin: "0 50%",
                  }}
                />
              ))}
            </div>

            {/* Main container with 3D effect */}
            <motion.div
              initial={{ scale: 0, rotateY: -180 }}
              animate={{
                scale: 1,
                rotateY: 0,
              }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{
                duration: 0.8,
                type: "spring",
                damping: 15,
              }}
              className="relative"
              style={{ perspective: "1000px" }}
            >
              {/* Premium card design */}
              <motion.div
                className="relative"
                animate={{
                  rotateY: [0, 5, 0, -5, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* Multiple glowing layers */}
                <motion.div
                  className="absolute -inset-20 rounded-3xl"
                  animate={{
                    background: [
                      "radial-gradient(circle, rgba(255,215,0,0.1) 0%, transparent 70%)",
                      "radial-gradient(circle, rgba(255,215,0,0.3) 0%, transparent 70%)",
                      "radial-gradient(circle, rgba(255,215,0,0.1) 0%, transparent 70%)",
                    ],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />

                {/* Premium golden frame */}
                <div
                  className="relative px-20 py-12 rounded-3xl"
                  style={{
                    background:
                      "linear-gradient(135deg, #FFD700 0%, #FFA500 25%, #FFD700 50%, #FFA500 75%, #FFD700 100%)",
                    padding: "4px",
                  }}
                >
                  <div
                    className="relative px-16 py-10 rounded-3xl"
                    style={{
                      background:
                        "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
                    }}
                  >
                    {/* Shimmering effect overlay */}
                    <motion.div
                      className="absolute inset-0 rounded-3xl pointer-events-none"
                      animate={{
                        background: [
                          "linear-gradient(105deg, transparent 40%, rgba(255,215,0,0.3) 50%, transparent 60%)",
                          "linear-gradient(105deg, transparent 60%, rgba(255,215,0,0.3) 70%, transparent 80%)",
                          "linear-gradient(105deg, transparent 80%, rgba(255,215,0,0.3) 90%, transparent 100%)",
                        ],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />

                    {/* Crown icon */}
                    <motion.div
                      className="absolute -top-10 left-1/2 transform -translate-x-1/2"
                      initial={{ y: -20, opacity: 0 }}
                      animate={{
                        y: 0,
                        opacity: 1,
                        rotate: [0, -5, 5, 0],
                      }}
                      transition={{
                        y: { delay: 0.3, duration: 0.5 },
                        rotate: {
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        },
                      }}
                    >
                      <div className="text-6xl">👑</div>
                    </motion.div>

                    {/* Main text with better styling */}
                    <motion.div
                      className="relative z-10"
                      animate={{
                        scale: [1, 1.02, 1],
                      }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        repeatType: "reverse",
                      }}
                    >
                      <h1
                        className="text-6xl font-black text-center"
                        style={{
                          background:
                            "linear-gradient(135deg, #FFD700, #FFED4E, #FFD700, #FFA500)",
                          backgroundClip: "text",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          textShadow: "0 0 60px rgba(255,215,0,0.8)",
                          filter:
                            "drop-shadow(0 4px 8px rgba(0,0,0,0.8)) drop-shadow(0 0 40px rgba(255,215,0,0.6))",
                          letterSpacing: "2px",
                        }}
                      >
                        BÔNUS
                      </h1>
                      <h2
                        className="text-5xl font-black text-center mt-2"
                        style={{
                          background:
                            "linear-gradient(135deg, #FFD700, #FFED4E, #FFD700, #FFA500)",
                          backgroundClip: "text",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          textShadow: "0 0 60px rgba(255,215,0,0.8)",
                          filter:
                            "drop-shadow(0 4px 8px rgba(0,0,0,0.8)) drop-shadow(0 0 40px rgba(255,215,0,0.6))",
                          letterSpacing: "4px",
                        }}
                      >
                        ATIVO!
                      </h2>
                    </motion.div>

                    {/* Decorative circles */}
                    <div className="absolute top-1/2 -left-8 transform -translate-y-1/2">
                      <div className="w-6 h-6 rounded-full bg-purple-500 shadow-lg" />
                    </div>
                    <div className="absolute top-1/2 -right-8 transform -translate-y-1/2">
                      <div className="w-6 h-6 rounded-full bg-purple-500 shadow-lg" />
                    </div>
                  </div>
                </div>

                {/* Optimized orbiting circles */}
                {[...Array(4)].map((_, i) => (
                  <motion.div
                    key={`coin-${i}`}
                    className="absolute"
                    animate={{
                      rotate: 360,
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "linear",
                      delay: i * 0.25,
                    }}
                    style={{
                      left: "50%",
                      top: "50%",
                      transformOrigin: `${90 + i * 15}px 0`,
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-lg"
                      style={{
                        transform: `rotate(${i * 90}deg)`,
                        boxShadow: "0 0 15px rgba(250, 204, 21, 0.7)",
                      }}
                    />
                  </motion.div>
                ))}
              </motion.div>

              {/* Optimized explosion particles */}
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={`explosion-${i}`}
                  className="absolute"
                  initial={{ scale: 0, opacity: 1 }}
                  animate={{
                    scale: [0, 1, 1.2],
                    opacity: [1, 1, 0],
                    x: Math.cos((i * 30 * Math.PI) / 180) * 180,
                    y: Math.sin((i * 30 * Math.PI) / 180) * 180,
                  }}
                  transition={{
                    duration: 1.2,
                    delay: 0.3,
                    ease: "easeOut",
                  }}
                  style={{
                    left: "50%",
                    top: "50%",
                  }}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: i % 2 === 0 ? "#FFD700" : "#9333EA",
                      boxShadow: "0 0 8px currentColor",
                    }}
                  />
                </motion.div>
              ))}

              {/* Simple sparkle effect */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={`sparkle-${i}`}
                  className="absolute"
                  initial={{
                    scale: 0,
                    opacity: 1,
                  }}
                  animate={{
                    scale: [0, 1, 0],
                    opacity: [0, 1, 0],
                    x: (Math.random() - 0.5) * 200,
                    y: (Math.random() - 0.5) * 200,
                  }}
                  transition={{
                    duration: 1.2,
                    delay: 0.2 + i * 0.08,
                    ease: "easeOut",
                  }}
                  style={{
                    left: "50%",
                    top: "50%",
                  }}
                >
                  <div className="w-1.5 h-1.5 bg-white rounded-full shadow-sm" />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bonus Mode - Golden Frame with Beautiful Details */}
      <AnimatePresence>
        {showBonusMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50"
          >
            {/* Frame Container with Background Image */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{
                type: "spring",
                damping: 12,
                stiffness: 100,
                duration: 0.8,
              }}
              className="relative w-[500px] h-[400px]"
            >
              {/* Background Frame Image */}
              <img
                src={bonusFrameImg}
                alt="Frame"
                className="absolute inset-0 w-full h-full object-contain"
              />

              {/* 8 Animated Chests Grid - Positioned inside frame */}
              <div className="absolute inset-0 flex items-center justify-center pt-28 pb-12">
                <div className="grid grid-cols-4 grid-rows-2 gap-2 px-14">
                  {bonusChests.map((chest, index) => (
                    <motion.div
                      key={index}
                      className="relative"
                      initial={{ scale: 0, opacity: 0, y: 50 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      transition={{
                        delay: index * 0.08,
                        type: "spring",
                        stiffness: 200,
                        damping: 15,
                        duration: 0.5,
                      }}
                      whileHover={{
                        scale:
                          !chest.isRevealed && !isProcessingBonus ? 1.15 : 1,
                      }}
                    >
                      {/* Removed glowing effects for cleaner look */}

                      <button
                        onClick={() =>
                          !chest.isRevealed &&
                          !isProcessingBonus &&
                          selectBonusChest(index)
                        }
                        disabled={chest.isRevealed || isProcessingBonus}
                        className="relative w-16 h-16 transition-transform flex items-center justify-center"
                      >
                        {!chest.isRevealed ? (
                          // Show closed or opening chest (no multiplier shown as we don't have it yet)
                          chest.isOpening ? (
                            <img
                              src={chestOpenImg}
                              alt="Open Chest"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <motion.img
                              src={chestClosedImg}
                              alt="Chest"
                              className="w-full h-full object-contain"
                              animate={{
                                filter: [
                                  "drop-shadow(0 0 15px rgba(255,215,0,0.3))",
                                  "drop-shadow(0 0 25px rgba(255,215,0,0.5))",
                                  "drop-shadow(0 0 15px rgba(255,215,0,0.3))",
                                ],
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut",
                              }}
                            />
                          )
                        ) : (
                          // Show opened chest with multiplier
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.2 }}
                            className="w-full h-full relative"
                          >
                            {/* Brief chest open image */}
                            {showChestTransition.has(100 + index) && (
                              <motion.img
                                src={chestOpenImg}
                                alt="Open Chest"
                                className="absolute w-full h-full object-contain"
                                initial={{ opacity: 1 }}
                                animate={{ opacity: 0 }}
                                transition={{ duration: 0.15, delay: 0.05 }}
                              />
                            )}

                            {/* Multiplier with beautiful animation */}
                            <motion.div
                              initial={{ scale: 0, rotate: -360, opacity: 0 }}
                              animate={
                                selectedBonusChest === index
                                  ? {
                                      scale: [0, 1.5, 1.2],
                                      rotate: [360, 20, 0],
                                      opacity: [0, 1, 1],
                                    }
                                  : {
                                      scale: [0, 1],
                                      rotate: [180, 0],
                                      opacity: [0, 1],
                                    }
                              }
                              transition={
                                selectedBonusChest === index
                                  ? {
                                      duration: 0.8,
                                      type: "spring",
                                      damping: 10,
                                      stiffness: 100,
                                    }
                                  : {
                                      duration: 0.5,
                                      delay: index * 0.05,
                                    }
                              }
                              className="absolute inset-0 flex items-center justify-center"
                            >
                              {/* Glowing background for selected */}
                              {selectedBonusChest === index && (
                                <motion.div
                                  className="absolute inset-0 rounded-full"
                                  animate={{
                                    boxShadow: [
                                      "0 0 0px rgba(255,215,0,0)",
                                      "0 0 60px rgba(255,215,0,0.8)",
                                      "0 0 30px rgba(255,215,0,0.6)",
                                    ],
                                  }}
                                  transition={{
                                    duration: 0.5,
                                    repeat: Infinity,
                                    repeatType: "reverse",
                                  }}
                                />
                              )}

                              <motion.div
                                className={`w-16 h-16 flex items-center justify-center rounded-xl relative ${
                                  selectedBonusChest === index
                                    ? "bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-500"
                                    : "bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 border-2 border-yellow-500/50"
                                }`}
                                animate={
                                  selectedBonusChest === index
                                    ? {
                                        scale: [1, 1.1, 1],
                                        rotate: [-3, 3, -3, 0],
                                      }
                                    : {}
                                }
                                transition={{
                                  duration: 0.6,
                                  repeat:
                                    selectedBonusChest === index ? Infinity : 0,
                                  repeatType: "reverse",
                                }}
                                style={{
                                  boxShadow:
                                    selectedBonusChest === index
                                      ? "0 0 30px rgba(255,215,0,0.9), inset 0 0 20px rgba(255,255,255,0.4)"
                                      : "0 4px 15px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)",
                                }}
                              >
                                <span
                                  className="font-black"
                                  style={{
                                    fontSize:
                                      chest.multiplier >= 100
                                        ? "14px"
                                        : chest.multiplier >= 10
                                          ? "18px"
                                          : "22px",
                                    color:
                                      selectedBonusChest === index
                                        ? "#000"
                                        : "#FFD700",
                                    textShadow:
                                      selectedBonusChest === index
                                        ? "0 1px 2px rgba(255,255,255,0.5)"
                                        : "0 2px 4px rgba(0,0,0,0.9), 0 0 8px rgba(255,215,0,0.4)",
                                    lineHeight: "1",
                                  }}
                                >
                                  {chest.multiplier}x
                                </span>
                              </motion.div>
                            </motion.div>

                            {/* Enhanced sparkles and stars for selected chest */}
                            {selectedBonusChest === index && (
                              <>
                                {/* Rotating stars */}
                                {[...Array(8)].map((_, i) => (
                                  <motion.div
                                    key={`star-${i}`}
                                    className="absolute"
                                    initial={{
                                      scale: 0,
                                      opacity: 0,
                                    }}
                                    animate={{
                                      scale: [0, 1, 0],
                                      opacity: [0, 1, 0],
                                      rotate: 360,
                                    }}
                                    transition={{
                                      duration: 2,
                                      repeat: Infinity,
                                      delay: i * 0.25,
                                      ease: "easeInOut",
                                    }}
                                    style={{
                                      left: "50%",
                                      top: "50%",
                                      marginLeft: "-6px",
                                      marginTop: "-6px",
                                      transform: `translate(${Math.cos((i * 45 * Math.PI) / 180) * 30}px, ${Math.sin((i * 45 * Math.PI) / 180) * 30}px)`,
                                    }}
                                  >
                                    <div className="text-yellow-400 text-sm">
                                      ✦
                                    </div>
                                  </motion.div>
                                ))}

                                {/* Explosion particles */}
                                {[...Array(12)].map((_, i) => (
                                  <motion.div
                                    key={`particle-${i}`}
                                    className="absolute w-1 h-1 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full"
                                    initial={{
                                      x: 0,
                                      y: 0,
                                      opacity: 1,
                                      scale: 0,
                                    }}
                                    animate={{
                                      x:
                                        Math.cos((i * 30 * Math.PI) / 180) * 40,
                                      y:
                                        Math.sin((i * 30 * Math.PI) / 180) * 40,
                                      opacity: [1, 1, 0],
                                      scale: [0, 1.5, 0],
                                    }}
                                    transition={{
                                      duration: 1.5,
                                      repeat: Infinity,
                                      delay: i * 0.05,
                                      ease: "easeOut",
                                    }}
                                    style={{
                                      left: "50%",
                                      top: "50%",
                                      boxShadow: "0 0 4px rgba(255,215,0,1)",
                                    }}
                                  />
                                ))}
                              </>
                            )}
                          </motion.div>
                        )}
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Removed multiplier display for cleaner experience */}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Buy Bonus Modal - Wood Theme */}
      <AnimatePresence>
        {showBuyBonusModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowBuyBonusModal(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 20 }}
              className="relative max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Wooden Background Container - Darker wood like chest_grid */}
              <div className="relative bg-gradient-to-br from-amber-950 via-amber-900 to-yellow-900/80 rounded-2xl p-6 shadow-2xl border-4 border-amber-800/70">
                {/* Wood grain texture overlay */}
                <div className="absolute inset-0 opacity-40 rounded-2xl"
                  style={{
                    backgroundImage: `
                      repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(92,51,23,0.3) 3px, rgba(92,51,23,0.3) 6px),
                      repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.2) 2px, rgba(0,0,0,0.2) 4px)
                    `,
                  }}
                />
                
                {/* Metal corner decorations like chest hinges */}
                <div className="absolute top-2 left-2 w-10 h-10 border-t-4 border-l-4 border-yellow-600/60 rounded-tl-lg shadow-inner" />
                <div className="absolute top-2 right-2 w-10 h-10 border-t-4 border-r-4 border-yellow-600/60 rounded-tr-lg shadow-inner" />
                <div className="absolute bottom-2 left-2 w-10 h-10 border-b-4 border-l-4 border-yellow-600/60 rounded-bl-lg shadow-inner" />
                <div className="absolute bottom-2 right-2 w-10 h-10 border-b-4 border-r-4 border-yellow-600/60 rounded-br-lg shadow-inner" />
                
                {/* Wood knots decoration */}
                <div className="absolute top-16 left-4 w-6 h-6 bg-amber-950/40 rounded-full blur-sm" />
                <div className="absolute bottom-20 right-6 w-4 h-4 bg-amber-950/30 rounded-full blur-sm" />
                
                {/* Content */}
                <div className="relative z-10">
                  {/* Header with golden text */}
                  <h2 className="text-2xl font-black text-yellow-400 mb-4 text-center drop-shadow-[0_3px_6px_rgba(0,0,0,0.9)]">
                    COMPRAR BÔNUS
                  </h2>

                  {/* Bonus cost display - TOP with wood panel effect */}
                  <div className="bg-gradient-to-b from-amber-950/80 to-amber-900/60 rounded-xl p-4 mb-4 border-2 border-amber-700/50 shadow-inner">
                    <div className="text-yellow-400 font-black text-3xl text-center drop-shadow-[0_3px_6px_rgba(0,0,0,0.9)] mb-1">
                      R$ {formatBRL(buyBonusBetAmount * bonusCostMultiplier)}
                    </div>
                    <div className="text-yellow-300/70 text-sm text-center font-bold">
                      Valor do Bônus
                    </div>
                  </div>
                  
                  {/* Bet amount selector - BOTTOM with carved wood effect */}
                  <div className="bg-gradient-to-b from-amber-950/70 to-amber-900/50 rounded-xl p-4 mb-4 border-2 border-amber-700/40 shadow-inner">
                    <div className="flex items-center justify-center gap-4 mb-2">
                      {/* Minus button - Wood style */}
                      <motion.button
                        onClick={() => {
                          const values = [1, 3, 5, 10, 20, 50, 100, 200, 500];
                          const currentIndex = values.indexOf(buyBonusBetAmount);
                          if (currentIndex > 0) {
                            setBuyBonusBetAmount(values[currentIndex - 1]);
                          }
                        }}
                        className="bg-gradient-to-b from-amber-700 to-amber-800 hover:from-amber-600 hover:to-amber-700 text-yellow-300 font-bold w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all border-2 border-amber-600/40"
                        whileTap={{ scale: 0.9 }}
                      >
                        <Minus className="w-5 h-5" />
                      </motion.button>
                      
                      {/* Value display */}
                      <div className="text-yellow-200 font-black text-2xl drop-shadow-[0_3px_6px_rgba(0,0,0,0.9)] min-w-[120px] text-center">
                        R$ {formatBRL(buyBonusBetAmount)}
                      </div>
                      
                      {/* Plus button - Wood style */}
                      <motion.button
                        onClick={() => {
                          const values = [1, 3, 5, 10, 20, 50, 100, 200, 500];
                          const currentIndex = values.indexOf(buyBonusBetAmount);
                          if (currentIndex < values.length - 1) {
                            setBuyBonusBetAmount(values[currentIndex + 1]);
                          }
                        }}
                        className="bg-gradient-to-b from-amber-700 to-amber-800 hover:from-amber-600 hover:to-amber-700 text-yellow-300 font-bold w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all border-2 border-amber-600/40"
                        whileTap={{ scale: 0.9 }}
                      >
                        <Plus className="w-5 h-5" />
                      </motion.button>
                    </div>
                    <div className="text-yellow-300/70 text-sm text-center font-bold">
                      Valor da Aposta
                    </div>
                  </div>

                  {/* Balance check */}
                  {userWallet && (
                    (() => {
                      const totalCost = buyBonusBetAmount * bonusCostMultiplier;
                      const currentBalance = gameState.useBonus ? 
                        (userWallet?.scratchBonus || 0) : 
                        parseFloat(userWallet?.balance || '0');
                      const hasInsufficientBalance = currentBalance < totalCost;
                      
                      return hasInsufficientBalance ? (
                        <div className="bg-red-900/40 border border-red-500/40 rounded-lg p-2 mb-3">
                          <p className="text-red-300 text-xs text-center">
                            Saldo {gameState.useBonus ? "bônus" : "real"} insuficiente!
                          </p>
                        </div>
                      ) : null;
                    })()
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-3">
                    <motion.button
                      onClick={() => setShowBuyBonusModal(false)}
                      className="flex-1 relative overflow-hidden bg-gradient-to-b from-amber-800 to-amber-900 hover:from-amber-700 hover:to-amber-800 text-yellow-100 font-black py-3 px-4 rounded-xl transition-all shadow-xl border-2 border-amber-700/60"
                      disabled={isBuyingBonus}
                      whileTap={{ scale: 0.95 }}
                    >
                      {/* Wood grain effect */}
                      <div className="absolute inset-0 opacity-20"
                        style={{
                          backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)`
                        }}
                      />
                      {/* Inner shadow for depth */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl" />
                      <span className="relative flex items-center justify-center text-base drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                        <ChevronLeft className="w-5 h-5 mr-1" />
                        VOLTAR
                      </span>
                    </motion.button>
                    
                    <motion.button
                      onClick={() => {
                        // Check if user is not authenticated
                        if (!user) {
                          setShowLoginModal(true);
                          return;
                        }
                        
                        setIsBuyingBonus(true);
                        buyBonusMutation.mutate();
                      }}
                      disabled={
                        isBuyingBonus ||
                        !userWallet ||
                        (() => {
                          const totalCost = buyBonusBetAmount * bonusCostMultiplier;
                          const currentBalance = gameState.useBonus ? 
                            (userWallet?.scratchBonus || 0) : 
                            parseFloat(userWallet?.balance || '0');
                          return currentBalance < totalCost;
                        })()
                      }
                      className="flex-1 relative overflow-hidden bg-gradient-to-b from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-white font-black py-3 px-4 rounded-xl transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed border-2 border-yellow-400/50"
                      whileTap={{ scale: 0.95 }}
                    >
                      {/* Shine effect */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-50" />
                      {/* Inner glow */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl" />
                      {isBuyingBonus ? (
                        <span className="relative flex items-center justify-center text-base drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                          <Loader2 className="w-5 h-5 mr-1 animate-spin" />
                          COMPRANDO...
                        </span>
                      ) : (
                        <span className="relative flex items-center justify-center text-base drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                          <Zap className="w-5 h-5 mr-1" />
                          COMPRAR
                        </span>
                      )}
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Login Required Modal */}
      <LoginRequiredModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </MobileLayout>
  );
}
