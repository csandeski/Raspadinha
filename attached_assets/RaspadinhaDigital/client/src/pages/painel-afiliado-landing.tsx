import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Zap, 
  Target, 
  Award,
  ArrowRight,
  CheckCircle,
  Star,
  BarChart3,
  Rocket,
  Shield,
  Clock,
  Sparkles,
  LogIn,
  Check,
  HelpCircle,
  Share2,
  LayoutDashboard
} from "lucide-react";
// CountUp removed - using static values instead

export function PainelAfiliadoLanding() {
  const [, setLocation] = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check if affiliate is logged in
    const token = localStorage.getItem('affiliateToken');
    setIsLoggedIn(!!token);
  }, []);

  const levels = [
    { 
      name: "Bronze", 
      color: "from-amber-600 to-amber-800",
      bgColor: "from-amber-900/20 to-amber-800/10",
      borderColor: "border-amber-600/30",
      textColor: "text-amber-600"
    },
    { 
      name: "Prata", 
      color: "from-gray-400 to-gray-600",
      bgColor: "from-gray-700/20 to-gray-600/10",
      borderColor: "border-gray-500/30",
      textColor: "text-gray-400"
    },
    { 
      name: "Ouro", 
      color: "from-yellow-400 to-yellow-600",
      bgColor: "from-yellow-900/20 to-yellow-800/10",
      borderColor: "border-yellow-500/30",
      textColor: "text-yellow-400"
    },
    { 
      name: "Platina", 
      color: "from-gray-300 to-gray-500",
      bgColor: "from-slate-700/20 to-slate-600/10",
      borderColor: "border-gray-400/30",
      textColor: "text-gray-300"
    },
    { 
      name: "Diamante", 
      color: "from-cyan-400 to-blue-600",
      bgColor: "from-cyan-900/20 to-blue-800/10",
      borderColor: "border-cyan-500/30",
      textColor: "text-cyan-400"
    }
  ];

  const benefits = [
    {
      icon: <DollarSign className="w-6 h-6" />,
      title: "Comissões Altas",
      description: "Ganhe até 70% de comissão sobre cada depósito"
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: "PIX Instantâneo",
      description: "Receba seus ganhos na hora via PIX após aprovação"
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Dashboard Completo",
      description: "Acompanhe suas métricas em tempo real"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Suporte Dedicado",
      description: "Time especializado para ajudar seu crescimento"
    },
    {
      icon: <Rocket className="w-6 h-6" />,
      title: "Material de Marketing",
      description: "Banners, textos e links prontos para usar"
    },
    {
      icon: <Target className="w-6 h-6" />,
      title: "Links Rastreáveis",
      description: "UTM parameters e QR codes personalizados"
    }
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Enhanced Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2300E880' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
      </div>
      
      {/* Subtle Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-[#00E880]/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-gray-800/20 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 px-3 sm:px-4 py-3 sm:py-4 md:py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center"
          >
            <img 
              src="/logos/logomania.svg" 
              alt="Logo" 
              className="h-8 sm:h-10 md:h-12 w-auto"
            />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex gap-1.5 sm:gap-2 md:gap-3"
          >
            {isLoggedIn ? (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  className="relative group bg-gradient-to-r from-[#00E880] to-green-500 hover:from-[#00E880] hover:to-green-400 text-black text-xs sm:text-sm px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 font-semibold shadow-lg shadow-[#00E880]/25 hover:shadow-[#00E880]/40 transition-all duration-300 overflow-hidden"
                  onClick={() => setLocation("/afiliados/dashboard")}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                  <LayoutDashboard className="relative z-10 w-3.5 sm:w-4 h-3.5 sm:h-4 mr-1 sm:mr-1.5 md:mr-2 group-hover:rotate-12 transition-transform" />
                  <span className="relative z-10">Dashboard</span>
                </Button>
              </motion.div>
            ) : (
              <>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="outline"
                    className="relative group border-gray-700 hover:border-[#00E880]/50 bg-gray-900/50 backdrop-blur-sm hover:bg-gray-800/80 text-white hover:text-[#00E880] text-xs sm:text-sm px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 overflow-hidden transition-all duration-300"
                    onClick={() => setLocation("/afiliados/auth")}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-[#00E880]/0 via-[#00E880]/10 to-[#00E880]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <LogIn className="relative z-10 w-3.5 sm:w-4 h-3.5 sm:h-4 mr-1 sm:mr-1.5 md:mr-2 group-hover:rotate-12 transition-transform" />
                    <span className="relative z-10 font-medium">Entrar</span>
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    className="relative group bg-gradient-to-r from-[#00E880] to-green-500 hover:from-[#00E880] hover:to-green-400 text-black text-xs sm:text-sm px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 font-semibold shadow-lg shadow-[#00E880]/25 hover:shadow-[#00E880]/40 transition-all duration-300 overflow-hidden"
                    onClick={() => setLocation("/afiliados/auth?mode=register")}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                    <Rocket className="relative z-10 w-3.5 sm:w-4 h-3.5 sm:h-4 mr-1 sm:mr-1.5 md:mr-2 group-hover:rotate-12 transition-transform" />
                    <span className="relative z-10">Começar</span>
                  </Button>
                </motion.div>
              </>
            )}
          </motion.div>
        </div>
      </header>

      {/* Hero Section - Mobile Optimized */}
      <section className="relative z-10 px-4 py-12 md:py-20">
        <div className="max-w-7xl mx-auto text-center">
          {/* Badge - Hidden on mobile */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 hidden sm:block"
          >
            <Badge className="bg-white text-[#00E880] border-white/30 px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-semibold shadow-lg">
              <Sparkles className="w-3 h-3 md:w-4 md:h-4 mr-1.5 md:mr-2 text-[#00E880]" />
              Programa Exclusivo de Parceria
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold text-white mb-4 md:mb-6 px-2"
          >
            <span className="block sm:inline">Transforme sua</span>{" "}
            <span className="text-[#00E880] block">
              Audiência em Renda
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-base md:text-xl text-gray-400 mb-8 max-w-3xl mx-auto px-4"
          >
            <span className="block sm:inline">Ganhe até <span className="text-[#00E880] font-bold">70% de comissão</span></span>{" "}
            <span className="block sm:inline">em cada indicação.</span>
          </motion.p>

          {/* CTA Buttons - Mobile Optimized */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col gap-3 justify-center mb-8 md:mb-12 px-4 sm:flex-row sm:gap-4 md:gap-6"
          >
            {isLoggedIn ? (
              <motion.div
                whileTap={{ scale: 0.95 }}
                className="w-full sm:w-auto"
              >
                <Button
                  size="lg"
                  className="relative group w-full sm:w-auto bg-gradient-to-r from-[#00E880] to-green-500 hover:from-[#00E880] hover:to-green-400 text-black text-base md:text-lg px-6 py-4 sm:px-8 sm:py-5 md:px-10 md:py-6 font-bold shadow-lg shadow-[#00E880]/25 hover:shadow-[#00E880]/40 transition-all duration-300 overflow-hidden"
                  onClick={() => setLocation("/afiliados/dashboard")}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                  <LayoutDashboard className="relative z-10 mr-2 w-4 h-4 md:w-5 md:h-5" />
                  <span className="relative z-10">Acessar Dashboard</span>
                  <ArrowRight className="relative z-10 ml-2 w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform inline-block" />
                </Button>
              </motion.div>
            ) : (
              <>
                <motion.div
                  whileTap={{ scale: 0.95 }}
                  className="w-full sm:w-auto"
                >
                  <Button
                    size="lg"
                    className="relative group w-full sm:w-auto bg-gradient-to-r from-[#00E880] to-green-500 hover:from-[#00E880] hover:to-green-400 text-black text-base md:text-lg px-6 py-4 sm:px-8 sm:py-5 md:px-10 md:py-6 font-bold shadow-lg shadow-[#00E880]/25 hover:shadow-[#00E880]/40 transition-all duration-300 overflow-hidden"
                    onClick={() => setLocation("/afiliados/auth?mode=register")}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                    <span className="relative z-10">Quero Ser Afiliado</span>
                    <ArrowRight className="relative z-10 ml-2 w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform inline-block" />
                  </Button>
                </motion.div>
                
                <motion.div
                  whileTap={{ scale: 0.95 }}
                  className="w-full sm:w-auto"
                >
                  <Button
                    size="lg"
                    variant="outline"
                    className="relative group w-full sm:w-auto border-2 border-gray-600 hover:border-[#00E880]/50 bg-gray-900/60 backdrop-blur-md hover:bg-gray-800/80 text-white hover:text-[#00E880] text-base md:text-lg px-6 py-4 sm:px-8 sm:py-5 md:px-10 md:py-6 font-semibold transition-all duration-300 overflow-hidden"
                    onClick={() => setLocation("/afiliados/auth")}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-[#00E880]/0 via-[#00E880]/10 to-[#00E880]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <LogIn className="relative z-10 mr-2 w-4 h-4 md:w-5 md:h-5 group-hover:rotate-12 transition-transform inline-block" />
                    <span className="relative z-10">Já Sou Afiliado</span>
                  </Button>
                </motion.div>
              </>
            )}
          </motion.div>

          {/* Live Stats - Mobile Optimized, Hidden on small screens */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, type: "spring" }}
            className="hidden sm:grid sm:grid-cols-3 gap-8 max-w-5xl mx-auto px-4"
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-2xl blur-xl group-hover:from-gray-700/50 group-hover:to-gray-800/50 transition-all duration-300" />
              <div className="relative bg-gray-900/80 backdrop-blur-sm rounded-2xl p-8 border border-gray-800 hover:border-gray-700 transition-all duration-300">
                <p className="text-gray-500 text-sm font-medium mb-2">Afiliados Ativos</p>
                <p className="text-4xl md:text-5xl font-bold text-white">
                  2.847
                </p>
                <p className="text-[#00E880] text-sm mt-3 font-medium">
                  +23% este mês
                </p>
              </div>
            </motion.div>
            
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#00E880]/20 to-green-600/20 rounded-2xl blur-xl group-hover:from-[#00E880]/30 group-hover:to-green-600/30 transition-all duration-300" />
              <div className="relative bg-gray-900/80 backdrop-blur-sm rounded-2xl p-8 border border-gray-800 hover:border-[#00E880]/50 transition-all duration-300">
                <p className="text-gray-500 text-sm font-medium mb-2">Total Pago</p>
                <p className="text-4xl md:text-5xl font-bold text-[#00E880]">
                  R$ 487k
                </p>
                <p className="text-gray-400 text-sm mt-3 font-medium">
                  Em comissões
                </p>
              </div>
            </motion.div>
            
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-cyan-600/20 rounded-2xl blur-xl group-hover:from-blue-600/30 group-hover:to-cyan-600/30 transition-all duration-300" />
              <div className="relative bg-gray-900/80 backdrop-blur-sm rounded-2xl p-8 border border-gray-800 hover:border-blue-500/50 transition-all duration-300">
                <p className="text-gray-500 text-sm font-medium mb-2">Conversão</p>
                <p className="text-4xl md:text-5xl font-bold text-white">
                  92%
                </p>
                <p className="text-blue-400 text-sm mt-3 font-medium">
                  Taxa de sucesso
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Evolua e Ganhe Mais Section - Hidden on Mobile */}
      <section className="relative z-10 px-4 py-16 md:py-20 hidden sm:block">
        <div className="max-w-7xl mx-auto">
          {/* Level Benefits Description */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto"
          >
            <div className="bg-gray-900/50 rounded-2xl p-8 border border-gray-800">
              <div className="flex items-center justify-center mb-4">
                <h3 className="text-2xl font-bold text-white">Evolua e Ganhe Mais</h3>
              </div>
              <p className="text-gray-400 text-center leading-relaxed">
                Nosso sistema de níveis foi desenvolvido para recompensar seu sucesso. 
                Quanto mais você vende, maior sua comissão e melhores seus benefícios.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="flex items-center gap-3">
                  <Award className="w-5 h-5 text-[#00E880]" />
                  <span className="text-gray-500">Maiores comissões</span>
                </div>
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-[#00E880]" />
                  <span className="text-gray-500">Prioridade em saques</span>
                </div>
                <div className="flex items-center gap-3">
                  <Target className="w-5 h-5 text-[#00E880]" />
                  <span className="text-gray-500">Materiais exclusivos</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Enhanced Benefits Section - Mobile Optimized */}
      <section className="relative z-10 px-4 py-12 md:py-20">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-900/30 to-transparent" />
        <div className="max-w-7xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8 md:mb-12"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 md:mb-4">
              Por Que Ser Nosso Afiliado?
            </h2>
            <p className="text-gray-500 text-base md:text-lg max-w-2xl mx-auto hidden sm:block">
              Oferecemos as melhores condições do mercado para você crescer
            </p>
          </motion.div>

          {/* Mobile: Show only first 3 benefits, Desktop: Show all */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            {benefits.slice(0, 3).map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1, type: "spring" }}
                whileHover={{ y: -10, scale: 1.02 }}
                className="group sm:col-span-1"
              >
                <div className="relative h-full">
                  {/* Glow Effect - Hidden on mobile */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#00E880]/20 to-green-600/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 hidden sm:block" />
                  
                  <Card className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 hover:border-[#00E880]/30 p-6 sm:p-8 h-full transition-all duration-300">
                    <div className="relative z-10">
                      <div className="inline-flex p-2.5 sm:p-3 bg-gray-800 rounded-xl mb-4 sm:mb-6">
                        <div className="text-[#00E880]">
                          {benefit.icon}
                        </div>
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3">
                        {benefit.title}
                      </h3>
                      <p className="text-gray-500 leading-relaxed text-sm sm:text-base">
                        {benefit.description}
                      </p>
                    </div>
                  </Card>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced How It Works Section - Mobile Optimized */}
      <section className="relative z-10 px-4 py-12 md:py-20 bg-gradient-to-b from-transparent via-gray-900/20 to-transparent">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8 md:mb-12"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 md:mb-4">
              Como Funciona?
            </h2>
            <p className="text-gray-500 text-base md:text-lg max-w-2xl mx-auto hidden sm:block">
              Comece a ganhar em apenas 3 passos simples
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Animated Arrows for Desktop */}
            <div className="hidden md:block absolute top-1/2 left-[33%] w-[17%] -translate-y-1/2 -translate-x-1/2">
              <div className="relative">
                <div className="h-0.5 bg-gradient-to-r from-[#00E880]/20 to-[#00E880]/60" />
                <motion.div
                  className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#00E880] to-transparent"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                  style={{ transformOrigin: "left" }}
                />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2">
                  <motion.div
                    initial={{ scale: 0, rotate: 45 }}
                    animate={{ scale: 1, rotate: 45 }}
                    transition={{ duration: 0.5, delay: 1.2 }}
                    className="w-2 h-2 border-t-2 border-r-2 border-[#00E880]"
                  />
                </div>
              </div>
            </div>
            
            <div className="hidden md:block absolute top-1/2 left-[67%] w-[17%] -translate-y-1/2 -translate-x-1/2">
              <div className="relative">
                <div className="h-0.5 bg-gradient-to-r from-[#00E880]/20 to-[#00E880]/60" />
                <motion.div
                  className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#00E880] to-transparent"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 1, delay: 1, ease: "easeOut" }}
                  style={{ transformOrigin: "left" }}
                />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2">
                  <motion.div
                    initial={{ scale: 0, rotate: 45 }}
                    animate={{ scale: 1, rotate: 45 }}
                    transition={{ duration: 0.5, delay: 1.7 }}
                    className="w-2 h-2 border-t-2 border-r-2 border-[#00E880]"
                  />
                </div>
              </div>
            </div>
            
            {[
              {
                step: "01",
                title: "Cadastre-se",
                description: "Crie sua conta gratuitamente e receba seu link exclusivo de afiliado",
                icon: <Users className="w-6 sm:w-8 h-6 sm:h-8" />,
                color: "from-purple-600 to-pink-600"
              },
              {
                step: "02",
                title: "Promova",
                description: "Compartilhe seu link em suas redes sociais, site ou WhatsApp",
                icon: <Zap className="w-6 sm:w-8 h-6 sm:h-8" />,
                color: "from-blue-600 to-cyan-600"
              },
              {
                step: "03",
                title: "Ganhe",
                description: "Receba comissões vitalícias sobre cada depósito dos seus indicados",
                icon: <DollarSign className="w-6 sm:w-8 h-6 sm:h-8" />,
                color: "from-[#00E880] to-green-600"
              }
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.2, type: "spring" }}
                whileHover={{ y: -10 }}
                className="relative"
              >
                <div className="text-center px-2 sm:px-0">
                  <div className="relative inline-block mb-4 sm:mb-8">
                    {/* Main Circle */}
                    <div className="relative w-16 sm:w-20 h-16 sm:h-20 bg-gray-800 rounded-full flex items-center justify-center">
                      <div className="text-[#00E880]">{item.icon}</div>
                    </div>
                    
                    {/* Step Number */}
                    <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-6 sm:w-8 h-6 sm:h-8 bg-[#00E880] rounded-full flex items-center justify-center text-black font-bold text-xs sm:text-sm">
                      {index + 1}
                    </span>
                  </div>
                  
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3">
                    {item.title}
                  </h3>
                  <p className="text-gray-500 max-w-xs mx-auto leading-relaxed text-sm sm:text-base px-2 sm:px-0">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced Testimonials Section - Mobile Optimized */}
      <section className="relative z-10 px-4 py-12 md:py-20 overflow-hidden hidden sm:block">
        
        <div className="max-w-7xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              O Que Dizem Nossos Afiliados
            </h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              Histórias reais de sucesso
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "Carlos M.",
                role: "Influencer Digital",
                avatar: "CM",
                testimonial: "Em apenas 3 meses consegui gerar uma renda extra de R$ 15.000. O sistema é incrível e o suporte é excepcional!",
                earnings: "R$ 15.000",
                period: "/mês",
                rating: 5,
                verified: true,
                gradient: "from-purple-600 to-pink-600"
              },
              {
                name: "Ana Paula S.",
                role: "Blogueira",
                avatar: "AP",
                testimonial: "A plataforma é super intuitiva e os pagamentos são sempre pontuais. Melhor decisão que tomei este ano!",
                earnings: "R$ 8.500",
                period: "/mês",
                rating: 5,
                verified: true,
                gradient: "from-blue-600 to-cyan-600"
              },
              {
                name: "Roberto L.",
                role: "Afiliado Profissional",
                avatar: "RL",
                testimonial: "Trabalho com afiliação há 5 anos e nunca vi comissões tão generosas. Mudou completamente meu patamar financeiro!",
                earnings: "R$ 22.000",
                period: "/mês",
                rating: 5,
                verified: true,
                gradient: "from-[#00E880] to-green-600"
              }
            ].map((item, index) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800 hover:border-gray-700 transition-all h-full flex flex-col">
                  {/* Testimonial Text */}
                  <p className="text-gray-400 text-base mb-6 flex-grow">
                    "{item.testimonial}"
                  </p>
                  
                  {/* Earnings */}
                  <div className="mb-4">
                    <span className="text-2xl font-bold text-[#00E880]">{item.earnings}</span>
                    <span className="text-sm text-gray-500 ml-1">{item.period}</span>
                  </div>
                  
                  {/* Author Info */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">
                      <span className="text-[#00E880] font-semibold text-sm">
                        {item.avatar}
                      </span>
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{item.name}</p>
                      <p className="text-gray-500 text-xs">{item.role}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced FAQ Section */}
      <section className="relative z-10 px-4 py-12 sm:py-16 md:py-20">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8 sm:mb-12"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4">
              Perguntas Frequentes
            </h2>
            <p className="text-gray-500 text-sm sm:text-base md:text-lg px-2">
              Tire suas dúvidas sobre nosso programa de afiliados
            </p>
          </motion.div>

          <div className="space-y-4">
            {[
              {
                question: "Quanto custa para ser afiliado?",
                answer: "É totalmente gratuito! Não cobramos nenhuma taxa para participar do programa.",
                icon: <DollarSign className="w-5 h-5" />
              },
              {
                question: "Quando recebo minhas comissões?",
                answer: "As comissões são pagas instantaneamente via PIX após aprovação do administrador. Receba seus ganhos na hora!",
                icon: <Clock className="w-5 h-5" />
              },
              {
                question: "Posso promover em qualquer plataforma?",
                answer: "Sim! Você pode promover no Instagram, TikTok, YouTube, WhatsApp, site próprio e onde mais desejar.",
                icon: <Share2 className="w-5 h-5" />
              },
              {
                question: "As comissões são vitalícias?",
                answer: "Sim! Você ganha comissão sobre todos os depósitos futuros dos clientes que você indicar."
              }
            ].map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-gray-900/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-800"
              >
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-[#00E880]" />
                  {faq.question}
                </h3>
                <p className="text-gray-400 ml-7">{faq.answer}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced CTA Section - Mobile Optimized */}
      <section className="relative z-10 px-4 py-16 md:py-24 overflow-hidden">
        {/* Animated Background Effects - Hidden on mobile */}
        <div className="absolute inset-0 hidden sm:block">
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 180, 360]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -top-40 -left-40 w-80 h-80 bg-gradient-to-br from-[#00E880]/20 to-transparent rounded-full blur-3xl"
          />
          <motion.div
            animate={{ 
              scale: [1, 1.3, 1],
              rotate: [360, 180, 0]
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-40 -right-40 w-96 h-96 bg-gradient-to-br from-green-600/20 to-transparent rounded-full blur-3xl"
          />
        </div>
        
        <div className="max-w-5xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            className="relative rounded-2xl sm:rounded-3xl overflow-hidden group"
          >
            {/* Gradient Border Effect - Simplified for mobile */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#00E880] to-green-500 opacity-100 sm:opacity-80 sm:group-hover:opacity-100 transition-opacity duration-500" />
            
            {/* Main Content - Mobile Optimized */}
            <div className="relative bg-gray-900/95 backdrop-blur-xl m-[1px] sm:m-[2px] rounded-2xl sm:rounded-3xl p-6 sm:p-12 md:p-16 text-center">
              {/* Content */}
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-2 sm:mb-6">
                Pronto Para Começar?
              </h2>
              
              {/* Mobile subtitle */}
              <p className="text-sm text-gray-400 mb-6 px-4 sm:hidden">
                Ganhe até <span className="text-[#00E880] font-bold">70% de comissão</span>
              </p>
              
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-300 mb-6 sm:mb-8 max-w-2xl mx-auto px-2 hidden sm:block">
                Junte-se a <span className="text-[#00E880] font-bold">milhares de afiliados</span> que já estão transformando suas vidas
              </p>
              
              {/* Benefits - Hidden on mobile */}
              <div className="hidden sm:flex sm:flex-row items-center justify-center gap-4 mb-8 md:mb-10">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-[#00E880]" />
                  <span className="text-sm text-gray-400">Setup em 2 minutos</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-[#00E880]" />
                  <span className="text-sm text-gray-400">100% Gratuito</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-[#00E880]" />
                  <span className="text-sm text-gray-400">Suporte 24/7</span>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 md:gap-6 justify-center">
                <motion.div
                  whileTap={{ scale: 0.95 }}
                  className="w-full sm:w-auto"
                >
                  <Button
                    size="lg"
                    className="relative group w-full sm:w-auto bg-gradient-to-r from-[#00E880] to-green-500 hover:from-[#00E880] hover:to-green-400 text-black text-base md:text-lg px-6 py-4 sm:px-8 sm:py-6 md:px-10 md:py-7 font-bold shadow-xl shadow-[#00E880]/20 transition-all duration-300 overflow-hidden"
                    onClick={() => setLocation("/afiliados/auth?mode=register")}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                    <Rocket className="relative z-10 mr-2 w-4 sm:w-5 md:w-6 h-4 sm:h-5 md:h-6 group-hover:rotate-12 transition-transform inline-block" />
                    <span className="relative z-10">Quero Ser Afiliado</span>
                  </Button>
                </motion.div>
                
                <motion.div
                  whileTap={{ scale: 0.95 }}
                  className="w-full sm:w-auto"
                >
                  <Button
                    size="lg"
                    variant="outline"
                    className="relative group w-full sm:w-auto border border-gray-700 hover:border-[#00E880]/50 bg-gray-900/50 backdrop-blur hover:bg-gray-800/80 text-white hover:text-[#00E880] text-base md:text-lg px-6 py-4 sm:px-8 sm:py-6 md:px-10 md:py-7 font-medium transition-all duration-300 overflow-hidden"
                    onClick={() => setLocation("/afiliados/auth")}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-[#00E880]/0 via-[#00E880]/10 to-[#00E880]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <LogIn className="relative z-10 mr-2 w-4 sm:w-5 md:w-6 h-4 sm:h-5 md:h-6 group-hover:rotate-12 transition-transform inline-block" />
                    <span className="relative z-10">Já Sou Afiliado</span>
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-4 py-8 border-t border-gray-800">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-400">
            © 2025 Programa de Afiliados. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}