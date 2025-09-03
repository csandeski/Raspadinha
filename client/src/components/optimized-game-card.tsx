import { memo } from 'react';
import { useIntersectionObserver } from '@/hooks/use-intersection-observer';

interface OptimizedGameCardProps {
  title: string;
  image: string;
  price: string;
  maxPrize: string;
  color: string;
  onClick: () => void;
  children?: React.ReactNode;
}

export const OptimizedGameCard = memo(function OptimizedGameCard({
  title,
  image,
  price,
  maxPrize,
  color,
  onClick,
  children
}: OptimizedGameCardProps) {
  const { targetRef, hasIntersected } = useIntersectionObserver({
    rootMargin: '100px',
    triggerOnce: true
  });

  return (
    <div ref={targetRef} className={`card-border-wrapper border-gradient-${color}`}>
      <div
        onClick={onClick}
        className="cursor-pointer transform hover:scale-[1.02] transition-all duration-300 overflow-hidden rounded-2xl"
      >
        {/* Banner Section with lazy loading */}
        <div
          className="relative w-full"
          style={{
            aspectRatio: "16/8",
            backgroundImage: hasIntersected ? `url(${image})` : undefined,
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            backgroundColor: hasIntersected ? undefined : '#1a1a1a'
          }}
        >
          {/* Price Badge */}
          <div className={`absolute top-4 right-4 bg-${color}-500 text-white px-3 py-1 rounded-lg font-bold text-sm shadow-lg`}>
            {price}
          </div>
          {/* Gradient overlay */}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-900 to-transparent"></div>
        </div>

        {/* Info Section */}
        <div className="bg-gray-900 p-3 rounded-b-2xl">
          <div>
            {children}
            <p className={`text-xl font-bold text-${color}-500 mb-0.5 mt-1`}>{title}</p>
            <p className="text-gray-300 text-sm mb-2">
              Prêmios de até <span className={`text-${color}-400 font-bold`}>{maxPrize}</span>
            </p>
            <button className={`animate-gentle-pulse w-full bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white px-3 py-3 rounded-2xl font-bold transition-all hover:shadow-xl hover:scale-[1.02] text-sm flex items-center justify-between border border-gray-700 relative overflow-hidden group`}>
              <div className={`absolute inset-0 bg-gradient-to-r from-${color}-500/10 to-${color}-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
              <span className={`bg-gradient-to-r from-${color}-500 to-${color}-400 px-4 py-2 rounded-xl flex items-center gap-3 shadow-lg relative z-10`}>
                <span className="text-white text-sm font-black uppercase tracking-wider">Jogar</span>
                <span className="bg-black/40 px-3 py-1 rounded-lg text-white font-bold shadow-inner">{price}</span>
              </span>
              <span className="flex items-center gap-1 text-[10px] text-gray-400 pr-2 relative z-10">
                <svg className={`w-3.5 h-3.5 text-${color}-400`} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 0 0-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z"/>
                </svg>
                <span className="font-medium uppercase">Ver Prêmios</span>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                </svg>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});