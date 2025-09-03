import { MobileLayout } from "@/components/mobile-layout";
import { useLocation } from "wouter";
import {
  ChevronRight,
  MessageCircle,
  HelpCircle,
  CreditCard,
  Gift,
  Shield,
  Clock,
  Trophy,
  Smartphone,
  Users,
  Dices,
  DollarSign,
  Crown,
} from "lucide-react";
import { useState } from "react";

export function Ajuda() {
  const [, setLocation] = useLocation();
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  const helpTopics = [
    {
      id: "deposito",
      icon: CreditCard,
      title: "Como fazer um depósito?",
      content: [
        "1. Clique no botão PIX no menu inferior",
        "2. Selecione 'Depositar'",
        "3. Escolha o valor desejado",
        "4. Copie o código PIX ou escaneie o QR Code",
        "5. Faça o pagamento e aguarde a confirmação automática",
      ],
    },
    {
      id: "saque",
      icon: Gift,
      title: "Como solicitar um saque?",
      content: [
        "1. Acesse sua carteira no menu inferior",
        "2. Clique em 'Sacar'",
        "3. Insira o valor e sua chave PIX",
        "4. Confirme a solicitação",
        "5. Aguarde o processamento",
      ],
    },
    {
      id: "jogos",
      icon: Trophy,
      title: "Como funcionam os jogos?",
      content: [
        "Raspe os 9 quadradinhos do jogo, encontre 3 prêmios iguais para ganhar",
      ],
    },
    {
      id: "bonus",
      icon: Gift,
      title: "Como funciona o bônus?",
      content: [
        "• Ganhe Mania Bônus girando a roleta diária",
        "• Ou ganhe fazendo depositos",
        "• Jogue para virar saldo real",
      ],
    },
    {
      id: "giro-diario",
      icon: Trophy,
      title: "Como funciona o Giro Diário?",
      content: [
        "• Ganhe Mania Bônus todos os dias",
        "• Quantidade de prêmios aumenta com seu nível:",
        "  - Bronze (2-24): 2-8 Mania Bônus",
        "  - Prata (25-49): 5-25 Mania Bônus",
        "  - Ouro (50-74): 10-50 Mania Bônus",
        "  - Platina (75-99): 25-100 Mania Bônus",
        "  - Diamante (100+): 50-200 Mania Bônus",
        "• Gire a roleta uma vez por dia",
        "• Prêmios são adicionados instantaneamente",
      ],
    },
    {
      id: "cashback",
      icon: DollarSign,
      title: "Como funciona o Cashback?",
      content: [
        "• Receba parte das suas perdas de volta diariamente",
        "• Porcentagem aumenta com seu nível:",
        "  - Bronze: 1.5% de cashback",
        "  - Prata: 3% de cashback",
        "  - Ouro: 6% de cashback",
        "  - Platina: 12% de cashback",
        "  - Diamante: 24% de cashback",
        "• Calculado sobre jogos não premiados",
        "• Processado automaticamente às 00:00",
        "• Mínimo de R$ 0,50 para receber",
        "• Resgate diretamente na página de Recompensas",
      ],
    },
    {
      id: "beneficios-rank",
      icon: Crown,
      title: "Quais são os Benefícios por Rank?",
      content: [
        "• Bronze (Nível 2): Resgate 5 Mania Bônus",
        "• Prata (Nível 25): Resgate 25 Mania Bônus",
        "• Ouro (Nível 50): Resgate 75 Mania Bônus",
        "• Platina (Nível 75): Resgate 200 Mania Bônus",
        "• Diamante (Nível 100): Resgate 600 Mania Bônus",
        "",
        "Cada rank também oferece:",
        "• Maior cashback diário",
        "• Mais Mania Bônus no giro diário",
        "• Status VIP exclusivo",
        "• Resgate único ao atingir o nível",
      ],
    },
    {
      id: "seguranca",
      icon: Shield,
      title: "É seguro jogar aqui?",
      content: [
        "• Pagamentos via PIX protegidos",
        "• Dados criptografados",
        "• Jogo responsável",
        "• Suporte 24/7",
      ],
    },
    {
      id: "tempo",
      icon: Clock,
      title: "Quanto tempo leva o saque?",
      content: [
        "• Processamento: até 24h úteis",
        "• PIX: instantâneo após aprovação",
        "• Finais de semana podem demorar mais",
        "• Acompanhe o status na sua carteira",
      ],
    },
    {
      id: "premios",
      icon: Trophy,
      title: "Como recebo os Prêmios?",
      content: [
        "• Todos os prêmios são convertidos em saldo real",
        "• O valor do prêmio é creditado automaticamente",
        "• Saldo disponível para saque imediato via PIX",
        "• Não enviamos produtos físicos",
        "• 100% do valor do prêmio vira saldo na sua conta",
      ],
    },
    {
      id: "indique",
      icon: Users,
      title: "Como funciona o Indique e Ganhe?",
      content: [
        "• Acesse a página Indicar no menu inferior",
        "• Compartilhe seu link de convite com amigos",
        "• Ganhe R$ 10,00 de comissão por indicação",
        "• Comissão creditada instantaneamente",
        "• Sem limite de indicações ou ganhos",
        "• Acompanhe seus ganhos em tempo real",
        "• Saldo disponível para saque imediato",
      ],
    },
    {
      id: "roleta",
      icon: Dices,
      title: "Como funciona a Roleta Grátis Diária?",
      content: [
        "• Acesse a página Prêmios no menu inferior",
        "• Gire a roleta uma vez por dia gratuitamente",
        "• Ganhe entre 1 a 10 Mania Bônus",
        "• Nova chance disponível a cada 24 horas",
        "• Prêmios creditados automaticamente",
        "• Use os Mania Bônus para ganhar saldo real",
        "• Acompanhe o tempo para o próximo giro",
      ],
    },
  ];

  const toggleTopic = (topicId: string) => {
    setExpandedTopic(expandedTopic === topicId ? null : topicId);
  };

  return (
    <MobileLayout>
      <div className="min-h-screen pb-24">
        <div className="px-4 py-6 md:px-6 md:py-8 max-w-4xl mx-auto space-y-6 md:space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl md:text-4xl font-bold text-white">Central de Ajuda</h1>
            <p className="text-gray-400 text-sm md:text-base">
              Encontre respostas rápidas para suas dúvidas
            </p>
          </div>

          {/* Help Topics */}
          <div className="space-y-3 md:space-y-4">
            {helpTopics.map((topic) => {
              const Icon = topic.icon;
              const isExpanded = expandedTopic === topic.id;

              return (
                <div
                  key={topic.id}
                  className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-gray-700 overflow-hidden transition-all duration-300"
                >
                  <button
                    onClick={() => toggleTopic(topic.id)}
                    className="w-full px-4 py-4 md:px-6 md:py-5 flex items-center justify-between hover:bg-white/5 transition-colors duration-200"
                  >
                    <div className="flex items-center gap-3 md:gap-4">
                      <div
                        className={`w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center transition-all duration-300 ${
                          isExpanded
                            ? "bg-gradient-to-br from-[#00E880] to-[#00D470] shadow-lg shadow-[#00E880]/30"
                            : "bg-gray-800"
                        }`}
                      >
                        <Icon
                          className={`w-5 h-5 md:w-6 md:h-6 transition-colors duration-300 ${
                            isExpanded ? "text-black" : "text-[#00E880]"
                          }`}
                        />
                      </div>
                      <span className="text-white font-medium text-left md:text-lg">
                        {topic.title}
                      </span>
                    </div>
                    <ChevronRight
                      className={`w-5 h-5 md:w-6 md:h-6 text-gray-400 transition-transform duration-300 ${
                        isExpanded ? "rotate-90" : ""
                      }`}
                    />
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 md:px-6 md:pb-6 animate-slideDown">
                      <div className="ml-13 md:ml-16 space-y-2 md:space-y-3">
                        {topic.content.map((item, index) => (
                          <p
                            key={index}
                            className="text-gray-300 text-sm md:text-base leading-relaxed"
                          >
                            {item}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Humanized Support Button */}
          <div className="mt-12 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-gray-700 p-6 md:p-8">
            <div className="text-center space-y-4 md:space-y-6">
              <div className="flex justify-center">
                <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-[#00E880]/20 to-[#00D470]/20 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-10 h-10 md:w-12 md:h-12 text-[#00E880]" />
                </div>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white">
                Ainda precisa de ajuda?
              </h2>
              <p className="text-gray-400 text-sm md:text-base">
                Nossa equipe está pronta para te atender!
                <br />
                Fale com um de nossos especialistas agora mesmo.
              </p>
              <button
                onClick={() => setLocation("/support")}
                className="bg-gradient-to-r from-[#00E880] to-[#00D470] text-black font-bold py-3 px-8 md:py-4 md:px-10 md:text-lg rounded-xl hover:scale-105 transform transition-all duration-300 shadow-lg hover:shadow-[#00E880]/50"
              >
                Falar com Suporte
              </button>
            </div>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
