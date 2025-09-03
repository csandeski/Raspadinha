import React, { useState, useEffect, useRef } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number | string;
  height?: number | string;
  priority?: boolean;
  onLoad?: () => void;
  onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  fallbackSrc?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
  loading?: 'lazy' | 'eager';
}

// Global cache para URLs de imagens já carregadas
const imageCache = new Set<string>();
const loadingImages = new Map<string, Promise<void>>();

// Função para pré-carregar imagem com cache
const preloadImage = (src: string): Promise<void> => {
  // Se já está carregada, retorna imediatamente
  if (imageCache.has(src)) {
    return Promise.resolve();
  }
  
  // Se já está carregando, retorna a promise existente
  if (loadingImages.has(src)) {
    return loadingImages.get(src)!;
  }
  
  // Cria nova promise de carregamento
  const promise = new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      imageCache.add(src);
      loadingImages.delete(src);
      resolve();
    };
    img.onerror = () => {
      loadingImages.delete(src);
      reject();
    };
  });
  
  loadingImages.set(src, promise);
  return promise;
};

export const OptimizedImage = React.memo(({ 
  src, 
  alt, 
  className = '', 
  width, 
  height,
  priority = false,
  onLoad,
  onError,
  fallbackSrc = '/logos/logomania.svg',
  onClick,
  style,
  loading
}: OptimizedImageProps) => {
  const [isLoaded, setIsLoaded] = useState(() => imageCache.has(src));
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority || imageCache.has(src));
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Se já está em cache ou é prioridade, carrega imediatamente
    if (imageCache.has(src) || priority) {
      setIsInView(true);
      setIsLoaded(true);
      return;
    }

    // Se não é prioridade e não está em cache, usa IntersectionObserver
    if (!priority && !imageCache.has(src)) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setIsInView(true);
              preloadImage(src)
                .then(() => setIsLoaded(true))
                .catch(() => setHasError(true));
              observerRef.current?.disconnect();
            }
          });
        },
        {
          rootMargin: '100px', // Aumentado para pré-carregar antes
          threshold: 0.01
        }
      );

      if (imgRef.current) {
        observerRef.current.observe(imgRef.current);
      }
    } else if (priority) {
      // Pré-carrega imediatamente se for prioridade
      preloadImage(src)
        .then(() => setIsLoaded(true))
        .catch(() => setHasError(true));
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [src, priority]);

  const handleLoad = () => {
    imageCache.add(src);
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setHasError(true);
    if (onError) {
      onError(e);
    } else if (fallbackSrc) {
      e.currentTarget.src = fallbackSrc;
    }
  };

  // Se houver erro e fallback, mostra o fallback
  if (hasError && fallbackSrc) {
    return (
      <img
        src={fallbackSrc}
        alt={alt}
        className={className}
        width={width}
        height={height}
        style={style}
        onClick={onClick}
      />
    );
  }

  return (
    <img
      ref={imgRef}
      src={isInView ? src : ''}
      alt={alt}
      className={className}
      width={width}
      height={height}
      loading={loading || (priority ? 'eager' : 'lazy')}
      onLoad={handleLoad}
      onError={handleError}
      style={{
        ...style,
        opacity: isLoaded ? 1 : 0,
        transition: isLoaded ? 'opacity 0.2s ease-in-out' : 'none'
      }}
      onClick={onClick}
    />
  );
}, (prevProps, nextProps) => {
  // Memo personalizado para evitar re-renderizações desnecessárias
  return prevProps.src === nextProps.src && 
         prevProps.className === nextProps.className &&
         prevProps.alt === nextProps.alt;
});

OptimizedImage.displayName = 'OptimizedImage';

// Hook para pré-carregar múltiplas imagens
export const usePreloadImages = (images: string[]) => {
  const [loaded, setLoaded] = useState(false);
  
  useEffect(() => {
    const loadImages = async () => {
      try {
        await Promise.all(images.map(src => preloadImage(src)));
        setLoaded(true);
      } catch (error) {
        // Continue mesmo com erros
        setLoaded(true);
      }
    };
    
    if (images.length > 0) {
      loadImages();
    } else {
      setLoaded(true);
    }
  }, []);
  
  return loaded;
};

