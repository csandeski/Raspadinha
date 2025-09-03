import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { OptimizedImage, usePreloadImages } from './optimized-image';

interface HomeBannersProps {}

export const HomeBanners: React.FC<HomeBannersProps> = () => {
  const [currentBanner, setCurrentBanner] = useState(0);
  const [, setLocation] = useLocation();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { user } = useAuth();
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  
  // Banner configuration with images
  const allBanners = [
    {
      id: 1,
      image: "/banners/banner1.webp",
      alt: "Cadastre-se e Ganhe Bônus",
      onClick: () => setLocation('/register?coupon=Bonus'),
    },
    {
      id: 2,
      image: "/banners/banner2.webp",
      alt: "Deposite e Ganhe Bônus",
      onClick: () => user ? setLocation('/rewards') : setLocation('/register?coupon=Bonus'),
    },
    {
      id: 3,
      image: "/banners/banner3.webp",
      alt: "Raspe e Ganhe na Hora - Prêmios de até R$ 500.000,00",
      onClick: () => user ? setLocation('/referral') : setLocation('/register?coupon=Bonus'),
    },
    {
      id: 4,
      image: "/banners/banner4.webp",
      alt: "Deposite com PIX - Rápido e Seguro",
      onClick: () => user ? setLocation('/deposit') : setLocation('/register?coupon=Bonus'),
    }
  ];

  // Se o usuário estiver logado, remove o banner de cadastro (banner1)
  const banners = user ? allBanners.filter(banner => banner.id !== 1) : allBanners;

  // Preload all banner images using optimized hook
  const bannerImages = banners.map(b => b.image);
  const allImagesLoaded = usePreloadImages(bannerImages);
  
  useEffect(() => {
    setImagesLoaded(allImagesLoaded);
  }, [allImagesLoaded]);

  // Function to reset the timer
  const resetInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(() => {
      setDirection('right');
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 8000); // 8 seconds rotation
  };

  useEffect(() => {
    if (imagesLoaded) {
      resetInterval();
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [banners.length, imagesLoaded]);

  const handleManualChange = (index: number) => {
    // Determine direction based on index change
    if (index > currentBanner || (index === 0 && currentBanner === banners.length - 1)) {
      setDirection('right');
    } else {
      setDirection('left');
    }
    setCurrentBanner(index);
    resetInterval(); // Reset timer on manual change
  };

  const handleDragEnd = (event: any, info: any) => {
    const swipeThreshold = 50;
    if (info.offset.x > swipeThreshold) {
      // Swiped right - go to previous
      setDirection('left');
      const newIndex = (currentBanner - 1 + banners.length) % banners.length;
      setCurrentBanner(newIndex);
      resetInterval();
    } else if (info.offset.x < -swipeThreshold) {
      // Swiped left - go to next
      setDirection('right');
      const newIndex = (currentBanner + 1) % banners.length;
      setCurrentBanner(newIndex);
      resetInterval();
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 pt-4 md:pt-6 mb-8">
      {/* Mobile */}
      <div className="md:hidden">
        {/* Fixed height container to prevent layout shift */}
        <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: '1280 / 492' }}>
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={currentBanner}
              custom={direction}
              initial={{ x: direction === 'right' ? 300 : -300, opacity: 1 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: direction === 'right' ? -300 : 300, opacity: 1 }}
              transition={{ 
                duration: 0.3,
                ease: [0.25, 0.1, 0.25, 1.0],
                opacity: { duration: 0.15 }
              }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              className="absolute inset-0 cursor-pointer"
              onClick={() => banners[currentBanner].onClick()}
            >
              <OptimizedImage 
                src={banners[currentBanner].image}
                alt={banners[currentBanner].alt}
                className="w-full h-full object-contain"
                priority={true}
                loading="eager"
              />
              {/* Subtle overlay gradient for better image presentation */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2 mt-4">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => handleManualChange(index)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === currentBanner 
                  ? 'w-8 bg-[#00E880]' 
                  : 'w-1.5 bg-white/30 hover:bg-white/50'
              }`}
              aria-label={`Banner ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden md:block relative">
        {/* Fixed height container to prevent layout shift */}
        <div className="relative overflow-hidden rounded-3xl" style={{ aspectRatio: '1280 / 492' }}>
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={currentBanner}
              custom={direction}
              initial={{ x: direction === 'right' ? 400 : -400, opacity: 1 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: direction === 'right' ? -400 : 400, opacity: 1 }}
              transition={{ 
                duration: 0.3,
                ease: [0.25, 0.1, 0.25, 1.0],
                opacity: { duration: 0.15 }
              }}
              className="absolute inset-0 cursor-pointer group"
              onClick={() => banners[currentBanner].onClick()}
            >
              <OptimizedImage 
                src={banners[currentBanner].image}
                alt={banners[currentBanner].alt}
                className="w-full h-full object-contain rounded-3xl"
                priority={true}
                loading="eager"
              />
              {/* Subtle overlay gradient for better image presentation */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl" />
            </motion.div>
          </AnimatePresence>

          {/* Navigation Buttons */}
          <button
            onClick={() => {
              setDirection('left');
              const newIndex = (currentBanner - 1 + banners.length) % banners.length;
              setCurrentBanner(newIndex);
              resetInterval();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors z-20"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          
          <button
            onClick={() => {
              setDirection('right');
              const newIndex = (currentBanner + 1) % banners.length;
              setCurrentBanner(newIndex);
              resetInterval();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors z-20"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-3 mt-6">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => handleManualChange(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentBanner 
                  ? 'w-12 bg-[#00E880]' 
                  : 'w-2 bg-white/30 hover:bg-white/50'
              }`}
              aria-label={`Banner ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};