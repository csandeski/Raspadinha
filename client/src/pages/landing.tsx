import { useLocation } from "wouter";
import { useState } from "react";
import logoImg from "/logos/logomania.svg";
import { Button } from "@/components/ui/button";
import pixIcon from "/icons/pix.png";
import { HomeBanners } from "@/components/home-banners";

export default function Landing() {
  const [, setLocation] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState("Destaque");

  return (
    <div className="min-h-screen bg-[#0E1015] text-white pb-20 md:pb-0" style={{
      backgroundImage: `
        linear-gradient(rgba(255, 255, 255, 0.015) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.015) 1px, transparent 1px)
      `,
      backgroundSize: '8px 8px'
    }}>
      {/* Mobile Top Bar */}
      <div className="md:hidden bg-[#00E880] text-black px-4 py-2 flex items-center justify-between text-sm">
        <div className="flex items-center space-x-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17,19H7V5H17M17,1H7C5.89,1 5,1.89 5,3V21A2,2 0 0,0 7,23H17A2,2 0 0,0 19,21V3C19,1.89 18.1,1 17,1Z"/>
          </svg>
          <div className="flex flex-col">
            <span className="font-medium text-sm">Baixe nosso app</span>
            <span className="text-xs opacity-80">E ganhe muitos pontos!</span>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button className="bg-black text-white px-3 py-1 rounded text-xs font-medium flex items-center space-x-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"/>
            </svg>
            <span>Baixar</span>
          </button>
          <button className="text-black">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
            </svg>
          </button>
        </div>
      </div>
      {/* Header */}
      <header className="bg-[#0E1015] border-b border-gray-600/20">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between px-4 md:px-8 py-4">
            <div className="flex items-center space-x-8">
              <img 
                src={logoImg} 
                alt="Mania Brasil Logo" 
                className="h-8"
              />
              
            </div>
            
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setLocation("/register")}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-white hover:text-gray-300 transition-colors border border-gray-600/30 rounded-lg text-sm"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
                <span>Cadastrar</span>
              </button>
              <button 
                onClick={() => setLocation("/login")}
                className="flex items-center space-x-1.5 bg-[#00E880] hover:bg-[#00D470] px-3 py-1.5 rounded-lg font-medium transition-colors text-black text-sm"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"/>
                </svg>
                <span>Entrar</span>
              </button>
            </div>
          </div>
        </div>
      </header>
      <div className="max-w-7xl mx-auto">
        {/* Hero Banners Carousel */}
        <section className="mb-6 md:mb-8">
          <HomeBanners />
        </section>

        {/* Game Categories */}
        <section className="px-4 md:px-8">
        {/* Category Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide pb-1" style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
          <button 
            onClick={() => setSelectedCategory("Destaque")}
            className={`px-4 py-2 rounded-full font-medium transition-colors text-sm whitespace-nowrap flex-shrink-0 ${
              selectedCategory === "Destaque" 
                ? "bg-[#00E880] text-black" 
                : "bg-gray-700 text-white hover:bg-gray-600"
            }`}
          >
            Destaque
          </button>
          <button 
            onClick={() => setSelectedCategory("PIX na Conta")}
            className={`px-4 py-2 rounded-full font-medium transition-colors text-sm whitespace-nowrap flex-shrink-0 ${
              selectedCategory === "PIX na Conta" 
                ? "bg-[#00E880] text-black" 
                : "bg-gray-700 text-white hover:bg-gray-600"
            }`}
          >
            PIX na Conta
          </button>
          <button 
            onClick={() => setSelectedCategory("Eletrônico")}
            className={`px-4 py-2 rounded-full font-medium transition-colors text-sm whitespace-nowrap flex-shrink-0 ${
              selectedCategory === "Eletrônico" 
                ? "bg-[#00E880] text-black" 
                : "bg-gray-700 text-white hover:bg-gray-600"
            }`}
          >
            Eletrônico
          </button>
          <button 
            onClick={() => setSelectedCategory("Veículo")}
            className={`px-4 py-2 rounded-full font-medium transition-colors text-sm whitespace-nowrap flex-shrink-0 ${
              selectedCategory === "Veículo" 
                ? "bg-[#00E880] text-black" 
                : "bg-gray-700 text-white hover:bg-gray-600"
            }`}
          >
            Veículo
          </button>
          <button 
            onClick={() => setSelectedCategory("Cosméticos")}
            className={`px-4 py-2 rounded-full font-medium transition-colors text-sm whitespace-nowrap flex-shrink-0 ${
              selectedCategory === "Cosméticos" 
                ? "bg-[#00E880] text-black" 
                : "bg-gray-700 text-white hover:bg-gray-600"
            }`}
          >
            Cosméticos
          </button>
        </div>

        {/* Game Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 mb-12">
          {/* PIX na Conta */}
          <div className="cursor-pointer transform hover:scale-105 transition-transform relative">
            <div className="relative z-10">
              <div className="absolute top-3 right-3 bg-[#00E880] text-black px-2 py-1 rounded text-sm font-bold z-20">
                R$ 0,50
              </div>
              <img 
                src="https://raspadinhadasorte.site/images/raspadinhas/1752250181.webp"
                alt="PIX na conta"
                className="w-full h-32 object-cover rounded-t-xl relative z-10"
              />
            </div>
            <div className="bg-[#181a1f] rounded-b-xl -mt-16 pt-16">
              <div className="p-3 sm:p-4">
                <div className="space-y-2">
                  <h3 className="text-white font-bold text-base sm:text-lg">PIX na conta</h3>
                  <p className="text-yellow-400 text-xs sm:text-sm font-medium">PRÊMIOS ATÉ R$ 2000,00</p>
                  <p className="text-gray-300 text-xs leading-relaxed">
                    Raspe e receba prêmios em DINHEIRO $$$ até R$2 mil diretamente no seu PIX.
                  </p>
                  <button 
                    onClick={() => setLocation("/register")}
                    className="w-full bg-[#00E880] hover:bg-[#00D470] text-black font-bold py-2 text-sm rounded-lg transition-colors"
                  >
                    Jogar Raspadinha →
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sonho de Consumo */}
          <div className="cursor-pointer transform hover:scale-105 transition-transform relative">
            <div className="relative z-10">
              <div className="absolute top-3 right-3 bg-[#00E880] text-black px-2 py-1 rounded text-sm font-bold z-20">
                R$ 2,00
              </div>
              <img 
                src="https://raspadinhadasorte.site/images/raspadinhas/1752250248.webp"
                alt="Sonho de Consumo"
                className="w-full h-32 object-cover rounded-t-xl relative z-10"
              />
            </div>
            <div className="bg-[#181a1f] rounded-b-xl -mt-16 pt-16">
              <div className="p-4">
                <div className="space-y-2">
                  <h3 className="text-white font-bold text-lg">Sonho de Consumo 🤩</h3>
                  <p className="text-yellow-400 text-sm font-medium">PRÊMIOS ATÉ R$ 5000,00</p>
                  <p className="text-gray-300 text-xs">
                    Eletro, eletrônicos e componentes, receba prêmios exclusivos de alto valor como iPhone...
                  </p>
                  <button 
                    onClick={() => setLocation("/register")}
                    className="w-full bg-[#00E880] hover:bg-[#00D470] text-black font-bold py-2 rounded-lg transition-colors"
                  >
                    Jogar Raspadinha →
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Me mimei */}
          <div className="cursor-pointer transform hover:scale-105 transition-transform relative">
            <div className="relative z-10">
              <div className="absolute top-3 right-3 bg-[#00E880] text-black px-2 py-1 rounded text-sm font-bold z-20">
                R$ 2,50
              </div>
              <img 
                src="https://raspadinhadasorte.site/images/raspadinhas/1752253092.webp"
                alt="Me mimei"
                className="w-full h-32 object-cover rounded-t-xl relative z-10"
              />
            </div>
            <div className="bg-[#181a1f] rounded-b-xl -mt-16 pt-16">
              <div className="p-4">
                <div className="space-y-2">
                  <h3 className="text-white font-bold text-lg">Me mimei</h3>
                  <p className="text-yellow-400 text-sm font-medium">PRÊMIOS ATÉ R$ 1000,00</p>
                  <p className="text-gray-300 text-xs">
                    Shopee, shein, presentinhos... Quer se mimar mas ta muito caro? não se preocupe, é só dar...
                  </p>
                  <button 
                    onClick={() => setLocation("/register")}
                    className="w-full bg-[#00E880] hover:bg-[#00D470] text-black font-bold py-2 rounded-lg transition-colors"
                  >
                    Jogar Raspadinha →
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Super Prêmios */}
          <div className="cursor-pointer transform hover:scale-105 transition-transform relative">
            <div className="relative z-10">
              <div className="absolute top-3 right-3 bg-[#00E880] text-black px-2 py-1 rounded text-sm font-bold z-20">
                R$ 5,00
              </div>
              <img 
                src="https://raspadinhadasorte.site/images/raspadinhas/1752250498.webp"
                alt="Super Prêmios"
                className="w-full h-32 object-cover rounded-t-xl relative z-10"
              />
            </div>
            <div className="bg-[#181a1f] rounded-b-xl -mt-16 pt-16">
              <div className="p-4">
                <div className="space-y-2">
                  <h3 className="text-white font-bold text-lg">Super Prêmios</h3>
                  <p className="text-yellow-400 text-sm font-medium">PRÊMIOS ATÉ R$ 20000,00</p>
                  <p className="text-gray-300 text-xs">
                    Cansado de ficar a pé? Essa sua chance de sair motorizado, prêmios de até R$20.000
                  </p>
                  <button 
                    onClick={() => setLocation("/register")}
                    className="w-full bg-[#00E880] hover:bg-[#00D470] text-black font-bold py-2 rounded-lg transition-colors"
                  >
                    Jogar Raspadinha →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        </section>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0">
          <div className="relative">
            {/* Center Button - Positioned above the bar */}
            <div className="absolute left-1/2 transform -translate-x-1/2 -top-4 z-10">
              <button className="bg-[#00E880] rounded-full p-4 shadow-lg">
                <img src={pixIcon} alt="PIX" className="w-8 h-8" />
              </button>
            </div>
            
            {/* Navigation Bar - Full width, no margins */}
            <div className="w-full bg-[#0E1015] border-t border-gray-600/20 py-4 px-4 flex items-center justify-around">
              <button className="p-2">
                <svg className="w-6 h-6 text-[#00E880]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z"/>
                </svg>
              </button>
              
              <button className="p-2">
                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7,18C5.9,18 5,18.9 5,20S5.9,22 7,22 9,21.1 9,20 8.1,18 7,18M1,2V4H3L6.6,11.59L5.24,14.04C5.09,14.32 5,14.65 5,15A2,2 0 0,0 7,17H19V15H7.42A0.25,0.25 0 0,1 7.17,14.75C7.17,14.7 7.18,14.66 7.2,14.63L8.1,13H15.55C16.3,13 16.96,12.58 17.3,11.97L20.88,5H5.21L4.27,3H1M17,18C15.9,18 15,18.9 15,20S15.9,22 17,22 19,21.1 19,20 18.1,18 17,18Z"/>
                </svg>
              </button>
              
              {/* Empty space for center button */}
              <div className="w-16"></div>
              
              <button className="p-2">
                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12,15.39L8.24,17.66L9.23,13.38L5.91,10.5L10.29,10.13L12,6.09L13.71,10.13L18.09,10.5L14.77,13.38L15.76,17.66M22,9.24L14.81,8.63L12,2L9.19,8.63L2,9.24L7.45,13.97L5.82,21L12,17.27L18.18,21L16.54,13.97L22,9.24Z"/>
              </svg>
              </button>
              
              <button className="p-2">
                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="hidden md:block border-t border-gray-800 mt-16">
          <div className="px-8 py-12">
            <div className="flex justify-between">
              <div>
                <img 
                  src={logoImg} 
                  alt="Mania Brasil" 
                  className="h-10 mb-4"
                />
                <p className="text-gray-400 text-sm max-w-md">
                  Mania Brasil é a maior e melhor plataforma de jogos instantâneos do Brasil!
                </p>
                <p className="text-gray-500 text-xs mt-2">
                  © 2025 Mania Brasil. Todos os direitos reservados.
                </p>
              </div>
              
              <div className="grid grid-cols-3 gap-12 text-sm">
                <div>
                  <h4 className="text-white font-medium mb-3">Raspadinhas</h4>
                  <div className="space-y-2">
                    <p className="text-gray-400">Carrinho</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-white font-medium mb-3">Carteira</h4>
                  <div className="space-y-2">
                    <p className="text-gray-400">Depósito</p>
                    <p className="text-gray-400">Saques</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-white font-medium mb-3">Termos de Uso</h4>
                  <div className="space-y-2">
                    <p className="text-gray-400">Política de Privacidade</p>
                    <p className="text-gray-400">Termos de Bônus</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}