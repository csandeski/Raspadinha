import { motion } from "framer-motion";
import { AffiliateLayout } from "@/components/affiliate/affiliate-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageSquare,
  Phone,
  Clock,
  CheckCircle2,
  Users,
  Shield,
  Zap,
  QrCode,
  Copy,
  ExternalLink,
  MessageCircle,
  HelpCircle,
  ChevronRight,
  Smartphone
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";

export function PainelAfiliadoSupport() {
  const { toast } = useToast();
  const whatsappNumber = "1151964120";
  const formattedNumber = "(11) 5196-4120";

  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(whatsappNumber);
    toast({
      title: "Número copiado!",
      description: "O número do WhatsApp foi copiado para sua área de transferência.",
    });
  };
  
  const openWhatsApp = () => {
    const message = encodeURIComponent("Olá! Sou afiliado da Mania Brasil e preciso de ajuda.");
    window.open(`https://wa.me/55${whatsappNumber}?text=${message}`, '_blank');
  };

  const features = [
    {
      icon: <Zap className="w-5 h-5" />,
      title: "Resposta Rápida",
      description: "Nossa equipe responde em minutos"
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: "Suporte Especializado",
      description: "Equipe dedicada para afiliados"
    },
    {
      icon: <Clock className="w-5 h-5" />,
      title: "Disponível 24/7",
      description: "Estamos sempre prontos para ajudar"
    },
    {
      icon: <Users className="w-5 h-5" />,
      title: "Atendimento Personalizado",
      description: "Soluções sob medida para você"
    }
  ];

  return (
    <AffiliateLayout activeSection="support">
      <div className="container mx-auto px-4 py-4 md:py-6 max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 md:mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl md:text-3xl font-bold text-white flex items-center gap-2 md:gap-3">
                <div className="p-2.5 md:p-3 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-xl">
                  <SiWhatsapp className="w-5 h-5 md:w-6 md:h-6 text-green-400" />
                </div>
                Suporte via WhatsApp
              </h1>
              <p className="text-xs md:text-sm text-gray-400 mt-1">
                Atendimento rápido e personalizado para afiliados
              </p>
            </div>
          </div>
        </motion.div>

        {/* Main WhatsApp Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="mb-4 md:mb-6"
        >
          <Card className="bg-gradient-to-br from-zinc-900/95 to-black/95 border-zinc-800 backdrop-blur-xl overflow-hidden">
            <div className="relative">
              {/* Decorative gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent" />
              
              <div className="relative p-4 md:p-8">
                <div className="flex flex-col lg:flex-row items-center gap-4 md:gap-8">
                  {/* WhatsApp Logo and Number */}
                  <div className="flex-1 text-center lg:text-left">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200 }}
                      className="inline-block mb-3 md:mb-6"
                    >
                      <div className="p-4 md:p-6 bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-full">
                        <SiWhatsapp className="w-12 h-12 md:w-20 md:h-20 text-green-400" />
                      </div>
                    </motion.div>
                    
                    <h2 className="text-lg md:text-2xl font-bold text-white mb-2">
                      Fale Conosco pelo WhatsApp
                    </h2>
                    
                    <div className="flex items-center justify-center lg:justify-start gap-2 md:gap-3 mb-3 md:mb-6">
                      <Smartphone className="w-4 h-4 md:w-5 md:h-5 text-green-400" />
                      <span className="text-xl md:text-3xl font-bold text-white">
                        {formattedNumber}
                      </span>
                    </div>
                    
                    <p className="text-xs md:text-sm text-gray-400 mb-4 md:mb-8 max-w-md mx-auto lg:mx-0">
                      Nossa equipe especializada está pronta para ajudar você com todas as suas dúvidas sobre o programa de afiliados.
                    </p>
                    
                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-2 md:gap-3 justify-center lg:justify-start">
                      <Button
                        onClick={openWhatsApp}
                        className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold px-4 md:px-6 py-3 md:py-6 text-sm md:text-lg shadow-lg rounded-xl"
                      >
                        <SiWhatsapp className="w-5 h-5 mr-2" />
                        Iniciar Conversa
                      </Button>
                      
                      <Button
                        onClick={copyToClipboard}
                        variant="outline"
                        className="border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 px-4 md:px-6 py-3 md:py-6 rounded-xl"
                      >
                        <Copy className="w-5 h-5 mr-2" />
                        Copiar Número
                      </Button>
                    </div>
                  </div>
                  
                  {/* QR Code Section */}
                  <div className="flex-shrink-0">
                    <div className="bg-white p-3 md:p-4 rounded-xl md:rounded-2xl shadow-2xl">
                      <div className="p-2 bg-gradient-to-br from-green-100 to-green-50 rounded-xl">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`https://wa.me/55${whatsappNumber}`)}`}
                          alt="WhatsApp QR Code"
                          className="w-40 h-40"
                        />
                      </div>
                      <p className="text-center text-sm text-gray-600 mt-2 font-medium">
                        Escaneie para conversar
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="h-full"
            >
              <Card className="bg-gradient-to-br from-gray-900/95 to-gray-950/95 backdrop-blur-xl border-gray-800 p-4 md:p-6 hover:border-green-500/30 transition-all h-full rounded-xl md:rounded-2xl">
                <div className="flex flex-col items-center text-center gap-2 md:gap-3 h-full">
                  <div className="p-2.5 md:p-3 bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-xl">
                    {feature.icon}
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <h3 className="text-sm md:text-base font-semibold text-white mb-1 md:mb-2">{feature.title}</h3>
                    <p className="text-xs md:text-sm text-gray-400">{feature.description}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Contact Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-center"
        >
          <div className="inline-flex items-center gap-2 px-3 md:px-4 py-2 bg-green-500/10 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-400" />
            <span className="text-xs md:text-sm text-gray-300">
              Atendimento disponível 24/7 via WhatsApp
            </span>
          </div>
        </motion.div>
      </div>
    </AffiliateLayout>
  );
}