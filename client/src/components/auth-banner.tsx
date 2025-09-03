import { X } from "lucide-react";

interface AuthBannerProps {
  onClose?: () => void;
  showCloseButton?: boolean;
}

export function AuthBanner({ onClose, showCloseButton = true }: AuthBannerProps) {
  return (
    <div 
      className="relative w-full h-56 bg-gradient-to-br from-[#0F1923] to-[#1A2635] overflow-hidden"
    >
      {showCloseButton && onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg bg-black/50 hover:bg-black/70 transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      )}
      
      {/* Logo */}
      <div className="absolute top-4 left-4">
        <img 
          src="/logos/logomania.svg" 
          alt="Mania Brasil" 
          className="h-8 w-auto"
        />
      </div>
      
      {/* Character/Mascot */}
      <div 
        className="absolute inset-0 bg-contain bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/banners/register.webp')"
        }}
      />
      
      {/* Offer text */}
      <div className="absolute bottom-6 right-6">
        <div className="bg-[#00E880] text-black px-6 py-2 rounded-lg inline-block transform -rotate-3">
          <span className="font-bold text-lg">ESSA OFERTA</span>
          <br />
          <span className="font-bold text-lg">É LIMITADA!</span>
        </div>
      </div>
    </div>
  );
}