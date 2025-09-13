import { useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { useAuth } from "../lib/auth.tsx";
import { useQuery } from "@tanstack/react-query";
import { MobileLayout } from "@/components/mobile-layout";
import Header from "@/components/header";
import { OptimizedImage, usePreloadImages } from "@/components/optimized-image";
import logoImg from "/logos/logomania.svg";
import {
  User,
  Gift,
  Share2,
  History,
  DollarSign,
  HelpCircle,
  Wallet,
  X,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Gamepad2,
  Grid3X3,
  Trophy,
  Package,
  Zap,
  Clock,
  Skull,
  Star,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { DashboardRewardsWheel } from "@/components/dashboard-rewards-wheel";
import { RegisterPromoModal } from "@/components/register-promo-modal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { OnlineUsersCounter } from "@/components/online-users-counter";
import { HomeBanners } from "@/components/home-banners";

// Import premio banners
import bannerPix from "/premios/banner-pix.webp";
import bannerMeMimei from "/premios/banner-me-mimei.webp";
import bannerEletronicos from "/premios/banner-eletronicos.webp";
import bannerSuperPremios from "/premios/banner-super-premios.webp";
// Removed esquilo banner import
// Import bau banners
import bannerBauPix from "/premios/pixbau.webp";
import bannerBauDelas from "/premios/delasbau.webp";
import bannerBauEletronicos from "/premios/eletronicosbau.webp";
import bannerBauSuper from "/premios/superbau.webp";

import WinnersCarousel from "@/components/winners-carousel";
import { DailySpinModal } from "@/components/daily-spin-modal";

export default function Home() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [showRewardsWheel, setShowRewardsWheel] = useState(false);
  const [showDailySpinModal, setShowDailySpinModal] = useState(false);
  const [gameSection, setGameSection] = useState<'raspadinhas' | 'minigames' | 'baus'>('raspadinhas');
  
  // Preload all game banners
  const gameBanners = [bannerPix, bannerMeMimei, bannerEletronicos, bannerSuperPremios, bannerBauPix, bannerBauDelas, bannerBauEletronicos, bannerBauSuper];
  const bannersLoaded = usePreloadImages(gameBanners);

  // Query daily spin status
  const { data: spinStatus } = useQuery<{
    canSpin: boolean;
    lastSpin?: { amount: string; spunAt: string };
  }>({
    queryKey: ["/api/daily-spin/status"],
    enabled: !!user,
  });

  // Query user balance
  const { data: userWallet } = useQuery<{
    balance: string;
    scratchBonus: number;
  }>({
    queryKey: ["/api/user/balance"],
    enabled: !!user,
  });

  // Show daily spin modal when user logs in and has spin available (once per session)
  useEffect(() => {
    if (user && spinStatus?.canSpin) {
      // Check if we already showed the modal this session
      const shownThisSession = sessionStorage.getItem("dailySpinModalShown");

      if (!shownThisSession) {
        // Show modal after 1 second
        const timer = setTimeout(() => {
          setShowDailySpinModal(true);
          sessionStorage.setItem("dailySpinModalShown", "true");
        }, 1000);

        return () => clearTimeout(timer);
      }
    }
  }, [user?.id, spinStatus?.canSpin]); // Trigger when user.id changes (login) or spin status changes

  // Check URL hash on mount and on hash change to set correct game section
  useEffect(() => {
    const checkHash = () => {
      const hash = window.location.hash;
      if (hash === '#minigames') {
        setGameSection('minigames');
      } else if (hash === '#baus') {
        setGameSection('baus');
      } else if (hash === '' || hash === '#premios') {
        setGameSection('raspadinhas');
      }
    };
    
    // Check on mount
    checkHash();
    
    // Listen for hash changes
    window.addEventListener('hashchange', checkHash);
    
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  const content = (
    <>
      {/* Hero Banners Carousel */}
      <HomeBanners />

      <div className="max-w-7xl mx-auto">
        {/* Winners Carousel */}
        <WinnersCarousel />

        {/* Seção de Navegação Casino Chips Premium */}
        <section className="px-3 md:px-8 mb-6 md:mb-10 mt-6 md:mt-12 relative">
          {/* Decorative gradient background */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00E880]/5 to-transparent blur-3xl -z-10" />
          
          <div className="text-center mb-6 md:mb-8">
            {/* Título da Seção com Efeito Premium */}
            <div className="relative inline-block mb-6 md:mb-8">
              {/* Glow effect behind title */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#00E880] to-[#00FFB3] opacity-30 blur-2xl -z-10 animate-pulse" />
              
              <h2 className="font-black text-[20px] md:text-[36px] tracking-[0.12em] md:tracking-[0.15em] uppercase relative">
                <span className="relative">
                  {/* Main gradient text */}
                  <span className="bg-gradient-to-r from-[#00E880] via-[#00FFB3] to-[#00E880] bg-clip-text text-transparent">
                    ESCOLHA
                  </span>
                  <span className="text-white mx-2">SEU</span>
                  <span className="bg-gradient-to-r from-[#00FFB3] via-[#00E880] to-[#00FFB3] bg-clip-text text-transparent">
                    MODO
                  </span>
                  
                  {/* Decorative underline */}
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-24 md:w-40 h-1 bg-gradient-to-r from-transparent via-[#00E880] to-transparent rounded-full" />
                </span>
              </h2>
              
              {/* Subtitle */}
              <p className="text-gray-400 text-[10px] md:text-xs mt-3 font-medium tracking-wider uppercase">
                ✨ Escolha sua experiência preferida ✨
              </p>
            </div>
            
            {/* Casino Chips Navigation - Mobile & Desktop */}
            <div className="relative flex items-center justify-center">
              {/* Container for chips and animated indicator */}
              <div className="relative inline-flex items-center gap-6 md:gap-10">
                {/* Animated Indicator Bar */}
                <div className="absolute -bottom-4 left-0 right-0 h-1 flex items-center justify-center">
                  <div 
                    className="absolute h-1 bg-gradient-to-r from-[#00E880] to-[#00FFB3] rounded-full shadow-[0_0_20px_rgba(0,232,128,0.8)] transition-all duration-500 ease-out"
                    style={{
                      width: '60px',
                      transform: `translateX(${
                        gameSection === 'raspadinhas' ? '-72px' : 
                        gameSection === 'minigames' ? '0px' : 
                        '72px'
                      })`
                    }}
                  />
                </div>
                
                {/* Raspadinhas Casino Chip */}
                <div className="relative">
                  <button
                    onClick={() => setGameSection('raspadinhas')}
                    className={`relative w-[72px] h-[72px] md:w-[96px] md:h-[96px] transition-all duration-500 transform ${
                      gameSection === 'raspadinhas'
                        ? 'scale-110 -translate-y-1'
                        : 'scale-100 hover:scale-105 hover:rotate-3'
                    }`}
                  >
                    {/* Outer neon glow when active */}
                    {gameSection === 'raspadinhas' && (
                      <div className="absolute inset-0 bg-gradient-to-br from-[#00E880] to-[#00FFB3] opacity-60 blur-2xl rounded-full animate-pulse" />
                    )}
                    
                    {/* Casino chip design */}
                    <div className="relative w-full h-full">
                      {/* Outer ring */}
                      <div className={`absolute inset-0 rounded-full ${
                        gameSection === 'raspadinhas'
                          ? 'bg-gradient-to-br from-[#00E880] via-[#00FFB3] to-[#00E880] shadow-[0_0_30px_rgba(0,232,128,0.8)]'
                          : 'bg-gradient-to-br from-gray-700 to-gray-800'
                      } p-[2px]`}>
                        {/* Middle ring with stripe pattern */}
                        <div className="relative w-full h-full rounded-full bg-gradient-to-br from-gray-900 via-black to-gray-900 p-[2px]">
                          {/* Inner ring */}
                          <div className={`relative w-full h-full rounded-full ${
                            gameSection === 'raspadinhas'
                              ? 'bg-gradient-to-br from-[#00E880]/20 via-black to-[#00FFB3]/20'
                              : 'bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800'
                          } shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)]`}>
                            {/* Center content */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
                              <Grid3X3 className={`w-6 h-6 md:w-7 md:h-7 transition-all duration-300 ${
                                gameSection === 'raspadinhas' 
                                  ? 'text-[#00E880] drop-shadow-[0_0_10px_rgba(0,232,128,0.8)]' 
                                  : 'text-gray-400'
                              }`} />
                              <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-wider transition-colors duration-300 ${
                                gameSection === 'raspadinhas'
                                  ? 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]'
                                  : 'text-gray-400'
                              }`}>
                                Raspadinhas
                              </span>
                            </div>
                            
                            {/* Chip stripes */}
                            <div className="absolute inset-2 rounded-full overflow-hidden opacity-10">
                              <div className="absolute inset-0 bg-repeating-linear-gradient(45deg, transparent, transparent 10px, white 10px, white 20px)" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                  
                  {/* Floating Badge */}
                  <div className="absolute -top-2 -right-2 z-30">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-orange-500 blur-sm animate-pulse" />
                      <div className="relative bg-gradient-to-r from-red-500 to-orange-400 text-white text-[7px] md:text-[8px] px-1.5 py-0.5 rounded-full font-black shadow-lg border border-white/20">
                        🔥 QUENTE
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Minigames Casino Chip */}
                <div className="relative">
                  <button
                    onClick={() => setGameSection('minigames')}
                    className={`relative w-[72px] h-[72px] md:w-[96px] md:h-[96px] transition-all duration-500 transform ${
                      gameSection === 'minigames'
                        ? 'scale-110 -translate-y-1'
                        : 'scale-100 hover:scale-105 hover:-rotate-3'
                    }`}
                  >
                    {/* Outer neon glow when active */}
                    {gameSection === 'minigames' && (
                      <div className="absolute inset-0 bg-gradient-to-br from-[#00E880] to-[#00FFB3] opacity-60 blur-2xl rounded-full animate-pulse" />
                    )}
                    
                    {/* Casino chip design */}
                    <div className="relative w-full h-full">
                      {/* Outer ring */}
                      <div className={`absolute inset-0 rounded-full ${
                        gameSection === 'minigames'
                          ? 'bg-gradient-to-br from-[#00E880] via-[#00FFB3] to-[#00E880] shadow-[0_0_30px_rgba(0,232,128,0.8)]'
                          : 'bg-gradient-to-br from-gray-700 to-gray-800'
                      } p-[2px]`}>
                        {/* Middle ring with stripe pattern */}
                        <div className="relative w-full h-full rounded-full bg-gradient-to-br from-gray-900 via-black to-gray-900 p-[2px]">
                          {/* Inner ring */}
                          <div className={`relative w-full h-full rounded-full ${
                            gameSection === 'minigames'
                              ? 'bg-gradient-to-br from-[#00E880]/20 via-black to-[#00FFB3]/20'
                              : 'bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800'
                          } shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)]`}>
                            {/* Center content */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
                              <Gamepad2 className={`w-6 h-6 md:w-7 md:h-7 transition-all duration-300 ${
                                gameSection === 'minigames' 
                                  ? 'text-[#00E880] drop-shadow-[0_0_10px_rgba(0,232,128,0.8)]' 
                                  : 'text-gray-400'
                              }`} />
                              <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-wider transition-colors duration-300 ${
                                gameSection === 'minigames'
                                  ? 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]'
                                  : 'text-gray-400'
                              }`}>
                                Minigames
                              </span>
                            </div>
                            
                            {/* Chip stripes */}
                            <div className="absolute inset-2 rounded-full overflow-hidden opacity-10">
                              <div className="absolute inset-0 bg-repeating-linear-gradient(45deg, transparent, transparent 10px, white 10px, white 20px)" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                  
                  {/* Floating Badge */}
                  <div className="absolute -top-2 -right-2 z-30">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-500 blur-sm animate-pulse" />
                      <div className="relative bg-gradient-to-r from-purple-500 to-pink-400 text-white text-[7px] md:text-[8px] px-1.5 py-0.5 rounded-full font-black shadow-lg border border-white/20">
                        ✨ NOVO
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Baús Casino Chip */}
                <div className="relative">
                  <button
                    onClick={() => setGameSection('baus')}
                    className={`relative w-[72px] h-[72px] md:w-[96px] md:h-[96px] transition-all duration-500 transform ${
                      gameSection === 'baus'
                        ? 'scale-110 -translate-y-1'
                        : 'scale-100 hover:scale-105 hover:rotate-3'
                    }`}
                  >
                    {/* Outer neon glow when active */}
                    {gameSection === 'baus' && (
                      <div className="absolute inset-0 bg-gradient-to-br from-[#00E880] to-[#00FFB3] opacity-60 blur-2xl rounded-full animate-pulse" />
                    )}
                    
                    {/* Casino chip design */}
                    <div className="relative w-full h-full">
                      {/* Outer ring */}
                      <div className={`absolute inset-0 rounded-full ${
                        gameSection === 'baus'
                          ? 'bg-gradient-to-br from-[#00E880] via-[#00FFB3] to-[#00E880] shadow-[0_0_30px_rgba(0,232,128,0.8)]'
                          : 'bg-gradient-to-br from-gray-700 to-gray-800'
                      } p-[2px]`}>
                        {/* Middle ring with stripe pattern */}
                        <div className="relative w-full h-full rounded-full bg-gradient-to-br from-gray-900 via-black to-gray-900 p-[2px]">
                          {/* Inner ring */}
                          <div className={`relative w-full h-full rounded-full ${
                            gameSection === 'baus'
                              ? 'bg-gradient-to-br from-[#00E880]/20 via-black to-[#00FFB3]/20'
                              : 'bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800'
                          } shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)]`}>
                            {/* Center content */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
                              <Package className={`w-6 h-6 md:w-7 md:h-7 transition-all duration-300 ${
                                gameSection === 'baus' 
                                  ? 'text-[#00E880] drop-shadow-[0_0_10px_rgba(0,232,128,0.8)]' 
                                  : 'text-gray-400'
                              }`} />
                              <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-wider transition-colors duration-300 ${
                                gameSection === 'baus'
                                  ? 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]'
                                  : 'text-gray-400'
                              }`}>
                                Baús
                              </span>
                            </div>
                            
                            {/* Chip stripes */}
                            <div className="absolute inset-2 rounded-full overflow-hidden opacity-10">
                              <div className="absolute inset-0 bg-repeating-linear-gradient(45deg, transparent, transparent 10px, white 10px, white 20px)" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                  
                  {/* Floating Badge */}
                  <div className="absolute -top-2 -right-2 z-30">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-500 blur-sm animate-pulse" />
                      <div className="relative bg-gradient-to-r from-indigo-500 to-purple-400 text-white text-[7px] md:text-[8px] px-1.5 py-0.5 rounded-full font-black shadow-lg border border-white/20">
                        💎 NOVO
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Games Section */}
        <section id="premios" className="px-4 md:px-8 mb-16 pb-4">
          {gameSection === 'raspadinhas' && (
            /* Raspadinhas */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Raspadinha PIX Banner - Premium Unified Design */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                setLocation("/game/premio-pix");
              }}
              className="group cursor-pointer relative"
            >
                {/* Card Glow Effect */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-all duration-500" />
                
                {/* Main Card Container */}
                <div className="relative bg-gradient-to-b from-gray-900/95 to-gray-950/95 backdrop-blur-xl rounded-3xl overflow-hidden border border-gray-800/50 shadow-[0_20px_70px_-15px_rgba(0,0,0,0.8)] transform transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_25px_80px_-15px_rgba(59,130,246,0.3)]">
                  
                  {/* Banner Section with Gradient Overlay */}
                  <div className="relative w-full" style={{ aspectRatio: "16/8" }}>
                    <OptimizedImage
                      src={bannerPix}
                      alt="Banner PIX na Conta"
                      className="absolute inset-0 w-full h-full object-contain"
                      priority={true}
                    />
                    
                    {/* Gradient Overlay for smooth transition */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-gray-900/95 pointer-events-none" />
                    
                    {/* Top Gradient Accent */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-60" />
                    
                    {/* Online Users Counter */}
                    <div className="absolute top-4 right-4 md:top-6 md:right-6">
                      <div className="relative">
                        <div className="absolute inset-0 bg-blue-500/20 blur-xl" />
                        <div className="relative bg-black/60 backdrop-blur-md border border-blue-500/30 rounded-xl px-3 py-1.5 md:px-4 md:py-2">
                          <OnlineUsersCounter gameType="pix" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Premium Badge */}
                    <div className="absolute top-4 left-4 md:top-6 md:left-6">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-500 blur-md" />
                        <div className="relative bg-gradient-to-r from-blue-500 to-cyan-400 px-3 py-1 rounded-full">
                          <span className="text-white text-xs font-bold flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            PIX NA HORA
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Info Section - Seamlessly Integrated */}
                  <div className="relative px-4 pb-4 md:px-6 md:pb-6 -mt-8 z-10">
                    {/* Glass Card for Button */}
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-2xl blur-xl" />
                      <div className="relative bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-xl rounded-2xl p-3 md:p-4 border border-gray-700/50 shadow-inner">
                        
                        <div className="flex items-center justify-between gap-4">
                          {/* Play Button */}
                          <div className="relative flex-1">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-xl blur-md opacity-70 group-hover:opacity-100 transition-opacity" />
                            <button className="relative w-full bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-400 hover:to-cyan-300 px-4 py-3 md:px-6 md:py-4 rounded-xl font-bold transition-all transform hover:scale-[1.02] shadow-lg">
                              <div className="flex items-center justify-center gap-3">
                                <span className="text-white text-base md:text-lg font-black uppercase tracking-wider drop-shadow-lg">
                                  Raspar Agora
                                </span>
                                <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-lg">
                                  <span className="text-white font-bold text-sm md:text-base">R$ 1,00</span>
                                </div>
                              </div>
                            </button>
                          </div>
                          
                          {/* Prize Preview */}
                          <div className="hidden md:flex flex-col items-center gap-1 px-4">
                            <div className="text-gray-400 text-xs uppercase tracking-wider">Prêmio Max</div>
                            <div className="text-white font-bold text-lg">R$ 100.000</div>
                            <div className="flex items-center gap-1 text-blue-400">
                              <Trophy className="w-3 h-3" />
                              <span className="text-xs">Ver Todos</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Quick Stats Bar */}
                        <div className="mt-3 pt-3 border-t border-gray-700/50 flex items-center justify-between">
                          <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1 text-gray-400">
                              <Clock className="w-3 h-3" />
                              <span>Instantâneo</span>
                            </div>
                            <div className="flex items-center gap-1 text-green-400">
                              <Zap className="w-3 h-3" />
                              <span>Alta Chance</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-blue-400 text-xs">
                            <Gift className="w-3 h-3" />
                            <span>Prêmios</span>
                            <ChevronRight className="w-3 h-3" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
            </div>

            {/* Me Mimei Banner - Premium Unified Design */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                setLocation("/game/premio-me-mimei");
              }}
              className="group cursor-pointer relative"
            >
                {/* Card Glow Effect */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-all duration-500" />
                
                {/* Main Card Container */}
                <div className="relative bg-gradient-to-b from-gray-900/95 to-gray-950/95 backdrop-blur-xl rounded-3xl overflow-hidden border border-gray-800/50 shadow-[0_20px_70px_-15px_rgba(0,0,0,0.8)] transform transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_25px_80px_-15px_rgba(236,72,153,0.3)]">
                  
                  {/* Banner Section with Gradient Overlay */}
                  <div className="relative w-full" style={{ aspectRatio: "16/8" }}>
                    <OptimizedImage
                      src={bannerMeMimei}
                      alt="Banner Me Mimei"
                      className="absolute inset-0 w-full h-full object-contain"
                      priority={true}
                    />
                    
                    {/* Gradient Overlay for smooth transition */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-gray-900/95 pointer-events-none" />
                    
                    {/* Top Gradient Accent */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-pink-500 to-transparent opacity-60" />
                    
                    {/* Online Users Counter */}
                    <div className="absolute top-4 right-4 md:top-6 md:right-6">
                      <div className="relative">
                        <div className="absolute inset-0 bg-pink-500/20 blur-xl" />
                        <div className="relative bg-black/60 backdrop-blur-md border border-pink-500/30 rounded-xl px-3 py-1.5 md:px-4 md:py-2">
                          <OnlineUsersCounter gameType="me-mimei" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Premium Badge */}
                    <div className="absolute top-4 left-4 md:top-6 md:left-6">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-pink-600 to-purple-500 blur-md" />
                        <div className="relative bg-gradient-to-r from-pink-500 to-purple-400 px-3 py-1 rounded-full">
                          <span className="text-white text-xs font-bold flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            ME MIMEI
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Info Section - Seamlessly Integrated */}
                  <div className="relative px-4 pb-4 md:px-6 md:pb-6 -mt-8 z-10">
                    {/* Glass Card for Button */}
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 to-purple-500/10 rounded-2xl blur-xl" />
                      <div className="relative bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-xl rounded-2xl p-3 md:p-4 border border-gray-700/50 shadow-inner">
                        
                        <div className="flex items-center justify-between gap-4">
                          {/* Play Button */}
                          <div className="relative flex-1">
                            <div className="absolute inset-0 bg-gradient-to-r from-pink-600 to-purple-500 rounded-xl blur-md opacity-70 group-hover:opacity-100 transition-opacity" />
                            <button className="relative w-full bg-gradient-to-r from-pink-500 to-purple-400 hover:from-pink-400 hover:to-purple-300 px-4 py-3 md:px-6 md:py-4 rounded-xl font-bold transition-all transform hover:scale-[1.02] shadow-lg">
                              <div className="flex items-center justify-center gap-3">
                                <span className="text-white text-base md:text-lg font-black uppercase tracking-wider drop-shadow-lg">
                                  Raspar Agora
                                </span>
                                <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-lg">
                                  <span className="text-white font-bold text-sm md:text-base">R$ 1,00</span>
                                </div>
                              </div>
                            </button>
                          </div>
                          
                          {/* Prize Preview */}
                          <div className="hidden md:flex flex-col items-center gap-1 px-4">
                            <div className="text-gray-400 text-xs uppercase tracking-wider">Prêmio Max</div>
                            <div className="text-white font-bold text-lg">R$ 100.000</div>
                            <div className="flex items-center gap-1 text-pink-400">
                              <Trophy className="w-3 h-3" />
                              <span className="text-xs">Ver Todos</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Quick Stats Bar */}
                        <div className="mt-3 pt-3 border-t border-gray-700/50 flex items-center justify-between">
                          <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1 text-gray-400">
                              <Clock className="w-3 h-3" />
                              <span>Instantâneo</span>
                            </div>
                            <div className="flex items-center gap-1 text-green-400">
                              <Zap className="w-3 h-3" />
                              <span>Alta Chance</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-pink-400 text-xs">
                            <Gift className="w-3 h-3" />
                            <span>Prêmios</span>
                            <ChevronRight className="w-3 h-3" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
            </div>

            {/* Eletrônicos Banner - Premium Unified Design */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                setLocation("/game/premio-eletronicos");
              }}
              className="group cursor-pointer relative"
            >
                {/* Card Glow Effect */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500/20 to-amber-500/20 rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-all duration-500" />
                
                {/* Main Card Container */}
                <div className="relative bg-gradient-to-b from-gray-900/95 to-gray-950/95 backdrop-blur-xl rounded-3xl overflow-hidden border border-gray-800/50 shadow-[0_20px_70px_-15px_rgba(0,0,0,0.8)] transform transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_25px_80px_-15px_rgba(251,146,60,0.3)]">
                  
                  {/* Banner Section with Gradient Overlay */}
                  <div className="relative w-full" style={{ aspectRatio: "16/8" }}>
                    <OptimizedImage
                      src={bannerEletronicos}
                      alt="Banner Eletrônicos"
                      className="absolute inset-0 w-full h-full object-contain"
                      priority={true}
                    />
                    
                    {/* Gradient Overlay for smooth transition */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-gray-900/95 pointer-events-none" />
                    
                    {/* Top Gradient Accent */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-60" />
                    
                    {/* Online Users Counter */}
                    <div className="absolute top-4 right-4 md:top-6 md:right-6">
                      <div className="relative">
                        <div className="absolute inset-0 bg-orange-500/20 blur-xl" />
                        <div className="relative bg-black/60 backdrop-blur-md border border-orange-500/30 rounded-xl px-3 py-1.5 md:px-4 md:py-2">
                          <OnlineUsersCounter gameType="eletronicos" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Premium Badge */}
                    <div className="absolute top-4 left-4 md:top-6 md:left-6">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-amber-500 blur-md" />
                        <div className="relative bg-gradient-to-r from-orange-500 to-amber-400 px-3 py-1 rounded-full">
                          <span className="text-white text-xs font-bold flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            ELETRÔNICOS
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Info Section - Seamlessly Integrated */}
                  <div className="relative px-4 pb-4 md:px-6 md:pb-6 -mt-8 z-10">
                    {/* Glass Card for Button */}
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-amber-500/10 rounded-2xl blur-xl" />
                      <div className="relative bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-xl rounded-2xl p-3 md:p-4 border border-gray-700/50 shadow-inner">
                        
                        <div className="flex items-center justify-between gap-4">
                          {/* Play Button */}
                          <div className="relative flex-1">
                            <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-amber-500 rounded-xl blur-md opacity-70 group-hover:opacity-100 transition-opacity" />
                            <button className="relative w-full bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-400 hover:to-amber-300 px-4 py-3 md:px-6 md:py-4 rounded-xl font-bold transition-all transform hover:scale-[1.02] shadow-lg">
                              <div className="flex items-center justify-center gap-3">
                                <span className="text-white text-base md:text-lg font-black uppercase tracking-wider drop-shadow-lg">
                                  Raspar Agora
                                </span>
                                <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-lg">
                                  <span className="text-white font-bold text-sm md:text-base">R$ 1,00</span>
                                </div>
                              </div>
                            </button>
                          </div>
                          
                          {/* Prize Preview */}
                          <div className="hidden md:flex flex-col items-center gap-1 px-4">
                            <div className="text-gray-400 text-xs uppercase tracking-wider">Prêmio Max</div>
                            <div className="text-white font-bold text-lg">R$ 100.000</div>
                            <div className="flex items-center gap-1 text-orange-400">
                              <Trophy className="w-3 h-3" />
                              <span className="text-xs">Ver Todos</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Quick Stats Bar */}
                        <div className="mt-3 pt-3 border-t border-gray-700/50 flex items-center justify-between">
                          <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1 text-gray-400">
                              <Clock className="w-3 h-3" />
                              <span>Instantâneo</span>
                            </div>
                            <div className="flex items-center gap-1 text-green-400">
                              <Zap className="w-3 h-3" />
                              <span>Alta Chance</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-orange-400 text-xs">
                            <Gift className="w-3 h-3" />
                            <span>Prêmios</span>
                            <ChevronRight className="w-3 h-3" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
            </div>

            {/* Super Prêmios Banner - Premium Unified Design */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                setLocation("/game/premio-super-premios");
              }}
              className="group cursor-pointer relative"
            >
                {/* Card Glow Effect */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-all duration-500" />
                
                {/* Main Card Container */}
                <div className="relative bg-gradient-to-b from-gray-900/95 to-gray-950/95 backdrop-blur-xl rounded-3xl overflow-hidden border border-gray-800/50 shadow-[0_20px_70px_-15px_rgba(0,0,0,0.8)] transform transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_25px_80px_-15px_rgba(34,197,94,0.3)]">
                  
                  {/* Banner Section with Gradient Overlay */}
                  <div className="relative w-full" style={{ aspectRatio: "16/8" }}>
                    <OptimizedImage
                      src={bannerSuperPremios}
                      alt="Banner Super Prêmios"
                      className="absolute inset-0 w-full h-full object-contain"
                      priority={true}
                    />
                    
                    {/* Gradient Overlay for smooth transition */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-gray-900/95 pointer-events-none" />
                    
                    {/* Top Gradient Accent */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-60" />
                    
                    {/* Online Users Counter */}
                    <div className="absolute top-4 right-4 md:top-6 md:right-6">
                      <div className="relative">
                        <div className="absolute inset-0 bg-green-500/20 blur-xl" />
                        <div className="relative bg-black/60 backdrop-blur-md border border-green-500/30 rounded-xl px-3 py-1.5 md:px-4 md:py-2">
                          <OnlineUsersCounter gameType="super-premios" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Premium Badge */}
                    <div className="absolute top-4 left-4 md:top-6 md:left-6">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-500 blur-md" />
                        <div className="relative bg-gradient-to-r from-green-500 to-emerald-400 px-3 py-1 rounded-full">
                          <span className="text-white text-xs font-bold flex items-center gap-1">
                            <Trophy className="w-3 h-3" />
                            SUPER PRÊMIOS
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Info Section - Seamlessly Integrated */}
                  <div className="relative px-4 pb-4 md:px-6 md:pb-6 -mt-8 z-10">
                    {/* Glass Card for Button */}
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-2xl blur-xl" />
                      <div className="relative bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-xl rounded-2xl p-3 md:p-4 border border-gray-700/50 shadow-inner">
                        
                        <div className="flex items-center justify-between gap-4">
                          {/* Play Button */}
                          <div className="relative flex-1">
                            <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-500 rounded-xl blur-md opacity-70 group-hover:opacity-100 transition-opacity" />
                            <button className="relative w-full bg-gradient-to-r from-green-500 to-emerald-400 hover:from-green-400 hover:to-emerald-300 px-4 py-3 md:px-6 md:py-4 rounded-xl font-bold transition-all transform hover:scale-[1.02] shadow-lg">
                              <div className="flex items-center justify-center gap-3">
                                <span className="text-white text-base md:text-lg font-black uppercase tracking-wider drop-shadow-lg">
                                  Raspar Agora
                                </span>
                                <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-lg">
                                  <span className="text-white font-bold text-sm md:text-base">R$ 20,00</span>
                                </div>
                              </div>
                            </button>
                          </div>
                          
                          {/* Prize Preview */}
                          <div className="hidden md:flex flex-col items-center gap-1 px-4">
                            <div className="text-gray-400 text-xs uppercase tracking-wider">Prêmio Max</div>
                            <div className="text-white font-bold text-lg">R$ 500.000</div>
                            <div className="flex items-center gap-1 text-green-400">
                              <Trophy className="w-3 h-3" />
                              <span className="text-xs">Ver Todos</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Quick Stats Bar */}
                        <div className="mt-3 pt-3 border-t border-gray-700/50 flex items-center justify-between">
                          <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1 text-gray-400">
                              <Clock className="w-3 h-3" />
                              <span>Instantâneo</span>
                            </div>
                            <div className="flex items-center gap-1 text-yellow-400">
                              <Star className="w-3 h-3" />
                              <span>Super Prêmios</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-green-400 text-xs">
                            <Gift className="w-3 h-3" />
                            <span>Prêmios</span>
                            <ChevronRight className="w-3 h-3" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
            </div>
          </div>
          )}
          
          {gameSection === 'minigames' && (
            /* Minigames */
            <div className="flex justify-center p-4">
              <div className="text-center text-gray-400">
                <p className="text-lg mb-2">Minigames</p>
                <p className="text-sm">Em breve novos jogos estarão disponíveis!</p>
              </div>
            </div>
          )}
          
          {gameSection === 'baus' && (
            /* Baús */
            <div id="baus" className="grid grid-cols-2 gap-3 md:gap-4">
              {/* Baú PIX */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setLocation("/game/bau-pix");
                }}
                className="cursor-pointer transform hover:scale-[1.02] transition-all duration-300 overflow-hidden rounded-2xl shadow-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-blue-500/20"
              >
                  {/* Banner Section com aspecto de baú */}
                  <div className="relative w-full aspect-square overflow-hidden bg-gradient-to-br from-blue-900/30 to-gray-900">
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent z-10" />
                    <OptimizedImage
                      src={bannerBauPix}
                      alt="Baú PIX"
                      className="absolute inset-0 w-full h-full object-cover"
                      priority={true}
                    />
                    {/* Brilho do tesouro */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-yellow-400/10 to-transparent animate-pulse" />
                    
                    {/* Online Counter */}
                    <div className="absolute top-2 right-2 md:top-3 md:right-3 bg-black/70 backdrop-blur-md rounded-lg px-2 py-1 z-20">
                      <OnlineUsersCounter gameType="bau-pix" minUsers={550} maxUsers={650} />
                    </div>
                  </div>

                  {/* Info Section */}
                  <div className="p-3 md:p-4 bg-gradient-to-b from-gray-800 to-gray-900">
                    <h3 className="text-blue-500 font-bold text-base md:text-lg mb-2 uppercase text-center whitespace-nowrap">Baú do PIX</h3>
                    <button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-3 py-2 md:py-2.5 rounded-xl font-bold transition-all hover:shadow-xl hover:scale-[1.02] text-xs md:text-sm flex items-center justify-center gap-2 border border-blue-400/30 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-400/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <span className="relative z-10 font-black uppercase tracking-wider text-white">ABRIR</span>
                      <span className="relative z-10 bg-black/30 px-2 py-0.5 rounded text-white text-xs md:text-sm font-bold shadow-inner">R$ 1,00</span>
                    </button>
                  </div>
              </div>

              {/* Baú Delas */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setLocation("/game/bau-me-mimei");
                }}
                className="cursor-pointer transform hover:scale-[1.02] transition-all duration-300 overflow-hidden rounded-2xl shadow-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-pink-500/20"
              >
                  {/* Banner Section com aspecto de baú */}
                  <div className="relative w-full aspect-square overflow-hidden bg-gradient-to-br from-pink-900/30 to-gray-900">
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent z-10" />
                    <OptimizedImage
                      src={bannerBauDelas}
                      alt="Baú Delas"
                      className="absolute inset-0 w-full h-full object-cover"
                      priority={true}
                    />
                    {/* Brilho do tesouro */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-pink-400/10 to-transparent animate-pulse" />
                    
                    {/* Online Counter */}
                    <div className="absolute top-2 right-2 md:top-3 md:right-3 bg-black/70 backdrop-blur-md rounded-lg px-2 py-1 z-20">
                      <OnlineUsersCounter gameType="bau-me-mimei" minUsers={1100} maxUsers={1300} />
                    </div>
                  </div>

                  {/* Info Section */}
                  <div className="p-3 md:p-4 bg-gradient-to-b from-gray-800 to-gray-900">
                    <h3 className="text-pink-500 font-bold text-base md:text-lg mb-2 uppercase text-center whitespace-nowrap">Baú Delas</h3>
                    <button className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white px-3 py-2 md:py-2.5 rounded-xl font-bold transition-all hover:shadow-xl hover:scale-[1.02] text-xs md:text-sm flex items-center justify-center gap-2 border border-pink-400/30 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-r from-pink-400/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <span className="relative z-10 font-black uppercase tracking-wider text-white">ABRIR</span>
                      <span className="relative z-10 bg-black/30 px-2 py-0.5 rounded text-white text-xs md:text-sm font-bold shadow-inner">R$ 1,00</span>
                    </button>
                  </div>
              </div>

              {/* Baú Eletrônicos */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setLocation("/game/bau-eletronicos");
                }}
                className="cursor-pointer transform hover:scale-[1.02] transition-all duration-300 overflow-hidden rounded-2xl shadow-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-orange-500/20"
              >
                  {/* Banner Section com aspecto de baú */}
                  <div className="relative w-full aspect-square overflow-hidden bg-gradient-to-br from-orange-900/30 to-gray-900">
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent z-10" />
                    <OptimizedImage
                      src={bannerBauEletronicos}
                      alt="Baú Eletrônicos"
                      className="absolute inset-0 w-full h-full object-cover"
                      priority={true}
                    />
                    {/* Brilho do tesouro */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-orange-400/10 to-transparent animate-pulse" />
                    
                    {/* Online Counter */}
                    <div className="absolute top-2 right-2 md:top-3 md:right-3 bg-black/70 backdrop-blur-md rounded-lg px-2 py-1 z-20">
                      <OnlineUsersCounter gameType="bau-eletronicos" minUsers={320} maxUsers={380} />
                    </div>
                  </div>

                  {/* Info Section */}
                  <div className="p-3 md:p-4 bg-gradient-to-b from-gray-800 to-gray-900">
                    <h3 className="text-orange-500 font-bold text-[14px] mb-2 uppercase text-center whitespace-nowrap">Baú Eletrônicos</h3>
                    <button className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-3 py-2 md:py-2.5 rounded-xl font-bold transition-all hover:shadow-xl hover:scale-[1.02] text-xs md:text-sm flex items-center justify-center gap-2 border border-orange-400/30 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-r from-orange-400/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <span className="relative z-10 font-black uppercase tracking-wider text-white">ABRIR</span>
                      <span className="relative z-10 bg-black/30 px-2 py-0.5 rounded text-white text-xs md:text-sm font-bold shadow-inner">R$ 1,00</span>
                    </button>
                  </div>
              </div>

              {/* Super Baú */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setLocation("/game/bau-super-premios");
                }}
                className="cursor-pointer transform hover:scale-[1.02] transition-all duration-300 overflow-hidden rounded-2xl shadow-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-green-500/20"
              >
                  {/* Banner Section com aspecto de baú */}
                  <div className="relative w-full aspect-square overflow-hidden bg-gradient-to-br from-green-900/30 to-gray-900">
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent z-10" />
                    <OptimizedImage
                      src={bannerBauSuper}
                      alt="Baú Super"
                      className="absolute inset-0 w-full h-full object-cover"
                      priority={true}
                    />
                    {/* Brilho do tesouro */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-green-400/10 to-transparent animate-pulse" />
                    
                    {/* Online Counter */}
                    <div className="absolute top-2 right-2 md:top-3 md:right-3 bg-black/70 backdrop-blur-md rounded-lg px-2 py-1 z-20">
                      <OnlineUsersCounter gameType="bau-super-premios" minUsers={450} maxUsers={550} />
                    </div>
                  </div>

                  {/* Info Section */}
                  <div className="p-3 md:p-4 bg-gradient-to-b from-gray-800 to-gray-900">
                    <h3 className="text-green-500 font-bold text-base md:text-lg mb-2 uppercase text-center whitespace-nowrap">Super Baú!</h3>
                    <button className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-3 py-2 md:py-2.5 rounded-xl font-bold transition-all hover:shadow-xl hover:scale-[1.02] text-xs md:text-sm flex items-center justify-center gap-2 border border-green-400/30 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-r from-green-400/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <span className="relative z-10 font-black uppercase tracking-wider text-white">ABRIR</span>
                      <span className="relative z-10 bg-black/30 px-2 py-0.5 rounded text-white text-xs md:text-sm font-bold shadow-inner">R$ 20,00</span>
                    </button>
                  </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );

  // If user is not authenticated, show content with Header AND bottom nav
  if (!user) {
    return (
      <>
        <MobileLayout hideRightSection={false}>{content}</MobileLayout>
      </>
    );
  }

  // If user is authenticated, show content with MobileLayout
  return (
    <>
      <MobileLayout>{content}</MobileLayout>
      <DailySpinModal
        isOpen={showDailySpinModal}
        onClose={() => setShowDailySpinModal(false)}
        canSpin={spinStatus?.canSpin || false}
      />
    </>
  );
}
