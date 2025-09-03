import { MobileLayout } from "@/components/mobile-layout";
import {
  FileText,
  Shield,
  AlertCircle,
  UserCheck,
  CreditCard,
  Ban,
  Scale,
  Clock,
} from "lucide-react";
import { useState } from "react";

export function Termos() {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const termsSection = [
    {
      id: "aceitacao",
      icon: UserCheck,
      title: "1. Aceitação dos Termos",
      content: [
        "Ao acessar e usar a plataforma Mania Brasil, você concorda com estes termos de uso.",
        "Se você não concordar com algum dos termos, não deve utilizar nossos serviços.",
        "Reservamos o direito de atualizar estes termos a qualquer momento.",
      ],
    },
    {
      id: "elegibilidade",
      icon: Shield,
      title: "2. Elegibilidade",
      content: [
        "Você deve ter pelo menos 18 anos de idade para usar nossos serviços.",
        "É de sua responsabilidade garantir que o uso da plataforma é legal em sua jurisdição.",
        "Você deve fornecer informações verdadeiras e precisas durante o cadastro.",
      ],
    },
    {
      id: "conta",
      icon: UserCheck,
      title: "3. Conta do Usuário",
      content: [
        "Você é responsável por manter a confidencialidade de sua senha.",
        "Cada usuário pode ter apenas uma conta ativa.",
        "Contas duplicadas serão suspensas sem aviso prévio.",
        "Você é responsável por todas as atividades realizadas em sua conta.",
      ],
    },
    {
      id: "pagamentos",
      icon: CreditCard,
      title: "4. Pagamentos e Saques",
      content: [
        "Todos os depósitos são processados via PIX.",
        "O valor mínimo para depósito é R$ 15,00.",
        "Saques são processados em até 24 horas úteis.",
        "A chave PIX para saque deve estar em seu nome.",
        "Não cobramos taxas para depósitos ou saques.",
      ],
    },
    {
      id: "jogos",
      icon: FileText,
      title: "5. Regras dos Jogos",
      content: [
        "Todos os jogos são baseados em aleatoriedade e sorte.",
        "Os resultados são gerados por algoritmos certificados.",
        "Não é possível cancelar uma aposta após confirmação.",
        "Ganhos são creditados automaticamente em sua conta.",
      ],
    },
    {
      id: "proibicoes",
      icon: Ban,
      title: "6. Condutas Proibidas",
      content: [
        "Usar software de automação ou bots.",
        "Tentar manipular ou fraudar o sistema.",
        "Criar múltiplas contas.",
        "Usar informações falsas ou de terceiros.",
        "Compartilhar ou vender sua conta.",
      ],
    },
    {
      id: "responsabilidade",
      icon: AlertCircle,
      title: "7. Jogo Responsável",
      content: [
        "Jogue com moderação e dentro de seus limites.",
        "Estabeleça limites de tempo e dinheiro.",
        "Nunca jogue sob efeito de álcool ou drogas.",
        "Se sentir que está perdendo o controle, procure ajuda.",
      ],
    },
    {
      id: "privacidade",
      icon: Shield,
      title: "8. Privacidade e Dados",
      content: [
        "Seus dados são protegidos conforme nossa Política de Privacidade.",
        "Não compartilhamos suas informações com terceiros.",
        "Usamos criptografia para proteger suas transações.",
        "Você pode solicitar a exclusão de seus dados a qualquer momento.",
      ],
    },
    {
      id: "limitacao",
      icon: Scale,
      title: "9. Limitação de Responsabilidade",
      content: [
        "A plataforma é fornecida 'como está'.",
        "Não garantimos disponibilidade ininterrupta do serviço.",
        "Não nos responsabilizamos por perdas decorrentes do uso da plataforma.",
        "Nossa responsabilidade é limitada ao valor depositado em sua conta.",
      ],
    },
    {
      id: "encerramento",
      icon: Clock,
      title: "10. Encerramento de Conta",
      content: [
        "Você pode encerrar sua conta a qualquer momento.",
        "Reservamos o direito de suspender contas que violem estes termos.",
        "Saldos de contas encerradas serão devolvidos via PIX.",
        "O encerramento não exime de responsabilidades anteriores.",
      ],
    },
  ];

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  return (
    <MobileLayout>
      <div className="min-h-screen pb-24">
        <div className="px-4 py-6 md:px-6 md:py-8 max-w-4xl mx-auto space-y-6 md:space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl md:text-4xl font-bold text-white">Termos de Uso</h1>
            <p className="text-gray-400 text-sm md:text-base">
              Última atualização: Janeiro 2025
            </p>
          </div>

          {/* Intro */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-gray-700 p-4 md:p-6">
            <p className="text-gray-300 text-sm md:text-base leading-relaxed">
              Bem-vindo à Mania Brasil! Estes termos de uso regulam o acesso e uso de nossa plataforma de jogos online. Por favor, leia com atenção.
            </p>
          </div>

          {/* Terms Sections */}
          <div className="space-y-3 md:space-y-4">
            {termsSection.map((section) => {
              const Icon = section.icon;
              const isExpanded = expandedSection === section.id;

              return (
                <div
                  key={section.id}
                  className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-gray-700 overflow-hidden transition-all duration-300"
                >
                  <button
                    onClick={() => toggleSection(section.id)}
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
                        {section.title}
                      </span>
                    </div>
                    <div
                      className={`transform transition-transform duration-300 ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    >
                      <svg
                        className="w-5 h-5 md:w-6 md:h-6 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 md:px-6 md:pb-6 animate-slideDown">
                      <div className="ml-13 md:ml-16 space-y-2 md:space-y-3">
                        {section.content.map((item, index) => (
                          <p
                            key={index}
                            className="text-gray-300 text-sm md:text-base leading-relaxed flex items-start"
                          >
                            <span className="text-[#00E880] mr-2">•</span>
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

          {/* Contact Section */}
          <div className="mt-8 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="text-center space-y-3">
              <h2 className="text-lg font-bold text-white">
                Dúvidas sobre os termos?
              </h2>
              <p className="text-gray-400 text-sm">
                Entre em contato com nosso suporte para esclarecimentos.
              </p>
              <a
                href="/support"
                className="inline-block mt-3 px-6 py-3 bg-[#00E880] hover:bg-[#00D470] text-black font-bold rounded-lg transition-colors"
              >
                Acessar Suporte
              </a>
            </div>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}