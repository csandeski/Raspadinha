import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';

interface ProScratchCardProps {
  value: React.ReactNode;
  index: number;
  onReveal: () => void;
  isDisabled?: boolean;
  onScratchStart?: () => void;
  revealed?: boolean;
  onScratchProgress?: (percentage: number) => void;
  allRevealed?: boolean;
}

export function ProScratchCard({ 
  value, 
  index, 
  onReveal, 
  isDisabled = false, 
  onScratchStart, 
  revealed = false,
  onScratchProgress,
  allRevealed = false
}: ProScratchCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRevealed, setIsRevealed] = useState(revealed);
  const [scratchPercentage, setScratchPercentage] = useState(0);
  const isDrawingRef = useRef(false);
  const totalPixelsRef = useRef(0);
  const scratchedPixelsRef = useRef<Set<string>>(new Set());
  const lastPositionRef = useRef<{ x: number; y: number } | null>(null);
  const hasStartedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCanvasReady, setIsCanvasReady] = useState(false);

  // Sync internal state with prop - reduce re-renders
  useEffect(() => {
    if (revealed !== isRevealed) {
      setIsRevealed(revealed);
      if (revealed && !hasStartedRef.current) {
        setScratchPercentage(100);
        setShowResult(true);
      }
    }
  }, [revealed, isRevealed]);

  // Reset hasStarted when disabled changes
  useEffect(() => {
    if (isDisabled) {
      hasStartedRef.current = false;
    }
  }, [isDisabled]);

  // Show result when all cards are revealed
  useEffect(() => {
    if (allRevealed && scratchPercentage >= 70) {
      setShowResult(true);
    }
  }, [allRevealed, scratchPercentage]);

  // Initialize audio with iOS/Android compatibility
  useEffect(() => {
    const scratchSound = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE');
    scratchSound.volume = 0.2;
    scratchSound.loop = true;
    
    // Pre-load the audio to help with iOS
    scratchSound.load();
    
    audioRef.current = scratchSound;
  }, []);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || isRevealed) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    // Calculate total pixels
    totalPixelsRef.current = canvas.width * canvas.height;
    scratchedPixelsRef.current.clear();
    
    // Create sophisticated metallic gradient background
    const gradient = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, 0,
      canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) / 2
    );
    gradient.addColorStop(0, '#C0C0C0'); // Bright silver center
    gradient.addColorStop(0.3, '#9B9B9B'); // Medium silver
    gradient.addColorStop(0.6, '#7D7D7D'); // Darker silver
    gradient.addColorStop(0.8, '#6B6B6B'); // Dark gray
    gradient.addColorStop(1, '#5A5A5A'); // Darkest edge
    
    // First fill with base color
    ctx.fillStyle = '#6B6B6B';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Apply metallic gradient
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add sophisticated diagonal light streaks
    ctx.globalCompositeOperation = 'source-over';
    const raysGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    raysGradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
    raysGradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.05)');
    raysGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
    raysGradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.05)');
    raysGradient.addColorStop(1, 'rgba(255, 255, 255, 0.15)');
    ctx.fillStyle = raysGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add subtle holographic effect
    const holoGradient = ctx.createLinearGradient(canvas.width, 0, 0, canvas.height);
    holoGradient.addColorStop(0, 'rgba(138, 43, 226, 0.05)'); // Subtle purple
    holoGradient.addColorStop(0.5, 'rgba(0, 232, 128, 0.05)'); // Subtle green
    holoGradient.addColorStop(1, 'rgba(255, 215, 0, 0.05)'); // Subtle gold
    ctx.fillStyle = holoGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Enhanced star/sparkle effects
    // Create sparkle function
    const drawSparkle = (x: number, y: number, size: number, opacity: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
      
      // Four-pointed star
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size * 0.3, -size * 0.3);
      ctx.lineTo(size, 0);
      ctx.lineTo(size * 0.3, size * 0.3);
      ctx.lineTo(0, size);
      ctx.lineTo(-size * 0.3, size * 0.3);
      ctx.lineTo(-size, 0);
      ctx.lineTo(-size * 0.3, -size * 0.3);
      ctx.closePath();
      ctx.fill();
      
      // Center glow
      const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
      glowGradient.addColorStop(0, `rgba(255, 255, 255, ${opacity * 0.8})`);
      glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = glowGradient;
      ctx.fillRect(-size, -size, size * 2, size * 2);
      
      ctx.restore();
    };
    
    // Corner sparkles (larger, more prominent)
    drawSparkle(15, 15, 8, 0.6);
    drawSparkle(canvas.width - 15, 15, 8, 0.6);
    drawSparkle(15, canvas.height - 15, 8, 0.6);
    drawSparkle(canvas.width - 15, canvas.height - 15, 8, 0.6);
    
    // Scattered smaller sparkles
    drawSparkle(canvas.width * 0.25, 20, 5, 0.4);
    drawSparkle(canvas.width * 0.75, canvas.height - 20, 5, 0.4);
    drawSparkle(25, canvas.height * 0.5, 5, 0.4);
    drawSparkle(canvas.width - 25, canvas.height * 0.5, 5, 0.4);
    drawSparkle(canvas.width * 0.5, 25, 4, 0.3);
    drawSparkle(canvas.width * 0.5, canvas.height - 25, 4, 0.3);
    
    // Add "RASPE AQUI!" text with sophisticated styling
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Create subtle text outline glow
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // Draw multiple shadow layers for depth
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('RASPE', canvas.width / 2 + 2, canvas.height / 2 - 10 + 2);
    ctx.fillText('AQUI!', canvas.width / 2 + 2, canvas.height / 2 + 10 + 2);
    
    // Main text with gradient
    const textGradient = ctx.createLinearGradient(
      canvas.width / 2 - 30, 0,
      canvas.width / 2 + 30, 0
    );
    textGradient.addColorStop(0, '#FFFFFF');
    textGradient.addColorStop(0.5, '#F0F0F0');
    textGradient.addColorStop(1, '#FFFFFF');
    
    ctx.fillStyle = textGradient;
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('RASPE', canvas.width / 2, canvas.height / 2 - 10);
    ctx.fillText('AQUI!', canvas.width / 2, canvas.height / 2 + 10);
    
    // Remove shadow for other elements
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    
    // Add subtle border decoration
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    
    // Mark canvas as ready
    setIsCanvasReady(true);
  }, [isRevealed]);

  useEffect(() => {
    initCanvas();
    
    // Handle resize
    const handleResize = () => {
      initCanvas();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [initCanvas]);

  const scratch = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas || isRevealed || allRevealed) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set composite operation for erasing
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 50; // Larger brush size for easier scratching
    
    // Draw smooth line from last position
    if (lastPositionRef.current) {
      ctx.beginPath();
      ctx.moveTo(lastPositionRef.current.x, lastPositionRef.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else {
      // First touch - draw larger circle
      ctx.beginPath();
      ctx.arc(x, y, 25, 0, Math.PI * 2);
      ctx.fill();
    }
    
    lastPositionRef.current = { x, y };
    
    // Update scratched pixels tracking
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    let transparentPixels = 0;
    
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] < 128) { // Alpha channel
        transparentPixels++;
      }
    }
    
    const percentage = (transparentPixels / totalPixelsRef.current) * 100;
    setScratchPercentage(percentage);
    
    // Call progress callback
    if (onScratchProgress) {
      onScratchProgress(percentage);
    }
    
    // Don't auto-reveal anymore - only reveal on release
  }, [isRevealed, onReveal, onScratchProgress, allRevealed]);

  const handleStart = useCallback((clientX: number, clientY: number, isClick = false) => {
    if (isDisabled || isRevealed || allRevealed) return;
    
    // On PC, check if it's a click (not drag) to reveal with smooth animation
    if (isClick && !('ontouchstart' in window)) {
      // Only mark as started and reveal if it's a true click
      if (!hasStartedRef.current && onScratchStart) {
        hasStartedRef.current = true;
        onScratchStart();
      }
      
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Create smooth fade out animation
          let opacity = 1;
          const fadeInterval = setInterval(() => {
            opacity -= 0.08; // Decrease opacity gradually
            
            if (opacity <= 0) {
              clearInterval(fadeInterval);
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              setIsRevealed(true);
              setShowResult(true);
              setScratchPercentage(100);
              onReveal();
            } else {
              // Apply fade effect by gradually clearing the canvas
              ctx.globalCompositeOperation = 'destination-out';
              ctx.fillStyle = `rgba(0, 0, 0, 0.08)`;
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.globalCompositeOperation = 'source-over';
            }
          }, 16); // ~60fps for smooth animation
        }
      }
      return;
    }
    
    // Only start drawing if not a click
    if (!isClick) {
      // Mark as started only when actually scratching
      if (!hasStartedRef.current && onScratchStart) {
        hasStartedRef.current = true;
        onScratchStart();
      }
      
      isDrawingRef.current = true;
      
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      
      scratch(x, y);
    }
    
    // Initialize and play scratch sound with iOS/Android compatibility
    if (audioRef.current && !isClick) {
      // For iOS/Safari, we need to create a new audio context on user interaction
      const playAudio = async () => {
        try {
          // Reset audio time
          audioRef.current.currentTime = 0;
          
          // Create a promise to handle the play
          const playPromise = audioRef.current.play();
          
          if (playPromise !== undefined) {
            await playPromise;
          }
        } catch (error) {
          // If autoplay fails, try to play with user gesture
          console.log('Audio play failed, will retry on user gesture');
          
          // Try to unlock audio on iOS by playing a silent sound
          const unlockAudio = () => {
            audioRef.current.play().then(() => {
              audioRef.current.pause();
              audioRef.current.currentTime = 0;
              audioRef.current.play();
            }).catch(() => {});
          };
          
          // Try immediate unlock
          unlockAudio();
        }
      };
      
      playAudio();
    }
    
    // Enhanced vibration for mobile devices
    if ('vibrate' in navigator && navigator.vibrate) {
      // Try different vibration patterns for better compatibility
      try {
        // Short vibration for scratch feedback
        navigator.vibrate(20);
        
        // For continuous scratching, create a vibration pattern
        if (isDrawingRef.current) {
          navigator.vibrate([20, 50, 20]);
        }
      } catch (error) {
        console.log('Vibration not supported');
      }
    }
  }, [isDisabled, isRevealed, onScratchStart, scratch, allRevealed, onReveal]);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDrawingRef.current || isRevealed || allRevealed) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    scratch(x, y);
  }, [isRevealed, scratch, allRevealed]);

  const handleEnd = useCallback(() => {
    isDrawingRef.current = false;
    lastPositionRef.current = null;
    
    // Stop scratch sound
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    // Only reveal if we actually scratched a significant amount (more than 15%)
    if (hasStartedRef.current && !isRevealed && scratchPercentage > 15) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Create smooth fade out animation
          let opacity = 1;
          const fadeInterval = setInterval(() => {
            opacity -= 0.08; // Decrease opacity gradually
            
            if (opacity <= 0) {
              clearInterval(fadeInterval);
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              setIsRevealed(true);
              setShowResult(true);
              setScratchPercentage(100);
              onReveal();
            } else {
              // Apply fade effect by gradually clearing the canvas
              ctx.globalCompositeOperation = 'destination-out';
              ctx.fillStyle = `rgba(0, 0, 0, 0.08)`;
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.globalCompositeOperation = 'source-over';
            }
          }, 16); // ~60fps for smooth animation
        }
      }
    }
  }, [isRevealed, onReveal, scratchPercentage]);

  // Track if mouse moved for click detection
  const mouseMovedRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  // Mouse events - Add document level listeners for better tracking
  const handleMouseDown = (e: React.MouseEvent) => {
    mouseMovedRef.current = false;
    startPosRef.current = { x: e.clientX, y: e.clientY };
    
    handleStart(e.clientX, e.clientY);
    
    // Add document listeners to continue scratching outside the card
    const handleDocumentMouseMove = (e: MouseEvent) => {
      // Check if mouse moved more than 5 pixels
      if (startPosRef.current && (
        Math.abs(e.clientX - startPosRef.current.x) > 5 ||
        Math.abs(e.clientY - startPosRef.current.y) > 5
      )) {
        mouseMovedRef.current = true;
      }
      handleMove(e.clientX, e.clientY);
    };
    
    const handleDocumentMouseUp = (e: MouseEvent) => {
      // If mouse didn't move much, treat as click
      if (!mouseMovedRef.current && startPosRef.current) {
        handleStart(e.clientX, e.clientY, true);
      }
      handleEnd();
      document.removeEventListener('mousemove', handleDocumentMouseMove);
      document.removeEventListener('mouseup', handleDocumentMouseUp);
    };
    
    document.addEventListener('mousemove', handleDocumentMouseMove);
    document.addEventListener('mouseup', handleDocumentMouseUp);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDrawingRef.current) {
      handleMove(e.clientX, e.clientY);
    }
  };

  const handleMouseUp = () => {
    handleEnd();
  };

  // Touch events - Improved for mobile
  const touchStartTimeRef = useRef<number>(0);
  const touchMovedRef = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    touchStartTimeRef.current = Date.now();
    touchMovedRef.current = false;
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    touchMovedRef.current = true;
    if (!isDrawingRef.current) return;
    
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    
    // Check if it was a quick tap (less than 200ms and no movement)
    const touchDuration = Date.now() - touchStartTimeRef.current;
    if (touchDuration < 200 && !touchMovedRef.current) {
      // It was a tap, not a scratch - don't reveal
      isDrawingRef.current = false;
      lastPositionRef.current = null;
      if (audioRef.current) {
        audioRef.current.pause();
      }
      // Reset hasStartedRef if no actual scratching happened
      if (scratchPercentage < 5) {
        hasStartedRef.current = false;
      }
      return;
    }
    
    handleEnd();
  };

  return (
    <motion.div 
      ref={containerRef}
      className={`w-full h-full relative rounded-md overflow-hidden bg-gray-600 ${isDisabled || allRevealed ? 'pointer-events-none' : ''}`}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: index * 0.05 }}
    >
      {/* Prize content - Always underneath the canvas */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-md z-0">
        {typeof value === 'string' ? (
          <span className="text-2xl font-bold text-[#00E880]">
            {value}
          </span>
        ) : (
          <div className="w-full h-full">
            {value}
          </div>
        )}
      </div>
      
      {/* Scratch surface */}
      <canvas 
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full cursor-pointer rounded-md z-10 ${isRevealed || isDisabled ? 'pointer-events-none' : ''} touch-none`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ 
          opacity: isRevealed ? 0 : 1,
          transition: 'opacity 0.5s ease-out',
          touchAction: 'none'
        }}
      />
      

    </motion.div>
  );
}