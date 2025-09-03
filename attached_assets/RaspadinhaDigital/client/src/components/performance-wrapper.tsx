import { ReactNode } from 'react';
import { useDevicePerformance, useReducedMotion } from '@/hooks/use-performance';

interface PerformanceWrapperProps {
  children: ReactNode;
  reduceAnimations?: boolean;
  reduceEffects?: boolean;
}

export function PerformanceWrapper({ 
  children, 
  reduceAnimations = true,
  reduceEffects = true 
}: PerformanceWrapperProps) {
  const isLowEndDevice = useDevicePerformance();
  const prefersReducedMotion = useReducedMotion();
  
  const shouldReducePerformance = isLowEndDevice || prefersReducedMotion;

  // Apply performance-optimized CSS classes
  const className = shouldReducePerformance ? 'performance-mode' : '';

  return (
    <div 
      className={className}
      style={{
        // Reduce GPU usage on low-end devices
        ...(shouldReducePerformance && reduceAnimations && {
          animation: 'none !important',
          transition: 'none !important',
        }),
        // Disable expensive effects
        ...(shouldReducePerformance && reduceEffects && {
          filter: 'none !important',
          backdropFilter: 'none !important',
          boxShadow: 'none !important',
        }),
      }}
    >
      {children}
    </div>
  );
}