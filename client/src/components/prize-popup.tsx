import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import confetti from "canvas-confetti";

interface PrizePopupProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  prize?: string;
  prizeType?: "money" | "product" | "freeplay";
  icon?: string;
  color?: string;
  autoClose?: boolean;
  duration?: number;
}

export function PrizePopup({
  isOpen,
  onClose,
  title,
  description,
  prize,
  prizeType = "money",
  icon = "🎉",
  color = "#00E880",
  autoClose = true,
  duration = 3000
}: PrizePopupProps) {
  const [timeLeft, setTimeLeft] = useState(duration / 1000);

  useEffect(() => {
    if (!isOpen) return;

    // Trigger confetti when popup opens
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    // Auto close timer
    if (autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      // Countdown timer
      const countdownInterval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearTimeout(timer);
        clearInterval(countdownInterval);
      };
    }
  }, [isOpen, autoClose, duration, onClose]);

  useEffect(() => {
    if (isOpen) {
      setTimeLeft(duration / 1000);
    }
  }, [isOpen, duration]);

  if (!isOpen) return null;

  const getGradientByType = () => {
    switch (prizeType) {
      case "money":
        return "from-green-500 via-green-400 to-emerald-500";
      case "product":
        return "from-purple-500 via-pink-400 to-rose-500";
      case "freeplay":
        return "from-blue-500 via-cyan-400 to-teal-500";
      default:
        return "from-green-500 via-green-400 to-emerald-500";
    }
  };

  const getBorderColor = () => {
    switch (prizeType) {
      case "money":
        return "border-green-400/50";
      case "product":
        return "border-purple-400/50";
      case "freeplay":
        return "border-blue-400/50";
      default:
        return "border-green-400/50";
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 30 }}
          transition={{
            type: "spring",
            damping: 25,
            stiffness: 500,
          }}
          className={`relative max-w-sm w-full bg-gradient-to-br ${getGradientByType()} rounded-3xl p-8 shadow-2xl border-2 ${getBorderColor()}`}
          onClick={(e) => e.stopPropagation()}
          style={{
            boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 30px ${color}40`,
          }}
        >
          {/* Animated background sparkles */}
          <div className="absolute inset-0 overflow-hidden rounded-3xl">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-white rounded-full opacity-70"
                initial={{ 
                  x: Math.random() * 100 + "%", 
                  y: Math.random() * 100 + "%",
                  scale: 0 
                }}
                animate={{ 
                  scale: [0, 1, 0],
                  opacity: [0.7, 1, 0.7],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.3,
                }}
              />
            ))}
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Auto-close countdown */}
          {autoClose && (
            <div className="absolute top-4 left-4 flex items-center text-white/80 text-sm">
              <div className="w-6 h-6 rounded-full border-2 border-white/40 flex items-center justify-center">
                <span className="text-xs font-bold">{timeLeft}</span>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="relative z-10 text-center text-white">
            {/* Main icon with animation */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring", damping: 15 }}
              className="text-6xl mb-4 relative"
            >
              <span className="drop-shadow-lg">{icon}</span>
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-8 h-8 text-yellow-300 opacity-60" />
              </motion.div>
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-black mb-3 drop-shadow-lg"
            >
              {title}
            </motion.h2>

            {/* Prize value */}
            {prize && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, type: "spring" }}
                className="mb-3"
              >
                <div className="text-4xl font-black text-yellow-200 drop-shadow-lg mb-1">
                  {prize}
                </div>
                {prizeType === "money" && (
                  <div className="text-sm text-white/90 font-semibold">
                    Adicionado ao seu saldo!
                  </div>
                )}
              </motion.div>
            )}

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-lg font-semibold text-white/95 drop-shadow-sm leading-tight"
            >
              {description}
            </motion.p>

            {/* Shine effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ delay: 0.6, duration: 1.5, ease: "easeInOut" }}
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}