import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { useLocation } from "wouter";

export default function FloatingSupport() {
  const [showIcon, setShowIcon] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Initial delay of 30 seconds before first appearance
    const initialTimer = setTimeout(() => {
      setShowIcon(true);
      
      // Hide after 4 seconds
      setTimeout(() => {
        setShowIcon(false);
      }, 4000);
    }, 30000);

    // Then repeat every 30 seconds
    const interval = setInterval(() => {
      setShowIcon(true);
      
      // Hide after 4 seconds
      setTimeout(() => {
        setShowIcon(false);
      }, 4000);
    }, 30000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  const handleClick = () => {
    setShowIcon(false);
    setLocation("/support");
  };

  return (
    <AnimatePresence>
      {showIcon && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ duration: 0.3 }}
          onClick={handleClick}
          className="fixed left-4 bottom-20 z-40 bg-gradient-to-r from-[#00E880] to-[#00D470] px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-shadow flex items-center gap-2"
        >
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <MessageCircle className="w-6 h-6 text-black" />
          </motion.div>
          
          <span className="text-black font-semibold text-sm pr-1">
            Precisa de ajuda?
          </span>
          
          {/* Pulse ring effect */}
          <motion.div
            className="absolute inset-0 rounded-full bg-[#00E880]"
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{
              scale: [1, 1.5, 1.8],
              opacity: [0.5, 0.3, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeOut"
            }}
          />
        </motion.button>
      )}
    </AnimatePresence>
  );
}