import { motion } from "framer-motion";
import { AffiliateLayout } from "@/components/affiliate/affiliate-layout";
import { 
  Clock,
  Rocket,
  Gift,
  Package,
  Download,
  FileText
} from "lucide-react";

export function PainelAfiliadoMaterials() {
  return (
    <AffiliateLayout activeSection="materials">
      <div className="space-y-6">
        {/* Responsive Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-gray-900/50 to-gray-950/50 backdrop-blur-sm rounded-2xl p-4 md:p-6 mb-4"
        >
          <div className="flex items-center gap-3 md:gap-4">
            <div className="p-2 md:p-3 bg-gray-800 rounded-xl">
              <Package className="w-5 h-5 md:w-6 md:h-6 text-gray-400" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">Central de Materiais</h1>
              <p className="text-gray-400 text-xs md:text-sm">Recursos de marketing para impulsionar suas vendas</p>
            </div>
          </div>
        </motion.div>

        {/* Coming Soon Section - Premium Design */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="relative"
        >
          <div className="relative rounded-3xl overflow-hidden min-h-[500px]">
            {/* Inner Card */}
            <div className="relative bg-[#1a1f2e] border border-gray-700 rounded-3xl overflow-hidden">
              {/* Pattern Background */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0" style={{
                  backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.05) 10px, rgba(255,255,255,.05) 20px)`
                }} />
              </div>
              
              {/* Content */}
              <div className="relative backdrop-blur-xl">
            <div className="p-6 md:p-12 text-center">
              {/* Animated Icons */}
              <div className="flex justify-center gap-4 md:gap-8 mb-8 md:mb-12">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="relative"
                >
                  <div className="relative p-4 md:p-6 bg-gray-800 rounded-full border border-gray-700">
                    <Gift className="w-8 h-8 md:w-12 md:h-12 text-yellow-400" />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="relative"
                >
                  <div className="relative p-4 md:p-6 bg-gray-800 rounded-full border border-gray-700">
                    <Rocket className="w-8 h-8 md:w-12 md:h-12 text-[#00E880]" />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="relative"
                >
                  <div className="relative p-4 md:p-6 bg-gray-800 rounded-full border border-gray-700">
                    <Clock className="w-8 h-8 md:w-12 md:h-12 text-purple-400" />
                  </div>
                </motion.div>
              </div>

              {/* Coming Soon Text */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <h2 className="text-3xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#00E880] via-teal-400 to-cyan-400 mb-4 md:mb-6">
                  Em Breve
                </h2>
                <p className="text-lg md:text-xl text-gray-300 mb-4">
                  Estamos preparando materiais incríveis para você!
                </p>
                <p className="text-sm md:text-base text-gray-400 max-w-2xl mx-auto mb-8 md:mb-12 px-4 md:px-0">
                  Nossa equipe está desenvolvendo banners profissionais, textos persuasivos, 
                  vídeos explicativos e muito mais para ajudar você a maximizar suas conversões.
                </p>
              </motion.div>

              {/* Feature Preview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6 mt-8 md:mt-12">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 }}
                  className="relative rounded-2xl overflow-hidden"
                >
                  <div className="relative bg-[#1a1f2e]/95 backdrop-blur-sm border border-gray-700 rounded-2xl p-4 md:p-6">
                    <Download className="w-6 h-6 md:w-8 md:h-8 text-blue-400 mb-3 md:mb-4" />
                    <h3 className="text-base md:text-lg font-semibold text-white mb-2">Banners Exclusivos</h3>
                    <p className="text-xs md:text-sm text-gray-400">
                      Artes profissionais para todas as redes sociais
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="relative rounded-2xl overflow-hidden"
                >
                  <div className="relative bg-[#1a1f2e]/95 backdrop-blur-sm border border-gray-700 rounded-2xl p-4 md:p-6">
                    <FileText className="w-6 h-6 md:w-8 md:h-8 text-[#00E880] mb-3 md:mb-4" />
                    <h3 className="text-base md:text-lg font-semibold text-white mb-2">Textos Prontos</h3>
                    <p className="text-xs md:text-sm text-gray-400">
                      Copys testadas para converter mais
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.9 }}
                  className="relative rounded-2xl overflow-hidden"
                >
                  <div className="relative bg-[#1a1f2e]/95 backdrop-blur-sm border border-gray-700 rounded-2xl p-4 md:p-6">
                    <Package className="w-6 h-6 md:w-8 md:h-8 text-purple-400 mb-3 md:mb-4" />
                    <h3 className="text-base md:text-lg font-semibold text-white mb-2">Kit Completo</h3>
                    <p className="text-xs md:text-sm text-gray-400">
                      Tudo que você precisa em um só lugar
                    </p>
                  </div>
                </motion.div>
              </div>

              {/* Progress Bar */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-8 md:mt-12 max-w-md mx-auto px-4 md:px-0"
              >
                <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
                  <span>Progresso</span>
                  <span>75%</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-[#00E880] to-teal-400"
                    initial={{ width: 0 }}
                    animate={{ width: "75%" }}
                    transition={{ delay: 1.2, duration: 1 }}
                  />
                </div>
              </motion.div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AffiliateLayout>
  );
}