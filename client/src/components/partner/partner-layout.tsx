import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
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
  TestTube,
  Package
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
import { AvatarSelector } from "@/components/affiliate/avatar-selector";

interface PartnerLayoutProps {
  children: React.ReactNode;
  activeSection?: string;
}

export function PartnerLayout({ children, activeSection = "dashboard" }: PartnerLayoutProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentSection, setCurrentSection] = useState(activeSection);
  const [isAvatarSelectorOpen, setIsAvatarSelectorOpen] = useState(false);
  
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
      path: "/parceiros/dashboard",
      color: "from-blue-500 to-cyan-500"
    },
    {
      id: "links",
      label: "Meus Links",
      icon: Link2,
      path: "/parceiros/links",
      color: "from-purple-500 to-pink-500"
    },
    {
      id: "network",
      label: "Minha Rede",
      icon: Users,
      path: "/parceiros/network",
      color: "from-green-500 to-emerald-500"
    },
    {
      id: "earnings",
      label: "Ganhos",
      icon: DollarSign,
      path: "/parceiros/earnings",
      color: "from-yellow-500 to-orange-500"
    },
    {
      id: "withdrawals",
      label: "Saques",
      icon: Wallet,
      path: "/parceiros/withdrawals",
      color: "from-indigo-500 to-purple-500"
    },
    {
      id: "history",
      label: "Histórico",
      icon: History,
      path: "/parceiros/history",
      color: "from-gray-500 to-gray-600"
    },
    {
      id: "materials",
      label: "Materiais",
      icon: Package,
      path: "/parceiros/materials",
      color: "from-pink-500 to-rose-500"
    },
    {
      id: "demo",
      label: "Conta Demo",
      icon: TestTube,
      path: "/parceiros/demo",
      color: "from-cyan-500 to-blue-500"
    }
  ];

  const token = localStorage.getItem('partnerToken');
  const hasToken = !!token;
  
  useEffect(() => {
    if (!hasToken) {
      setLocation('/parceiros');
    }
  }, [hasToken, setLocation]);

  const { data: partnerInfo, refetch: refetchPartnerInfo, isLoading: isLoadingInfo, error: infoError } = useQuery<{
    name: string;
    email: string;
    code: string;
    commissionRate: string;
    commissionType: string;
    fixedCommissionAmount: string;
    totalEarnings: number;
    pendingEarnings: number;
    avatar?: string;
  }>({
    queryKey: ["/api/partner/info"],
    enabled: hasToken,
    refetchInterval: hasToken ? 60000 : false,
    retry: false
  });
  
  const { data: walletData, isLoading: isLoadingWallet, error: walletError } = useQuery<{
    wallet: {
      balance: number;
      pendingBalance: number;
      totalEarned: number;
      totalWithdrawn: number;
    }
  }>({
    queryKey: ["/api/partner/earnings"],
    enabled: hasToken,
    refetchInterval: hasToken ? 30000 : false,
    retry: false
  });

  useEffect(() => {
    if ((infoError as any)?.status === 401 || (walletError as any)?.status === 401) {
      localStorage.removeItem('partnerToken');
      setLocation('/parceiros');
    }
  }, [infoError, walletError, setLocation]);

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
    return `https://api.dicebear.com/7.x/${style}/svg?seed=${partnerInfo?.name || 'User'}&backgroundColor=b6e3f4`;
  };
  
  const handleAvatarChange = (newAvatar: string) => {
    refetchPartnerInfo();
  };

  const handleLogout = () => {
    sessionStorage.setItem("partnerLoggedOut", "true");
    localStorage.removeItem("partnerToken");
    localStorage.removeItem("partnerName");
    localStorage.removeItem("partnerEmail");
    localStorage.removeItem("partnerId");
    queryClient.clear();
    
    toast({
      title: "Logout realizado",
      description: "Você saiu do painel de parceiros com sucesso"
    });
    
    setLocation("/parceiros");
  };

  const handleNavigation = (item: any) => {
    if (desktopMenuRef.current) {
      sessionStorage.setItem('partnerMenuScroll', desktopMenuRef.current.scrollTop.toString());
    }
    if (mobileMenuRef.current) {
      sessionStorage.setItem('partnerMobileMenuScroll', mobileMenuRef.current.scrollTop.toString());
    }
    
    setCurrentSection(item.id);
    setLocation(item.path);
    setIsSidebarOpen(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      const savedDesktopScroll = sessionStorage.getItem('partnerMenuScroll');
      if (savedDesktopScroll && desktopMenuRef.current) {
        const scrollValue = parseInt(savedDesktopScroll, 10);
        desktopMenuRef.current.scrollTop = scrollValue;
        setTimeout(() => {
          if (desktopMenuRef.current) {
            desktopMenuRef.current.scrollTop = scrollValue;
          }
        }, 100);
      }
      
      const savedMobileScroll = sessionStorage.getItem('partnerMobileMenuScroll');
      if (savedMobileScroll && mobileMenuRef.current) {
        const scrollValue = parseInt(savedMobileScroll, 10);
        mobileMenuRef.current.scrollTop = scrollValue;
        setTimeout(() => {
          if (mobileMenuRef.current) {
            mobileMenuRef.current.scrollTop = scrollValue;
          }
        }, 100);
      }
    }, 50);
    
    return () => clearTimeout(timer);
  });

  if (isLoadingInfo || isLoadingWallet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <img src={maniaLogo} alt="Mania Brasil" className="h-16 w-auto mx-auto mb-4" />
          </motion.div>
          
          <div className="relative">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 mx-auto"
            >
              <div className="w-full h-full rounded-full border-4 border-gray-700 border-t-[#00E880]" />
            </motion.div>
            
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
          <div className="flex items-center gap-4 ml-72">
            <button 
              onClick={() => setIsAvatarSelectorOpen(true)}
              className="group relative transition-transform hover:scale-110"
              title="Alterar avatar"
            >
              <Avatar className="h-11 w-11 border-2 border-[#00E880]/30 shadow-lg group-hover:border-[#00E880]/50 transition-all cursor-pointer">
                <AvatarImage src={getAvatarUrl(partnerInfo?.avatar || 'avatar1')} />
                <AvatarFallback className="bg-gradient-to-br from-gray-700 to-gray-800 text-white font-bold">
                  {partnerInfo?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'P'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#00E880] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Settings className="w-3 h-3 text-gray-900" />
              </div>
            </button>
            <div>
              <p className="text-white font-semibold text-sm">{partnerInfo?.name || 'Carregando...'}</p>
              <p className="text-gray-300 text-xs">{partnerInfo?.email || 'email@exemplo.com'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Settings Button */}
            <button
              onClick={() => {
                setCurrentSection('settings');
                setLocation('/parceiros/settings');
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
                <AvatarImage src={getAvatarUrl(partnerInfo?.avatar || 'avatar1')} />
                <AvatarFallback className="bg-gradient-to-br from-gray-700 to-gray-800 text-white font-bold text-xs">
                  {partnerInfo?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'P'}
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
                    {partnerInfo?.commissionType === 'percentage' 
                      ? `${parseFloat(partnerInfo?.commissionRate || '0')}%`
                      : `R$ ${parseFloat(partnerInfo?.fixedCommissionAmount || '0').toFixed(2)}`}
                  </div>
                </div>
                <p className="text-[#00E880] text-2xl font-bold">
                  {formatBRL(walletData?.wallet?.balance || 0)}
                </p>
              </div>
              
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Total Ganho</span>
                <span className="text-gray-300">{formatBRL(walletData?.wallet?.totalEarned || 0)}</span>
              </div>
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
                      className="absolute right-4 top-4 p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-colors lg:hidden"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                  
                  {/* Wallet Balance Card */}
                  <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-gray-400 text-xs">Saldo Disponível</p>
                        <div className="px-2 py-0.5 bg-purple-900/40 text-purple-400 text-xs font-semibold rounded-md">
                          {partnerInfo?.commissionType === 'percentage' 
                            ? `${parseFloat(partnerInfo?.commissionRate || '0')}%`
                            : `R$ ${parseFloat(partnerInfo?.fixedCommissionAmount || '0').toFixed(2)}`}
                        </div>
                      </div>
                      <p className="text-[#00E880] text-2xl font-bold">
                        {formatBRL(walletData?.wallet?.balance || 0)}
                      </p>
                    </div>
                    
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Total Ganho</span>
                      <span className="text-gray-300">{formatBRL(walletData?.wallet?.totalEarned || 0)}</span>
                    </div>
                  </div>
                </div>
                
                {/* Navigation Menu - Same as desktop */}
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
                        <AvatarImage src={getAvatarUrl(partnerInfo?.avatar || 'avatar1')} />
                        <AvatarFallback className="bg-gradient-to-br from-[#00E880] to-green-600 text-white font-bold">
                          {partnerInfo?.name ? partnerInfo.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'PC'}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                    <div className="flex-1">
                      <p className="text-white font-medium text-sm truncate">{partnerInfo?.name || 'Carregando...'}</p>
                      <p className="text-gray-400 text-xs truncate">{partnerInfo?.email || ''}</p>
                    </div>
                  </div>
                  
                  {/* Action Icons */}
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={() => {
                        setCurrentSection('settings');
                        setLocation('/parceiros/settings');
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
        currentAvatar={partnerInfo?.avatar || 'avatar1'}
        onSelect={handleAvatarChange}
        userType="partner"
      />
    </div>
  );
}