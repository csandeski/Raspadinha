import { motion, AnimatePresence } from "framer-motion";
import { Gift, ChevronRight, Users, DollarSign } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

interface ReferralConfig {
  paymentType: string;
  paymentAmount: string;
  isActive: boolean;
}

export function FloatingReferralButton() {
  const [, setLocation] = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [location] = useLocation();
  const { user } = useAuth();
  
  // Fetch referral configuration
  const { data: config } = useQuery<ReferralConfig>({
    queryKey: ['/api/referral-config'],
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
  
  // Don't show on referral page itself, admin pages, affiliate pages, or support pages
  const shouldHide = location === '/referral' || 
                     location.startsWith('/admin') || 
                     location.startsWith('/afiliados') ||
                     location.startsWith('/afiliados') ||
                     location.startsWith('/support-agent') ||
                     location.startsWith('/macaco123') ||
                     location.startsWith('/test-payment');
  
  useEffect(() => {
    // Show button after a small delay for smooth entrance
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Close expanded view when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (isExpanded && !target.closest('.referral-menu')) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isExpanded]);
  
  // Only show if user is logged in, config is active, and not on hidden pages
  if (!user || shouldHide || !config?.isActive) return null;
  
  return (
    <motion.div
      initial={{ x: -100, opacity: 0 }}
      animate={{ 
        x: isVisible ? 0 : -100, 
        opacity: isVisible ? 1 : 0 
      }}
      transition={{ 
        type: "spring", 
        stiffness: 260, 
        damping: 20 
      }}
      className="fixed left-0 bottom-24 md:left-4 md:bottom-8 z-40 referral-menu"
    >
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          // Collapsed button
          <motion.button
            key="collapsed"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsExpanded(true)}
            className="bg-gradient-to-r from-[#00e880] to-[#00c66d] rounded-r-full md:rounded-lg pl-1.5 pr-2 py-2.5 md:px-5 md:py-3.5 shadow-lg hover:shadow-xl text-[#000000] md:border-2 md:border-black/10 flex items-center gap-2"
          >
            <Gift className="w-5 h-5 md:w-5 md:h-5" />
            <span className="hidden md:inline font-bold text-sm">
              Ganhe R$ {config?.paymentAmount || 12} Agora
            </span>
          </motion.button>
        ) : (
          // Expanded menu
          <motion.div
            key="expanded"
            initial={{ scale: 0.5, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.5, opacity: 0, y: 20 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative bg-gradient-to-br from-gray-900 to-black border-r border-y border-green-500/20 rounded-r-2xl p-3 md:p-4 shadow-2xl w-56 md:w-80 lg:w-96"
          >
            <div className="absolute top-2 right-2">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setTimeout(() => setIsExpanded(false), 50)}
                className="text-gray-400 hover:text-white transition-colors p-1"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
              </motion.button>
            </div>

            <div className="space-y-2 md:space-y-3 mb-2 md:mb-3 pt-2 md:pt-3">
              <div className="bg-gray-800/50 rounded-lg p-2 md:p-3 border border-gray-700/50">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 md:w-5 md:h-5 text-[#00e880]" />
                  <span className="text-xs md:text-sm text-gray-400">Ganhe por indicação</span>
                </div>
                <p className="text-white font-bold text-lg md:text-xl">R$ {config?.paymentAmount || '12.00'}</p>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-2 md:p-3 border border-gray-700/50">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 md:w-5 md:h-5 text-[#00e880]" />
                  <span className="text-xs md:text-sm text-gray-400">Seus amigos ganham</span>
                </div>
                <p className="text-white font-bold text-sm md:text-base">Até 250 Raspadinhas</p>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setTimeout(() => setIsExpanded(false), 50);
                setTimeout(() => setLocation('/referral'), 100);
              }}
              className="w-full bg-gradient-to-r from-[#00e880] to-[#00c66d] text-black font-bold py-2.5 md:py-3 rounded-lg flex items-center justify-center gap-2 hover:shadow-lg transition-all duration-300 text-sm md:text-base"
            >
              <DollarSign className="w-4 h-4 md:w-5 md:h-5" />
              Ganhar Agora
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}