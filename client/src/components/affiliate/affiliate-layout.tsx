import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { performAffiliateLogout } from "@/utils/affiliate-logout";
import { Progress } from "@/components/ui/progress";
import { formatBRL } from "@/lib/format";
import maniaLogo from "/logos/logomania.svg";
import { 
  LayoutDashboard,
  Link2,
  Users,
  DollarSign,
  FileText,
  Download,
  Settings,
  LogOut,
  Menu,
  X,
  TrendingUp,
  Gift,
  MessageSquare,
  BarChart3,
  Wallet,
  History,
  Target,
  Award,
  ChevronRight,
  Bell,
  HelpCircle,
  TestTube
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { AvatarSelector } from "./avatar-selector";

interface AffiliateLayoutProps {
  children: React.ReactNode;
  activeSection?: string;
}

export function AffiliateLayout({ children, activeSection = "dashboard" }: AffiliateLayoutProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentSection, setCurrentSection] = useState(activeSection);
  const [isAvatarSelectorOpen, setIsAvatarSelectorOpen] = useState(false);
  
  // Update currentSection when activeSection prop changes
  useEffect(() => {
    setCurrentSection(activeSection);
  }, [activeSection]);
  const desktopMenuRef = useRef<HTMLElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      path: "/afiliados/dashboard",
      color: "from-blue-500 to-cyan-500"
    },
    {
      id: "links",
      label: "Meus Links",
      icon: Link2,
      path: "/afiliados/links",
      color: "from-purple-500 to-pink-500"
    },
    {
      id: "network",
      label: "Minha Rede",
      icon: Users,
      path: "/afiliados/network",
      color: "from-green-500 to-emerald-500"
    },
    {
      id: "earnings",
      label: "Ganhos",
      icon: DollarSign,
      path: "/afiliados/earnings",
      color: "from-yellow-500 to-orange-500"
    },
    {
      id: "withdrawals",
      label: "Saques",
      icon: Wallet,
      path: "/afiliados/withdrawals",
      color: "from-indigo-500 to-purple-500"
    },
    {
      id: "levels",
      label: "Níveis Comissão",
      icon: TrendingUp,
      path: "/afiliados/levels",
      color: "from-emerald-500 to-green-500"
    },
    {
      id: "materials",
      label: "Materiais",
      icon: Download,
      path: "/afiliados/materials",
      color: "from-teal-500 to-cyan-500"
    },
    {
      id: "history",
      label: "Histórico",
      icon: History,
      path: "/afiliados/history",
      color: "from-gray-500 to-gray-600"
    },
    {
      id: "demo",
      label: "Conta Demo",
      icon: TestTube,
      path: "/afiliados/demo",
      color: "from-rose-500 to-pink-500"
    },
    {
      id: "parceiros",
      label: "Parceiros",
      icon: Users,
      path: "/afiliados/parceiros",
      color: "from-purple-500 to-indigo-500"
    }
  ];

  const handleLogout = () => {
    toast({
      title: "Logout realizado",
      description: "Você saiu do painel de afiliados com sucesso"
    });
    
    // Use centralized logout function
    performAffiliateLogout(false); // false because we already showed the toast
  };

  const handleNavigation = (item: any) => {
    // Save menu scroll position to sessionStorage
    if (desktopMenuRef.current) {
      sessionStorage.setItem('affiliateMenuScroll', desktopMenuRef.current.scrollTop.toString());
    }
    if (mobileMenuRef.current) {
      sessionStorage.setItem('affiliateMobileMenuScroll', mobileMenuRef.current.scrollTop.toString());
    }
    
    setCurrentSection(item.id);
    setLocation(item.path);
    setIsSidebarOpen(false);
  };

  // Restore menu scroll position on mount
  useEffect(() => {
    // Use a timeout to ensure DOM is fully rendered
    const timer = setTimeout(() => {
      // Restore desktop menu scroll
      const savedDesktopScroll = sessionStorage.getItem('affiliateMenuScroll');
      if (savedDesktopScroll && desktopMenuRef.current) {
        const scrollValue = parseInt(savedDesktopScroll, 10);
        desktopMenuRef.current.scrollTop = scrollValue;
        // Force a second attempt after a small delay to ensure it works
        setTimeout(() => {
          if (desktopMenuRef.current) {
            desktopMenuRef.current.scrollTop = scrollValue;
          }
        }, 100);
      }
      
      // Restore mobile menu scroll
      const savedMobileScroll = sessionStorage.getItem('affiliateMobileMenuScroll');
      if (savedMobileScroll && mobileMenuRef.current) {
        const scrollValue = parseInt(savedMobileScroll, 10);
        mobileMenuRef.current.scrollTop = scrollValue;
        // Force a second attempt after a small delay to ensure it works
        setTimeout(() => {
          if (mobileMenuRef.current) {
            mobileMenuRef.current.scrollTop = scrollValue;
          }
        }, 100);
      }
    }, 50);
    
    return () => clearTimeout(timer);
  });
  
  // Save scroll position when scrolling
  useEffect(() => {
    const handleDesktopScroll = () => {
      if (desktopMenuRef.current) {
        sessionStorage.setItem('affiliateMenuScroll', desktopMenuRef.current.scrollTop.toString());
      }
    };
    
    const handleMobileScroll = () => {
      if (mobileMenuRef.current) {
        sessionStorage.setItem('affiliateMobileMenuScroll', mobileMenuRef.current.scrollTop.toString());
      }
    };
    
    const desktopMenu = desktopMenuRef.current;
    const mobileMenu = mobileMenuRef.current;
    
    if (desktopMenu) {
      desktopMenu.addEventListener('scroll', handleDesktopScroll);
    }
    if (mobileMenu) {
      mobileMenu.addEventListener('scroll', handleMobileScroll);
    }
    
    return () => {
      if (desktopMenu) {
        desktopMenu.removeEventListener('scroll', handleDesktopScroll);
      }
      if (mobileMenu) {
        mobileMenu.removeEventListener('scroll', handleMobileScroll);
      }
    };
  }, []);

  // Check token first
  const token = localStorage.getItem('affiliateToken');
  const hasToken = !!token;
  
  // Redirect if no token
  useEffect(() => {
    if (!hasToken) {
      setLocation('/afiliados/auth');
    }
  }, [hasToken, setLocation]);
  
  // Fetch affiliate info from API
  const { data: affiliateInfo, refetch: refetchAffiliateInfo, isLoading: isLoadingInfo, error: infoError } = useQuery<{
    name: string;
    email: string;
    code: string;
    affiliateLevel: string;
    currentLevelRate: number;
    customCommissionRate?: string;
    customFixedAmount?: string;
    commissionType?: string;
    approvedEarnings: number;
    totalEarnings: number;
    pendingEarnings: number;
    avatar?: string;
  }>({
    queryKey: ["/api/affiliate/info"],
    enabled: hasToken, // Only fetch if we have a token
    refetchInterval: hasToken ? 60000 : false, // Only refresh if token exists
    retry: false // Don't retry on errors
  });
  
  // Fetch wallet balance
  const { data: walletData, isLoading: isLoadingWallet, error: walletError } = useQuery<{
    wallet: {
      balance: number;
      pendingBalance: number;
      totalEarned: number;
      totalWithdrawn: number;
    }
  }>({
    queryKey: ["/api/affiliate/earnings"],
    enabled: hasToken, // Only fetch if we have a token
    refetchInterval: hasToken ? 30000 : false, // Only refresh if token exists
    retry: false // Don't retry on errors
  });
  
  // Handle 401 errors
  useEffect(() => {
    if ((infoError as any)?.status === 401 || (walletError as any)?.status === 401) {
      localStorage.removeItem('affiliateToken');
      localStorage.removeItem('affiliateRememberMe');
      setLocation('/afiliados/auth');
    }
  }, [infoError, walletError, setLocation]);

  // Avatar helper function
  const getAvatarUrl = (avatarId: string) => {
    const avatarStyles: Record<string, string> = {
      avatar1: 'avataaars',
      avatar2: 'bottts',
      avatar3: 'pixel-art',
      avatar4: 'personas',
      avatar5: 'miniavs',
      avatar6: 'notionists',
      avatar7: 'fun-emoji',
      avatar8: 'lorelei',
      avatar9: 'shapes',
      avatar10: 'micah'
    };
    const style = avatarStyles[avatarId] || 'avataaars';
    return `https://api.dicebear.com/7.x/${style}/svg?seed=${affiliateInfo?.name || 'User'}&backgroundColor=b6e3f4`;
  };
  
  const handleAvatarChange = (newAvatar: string) => {
    refetchAffiliateInfo();
  };

  // Level thresholds - with dbName mapping
  const levels = [
    { name: "Bronze", dbName: "bronze", min: 0, max: 5000, rate: 40, color: "from-orange-600 to-orange-700" },
    { name: "Prata", dbName: "silver", min: 5000, max: 20000, rate: 45, color: "from-gray-400 to-gray-500" },
    { name: "Ouro", dbName: "gold", min: 20000, max: 50000, rate: 50, color: "from-yellow-500 to-yellow-600" },
    { name: "Platina", dbName: "platinum", min: 50000, max: 100000, rate: 60, color: "from-cyan-400 to-cyan-500" },
    { name: "Diamante", dbName: "diamond", min: 100000, max: null, rate: 70, color: "from-purple-400 to-purple-500" }
  ];

  const currentLevelName = affiliateInfo?.affiliateLevel || 'bronze';
  const approvedEarnings = affiliateInfo?.approvedEarnings || 0;
  const currentLevelRate = affiliateInfo?.currentLevelRate || 40;
  
  // Find current and next level using dbName for correct mapping
  const currentLevelIndex = levels.findIndex(l => l.dbName === currentLevelName);
  const currentLevel = levels[currentLevelIndex] || levels[0];
  const nextLevel = currentLevelIndex < levels.length - 1 ? levels[currentLevelIndex + 1] : null;
  
  // Calculate progress to next level
  const progressToNext = nextLevel 
    ? ((approvedEarnings - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100
    : 100;

  // Show loading screen while data is being fetched
  if (isLoadingInfo || isLoadingWallet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          {/* Animated Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <img src={maniaLogo} alt="Mania Brasil" className="h-16 w-auto mx-auto mb-4" />
          </motion.div>
          
          {/* Loading spinner */}
          <div className="relative">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 mx-auto"
            >
              <div className="w-full h-full rounded-full border-4 border-gray-700 border-t-[#00E880]" />
            </motion.div>
            
            {/* Loading text */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-gray-400 mt-6 text-lg"
            >
              Carregando painel...
            </motion.p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-600 opacity-5 blur-[150px] rounded-full" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600 opacity-5 blur-[150px] rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#00E880] opacity-5 blur-[200px] rounded-full" />
      </div>

      {/* Desktop Top Header */}
      <div className="hidden lg:block fixed top-0 left-0 right-0 z-30 h-16 bg-gradient-to-r from-gray-900/98 via-gray-800/95 to-gray-900/98 backdrop-blur-md border-b border-gray-700/50 shadow-lg">
        <div className="flex items-center justify-between h-full px-6">
          {/* User Info Section */}
          <div className="flex items-center gap-4 ml-72">
            <button 
              onClick={() => setIsAvatarSelectorOpen(true)}
              className="group relative transition-transform hover:scale-110"
              title="Alterar avatar"
            >
              <Avatar className="h-11 w-11 border-2 border-[#00E880]/30 shadow-lg group-hover:border-[#00E880]/50 transition-all cursor-pointer">
                <AvatarImage src={getAvatarUrl(affiliateInfo?.avatar || 'avatar1')} />
                <AvatarFallback className="bg-gradient-to-br from-gray-700 to-gray-800 text-white font-bold">
                  {affiliateInfo?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#00E880] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Settings className="w-3 h-3 text-gray-900" />
              </div>
            </button>
            <div>
              <p className="text-white font-semibold text-sm">{affiliateInfo?.name || 'Carregando...'}</p>
              <p className="text-gray-300 text-xs">{affiliateInfo?.email || 'email@exemplo.com'}</p>
            </div>
          </div>

          {/* Actions Section */}
          <div className="flex items-center gap-3">
            {/* Settings Button */}
            <button
              onClick={() => {
                setCurrentSection('settings');
                setLocation('/afiliados/settings');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all group ${
                currentSection === 'settings' 
                  ? 'bg-[#00E880]/20 border border-[#00E880]/50' 
                  : 'bg-gray-700/40 hover:bg-gray-700/60 border border-gray-600/30 hover:border-gray-600/50'
              }`}
            >
              <Settings className={`w-5 h-5 transition-colors ${
                currentSection === 'settings' 
                  ? 'text-[#00E880]' 
                  : 'text-gray-300 group-hover:text-[#00E880]'
              }`} />
              <span className={`text-sm font-medium ${
                currentSection === 'settings' 
                  ? 'text-[#00E880]' 
                  : 'text-gray-200 group-hover:text-white'
              }`}>Configurações</span>
            </button>

            {/* Help Button */}
            <button
              onClick={() => {
                setCurrentSection('support');
                setLocation('/afiliados/support');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all group ${
                currentSection === 'support' 
                  ? 'bg-[#00E880]/20 border border-[#00E880]/50' 
                  : 'bg-gray-700/40 hover:bg-gray-700/60 border border-gray-600/30 hover:border-gray-600/50'
              }`}
            >
              <HelpCircle className={`w-5 h-5 transition-colors ${
                currentSection === 'support' 
                  ? 'text-[#00E880]' 
                  : 'text-gray-300 group-hover:text-[#00E880]'
              }`} />
              <span className={`text-sm font-medium ${
                currentSection === 'support' 
                  ? 'text-[#00E880]' 
                  : 'text-gray-200 group-hover:text-white'
              }`}>Ajuda</span>
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-900/30 hover:bg-red-900/50 border border-red-600/30 hover:border-red-600/50 transition-all group"
            >
              <LogOut className="w-5 h-5 text-red-400 group-hover:text-red-300 transition-colors" />
              <span className="text-red-400 group-hover:text-red-300 text-sm font-medium">Sair</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              {isSidebarOpen ? <X className="w-5 h-5 text-gray-300" /> : <Menu className="w-5 h-5 text-gray-300" />}
            </button>
            <button 
              onClick={() => setIsAvatarSelectorOpen(true)}
              className="group relative transition-transform hover:scale-110"
              title="Alterar avatar"
            >
              <Avatar className="h-9 w-9 border-2 border-[#00E880]/30 shadow-lg group-hover:border-[#00E880]/50 transition-all cursor-pointer">
                <AvatarImage src={getAvatarUrl(affiliateInfo?.avatar || 'avatar1')} />
                <AvatarFallback className="bg-gradient-to-br from-gray-700 to-gray-800 text-white font-bold text-xs">
                  {affiliateInfo?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </button>
          </div>
          <div className="flex items-center">
            <img src={maniaLogo} alt="Mania Brasil" className="h-8 w-auto" />
          </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed left-0 top-0 h-full w-72 bg-gradient-to-b from-gray-900/98 to-gray-900/95 backdrop-blur-sm border-r border-gray-700/50 z-50">
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="p-6 border-b border-gray-800">
            <div className="flex justify-center mb-4">
              <img src={maniaLogo} alt="Mania Brasil" className="h-10 w-auto" />
            </div>
            
            {/* Wallet Balance Card */}
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-gray-400 text-xs">Saldo Disponível</p>
                  <div className="px-2 py-0.5 bg-purple-900/40 text-purple-400 text-xs font-semibold rounded-md">
                    {affiliateInfo?.commissionType === 'fixed' 
                      ? `R$ ${parseFloat(affiliateInfo?.commissionValue || affiliateInfo?.customFixedAmount || '6.00').toFixed(2)}`
                      : `${affiliateInfo?.commissionValue || affiliateInfo?.customCommissionRate || affiliateInfo?.currentLevelRate || '40'}%`
                    }
                  </div>
                </div>
                <p className="text-[#00E880] text-2xl font-bold">
                  {formatBRL(walletData?.wallet?.balance || 0)}
                </p>
              </div>
              
              {nextLevel ? (
                <div className="space-y-2">
                  <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="absolute inset-0 h-full bg-gradient-to-r from-[#00E880] to-[#00C060] rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${Math.min(Math.max(progressToNext, 0), 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">{formatBRL(approvedEarnings)}</span>
                    <span className="text-gray-400">{formatBRL(nextLevel.min)}</span>
                  </div>
                </div>
              ) : (
                <div className="mt-3 p-2 bg-gradient-to-r from-purple-600/20 to-purple-500/20 rounded-lg border border-purple-500/30">
                  <p className="text-xs text-purple-300 text-center font-semibold">
                    Nível Máximo Alcançado! 🏆
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Menu */}
          <nav ref={desktopMenuRef} className="flex-1 overflow-y-auto py-4 px-3">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentSection === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item)}
                  className={cn(
                    "w-full group relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 mb-2",
                    isActive
                      ? "bg-gradient-to-r from-gray-800/50 to-gray-700/30 border border-gray-700"
                      : "hover:bg-gray-800/50 border border-transparent"
                  )}
                >
                  {/* Active Indicator */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#00E880] rounded-r-full" />
                  )}
                  
                  {/* Icon with gradient on hover */}
                  <div className={cn(
                    "relative p-2 rounded-lg transition-all duration-300",
                    isActive 
                      ? "bg-gray-700/50"
                      : "bg-gray-800/50 group-hover:bg-gray-700/50"
                  )}>
                    <Icon className={cn(
                      "w-5 h-5",
                      isActive ? "text-[#00E880]" : "text-gray-400 group-hover:text-gray-300"
                    )} />
                  </div>
                  
                  {/* Label */}
                  <span className={cn(
                    "font-medium transition-colors",
                    isActive ? "text-white" : "text-gray-400 group-hover:text-white"
                  )}>
                    {item.label}
                  </span>
                  
                  {/* Arrow */}
                  <ChevronRight className={cn(
                    "w-4 h-4 ml-auto transition-all",
                    isActive 
                      ? "text-[#00E880] translate-x-1" 
                      : "text-gray-600 group-hover:text-gray-400 group-hover:translate-x-1"
                  )} />
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            
            {/* Sidebar */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="lg:hidden fixed left-0 top-0 h-full w-80 bg-gray-900/95 backdrop-blur-sm border-r border-gray-800 z-50"
            >
              {/* Same content as desktop sidebar */}
              <div className="flex flex-col h-full">
                {/* Logo Section */}
                <div className="p-6 border-b border-gray-800">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex justify-center w-full">
                      <img src={maniaLogo} alt="Mania Brasil" className="h-10 w-auto" />
                    </div>
                    <button
                      onClick={() => setIsSidebarOpen(false)}
                      className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-300" />
                    </button>
                  </div>
                  
                  {/* Level Progress Card */}
                  <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-xl p-4 border border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-white text-sm font-semibold">{currentLevel.name}</p>
                        <p className="text-[#00E880] text-lg font-bold">{currentLevelRate}%</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="px-2 py-0.5 bg-purple-900/40 text-purple-400 text-xs font-semibold rounded-md">
                          {affiliateInfo?.commissionType === 'fixed' 
                            ? `R$ ${parseFloat(affiliateInfo?.commissionValue || affiliateInfo?.customFixedAmount || '6.00').toFixed(2)}`
                            : `${affiliateInfo?.commissionValue || affiliateInfo?.customCommissionRate || affiliateInfo?.currentLevelRate || '40'}%`
                          }
                        </div>
                        {nextLevel && (
                          <div className="text-right">
                            <p className="text-gray-400 text-xs">Próximo</p>
                            <p className="text-white text-sm font-semibold">{nextLevel.rate}%</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {nextLevel && (
                      <div className="space-y-2">
                        <Progress value={progressToNext} className="h-2 bg-gray-800">
                          <div 
                            className="h-full bg-gradient-to-r from-[#00E880] to-green-600 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(progressToNext, 100)}%` }}
                          />
                        </Progress>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">{formatBRL(approvedEarnings)}</span>
                          <span className="text-gray-400">{formatBRL(nextLevel.min)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Navigation Menu */}
                <nav ref={mobileMenuRef} className="flex-1 overflow-y-auto py-4 px-3">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentSection === item.id;
                    
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavigation(item)}
                        className={cn(
                          "w-full group relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 mb-2",
                          isActive
                            ? "bg-gradient-to-r from-gray-800/50 to-gray-700/30 border border-gray-700"
                            : "hover:bg-gray-800/50 border border-transparent"
                        )}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#00E880] rounded-r-full" />
                        )}
                        
                        <div className={cn(
                          "relative p-2 rounded-lg transition-all duration-300",
                          isActive 
                            ? "bg-gradient-to-r from-[#00E880]/20 to-purple-600/20"
                            : "bg-gray-800/50 group-hover:bg-gray-700/50"
                        )}>
                          <Icon className={cn(
                            "w-5 h-5",
                            isActive ? "text-[#00E880]" : "text-gray-400"
                          )} />
                        </div>
                        
                        <span className={cn(
                          "font-medium transition-colors",
                          isActive ? "text-white" : "text-gray-400"
                        )}>
                          {item.label}
                        </span>
                        
                        <ChevronRight className={cn(
                          "w-4 h-4 ml-auto",
                          isActive ? "text-[#00E880]" : "text-gray-600"
                        )} />
                      </button>
                    );
                  })}
                </nav>

                {/* User Profile & Actions */}
                <div className="p-4 border-t border-gray-800 space-y-4">
                  {/* User Profile */}
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setIsAvatarSelectorOpen(true)}
                      className="group relative transition-transform hover:scale-110"
                      title="Alterar avatar"
                    >
                      <Avatar className="h-12 w-12 border-2 border-[#00E880]/30 shadow-lg group-hover:border-[#00E880]/50 transition-all cursor-pointer">
                        <AvatarImage src={getAvatarUrl(affiliateInfo?.avatar || 'avatar1')} />
                        <AvatarFallback className="bg-gradient-to-br from-[#00E880] to-green-600 text-white font-bold">
                          {affiliateInfo?.name ? affiliateInfo.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'AF'}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                    <div className="flex-1">
                      <p className="text-white font-medium text-sm truncate">{affiliateInfo?.name || 'Carregando...'}</p>
                      <p className="text-gray-400 text-xs truncate">{affiliateInfo?.email || ''}</p>
                    </div>
                  </div>
                  
                  {/* Action Icons */}
                  <div className="flex items-center justify-around">
                    <button
                      onClick={() => {
                        setCurrentSection('support');
                        setLocation('/afiliados/support');
                        setIsSidebarOpen(false);
                      }}
                      className={cn(
                        "p-3 rounded-lg transition-all",
                        currentSection === 'support' 
                          ? "bg-gradient-to-r from-green-600/20 to-teal-600/20 text-green-400" 
                          : "bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 hover:text-gray-300"
                      )}
                      title="Central de Ajuda"
                    >
                      <HelpCircle className="w-5 h-5" />
                    </button>
                    
                    <button
                      onClick={() => {
                        setCurrentSection('settings');
                        setLocation('/afiliados/settings');
                        setIsSidebarOpen(false);
                      }}
                      className={cn(
                        "p-3 rounded-lg transition-all",
                        currentSection === 'settings' 
                          ? "bg-gradient-to-r from-zinc-600/20 to-zinc-700/20 text-zinc-400" 
                          : "bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 hover:text-gray-300"
                      )}
                      title="Configurações"
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                    
                    <button
                      onClick={handleLogout}
                      className="p-3 rounded-lg bg-red-900/20 hover:bg-red-900/30 transition-colors border border-red-900/30"
                      title="Sair do Painel"
                    >
                      <LogOut className="w-5 h-5 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="lg:pl-72 min-h-screen">
        <div className="pt-24 lg:pt-20 p-4 lg:p-8">
          {children}
        </div>
      </div>
      
      {/* Avatar Selector Modal */}
      <AvatarSelector
        isOpen={isAvatarSelectorOpen}
        onClose={() => setIsAvatarSelectorOpen(false)}
        currentAvatar={affiliateInfo?.avatar || 'avatar1'}
        onAvatarChange={handleAvatarChange}
        affiliateName={affiliateInfo?.name || 'User'}
      />
    </div>
  );
}

export default AffiliateLayout;