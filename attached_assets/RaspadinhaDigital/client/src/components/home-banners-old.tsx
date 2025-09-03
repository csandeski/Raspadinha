import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Gift, TrendingUp, Zap } from 'lucide-react';
import { useLocation } from 'wouter';

export function HomeBanners() {
  const [currentBanner, setCurrentBanner] = useState(0);
  const [, setLocation] = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  
  const banners = [
    {
      id: 1,
      title: "🎰 ROLETA DA SORTE",
      subtitle: "Prêmios de até",
      highlight: "100",
      extra: "RASPADINHAS GRÁTIS",
      description: "Gire grátis todos os dias!",
      icon: Gift,
      onClick: () => setLocation('/rewards'),
      gradient: "from-[#00FF88] via-[#00E673] to-[#00CC5F]",
      bgGradient: "from-[#001F0F] via-[#002A14] to-[#003519]",
      accentColor: "text-[#00FF88]",
      shadowColor: "shadow-[#00FF88]/40",
      buttonBg: "bg-gradient-to-r from-[#00FF88] to-[#00CC5F] hover:from-[#00CC5F] hover:to-[#00FF88]",
      particles: "bg-gradient-to-tr from-[#00FF88]/30 to-transparent"
    },
    {
      id: 2,
      title: "🚀 INDIQUE E GANHE",
      subtitle: "Lucre até",
      highlight: "R$ 1.000",
      extra: "TODO DIA",
      description: "10% de comissão vitalícia!",
      icon: TrendingUp,
      onClick: () => setLocation('/affiliates'),
      gradient: "from-[#FF00E5] via-[#E500FF] to-[#B300FF]",
      bgGradient: "from-[#2D0029] via-[#1F001F] to-[#15001A]",
      accentColor: "text-[#FF00E5]",
      shadowColor: "shadow-[#FF00E5]/40",
      buttonBg: "bg-gradient-to-r from-[#FF00E5] to-[#B300FF] hover:from-[#B300FF] hover:to-[#FF00E5]",
      particles: "bg-gradient-to-tr from-[#FF00E5]/30 to-transparent"
    },
    {
      id: 3,
      title: "⚡ PIX INSTANTÂNEO",
      subtitle: "Crédito em",
      highlight: "30 SEG",
      extra: "DISPONÍVEL 24H",
      description: "Saque rápido e seguro!",
      icon: Zap,
      onClick: () => setLocation('/deposit'),
      gradient: "from-[#00D4FF] via-[#0099FF] to-[#0066FF]",
      bgGradient: "from-[#001A2E] via-[#001122] to-[#000D1A]",
      accentColor: "text-[#00D4FF]",
      shadowColor: "shadow-[#00D4FF]/40",
      buttonBg: "bg-gradient-to-r from-[#00D4FF] to-[#0066FF] hover:from-[#0066FF] hover:to-[#00D4FF]",
      particles: "bg-gradient-to-tr from-[#00D4FF]/30 to-transparent"
    }
  ];

  // Auto-rotate banners
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const goToPrevious = () => {
    setCurrentBanner((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const goToNext = () => {
    setCurrentBanner((prev) => (prev + 1) % banners.length);
  };

  return (
    <div className="relative w-full max-w-7xl mx-auto px-4 md:px-6 mb-12">
      
      {/* Mobile: Single banner with navigation */}
      <div className="md:hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentBanner}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
            onClick={banners[currentBanner].onClick}
            className={`
              relative cursor-pointer group
              ${banners[currentBanner].shadowColor} shadow-2xl
              rounded-3xl overflow-hidden
              transform transition-all duration-500
              active:scale-[0.98]
              min-h-[180px]
              border-2 border-white/20
              backdrop-blur-xl
            `}
          >
            {/* Premium gradient background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${banners[currentBanner].bgGradient}`} />
            <div className={`absolute inset-0 bg-gradient-to-tr ${banners[currentBanner].gradient} opacity-40`} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            
            {/* Animated particles */}
            <div className="absolute inset-0 overflow-hidden">
              <div className={`absolute -top-4 -right-4 w-24 h-24 ${banners[currentBanner].particles} rounded-full blur-2xl animate-pulse`} />
              <div className={`absolute -bottom-4 -left-4 w-32 h-32 ${banners[currentBanner].particles} rounded-full blur-3xl animate-pulse delay-300`} />
            </div>
            
            {/* Content */}
            <div className="relative z-10 p-6 flex items-center justify-between">
              <div className="flex-1 pr-4">
                <div className="mb-3 space-y-1">
                  <p className="text-white/90 text-xs font-black uppercase tracking-widest mb-2">
                    {banners[currentBanner].title}
                  </p>
                  <div className="space-y-0">
                    <p className="text-white/70 text-sm font-medium">{banners[currentBanner].subtitle}</p>
                    <h3 className={`text-4xl font-black ${banners[currentBanner].accentColor} drop-shadow-2xl leading-none mb-1`}>
                      {banners[currentBanner].highlight}
                    </h3>
                    <p className="text-white text-base font-black uppercase tracking-wide">{banners[currentBanner].extra}</p>
                  </div>
                </div>
                <button className={`
                  mt-3 px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-wider
                  ${banners[currentBanner].buttonBg} text-white shadow-xl
                  transform transition-all duration-300 hover:scale-105
                  border border-white/30
                `}>
                  APROVEITAR AGORA →
                </button>
              </div>
              
              {/* Icon with premium glow effect */}
              <div className="relative">
                <div className={`absolute -inset-4 ${banners[currentBanner].particles} blur-3xl animate-pulse`} />
                <div className={`absolute -inset-2 bg-gradient-to-r ${banners[currentBanner].gradient} opacity-20 blur-xl animate-pulse`} />
                {React.createElement(banners[currentBanner].icon, {
                  className: `w-14 h-14 text-white relative drop-shadow-2xl`
                })}
              </div>
            </div>
            
            {/* Premium overlay effects */}
            <div className="absolute inset-0 overflow-hidden rounded-3xl">
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent -translate-x-full group-active:translate-x-full transition-transform duration-1000" />
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-white/60 to-transparent" />
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-white/60 to-transparent" />
              <div className="absolute left-0 top-0 h-full w-0.5 bg-gradient-to-b from-transparent via-white/40 to-transparent" />
              <div className="absolute right-0 top-0 h-full w-0.5 bg-gradient-to-b from-transparent via-white/40 to-transparent" />
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation arrows */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            goToPrevious();
          }}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20
                     bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-md p-2 rounded-full
                     border border-white/20 text-white shadow-lg
                     active:scale-90 transition-all duration-200"
        >
          <ChevronLeft className="w-4 h-4 drop-shadow" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            goToNext();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20
                     bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-md p-2 rounded-full
                     border border-white/20 text-white shadow-lg
                     active:scale-90 transition-all duration-200"
        >
          <ChevronRight className="w-4 h-4 drop-shadow" />
        </button>

        {/* Dots indicator */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentBanner(index);
              }}
              className={`
                h-1.5 rounded-full transition-all duration-300 shadow-lg
                ${index === currentBanner 
                  ? 'w-6 bg-gradient-to-r from-[#00E880] to-[#00D074]' 
                  : 'w-1.5 bg-white/40 hover:bg-white/60'}
              `}
            />
          ))}
        </div>
      </div>

      {/* Desktop: Horizontal scrolling carousel */}
      <div className="hidden md:block relative">
        <div className="overflow-hidden rounded-2xl">
          <motion.div 
            ref={containerRef}
            className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${currentBanner * 100}%)` }}
          >
            {banners.map((banner, index) => (
              <div
                key={banner.id}
                onClick={banner.onClick}
                className="w-full flex-shrink-0 px-2"
              >
                <div className={`
                  relative cursor-pointer group
                  ${banner.shadowColor} shadow-2xl
                  rounded-3xl overflow-hidden
                  transform transition-all duration-500
                  hover:scale-[1.02] hover:shadow-3xl
                  h-[220px]
                  border-2 border-white/20
                  backdrop-blur-xl
                `}>
                  {/* Premium gradient background */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${banner.bgGradient}`} />
                  <div className={`absolute inset-0 bg-gradient-to-tr ${banner.gradient} opacity-30`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  
                  {/* Animated particles */}
                  <div className="absolute inset-0 overflow-hidden">
                    <div className={`absolute -top-8 -right-8 w-48 h-48 ${banner.particles} rounded-full blur-3xl animate-pulse`} />
                    <div className={`absolute -bottom-8 -left-8 w-64 h-64 ${banner.particles} rounded-full blur-3xl animate-pulse delay-300`} />
                  </div>
                  
                  {/* Content */}
                  <div className="relative z-10 p-8 h-full flex items-center justify-between">
                    {/* Left side - Text content */}
                    <div className="flex-1 max-w-2xl">
                      <p className="text-white text-sm font-black uppercase tracking-[0.2em] mb-4">
                        {banner.title}
                      </p>
                      <div className="mb-4 space-y-1">
                        <p className="text-white/80 text-xl">{banner.subtitle}</p>
                        <h2 className={`text-6xl font-black ${banner.accentColor} drop-shadow-2xl leading-none`}>
                          {banner.highlight}
                        </h2>
                        <p className="text-white text-2xl font-black uppercase tracking-wide">{banner.extra}</p>
                      </div>
                      <p className="text-white/70 text-base max-w-md">
                        {banner.description}
                      </p>
                    </div>

                    {/* Right side - Icon and CTA */}
                    <div className="flex items-center gap-8">
                      <div className="relative">
                        <div className={`absolute -inset-8 bg-gradient-to-r ${banner.gradient} opacity-30 blur-3xl animate-pulse`} />
                        <div className={`absolute -inset-4 ${banner.particles} blur-2xl animate-pulse`} />
                        {React.createElement(banner.icon, {
                          className: `w-28 h-28 text-white drop-shadow-2xl relative`
                        })}
                      </div>
                      <div className="relative group/btn">
                        <div className={`absolute -inset-1 ${banner.gradient} opacity-70 blur group-hover/btn:opacity-100 transition-opacity rounded-full`} />
                        <div className={`
                          relative flex items-center gap-3 px-8 py-4 rounded-full
                          ${banner.buttonBg}
                          text-white font-black shadow-2xl
                          transform transition-all duration-300
                          group-hover:scale-105
                          border border-white/20
                        `}>
                          <span className="text-sm uppercase tracking-wider">Aproveitar</span>
                          <ChevronRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Premium overlay effects */}
                  <div className="absolute inset-0 overflow-hidden rounded-3xl">
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                    <div className="absolute left-0 top-0 h-full w-0.5 bg-gradient-to-b from-transparent via-white/40 to-transparent" />
                    <div className="absolute right-0 top-0 h-full w-0.5 bg-gradient-to-b from-transparent via-white/40 to-transparent" />
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Navigation arrows */}
        <button
          onClick={goToPrevious}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20
                     bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-lg p-4 rounded-full
                     border border-white/20 text-white shadow-2xl
                     hover:scale-110 hover:border-white/30
                     transition-all duration-300"
        >
          <ChevronLeft className="w-6 h-6 drop-shadow" />
        </button>

        <button
          onClick={goToNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20
                     bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-lg p-4 rounded-full
                     border border-white/20 text-white shadow-2xl
                     hover:scale-110 hover:border-white/30
                     transition-all duration-300"
        >
          <ChevronRight className="w-6 h-6 drop-shadow" />
        </button>

        {/* Modern dots indicator */}
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-3">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentBanner(index)}
              className={`
                h-2 rounded-full transition-all duration-500 shadow-lg
                ${index === currentBanner 
                  ? 'w-12 bg-gradient-to-r from-[#00E880] to-[#00D074] shadow-[#00E880]/50' 
                  : 'w-2 bg-white/30 hover:bg-white/50'}
              `}
            />
          ))}
        </div>
      </div>
    </div>
  );
}