import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { 
  Home, 
  Search, 
  AlertCircle,
  ArrowLeft,
  Compass
} from "lucide-react";

export function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black flex items-center justify-center p-4">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 max-w-2xl w-full"
      >
        <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl p-8 md:p-12 text-center">
          {/* 404 Number */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <h1 className="text-8xl md:text-9xl font-bold bg-gradient-to-r from-[#00E880] to-[#00C068] bg-clip-text text-transparent">
              404
            </h1>
          </motion.div>

          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mb-6 flex justify-center"
          >
            <div className="p-4 bg-red-500/10 rounded-full">
              <AlertCircle className="w-12 h-12 text-red-400" />
            </div>
          </motion.div>

          {/* Title */}
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-2xl md:text-3xl font-bold text-white mb-4"
          >
            Página Não Encontrada
          </motion.h2>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-zinc-400 mb-8 max-w-md mx-auto"
          >
            Ops! Parece que você se perdeu. A página que você está procurando não existe ou foi movida.
          </motion.p>

          {/* Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button
              onClick={() => setLocation("/")}
              className="bg-gradient-to-r from-[#00E880] to-[#00C068] hover:from-[#00C068] hover:to-[#00A050] text-black font-semibold px-8 py-6 text-base"
            >
              <Home className="w-5 h-5 mr-2" />
              Ir para Página Principal
            </Button>

            <Button
              onClick={() => window.history.back()}
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 px-8 py-6 text-base"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Voltar
            </Button>
          </motion.div>

          {/* Decorative elements */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-12 pt-8 border-t border-zinc-800"
          >
            <div className="flex items-center justify-center gap-6 text-zinc-500">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                <span className="text-sm">Verifique o endereço</span>
              </div>
              <div className="w-1 h-1 bg-zinc-600 rounded-full" />
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4" />
                <span className="text-sm">Navegue pelo menu</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Mobile-optimized floating elements */}
        <motion.div
          animate={{ 
            y: [0, -10, 0],
            rotate: [0, 5, 0]
          }}
          transition={{ 
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -top-8 -right-8 md:-top-12 md:-right-12"
        >
          <div className="p-3 bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-xl backdrop-blur-sm border border-purple-500/20">
            <Search className="w-6 h-6 text-purple-400" />
          </div>
        </motion.div>

        <motion.div
          animate={{ 
            y: [0, 10, 0],
            rotate: [0, -5, 0]
          }}
          transition={{ 
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
          className="absolute -bottom-8 -left-8 md:-bottom-12 md:-left-12"
        >
          <div className="p-3 bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-xl backdrop-blur-sm border border-blue-500/20">
            <Compass className="w-6 h-6 text-blue-400" />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}