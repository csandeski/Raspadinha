import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface ScratchCardProps {
  value: React.ReactNode;
  index: number;
  onReveal: () => void;
  isDisabled?: boolean;
  onScratchStart?: () => void;
  revealed?: boolean;
}

export function ScratchCard({ value, index, onReveal, isDisabled = false, onScratchStart, revealed = false }: ScratchCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRevealed, setIsRevealed] = useState(revealed);
  const scratchingRef = useRef(false);
  const animationFrameRef = useRef<number>();
  
  // Sync internal state with prop
  useEffect(() => {
    setIsRevealed(revealed);
  }, [revealed]);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || isRevealed) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    // Draw scratch surface
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#4B5563');
    gradient.addColorStop(0.5, '#6B7280');
    gradient.addColorStop(1, '#4B5563');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add "RASPE" text with shadow
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#E5E7EB';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.fillText('RASPE', canvas.width / 2, canvas.height / 2);
    
    // Add sparkle effect
    const sparkleCount = 5;
    for (let i = 0; i < sparkleCount; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = Math.random() * 3 + 1;
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fill();
    }
    
  }, [isRevealed]);
  
  const handleClick = () => {
    if (isDisabled || isRevealed) return;
    
    if (onScratchStart) {
      onScratchStart();
    }
    
    // Simple fade out animation
    setIsRevealed(true);
    
    // Play sound
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE');
    audio.volume = 0.2;
    audio.play().catch(() => {});
    
    // Vibrate
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    
    // Notify parent immediately
    onReveal();
  };
  
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);
  
  return (
    <motion.div 
      ref={containerRef}
      className={`w-full h-full relative cursor-pointer ${isDisabled ? 'pointer-events-none' : ''}`}
      onClick={handleClick}
      whileTap={!isDisabled ? { scale: 0.95 } : {}}
    >
      {/* Hidden content */}
      <motion.div 
        className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: isRevealed ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      >
        {typeof value === 'string' ? (
          <motion.span 
            className="text-2xl font-bold text-[#00E880]"
            initial={{ scale: 0 }}
            animate={{ scale: isRevealed ? 1 : 0 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
          >
            {value}
          </motion.span>
        ) : (
          value
        )}
      </motion.div>
      
      {/* Scratch surface */}
      <motion.div
        className="absolute inset-0 rounded-xl overflow-hidden"
        initial={{ opacity: 1 }}
        animate={{ opacity: isRevealed ? 0 : 1 }}
        transition={{ duration: 0.3 }}
      >
        <canvas 
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ touchAction: 'none' }}
        />
      </motion.div>
      
      {/* Sparkle effect on reveal */}
      {isRevealed && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.8 }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <motion.div
              className="w-32 h-32 bg-gradient-to-r from-yellow-400 to-yellow-600 opacity-30 blur-xl"
              animate={{ scale: [0, 2, 0], rotate: [0, 180] }}
              transition={{ duration: 0.8 }}
            />
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}