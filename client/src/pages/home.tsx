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
                    ESCOLHA SEU MODO
                  </span>
                  
                  {/* Decorative underline */}
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-24 md:w-40 h-1 bg-gradient-to-r from-transparent via-[#00E880] to-transparent rounded-full" />
                </span>
              </h2>
            </div>
            
            {/* Mode Selector Navigation - Mobile & Desktop */}
            <div className="relative flex items-center justify-center">
              {/* Container for mode selectors */}
              <div className="relative inline-flex items-center gap-4 md:gap-6">
                
                {/* Raspadinhas Mode Selector */}
                <button
                  onClick={() => setGameSection('raspadinhas')}
                  className={`relative transition-all duration-500 ${
                    gameSection === 'raspadinhas'
                      ? 'opacity-100'
                      : 'opacity-60 hover:opacity-80'
                  }`}
                >
                  <div className={`relative w-[100px] h-[120px] md:w-[140px] md:h-[160px] rounded-xl overflow-hidden transition-all duration-500 ${
                    gameSection === 'raspadinhas'
                      ? 'bg-gray-800/50 ring-1 ring-gray-600/30'
                      : 'bg-gray-900/30'
                  }`}>
                    {/* Image */}
                    <div className="flex items-center justify-center h-[75%] p-2">
                      <img 
                        src="/images/raspadinhas-selector.png" 
                        alt="Raspadinhas"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    {/* Text */}
                    <div className="absolute bottom-0 left-0 right-0 h-[25%] flex items-center justify-center bg-black/40">
                      <span className={`text-[10px] md:text-[12px] font-bold uppercase tracking-wider ${
                        gameSection === 'raspadinhas'
                          ? 'text-white'
                          : 'text-gray-400'
                      }`}>
                        Raspadinhas
                      </span>
                    </div>
                  </div>
                </button>
                
                {/* Minigames Mode Selector */}
                <button
                  onClick={() => setGameSection('minigames')}
                  className={`relative transition-all duration-500 ${
                    gameSection === 'minigames'
                      ? 'opacity-100'
                      : 'opacity-60 hover:opacity-80'
                  }`}
                >
                  <div className={`relative w-[100px] h-[120px] md:w-[140px] md:h-[160px] rounded-xl overflow-hidden transition-all duration-500 ${
                    gameSection === 'minigames'
                      ? 'bg-gray-800/50 ring-1 ring-gray-600/30'
                      : 'bg-gray-900/30'
                  }`}>
                    {/* Image */}
                    <div className="flex items-center justify-center h-[75%] p-2">
                      <img 
                        src="/images/minigames-selector.png" 
                        alt="Minigames"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    {/* Text */}
                    <div className="absolute bottom-0 left-0 right-0 h-[25%] flex items-center justify-center bg-black/40">
                      <span className={`text-[10px] md:text-[12px] font-bold uppercase tracking-wider ${
                        gameSection === 'minigames'
                          ? 'text-white'
                          : 'text-gray-400'
                      }`}>
                        Minigames
                      </span>
                    </div>
                  </div>
                </button>
                
                {/* Baús Mode Selector */}
                <button
                  onClick={() => setGameSection('baus')}
                  className={`relative transition-all duration-500 ${
                    gameSection === 'baus'
                      ? 'opacity-100'
                      : 'opacity-60 hover:opacity-80'
                  }`}
                >
                  <div className={`relative w-[100px] h-[120px] md:w-[140px] md:h-[160px] rounded-xl overflow-hidden transition-all duration-500 ${
                    gameSection === 'baus'
                      ? 'bg-gray-800/50 ring-1 ring-gray-600/30'
                      : 'bg-gray-900/30'
                  }`}>
                    {/* Image */}
                    <div className="flex items-center justify-center h-[75%] p-2">
                      <img 
                        src="/images/baus-selector.png" 
                        alt="Baús"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    {/* Text */}
                    <div className="absolute bottom-0 left-0 right-0 h-[25%] flex items-center justify-center bg-black/40">
                      <span className={`text-[10px] md:text-[12px] font-bold uppercase tracking-wider ${
                        gameSection === 'baus'
                          ? 'text-white'
                          : 'text-gray-400'
                      }`}>
                        Baús
                      </span>
                    </div>
                  </div>
                </button>
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
