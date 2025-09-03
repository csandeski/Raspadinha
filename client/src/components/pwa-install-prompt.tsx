import { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                               (window.navigator as any).standalone === true;
    setIsStandalone(isInStandaloneMode);

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Don't show prompt if already installed
    if (isInStandaloneMode) {
      return;
    }

    // Handle install prompt for Android/Desktop
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show install prompt after 30 seconds or if user has visited 3+ times
      const visitCount = parseInt(localStorage.getItem('visitCount') || '0');
      const lastPromptTime = parseInt(localStorage.getItem('lastInstallPromptTime') || '0');
      const now = Date.now();
      const dayInMs = 24 * 60 * 60 * 1000;
      
      if (visitCount >= 3 && (now - lastPromptTime > dayInMs)) {
        setTimeout(() => {
          setShowInstallPrompt(true);
          localStorage.setItem('lastInstallPromptTime', now.toString());
        }, 30000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Track visits
    const visitCount = parseInt(localStorage.getItem('visitCount') || '0');
    localStorage.setItem('visitCount', (visitCount + 1).toString());

    // Show iOS install instructions if needed
    if (isIOSDevice && !isInStandaloneMode) {
      const lastIOSPrompt = parseInt(localStorage.getItem('lastIOSPromptTime') || '0');
      const now = Date.now();
      const weekInMs = 7 * 24 * 60 * 60 * 1000;
      
      if (now - lastIOSPrompt > weekInMs) {
        setTimeout(() => {
          setShowInstallPrompt(true);
          localStorage.setItem('lastIOSPromptTime', now.toString());
        }, 60000); // Show after 1 minute on iOS
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      // Track installation
      if (window.fbq) {
        window.fbq('track', 'AppInstalled');
      }
    }

    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleClose = () => {
    setShowInstallPrompt(false);
    // Don't show again for 7 days
    localStorage.setItem('lastInstallPromptTime', Date.now().toString());
  };

  if (!showInstallPrompt || isStandalone) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-up">
      <div className="bg-gradient-to-br from-gray-900 to-black border border-green-500/20 rounded-2xl shadow-2xl p-6">
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-gradient-to-br from-[#00E880] to-[#00D470] rounded-xl flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-black" />
            </div>
          </div>

          <div className="flex-1">
            <h3 className="text-white font-bold text-lg mb-1">
              Instale o Mania Brasil!
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              {isIOS 
                ? 'Adicione à tela inicial para acesso rápido e melhor experiência'
                : 'Jogue como um app nativo com acesso offline e notificações'
              }
            </p>

            {isIOS ? (
              <div className="space-y-3">
                <div className="bg-gray-800/50 rounded-lg p-3 text-xs text-gray-300">
                  <p className="mb-2">Para instalar:</p>
                  <ol className="space-y-1 ml-3">
                    <li>1. Toque no botão compartilhar</li>
                    <li>2. Role e toque em "Adicionar à Tela de Início"</li>
                    <li>3. Toque em "Adicionar"</li>
                  </ol>
                </div>
                <Button
                  onClick={handleClose}
                  className="w-full bg-gradient-to-r from-[#00E880] to-[#00D470] hover:from-[#00D470] hover:to-[#00C060] text-black font-bold"
                >
                  Entendi
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  onClick={handleInstallClick}
                  className="flex-1 bg-gradient-to-r from-[#00E880] to-[#00D470] hover:from-[#00D470] hover:to-[#00C060] text-black font-bold"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Instalar
                </Button>
                <Button
                  onClick={handleClose}
                  variant="outline"
                  className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  Agora não
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Benefits list */}
        <div className="mt-4 pt-4 border-t border-gray-800">
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              Acesso rápido
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              Sem barra de URL
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              Notificações
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes slide-up {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  
  .animate-slide-up {
    animation: slide-up 0.3s ease-out;
  }
`;
document.head.appendChild(style);