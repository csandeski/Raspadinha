import { useParams, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useAuth } from "../lib/auth.tsx";
import { MobileLayout } from "@/components/mobile-layout";

import { PremioPIXConta } from "@/components/games/premio-pix-conta";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

export default function Game() {
  const { type } = useParams<{ type: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [gameCompleted, setGameCompleted] = useState(false);

  useEffect(() => {
    if (!user) {
      setLocation("/login");
      return;
    }

    if (!['premio-pix-conta'].includes(type || '')) {
      setLocation("/");
      return;
    }
  }, [type, user]);



  // Add game-active class for styling
  // Removed body.game-active class that was freezing the entire screen on mobile

  const handleGameComplete = (won: boolean, prize: number) => {
    setGameCompleted(true);
  };

  const renderGame = () => {
    switch (type) {
      case 'premio-pix-conta':
        return <PremioPIXConta onBack={() => setLocation("/")} />;
      default:
        return null;
    }
  };

  if (gameCompleted) {
    return (
      <MobileLayout>
        <div className="min-h-full bg-gradient-to-b from-[#0E1015] via-[#1a1b23] to-[#0E1015] flex items-center justify-center px-4">
          <div className="bg-gray-800/50 backdrop-blur rounded-2xl p-8 text-center max-w-sm w-full">
            <h2 className="text-2xl font-bold text-white mb-4">Jogo Finalizado!</h2>
            <p className="text-gray-300 mb-6">
              Verifique seu saldo atualizado no topo da tela.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gradient-to-r from-[#00E880] to-[#00D470] hover:from-[#00D470] hover:to-[#00C560] text-black font-bold py-3 rounded-xl transition-all duration-300 transform hover:scale-105"
              >
                Jogar Novamente
              </button>
              <button
                onClick={() => setLocation("/")}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-xl transition-colors"
              >
                Voltar ao Início
              </button>
            </div>
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="min-h-full bg-gradient-to-b from-[#0E1015] via-[#1a1b23] to-[#0E1015]">
        <div className="pb-6">
          {renderGame()}
        </div>
      </div>
    </MobileLayout>
  );
}