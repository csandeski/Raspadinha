import { useState, useEffect, useRef } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
}

export function LazyImage({ src, alt, className = '', style, placeholder }: LazyImageProps) {
  const [imageSrc, setImageSrc] = useState(placeholder || '');
  const [isLoading, setIsLoading] = useState(true);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Start loading the image when it's about to enter the viewport
            const img = new Image();
            img.src = src;
            img.onload = () => {
              setImageSrc(src);
              setIsLoading(false);
            };
            observer.unobserve(entry.target);
          }
        });
      },
      {
        // Load images when they're 100px away from viewport
        rootMargin: '100px',
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, [src]);

  return (
    <div className={`relative ${className}`} style={style}>
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        style={style}
      />
      {isLoading && (
        <div className="absolute inset-0 bg-gray-800 animate-pulse rounded-lg" />
      )}
    </div>
  );
}