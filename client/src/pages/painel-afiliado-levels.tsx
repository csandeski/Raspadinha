import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { 
  TrendingUp, 
  Shield, 
  Star, 
  Crown, 
  Gem, 
  Lock, 
  CheckCircle,
  Trophy,
  Target,
  Zap,
  ChevronRight,
  Award,
  RefreshCw
} from "lucide-react";
import AffiliateLayout from "@/components/affiliate/affiliate-layout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatBRL } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
// CountUp removed - using static values instead

interface AffiliateData {
  affiliateLevel?: string;
  approvedEarnings?: string;
  currentLevelRate?: string;
  customCommissionRate?: string;
  customFixedAmount?: string;
  commissionType?: string;
  name?: string;
  email?: string;
}

interface EarningsData {
  totalEarnings: number;
  completedEarnings: number;
  pendingEarnings: number;
  availableBalance: number;
}

export default function AffiliateLevels() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Fetch affiliate data - force refresh every 5 seconds to ensure level updates are shown
  const { data: affiliateData, refetch } = useQuery<AffiliateData>({
    queryKey: ["/api/affiliate/info"],
    refetchInterval: 5000, // Check for updates every 5 seconds
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });
  
  // Fetch earnings data
  const { data: earningsData } = useQuery<EarningsData>({
    queryKey: ["/api/affiliate/earnings"],
    refetchInterval: 5000,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });
  
  // Fetch tier configuration data
  const { data: tierConfigData } = useQuery({
    queryKey: ["/api/admin/affiliates/tier-config"],
    refetchInterval: 30000,
    refetchOnMount: true
  });
  
  // Auto-refresh on mount to ensure latest data
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/affiliate/info"] });
  }, [queryClient]);
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Clear all caches
    queryClient.clear();
    await refetch();
    toast({
      title: "Dados atualizados!",
      description: "Seus dados foram atualizados com sucesso.",
    });
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Map tier config data to levels with fixed amounts
  const tierConfigMap = tierConfigData ? tierConfigData.reduce((acc: any, tier: any) => {
    acc[tier.tier] = {
      percentageRate: tier.percentageRate,
      fixedAmount: tier.fixedAmount
    };
    return acc;
  }, {}) : {};

  const levels = [
    {
      name: "Bronze",
      dbName: "bronze",
      icon: Shield,
      color: "text-amber-600",
      bgGradient: "from-amber-600 to-amber-800",
      bgColor: "bg-gradient-to-br from-amber-900/20 to-amber-800/10",
      borderColor: "border-amber-600/30",
      shadowColor: "shadow-amber-600/20",
      minEarnings: 0,
      maxEarnings: 5000,
      rate: tierConfigMap.bronze?.percentageRate || 40,
      fixedAmount: tierConfigMap.bronze?.fixedAmount || 10
    },
    {
      name: "Prata",
      dbName: "silver",
      icon: Shield,
      color: "text-gray-400",
      bgGradient: "from-gray-400 to-gray-600",
      bgColor: "bg-gradient-to-br from-gray-700/20 to-gray-600/10",
      borderColor: "border-gray-500/30",
      shadowColor: "shadow-gray-500/20",
      minEarnings: 5000,
      maxEarnings: 20000,
      rate: tierConfigMap.silver?.percentageRate || 45,
      fixedAmount: tierConfigMap.silver?.fixedAmount || 15
    },
    {
      name: "Ouro",
      dbName: "gold",
      icon: Shield,
      color: "text-yellow-400",
      bgGradient: "from-yellow-400 to-yellow-600",
      bgColor: "bg-gradient-to-br from-yellow-900/20 to-yellow-800/10",
      borderColor: "border-yellow-500/30",
      shadowColor: "shadow-yellow-500/20",
      minEarnings: 20000,
      maxEarnings: 50000,
      rate: tierConfigMap.gold?.percentageRate || 50,
      fixedAmount: tierConfigMap.gold?.fixedAmount || 20
    },
    {
      name: "Platina",
      dbName: "platinum",
      icon: Shield,
      color: "text-gray-300",
      bgGradient: "from-gray-300 to-gray-500",
      bgColor: "bg-gradient-to-br from-slate-700/20 to-slate-600/10",
      borderColor: "border-gray-400/30",
      shadowColor: "shadow-gray-400/20",
      minEarnings: 50000,
      maxEarnings: 100000,
      rate: tierConfigMap.platinum?.percentageRate || 60,
      fixedAmount: tierConfigMap.platinum?.fixedAmount || 30
    },
    {
      name: "Diamante",
      dbName: "diamond",
      icon: Shield,
      color: "text-cyan-400",
      bgGradient: "from-cyan-400 to-blue-600",
      bgColor: "bg-gradient-to-br from-cyan-900/20 to-blue-800/10",
      borderColor: "border-cyan-500/30",
      shadowColor: "shadow-cyan-500/20",
      minEarnings: 100000,
      maxEarnings: null,
      rate: tierConfigMap.diamond?.percentageRate || 70,
      fixedAmount: tierConfigMap.diamond?.fixedAmount || 50
    }
  ];

  const currentLevel = affiliateData?.affiliateLevel || 'bronze';
  // Use completedEarnings for accurate total
  const approvedEarnings = earningsData?.completedEarnings || parseFloat(affiliateData?.approvedEarnings || '0');
  const currentLevelRate = parseFloat(affiliateData?.currentLevelRate || '40');
  const customCommissionRate = affiliateData?.customCommissionRate ? parseFloat(affiliateData.customCommissionRate) : null;
  const customFixedAmount = affiliateData?.customFixedAmount ? parseFloat(affiliateData.customFixedAmount) : null;
  const commissionType = affiliateData?.commissionType || 'percentage';
  
  // Check if has custom configuration
  const hasCustomRate = customCommissionRate || customFixedAmount;
  
  // Find current level index using dbName for correct mapping
  const currentLevelIndex = Math.max(0, levels.findIndex(l => l.dbName === currentLevel));
  const currentLevelData = levels[currentLevelIndex] || levels[0]; // Fallback to Bronze
  const nextLevelData = currentLevelIndex < levels.length - 1 ? levels[currentLevelIndex + 1] : null;

  // Calculate progress to next level with safety check
  const progressToNext = nextLevelData && currentLevelData
    ? Math.min(100, Math.max(0, ((approvedEarnings - currentLevelData.minEarnings) / (nextLevelData.minEarnings - currentLevelData.minEarnings)) * 100))
    : 100;

  return (
    <AffiliateLayout activeSection="levels">
      <div className="space-y-3 md:space-y-6">
        {/* Animated Background Elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-[#00E880]/10 to-transparent rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-600/10 to-transparent rounded-full blur-3xl animate-pulse delay-700" />
        </div>

        {/* Compact Header with Refresh Button */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-gray-900/95 to-gray-950/95 backdrop-blur-xl rounded-xl md:rounded-2xl p-4 md:p-6 mb-3 md:mb-4 border border-gray-800"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 md:p-3 bg-gray-800/30 rounded-xl">
                <Trophy className="w-5 h-5 md:w-6 md:h-6 text-gray-400" />
              </div>
              <div>
                <h1 className="text-base md:text-xl font-bold text-white">Sistema de Níveis VIP</h1>
                <p className="text-xs md:text-sm text-gray-400">Suba de nível e aumente suas comissões progressivamente</p>
              </div>
            </div>
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              size="sm"
              variant="outline"
              className="bg-gray-800/50 border-gray-700 hover:bg-gray-700/50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </motion.div>

        {/* Current Status Card - Premium Design */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="relative"
        >
          <div className={`relative rounded-3xl overflow-hidden`}>
            {/* Inner Card */}
            <div className="relative bg-gradient-to-br from-gray-900/95 to-gray-950/95 backdrop-blur-xl border border-gray-800 rounded-xl md:rounded-3xl overflow-hidden">
              {/* Pattern Background */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0" style={{
                  backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.05) 10px, rgba(255,255,255,.05) 20px)`
                }} />
              </div>

              {/* Content */}
              <div className="relative p-4 md:p-8">
                {/* Header Section */}
                <div className="flex items-center justify-between mb-4 md:mb-8">
                  <div className="flex items-center gap-2 md:gap-4">
                    {/* Medal Icon like /rewards */}
                    <motion.div
                      animate={{ 
                        rotate: [0, 5, -5, 0],
                        scale: [1, 1.05, 1]
                      }}
                      transition={{ 
                        duration: 4,
                        repeat: Infinity,
                        repeatType: "reverse"
                      }}
                      className="relative"
                    >
                      <div className={`w-14 h-14 md:w-20 md:h-20 rounded-full shadow-2xl bg-gradient-to-br ${
                        hasCustomRate ? "from-purple-400 via-purple-500 to-purple-700" :
                        currentLevelData?.name === "Diamante" ? "from-cyan-300 via-cyan-400 to-cyan-600" :
                        currentLevelData?.name === "Platina" ? "from-gray-200 via-gray-300 to-gray-500" :
                        currentLevelData?.name === "Ouro" ? "from-yellow-300 via-yellow-400 to-yellow-600" :
                        currentLevelData?.name === "Prata" ? "from-gray-300 via-gray-400 to-gray-600" :
                        "from-amber-500 via-amber-600 to-amber-800"
                      } border-4 ${hasCustomRate ? 'border-purple-600' : 'border-gray-700'}`}>
                        <div className={`absolute inset-2 rounded-full bg-gradient-to-br ${
                          hasCustomRate ? "from-purple-500 to-purple-700" :
                          currentLevelData?.name === "Diamante" ? "from-cyan-400 to-cyan-600" :
                          currentLevelData?.name === "Platina" ? "from-gray-300 to-gray-500" :
                          currentLevelData?.name === "Ouro" ? "from-yellow-400 to-yellow-600" :
                          currentLevelData?.name === "Prata" ? "from-gray-400 to-gray-600" :
                          "from-amber-600 to-amber-800"
                        } flex items-center justify-center`}>
                          <Star className="w-5 h-5 md:w-8 md:h-8 text-white fill-white drop-shadow-lg" />
                        </div>
                        {/* Shine effect */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/40 via-transparent to-transparent" />
                      </div>
                    </motion.div>
                    
                    <div>
                      <p className="text-xs md:text-sm text-gray-400 mb-1">Nível Atual</p>
                      <h2 className="text-xl md:text-3xl font-bold text-white">
                        {hasCustomRate ? 'CUSTOM' : currentLevelData?.name}
                      </h2>
                      <p className={`text-xs md:text-sm mt-1 ${hasCustomRate ? 'text-purple-400' : 'text-[#00E880]'}`}>
                        {hasCustomRate ? '✓ Configuração exclusiva' : '✓ Você está neste nível'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Commission Badge */}
                  <div className="text-right">
                    <p className="text-xs md:text-sm text-gray-400 mb-1">Comissão Atual</p>
                    <div className="flex items-center justify-end gap-2">
                      <div className={`text-2xl md:text-4xl font-bold ${hasCustomRate ? 'bg-gradient-to-r from-purple-400 to-purple-600' : `bg-gradient-to-r ${currentLevelData?.bgGradient}`} bg-clip-text text-transparent`}>
                        {commissionType === 'percentage' 
                          ? `${customCommissionRate || currentLevelRate}%`
                          : `R$ ${parseFloat(customFixedAmount || currentLevelData?.fixedAmount || '10').toFixed(2)}`
                        }
                      </div>
                      {hasCustomRate && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", duration: 0.5 }}
                        >
                          <Badge className="bg-purple-600/20 text-purple-400 border-purple-500/30 animate-pulse">
                            CUSTOM
                          </Badge>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 rounded-xl md:rounded-2xl p-4 md:p-5 border border-gray-700/50"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Trophy className="w-5 h-5 text-[#00E880]" />
                      <p className="text-xs md:text-sm text-gray-400">Ganhos Aprovados</p>
                    </div>
                    <p className="text-xl md:text-2xl font-bold text-white">
                      {formatBRL(approvedEarnings)}
                    </p>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 rounded-xl md:rounded-2xl p-4 md:p-5 border border-gray-700/50"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Target className="w-5 h-5 text-purple-400" />
                      <p className="text-xs md:text-sm text-gray-400">Próximo Nível</p>
                    </div>
                    <p className="text-xl md:text-2xl font-bold text-white">
                      {hasCustomRate ? 'Personalizado' : nextLevelData ? nextLevelData.name : 'Máximo'}
                    </p>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 rounded-xl md:rounded-2xl p-4 md:p-5 border border-gray-700/50"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Zap className="w-5 h-5 text-yellow-400" />
                      <p className="text-xs md:text-sm text-gray-400">Aumento Potencial</p>
                    </div>
                    <p className="text-2xl font-bold text-[#00E880]">
                      {hasCustomRate ? 'Exclusivo' : nextLevelData ? `+${nextLevelData.rate - currentLevelRate}%` : 'Máximo'}
                    </p>
                  </motion.div>
                </div>

                {/* Progress Section - Only show if not custom */}
                {nextLevelData && !hasCustomRate && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 rounded-2xl p-6 border border-gray-700/50"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 bg-gradient-to-br ${nextLevelData.bgColor} rounded-lg`}>
                          <ChevronRight className={`w-5 h-5 ${nextLevelData.color}`} />
                        </div>
                        <div>
                          <p className="text-white font-semibold">Progresso para {nextLevelData.name}</p>
                          <p className="text-xs md:text-sm text-gray-400">
                            Comissão de {commissionType === 'percentage' 
                              ? `${nextLevelData.rate}%` 
                              : `R$ ${parseFloat(nextLevelData.fixedAmount).toFixed(2)}`
                            } ao atingir
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[#00E880] text-2xl font-bold">
                          {Math.round(progressToNext)}%
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="relative">
                        <div className="h-4 bg-gray-800/50 rounded-full overflow-hidden">
                          <div 
                            className={`h-full bg-gradient-to-r ${nextLevelData.bgGradient} rounded-full transition-all duration-1000 relative overflow-hidden`}
                            style={{ width: `${Math.min(progressToNext, 100)}%` }}
                          >
                            <div className="absolute inset-0 bg-white/20 animate-shimmer" />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <p className="text-xs md:text-sm text-gray-400">
                          {formatBRL(approvedEarnings)} alcançados
                        </p>
                        <p className="text-xs md:text-sm text-gray-400">
                          Meta: {formatBRL(nextLevelData.minEarnings)}
                        </p>
                      </div>
                      
                      <div className="mt-4 p-3 bg-gray-800/50 rounded-xl border border-gray-700">
                        <p className="text-white text-sm">
                          <span className="text-[#00E880] font-semibold">
                            Faltam {formatBRL(nextLevelData.minEarnings - approvedEarnings)}
                          </span> em vendas aprovadas para desbloquear {commissionType === 'percentage' 
                            ? `${nextLevelData.rate}% de comissão` 
                            : `R$ ${parseFloat(nextLevelData.fixedAmount).toFixed(2)} por depósito`
                          }!
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </motion.div>



        {/* Levels List - Compact Design like /rewards */}
        <div className="space-y-3 md:space-y-4">
          <h3 className="text-base md:text-xl font-bold text-white mb-3 md:mb-4">Todos os Níveis de Comissão</h3>
          
          {/* Custom Level Card - Show First if Has Custom Rate */}
          {hasCustomRate && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="relative rounded-xl md:rounded-2xl overflow-hidden mb-3 md:mb-4"
            >
              <div className="relative bg-gradient-to-br from-purple-900/30 to-purple-950/30 backdrop-blur-xl border-2 border-purple-500 rounded-xl md:rounded-2xl overflow-hidden">
                <div className="p-3 md:p-4">
                  <div className="flex items-center gap-2 md:gap-4">
                    {/* Purple Star Medal */}
                    <div className="relative">
                      <div className="w-12 h-12 md:w-16 md:h-16 rounded-full shadow-xl bg-gradient-to-br from-purple-400 via-purple-500 to-purple-700 border-2 border-purple-600">
                        <div className="absolute inset-1 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                          <Star className="w-6 h-6 text-white fill-white drop-shadow-lg" />
                        </div>
                        {/* Shine effect */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/40 via-transparent to-transparent" />
                      </div>
                      <div className="absolute -top-1 -right-1">
                        <div className="w-4 h-4 bg-purple-500 rounded-full animate-pulse" />
                      </div>
                    </div>
                    
                    {/* Custom Level Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm md:text-lg font-bold text-purple-400">
                          CUSTOM
                        </h4>
                        <Badge className="bg-purple-500/20 text-purple-400 border-0 px-2 py-0.5 text-xs">
                          ATUAL
                        </Badge>
                      </div>
                      <p className="text-xs md:text-sm text-gray-400">
                        Configuração exclusiva personalizada
                      </p>
                    </div>
                    
                    {/* Custom Rate Display */}
                    <div className="text-center">
                      <p className="text-gray-400 text-[10px] md:text-xs mb-1">Comissão</p>
                      <div className="text-lg md:text-2xl font-bold text-purple-400">
                        {commissionType === 'percentage' 
                          ? `${customCommissionRate}%`
                          : `R$ ${customFixedAmount?.toFixed(2)}`
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          
          {levels.map((level, index) => {
            const isUnlocked = approvedEarnings >= level.minEarnings;
            const isCurrent = !hasCustomRate && level.dbName === currentLevel;

            return (
              <motion.div
                key={level.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative rounded-xl md:rounded-2xl overflow-hidden ${!isUnlocked ? 'opacity-60' : ''}`}
              >
                <div className={`relative bg-gradient-to-br from-gray-900/95 to-gray-950/95 backdrop-blur-xl ${isCurrent ? 'border-2 border-[#00E880]' : 'border border-gray-800'} rounded-xl md:rounded-2xl overflow-hidden`}>
                  <div className="p-3 md:p-4">
                    <div className="flex items-center gap-2 md:gap-4">
                      {/* Medal Icon like /rewards */}
                      <div className="relative">
                        <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full shadow-xl bg-gradient-to-br ${
                          level.name === "Diamante" ? "from-cyan-300 via-cyan-400 to-cyan-600" :
                          level.name === "Platina" ? "from-gray-200 via-gray-300 to-gray-500" :
                          level.name === "Ouro" ? "from-yellow-300 via-yellow-400 to-yellow-600" :
                          level.name === "Prata" ? "from-gray-300 via-gray-400 to-gray-600" :
                          "from-amber-500 via-amber-600 to-amber-800"
                        } border-2 border-gray-700`}>
                          <div className={`absolute inset-1 rounded-full bg-gradient-to-br ${
                            level.name === "Diamante" ? "from-cyan-400 to-cyan-600" :
                            level.name === "Platina" ? "from-gray-300 to-gray-500" :
                            level.name === "Ouro" ? "from-yellow-400 to-yellow-600" :
                            level.name === "Prata" ? "from-gray-400 to-gray-600" :
                            "from-amber-600 to-amber-800"
                          } flex items-center justify-center`}>
                            <Star className="w-4 h-4 md:w-6 md:h-6 text-white fill-white drop-shadow-lg" />
                          </div>
                          {/* Shine effect */}
                          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/40 via-transparent to-transparent" />
                        </div>
                        
                        {isCurrent && (
                          <div className="absolute -top-1 -right-1">
                            <div className="w-4 h-4 bg-[#00E880] rounded-full animate-pulse" />
                          </div>
                        )}
                      </div>
                      
                      {/* Level Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1 md:gap-2 mb-1">
                          <h4 className={`text-sm md:text-lg font-bold ${level.color}`}>
                            {level.name}
                          </h4>
                          {isCurrent && (
                            <Badge className="bg-[#00E880]/20 text-[#00E880] border-0 px-1 md:px-2 py-0.5 text-[10px] md:text-xs">
                              ATUAL
                            </Badge>
                          )}
                          {!isUnlocked && (
                            <div className="flex items-center gap-1 text-gray-500">
                              <Lock className="w-3 h-3" />
                              <span className="text-xs">BLOQUEADO</span>
                            </div>
                          )}
                        </div>
                        <p className="text-xs md:text-sm text-gray-400">
                          {level.maxEarnings 
                            ? `${formatBRL(level.minEarnings)} - ${formatBRL(level.maxEarnings)}`
                            : `Acima de ${formatBRL(level.minEarnings)}`
                          }
                        </p>
                      </div>
                      
                      {/* Commission Rate */}
                      <div className="text-center">
                        <p className="text-gray-400 text-[10px] md:text-xs mb-1">Comissão</p>
                        <div className={`text-lg md:text-2xl font-bold ${level.color}`}>
                          {commissionType === 'percentage' 
                            ? `${level.rate}%`
                            : `R$ ${parseFloat(level.fixedAmount).toFixed(2)}`
                          }
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress Bar for Locked Levels */}
                    {!isUnlocked && (
                      <div className="mt-3">
                        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full bg-gradient-to-r ${level.bgGradient} rounded-full transition-all duration-500`}
                            style={{ width: `${Math.min((approvedEarnings / level.minEarnings) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Information Card - Premium Design */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="relative overflow-hidden rounded-3xl"
        >
          {/* Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-[#00E880]/10" />
          
          {/* Content */}
          <div className="relative bg-gradient-to-br from-gray-900/95 to-gray-950/95 backdrop-blur-sm p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-gradient-to-br from-[#00E880]/20 to-purple-600/20 rounded-2xl">
                <Award className="w-8 h-8 text-[#00E880]" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">Como Funciona o Sistema VIP?</h3>
                <p className="text-gray-400">Entenda como crescer e maximizar seus ganhos</p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl p-6 border border-gray-700/50"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-[#00E880]/20 rounded-lg">
                    <Trophy className="w-6 h-6 text-[#00E880]" />
                  </div>
                  <h4 className="text-white font-semibold">Ganhos Aprovados</h4>
                </div>
                <p className="text-gray-400 text-sm">
                  Apenas comissões aprovadas e pagas contam para sua progressão. Comissões pendentes não são contabilizadas.
                </p>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl p-6 border border-gray-700/50"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-600/20 rounded-lg">
                    <Zap className="w-6 h-6 text-purple-400" />
                  </div>
                  <h4 className="text-white font-semibold">Atualização Automática</h4>
                </div>
                <p className="text-gray-400 text-sm">
                  Seu nível sobe automaticamente quando você atinge os requisitos. Sem burocracias!
                </p>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl p-6 border border-gray-700/50"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-yellow-600/20 rounded-lg">
                    <Crown className="w-6 h-6 text-yellow-400" />
                  </div>
                  <h4 className="text-white font-semibold">Benefícios Cumulativos</h4>
                </div>
                <p className="text-gray-400 text-sm">
                  Cada nível mantém todos os benefícios anteriores e adiciona novos privilégios exclusivos.
                </p>
              </motion.div>
            </div>

            {/* Call to Action */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-8 p-6 bg-gradient-to-r from-[#00E880]/10 to-purple-600/10 rounded-2xl border border-[#00E880]/20"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <TrendingUp className="w-8 h-8 text-[#00E880]" />
                  <div>
                    <p className="text-white font-semibold text-lg">Pronto para subir de nível?</p>
                    <p className="text-gray-400 text-sm">
                      Continue promovendo e aumente suas comissões progressivamente!
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-[#00E880]" />
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </AffiliateLayout>
  );
}