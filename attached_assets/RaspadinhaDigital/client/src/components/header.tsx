import { useAuth } from "../lib/auth.tsx";
import { useLocation } from "wouter";
import logoImg from "/logos/logomania.svg";
import { User, Gift, Share2, History as HistoryIcon, DollarSign, HelpCircle, Wallet } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";

export default function Header() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch user level information
  const { data: levelInfo } = useQuery<{
    level: number;
    progress: number;
    totalWagered: string;
    requiredForNext: string;
    maxLevel: boolean;
  }>({
    queryKey: ["/api/user/level"],
    enabled: !!user,
  });

  return (
    <header className="sticky top-0 z-40 bg-black/20 backdrop-blur-md border-b border-white/10">
      <div className="container mx-auto px-3 sm:px-4 py-2.5 sm:py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <img 
              src={logoImg} 
              alt="Raspadinha da Sorte" 
              className="h-8 sm:h-10"
            />
          </div>
          
          {user ? (
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="bg-gray-900/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-gray-700">
                <span className="text-xs sm:text-sm font-medium text-gray-300">R$ </span>
                <span className="text-xs sm:text-sm font-bold text-white">{parseFloat(user.balance).toFixed(2)}</span>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="text-white hover:text-orange-400 transition-colors">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-[#00E880] to-[#00D470] flex items-center justify-center text-sm sm:text-base shadow-lg">
                      <span className="text-black font-bold">{user.name.charAt(0).toUpperCase()}</span>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                
                <DropdownMenuContent className="w-[300px] bg-zinc-900/95 border-zinc-800 p-0 rounded-xl backdrop-blur-sm">
                  {/* User Info Section */}
                  <div className="p-4 border-b border-zinc-800">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#00E880] to-[#00D470] rounded-full flex items-center justify-center">
                        <span className="text-xl font-bold text-black">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-semibold">{user.name}</p>
                        <p className="text-zinc-400 text-sm">{user.email}</p>
                      </div>
                    </div>
                    
                    {/* Level Progress */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400 text-sm">Nível {levelInfo?.level || 1}</span>
                        <span className="text-zinc-400 text-sm">{levelInfo?.progress || 0}%</span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-[#00E880] to-[#00D470] transition-all duration-500"
                          style={{ width: `${levelInfo?.progress || 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Menu Items */}
                  <div className="p-2">
                    <DropdownMenuItem 
                      className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/50 cursor-pointer rounded-lg"
                      onClick={() => setLocation('/profile')}
                    >
                      <User className="w-5 h-5 text-zinc-400" />
                      <span className="text-white">Meu Perfil</span>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem 
                      className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/50 cursor-pointer rounded-lg"
                      onClick={() => setLocation('/rewards')}
                    >
                      <Gift className="w-5 h-5 text-zinc-400" />
                      <span className="text-white">Prêmio Grátis</span>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem 
                      className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/50 cursor-pointer rounded-lg"
                      onClick={() => setLocation('/referral')}
                    >
                      <Share2 className="w-5 h-5 text-zinc-400" />
                      <span className="text-white">Indique e Ganhe</span>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem 
                      className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/50 cursor-pointer rounded-lg"
                      onClick={() => setLocation('/history')}
                    >
                      <HistoryIcon className="w-5 h-5 text-zinc-400" />
                      <span className="text-white">Histórico</span>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem 
                      className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/50 cursor-pointer rounded-lg"
                      onClick={() => setLocation('/wallet')}
                    >
                      <Wallet className="w-5 h-5 text-zinc-400" />
                      <span className="text-white">Carteira</span>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem 
                      className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/50 cursor-pointer rounded-lg"
                      onClick={() => setLocation('/support')}
                    >
                      <HelpCircle className="w-5 h-5 text-zinc-400" />
                      <span className="text-white">Suporte</span>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLocation("/auth")}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-gray-300 bg-gray-800/80 hover:bg-gray-700/80 rounded-lg transition-all border border-gray-700"
              >
                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Entrar
              </button>
              <button
                onClick={() => setLocation("/auth")}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-black bg-gradient-to-r from-[#00E880] to-[#00D074] hover:from-[#00F590] hover:to-[#00E584] rounded-lg transition-all transform hover:scale-105 shadow-lg"
              >
                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Cadastrar
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
