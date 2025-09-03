import { useEffect, useState } from 'react';

export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

export function useDevicePerformance() {
  const [isLowEndDevice, setIsLowEndDevice] = useState(false);

  useEffect(() => {
    // Check for low-end device indicators
    const checkPerformance = () => {
      const memory = (navigator as any).deviceMemory;
      const hardwareConcurrency = navigator.hardwareConcurrency;
      
      // Consider device low-end if:
      // - Less than 4GB RAM
      // - Less than 4 CPU cores
      // - On mobile with limited resources
      const isLowEnd = 
        (memory && memory < 4) || 
        (hardwareConcurrency && hardwareConcurrency < 4) ||
        (/Android|iPhone|iPad|iPod/.test(navigator.userAgent) && window.innerWidth < 768);
      
      setIsLowEndDevice(isLowEnd);
    };

    checkPerformance();
    window.addEventListener('resize', checkPerformance);
    
    return () => window.removeEventListener('resize', checkPerformance);
  }, []);

  return isLowEndDevice;
}

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}