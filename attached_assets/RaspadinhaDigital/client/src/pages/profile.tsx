import { useLocation, Redirect } from "wouter";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Wallet, Clock, TrendingUp, LogOut, Crown, Star, Trophy, Calendar, Gamepad2, HelpCircle, UserPlus, ChevronRight, Edit2 } from "lucide-react";
import { MobileLayout } from "@/components/mobile-layout";
import { abbreviateName } from "@/lib/name-utils";

// Get tier info based on level - using same colors as rewards page
const getTierInfo = (level: number) => {
  if (level >= 100) return { name: 'Diamante', color: 'from-cyan-400 to-blue-600', progressColor: 'from-cyan-400 to-blue-600' };
  if (level >= 75) return { name: 'Platina', color: 'from-gray-300 to-gray-500', progressColor: 'from-gray-300 to-gray-500' };
  if (level >= 50) return { name: 'Ouro', color: 'from-yellow-400 to-yellow-600', progressColor: 'from-yellow-400 to-yellow-600' };
  if (level >= 25) return { name: 'Prata', color: 'from-gray-400 to-gray-600', progressColor: 'from-gray-400 to-gray-600' };
  if (level >= 2) return { name: 'Bronze', color: 'from-amber-600 to-amber-800', progressColor: 'from-amber-600 to-amber-800' };
  return { name: 'Sem rank', color: 'from-gray-600 to-gray-800', progressColor: 'from-gray-600 to-gray-800' };
};

export default function Profile() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [pixKey, setPixKey] = useState("");

  // Redirect if not authenticated
  if (!user) {
    return <Redirect to="/login" />;
  }

  // Fetch game history
  const { data: gameHistory, isLoading: isLoadingGames } = useQuery({
    queryKey: ["/api/games/history"],
    enabled: !!user,
  });

  // Fetch withdrawal history
  const { data: withdrawalHistory, isLoading: isLoadingWithdrawals } = useQuery({
    queryKey: ["/api/withdrawals/history"],
    enabled: !!user,
  });

  // Withdrawal mutation
  const withdrawMutation = useMutation({
    mutationFn: async (data: { amount: number; pixKey: string }) => {
      return apiRequest('/api/withdraw', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
    onSuccess: () => {
      toast({ description: "Seu saque será processado em até 24 horas." });
      setShowWithdrawModal(false);
      setWithdrawAmount("");
      setPixKey("");
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/withdrawals/history"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao solicitar saque",
        variant: "destructive",
      });
    },
  });

  // Fetch user level information
  const { data: levelInfo, isLoading: isLoadingLevel } = useQuery({
    queryKey: ["/api/user/level"],
    enabled: !!user,
  });

  const handleWithdraw = () => {
    const amount = parseFloat(withdrawAmount);
    
    if (!pixKey || pixKey.trim() === "") {
      toast({
        title: "Erro",
        description: "Por favor, insira sua chave PIX",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(amount) || amount < 10) {
      toast({
        title: "Erro", 
        description: "Valor mínimo para saque é R$ 10,00",
        variant: "destructive",
      });
      return;
    }

    if (amount > user.balance) {
      toast({
        title: "Erro",
        description: "Saldo insuficiente",
        variant: "destructive",
      });
      return;
    }

    withdrawMutation.mutate({ amount, pixKey });
  };

  return (
    <MobileLayout>
      <div className="min-h-full bg-gradient-to-b from-[#0E1015] via-[#1a1b23] to-[#0E1015]">
        <div className="max-w-md md:max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 md:mb-2">Perfil</h1>
            <p className="text-gray-400 text-sm md:text-base">Suas informações e progresso</p>
          </div>

          {/* User Avatar Section */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative">
              <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-full flex items-center justify-center shadow-xl transform hover:scale-105 transition-transform duration-300 overflow-hidden bg-gray-800 border-2 border-gray-700">
                {/* Wave effect background */}
                <div className="absolute inset-0">
                  {/* Static background */}
                  <div className="absolute inset-0 bg-gray-900" />
                  
                  {/* Animated wave fill */}
                  <div 
                    className="absolute inset-x-0 bottom-0 transition-all duration-700 ease-out"
                    style={{ 
                      height: `${Math.max(5, (levelInfo?.progress || 0))}%`,
                    }}
                  >
                    {/* Wave gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#00E880] via-[#00D470] to-[#00E880]/80">
                      {/* Animated wave top */}
                      <div className="absolute inset-x-0 top-0 h-full">
                        <div className="wave-container absolute inset-0 flex">
                          <div className="wave-shape absolute inset-0 bg-gradient-to-t from-transparent to-[#00E880]/30 animate-wave"></div>
                          <div className="wave-shape absolute inset-0 bg-gradient-to-t from-transparent to-[#00D470]/30 animate-wave" style={{ animationDelay: '-1.5s' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* User initial with shadow for better visibility */}
                <span className="relative z-10 text-white font-bold text-5xl md:text-7xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-center mt-4">
              <h2 className="text-2xl md:text-3xl font-bold text-white">{abbreviateName(user.name)}</h2>
              <p className="text-gray-400 md:text-lg mb-3">{user.email}</p>
              <button
                onClick={() => setLocation("/settings")}
                className="flex items-center gap-1 px-3 md:px-4 py-1.5 md:py-2 bg-gray-800/50 hover:bg-gray-700/50 text-[#00E880] rounded-lg transition-all duration-200 border border-[#00E880]/20 hover:border-[#00E880]/40"
              >
                <Edit2 className="w-4 h-4 md:w-5 md:h-5" />
                <span className="text-sm md:text-base font-medium">Editar</span>
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="space-y-4 mb-8">
            {/* Level Progress Card */}
            <div className="bg-gradient-to-b from-gray-800/30 to-gray-900/30 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-gray-700/50">
              <div className="mb-4">
                <h3 className="text-lg md:text-xl font-bold text-white">Progressão de Nível</h3>
              </div>
              
              {isLoadingLevel ? (
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-700 rounded w-1/3 mb-4"></div>
                  <div className="bg-gray-700 rounded-full h-3 mb-4"></div>
                  <div className="h-6 bg-gray-700 rounded w-1/2"></div>
                </div>
              ) : levelInfo && (
                <>
                  {/* Clickable Level Progress Area */}
                  <div 
                    className="space-y-2 cursor-pointer hover:bg-zinc-800/30 p-3 -m-3 rounded-lg transition-colors"
                    onClick={() => setLocation('/rewards')}
                  >
                    {/* Level, Tier, and Progress in same line */}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm md:text-base">Nível {levelInfo.level}</span>
                      <span className={`text-base md:text-lg font-bold bg-gradient-to-r ${getTierInfo(levelInfo.level).color} bg-clip-text text-transparent`}>
                        {getTierInfo(levelInfo.level).name}
                      </span>
                      <span className="text-gray-400 text-sm md:text-base">{levelInfo.progress}%</span>
                    </div>
                    
                    {/* Progress Bar with tier color */}
                    <div className="w-full bg-zinc-800 rounded-full h-2 md:h-3 overflow-hidden">
                      <div 
                        className={`h-full bg-gradient-to-r ${getTierInfo(levelInfo.level).progressColor} transition-all duration-500`}
                        style={{ width: `${levelInfo.progress}%` }}
                      />
                    </div>
                    <p className="text-xs md:text-sm text-gray-500 text-center mt-2">Clique para ver recompensas</p>
                  </div>

                  {/* Referral Button */}
                  <button
                    onClick={() => setLocation('/referral')}
                    className="w-full bg-[#00E880] hover:bg-[#00D470] text-black font-bold py-4 md:py-5 px-5 md:px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-between shadow-lg hover:shadow-xl mt-4 border border-black/10"
                  >
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="p-2 md:p-3 bg-black/10 rounded-lg">
                        <UserPlus className="w-5 h-5 md:w-6 md:h-6" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm md:text-base font-bold">Indique e Ganhe</div>
                        <div className="text-xs md:text-sm opacity-80">Ganhe R$ 10,00 por indicação</div>
                      </div>
                    </div>
                    
                    <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
                  </button>
                </>
              )}
            </div>

            
          </div>

          {/* Quick Actions - Compact Modern Design */}
          <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-2 md:p-4 border border-gray-700/20">
            <div className="grid grid-cols-3 gap-1 md:gap-3">
              {/* History Button */}
              <button 
                onClick={() => setLocation("/history")}
                className="flex flex-col items-center justify-center py-3 md:py-5 px-2 md:px-4 rounded-xl hover:bg-gray-700/30 transition-all duration-200 group"
              >
                <Clock className="w-5 h-5 md:w-7 md:h-7 text-[#00E880] mb-1 md:mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] md:text-sm text-gray-400 group-hover:text-white">Histórico</span>
              </button>

              {/* Support Button */}
              <button 
                onClick={() => setLocation("/ajuda")}
                className="flex flex-col items-center justify-center py-3 md:py-5 px-2 md:px-4 rounded-xl hover:bg-gray-700/30 transition-all duration-200 group"
              >
                <HelpCircle className="w-5 h-5 md:w-7 md:h-7 text-blue-400 mb-1 md:mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] md:text-sm text-gray-400 group-hover:text-white">Ajuda</span>
              </button>

              {/* Logout Button */}
              <button 
                onClick={() => {
                  logout();
                  setLocation("/");
                }}
                className="flex flex-col items-center justify-center py-3 md:py-5 px-2 md:px-4 rounded-xl hover:bg-red-500/20 transition-all duration-200 group"
              >
                <LogOut className="w-5 h-5 md:w-7 md:h-7 text-red-400 mb-1 md:mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] md:text-sm text-red-400 group-hover:text-red-300">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full border border-gray-800">
            <h3 className="text-2xl font-bold text-white mb-4">Solicitar Saque</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm font-bold mb-2">
                  Valor (mínimo R$ 10,00)
                </label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0,00"
                  min="10"
                  step="0.01"
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#00E880]"
                />
              </div>
              
              <div>
                <label className="block text-gray-400 text-sm font-bold mb-2">
                  Chave PIX
                </label>
                <input
                  type="text"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder="Digite sua chave PIX"
                  className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#00E880]"
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleWithdraw}
                  disabled={withdrawMutation.isPending}
                  className="flex-1 bg-[#00E880] hover:bg-[#00D470] text-black font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
                >
                  {withdrawMutation.isPending ? "Processando..." : "Solicitar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MobileLayout>
  );
}