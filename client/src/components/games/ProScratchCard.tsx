import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';

export type ScratchCardTheme = 'pix' | 'mimei' | 'eletronicos' | 'superpremios';

interface ProScratchCardProps {
  value: React.ReactNode;
  index: number;
  onReveal: () => void;
  isDisabled?: boolean;
  onScratchStart?: () => void;
  revealed?: boolean;
  onScratchProgress?: (percentage: number) => void;
  allRevealed?: boolean;
  theme?: ScratchCardTheme;
}

export function ProScratchCard({ 
  value, 
  index, 
  onReveal, 
  isDisabled = false, 
  onScratchStart, 
  revealed = false,
  onScratchProgress,
  allRevealed = false,
  theme = 'pix'
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
  const [isHovered, setIsHovered] = useState(false);

  // Theme-based color configurations
  const getThemeConfig = (theme: ScratchCardTheme) => {
    switch (theme) {
      case 'pix':
        return {
          gradient: ['#0080FF', '#00B4FF', '#00E0FF', '#00C8FF', '#0090FF'],
          accent: '#00E0FF',
          pattern: 'money',
          patternColor: 'rgba(0, 224, 255, 0.1)',
          shimmerColor: 'rgba(0, 224, 255, 0.3)',
          iconColor: '#FFFFFF'
        };
      case 'mimei':
        return {
          gradient: ['#FF1493', '#FF69B4', '#FFB6C1', '#FF85B3', '#FF1493'],
          accent: '#FF69B4',
          pattern: 'hearts',
          patternColor: 'rgba(255, 105, 180, 0.1)',
          shimmerColor: 'rgba(255, 105, 180, 0.3)',
          iconColor: '#FFFFFF'
        };
      case 'eletronicos':
        return {
          gradient: ['#FF6B00', '#FF9500', '#FFAA00', '#FF8C00', '#FF7A00'],
          accent: '#FFA500',
          pattern: 'circuit',
          patternColor: 'rgba(255, 165, 0, 0.1)',
          shimmerColor: 'rgba(255, 165, 0, 0.3)',
          iconColor: '#FFFFFF'
        };
      case 'superpremios':
        return {
          gradient: ['#00C851', '#FFD700', '#00E676', '#FFEA00', '#00D84F'],
          accent: '#FFD700',
          pattern: 'stars',
          patternColor: 'rgba(255, 215, 0, 0.1)',
          shimmerColor: 'rgba(255, 215, 0, 0.3)',
          iconColor: '#FFFFFF'
        };
    }
  };

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
    
    const themeConfig = getThemeConfig(theme);
    
    // Create sophisticated metallic gradient background
    const gradient = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, 0,
      canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) / 2
    );
    
    // Metallic silver base with theme color tint
    gradient.addColorStop(0, '#E8E8E8');
    gradient.addColorStop(0.2, '#D0D0D0');
    gradient.addColorStop(0.4, '#B8B8B8');
    gradient.addColorStop(0.6, '#A0A0A0');
    gradient.addColorStop(0.8, '#888888');
    gradient.addColorStop(1, '#707070');
    
    // Fill with metallic gradient
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add theme color overlay
    const themeGradient = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, 0,
      canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) / 2
    );
    themeConfig.gradient.forEach((color, i) => {
      themeGradient.addColorStop(i / (themeConfig.gradient.length - 1), color + '15');
    });
    ctx.fillStyle = themeGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add sophisticated pattern based on theme
    ctx.save();
    ctx.globalAlpha = 0.2;
    
    if (themeConfig.pattern === 'money') {
      // Money/coin pattern for PIX
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const x = (canvas.width / 3) * j + canvas.width / 6;
          const y = (canvas.height / 3) * i + canvas.height / 6;
          
          ctx.strokeStyle = themeConfig.patternColor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, 12, 0, Math.PI * 2);
          ctx.stroke();
          
          // Dollar sign
          ctx.fillStyle = themeConfig.patternColor;
          ctx.font = 'bold 14px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('$', x, y);
        }
      }
    } else if (themeConfig.pattern === 'hearts') {
      // Hearts pattern for Me Mimei
      const drawHeart = (x: number, y: number, size: number) => {
        ctx.fillStyle = themeConfig.patternColor;
        ctx.beginPath();
        ctx.moveTo(x, y + size / 4);
        ctx.quadraticCurveTo(x, y, x - size / 4, y);
        ctx.quadraticCurveTo(x - size / 2, y, x - size / 2, y + size / 4);
        ctx.quadraticCurveTo(x - size / 2, y + size / 2, x, y + size * 0.75);
        ctx.quadraticCurveTo(x + size / 2, y + size / 2, x + size / 2, y + size / 4);
        ctx.quadraticCurveTo(x + size / 2, y, x + size / 4, y);
        ctx.quadraticCurveTo(x, y, x, y + size / 4);
        ctx.fill();
      };
      
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const x = (canvas.width / 3) * j + canvas.width / 6;
          const y = (canvas.height / 3) * i + canvas.height / 6;
          drawHeart(x, y - 5, 20);
        }
      }
    } else if (themeConfig.pattern === 'circuit') {
      // Circuit pattern for Eletrônicos
      ctx.strokeStyle = themeConfig.patternColor;
      ctx.lineWidth = 1;
      
      // Draw circuit lines
      for (let i = 0; i < 4; i++) {
        const y = (canvas.height / 4) * i + canvas.height / 8;
        ctx.beginPath();
        ctx.moveTo(10, y);
        ctx.lineTo(canvas.width - 10, y);
        ctx.stroke();
        
        // Add nodes
        for (let j = 0; j < 3; j++) {
          const x = (canvas.width / 3) * j + canvas.width / 6;
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      // Vertical connections
      for (let i = 0; i < 3; i++) {
        const x = (canvas.width / 3) * i + canvas.width / 6;
        ctx.beginPath();
        ctx.moveTo(x, 20);
        ctx.lineTo(x, canvas.height - 20);
        ctx.stroke();
      }
    } else if (themeConfig.pattern === 'stars') {
      // Stars pattern for Super Prêmios
      const drawStar = (x: number, y: number, size: number) => {
        ctx.fillStyle = themeConfig.patternColor;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
          const nextAngle = (Math.PI * 2 * (i + 1)) / 5 - Math.PI / 2;
          const innerAngle = angle + (nextAngle - angle) / 2;
          
          if (i === 0) {
            ctx.moveTo(x + Math.cos(angle) * size, y + Math.sin(angle) * size);
          } else {
            ctx.lineTo(x + Math.cos(angle) * size, y + Math.sin(angle) * size);
          }
          ctx.lineTo(x + Math.cos(innerAngle) * size * 0.5, y + Math.sin(innerAngle) * size * 0.5);
        }
        ctx.closePath();
        ctx.fill();
      };
      
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const x = (canvas.width / 3) * j + canvas.width / 6;
          const y = (canvas.height / 3) * i + canvas.height / 6;
          drawStar(x, y, 12);
        }
      }
    }
    
    ctx.restore();
    
    // Add shimmer effect
    const shimmerGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    shimmerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    shimmerGradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.1)');
    shimmerGradient.addColorStop(0.5, themeConfig.shimmerColor);
    shimmerGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.1)');
    shimmerGradient.addColorStop(1, 'rgba(255, 255, 255, 0.3)');
    ctx.fillStyle = shimmerGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add holographic effect
    const holoGradient = ctx.createLinearGradient(canvas.width, 0, 0, canvas.height);
    holoGradient.addColorStop(0, themeConfig.accent + '10');
    holoGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
    holoGradient.addColorStop(1, themeConfig.accent + '10');
    ctx.fillStyle = holoGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw elegant scratch icon in center
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    
    // Outer glow for icon
    const iconGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, 25);
    iconGlow.addColorStop(0, themeConfig.shimmerColor);
    iconGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = iconGlow;
    ctx.fillRect(-30, -30, 60, 60);
    
    // Draw hand/finger icon
    ctx.strokeStyle = themeConfig.iconColor;
    ctx.fillStyle = themeConfig.iconColor;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Simple finger pointing icon
    ctx.beginPath();
    // Finger
    ctx.moveTo(-5, -10);
    ctx.lineTo(-5, 5);
    ctx.quadraticCurveTo(-5, 10, -2, 10);
    ctx.lineTo(2, 10);
    ctx.quadraticCurveTo(5, 10, 5, 5);
    ctx.lineTo(5, -10);
    ctx.quadraticCurveTo(5, -12, 3, -12);
    ctx.lineTo(-3, -12);
    ctx.quadraticCurveTo(-5, -12, -5, -10);
    ctx.closePath();
    ctx.fill();
    
    // Motion lines to suggest scratching
    ctx.strokeStyle = themeConfig.iconColor + '80';
    ctx.lineWidth = 1.5;
    
    // Left motion lines
    ctx.beginPath();
    ctx.moveTo(-15, -5);
    ctx.lineTo(-10, -5);
    ctx.moveTo(-15, 0);
    ctx.lineTo(-10, 0);
    ctx.moveTo(-15, 5);
    ctx.lineTo(-10, 5);
    ctx.stroke();
    
    // Right motion lines
    ctx.beginPath();
    ctx.moveTo(10, -5);
    ctx.lineTo(15, -5);
    ctx.moveTo(10, 0);
    ctx.lineTo(15, 0);
    ctx.moveTo(10, 5);
    ctx.lineTo(15, 5);
    ctx.stroke();
    
    ctx.restore();
    
    // Add premium border with gradient
    const borderGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    borderGradient.addColorStop(0, themeConfig.accent + '40');
    borderGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
    borderGradient.addColorStop(1, themeConfig.accent + '40');
    
    ctx.strokeStyle = borderGradient;
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
    
    // Inner border for depth
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
    
    // Mark canvas as ready
    setIsCanvasReady(true);
  }, [isRevealed, theme]);

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
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            
            // Create a promise to handle the play
            const playPromise = audioRef.current.play();
            
            if (playPromise !== undefined) {
              await playPromise;
            }
          }
        } catch (error) {
          // If autoplay fails, try to play with user gesture
          console.log('Audio play failed, will retry on user gesture');
          
          // Try to unlock audio on iOS by playing a silent sound
          const unlockAudio = () => {
            if (audioRef.current) {
              audioRef.current.play().then(() => {
                if (audioRef.current) {
                  audioRef.current.pause();
                  audioRef.current.currentTime = 0;
                  audioRef.current.play();
                }
              }).catch(() => {});
            }
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

  // Get theme-based hover effects
  const getHoverClass = () => {
    if (isDisabled || isRevealed || allRevealed) return '';
    
    switch (theme) {
      case 'pix':
        return 'hover:shadow-[0_0_20px_rgba(0,224,255,0.5)]';
      case 'mimei':
        return 'hover:shadow-[0_0_20px_rgba(255,105,180,0.5)]';
      case 'eletronicos':
        return 'hover:shadow-[0_0_20px_rgba(255,165,0,0.5)]';
      case 'superpremios':
        return 'hover:shadow-[0_0_20px_rgba(255,215,0,0.5)]';
      default:
        return 'hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]';
    }
  };

  return (
    <motion.div 
      ref={containerRef}
      className={`w-full h-full relative rounded-md overflow-hidden bg-gray-600 transition-all duration-300 ${isDisabled || allRevealed ? 'pointer-events-none' : ''} ${getHoverClass()}`}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: index * 0.05 }}
      onMouseEnter={() => !isDisabled && !isRevealed && !allRevealed && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
          touchAction: 'none',
          transform: isHovered ? 'scale(1.02)' : 'scale(1)',
          transformOrigin: 'center'
        }}
      />
      
      {/* Hover shimmer effect */}
      {isHovered && !isRevealed && !isDisabled && !allRevealed && (
        <div 
          className="absolute inset-0 pointer-events-none z-20"
          style={{
            background: `linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.2) 50%, transparent 70%)`,
            animation: 'shimmer 2s infinite'
          }}
        />
      )}
    </motion.div>
  );
}

// Add shimmer animation
const style = document.createElement('style');
style.textContent = `
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
`;
document.head.appendChild(style);