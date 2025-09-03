import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface ConfettiProps {
  isActive: boolean;
  duration?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
}

export function Confetti({ isActive, duration = 3000 }: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Initialize particles
    const colors = ['#FFD700', '#FF69B4', '#00CED1', '#32CD32', '#FF6347', '#DDA0DD'];
    const particleCount = 150;
    
    particlesRef.current = [];
    for (let i = 0; i < particleCount; i++) {
      particlesRef.current.push({
        x: Math.random() * canvas.width,
        y: -20,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 3 + 2,
        size: Math.random() * 6 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2
      });
    }

    // Animation loop
    let startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      
      if (elapsed > duration) {
        cancelAnimationFrame(animationRef.current!);
        particlesRef.current = [];
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((particle) => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.1; // Gravity
        particle.rotation += particle.rotationSpeed;

        // Draw particle
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);
        ctx.fillStyle = particle.color;
        
        // Draw rectangle confetti
        ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size / 2);
        
        ctx.restore();
      });

      // Remove particles that are off screen
      particlesRef.current = particlesRef.current.filter(p => p.y < canvas.height + 20);

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, duration]);

  if (!isActive) return null;

  return (
    <motion.canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    />
  );
}