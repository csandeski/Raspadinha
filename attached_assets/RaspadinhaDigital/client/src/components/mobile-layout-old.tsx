import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import logoImg from "/logos/logomania.svg";
import pixIcon from "/icons/pix.png";
import RotatingBanner from "./rotating-banner";
import Footer from "./footer";
import { Home, History, Wallet, User, Gift, Users, DollarSign, Award, Crown, ArrowLeft, RefreshCw, Download, Upload, Share2, HelpCircle } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface MobileLayoutProps {
  children: React.ReactNode;
  showBackButton?: boolean;
  onBackClick?: () => void;
  title?: string;
  onBack?: () => void;
  hideRightSection?: boolean;
}

export function MobileLayout({ children, showBackButton, onBackClick, title, onBack, hideRightSection }: MobileLayoutProps) {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showBalanceMenu, setShowBalanceMenu] = useState(false);
  const [showPixMenu, setShowPixMenu] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [balanceAnimating, setBalanceAnimating] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const balanceMenuRef = useRef<HTMLDivElement>(null);
  const pixMenuRef = useRef<HTMLDivElement>(null);

  // Query user balance
  const { data: userWallet } = useQuery<{
    balance: string;
    bonusBalance: string;
  }>({
    queryKey: ['/api/user/balance'],
    enabled: !!user,
  });

  // Query user level
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

  const balance = userWallet?.balance || "0.00";
  const bonusBalance = userWallet?.bonusBalance || "0.00";

  // Handle navigation for authenticated actions
  const handleAuthenticatedAction = (route: string) => {
    if (!user) {
      setLocation("/login");
      return;
    }
    setLocation(route);
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
      if (balanceMenuRef.current && !balanceMenuRef.current.contains(event.target as Node)) {
        setShowBalanceMenu(false);
      }
      if (pixMenuRef.current && !pixMenuRef.current.contains(event.target as Node)) {
        setShowPixMenu(false);
      }
    };

    if (showProfileMenu || showBalanceMenu || showPixMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showProfileMenu, showBalanceMenu, showPixMenu]);

  return (
    <div className="min-h-screen bg-[#0E1015] text-white flex flex-col">
      {/* Rotating Banner */}
      <div className="fixed top-0 left-0 right-0 z-[110]">
        <RotatingBanner />
      </div>
      
      {/* Header - Fixed for all pages */}
      <header className="fixed top-8 left-0 right-0 bg-[#0E1015] z-[100]">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center justify-between w-full">
              {onBack ? (
                <>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={onBack}
                      className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5 text-white" />
                    </button>
                    {title && (
                      <h1 className="text-xl font-semibold text-white">{title}</h1>
                    )}
                  </div>
                  <button 
                    onClick={() => setLocation("/")}
                    className="transition-transform hover:scale-105"
                  >
                    <img 
                      src={logoImg} 
                      alt="Raspadinha da Sorte" 
                      className="h-8"
                    />
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => setLocation("/")}
                    className="transition-transform hover:scale-105"
                  >
                    <img 
                      src={logoImg} 
                      alt="Raspadinha da Sorte" 
                      className="h-8"
                    />
                  </button>
                  {showBackButton && (
                    <button
                      onClick={onBackClick}
                      className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5 text-white" />
                    </button>
                  )}
                </>
              )}
            </div>
            
            {!hideRightSection && (
              <div className="flex items-center space-x-3">
                {user ? (
                  <>
                    {/* Balance Display with Deposit Button - Authenticated Users */}
                    <div className="relative" ref={balanceMenuRef}>
                <div className="flex items-center bg-gradient-to-r from-gray-900 to-gray-800 rounded-full shadow-lg p-0.5">
                  <div className="flex items-center bg-gray-900 rounded-full">
                    <button
                      onClick={() => setShowBalanceMenu(!showBalanceMenu)}
                      className="flex items-center space-x-1.5 px-4 py-2 hover:bg-gray-800 transition-colors rounded-l-full"
                    >
                      <span className="text-xs text-gray-500">R$</span>
                      <span className={`text-base font-semibold text-white ${balanceAnimating ? 'animate-number-update' : ''}`}>{balance}</span>
                    </button>
                    
                    <button 
                      onClick={() => setLocation("/deposit")}
                      className="bg-gradient-to-r from-[#00E880] to-[#00D470] hover:from-[#00D470] hover:to-[#00C560] text-black p-1.5 sm:px-3 sm:py-2 rounded-full transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg mr-0.5 flex items-center space-x-1"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/>
                      </svg>
                      <span className="hidden sm:inline text-sm font-semibold">Depositar</span>
                    </button>
                  </div>
                </div>
                
                {/* Balance Dropdown Menu */}
                {showBalanceMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-[#1a1a1a] rounded-xl shadow-2xl border border-gray-700 overflow-hidden z-50 animate-slideIn">
                    <div className="p-4 bg-gradient-to-b from-gray-800/30 to-gray-900/30">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <Wallet className="w-5 h-5 text-gray-400" />
                          <span className="text-gray-300 font-medium">Minha Carteira</span>
                        </div>
                        <button
                          onClick={async () => {
                            setIsRefreshing(true);
                            setBalanceAnimating(true);
                            
                            // Query pending PIX first to get transaction ID
                            const pendingPix = await apiRequest('/api/payments/pending-pix', 'GET');
                            if (pendingPix?.hasPending && pendingPix?.pixData?.transactionId) {
                              await apiRequest('/api/payments/verify-pix', 'POST', {
                                transactionId: pendingPix.pixData.transactionId
                              });
                            }
                            // Refresh balance and transactions
                            await Promise.all([
                              queryClient.invalidateQueries({ queryKey: ['/api/user/balance'] }),
                              queryClient.invalidateQueries({ queryKey: ['/api/user/transactions'] }),
                              queryClient.invalidateQueries({ queryKey: ['/api/payments/pending-pix'] })
                            ]);
                            
                            setTimeout(() => {
                              setIsRefreshing(false);
                              setBalanceAnimating(false);
                            }, 1000);
                          }}
                          disabled={isRefreshing}
                          className="p-1.5 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 transition-colors group"
                        >
                          <RefreshCw className={`w-4 h-4 text-gray-400 group-hover:text-white transition-colors ${isRefreshing ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                      
                      {/* Saldo Total */}
                      <div className="mb-4">
                        <p className="text-gray-400 text-xs mb-1">Saldo Total</p>
                        <div className="flex items-baseline">
                          <span className={`text-[#00E880] text-2xl font-bold ${balanceAnimating ? 'animate-number-update' : ''}`}>
                            R$ {(parseFloat(balance) + parseFloat(bonusBalance)).toFixed(2)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Saldo Disponível */}
                      <div className="mb-4">
                        <p className="text-gray-400 text-xs mb-1">Saldo Disponível</p>
                        <div className="flex items-baseline mt-1">
                          <span className={`text-white text-lg font-semibold ${balanceAnimating ? 'animate-number-update' : ''}`}>R$ {balance}</span>
                        </div>
                      </div>
                      
                      {/* Saldo Bônus */}
                      <div className="mb-4">
                        <p className="text-gray-400 text-xs mb-1">Saldo Bônus</p>
                        <div className="flex items-baseline mt-1">
                          <span className={`text-lg font-semibold text-[#c084fc] ${balanceAnimating ? 'animate-number-update' : ''}`}>R$ {bonusBalance}</span>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            setLocation("/deposit");
                            setShowBalanceMenu(false);
                          }}
                          className="py-2 px-3 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg transition-all duration-200 flex items-center justify-center gap-1 text-sm font-semibold"
                        >
                          <Download className="w-4 h-4" />
                          Depositar
                        </button>
                        
                        <button
                          onClick={() => {
                            setLocation("/saque");
                            setShowBalanceMenu(false);
                          }}
                          className="py-2 px-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-all duration-200 flex items-center justify-center gap-1 text-sm font-semibold"
                        >
                          <Upload className="w-4 h-4" />
                          Sacar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Profile/Auth Section */}
              {user ? (
                <>
                  {/* Profile Button with Dropdown - Only show for authenticated users */}
                  <div className="relative" ref={menuRef}>
                    <button 
                      onClick={() => setShowProfileMenu(!showProfileMenu)}
                      className="w-8 h-8 bg-[#00E880] rounded-full flex items-center justify-center transition-transform hover:scale-110"
                    >
                      <span className="text-black font-bold text-sm">
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </button>
                  
                    {/* Profile Dropdown Menu */}
                    {showProfileMenu && (
                      <div className="absolute right-0 mt-2 w-[300px] bg-[#0E1015]/95 border-zinc-800 p-0 rounded-xl backdrop-blur-sm z-50">
                        {/* User Info Section */}
                        <div className="p-4 border-b border-zinc-800">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-[#00E880] to-[#00D470] rounded-full flex items-center justify-center">
                              <span className="text-xl font-bold text-black">
                                {user?.name?.charAt(0).toUpperCase() || 'U'}
                              </span>
                            </div>
                            <div>
                              <p className="text-white font-semibold">{user?.name}</p>
                              <p className="text-zinc-400 text-sm">{user?.email}</p>
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
                          <button
                            onClick={() => {
                              setLocation("/profile");
                              setShowProfileMenu(false);
                            }}
                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-zinc-800/50 cursor-pointer rounded-lg transition-colors"
                          >
                            <User className="w-5 h-5 text-zinc-400" />
                            <span className="text-white">Meu Perfil</span>
                          </button>

                          <button
                            onClick={() => {
                              setLocation("/rewards");
                              setShowProfileMenu(false);
                            }}
                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-zinc-800/50 cursor-pointer rounded-lg transition-colors"
                          >
                            <Gift className="w-5 h-5 text-zinc-400" />
                            <span className="text-white">Prêmio Grátis</span>
                          </button>

                          <button
                            onClick={() => {
                              setLocation("/history");
                              setShowProfileMenu(false);
                            }}
                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-zinc-800/50 cursor-pointer rounded-lg transition-colors"
                          >
                            <History className="w-5 h-5 text-zinc-400" />
                            <span className="text-white">Histórico</span>
                          </button>

                          <button
                            onClick={() => {
                              setLocation("/wallet");
                              setShowProfileMenu(false);
                            }}
                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-zinc-800/50 cursor-pointer rounded-lg transition-colors"
                          >
                            <Wallet className="w-5 h-5 text-zinc-400" />
                            <span className="text-white">Carteira</span>
                          </button>

                          <button
                            onClick={() => {
                              setLocation("/support");
                              setShowProfileMenu(false);
                            }}
                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-zinc-800/50 cursor-pointer rounded-lg transition-colors"
                          >
                            <HelpCircle className="w-5 h-5 text-zinc-400" />
                            <span className="text-white">Suporte</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setLocation("/login")}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Entrar
                  </button>
                  <button
                    onClick={() => setLocation("/register")}
                    className="px-4 py-2 bg-gradient-to-r from-[#00E880] to-[#00D470] hover:from-[#00D470] hover:to-[#00C560] text-black rounded-lg text-sm font-medium transition-all"
                  >
                    Criar Conta
                  </button>
                </div>
              )}
            </div>
            
            {!hideRightSection && (
              <div className="flex items-center space-x-3">
                {/* Content for authenticated/non-authenticated users already handled above */}
              </div>
            )}
          </div>
        </div>
        {/* Gray gradient border separator */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-gray-600/20 via-gray-600 to-gray-600/20"></div>
      </header>
      {/* Main Content */}
      <div className="flex-1 pb-20 md:pb-0 pt-28">
        {children}
        
        {/* Footer */}
        <Footer />
      </div>
      {/* Bottom Navigation - Mobile only - Always visible */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100]">
        <div className="relative">
          {/* Center floating PIX button - lower position */}
          <div className="absolute left-1/2 transform -translate-x-1/2 -top-5 z-10" ref={pixMenuRef}>
            <div className="relative">
              {/* Pulse effect ring */}
              <div className="absolute inset-0 rounded-full bg-[#00E880] animate-ping opacity-20" />
              <div className="absolute inset-0 rounded-full bg-[#00E880] animate-ping opacity-10 animation-delay-300" />
              
              <button 
                onClick={() => setShowPixMenu(!showPixMenu)}
                className={`relative bg-gradient-to-br from-[#00E880] to-[#00D470] rounded-full p-4 shadow-2xl transform transition-all duration-300 hover:scale-110 active:scale-95 ${showPixMenu ? 'scale-95 shadow-[#00E880]/50' : ''}`}
              >
                {/* Inner glow effect */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
                <img src={pixIcon} alt="PIX" className="relative w-8 h-8 drop-shadow-lg" />
              </button>
            </div>
            
            {/* PIX Submenu */}
            {showPixMenu && (
              <div className="absolute bottom-full mb-6 left-1/2 transform -translate-x-1/2 animate-pixMenuSlide">
                <div className="relative">
                  {/* Modern glass effect background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-black/50" />
                  <div className="absolute inset-0 bg-gradient-to-br from-[#00E880]/20 via-transparent to-red-500/10 rounded-3xl" />
                  <div className="absolute inset-0 border border-white/10 rounded-3xl" />
                  
                  <div className="relative flex gap-4 p-3">
                    {/* Deposit Button */}
                    <button
                      onClick={() => {
                        handleAuthenticatedAction("/deposit");
                        setShowPixMenu(false);
                      }}
                      className="group relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-4 shadow-2xl overflow-hidden transition-all duration-300 hover:scale-105 active:scale-95 border border-white/5 hover:border-[#00E880]/30"
                    >
                      {/* Hover effect gradient */}
                      <div className="absolute inset-0 bg-gradient-to-br from-[#00E880]/20 to-[#00D470]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      <div className="relative flex flex-col items-center space-y-2">
                        <div className="w-14 h-14 bg-gradient-to-br from-[#00E880] to-[#00D470] rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-[#00E880]/50 transition-all duration-300">
                          <Download className="w-7 h-7 text-black" />
                        </div>
                        <span className="text-sm text-white font-bold tracking-wide">Depositar</span>
                      </div>
                      
                      {/* Shine effect */}
                      <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-white/10 to-transparent rotate-45 transform translate-x-full group-hover:translate-x-0 transition-transform duration-700" />
                    </button>
                    
                    {/* Withdraw Button */}
                    <button
                      onClick={() => {
                        handleAuthenticatedAction("/saque");
                        setShowPixMenu(false);
                      }}
                      className="group relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-4 shadow-2xl overflow-hidden transition-all duration-300 hover:scale-105 active:scale-95 border border-white/5 hover:border-red-500/30"
                    >
                      {/* Hover effect gradient */}
                      <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-red-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      <div className="relative flex flex-col items-center space-y-2">
                        <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-red-500/50 transition-all duration-300">
                          <Upload className="w-7 h-7 text-white" />
                        </div>
                        <span className="text-sm text-white font-bold tracking-wide">Sacar</span>
                      </div>
                      
                      {/* Shine effect */}
                      <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-white/10 to-transparent rotate-45 transform translate-x-full group-hover:translate-x-0 transition-transform duration-700" />
                    </button>
                  </div>
                  
                  {/* Arrow pointing to PIX button */}
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-gray-800 rotate-45 border-r border-b border-white/10" />
                </div>
              </div>
            )}
          </div>
          
          {/* Navigation Bar with glass effect */}
          <div className="bg-[#0E1015]/95 backdrop-blur-lg border-t border-gray-600/20 py-3 px-4">
            <div className="flex items-center justify-around">
              <button 
                onClick={() => setLocation("/")}
                className="p-2 rounded-xl transition-all duration-300 hover:bg-gray-800/50 active:scale-90"
              >
                <Home className={`w-6 h-6 transition-transform duration-300 hover:scale-110 ${location === '/' ? 'text-[#00E880]' : 'text-gray-400'}`} />
              </button>
              
              <button 
                onClick={() => handleAuthenticatedAction("/history")}
                className="p-2 rounded-xl transition-all duration-300 hover:bg-gray-800/50 active:scale-90"
              >
                <History className={`w-6 h-6 transition-all duration-300 hover:scale-110 ${location === '/history' ? 'text-[#00E880]' : 'text-gray-400 hover:text-gray-300'}`} />
              </button>
              
              {/* Empty space for center button */}
              <div className="w-16"></div>
              
              <button 
                onClick={() => handleAuthenticatedAction("/wallet")}
                className="p-2 rounded-xl transition-all duration-300 hover:bg-gray-800/50 active:scale-90"
              >
                <Wallet className={`w-6 h-6 transition-all duration-300 hover:scale-110 ${location === '/wallet' ? 'text-[#00E880]' : 'text-gray-400 hover:text-gray-300'}`} />
              </button>
              
              <button 
                onClick={() => handleAuthenticatedAction("/profile")}
                className="p-2 rounded-xl transition-all duration-300 hover:bg-gray-800/50 active:scale-90"
              >
                <User className={`w-6 h-6 transition-all duration-300 hover:scale-110 ${location === '/profile' ? 'text-[#00E880]' : 'text-gray-400 hover:text-gray-300'}`} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}