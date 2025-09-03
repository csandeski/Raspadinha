// Performance optimization utilities for affiliate panel

// Throttle function to limit function calls
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    } else {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        lastCall = Date.now();
        func(...args);
      }, delay - (now - lastCall));
    }
  };
}

// Debounce function for search inputs
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
}

// Lazy load images with intersection observer
export function lazyLoadImage(imgElement: HTMLImageElement) {
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          const src = img.dataset.src;
          if (src) {
            img.src = src;
            img.removeAttribute('data-src');
            observer.unobserve(img);
          }
        }
      });
    }, {
      rootMargin: '50px 0px',
      threshold: 0.01
    });
    
    observer.observe(imgElement);
    return () => observer.unobserve(imgElement);
  }
  
  // Fallback for browsers without IntersectionObserver
  const src = imgElement.dataset.src;
  if (src) {
    imgElement.src = src;
  }
  return () => {};
}

// Prefetch data for next likely navigation
export function prefetchData(queryKey: string[]) {
  // This would be integrated with React Query's prefetchQuery
  // Example implementation would go here
  console.log('Prefetching data for:', queryKey);
}

// Batch API calls
export class BatchProcessor<T> {
  private queue: Array<{ data: T; resolve: (value: any) => void }> = [];
  private timeout: NodeJS.Timeout | null = null;
  private batchSize: number;
  private delay: number;
  private processor: (batch: T[]) => Promise<any[]>;
  
  constructor(
    processor: (batch: T[]) => Promise<any[]>,
    batchSize = 10,
    delay = 100
  ) {
    this.processor = processor;
    this.batchSize = batchSize;
    this.delay = delay;
  }
  
  async add(data: T): Promise<any> {
    return new Promise((resolve) => {
      this.queue.push({ data, resolve });
      
      if (this.queue.length >= this.batchSize) {
        this.flush();
      } else {
        if (this.timeout) clearTimeout(this.timeout);
        this.timeout = setTimeout(() => this.flush(), this.delay);
      }
    });
  }
  
  private async flush() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    
    if (this.queue.length === 0) return;
    
    const batch = this.queue.splice(0, this.batchSize);
    const data = batch.map(item => item.data);
    
    try {
      const results = await this.processor(data);
      batch.forEach((item, index) => {
        item.resolve(results[index]);
      });
    } catch (error) {
      batch.forEach(item => {
        item.resolve(null);
      });
    }
  }
}

// Memoize expensive calculations
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  keyGenerator?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();
  
  return ((...args: Parameters<T>) => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = func(...args);
    cache.set(key, result);
    
    // Limit cache size
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    return result;
  }) as T;
}