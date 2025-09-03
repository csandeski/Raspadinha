import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { MobileLayout } from "@/components/mobile-layout";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Gift,
  Star,
  Sparkles,
  Lock,
  ArrowLeft,
  ChevronRight,
  Gem,
  Crown,
  Medal,
  Zap,
  Target,
  TrendingUp,
  Timer,
  Award,
  CheckCircle,
  X,
  DollarSign,
  Wallet,
  History,
  Calendar,
  AlertCircle,
  Coins,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";

export default function Rewards() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"benefits" | "spin" | "cashback">("spin");
  const [claimingLevel, setClaimingLevel] = useState<number | null>(null);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [isClaimingTier, setIsClaimingTier] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<string>('all');

  // Fetch level information
  const { data: levelInfo, isLoading: isLoadingLevel } = useQuery<{
    level: number;
    progress: number;
    totalWagered: string;
  }>({
    queryKey: ["/api/user/level"],
  });

  // Fetch rewards information
  const { data: rewardsInfo, isLoading: isLoadingRewards } = useQuery<{
    rewards: Array<{
      level: number;
      reward: number;
      available: boolean;
      claimed: boolean;
    }>;
    totalUnclaimed: number;
  }>({
    queryKey: ["/api/level/rewards"],
  });

  // Fetch daily spin status with tier info - with polling for updates
  const { data: spinStatus, refetch: refetchSpinStatus } = useQuery<{
    canSpin: boolean;
    tier: string;
    level: number;
    lastSpin: {
      amount: number;
      spunAt: string;
    } | null;
  }>({
    queryKey: ["/api/daily-spin/status"],
    refetchInterval: 1000, // Poll every 1 second for faster updates
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't keep cache
  });

  // Fetch claimed tier rewards
  const { data: claimedRewards } = useQuery<
    Array<{
      id: number;
      userId: number;
      tier: string;
      level: number;
      amount: number;
      claimedAt: string;
    }>
  >({
    queryKey: ["/api/tier-rewards/claimed"],
  });

  // Fetch cashback status
  const { data: cashbackStatus, refetch: refetchCashback } = useQuery<{
    tier: string;
    percentage: number;
    hasCashbackToday: boolean;
    cashbackAmount: number;
    status: string;
    calculationDate?: string;
  }>({
    queryKey: ["/api/cashback/status"],
  });

  // Fetch cashback history
  const { data: cashbackHistoryData } = useQuery<
    Array<{
      id: number;
      userId: number;
      calculationDate: string;
      tier: string;
      cashbackPercentage: string;
      totalDeposits: string;
      totalWithdrawals: string;
      currentBalance: string;
      netLoss: string;
      cashbackAmount: string;
      status: 'pending' | 'credited' | 'expired';
      creditedAt?: string;
      createdAt: string;
    }>
  >({
    queryKey: ["/api/cashback/history"],
  });

  // Use only real data from API - removed all fake data
  const cashbackHistory = cashbackHistoryData || [];

  // Filter cashback history based on selected filter
  const filteredCashbackHistory = cashbackHistory?.filter((cashback) => {
    const cashbackDate = new Date(cashback.creditedAt || cashback.createdAt);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (historyFilter === 'today') {
      const cashbackDay = new Date(cashbackDate);
      cashbackDay.setHours(0, 0, 0, 0);
      return cashbackDay.getTime() === today.getTime();
    } else if (historyFilter === 'week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return cashbackDate >= weekAgo;
    } else if (historyFilter === 'month') {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return cashbackDate >= monthAgo;
    }
    return true; // 'all' filter
  }) || [];

  // Claim cashback mutation
  const claimCashbackMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/cashback/claim`, "POST", {});
    },
    onSuccess: (data) => {
      toast({
        title: "Cashback Resgatado!",
        description: `R$ ${data.amount} foram adicionados ao seu saldo!`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cashback/status"] });
      
      // Trigger confetti animation
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao resgatar cashback",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
    },
  });

  // Claim tier reward mutation
  const claimTierRewardMutation = useMutation({
    mutationFn: async ({
      tier,
      amount,
      level,
    }: {
      tier: string;
      amount: number;
      level: number;
    }) => {
      return apiRequest(`/api/tier-rewards/claim`, "POST", {
        tier,
        amount,
        level,
      });
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Recompensa Resgatada!",
        description: `${variables.amount} raspadinhas foram adicionadas ao seu saldo!`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/balance"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/tier-rewards/claimed"],
      });
      setSelectedTier(null);
      setClaimingLevel(null);

      // Trigger confetti animation
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao resgatar recompensa",
        variant: "destructive",
      });
    },
  });

  const handleClaimTierReward = (
    tier: string,
    amount: number,
    level: number,
  ) => {
    setClaimingLevel(level);
    claimTierRewardMutation.mutate({ tier, amount, level });
  };

  // Check if a tier reward has been claimed
  const hasClaimedTierReward = (tier: string, level: number) => {
    if (!claimedRewards) return false;
    return claimedRewards.some(
      (reward) => reward.tier === tier && reward.level === level,
    );
  };

  // Get user's tier based on level
  const getUserTier = (level: number) => {
    if (level === 1)
      return {
        name: "Sem rank",
        color: "from-gray-600 to-gray-800",
        iconColor: "text-gray-600",
        textColor: "text-gray-600",
      };
    if (level >= 100)
      return {
        name: "Diamante",
        color: "from-cyan-400 to-blue-600",
        iconColor: "text-cyan-400",
        textColor: "text-cyan-400",
      };
    if (level >= 75)
      return {
        name: "Platina",
        color: "from-gray-300 to-gray-500",
        iconColor: "text-gray-300",
        textColor: "text-gray-300",
      };
    if (level >= 50)
      return {
        name: "Ouro",
        color: "from-yellow-400 to-yellow-600",
        iconColor: "text-yellow-400",
        textColor: "text-yellow-400",
      };
    if (level >= 25)
      return {
        name: "Prata",
        color: "from-gray-400 to-gray-600",
        iconColor: "text-gray-400",
        textColor: "text-gray-400",
      };
    return {
      name: "Bronze",
      color: "from-amber-600 to-amber-800",
      iconColor: "text-amber-600",
      textColor: "text-amber-600",
    };
  };

  const currentTier = levelInfo ? getUserTier(levelInfo.level) : getUserTier(1);

  // Track tier changes and invalidate spin status cache
  const [previousLevel, setPreviousLevel] = useState<number | null>(null);

  useEffect(() => {
    if (levelInfo?.level && previousLevel !== null && levelInfo.level !== previousLevel) {
      const newTierName = getUserTier(levelInfo.level).name;
      const oldTierName = getUserTier(previousLevel).name;
      
      if (newTierName !== oldTierName) {
        // Tier has changed, force refresh of spin status
        queryClient.invalidateQueries({ queryKey: ["/api/daily-spin/status"] });
        refetchSpinStatus();
        
        // Also force a reload of all related data
        queryClient.invalidateQueries({ queryKey: ["/api/user/level"] });
        queryClient.invalidateQueries({ queryKey: ["/api/level/rewards"] });
      }
    }
    if (levelInfo?.level) {
      setPreviousLevel(levelInfo.level);
    }
  }, [levelInfo?.level, previousLevel, refetchSpinStatus]);

  // Tier benefits data with raspadinha rewards
  const tierBenefits = [
    {
      tier: "Bronze",
      range: "Nível 2-24",
      color: "from-amber-600 to-amber-800",
      iconColor: "text-amber-600",
      levelReward: 5,
      benefits: [
        "Cashback Diário 1.5%",
        "Giro Diário Ativado",
        "Prêmios até 100 Raspadinhas",
        "5 Mania Bônus",
      ],
    },
    {
      tier: "Prata",
      range: "Nível 25-49",
      color: "from-gray-400 to-gray-600",
      iconColor: "text-gray-400",
      levelReward: 25,
      benefits: [
        "Cashback Diário 3%",
        "Upgrade do Giro Diário",
        "Prêmios até 200 Raspadinhas",
        "25 Mania Bônus",
      ],
    },
    {
      tier: "Ouro",
      range: "Nível 50-74",
      color: "from-yellow-400 to-yellow-600",
      iconColor: "text-yellow-400",
      levelReward: 75,
      benefits: [
        "Cashback Diário 6%",
        "Upgrade do Giro Diário",
        "Prêmios até 500 Raspadinhas",
        "75 Mania Bônus",
      ],
    },
    {
      tier: "Platina",
      range: "Nível 75-99",
      color: "from-gray-300 to-gray-500",
      iconColor: "text-gray-300",
      levelReward: 200,
      benefits: [
        "Cashback Diário 12%",
        "Upgrade do Giro Diário",
        "Prêmios até 1000 Raspadinhas",
        "200 Mania Bônus",
      ],
    },
    {
      tier: "Diamante",
      range: "Nível 100+",
      color: "from-cyan-400 to-blue-600",
      iconColor: "text-cyan-400",
      levelReward: 600,
      benefits: [
        "Cashback Diário 24%",
        "Upgrade do Giro Diário",
        "Prêmios até 5000 Raspadinhas",
        "600 Mania Bônus",
        "Benefícios Personalizados",
      ],
    },
  ];

  const isLoading = isLoadingLevel || isLoadingRewards;

  return (
    <MobileLayout>
      <div className="min-h-screen bg-gray-950 relative overflow-hidden">
        <div className="max-w-md md:max-w-3xl mx-auto relative z-10">
          {/* Modern Header */}
          <div className="relative mb-8 px-4 pt-6 md:pt-10">
            <div className="text-center">
              <h1 className="text-2xl md:text-4xl font-bold text-white mb-1 md:mb-2">
                Recompensas
              </h1>
              <p className="text-gray-400 text-sm md:text-lg">Sistema VIP de Benefícios</p>
            </div>
          </div>

          {/* Premium Tier Card */}
          {levelInfo && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="px-4 mb-6 md:mb-8"
            >
              <div className={`relative rounded-3xl overflow-hidden`}>
                {/* Animated Gradient Border */}
                <div
                  className={`absolute inset-0 bg-gradient-to-r ${currentTier.color} animate-gradient`}
                />

                {/* Inner Card */}
                <div className="relative bg-[#1a1f2e] m-[2px] rounded-3xl overflow-hidden">
                  {/* Pattern Background */}
                  <div className="absolute inset-0 opacity-5">
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.05) 10px, rgba(255,255,255,.05) 20px)`,
                      }}
                    />
                  </div>

                  <div className="relative p-6 md:p-8">
                    {/* Tier Badge */}
                    <div className="flex items-center justify-between mb-6">
                      <motion.div
                        className="flex items-center gap-3"
                        whileHover={{ scale: 1.05 }}
                      >
                        {/* Beautiful Medal Design */}
                        <div className="relative">
                          {/* Ribbon behind medal */}
                          <div
                            className={`absolute -left-2 -right-2 top-3 h-16 ${
                              currentTier.name === "Diamante"
                                ? "bg-gradient-to-r from-cyan-500 via-cyan-400 to-cyan-500"
                                : currentTier.name === "Platina"
                                  ? "bg-gradient-to-r from-gray-400 via-gray-300 to-gray-400"
                                  : currentTier.name === "Ouro"
                                    ? "bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500"
                                    : currentTier.name === "Prata"
                                      ? "bg-gradient-to-r from-gray-400 via-gray-300 to-gray-400"
                                      : currentTier.name === "Bronze"
                                        ? "bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600"
                                        : "bg-gradient-to-r from-gray-600 via-gray-500 to-gray-600"
                            } transform rotate-3 opacity-90`}
                          />

                          {/* Medal circle with metallic gradient */}
                          <div
                            className={`relative w-20 h-20 md:w-28 md:h-28 rounded-full shadow-2xl ${
                              currentTier.name === "Diamante"
                                ? "bg-gradient-to-br from-cyan-300 via-cyan-400 to-cyan-600"
                                : currentTier.name === "Platina"
                                  ? "bg-gradient-to-br from-gray-200 via-gray-300 to-gray-500"
                                  : currentTier.name === "Ouro"
                                    ? "bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-600"
                                    : currentTier.name === "Prata"
                                      ? "bg-gradient-to-br from-gray-300 via-gray-400 to-gray-600"
                                      : currentTier.name === "Bronze"
                                        ? "bg-gradient-to-br from-amber-500 via-amber-600 to-amber-800"
                                        : "bg-gradient-to-br from-gray-500 via-gray-600 to-gray-800"
                            } border-4 ${
                              currentTier.name === "Diamante"
                                ? "border-cyan-500"
                                : currentTier.name === "Platina"
                                  ? "border-gray-400"
                                  : currentTier.name === "Ouro"
                                    ? "border-yellow-500"
                                    : currentTier.name === "Prata"
                                      ? "border-gray-500"
                                      : currentTier.name === "Bronze"
                                        ? "border-amber-700"
                                        : "border-gray-700"
                            }`}
                          >
                            {/* Inner circle with darker shade */}
                            <div
                              className={`absolute inset-2 rounded-full ${
                                currentTier.name === "Diamante"
                                  ? "bg-gradient-to-br from-cyan-400 to-cyan-600"
                                  : currentTier.name === "Platina"
                                    ? "bg-gradient-to-br from-gray-300 to-gray-500"
                                    : currentTier.name === "Ouro"
                                      ? "bg-gradient-to-br from-yellow-400 to-yellow-600"
                                      : currentTier.name === "Prata"
                                        ? "bg-gradient-to-br from-gray-400 to-gray-600"
                                        : currentTier.name === "Bronze"
                                          ? "bg-gradient-to-br from-amber-600 to-amber-800"
                                          : "bg-gradient-to-br from-gray-600 to-gray-800"
                              } flex items-center justify-center`}
                            >
                              {/* Star icon in center */}
                              <Star className="w-8 h-8 md:w-12 md:h-12 text-white fill-white drop-shadow-lg" />
                            </div>

                            {/* Shine effect */}
                            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/40 via-transparent to-transparent" />
                          </div>
                        </div>

                        <div>
                          <h3 className="text-white font-bold text-xl md:text-2xl">
                            {currentTier.name}
                          </h3>
                          <p className="text-gray-400 text-sm md:text-base font-medium">
                            Nível {levelInfo.level}
                          </p>
                        </div>
                      </motion.div>

                      <div className="text-right">
                        <motion.div
                          className="text-3xl font-bold text-white"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", duration: 0.5 }}
                        >
                          {levelInfo.progress}%
                        </motion.div>
                        <p className="text-xs text-gray-400 font-medium">
                          Progresso
                        </p>
                      </div>
                    </div>

                    {/* Modern Progress Bar */}
                    <div className="relative mb-6">
                      <div className="bg-black/40 rounded-full h-4 overflow-hidden backdrop-blur-sm">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${levelInfo.progress}%` }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                          className={`h-full bg-gradient-to-r ${currentTier.color} relative overflow-hidden`}
                        >
                          {/* Shimmer effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                        </motion.div>
                      </div>
                    </div>

                    {/* Tier Level Requirements Card */}
                    <motion.div
                      className="bg-gradient-to-r from-gray-900/60 to-gray-800/60 rounded-2xl p-4 backdrop-blur-sm border border-gray-700/50 relative overflow-hidden"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.01 }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-white/10 rounded-lg">
                            <Trophy className="w-4 h-4 text-[#00E880]" />
                          </div>
                          <span className="text-white font-bold text-sm">Dica:</span>
                        </div>
                        <p className="text-gray-300 text-sm flex-1 text-right">
                          Raspe mais para subir!
                        </p>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Modern Tab Navigation */}
          <motion.div
            className="px-4 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-1.5 md:p-2 flex gap-1 md:gap-2">
              <button
                onClick={() => setActiveTab("spin")}
                className={`flex-1 py-3 md:py-4 px-2 md:px-3 rounded-xl font-semibold transition-all duration-300 ${
                  activeTab === "spin"
                    ? "bg-gradient-to-r from-[#00E880] to-[#00C870] text-black shadow-xl transform scale-[1.02]"
                    : "bg-gray-800/50 text-gray-300 hover:text-white hover:bg-gray-700/50 border border-gray-700"
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  <Timer
                    className={`w-4 h-4 md:w-5 md:h-5 flex-shrink-0 ${activeTab === "spin" ? "animate-pulse" : ""}`}
                  />
                  <span className="text-xs md:text-sm whitespace-nowrap">Giro Diário</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab("cashback")}
                className={`flex-1 py-3 md:py-4 px-2 md:px-3 rounded-xl font-semibold transition-all duration-300 ${
                  activeTab === "cashback"
                    ? "bg-gradient-to-r from-[#00E880] to-[#00C870] text-black shadow-xl transform scale-[1.02]"
                    : "bg-gray-800/50 text-gray-300 hover:text-white hover:bg-gray-700/50 border border-gray-700"
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  <DollarSign
                    className={`w-4 h-4 md:w-5 md:h-5 flex-shrink-0 ${activeTab === "cashback" ? "animate-pulse" : ""}`}
                  />
                  <span className="text-xs md:text-sm whitespace-nowrap">Cashback</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab("benefits")}
                className={`flex-1 py-3 md:py-4 px-2 md:px-3 rounded-xl font-semibold transition-all duration-300 ${
                  activeTab === "benefits"
                    ? "bg-gradient-to-r from-[#00E880] to-[#00C870] text-black shadow-xl transform scale-[1.02]"
                    : "bg-gray-800/50 text-gray-300 hover:text-white hover:bg-gray-700/50 border border-gray-700"
                }`}
              >
                <div className="flex items-center justify-center gap-1">
                  <Crown
                    className={`w-4 h-4 md:w-5 md:h-5 flex-shrink-0 ${activeTab === "benefits" ? "animate-pulse" : ""}`}
                  />
                  <span className="text-xs md:text-sm whitespace-nowrap">Benefícios</span>
                </div>
              </button>
            </div>
          </motion.div>

          {/* Tab Content */}
          <div className="px-4 pb-24">
            <AnimatePresence mode="wait">
              {activeTab === "spin" && (
                <motion.div
                  key="spin"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <DailySpinSection
                    toast={toast}
                    tier={spinStatus?.tier || "bronze"}
                    level={spinStatus?.level || 1}
                  />
                </motion.div>
              )}

              {activeTab === "benefits" && (
                <motion.div
                  key="benefits"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Clean Header */}
                  <motion.div
                    className="text-center mb-6"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <h2 className="text-3xl font-bold text-white mb-2">
                      Benefícios VIP
                    </h2>
                    <p className="text-gray-400 text-base">
                      Suba de nível e desbloqueie recompensas exclusivas
                    </p>
                  </motion.div>
                  
                  <motion.div className="space-y-4">
                    {tierBenefits.map((tier, index) => {
                      // Determinar se este é o tier atual do usuário
                      const userLevel = levelInfo?.level || 1;
                      let isCurrentTier = false;
                      
                      if (tier.tier === "Bronze" && userLevel >= 2 && userLevel <= 24) {
                        isCurrentTier = true;
                      } else if (tier.tier === "Prata" && userLevel >= 25 && userLevel <= 49) {
                        isCurrentTier = true;
                      } else if (tier.tier === "Ouro" && userLevel >= 50 && userLevel <= 74) {
                        isCurrentTier = true;
                      } else if (tier.tier === "Platina" && userLevel >= 75 && userLevel <= 99) {
                        isCurrentTier = true;
                      } else if (tier.tier === "Diamante" && userLevel >= 100) {
                        isCurrentTier = true;
                      }
                      
                      return (
                        <motion.div
                          key={tier.tier}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                        >
                          <div
                            className={`relative bg-black/40 backdrop-blur-xl rounded-3xl p-6 md:p-8 border-2 transition-all group ${
                              tier.tier === "Bronze"
                                ? "border-amber-600/50 hover:border-amber-600"
                                : tier.tier === "Prata"
                                  ? "border-gray-400/50 hover:border-gray-400"
                                  : tier.tier === "Ouro"
                                    ? "border-yellow-400/50 hover:border-yellow-400"
                                    : tier.tier === "Platina"
                                      ? "border-gray-300/50 hover:border-gray-300"
                                      : tier.tier === "Diamante"
                                        ? "border-cyan-400/50 hover:border-cyan-400"
                                        : "border-white/10 hover:border-white/20"
                            }`}
                          >
                            {/* Selo "Atual" no canto superior direito */}
                            {isCurrentTier && (
                              <div className="absolute -top-2 -right-2 z-10">
                                <div className="relative">
                                  {/* Selo com formato de estrela/distintivo */}
                                  <div className="relative w-12 h-12 bg-gradient-to-br from-[#00E880] via-[#00D870] to-[#00C860] rounded-full shadow-xl flex items-center justify-center transform rotate-12 hover:rotate-0 transition-transform duration-300 p-[2px]">
                                    {/* Centro preto */}
                                    <div className="absolute inset-[3px] bg-black rounded-full"></div>
                                    
                                    {/* Bordas serrilhadas como selo */}
                                    <div className="absolute inset-0 rounded-full">
                                      <svg className="w-full h-full" viewBox="0 0 100 100">
                                        <defs>
                                          <path id="circle" d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"/>
                                        </defs>
                                        <circle cx="50" cy="50" r="47" fill="none" stroke="black" strokeWidth="1" strokeDasharray="3 2" opacity="0.3"/>
                                        <circle cx="50" cy="50" r="42" fill="none" stroke="black" strokeWidth="0.5" strokeDasharray="2 1" opacity="0.2"/>
                                      </svg>
                                    </div>
                                    
                                    {/* Conteúdo do selo */}
                                    <div className="relative flex flex-col items-center justify-center z-10">
                                      <Star className="w-2.5 h-2.5 text-[#00E880] mb-0.5" fill="currentColor" />
                                      <span className="text-[#00E880] text-[8px] font-black tracking-wide">ATUAL</span>
                                    </div>
                                    
                                    {/* Brilho animado */}
                                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-[#00E880]/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                                    
                                    {/* Efeito de pulso */}
                                    <div className="absolute inset-0 rounded-full animate-ping bg-[#00E880]/20"></div>
                                  </div>
                                </div>
                              </div>
                            )}
                          <motion.div
                            className="flex items-start gap-4 mb-6"
                            whileHover={{ scale: 1.02 }}
                          >
                            {/* Beautiful Medal Design */}
                            <div className="relative">
                              {/* Ribbon behind medal */}
                              <div
                                className={`absolute -left-1 -right-1 top-2 h-12 ${
                                  tier.tier === "Diamante"
                                    ? "bg-gradient-to-r from-cyan-500 via-cyan-400 to-cyan-500"
                                    : tier.tier === "Platina"
                                      ? "bg-gradient-to-r from-gray-400 via-gray-300 to-gray-400"
                                      : tier.tier === "Ouro"
                                        ? "bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500"
                                        : tier.tier === "Prata"
                                          ? "bg-gradient-to-r from-gray-400 via-gray-300 to-gray-400"
                                          : "bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600"
                                } transform rotate-3 opacity-80`}
                              />

                              {/* Medal circle with metallic gradient */}
                              <div
                                className={`relative w-16 h-16 md:w-20 md:h-20 rounded-full shadow-2xl ${
                                  tier.tier === "Diamante"
                                    ? "bg-gradient-to-br from-cyan-300 via-cyan-400 to-cyan-600"
                                    : tier.tier === "Platina"
                                      ? "bg-gradient-to-br from-gray-200 via-gray-300 to-gray-500"
                                      : tier.tier === "Ouro"
                                        ? "bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-600"
                                        : tier.tier === "Prata"
                                          ? "bg-gradient-to-br from-gray-300 via-gray-400 to-gray-600"
                                          : "bg-gradient-to-br from-amber-500 via-amber-600 to-amber-800"
                                } border-[3px] ${
                                  tier.tier === "Diamante"
                                    ? "border-cyan-500"
                                    : tier.tier === "Platina"
                                      ? "border-gray-400"
                                      : tier.tier === "Ouro"
                                        ? "border-yellow-500"
                                        : tier.tier === "Prata"
                                          ? "border-gray-500"
                                          : "border-amber-700"
                                }`}
                              >
                                {/* Inner circle with darker shade */}
                                <div
                                  className={`absolute inset-1.5 rounded-full ${
                                    tier.tier === "Diamante"
                                      ? "bg-gradient-to-br from-cyan-400 to-cyan-600"
                                      : tier.tier === "Platina"
                                        ? "bg-gradient-to-br from-gray-300 to-gray-500"
                                        : tier.tier === "Ouro"
                                          ? "bg-gradient-to-br from-yellow-400 to-yellow-600"
                                          : tier.tier === "Prata"
                                            ? "bg-gradient-to-br from-gray-400 to-gray-600"
                                            : "bg-gradient-to-br from-amber-600 to-amber-800"
                                  } flex items-center justify-center`}
                                >
                                  {/* Star icon in center */}
                                  <Star className="w-6 h-6 md:w-8 md:h-8 text-white fill-white drop-shadow-lg" />
                                </div>

                                {/* Shine effect */}
                                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/40 via-transparent to-transparent" />
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-white font-bold text-xl md:text-2xl">
                                  {tier.tier}
                                </h3>
                                <span className="px-3 py-1 bg-white/10 rounded-full text-xs md:text-sm font-medium text-gray-300 backdrop-blur-sm">
                                  {tier.range}
                                </span>
                              </div>
                              <motion.div className="space-y-3">
                                {tier.benefits.map((benefit, idx) => (
                                  <motion.div
                                    key={idx}
                                    className="flex items-center gap-3"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 + idx * 0.05 }}
                                  >
                                    <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-gradient-to-r from-[#00E880] to-[#00C870] shadow-lg shadow-[#00E880]/50" />
                                    <span className="text-gray-300 text-sm md:text-base font-medium">
                                      {benefit}
                                    </span>
                                  </motion.div>
                                ))}
                              </motion.div>
                            </div>
                          </motion.div>

                          {/* Tier Reward Claim Button - Always visible */}
                          <motion.div className="pt-4 border-t border-white/10">
                            {(() => {
                              const tierConfig = {
                                Bronze: { level: 2, bonus: 5 },
                                Prata: { level: 25, bonus: 25 },
                                Ouro: { level: 50, bonus: 75 },
                                Platina: { level: 75, bonus: 200 },
                                Diamante: { level: 100, bonus: 600 },
                              };

                              const config =
                                tierConfig[
                                  tier.tier as keyof typeof tierConfig
                                ];
                              if (!config) return null;

                              const requiredLevel = config.level;
                              const bonusAmount = config.bonus;
                              const hasLevel =
                                levelInfo && levelInfo.level >= requiredLevel;
                              const hasClaimed = hasClaimedTierReward(
                                tier.tier,
                                requiredLevel,
                              );

                              // Show "Redeemed" if already claimed
                              if (hasClaimed) {
                                return (
                                  <div className="w-full bg-gray-800/50 text-gray-400 font-bold py-3 rounded-2xl flex items-center justify-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-[#00E880]" />
                                    <span>Resgatado</span>
                                  </div>
                                );
                              }

                              // Show active button if has required level
                              if (hasLevel) {
                                return (
                                  <motion.button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleClaimTierReward(
                                        tier.tier,
                                        bonusAmount,
                                        requiredLevel,
                                      );
                                    }}
                                    className="w-full bg-gradient-to-r from-[#00E880] to-[#00C870] text-black font-bold py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all relative overflow-hidden group"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    disabled={claimingLevel === requiredLevel}
                                  >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                    <div className="relative flex items-center justify-center gap-2">
                                      <Gift className="w-5 h-5" />
                                      <span>
                                        {claimingLevel === requiredLevel
                                          ? "Resgatando..."
                                          : `Resgatar ${bonusAmount} Raspadinhas`}
                                      </span>
                                    </div>
                                  </motion.button>
                                );
                              }

                              // Show locked button if doesn't have required level
                              return (
                                <div className="w-full bg-gray-900/60 border border-gray-700 text-gray-500 font-bold py-3 rounded-2xl flex items-center justify-center gap-2 cursor-not-allowed">
                                  <Lock className="w-5 h-5" />
                                  <span>Nível {requiredLevel} Necessário</span>
                                </div>
                              );
                            })()}
                          </motion.div>
                        </div>
                      </motion.div>
                    );
                  })}
                  </motion.div>
                </motion.div>
              )}

              {activeTab === "cashback" && (
                <motion.div
                  key="cashback"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  {/* Clean Header */}
                  <motion.div
                    className="text-center mb-6"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <h2 className="text-3xl font-bold text-white mb-2">
                      Cashback Diário
                    </h2>
                    <p className="text-gray-400 text-base">
                      Receba de volta parte das raspadinhas não premiadas
                    </p>
                  </motion.div>

                  {/* Cashback Status Card */}
                  {cashbackStatus && cashbackStatus.hasCashbackToday ? (
                    <motion.div
                      className="bg-gradient-to-br from-zinc-900 via-gray-900 to-black rounded-3xl p-6 border border-gray-800 relative overflow-hidden"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-[#00E880]/10 via-transparent to-transparent opacity-50" />
                      
                      <div className="relative">
                        <h3 className="text-xl font-bold text-white mb-4">Cashback Disponível</h3>
                        
                        <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-[#00E880]/30">
                          <div className="flex items-center justify-between mb-6">
                            <div>
                              <p className="text-gray-400 text-sm mb-1">Valor Disponível</p>
                              <p className="text-white font-bold text-3xl">
                                R$ {cashbackStatus.cashbackAmount.toFixed(2).replace(".", ",")}
                              </p>
                              {cashbackHistory && cashbackHistory.length > 0 && (
                                <p className="text-gray-400 text-xs mt-2 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Cashback do dia anterior
                                </p>
                              )}
                            </div>
                            <div className="p-3 bg-gradient-to-br from-[#00E880]/20 to-[#00C870]/20 rounded-full">
                              <DollarSign className="w-8 h-8 text-[#00E880]" />
                            </div>
                          </div>

                          {cashbackStatus.status === 'pending' ? (
                            <motion.button
                              onClick={() => claimCashbackMutation.mutate()}
                              className="w-full bg-gradient-to-r from-[#00E880] to-[#00C870] text-black font-bold py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all relative overflow-hidden group"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              disabled={claimCashbackMutation.isPending}
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                              <div className="relative flex items-center justify-center gap-2">
                                <Gift className="w-5 h-5" />
                                <span>
                                  {claimCashbackMutation.isPending ? "Resgatando..." : "Resgatar Cashback"}
                                </span>
                              </div>
                            </motion.button>
                          ) : (
                            <div className="w-full bg-gray-800/50 text-gray-400 font-bold py-4 rounded-2xl flex flex-col items-center justify-center gap-1">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-[#00E880]" />
                                <span>Cashback Resgatado</span>
                              </div>
                              {cashbackHistory && cashbackHistory.length > 0 && cashbackHistory[0].creditedAt && (
                                <span className="text-xs text-gray-500">
                                  {(() => {
                                    const creditedDate = new Date(cashbackHistory[0].creditedAt);
                                    const today = new Date();
                                    const yesterday = new Date(today);
                                    yesterday.setDate(today.getDate() - 1);
                                    
                                    const isToday = creditedDate.toDateString() === today.toDateString();
                                    const isYesterday = creditedDate.toDateString() === yesterday.toDateString();
                                    
                                    const timeStr = creditedDate.toLocaleTimeString('pt-BR', { 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    });
                                    
                                    if (isToday) {
                                      return `Resgatado hoje às ${timeStr}`;
                                    } else if (isYesterday) {
                                      return `Resgatado ontem às ${timeStr}`;
                                    } else {
                                      return `Resgatado em ${creditedDate.toLocaleDateString('pt-BR')}`;
                                    }
                                  })()}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      className="bg-gradient-to-br from-zinc-900 via-gray-900 to-black rounded-3xl p-6 border border-gray-800"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <div className="text-center py-8">
                        <div className="p-4 bg-gray-800/50 rounded-full inline-block mb-4">
                          <Timer className="w-12 h-12 text-gray-500" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Sem Cashback Disponível</h3>
                        <p className="text-gray-400">
                          O cashback é calculado diariamente às 00:00
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Cashback History Section */}
                  <motion.div
                    className="bg-gradient-to-br from-zinc-900 via-gray-900 to-black rounded-3xl p-6 border border-gray-800"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <History className="w-5 h-5 text-[#00E880]" />
                        Histórico de Cashback
                      </h3>
                    </div>

                    {/* Date Filters */}
                    <div className="mb-4">
                      <div className="flex space-x-2 bg-gray-800/50 p-1 rounded-xl">
                        {[
                          { label: 'Hoje', value: 'today' },
                          { label: 'Esta Semana', value: 'week' },
                          { label: 'Este Mês', value: 'month' },
                          { label: 'Todos', value: 'all' }
                        ].map((filter) => (
                          <button
                            key={filter.value}
                            onClick={() => setHistoryFilter(filter.value)}
                            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300 ${
                              historyFilter === filter.value
                                ? 'bg-[#00E880] text-black shadow-lg'
                                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                            }`}
                          >
                            {filter.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-3 h-[28rem] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800/50">
                      {filteredCashbackHistory && filteredCashbackHistory.length > 0 ? (
                        filteredCashbackHistory.map((cashback) => {
                          const tierColors = {
                            bronze: "from-amber-600/20 to-orange-500/20",
                            silver: "from-gray-400/20 to-gray-300/20",
                            gold: "from-yellow-400/20 to-yellow-500/20",
                            platinum: "from-gray-300/20 to-gray-200/20",
                            diamond: "from-cyan-400/20 to-cyan-300/20",
                          };

                          const statusColors = {
                            pending: "bg-yellow-500/20 text-yellow-400",
                            credited: "bg-green-500/20 text-green-400",
                            expired: "bg-red-500/20 text-red-400",
                          };

                          const getStatusText = (status: string, creditedAt?: string) => {
                            if (status === 'credited' && creditedAt) {
                              const creditedDate = new Date(creditedAt);
                              const today = new Date();
                              const yesterday = new Date(today);
                              yesterday.setDate(today.getDate() - 1);
                              
                              const isToday = creditedDate.toDateString() === today.toDateString();
                              const isYesterday = creditedDate.toDateString() === yesterday.toDateString();
                              
                              const timeStr = creditedDate.toLocaleTimeString('pt-BR', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              });
                              
                              if (isToday) {
                                return `Resgatado hoje às ${timeStr}`;
                              } else if (isYesterday) {
                                return `Resgatado ontem às ${timeStr}`;
                              } else {
                                return `Resgatado em ${creditedDate.toLocaleDateString('pt-BR')}`;
                              }
                            }
                            if (status === 'pending') return 'Disponível';
                            if (status === 'expired') return 'Expirado';
                            return status;
                          };

                          return (
                            <div
                              key={cashback.id}
                              className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl p-4 border border-gray-700/30 hover:border-gray-600/50 transition-all duration-300"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                                <div className="flex items-center gap-3">
                                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${tierColors[cashback.tier.toLowerCase() as keyof typeof tierColors] || tierColors.bronze}`}>
                                    <DollarSign className="w-6 h-6 text-white" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-white font-semibold">
                                      Cashback {cashback.tier.charAt(0).toUpperCase() + cashback.tier.slice(1)}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                      <Calendar className="w-3 h-3" />
                                      <span>
                                        {new Date(cashback.calculationDate).toLocaleDateString('pt-BR', {
                                          day: '2-digit',
                                          month: '2-digit',
                                          year: 'numeric'
                                        })}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-medium self-start ${statusColors[cashback.status]}`}>
                                  {getStatusText(cashback.status, cashback.creditedAt)}
                                </div>
                              </div>

                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div>
                                  <p className="text-2xl font-bold text-white">
                                    R$ {parseFloat(cashback.cashbackAmount).toFixed(2).replace(".", ",")}
                                  </p>
                                </div>
                                <div className="flex flex-col items-start sm:items-end gap-1">
                                  {cashback.status === 'expired' && (
                                    <div className="flex items-center gap-1 text-xs text-red-400">
                                      <AlertCircle className="w-3 h-3" />
                                      <span>Não resgatado</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-12">
                          <History className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                          <p className="text-gray-400">
                            {historyFilter === 'today' ? 'Nenhum cashback hoje' :
                             historyFilter === 'week' ? 'Nenhum cashback esta semana' :
                             historyFilter === 'month' ? 'Nenhum cashback este mês' :
                             'Nenhum histórico de cashback disponível'}
                          </p>
                          {historyFilter === 'all' && (
                            <p className="text-xs text-gray-500 mt-1">
                              O histórico aparecerá aqui após o primeiro cálculo
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>

                  {/* How It Works */}
                  <motion.div
                    className="bg-gradient-to-br from-zinc-900 via-gray-900 to-black rounded-3xl p-6 border border-gray-800"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <h3 className="text-xl font-bold text-white mb-4">Como Funciona</h3>
                    
                    <div className="space-y-4">
                      <div className="flex gap-4">
                        <div className="p-2 bg-[#00E880]/20 rounded-lg h-fit">
                          <Coins className="w-5 h-5 text-[#00E880]" />
                        </div>
                        <div>
                          <h4 className="text-white font-semibold mb-1">Seu Cashback Atual</h4>
                          <p className="text-gray-400 text-sm">
                            {cashbackStatus ? (
                              <>
                                Você está no nível <span className="text-[#00E880] font-bold capitalize">{cashbackStatus.tier}</span> e recebe <span className="text-[#00E880] font-bold">{cashbackStatus.percentage}%</span> de cashback diário
                              </>
                            ) : (
                              "Carregando informações de cashback..."
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="p-2 bg-[#00E880]/20 rounded-lg h-fit">
                          <Target className="w-5 h-5 text-[#00E880]" />
                        </div>
                        <div>
                          <h4 className="text-white font-semibold mb-1">Como Funciona</h4>
                          <p className="text-gray-400 text-sm">
                            Baseado nos seus depósitos e saques, você recebe uma porcentagem de volta por raspadinhas não premiadas
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <div className="p-2 bg-[#00E880]/20 rounded-lg h-fit">
                          <Gem className="w-5 h-5 text-[#00E880]" />
                        </div>
                        <div>
                          <h4 className="text-white font-semibold mb-1">Processamento Automático</h4>
                          <p className="text-gray-400 text-sm">
                            O cashback é calculado e disponibilizado automaticamente todos os dias às 00:00
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}

// Daily Spin Component with Tier System
function DailySpinSection({
  toast,
  tier,
  level,
}: {
  toast: any;
  tier: string;
  level: number;
}) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [showWin, setShowWin] = useState(false);
  const [wonAmount, setWonAmount] = useState(0);
  const [, setLocation] = useLocation();
  const [initialRotationSet, setInitialRotationSet] = useState(false);
  const [previousTier, setPreviousTier] = useState<string | null>(null);

  // Query daily spin status with polling for updates
  const { data: spinStatus, refetch: refetchSpinStatus } = useQuery<{
    canSpin: boolean;
    tier: string;
    level: number;
    lastSpin: {
      amount: number;
      spunAt: string;
    } | null;
  }>({
    queryKey: ["/api/daily-spin/status"],
    refetchInterval: 1000, // Poll every 1 second for faster updates
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't keep cache
  });

  // Track tier changes and force refresh
  useEffect(() => {
    if (tier && previousTier && tier !== previousTier) {
      console.log("DailySpinSection: Tier changed from", previousTier, "to", tier);
      queryClient.invalidateQueries({ queryKey: ["/api/daily-spin/status"] });
      refetchSpinStatus();
    }
    setPreviousTier(tier);
  }, [tier, previousTier, refetchSpinStatus]);

  // Get tier-specific prizes with correct values
  const getTierPrizes = () => {
    switch (tier) {
      case "diamond":
        return [
          { value: 10, color: "#67E8F9", label: "10", displayLabel: "10" },
          { value: 30, color: "#22D3EE", label: "30", displayLabel: "30" },
          { value: 50, color: "#0EA5E9", label: "50", displayLabel: "50" },
          { value: 100, color: "#0284C7", label: "100", displayLabel: "100" },
          {
            value: 1000,
            color: "#0369A1",
            label: "1000",
            displayLabel: "1000",
          },
        ];
      case "platinum":
        return [
          { value: 5, color: "#E5E7EB", label: "5", displayLabel: "5" },
          { value: 15, color: "#D1D5DB", label: "15", displayLabel: "15" },
          { value: 25, color: "#9CA3AF", label: "25", displayLabel: "25" },
          { value: 50, color: "#6B7280", label: "50", displayLabel: "50" },
          { value: 500, color: "#4B5563", label: "500", displayLabel: "500" },
        ];
      case "gold":
        return [
          { value: 4, color: "#FDE047", label: "4", displayLabel: "4" },
          { value: 12, color: "#FACC15", label: "12", displayLabel: "12" },
          { value: 25, color: "#EAB308", label: "25", displayLabel: "25" },
          { value: 50, color: "#CA8A04", label: "50", displayLabel: "50" },
          { value: 500, color: "#A16207", label: "500", displayLabel: "500" },
        ];
      case "silver":
        return [
          { value: 2, color: "#E5E7EB", label: "2", displayLabel: "2" },
          { value: 6, color: "#D1D5DB", label: "6", displayLabel: "6" },
          { value: 10, color: "#9CA3AF", label: "10", displayLabel: "10" },
          { value: 20, color: "#6B7280", label: "20", displayLabel: "20" },
          { value: 200, color: "#4B5563", label: "200", displayLabel: "200" },
        ];
      case "bronze":
        return [
          { value: 1, color: "#FED7AA", label: "1", displayLabel: "1" },
          { value: 3, color: "#FDBA74", label: "3", displayLabel: "3" },
          { value: 5, color: "#FB923C", label: "5", displayLabel: "5" },
          { value: 10, color: "#F97316", label: "10", displayLabel: "10" },
          { value: 100, color: "#EA580C", label: "100", displayLabel: "100" },
        ];
      default: // norank - same values as bronze but with gray colors
        return [
          { value: 1, color: "#9CA3AF", label: "1", displayLabel: "1" },
          { value: 3, color: "#6B7280", label: "3", displayLabel: "3" },
          { value: 5, color: "#4B5563", label: "5", displayLabel: "5" },
          { value: 10, color: "#374151", label: "10", displayLabel: "10" },
          { value: 100, color: "#1F2937", label: "100", displayLabel: "100" },
        ];
    }
  };

  const segments = getTierPrizes();

  // State for rotation
  const [rotation, setRotation] = useState(0);

  // Calculate and set initial rotation based on last spin
  useEffect(() => {
    if (spinStatus?.lastSpin && !isSpinning) {
      const lastAmount = spinStatus.lastSpin.amount;
      const segmentIndex = segments.findIndex((s) => s.value === lastAmount);
      if (segmentIndex !== -1) {
        const segmentAngle = 360 / segments.length;
        // Use same calculation as spin for consistency - center the segment
        let targetRotation = -(segmentIndex * segmentAngle) - segmentAngle / 2;
        if (targetRotation < 0) {
          targetRotation = 360 + targetRotation;
        }

        setRotation(targetRotation);
      }
    }
  }, [spinStatus?.lastSpin, segments, isSpinning]);

  const getTierColors = () => {
    switch (tier) {
      case "diamond":
        return {
          primary: "#B9F2FF",
          secondary: "#4A90E2",
          gradient: "from-cyan-400 to-blue-600",
        };
      case "platinum":
        return {
          primary: "#E5E4E2",
          secondary: "#9CA3AF",
          gradient: "from-gray-300 to-gray-500",
        };
      case "gold":
        return {
          primary: "#FFD700",
          secondary: "#FFA500",
          gradient: "from-yellow-400 to-yellow-600",
        };
      case "silver":
        return {
          primary: "#C0C0C0",
          secondary: "#808080",
          gradient: "from-gray-400 to-gray-600",
        };
      case "bronze":
        return {
          primary: "#CD7F32",
          secondary: "#8B4513",
          gradient: "from-amber-600 to-amber-800",
        };
      default: // norank
        return {
          primary: "#808080",
          secondary: "#606060",
          gradient: "from-gray-600 to-gray-800",
        };
    }
  };

  const tierColors = getTierColors();

  const handleSpin = async () => {
    if (!spinStatus?.canSpin || isSpinning) return;

    setIsSpinning(true);
    setShowWin(false);

    try {
      const response = await apiRequest("/api/daily-spin/spin", "POST");
      const wonValue = response.amount;
      setWonAmount(wonValue);

      // Find segment with this value
      const segmentIndex = segments.findIndex((s) => s.value === wonValue);
      if (segmentIndex === -1) {
        console.error("Value not found in segments:", wonValue);
        return;
      }

      const segmentAngle = 360 / segments.length;

      // The segments are drawn starting from -90 degrees (top) and going clockwise
      // To bring a segment to the top, we need to rotate the wheel counter-clockwise
      // by the amount that segment is offset from the top

      // Calculate how much to rotate to bring this segment to the top
      // We need to add half a segment angle to center it properly
      // because the segment starts at the edge, not the center
      let targetRotation = -(segmentIndex * segmentAngle) - segmentAngle / 2;

      // Normalize to positive rotation (we'll rotate clockwise the long way)
      if (targetRotation < 0) {
        targetRotation = 360 + targetRotation;
      }

      // Add multiple full rotations for effect (5 full spins)
      const spins = 5;
      const currentRotation = rotation % 360;
      const rotationDiff = targetRotation - currentRotation;
      const adjustedDiff = rotationDiff < 0 ? rotationDiff + 360 : rotationDiff;
      const finalRotation = rotation + spins * 360 + adjustedDiff;


      setRotation(finalRotation);

      // Show win modal after animation
      setTimeout(() => {
        setIsSpinning(false);
        setShowWin(true);
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });

        // Invalidate queries to refresh balance and spin status
        queryClient.invalidateQueries({ queryKey: ["/api/user/balance"] });
        queryClient.invalidateQueries({ queryKey: ["/api/daily-spin/status"] });
      }, 3500);
    } catch (error: any) {
      setIsSpinning(false);
      toast({
        title: "Erro",
        description: error.message || "Erro ao girar a roleta",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Clean Header */}
      <motion.div
        className="text-center mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-3xl font-bold text-white mb-2">
          Roleta Diária
        </h2>
        <p className="text-gray-400 text-base">
          Gire e ganhe prêmios incríveis todos os dias
        </p>
      </motion.div>
      {/* Beautiful Wheel Container */}
      <motion.div
        className="relative mx-auto mb-8"
        style={{ width: "340px", height: "340px" }}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2, type: "spring" }}
      >
        {/* Tier-Specific Glow Effects */}
        <div className="absolute inset-[-20px] rounded-full">
          <div
            className={`absolute inset-0 rounded-full opacity-30 blur-3xl animate-spin-slow ${
              tier === "diamond"
                ? "bg-gradient-conic from-cyan-400 via-blue-500 via-cyan-500 via-blue-400 to-cyan-400"
                : tier === "platinum"
                  ? "bg-gradient-conic from-gray-300 via-white via-gray-400 via-gray-300 to-gray-300"
                  : tier === "gold"
                    ? "bg-gradient-conic from-yellow-400 via-amber-500 via-yellow-500 via-amber-400 to-yellow-400"
                    : tier === "silver"
                      ? "bg-gradient-conic from-gray-400 via-gray-300 via-white via-gray-400 to-gray-400"
                      : tier === "bronze"
                        ? "bg-gradient-conic from-amber-600 via-orange-500 via-amber-500 via-orange-600 to-amber-600"
                        : "bg-gradient-conic from-gray-600 via-gray-500 via-gray-600 via-gray-500 to-gray-600"
            }`}
          />
          {isSpinning && (
            <>
              <motion.div
                className={`absolute inset-0 rounded-full blur-3xl ${
                  tier === "diamond"
                    ? "bg-gradient-to-r from-cyan-400/40 via-blue-500/30 to-cyan-500/40"
                    : tier === "platinum"
                      ? "bg-gradient-to-r from-gray-300/40 via-white/30 to-gray-400/40"
                      : tier === "gold"
                        ? "bg-gradient-to-r from-yellow-400/40 via-amber-500/30 to-yellow-500/40"
                        : tier === "silver"
                          ? "bg-gradient-to-r from-gray-400/40 via-gray-300/30 to-gray-500/40"
                          : tier === "bronze"
                            ? "bg-gradient-to-r from-amber-600/40 via-orange-500/30 to-amber-700/40"
                            : "bg-gradient-to-r from-gray-600/40 via-gray-500/30 to-gray-700/40"
                }`}
                animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
              <motion.div
                className="absolute inset-0 rounded-full"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <div
                  className={`w-full h-full rounded-full ${
                    tier === "diamond"
                      ? "bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"
                      : tier === "platinum"
                        ? "bg-gradient-to-r from-transparent via-gray-300/30 to-transparent"
                        : tier === "gold"
                          ? "bg-gradient-to-r from-transparent via-yellow-400/30 to-transparent"
                          : tier === "silver"
                            ? "bg-gradient-to-r from-transparent via-gray-400/30 to-transparent"
                            : tier === "bronze"
                              ? "bg-gradient-to-r from-transparent via-amber-600/30 to-transparent"
                              : "bg-gradient-to-r from-transparent via-gray-600/30 to-transparent"
                  }`}
                />
              </motion.div>
            </>
          )}
        </div>

        {/* Pointer Arrow at Top */}
        <div className="absolute top-[-5px] left-1/2 transform -translate-x-1/2 z-30">
          <motion.div
            className="relative"
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <div
              className={`w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[35px] ${
                tier === "diamond"
                  ? "border-t-cyan-400"
                  : tier === "platinum"
                    ? "border-t-gray-300"
                    : tier === "gold"
                      ? "border-t-yellow-400"
                      : tier === "silver"
                        ? "border-t-gray-400"
                        : tier === "bronze"
                          ? "border-t-amber-600"
                          : "border-t-gray-600"
              } drop-shadow-2xl`}
            />
            <div
              className={`absolute top-[-15px] left-1/2 transform -translate-x-1/2 w-3 h-3 rounded-full ${
                tier === "diamond"
                  ? "bg-cyan-400"
                  : tier === "platinum"
                    ? "bg-gray-300"
                    : tier === "gold"
                      ? "bg-yellow-400"
                      : tier === "silver"
                        ? "bg-gray-400"
                        : tier === "bronze"
                          ? "bg-amber-600"
                          : "bg-gray-600"
              } shadow-lg`}
            />
          </motion.div>
        </div>

        {/* Beautiful Outer Ring */}
        <div
          className={`absolute inset-0 rounded-full p-[4px] shadow-2xl ${
            tier === "diamond"
              ? "bg-gradient-to-br from-cyan-300 via-cyan-400 to-cyan-500"
              : tier === "platinum"
                ? "bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400"
                : tier === "gold"
                  ? "bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500"
                  : tier === "silver"
                    ? "bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500"
                    : tier === "bronze"
                      ? "bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700"
                      : "bg-gradient-to-br from-gray-500 via-gray-600 to-gray-700"
          }`}
        >
          <div className="w-full h-full rounded-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-[3px]">
            {/* Inner Decorative Ring */}
            <div
              className={`w-full h-full rounded-full p-[2px] ${
                tier === "diamond"
                  ? "bg-gradient-to-br from-cyan-400/20 via-blue-500/10 to-cyan-500/20"
                  : tier === "platinum"
                    ? "bg-gradient-to-br from-gray-300/20 via-white/10 to-gray-400/20"
                    : tier === "gold"
                      ? "bg-gradient-to-br from-yellow-400/20 via-amber-500/10 to-yellow-500/20"
                      : tier === "silver"
                        ? "bg-gradient-to-br from-gray-400/20 via-gray-300/10 to-gray-500/20"
                        : tier === "bronze"
                          ? "bg-gradient-to-br from-amber-600/20 via-orange-500/10 to-amber-700/20"
                          : "bg-gradient-to-br from-gray-600/20 via-gray-500/10 to-gray-700/20"
              }`}
            >
              <div className="w-full h-full rounded-full bg-gradient-radial from-gray-800 to-gray-950 relative overflow-hidden shadow-inner">
                <svg
                  viewBox="0 0 300 300"
                  className="w-full h-full"
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    transition: isSpinning
                      ? "transform 3.5s cubic-bezier(0.23, 1, 0.320, 1)"
                      : "transform 0.3s ease-out",
                  }}
                >
                  <defs>
                    {/* Beautiful gradient for each segment */}
                    {segments.map((segment, index) => (
                      <radialGradient
                        key={`grad-${index}`}
                        id={`segmentGrad${index}`}
                        cx="50%"
                        cy="50%"
                        r="50%"
                      >
                        <stop
                          offset="0%"
                          stopColor={segment.color}
                          stopOpacity="0.95"
                        />
                        <stop
                          offset="70%"
                          stopColor={segment.color}
                          stopOpacity="0.85"
                        />
                        <stop
                          offset="100%"
                          stopColor={segment.color}
                          stopOpacity="0.75"
                        />
                      </radialGradient>
                    ))}
                    {/* Enhanced shadow filter */}
                    <filter
                      id="segmentShadow"
                      x="-50%"
                      y="-50%"
                      width="200%"
                      height="200%"
                    >
                      <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
                      <feOffset dx="0" dy="2" result="offsetblur" />
                      <feFlood floodColor="#000000" floodOpacity="0.5" />
                      <feComposite in2="offsetblur" operator="in" />
                      <feMerge>
                        <feMergeNode />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    {/* Glow filter for text */}
                    <filter id="textGlow">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    {/* Inner circle shadow */}
                    <filter id="innerShadow">
                      <feGaussianBlur in="SourceAlpha" stdDeviation="4" />
                      <feOffset dx="0" dy="0" result="offsetblur" />
                      <feFlood floodColor="#000000" floodOpacity="0.8" />
                      <feComposite in2="offsetblur" operator="in" />
                      <feMerge>
                        <feMergeNode />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Beautiful segments */}
                  {segments.map((segment, index) => {
                    const angle = 360 / segments.length;
                    const startAngle = -90 + index * angle;
                    const endAngle = startAngle + angle;

                    const x1 =
                      150 + 145 * Math.cos((startAngle * Math.PI) / 180);
                    const y1 =
                      150 + 145 * Math.sin((startAngle * Math.PI) / 180);
                    const x2 = 150 + 145 * Math.cos((endAngle * Math.PI) / 180);
                    const y2 = 150 + 145 * Math.sin((endAngle * Math.PI) / 180);

                    const largeArcFlag = angle > 180 ? 1 : 0;

                    return (
                      <g key={index}>
                        {/* Segment path with gradient */}
                        <path
                          d={`M 150 150 L ${x1} ${y1} A 145 145 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                          fill={`url(#segmentGrad${index})`}
                          stroke="rgba(255,255,255,0.1)"
                          strokeWidth="1"
                          filter="url(#segmentShadow)"
                        />
                        {/* Decorative inner arc */}
                        <path
                          d={`M 150 150 L ${x1 * 0.5 + 75} ${y1 * 0.5 + 75} A 72.5 72.5 0 ${largeArcFlag} 1 ${x2 * 0.5 + 75} ${y2 * 0.5 + 75} Z`}
                          fill="none"
                          stroke={segment.color}
                          strokeWidth="0.5"
                          opacity="0.3"
                        />
                        {/* Prize text with glow */}
                        <text
                          x={
                            150 +
                            105 *
                              Math.cos(
                                (((startAngle + endAngle) / 2) * Math.PI) / 180,
                              )
                          }
                          y={
                            150 +
                            105 *
                              Math.sin(
                                (((startAngle + endAngle) / 2) * Math.PI) / 180,
                              )
                          }
                          fill="white"
                          fontSize="18"
                          fontWeight="bold"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          stroke="black"
                          strokeWidth="1.5"
                          strokeLinejoin="round"
                          strokeLinecap="round"
                          paintOrder="stroke"
                        >
                          {segment.displayLabel}
                        </text>
                        {/* Small decorative stars */}
                        <text
                          x={
                            150 +
                            80 *
                              Math.cos(
                                (((startAngle + endAngle) / 2) * Math.PI) / 180,
                              )
                          }
                          y={
                            150 +
                            80 *
                              Math.sin(
                                (((startAngle + endAngle) / 2) * Math.PI) / 180,
                              )
                          }
                          fill={segment.color}
                          fontSize="10"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          opacity="0.6"
                        >
                          ★
                        </text>
                      </g>
                    );
                  })}
                </svg>

                {/* Center Interactive Button */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {spinStatus?.level === 1 ? (
                    // Lock Message for Level 1 Users
                    (<motion.div
                      className="bg-gradient-to-r from-gray-900/95 to-black/95 border-2 border-gray-600/50 rounded-2xl p-4 mx-4 backdrop-blur-sm"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, type: "spring" }}
                    >
                      <div className="text-center">
                        <div className="text-3xl mb-2">🔒</div>
                        <p className="text-white font-bold text-sm mb-1">
                          Roleta bloqueada!
                        </p>
                        <p className="text-gray-400 text-xs">
                          Continue raspando para alcançar o{" "}
                          <span className="text-amber-600 font-bold">
                            Nível 2
                          </span>
                        </p>
                      </div>
                    </motion.div>)
                  ) : (
                    <motion.button
                      onClick={handleSpin}
                      disabled={!spinStatus?.canSpin || isSpinning}
                      className={`pointer-events-auto relative w-28 h-28 rounded-full transition-all transform ${
                        spinStatus?.canSpin && !isSpinning
                          ? "cursor-pointer"
                          : "cursor-not-allowed"
                      }`}
                      whileHover={
                        spinStatus?.canSpin && !isSpinning ? { scale: 1.1 } : {}
                      }
                      whileTap={
                        spinStatus?.canSpin && !isSpinning
                          ? { scale: 0.95 }
                          : {}
                      }
                    >
                      {/* Outer ring */}
                      <div
                        className={`absolute inset-0 rounded-full p-[2px] ${
                          tier === "diamond"
                            ? "bg-gradient-to-br from-cyan-300 via-cyan-400 to-cyan-500"
                            : tier === "platinum"
                              ? "bg-gradient-to-br from-gray-200 via-gray-300 to-gray-400"
                              : tier === "gold"
                                ? "bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500"
                                : tier === "silver"
                                  ? "bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500"
                                  : "bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700"
                        } shadow-2xl`}
                      >
                        {/* Button background with animation */}
                        <div
                          className={`w-full h-full rounded-full ${
                            spinStatus?.canSpin && !isSpinning
                              ? tier === "diamond"
                                ? "bg-gradient-to-br from-cyan-500 via-cyan-600 to-cyan-700"
                                : tier === "platinum"
                                  ? "bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600"
                                  : tier === "gold"
                                    ? "bg-gradient-to-br from-yellow-500 via-yellow-600 to-yellow-700"
                                    : tier === "silver"
                                      ? "bg-gradient-to-br from-gray-500 via-gray-600 to-gray-700"
                                      : "bg-gradient-to-br from-amber-600 via-amber-700 to-amber-800"
                              : "bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900"
                          } shadow-inner`}
                        >
                          {spinStatus?.canSpin && !isSpinning && (
                            <motion.div
                              className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
                              animate={{ rotate: 360 }}
                              transition={{
                                duration: 3,
                                repeat: Infinity,
                                ease: "linear",
                              }}
                            />
                          )}
                        </div>
                      </div>

                      {/* Button inner circle */}
                      <div className="absolute inset-[3px] rounded-full bg-gradient-to-br from-gray-900/95 to-black/95 flex flex-col items-center justify-center">
                        {isSpinning ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{
                                duration: 1,
                                repeat: Infinity,
                                ease: "linear",
                              }}
                            >
                              <Sparkles
                                className={`w-8 h-8 ${
                                  tier === "diamond"
                                    ? "text-cyan-400"
                                    : tier === "platinum"
                                      ? "text-gray-300"
                                      : tier === "gold"
                                        ? "text-yellow-400"
                                        : tier === "silver"
                                          ? "text-gray-400"
                                          : "text-amber-600"
                                }`}
                              />
                            </motion.div>
                            <span
                              className={`text-xs font-bold mt-1 animate-pulse ${
                                tier === "diamond"
                                  ? "text-cyan-400"
                                  : tier === "platinum"
                                    ? "text-gray-300"
                                    : tier === "gold"
                                      ? "text-yellow-400"
                                      : tier === "silver"
                                        ? "text-gray-400"
                                        : "text-amber-600"
                              }`}
                            >
                              GIRANDO
                            </span>
                          </>
                        ) : spinStatus?.canSpin ? (
                          <>
                            <motion.div
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            >
                              <Zap
                                className={`w-10 h-10 drop-shadow-lg ${
                                  tier === "diamond"
                                    ? "text-cyan-400"
                                    : tier === "platinum"
                                      ? "text-gray-300"
                                      : tier === "gold"
                                        ? "text-yellow-400"
                                        : tier === "silver"
                                          ? "text-gray-400"
                                          : "text-amber-600"
                                }`}
                              />
                            </motion.div>
                            <span
                              className={`text-sm font-bold mt-1 uppercase tracking-wider ${
                                tier === "diamond"
                                  ? "text-cyan-400"
                                  : tier === "platinum"
                                    ? "text-gray-300"
                                    : tier === "gold"
                                      ? "text-yellow-400"
                                      : tier === "silver"
                                        ? "text-gray-400"
                                        : "text-amber-600"
                              }`}
                            >
                              Girar
                            </span>
                          </>
                        ) : (
                          <div className="flex flex-col items-center">
                            <span className="text-white text-xs font-bold">
                              VOLTE
                            </span>
                            <span className="text-white text-xs font-bold">
                              AMANHÃ!
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Pulse animation when available */}
                      {spinStatus?.canSpin && !isSpinning && (
                        <motion.div
                          className={`absolute inset-0 rounded-full ${
                            tier === "diamond"
                              ? "bg-cyan-400/20"
                              : tier === "platinum"
                                ? "bg-gray-300/20"
                                : tier === "gold"
                                  ? "bg-yellow-400/20"
                                  : tier === "silver"
                                    ? "bg-gray-400/20"
                                    : "bg-amber-600/20"
                          }`}
                          animate={{
                            scale: [1, 1.3, 1],
                            opacity: [0.5, 0, 0.5],
                          }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      )}
                    </motion.button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      {/* Win Animation Overlay */}
      {showWin && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowWin(false)}
        >
          <motion.div
            className="relative p-8 rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-[#00E880] shadow-2xl shadow-[#00E880]/50"
            initial={{ scale: 0.8, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#00E880]/20 to-transparent animate-pulse" />
            
            {/* Close button */}
            <button
              onClick={() => setShowWin(false)}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-gray-800/80 hover:bg-gray-700 transition-colors flex items-center justify-center group"
            >
              <X className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors" />
            </button>

            <div className="relative text-center">
              <h2 className="text-4xl font-bold text-white mb-2">PARABÉNS!</h2>
              <p className="text-2xl text-gray-300 mb-4">Você ganhou</p>
              <div className="text-6xl font-bold bg-gradient-to-r from-[#00E880] to-[#00C870] bg-clip-text text-transparent mb-2">
                {wonAmount}
              </div>
              <p className="text-xl text-gray-300 mb-6">Raspadinhas!</p>

              <motion.button
                onClick={() => {
                  setShowWin(false);
                  setLocation('/#premios');
                }}
                className="px-8 py-3 bg-gradient-to-r from-[#00E880] to-[#00C870] text-black font-bold rounded-xl shadow-lg"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Raspar agora
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
