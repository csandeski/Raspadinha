import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Download, Upload, Wallet, RefreshCw, User, Gift, History, HelpCircle, LogIn, UserPlus, MessageCircle, TrendingUp, Edit2, ChevronDown, ChevronRight, ChevronLeft } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

import Footer from "./footer";
import { balanceTracker } from "@/lib/balance-tracker";
import { abbreviateName } from "@/lib/name-utils";

import logoImg from "/logos/logomania.svg";
import pixIcon from "/icons/pix.png";
import { Home, Trophy, GamepadIcon } from "lucide-react";

interface MobileLayoutProps {
  children: React.ReactNode;
  showBackButton?: boolean;
  onBackClick?: () => void;
  title?: string;
  onBack?: () => void;
  hideRightSection?: boolean;
  balanceChange?: { amount: number; isBonus: boolean } | null;
  bonusChange?: number | null;
  showBonusMode?: boolean;
  hideFooter?: boolean;
}

export function MobileLayout({ children, showBackButton, onBackClick, title, onBack, hideRightSection, balanceChange, bonusChange, showBonusMode, hideFooter }: MobileLayoutProps) {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showBalanceMenu, setShowBalanceMenu] = useState(false);
  const [showPixMenu, setShowPixMenu] = useState(false);
  const [showSupportMenu, setShowSupportMenu] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [balanceAnimating, setBalanceAnimating] = useState(false);
  const [currentBalanceChange, setCurrentBalanceChange] = useState<{ amount: number; isBonus: boolean; opacity: number } | null>(null);
  const [currentBonusChange, setCurrentBonusChange] = useState<{ amount: number; opacity: number } | null>(null);
  const [levelUpNotification, setLevelUpNotification] = useState<{ oldLevel: number; newLevel: number; show: boolean } | null>(null);
  const previousLevelRef = useRef<number | null>(null);
  
  // Helper function to get tier info - using same colors as rewards page
  const getTierInfo = (level: number) => {
    if (level >= 100) return { name: 'Diamante', color: 'from-cyan-400 to-blue-600', progressColor: 'from-cyan-400 to-blue-600' };
    if (level >= 75) return { name: 'Platina', color: 'from-gray-300 to-gray-500', progressColor: 'from-gray-300 to-gray-500' };
    if (level >= 50) return { name: 'Ouro', color: 'from-yellow-400 to-yellow-600', progressColor: 'from-yellow-400 to-yellow-600' };
    if (level >= 25) return { name: 'Prata', color: 'from-gray-400 to-gray-600', progressColor: 'from-gray-400 to-gray-600' };
    if (level >= 2) return { name: 'Bronze', color: 'from-amber-600 to-amber-800', progressColor: 'from-amber-600 to-amber-800' };
    return { name: 'Sem rank', color: 'from-gray-600 to-gray-800', progressColor: 'from-gray-600 to-gray-800' };
  };

  const menuRef = useRef<HTMLDivElement>(null);
  const balanceMenuRef = useRef<HTMLDivElement>(null);
  const pixMenuRef = useRef<HTMLDivElement>(null);
  const supportMenuRef = useRef<HTMLDivElement>(null);
  const modalCooldownRef = useRef(false);
  const balanceChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const bonusChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Query user balance
  const { data: userWallet } = useQuery<{
    balance: string;
    scratchBonus: number;
  }>({
    queryKey: ['/api/user/balance'],
    enabled: !!user,
  });

  // Query user level with auto-refresh
  const { data: levelInfo } = useQuery<{
    level: number;
    progress: number;
    totalWagered: string;
    requiredForNext: string;
    maxLevel: boolean;
  }>({
    queryKey: ["/api/user/level"],
    enabled: !!user,
    refetchInterval: 2000, // Refresh every 2 seconds
    staleTime: 0, // Always consider data stale
    cacheTime: 0, // Don't cache
  });

  const balance = userWallet?.balance || "0.00";
  const scratchBonus = userWallet?.scratchBonus || 0;

  // Detect level up
  useEffect(() => {
    if (levelInfo?.level && previousLevelRef.current !== null) {
      if (levelInfo.level > previousLevelRef.current) {
        // User leveled up!
        setLevelUpNotification({
          oldLevel: previousLevelRef.current,
          newLevel: levelInfo.level,
          show: true
        });
        
        // Hide notification after 4 seconds
        setTimeout(() => {
          setLevelUpNotification(null);
        }, 4000);
      }
    }
    previousLevelRef.current = levelInfo?.level || null;
  }, [levelInfo?.level]);

  // Register balance tracker callbacks
  useEffect(() => {
    balanceTracker.setBalanceChangeCallback((change) => {
      if (change) {
        // Clear any existing timeout
        if (balanceChangeTimeoutRef.current) {
          clearTimeout(balanceChangeTimeoutRef.current);
        }
        
        // Set new balance change with opacity animation
        setCurrentBalanceChange({
          amount: change.amount,
          isBonus: change.isBonus,
          opacity: 1
        });
        
        // Fade out after 2.5 seconds
        setTimeout(() => {
          setCurrentBalanceChange(prev => prev ? { ...prev, opacity: 0 } : null);
        }, 2500);
        
        // Remove completely after fade
        balanceChangeTimeoutRef.current = setTimeout(() => {
          setCurrentBalanceChange(null);
          balanceChangeTimeoutRef.current = null;
        }, 3000);
      }
    });

    balanceTracker.setBonusChangeCallback((change) => {
      if (change) {
        // Clear any existing timeout
        if (bonusChangeTimeoutRef.current) {
          clearTimeout(bonusChangeTimeoutRef.current);
        }
        
        // Set new bonus change with opacity animation
        setCurrentBonusChange({
          amount: change,
          opacity: 1
        });
        
        // Fade out after 2.5 seconds
        setTimeout(() => {
          setCurrentBonusChange(prev => prev ? { ...prev, opacity: 0 } : null);
        }, 2500);
        
        // Remove completely after fade
        bonusChangeTimeoutRef.current = setTimeout(() => {
          setCurrentBonusChange(null);
          bonusChangeTimeoutRef.current = null;
        }, 3000);
      }
    });

    return () => {
      balanceTracker.clearCallbacks();
    };
  }, []);

  // Track balance changes when userWallet updates
  useEffect(() => {
    if (userWallet) {
      const storedBalance = localStorage.getItem('lastBalance');
      const storedBonus = localStorage.getItem('lastScratchBonus');
      
      if (storedBalance) {
        const prevBalance = parseFloat(storedBalance);
        const newBalance = parseFloat(userWallet.balance);
        if (prevBalance !== newBalance) {
          // Add a small delay to debounce rapid updates
          setTimeout(() => {
            balanceTracker.trackBalanceChange(prevBalance, newBalance, userWallet.balance);
          }, 100);
        }
      }
      
      if (storedBonus) {
        const prevBonus = parseInt(storedBonus, 10);
        const newBonus = userWallet.scratchBonus;
        if (prevBonus !== newBonus) {
          // Add a small delay to debounce rapid updates
          setTimeout(() => {
            balanceTracker.trackBonusChange(prevBonus, newBonus);
          }, 100);
        }
      }
      
      // Update stored values
      localStorage.setItem('lastBalance', userWallet.balance);
      localStorage.setItem('lastScratchBonus', userWallet.scratchBonus.toString());
    }
  }, [userWallet]);

  // Handle navigation for authenticated actions
  const handleAuthenticatedAction = (route: string) => {
    if (!user) {
      // Check cooldown to prevent immediate reopening
      if (modalCooldownRef.current) {
        return;
      }
      setLocation('/register');
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
      if (supportMenuRef.current && !supportMenuRef.current.contains(event.target as Node)) {
        setShowSupportMenu(false);
      }
    };

    if (showProfileMenu || showBalanceMenu || showPixMenu || showSupportMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showProfileMenu, showBalanceMenu, showPixMenu, showSupportMenu]);



  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (balanceChangeTimeoutRef.current) {
        clearTimeout(balanceChangeTimeoutRef.current);
      }
      if (bonusChangeTimeoutRef.current) {
        clearTimeout(bonusChangeTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0E1015] text-white flex flex-col overflow-x-hidden">
      {/* Header - Fixed for all pages */}
      <header className="fixed top-0 left-0 right-0 bg-[#0E1015] z-[100]">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between px-3 md:px-4 h-14 md:h-20">
            {/* Left Section - Logo/Back Button */}
            <div className="flex items-center space-x-3">
              {onBack ? (
                <>
                  <button
                    onClick={onBack}
                    className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-white" />
                  </button>
                  {title && (
                    <h1 className="text-xl font-semibold text-white">{title}</h1>
                  )}
                </>
              ) : (
                <>
                  <button 
                    onClick={() => setLocation("/")}
                    className="transition-transform hover:scale-105"
                  >
                    <img 
                      src={logoImg} 
                      alt="Mania Brasil" 
                      className="h-8"
                    />
                  </button>
                  {showBackButton && (
                    <button
                      onClick={onBackClick}
                      className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors md:hidden"
                    >
                      <ArrowLeft className="w-5 h-5 text-white" />
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Desktop Navigation - Only visible on desktop */}
            {user && !onBack && (
              <div className="hidden md:flex items-center space-x-3 flex-1 justify-center">
                <button
                  onClick={() => setLocation("/")}
                  className="flex items-center gap-2 px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors text-gray-300 hover:text-white"
                >
                  <Home className="w-5 h-5" />
                  <span className="text-base font-medium">Início</span>
                </button>
                
                <button
                  onClick={() => setLocation("/rewards")}
                  className="flex items-center gap-2 px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors text-gray-300 hover:text-white"
                >
                  <Trophy className="w-5 h-5" />
                  <span className="text-base font-medium">Recompensas</span>
                </button>
                
                <button
                  onClick={() => setLocation("/wallet")}
                  className="flex items-center gap-2 px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors text-gray-300 hover:text-white"
                >
                  <Wallet className="w-5 h-5" />
                  <span className="text-base font-medium">Carteira</span>
                </button>
                
                <button
                  onClick={() => setLocation("/profile")}
                  className="flex items-center gap-2 px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors text-gray-300 hover:text-white"
                >
                  <User className="w-5 h-5" />
                  <span className="text-base font-medium">Perfil</span>
                </button>
              </div>
            )}

            {/* Desktop Registration Bonus Button - Only visible when not logged in */}
            {!user && !onBack && (
              <div className="hidden md:block absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <button
                  onClick={() => setLocation("/register?coupon=sorte")}
                  className="group transition-all duration-300 transform hover:scale-110 active:scale-95"
                >
                  <div className="flex items-center gap-3">
                    {/* Gift icon with animated glow */}
                    <div className="relative">
                      <div className="absolute inset-0 bg-[#00E880] rounded-full blur-lg opacity-50 group-hover:opacity-100 transition-opacity animate-pulse" />
                      <div className="relative w-10 h-10 bg-gradient-to-br from-[#00E880] to-[#00D470] rounded-full flex items-center justify-center shadow-lg">
                        <Gift className="w-5 h-5 text-black" />
                      </div>
                    </div>
                    
                    {/* Text content */}
                    <div className="text-left">
                      <div className="text-xs text-[#00E880]/80 font-semibold uppercase tracking-wider">BÔNUS EXCLUSIVO</div>
                      <div className="text-lg font-bold text-[#00E880] group-hover:text-[#00D470] transition-colors">
                        Ganhe bônus ao se cadastrar!
                      </div>
                    </div>
                    
                    {/* Arrow icon */}
                    <ChevronRight className="w-5 h-5 text-[#00E880] opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </div>
                </button>
              </div>
            )}

            {/* Right Section - Logo (if onBack) or Auth/Balance */}
            {onBack ? (
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
            ) : !hideRightSection ? (
              <div className="flex items-center space-x-3">
                {user ? (
                  <>
                    {/* Balance Display with Deposit Button - Authenticated Users */}
                    <div className="relative" ref={balanceMenuRef}>
                      <div className="flex items-center bg-gradient-to-r from-gray-900 to-gray-800 rounded-full shadow-lg p-0.5">
                        <div className="flex items-center bg-gray-900 rounded-full">
                          <button
                            onClick={() => setShowBalanceMenu(!showBalanceMenu)}
                            className="flex items-center px-4 py-2 hover:bg-gray-800 transition-colors rounded-l-full"
                          >
                            <div className="flex items-center space-x-2">
                              <div className="flex items-center space-x-3">
                                {/* Always show balance */}
                                <div className="flex items-center space-x-1.5">
                                  <span className="text-xs text-gray-500">R$</span>
                                  <span className={`text-base font-semibold text-white ${balanceAnimating ? 'animate-number-update' : ''}`}>{formatMoney(balance)}</span>
                                </div>
                                
                                {/* Separator */}
                                <div className="w-px h-4 bg-gray-600"></div>
                                
                                {/* Always show bonus */}
                                <div className="flex items-center space-x-1.5">
                                  <Gift className="w-4 h-4 text-purple-400" />
                                  <span className={`text-base font-semibold text-purple-400 ${balanceAnimating ? 'animate-number-update' : ''}`}>{scratchBonus}</span>
                                </div>
                              </div>
                            </div>
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
                                className="p-1 rounded-full hover:bg-gray-600 transition-colors"
                              >
                                <RefreshCw className={`w-4 h-4 text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                              </button>
                            </div>
                            
                            {/* Balance Cards */}
                            <div className="space-y-3">
                              <div className="bg-gradient-to-br from-gray-700/50 to-gray-800/50 p-3 rounded-lg">
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-400 text-sm">Saldo Total</span>
                                  <span className="text-[#00E880] font-bold text-lg">R$ {formatMoney(balance)}</span>
                                </div>
                              </div>
                              
                              <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/20 p-3 rounded-lg relative overflow-visible">
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-400 text-sm">Mania Bônus</span>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-purple-400 font-bold text-lg">{scratchBonus}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="grid grid-cols-2 gap-2 mt-4">
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
                    
                    {/* Profile Button with Dropdown */}
                    <div className="relative" ref={menuRef}>
                      <button 
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                        className="relative w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 overflow-hidden bg-gray-800 border border-gray-700"
                      >
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
                                  <div className="wave-shape absolute inset-0 bg-gradient-to-t from-transparent to-[#00D470]/30 animate-wave" style={{ animationDelay: '-2s' }}></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* User initial with shadow for better visibility */}
                        <span className="relative z-10 text-white font-bold text-sm drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                          {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </button>
                    
                      {/* Profile Dropdown Menu */}
                      {showProfileMenu && (
                        <div className="absolute right-0 mt-2 w-[300px] bg-[#0E1015]/95 border-zinc-800 p-0 rounded-xl backdrop-blur-sm z-50">
                          {/* User Info Section */}
                          <div className="p-4 border-b border-zinc-800">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="relative w-12 h-12 rounded-full flex items-center justify-center overflow-hidden bg-gray-800 border border-gray-700">
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
                                <span className="relative z-10 text-white font-bold text-xl drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                                </span>
                              </div>
                              <div className="flex-1">
                                <p className="text-white font-semibold">{abbreviateName(user?.name)}</p>
                                <p className="text-zinc-400 text-sm">{user?.email}</p>
                              </div>
                            </div>
                            
                            {/* Level Progress */}
                            <div 
                              className="space-y-2 cursor-pointer hover:bg-zinc-800/30 p-2 -m-2 rounded-lg transition-colors"
                              onClick={() => {
                                setLocation("/rewards");
                                setShowProfileMenu(false);
                              }}
                            >
                              {/* Level, Tier, and Progress in same line */}
                              <div className="flex items-center justify-between">
                                <span className="text-zinc-400 text-xs">Nível {levelInfo?.level || 1}</span>
                                <span className={`text-sm font-bold bg-gradient-to-r ${getTierInfo(levelInfo?.level || 1).color} bg-clip-text text-transparent`}>
                                  {getTierInfo(levelInfo?.level || 1).name}
                                </span>
                                <span className="text-zinc-400 text-xs">{levelInfo?.progress || 0}%</span>
                              </div>
                              <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                                <div 
                                  className={`h-full bg-gradient-to-r ${getTierInfo(levelInfo?.level || 1).progressColor} transition-all duration-500`}
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
                              <span className="text-white">Recompensas</span>
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
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => setLocation("/login")}
                      className="flex items-center gap-1.5 px-2.5 sm:px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap"
                    >
                      <LogIn className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                      <span>Entrar</span>
                    </button>
                    <button
                      onClick={() => setLocation("/register")}
                      className="flex items-center gap-1.5 px-2.5 sm:px-4 py-2 bg-gradient-to-r from-[#00E880] to-[#00D470] hover:from-[#00D470] hover:to-[#00C560] text-black rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap"
                    >
                      <UserPlus className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                      <span>Criar Conta</span>
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
        {/* Gray gradient border separator */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-gray-600/20 via-gray-600 to-gray-600/20"></div>
      </header>
      {/* Level Up Notification Animation - Above header */}
      <AnimatePresence>
        {levelUpNotification && levelUpNotification.show && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20,
              duration: 0.6
            }}
            className="fixed top-0 left-0 right-0 z-[200] pointer-events-none"
          >
            <div className="bg-gradient-to-r from-[#00E880] to-[#00D470] py-3 px-4 shadow-xl">
              <div className="flex items-center justify-center gap-3">
                <motion.div
                  animate={{
                    rotate: [0, 360],
                  }}
                  transition={{
                    duration: 1,
                    repeat: 2,
                  }}
                >
                  <TrendingUp className="w-6 h-6 text-black" />
                </motion.div>
                
                <div className="flex flex-col items-center">
                  <div className="text-black font-bold text-base">
                    SUBIU DE NÍVEL!
                  </div>
                  <div className="text-black/80 text-sm font-medium">
                    Nível {levelUpNotification.oldLevel} → Nível {levelUpNotification.newLevel}
                  </div>
                  {levelUpNotification.newLevel === 2 && (
                    <div className="text-black/70 text-xs">
                      Rank Bronze desbloqueado!
                    </div>
                  )}
                  {levelUpNotification.newLevel === 25 && (
                    <div className="text-black/70 text-xs">
                      Rank Prata desbloqueado!
                    </div>
                  )}
                  {levelUpNotification.newLevel === 50 && (
                    <div className="text-black/70 text-xs">
                      Rank Ouro desbloqueado!
                    </div>
                  )}
                  {levelUpNotification.newLevel === 75 && (
                    <div className="text-black/70 text-xs">
                      Rank Platina desbloqueado!
                    </div>
                  )}
                  {levelUpNotification.newLevel === 100 && (
                    <div className="text-black/70 text-xs">
                      Rank Diamante desbloqueado!
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Main Content */}
      <div className={`flex-1 pb-20 md:pb-0 pt-14 md:pt-20 flex flex-col`}>
        <div className="flex-1">
          {children}
        </div>
        
        {/* Footer */}
        {!hideFooter && <Footer />}
      </div>
      {/* Support button - above bottom navigation - Don't show on /ajuda page */}
      {user && location !== '/ajuda' && (
        <motion.div 
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ 
            type: "spring", 
            stiffness: 260, 
            damping: 20 
          }}
          className="fixed right-0 bottom-24 md:right-4 md:bottom-8 z-[110]" 
          ref={supportMenuRef}
        >
          <AnimatePresence mode="wait">
            {!showSupportMenu ? (
              // Collapsed button
              <motion.button
                key="collapsed"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowSupportMenu(true)}
                className="bg-gradient-to-r from-[#00e880] to-[#00c66d] rounded-l-full md:rounded-lg pr-1.5 pl-2 py-2.5 md:px-5 md:py-3.5 shadow-lg hover:shadow-xl text-[#000000] md:border-2 md:border-black/10 flex items-center gap-2"
              >
                <span className="hidden md:inline font-bold text-sm">
                  Preciso de Ajuda
                </span>
                <HelpCircle className="w-5 h-5 md:w-5 md:h-5" />
              </motion.button>
            ) : (
              // Expanded menu
              <motion.div
                key="expanded"
                initial={{ scale: 0.5, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.5, opacity: 0, y: 20 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="relative bg-gradient-to-br from-gray-900 to-black border-l border-y border-green-500/20 rounded-l-2xl p-3 md:p-4 shadow-2xl w-56 md:w-80 lg:w-96"
              >
                <div className="absolute top-2 left-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setTimeout(() => setShowSupportMenu(false), 50)}
                    className="text-gray-400 hover:text-white transition-colors p-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </motion.button>
                </div>

                <div className="space-y-2 md:space-y-3 mb-2 md:mb-3 pt-2 md:pt-3">
                  <div className="bg-gray-800/50 rounded-lg p-2 md:p-3 border border-gray-700/50">
                    <div className="flex items-center gap-2 mb-1">
                      <HelpCircle className="w-4 h-4 md:w-5 md:h-5 text-[#00e880]" />
                      <span className="text-xs md:text-sm text-gray-400">Precisa de ajuda?</span>
                    </div>
                    <p className="text-white font-bold text-lg md:text-xl">Resolva Agora</p>
                  </div>

                  <div className="bg-gray-800/50 rounded-lg p-2 md:p-3 border border-gray-700/50">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageCircle className="w-4 h-4 md:w-5 md:h-5 text-[#00e880]" />
                      <span className="text-xs md:text-sm text-gray-400">Atendimento rápido</span>
                    </div>
                    <p className="text-white font-semibold text-sm md:text-base">Chat humanizado</p>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setTimeout(() => setShowSupportMenu(false), 50);
                    setTimeout(() => setLocation('/ajuda'), 100);
                  }}
                  className="w-full bg-gradient-to-r from-[#00e880] to-[#00c66d] text-black font-bold py-2.5 md:py-3 rounded-lg flex items-center justify-center gap-2 hover:shadow-lg transition-all duration-300 text-sm md:text-base"
                >
                  <HelpCircle className="w-4 h-4 md:w-5 md:h-5" />
                  Ir agora
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
      {/* Bottom Navigation - Mobile only - Always visible */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100]">
        <div className="relative">
          {/* Center floating PIX button - lower position - Only for logged in users */}
          {user && (
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
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Main Bottom Navigation Bar */}
          {user ? (
            <div className="bg-[#0E1015] backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-[2.5rem] mb-2 mx-4">
              <div className="flex items-center justify-around px-4 py-2">
                {/* Home */}
                <button
                  onClick={() => setLocation("/")}
                  className="flex flex-col items-center space-y-0.5 p-0.5 transition-all duration-300 transform hover:scale-110 active:scale-95"
                >
                  <div className={`p-1 rounded-lg transition-all duration-300 ${
                    location === "/" 
                      ? "bg-[#00E880]/20 shadow-lg shadow-[#00E880]/30" 
                      : "hover:bg-white/10"
                  }`}>
                    <Home className={`w-5 h-5 ${location === "/" ? "text-[#00E880]" : "text-gray-400"}`} />
                  </div>
                  <span className={`text-[9px] font-medium ${location === "/" ? "text-[#00E880]" : "text-gray-400"}`}>Início</span>
                </button>

                {/* Rewards */}
                <button
                  onClick={() => handleAuthenticatedAction("/rewards")}
                  className="flex flex-col items-center space-y-0.5 p-0.5 transition-all duration-300 transform hover:scale-110 active:scale-95"
                >
                  <div className={`p-1 rounded-lg transition-all duration-300 ${
                    location === "/rewards" 
                      ? "bg-[#00E880]/20 shadow-lg shadow-[#00E880]/30" 
                      : "hover:bg-white/10"
                  }`}>
                    <Gift className={`w-5 h-5 ${location === "/rewards" ? "text-[#00E880]" : "text-gray-400"}`} />
                  </div>
                  <span className={`text-[9px] font-medium ${location === "/rewards" ? "text-[#00E880]" : "text-gray-400"}`}>Recompensas</span>
                </button>

                {/* PIX - Central larger button (space for it) */}
                <div className="w-12"></div>

                {/* Wallet */}
                <button
                  onClick={() => handleAuthenticatedAction("/wallet")}
                  className="flex flex-col items-center space-y-0.5 p-0.5 transition-all duration-300 transform hover:scale-110 active:scale-95"
                >
                  <div className={`p-1 rounded-lg transition-all duration-300 ${
                    location === "/wallet" 
                      ? "bg-[#00E880]/20 shadow-lg shadow-[#00E880]/30" 
                      : "hover:bg-white/10"
                  }`}>
                    <Wallet className={`w-5 h-5 ${location === "/wallet" ? "text-[#00E880]" : "text-gray-400"}`} />
                  </div>
                  <span className={`text-[9px] font-medium ${location === "/wallet" ? "text-[#00E880]" : "text-gray-400"}`}>Carteira</span>
                </button>

                {/* Profile */}
                <button
                  onClick={() => handleAuthenticatedAction("/profile")}
                  className="flex flex-col items-center space-y-0.5 p-0.5 transition-all duration-300 transform hover:scale-110 active:scale-95"
                >
                  <div className={`p-1 rounded-lg transition-all duration-300 ${
                    location === "/profile" 
                      ? "bg-[#00E880]/20 shadow-lg shadow-[#00E880]/30" 
                      : "hover:bg-white/10"
                  }`}>
                    <User className={`w-5 h-5 ${location === "/profile" ? "text-[#00E880]" : "text-gray-400"}`} />
                  </div>
                  <span className={`text-[9px] font-medium ${location === "/profile" ? "text-[#00E880]" : "text-gray-400"}`}>Perfil</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="px-4 mb-4">
              {/* Beautiful bonus button for logged out users */}
              <div className="relative flex items-center h-[60px]">
                {/* Background glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#00E880]/30 to-[#00D470]/30 blur-2xl animate-pulse" />
                
                {/* Main Bonus Button */}
                <button
                  onClick={() => setLocation("/register?coupon=sorte")}
                  className="relative flex-1 h-full group overflow-hidden rounded-3xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] mr-[-30px] pr-12"
                >
                  {/* Glass morphism background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-900/80 via-gray-800/80 to-gray-900/80 backdrop-blur-xl" />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#00E880]/20 to-[#00D470]/20" />
                  <div className="absolute inset-0 border border-[#00E880]/30 rounded-3xl" />
                  
                  {/* Animated gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-[#00E880] via-[#00D470] to-[#00E880] opacity-100 animate-gradient-x" />
                  
                  {/* Content */}
                  <div className="relative h-full flex items-center px-4">
                    <div className="flex items-center gap-3">
                      {/* Gift icon with glow */}
                      <div className="relative">
                        <div className="absolute inset-0 bg-black/30 rounded-full blur-lg" />
                        <div className="relative w-10 h-10 bg-gradient-to-br from-gray-900 to-black rounded-full flex items-center justify-center">
                          <Gift className="w-5 h-5 text-[#00E880]" />
                        </div>
                      </div>
                      
                      {/* Text content */}
                      <div className="text-left flex-1">
                        <div className="text-[10px] text-gray-900 font-medium">BÔNUS EXCLUSIVO</div>
                        <div className="text-base font-bold text-black">Resgatar bônus agora</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Shine effect on hover */}
                  <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-white/20 to-transparent rotate-45 transform translate-x-full group-hover:translate-x-0 transition-transform duration-700" />
                </button>
                
                {/* Circular Login Button */}
                <button
                  onClick={() => setLocation("/login")}
                  className="relative z-10 w-[60px] h-[60px] bg-gradient-to-br from-gray-800 to-gray-900 rounded-full shadow-2xl border border-white/20 flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 hover:border-[#00E880]/50"
                >
                  <LogIn className="w-7 h-7 text-[#00E880]" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}