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
import bannerEsquilo from "/premios/jogo-esquilo/banner-esquilo-mania.webp";
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
  const gameBanners = [bannerPix, bannerMeMimei, bannerEletronicos, bannerSuperPremios, bannerEsquilo, bannerBauPix, bannerBauDelas, bannerBauEletronicos, bannerBauSuper];
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

        {/* Seção de Navegação Premium */}
        <section className="px-3 md:px-8 mb-4 md:mb-8 mt-6 md:mt-12 relative">
          {/* Decorative gradient background */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00E880]/5 to-transparent blur-3xl -z-10" />
          
          <div className="text-center mb-4 md:mb-6">
            {/* Título da Seção com Efeito Premium */}
            <div className="relative inline-block mb-4 md:mb-6">
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
            
            {/* Navegação Mobile - Design Glass Morphism Premium */}
            <div className="md:hidden flex gap-2 px-2 justify-center">
              {/* Raspadinhas Card */}
              <div className="relative">
                <button
                  onClick={() => setGameSection('raspadinhas')}
                  className={`relative w-[85px] h-[65px] transition-all duration-500 transform ${
                    gameSection === 'raspadinhas'
                      ? 'scale-110 -translate-y-1'
                      : 'scale-100 hover:scale-105'
                  }`}
                >
                  {/* Glow effect when active */}
                  {gameSection === 'raspadinhas' && (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#00E880] to-[#00FFB3] opacity-40 blur-xl rounded-2xl animate-pulse" />
                  )}
                  
                  <div className={`h-full rounded-2xl overflow-hidden ${
                    gameSection === 'raspadinhas'
                      ? 'bg-gradient-to-br from-[#00E880] via-[#00FFB3] to-[#00E880] p-[2px] shadow-[0_0_30px_rgba(0,232,128,0.8)]'
                      : 'bg-gradient-to-br from-gray-700/50 to-gray-800/50 p-[1px]'
                  } backdrop-blur-xl`}>
                    <div className={`h-full rounded-2xl flex flex-col items-center justify-center gap-1 relative overflow-hidden ${
                      gameSection === 'raspadinhas'
                        ? 'bg-gradient-to-br from-black/80 via-gray-900/80 to-black/80'
                        : 'bg-gradient-to-br from-gray-900/90 via-black/90 to-gray-900/90'
                    } backdrop-blur-sm`}>
                      {/* Background pattern */}
                      <div className="absolute inset-0 opacity-10">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5" />
                      </div>
                      
                      {/* Icon with glow */}
                      <div className="relative">
                        <Grid3X3 className={`w-6 h-6 relative z-10 transition-all duration-300 ${
                          gameSection === 'raspadinhas' 
                            ? 'text-[#00E880] drop-shadow-[0_0_10px_rgba(0,232,128,0.8)]' 
                            : 'text-gray-400'
                        }`} />
                        {gameSection === 'raspadinhas' && (
                          <div className="absolute inset-0 bg-[#00E880] blur-lg opacity-50" />
                        )}
                      </div>
                      
                      <span className={`text-[9px] font-black uppercase tracking-wider relative z-10 transition-colors duration-300 ${
                        gameSection === 'raspadinhas'
                          ? 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]'
                          : 'text-gray-400'
                      }`}>
                        Raspadinhas
                      </span>
                    </div>
                  </div>
                </button>
                
                {/* Badge Premium - positioned outside */}
                <div className="absolute -top-4 -right-4 z-30">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-orange-500 blur-sm animate-pulse" />
                    <div className="relative bg-gradient-to-r from-red-500 to-orange-400 text-white text-[8px] px-2 py-1 rounded-full font-black shadow-lg border border-white/20">
                      🔥 QUENTE
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Minigames Card */}
              <div className="relative">
                <button
                  onClick={() => setGameSection('minigames')}
                  className={`relative w-[85px] h-[65px] transition-all duration-500 transform ${
                    gameSection === 'minigames'
                      ? 'scale-110 -translate-y-1'
                      : 'scale-100 hover:scale-105'
                  }`}
                >
                  {/* Glow effect when active */}
                  {gameSection === 'minigames' && (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#00E880] to-[#00FFB3] opacity-40 blur-xl rounded-2xl animate-pulse" />
                  )}
                  
                  <div className={`h-full rounded-2xl overflow-hidden ${
                    gameSection === 'minigames'
                      ? 'bg-gradient-to-br from-[#00E880] via-[#00FFB3] to-[#00E880] p-[2px] shadow-[0_0_30px_rgba(0,232,128,0.8)]'
                      : 'bg-gradient-to-br from-gray-700/50 to-gray-800/50 p-[1px]'
                  } backdrop-blur-xl`}>
                    <div className={`h-full rounded-2xl flex flex-col items-center justify-center gap-1 relative overflow-hidden ${
                      gameSection === 'minigames'
                        ? 'bg-gradient-to-br from-black/80 via-gray-900/80 to-black/80'
                        : 'bg-gradient-to-br from-gray-900/90 via-black/90 to-gray-900/90'
                    } backdrop-blur-sm`}>
                      {/* Background pattern */}
                      <div className="absolute inset-0 opacity-10">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5" />
                      </div>
                      
                      {/* Icon with glow */}
                      <div className="relative">
                        <Gamepad2 className={`w-6 h-6 relative z-10 transition-all duration-300 ${
                          gameSection === 'minigames' 
                            ? 'text-[#00E880] drop-shadow-[0_0_10px_rgba(0,232,128,0.8)]' 
                            : 'text-gray-400'
                        }`} />
                        {gameSection === 'minigames' && (
                          <div className="absolute inset-0 bg-[#00E880] blur-lg opacity-50" />
                        )}
                      </div>
                      
                      <span className={`text-[9px] font-black uppercase tracking-wider relative z-10 transition-colors duration-300 ${
                        gameSection === 'minigames'
                          ? 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]'
                          : 'text-gray-400'
                      }`}>
                        Minigames
                      </span>
                    </div>
                  </div>
                </button>
                
                {/* Badge Premium - positioned outside */}
                <div className="absolute -top-4 -right-4 z-30">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-500 blur-sm animate-pulse" />
                    <div className="relative bg-gradient-to-r from-purple-500 to-pink-400 text-white text-[8px] px-2 py-1 rounded-full font-black shadow-lg border border-white/20">
                      ✨ NOVO
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Baús Card */}
              <div className="relative">
                <button
                  onClick={() => setGameSection('baus')}
                  className={`relative w-[85px] h-[65px] transition-all duration-500 transform ${
                    gameSection === 'baus'
                      ? 'scale-110 -translate-y-1'
                      : 'scale-100 hover:scale-105'
                  }`}
                >
                  {/* Glow effect when active */}
                  {gameSection === 'baus' && (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#00E880] to-[#00FFB3] opacity-40 blur-xl rounded-2xl animate-pulse" />
                  )}
                  
                  <div className={`h-full rounded-2xl overflow-hidden ${
                    gameSection === 'baus'
                      ? 'bg-gradient-to-br from-[#00E880] via-[#00FFB3] to-[#00E880] p-[2px] shadow-[0_0_30px_rgba(0,232,128,0.8)]'
                      : 'bg-gradient-to-br from-gray-700/50 to-gray-800/50 p-[1px]'
                  } backdrop-blur-xl`}>
                    <div className={`h-full rounded-2xl flex flex-col items-center justify-center gap-1 relative overflow-hidden ${
                      gameSection === 'baus'
                        ? 'bg-gradient-to-br from-black/80 via-gray-900/80 to-black/80'
                        : 'bg-gradient-to-br from-gray-900/90 via-black/90 to-gray-900/90'
                    } backdrop-blur-sm`}>
                      {/* Background pattern */}
                      <div className="absolute inset-0 opacity-10">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5" />
                      </div>
                      
                      {/* Icon with glow */}
                      <div className="relative">
                        <Package className={`w-6 h-6 relative z-10 transition-all duration-300 ${
                          gameSection === 'baus' 
                            ? 'text-[#00E880] drop-shadow-[0_0_10px_rgba(0,232,128,0.8)]' 
                            : 'text-gray-400'
                        }`}/>
                        {gameSection === 'baus' && (
                          <div className="absolute inset-0 bg-[#00E880] blur-lg opacity-50" />
                        )}
                      </div>
                      
                      <span className={`text-[9px] font-black uppercase tracking-wider relative z-10 transition-colors duration-300 ${
                        gameSection === 'baus'
                          ? 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]'
                          : 'text-gray-400'
                      }`}>
                        Baús
                      </span>
                    </div>
                  </div>
                </button>
                
                {/* Badge Premium - positioned outside */}
                <div className="absolute -top-4 -right-4 z-30">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-500 blur-sm animate-pulse" />
                    <div className="relative bg-gradient-to-r from-indigo-500 to-purple-400 text-white text-[8px] px-2 py-1 rounded-full font-black shadow-lg border border-white/20">
                      💎 NOVO
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Navegação Desktop - Glass Morphism Premium */}
            <div className="hidden md:flex items-center justify-center gap-3">
              {/* Container with glass effect */}
              <div className="relative inline-flex items-center gap-1 p-1.5 bg-gradient-to-br from-gray-900/40 via-gray-800/40 to-gray-900/40 backdrop-blur-xl rounded-2xl border border-gray-700/50 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                {/* Decorative glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#00E880]/10 via-transparent to-[#00FFB3]/10 rounded-2xl blur-xl" />
                
                {/* Tab Raspadinhas */}
                <div className="relative">
                  <button
                    onClick={() => setGameSection('raspadinhas')}
                    className={`relative px-6 py-3 rounded-xl font-bold text-sm transition-all duration-500 flex items-center gap-2 group ${
                      gameSection === 'raspadinhas'
                        ? 'bg-gradient-to-r from-[#00E880] via-[#00FFB3] to-[#00E880] text-black shadow-[0_0_20px_rgba(0,232,128,0.6)] scale-105'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {/* Active glow effect */}
                    {gameSection === 'raspadinhas' && (
                      <div className="absolute inset-0 bg-gradient-to-r from-[#00E880] to-[#00FFB3] opacity-30 blur-xl rounded-xl animate-pulse" />
                    )}
                    
                    <Grid3X3 className={`w-5 h-5 transition-all duration-300 ${
                      gameSection === 'raspadinhas' 
                        ? 'text-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]' 
                        : 'text-gray-400 group-hover:text-[#00E880]'
                    }`} />
                    
                    <span className="uppercase tracking-wider font-black relative z-10">
                      Raspadinhas
                    </span>
                  </button>
                  
                  {/* Premium Badge - positioned outside */}
                  <div className="absolute -top-5 -right-5 z-30">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-orange-500 blur-sm animate-pulse" />
                      <div className="relative bg-gradient-to-r from-red-500 to-orange-400 text-white text-[9px] px-2 py-1 rounded-full font-black shadow-xl border border-white/30 flex items-center gap-1">
                        <span className="text-sm">🔥</span>
                        <span>QUENTE</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Elegant Divider */}
                <div className="w-[1px] h-8 bg-gradient-to-b from-transparent via-gray-600/50 to-transparent" />
                
                {/* Tab Minigames */}
                <div className="relative">
                  <button
                    onClick={() => setGameSection('minigames')}
                    className={`relative px-6 py-3 rounded-xl font-bold text-sm transition-all duration-500 flex items-center gap-2 group ${
                      gameSection === 'minigames'
                        ? 'bg-gradient-to-r from-[#00E880] via-[#00FFB3] to-[#00E880] text-black shadow-[0_0_20px_rgba(0,232,128,0.6)] scale-105'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {/* Active glow effect */}
                    {gameSection === 'minigames' && (
                      <div className="absolute inset-0 bg-gradient-to-r from-[#00E880] to-[#00FFB3] opacity-30 blur-xl rounded-xl animate-pulse" />
                    )}
                    
                    <Gamepad2 className={`w-5 h-5 transition-all duration-300 ${
                      gameSection === 'minigames' 
                        ? 'text-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]' 
                        : 'text-gray-400 group-hover:text-[#00E880]'
                    }`} />
                    
                    <span className="uppercase tracking-wider font-black relative z-10">
                      Minigames
                    </span>
                  </button>
                  
                  {/* Premium Badge - positioned outside */}
                  <div className="absolute -top-5 -right-5 z-30">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-500 blur-sm animate-pulse" />
                      <div className="relative bg-gradient-to-r from-purple-500 to-pink-400 text-white text-[9px] px-2 py-1 rounded-full font-black shadow-xl border border-white/30 flex items-center gap-1">
                        <span className="text-sm">✨</span>
                        <span>NOVO</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Elegant Divider */}
                <div className="w-[1px] h-8 bg-gradient-to-b from-transparent via-gray-600/50 to-transparent" />
                
                {/* Tab Baús */}
                <div className="relative">
                  <button
                    onClick={() => setGameSection('baus')}
                    className={`relative px-6 py-3 rounded-xl font-bold text-sm transition-all duration-500 flex items-center gap-2 group ${
                      gameSection === 'baus'
                        ? 'bg-gradient-to-r from-[#00E880] via-[#00FFB3] to-[#00E880] text-black shadow-[0_0_20px_rgba(0,232,128,0.6)] scale-105'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {/* Active glow effect */}
                    {gameSection === 'baus' && (
                      <div className="absolute inset-0 bg-gradient-to-r from-[#00E880] to-[#00FFB3] opacity-30 blur-xl rounded-xl animate-pulse" />
                    )}
                    
                    <Package className={`w-5 h-5 transition-all duration-300 ${
                      gameSection === 'baus' 
                        ? 'text-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]' 
                        : 'text-gray-400 group-hover:text-[#00E880]'
                    }`}/>
                    
                    <span className="uppercase tracking-wider font-black relative z-10">
                      Baús
                    </span>
                  </button>
                  
                  {/* Premium Badge - positioned outside */}
                  <div className="absolute -top-5 -right-5 z-30">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-500 blur-sm animate-pulse" />
                      <div className="relative bg-gradient-to-r from-indigo-500 to-purple-400 text-white text-[9px] px-2 py-1 rounded-full font-black shadow-xl border border-white/30 flex items-center gap-1">
                        <span className="text-sm">💎</span>
                        <span>NOVO</span>
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
            {/* Raspadinha PIX Banner */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                setLocation("/game/premio-pix");
              }}
              className="cursor-pointer transform hover:scale-[1.02] transition-all duration-300 overflow-hidden rounded-2xl shadow-2xl"
            >
                {/* Banner Section */}
                <div
                  className="relative w-full overflow-hidden"
                  style={{
                    aspectRatio: "16/8",
                  }}
                >
                  <OptimizedImage
                    src={bannerPix}
                    alt="Banner PIX na Conta"
                    className="absolute inset-0 w-full h-full object-contain"
                    priority={true}
                  />
                  {/* Online Users Counter in Banner */}
                  <div className="absolute top-8 right-4 md:top-10 md:right-6 bg-black/30 backdrop-blur-sm rounded-lg px-3 py-1.5 md:px-4 md:py-2">
                    <OnlineUsersCounter gameType="pix" />
                  </div>
                </div>

                {/* Info Section */}
                <div className="p-1 md:p-2 bg-gray-900 -mt-4 md:-mt-6 relative z-10">
                  <div>
                    <button className="animate-gentle-pulse w-full bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white px-3 py-3 md:px-4 md:py-4 rounded-2xl font-bold transition-all hover:shadow-xl hover:scale-[1.02] text-sm md:text-base flex items-center justify-between border border-gray-700 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-blue-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <span className="bg-gradient-to-r from-blue-500 to-blue-400 px-4 py-2 md:px-6 md:py-3 rounded-xl flex items-center gap-3 shadow-lg relative z-10">
                        <span className="text-white text-sm md:text-base font-black uppercase tracking-wider">
                          Raspar
                        </span>
                        <span className="bg-black/40 px-3 py-1 md:px-4 md:py-2 rounded-lg text-white font-bold shadow-inner">
                          R$ 1,00
                        </span>
                      </span>
                      <span className="flex items-center gap-1 text-[10px] md:text-xs text-gray-400 pr-2 md:pr-4 relative z-10">
                        <svg
                          className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-400"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 0 0-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z" />
                        </svg>
                        <span className="font-medium uppercase">
                          Ver Prêmios
                        </span>
                        <svg
                          className="w-3 h-3 md:w-4 md:h-4"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
                        </svg>
                      </span>
                    </button>
                  </div>
                </div>
            </div>

            {/* Me Mimei Banner */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                setLocation("/game/premio-me-mimei");
              }}
              className="cursor-pointer transform hover:scale-[1.02] transition-all duration-300 overflow-hidden rounded-2xl shadow-2xl"
            >
                {/* Banner Section */}
                <div
                  className="relative w-full overflow-hidden"
                  style={{
                    aspectRatio: "16/8",
                  }}
                >
                  <OptimizedImage
                    src={bannerMeMimei}
                    alt="Banner Me Mimei"
                    className="absolute inset-0 w-full h-full object-contain"
                    priority={true}
                  />
                  {/* Online Users Counter in Banner */}
                  <div className="absolute top-8 right-4 md:top-10 md:right-6 bg-black/30 backdrop-blur-sm rounded-lg px-3 py-1.5 md:px-4 md:py-2">
                    <OnlineUsersCounter gameType="me-mimei" />
                  </div>
                </div>

                {/* Info Section */}
                <div className="p-1 md:p-2 bg-gray-900 -mt-4 md:-mt-6 relative z-10">
                  <div>
                    <button className="animate-gentle-pulse w-full bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white px-3 py-3 md:px-4 md:py-4 rounded-2xl font-bold transition-all hover:shadow-xl hover:scale-[1.02] text-sm md:text-base flex items-center justify-between border border-gray-700 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 to-pink-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <span className="bg-gradient-to-r from-pink-500 to-pink-400 px-4 py-2 md:px-6 md:py-3 rounded-xl flex items-center gap-3 shadow-lg relative z-10">
                        <span className="text-white text-sm md:text-base font-black uppercase tracking-wider">
                          Raspar
                        </span>
                        <span className="bg-black/40 px-3 py-1 md:px-4 md:py-2 rounded-lg text-white font-bold shadow-inner">
                          R$ 1,00
                        </span>
                      </span>
                      <span className="flex items-center gap-1 text-[10px] md:text-xs text-gray-400 pr-2 md:pr-4 relative z-10">
                        <svg
                          className="w-3.5 h-3.5 md:w-4 md:h-4 text-pink-400"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 0 0-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z" />
                        </svg>
                        <span className="font-medium uppercase">
                          Ver Prêmios
                        </span>
                        <svg
                          className="w-3 h-3 md:w-4 md:h-4"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
                        </svg>
                      </span>
                    </button>
                  </div>
                </div>
            </div>

            {/* Eletrônicos Banner */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                setLocation("/game/premio-eletronicos");
              }}
              className="cursor-pointer transform hover:scale-[1.02] transition-all duration-300 overflow-hidden rounded-2xl shadow-2xl"
            >
                {/* Banner Section */}
                <div
                  className="relative w-full overflow-hidden"
                  style={{
                    aspectRatio: "16/8",
                  }}
                >
                  <OptimizedImage
                    src={bannerEletronicos}
                    alt="Banner Eletrônicos"
                    className="absolute inset-0 w-full h-full object-contain"
                    priority={true}
                  />
                  {/* Online Users Counter in Banner */}
                  <div className="absolute top-8 right-4 md:top-10 md:right-6 bg-black/30 backdrop-blur-sm rounded-lg px-3 py-1.5 md:px-4 md:py-2">
                    <OnlineUsersCounter gameType="eletronicos" />
                  </div>
                </div>

                {/* Info Section */}
                <div className="p-1 md:p-2 bg-gray-900 -mt-4 md:-mt-6 relative z-10">
                  <div>
                    <button className="animate-gentle-pulse w-full bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white px-3 py-3 md:px-4 md:py-4 rounded-2xl font-bold transition-all hover:shadow-xl hover:scale-[1.02] text-sm md:text-base flex items-center justify-between border border-gray-700 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-orange-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <span className="bg-gradient-to-r from-orange-500 to-orange-400 px-4 py-2 md:px-6 md:py-3 rounded-xl flex items-center gap-3 shadow-lg relative z-10">
                        <span className="text-white text-sm md:text-base font-black uppercase tracking-wider">
                          Raspar
                        </span>
                        <span className="bg-black/40 px-3 py-1 md:px-4 md:py-2 rounded-lg text-white font-bold shadow-inner">
                          R$ 1,00
                        </span>
                      </span>
                      <span className="flex items-center gap-1 text-[10px] md:text-xs text-gray-400 pr-2 md:pr-4 relative z-10">
                        <svg
                          className="w-3.5 h-3.5 md:w-4 md:h-4 text-orange-400"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 0 0-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z" />
                        </svg>
                        <span className="font-medium uppercase">
                          Ver Prêmios
                        </span>
                        <svg
                          className="w-3 h-3 md:w-4 md:h-4"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
                        </svg>
                      </span>
                    </button>
                  </div>
                </div>
            </div>

            {/* Super Prêmios Banner */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                setLocation("/game/premio-super-premios");
              }}
              className="cursor-pointer transform hover:scale-[1.02] transition-all duration-300 overflow-hidden rounded-2xl shadow-2xl"
            >
                {/* Banner Section */}
                <div
                  className="relative w-full overflow-hidden"
                  style={{
                    aspectRatio: "16/8",
                  }}
                >
                  <OptimizedImage
                    src={bannerSuperPremios}
                    alt="Banner Super Prêmios"
                    className="absolute inset-0 w-full h-full object-contain"
                    priority={true}
                  />
                  {/* Online Users Counter in Banner */}
                  <div className="absolute top-8 right-4 md:top-10 md:right-6 bg-black/30 backdrop-blur-sm rounded-lg px-3 py-1.5 md:px-4 md:py-2">
                    <OnlineUsersCounter gameType="super-premios" />
                  </div>
                </div>

                {/* Info Section */}
                <div className="p-1 md:p-2 bg-gray-900 -mt-4 md:-mt-6 relative z-10">
                  <div>
                    <button className="animate-gentle-pulse w-full bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white px-3 py-3 md:px-4 md:py-4 rounded-2xl font-bold transition-all hover:shadow-xl hover:scale-[1.02] text-sm md:text-base flex items-center justify-between border border-gray-700 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-green-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <span className="bg-gradient-to-r from-green-500 to-green-400 px-4 py-2 md:px-6 md:py-3 rounded-xl flex items-center gap-3 shadow-lg relative z-10">
                        <span className="text-white text-sm md:text-base font-black uppercase tracking-wider">
                          Raspar
                        </span>
                        <span className="bg-black/40 px-3 py-1 md:px-4 md:py-2 rounded-lg text-white font-bold shadow-inner">
                          R$ 20,00
                        </span>
                      </span>
                      <span className="flex items-center gap-1 text-[10px] md:text-xs text-gray-400 pr-2 md:pr-4 relative z-10">
                        <svg
                          className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-400"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 0 0-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z" />
                        </svg>
                        <span className="font-medium uppercase">
                          Ver Prêmios
                        </span>
                        <svg
                          className="w-3 h-3 md:w-4 md:h-4"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
                        </svg>
                      </span>
                    </button>
                  </div>
                </div>
            </div>
          </div>
          )}
          
          {gameSection === 'minigames' && (
            /* Minigames */
            <div className="flex justify-center">
              {/* Jogo do Esquilo - Centralizado */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setLocation("/game/jogo-esquilo");
                }}
                className="cursor-pointer transform hover:scale-[1.02] transition-all duration-300 overflow-hidden rounded-2xl shadow-2xl w-full md:max-w-md"
              >
                {/* Banner Section */}
                <div
                  className="relative w-full overflow-hidden"
                  style={{
                    aspectRatio: "16/8",
                  }}
                >
                  <OptimizedImage
                    src={bannerEsquilo}
                    alt="Banner Esquilo Mania"
                    className="absolute inset-0 w-full h-full object-contain"
                    priority={true}
                  />
                  {/* Online Users Counter in Banner */}
                  <div className="absolute top-8 right-4 md:top-10 md:right-6 bg-black/30 backdrop-blur-sm rounded-lg px-3 py-1.5 md:px-4 md:py-2">
                    <OnlineUsersCounter gameType="esquilo" minUsers={2200} maxUsers={2400} />
                  </div>
                </div>

                {/* Info Section */}
                <div className="p-1 md:p-2 bg-gray-900 -mt-4 md:-mt-6 relative z-10">
                  <div>
                    <button className="animate-gentle-pulse w-full bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white px-3 py-3 md:px-4 md:py-4 rounded-2xl font-bold transition-all hover:shadow-xl hover:scale-[1.02] text-sm md:text-base flex items-center justify-between border border-gray-700 relative overflow-hidden group">
                      {/* Wood texture overlay */}
                      <div className="absolute inset-0 opacity-30 bg-gradient-to-br from-amber-900 via-amber-800 to-amber-950"></div>
                      <div className="absolute inset-0 bg-gradient-to-r from-amber-600/20 to-amber-700/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      
                      {/* Wood grain effect */}
                      <div className="absolute inset-0 opacity-20">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-900/30 to-transparent transform skew-y-12"></div>
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-800/20 to-transparent transform -skew-y-12"></div>
                      </div>
                      
                      <span className="bg-gradient-to-r from-amber-700 to-amber-600 px-4 py-2 md:px-6 md:py-3 rounded-xl flex items-center gap-3 shadow-lg relative z-10 border border-amber-800">
                        {/* Inner wood texture */}
                        <div className="absolute inset-0 rounded-xl opacity-40 bg-gradient-to-tr from-amber-900 via-amber-700 to-amber-800"></div>
                        <span className="text-white text-sm md:text-base font-black uppercase tracking-wider relative drop-shadow-lg">
                          Jogar
                        </span>
                        <span className="bg-black/40 px-3 py-1 md:px-4 md:py-2 rounded-lg text-white font-bold shadow-inner relative">
                          R$ 1,00
                        </span>
                      </span>
                      <span className="flex items-center gap-1 text-[10px] md:text-xs text-amber-200 pr-2 md:pr-4 relative z-10">
                        <svg
                          className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-400"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 0 0-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z" />
                        </svg>
                        <span className="font-medium uppercase">
                          Ver Prêmios
                        </span>
                        <svg
                          className="w-3 h-3 md:w-4 md:h-4"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
                        </svg>
                      </span>
                    </button>
                  </div>
                </div>
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
