import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { Trophy, Gift, DollarSign, Sparkles, Target, Star, UserPlus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";

const loggedOutMessages = [
  { 
    text: "BÔNUS DE ATÉ 250 RASPADINHAS!", 
    textMobile: "BÔNUS DE ATÉ 250 RASPADINHAS!",
    subtext: "No seu primeiro depósito",
    icon: DollarSign,
    highlight: true,
    color: "from-yellow-400 to-orange-500"
  },
  { 
    text: "ACHOU 3 IGUAIS? LEVA O PRÊMIO NA HORA!", 
    textMobile: "ACHOU 3 IGUAIS? GANHOU!",
    subtext: "Pagamento instantâneo",
    icon: Trophy,
    highlight: false,
    color: "from-purple-400 to-pink-500"
  },
  { 
    text: "🎁 CADASTRE AGORA E GANHE ATÉ 200 MIL! 🎁", 
    textMobile: "🎁 CADASTRE E GANHE ATÉ 200 MIL!",
    subtext: "Bônus exclusivo + Raspadinhas grátis!",
    icon: UserPlus,
    highlight: true,
    color: "from-[#00E880] to-[#00D470]",
    isClickable: true,
    action: "/register?coupon=sorte"
  }
];

const loggedInMessages = [
  { 
    text: "ACHOU 3 IGUAIS, GANHOU!", 
    textMobile: "ACHOU 3 IGUAIS, GANHOU!",
    subtext: "Prêmio na hora",
    icon: Target,
    highlight: true,
    color: "from-[#00E880] to-[#00D470]"
  },
  { 
    text: "TODO DIA RODADA GRÁTIS", 
    textMobile: "TODO DIA RODADA GRÁTIS",
    subtext: "Volte diariamente",
    icon: Gift,
    highlight: false,
    color: "from-purple-400 to-pink-500"
  },
  { 
    text: "COM 1 REAL GANHE ATÉ 100 MIL", 
    textMobile: "COM R$1 GANHE ATÉ 100 MIL",
    subtext: "Aposte e ganhe",
    icon: Sparkles,
    highlight: true,
    color: "from-yellow-400 to-orange-500"
  }
];

export default function RotatingBanner() {
  const { isAuthenticated } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [, setLocation] = useLocation();
  
  const messages = loggedOutMessages;
  
  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * velocity;
  };
  
  // Function to handle manual navigation
  const paginate = (newDirection: number) => {
    const newIndex = (currentIndex + newDirection + messages.length) % messages.length;
    setCurrentIndex(newIndex);
    
    // Reset the automatic timer when manually navigating
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    startAutoRotation();
  };
  
  // Function to start auto rotation
  const startAutoRotation = () => {
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % messages.length);
    }, 8000); // Changed to 8 seconds for slower rotation
  };

  // Reset index when authentication status changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [isAuthenticated]);

  // Auto rotation effect
  useEffect(() => {
    if (!isAuthenticated) {
      startAutoRotation();
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [messages.length, isAuthenticated]);

  // Only show banner when user is logged out
  if (isAuthenticated) {
    return null;
  }

  const currentMessage = messages[currentIndex];

  return (
    <div className="relative h-12 sm:h-14 md:h-16 min-h-[48px] sm:min-h-[56px] md:min-h-[64px] overflow-hidden"> {/* Fixed height with overflow control */}
      {/* Background layers */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#051810] via-[#072115] via-[#00E880]/10 to-[#051810]" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#00E880]/10 to-transparent" />
      
      {/* Pattern overlay */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2300E880' fill-opacity='0.2'%3E%3Cpolygon points='10 0 20 10 10 20 0 10'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '20px 20px'
        }}
      />
      
      {/* Swipeable content container */}
      <div className="relative h-full overflow-x-hidden">
        <AnimatePresence mode="wait" initial={false} custom={currentIndex}>
          <motion.div
            key={currentIndex}
            custom={currentIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              opacity: { duration: 0.3, ease: "easeInOut" }
            }}
            drag={false}
            className={`absolute inset-0 flex items-center justify-center px-2 sm:px-4 md:px-6 ${currentMessage.isClickable ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'}`}
            onClick={() => {
              if (currentMessage.isClickable && currentMessage.action) {
                setLocation(currentMessage.action);
              }
            }}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Icon container */}
              <motion.div 
                className={`relative p-1.5 sm:p-2 rounded-full shadow-lg ${
                  currentMessage.isClickable 
                    ? 'bg-gradient-to-br from-yellow-400 to-orange-500 animate-pulse' 
                    : 'bg-gradient-to-br from-[#00E880] to-[#00D470]'
                }`}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                {(() => {
                  const Icon = currentMessage.icon;
                  return <Icon className="relative w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" />;
                })()}
              </motion.div>

              {/* Text content */}
              <div className="flex items-center gap-2 overflow-hidden">
                <span className={`font-bold text-[11px] sm:text-sm md:text-base tracking-wide uppercase drop-shadow-lg truncate ${
                  currentMessage.isClickable 
                    ? 'text-white drop-shadow-2xl animate-pulse' 
                    : 'text-white'
                }`}>
                  <span className="block sm:hidden">{currentMessage.textMobile || currentMessage.text}</span>
                  <span className="hidden sm:block">{currentMessage.text}</span>
                </span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      
      

      {/* Bottom gradient border */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00E880] to-transparent opacity-40" />
    </div>
  );
}