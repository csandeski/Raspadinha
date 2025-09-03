import { MobileLayout } from "@/components/mobile-layout";
import {
  Shield,
  Lock,
  Eye,
  Database,
  UserX,
  Bell,
  Globe,
  AlertTriangle,
} from "lucide-react";
import { useState } from "react";

export function Privacidade() {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const privacySections = [
    {
      id: "coleta",
      icon: Database,
      title: "1. Informações que Coletamos",
      content: [
        "Nome completo",
        "E-mail e número de telefone",
        "Endereço IP e dados de navegação",
        "Histórico de jogos e transações",
        "Informações do dispositivo utilizado",
      ],
    },
    {
      id: "uso",
      icon: Eye,
      title: "2. Como Usamos suas Informações",
      content: [
        "Para criar e gerenciar sua conta",
        "Processar depósitos e saques via PIX",
        "Enviar notificações sobre sua conta",
        "Prevenir fraudes e atividades suspeitas",
        "Melhorar nossos serviços e experiência",
        "Cumprir obrigações legais e regulatórias",
      ],
    },
    {
      id: "protecao",
      icon: Lock,
      title: "3. Proteção de Dados",
      content: [
        "Utilizamos criptografia SSL em todas as transações",
        "Senhas são armazenadas com hash seguro",
        "Acesso restrito aos dados pessoais",
        "Monitoramento constante contra invasões",
        "Backups regulares em servidores seguros",
        "Conformidade com a LGPD brasileira",
      ],
    },
    {
      id: "compartilhamento",
      icon: Globe,
      title: "4. Compartilhamento de Informações",
      content: [
        "Não vendemos seus dados pessoais",
        "Compartilhamos apenas com processadores de pagamento",
        "Podemos divulgar se exigido por lei",
        "Parceiros recebem apenas dados necessários",
        "Você será notificado de qualquer compartilhamento",
      ],
    },
    {
      id: "cookies",
      icon: Database,
      title: "5. Cookies e Tecnologias",
      content: [
        "Usamos cookies para melhorar sua experiência",
        "Cookies de sessão para manter você conectado",
        "Cookies analíticos para entender o uso",
        "Você pode desabilitar cookies no navegador",
        "Alguns recursos podem não funcionar sem cookies",
      ],
    },
    {
      id: "direitos",
      icon: UserX,
      title: "6. Seus Direitos",
      content: [
        "Acessar todos os seus dados pessoais",
        "Corrigir informações incorretas",
        "Solicitar exclusão de dados",
        "Portabilidade dos dados",
        "Revogar consentimento a qualquer momento",
        "Fazer reclamação à ANPD",
      ],
    },
    {
      id: "retencao",
      icon: Bell,
      title: "7. Retenção de Dados",
      content: [
        "Mantemos dados enquanto a conta estiver ativa",
        "Histórico financeiro por 5 anos (obrigação legal)",
        "Dados deletados após solicitação, exceto obrigações legais",
        "Backups podem reter dados por até 90 dias",
        "Logs de segurança mantidos por 1 ano",
      ],
    },
    {
      id: "menores",
      icon: AlertTriangle,
      title: "8. Menores de Idade",
      content: [
        "Nossos serviços são apenas para maiores de 18 anos",
        "Não coletamos intencionalmente dados de menores",
        "Contas de menores serão encerradas imediatamente",
        "Pais podem solicitar exclusão de dados de menores",
      ],
    },
    {
      id: "alteracoes",
      icon: Bell,
      title: "9. Alterações na Política",
      content: [
        "Podemos atualizar esta política periodicamente",
        "Você será notificado de mudanças significativas",
        "A data de última atualização será sempre visível",
        "Uso contínuo implica aceitação das mudanças",
      ],
    },
    {
      id: "contato",
      icon: Shield,
      title: "10. Contato e DPO",
      content: [
        "Encarregado de Proteção de Dados disponível",
        "Acesse nosso suporte para questões de privacidade",
        "Resposta em até 48 horas úteis",
        "Canal dedicado para questões de privacidade",
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
            <h1 className="text-2xl md:text-4xl font-bold text-white">Política de Privacidade</h1>
            <p className="text-gray-400 text-sm md:text-base">
              Última atualização: Janeiro 2025
            </p>
          </div>

          {/* Intro */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-gray-700 p-4 md:p-6">
            <p className="text-gray-300 text-sm md:text-base leading-relaxed">
              A Mania Brasil valoriza sua privacidade e está comprometida em proteger seus dados pessoais. Esta política explica como coletamos, usamos e protegemos suas informações.
            </p>
          </div>

          {/* Privacy Sections */}
          <div className="space-y-3 md:space-y-4">
            {privacySections.map((section) => {
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

          {/* LGPD Notice */}
          <div className="mt-8 bg-gradient-to-br from-[#00E880]/10 to-[#00D470]/10 rounded-xl border border-[#00E880]/30 p-6 md:p-8">
            <div className="flex items-start gap-3 md:gap-4">
              <Shield className="w-6 h-6 md:w-8 md:h-8 text-[#00E880] flex-shrink-0 mt-1" />
              <div className="space-y-2">
                <h3 className="text-white font-bold md:text-xl">Conformidade com a LGPD</h3>
                <p className="text-gray-300 text-sm md:text-base leading-relaxed">
                  Esta política está em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018). 
                  Garantimos todos os direitos previstos na legislação brasileira de proteção de dados.
                </p>
              </div>
            </div>
          </div>

          {/* Contact Section */}
          <div className="mt-8 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-gray-700 p-6 md:p-8">
            <div className="text-center space-y-3 md:space-y-4">
              <h2 className="text-lg md:text-2xl font-bold text-white">
                Dúvidas sobre privacidade?
              </h2>
              <p className="text-gray-400 text-sm md:text-base">
                Entre em contato com nosso Encarregado de Proteção de Dados.
              </p>
              <a
                href="/support"
                className="inline-block mt-3 px-6 py-3 md:px-8 md:py-4 bg-[#00E880] hover:bg-[#00D470] text-black font-bold md:text-lg rounded-lg transition-colors"
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