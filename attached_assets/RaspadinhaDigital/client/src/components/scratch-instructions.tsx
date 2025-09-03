import { Zap } from "lucide-react";

interface RaspadinhaInstructionsProps {
  gameType: string;
}

export default function RaspadinhaInstructions({ gameType }: RaspadinhaInstructionsProps) {
  return (
    <div className="mt-6 bg-gray-900/50 backdrop-blur-sm rounded-xl p-5 border border-gray-800">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <h3 className="text-lg font-bold text-white">Raspe e Ganhe</h3>
      </div>
      
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400">Pressione</span>
          <kbd className="px-2 py-1 bg-gray-800 rounded text-xs font-mono text-white">Ctrl K</kbd>
          <span className="text-gray-400">para comprar.</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400">Pressione</span>
          <kbd className="px-2 py-1 bg-gray-800 rounded text-xs font-mono text-white">Ctrl L</kbd>
          <span className="text-gray-400">para revelar.</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400">Pressione</span>
          <kbd className="px-2 py-1 bg-gray-800 rounded text-xs font-mono text-white">Ctrl I</kbd>
          <span className="text-gray-400">para revelar rápido.</span>
        </div>
      </div>
      
      <div className="pt-3 border-t border-gray-800">
        <p className="text-[#00E880] text-sm font-medium">
          🚀 Reúna 3 imagens iguais e conquiste seu prêmio!
        </p>
        <p className="text-gray-400 text-xs mt-1">
          O valor correspondente será creditado automaticamente na sua conta.
        </p>
        <p className="text-gray-400 text-xs mt-1">
          Se preferir receber o produto físico, basta entrar em contato com o nosso suporte.
        </p>
      </div>
    </div>
  );
}