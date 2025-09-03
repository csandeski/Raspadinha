import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  HelpCircle,
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Link2,
  Users,
  DollarSign,
  Wallet,
  BarChart3,
  MessageSquare,
  Download,
  Settings,
  Target,
  Sparkles,
  PlayCircle,
  BookOpen
} from "lucide-react";

interface TutorialStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: string;
  tip?: string;
}

export function AffiliateTutorial() {
  const [showTutorial, setShowTutorial] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(false);

  // Check if user has seen tutorial before
  useEffect(() => {
    const seen = localStorage.getItem("affiliateTutorialSeen");
    if (!seen) {
      // Show tutorial automatically for new users
      setTimeout(() => setShowTutorial(true), 2000);
    } else {
      setHasSeenTutorial(true);
    }
  }, []);

  const tutorialSteps: TutorialStep[] = [
    {
      id: 0,
      title: "Bem-vindo ao Painel de Afiliados!",
      description: "Vamos te ajudar a começar a ganhar dinheiro com o Mania Brasil. Este tutorial rápido vai te mostrar tudo que você precisa saber.",
      icon: <Sparkles className="w-6 h-6" />,
      tip: "Leva apenas 2 minutos para aprender tudo!"
    },
    {
      id: 1,
      title: "Passo 1: Crie seus Links",
      description: "Vá em 'Links' no menu lateral. Lá você pode criar links personalizados com UTM para rastrear de onde vêm seus cliques. Cada link tem um QR Code próprio!",
      icon: <Link2 className="w-6 h-6" />,
      action: "Criar primeiro link",
      tip: "Use nomes descritivos como 'Instagram Stories' ou 'WhatsApp Status'"
    },
    {
      id: 2,
      title: "Passo 2: Compartilhe e Divulgue",
      description: "Compartilhe seus links nas redes sociais, WhatsApp, Telegram, etc. Quanto mais pessoas clicarem e se cadastrarem, mais você ganha!",
      icon: <Users className="w-6 h-6" />,
      tip: "Posts com vídeos de grandes prêmios convertem 3x mais!"
    },
    {
      id: 3,
      title: "Passo 3: Acompanhe sua Rede",
      description: "Em 'Rede' você vê todos que se cadastraram com seu link. Veja quando fazem depósitos e quanto você vai ganhar de comissão.",
      icon: <Target className="w-6 h-6" />,
      tip: "Pessoas que depositam nas primeiras 24h têm maior valor vitalício"
    },
    {
      id: 4,
      title: "Passo 4: Ganhe Comissões",
      description: "Você ganha comissão sobre TODOS os depósitos dos seus indicados! Sua taxa de comissão aumenta conforme você sobe de nível (até 70% no Diamante!).",
      icon: <DollarSign className="w-6 h-6" />,
      tip: "Foque em qualidade: 10 jogadores ativos valem mais que 100 inativos"
    },
    {
      id: 5,
      title: "Passo 5: Solicite Saques",
      description: "Quando tiver saldo disponível, vá em 'Saques' e solicite via PIX. Após aprovação, o dinheiro cai na hora na sua conta!",
      icon: <Wallet className="w-6 h-6" />,
      action: "Ver saques",
      tip: "Saques são processados em até 24h úteis"
    },
    {
      id: 6,
      title: "Dicas de Ouro para o Sucesso",
      description: "1. Use os materiais prontos em 'Materiais'\n2. Poste regularmente (3x por semana)\n3. Foque em grupos de apostas\n4. Use stories com urgência\n5. Monitore seus relatórios",
      icon: <BookOpen className="w-6 h-6" />,
      tip: "Afiliados top faturam R$ 50.000+ por mês!"
    },
    {
      id: 7,
      title: "Suporte Sempre Disponível",
      description: "Dúvidas? Use o chat em 'Suporte'. Nossa equipe responde rápido e está aqui para ajudar você a ter sucesso!",
      icon: <MessageSquare className="w-6 h-6" />,
      action: "Abrir suporte",
      tip: "Resposta média em menos de 2 horas"
    }
  ];

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCompletedSteps([...completedSteps, currentStep]);
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = () => {
    localStorage.setItem("affiliateTutorialSeen", "true");
    setHasSeenTutorial(true);
    setShowTutorial(false);
    setCompletedSteps([]);
    setCurrentStep(0);
  };

  const handleSkip = () => {
    localStorage.setItem("affiliateTutorialSeen", "true");
    setHasSeenTutorial(true);
    setShowTutorial(false);
  };

  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;
  const step = tutorialSteps[currentStep];

  return (
    <>
      {/* Help Button - Always visible */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
        className="fixed bottom-6 right-6 z-40"
      >
        <Button
          onClick={() => setShowTutorial(true)}
          className="group relative bg-gradient-to-r from-[#00E880] to-emerald-500 hover:from-[#00E880] hover:to-emerald-400 text-black rounded-full p-3 shadow-lg shadow-[#00E880]/25 hover:shadow-[#00E880]/40 transition-all"
        >
          {hasSeenTutorial ? (
            <HelpCircle className="w-5 h-5" />
          ) : (
            <PlayCircle className="w-5 h-5 animate-pulse" />
          )}
          
          {!hasSeenTutorial && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          )}
          
          <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            {hasSeenTutorial ? "Abrir Tutorial" : "Começar Tutorial"}
          </div>
        </Button>
      </motion.div>

      {/* Tutorial Modal */}
      <AnimatePresence>
        {showTutorial && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) handleSkip();
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-lg w-full"
            >
              <Card className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 p-6">
                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400">
                      Passo {currentStep + 1} de {tutorialSteps.length}
                    </span>
                    <button
                      onClick={handleSkip}
                      className="text-gray-400 hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <Progress value={progress} className="h-1" />
                </div>

                {/* Step Content */}
                <div className="space-y-4">
                  {/* Icon and Title */}
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-[#00E880]/20 to-[#00E880]/5 rounded-xl border border-[#00E880]/20">
                      {step.icon}
                    </div>
                    <h3 className="text-xl font-bold text-white">
                      {step.title}
                    </h3>
                  </div>

                  {/* Description */}
                  <p className="text-gray-300 whitespace-pre-line">
                    {step.description}
                  </p>

                  {/* Tip Box */}
                  {step.tip && (
                    <div className="p-3 bg-[#00E880]/10 rounded-lg border border-[#00E880]/20">
                      <p className="text-sm text-[#00E880] flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        <span className="font-medium">Dica:</span> {step.tip}
                      </p>
                    </div>
                  )}

                  {/* Action Button */}
                  {step.action && (
                    <Button
                      variant="outline"
                      className="w-full border-[#00E880]/50 hover:border-[#00E880] hover:bg-[#00E880]/10 text-[#00E880]"
                    >
                      {step.action}
                    </Button>
                  )}
                </div>

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between mt-6">
                  <Button
                    variant="ghost"
                    onClick={handlePrevious}
                    disabled={currentStep === 0}
                    className="text-gray-400 hover:text-white disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Anterior
                  </Button>

                  <div className="flex items-center gap-2">
                    {tutorialSteps.map((_, index) => (
                      <div
                        key={index}
                        className={`w-2 h-2 rounded-full transition-all ${
                          index === currentStep
                            ? "w-6 bg-[#00E880]"
                            : index < currentStep
                            ? "bg-[#00E880]/50"
                            : "bg-gray-600"
                        }`}
                      />
                    ))}
                  </div>

                  {currentStep === tutorialSteps.length - 1 ? (
                    <Button
                      onClick={handleFinish}
                      className="bg-gradient-to-r from-[#00E880] to-emerald-500 hover:from-[#00E880] hover:to-emerald-400 text-black"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Concluir
                    </Button>
                  ) : (
                    <Button
                      onClick={handleNext}
                      className="bg-gradient-to-r from-[#00E880] to-emerald-500 hover:from-[#00E880] hover:to-emerald-400 text-black"
                    >
                      Próximo
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}