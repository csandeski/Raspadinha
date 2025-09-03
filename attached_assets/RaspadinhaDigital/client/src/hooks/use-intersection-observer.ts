import { useEffect, useRef, useState } from 'react';

interface UseIntersectionObserverOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {}
) {
  const { threshold = 0, rootMargin = '0px', triggerOnce = true } = options;
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const targetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    // Skip if already intersected and triggerOnce is true
    if (triggerOnce && hasIntersected) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        
        if (entry.isIntersecting) {
          setHasIntersected(true);
          
          if (triggerOnce) {
            observer.unobserve(target);
          }
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(target);

    return () => {
      observer.unobserve(target);
    };
  }, [threshold, rootMargin, triggerOnce, hasIntersected]);

  return { targetRef, isIntersecting, hasIntersected };
}