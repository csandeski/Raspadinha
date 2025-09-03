import { useEffect, useRef } from 'react';

interface OptimizedConfettiProps {
  trigger: boolean;
  onComplete?: () => void;
}

export function OptimizedConfetti({ trigger, onComplete }: OptimizedConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const confettiRef = useRef<any>(null);

  useEffect(() => {
    if (!trigger) return;

    // Lazy load confetti library only when needed
    const loadAndTriggerConfetti = async () => {
      if (!confettiRef.current) {
        const confettiModule = await import('canvas-confetti');
        confettiRef.current = confettiModule.default;
      }

      const myConfetti = confettiRef.current.create(canvasRef.current!, {
        resize: true,
        useWorker: true, // Use web worker for better performance
      });

      // Optimized confetti configuration
      myConfetti({
        particleCount: 50, // Reduced from 100 for better performance
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#00E880', '#FFA500', '#FFD700'],
      });

      // Clear after animation completes
      setTimeout(() => {
        myConfetti.reset();
        onComplete?.();
      }, 3000);
    };

    loadAndTriggerConfetti();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [trigger, onComplete]);

  if (!trigger) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      style={{
        width: '100%',
        height: '100%',
      }}
    />
  );
}