import { useState } from "react";
import { useLocation } from "wouter";
import { MobileLayout } from "@/components/mobile-layout";
import { ArrowLeft } from "lucide-react";
import { OnlineUsersCounter } from "@/components/online-users-counter";

// Import premio banners
import bannerPix from "/premios/banner-pix.webp";
import bannerMeMimei from "/premios/banner-me-mimei.webp";
import bannerEletronicos from "/premios/banner-eletronicos.webp";
import bannerSuperPremios from "/premios/banner-super-premios.webp";



export default function Games() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"raspadinhas">("raspadinhas");

  const raspadinhas = [
    {
      id: "pix",
      name: "Mania PIX na Conta",
      banner: bannerPix,
      price: "R$ 1,00",
      maxPrize: "R$ 100.000,00",
      color: "blue",
      route: "/game/premio-pix"
    },
    {
      id: "me-mimei",
      name: "Mania Me Mimei",
      banner: bannerMeMimei,
      price: "R$ 1,00",
      maxPrize: "R$ 100.000,00",
      color: "pink",
      route: "/game/premio-me-mimei"
    },
    {
      id: "eletronicos",
      name: "Mania Eletrônicos",
      banner: bannerEletronicos,
      price: "R$ 1,00",
      maxPrize: "R$ 100.000,00",
      color: "orange",
      route: "/game/premio-eletronicos"
    },
    {
      id: "super",
      name: "Mania Super Prêmios",
      banner: bannerSuperPremios,
      price: "R$ 20,00",
      maxPrize: "R$ 500.000,00",
      color: "green",
      route: "/game/premio-super-premios"
    }
  ];



  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      blue: {
        bg: "from-blue-500 to-blue-600",
        text: "text-blue-400",
        border: "border-gradient-blue"
      },
      pink: {
        bg: "from-pink-500 to-pink-600",
        text: "text-pink-400",
        border: "border-gradient-pink"
      },
      orange: {
        bg: "from-orange-500 to-orange-600",
        text: "text-orange-400",
        border: "border-gradient-orange"
      },
      green: {
        bg: "from-green-500 to-green-600",
        text: "text-green-400",
        border: "border-gradient-green"
      },
      purple: {
        bg: "from-purple-500 to-purple-600",
        text: "text-purple-400",
        border: "border-gradient-purple"
      },
      red: {
        bg: "from-red-500 to-red-600",
        text: "text-red-400",
        border: "border-gradient-red"
      },
      yellow: {
        bg: "from-yellow-500 to-yellow-600",
        text: "text-yellow-400",
        border: "border-gradient-yellow"
      }
    };
    return colors[color] || colors.blue;
  };

  return (
    <MobileLayout>
      <div className="flex items-center gap-3 p-4 pb-0">
        <button
          onClick={() => setLocation("/")}
          className="p-2 hover:bg-gray-900 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Jogos</h1>
          <p className="text-gray-400 text-sm">Escolha seu jogo favorito</p>
        </div>
      </div>



      {/* Games Grid */}
      <div className="px-4 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {
            /* Raspadinhas */
            raspadinhas.map((game) => {
              const colors = getColorClasses(game.color);
              return (
                <div key={game.id} className={`card-border-wrapper ${colors.border}`}>
                  <div
                    onClick={() => setLocation(game.route)}
                    className="cursor-pointer transform hover:scale-[1.02] transition-all duration-300 overflow-hidden rounded-2xl"
                  >
                    {/* Banner Section */}
                    <div
                      className="relative w-full"
                      style={{
                        aspectRatio: "16/8",
                        backgroundImage: `url(${game.banner})`,
                        backgroundSize: "contain",
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "center",
                      }}
                    >
                      {/* Price Badge */}
                      <div className={`absolute top-4 right-4 bg-gradient-to-r ${colors.bg} text-white px-3 py-1 rounded-lg font-bold text-sm shadow-lg`}>
                        {game.price}
                      </div>
                      {/* Gradient overlay */}
                      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-900 to-transparent"></div>
                    </div>

                    {/* Info Section */}
                    <div className="bg-gray-900 p-3 rounded-b-2xl">
                      <div>
                        <OnlineUsersCounter gameType={game.id} />
                        <p className={`text-xl font-bold ${colors.text} mb-0.5 mt-1`}>{game.name}</p>
                        <p className="text-gray-300 text-sm mb-2">
                          Prêmios de até <span className={`${colors.text} font-bold`}>{game.maxPrize}</span>
                        </p>
                        <button className={`animate-gentle-pulse w-full bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white px-3 py-3 rounded-2xl font-bold transition-all hover:shadow-xl hover:scale-[1.02] text-sm flex items-center justify-between border border-gray-700 relative overflow-hidden group`}>
                          <div className={`absolute inset-0 bg-gradient-to-r ${colors.bg} opacity-10 group-hover:opacity-20 transition-opacity duration-300`}></div>
                          <span className={`bg-gradient-to-r ${colors.bg} px-4 py-2 rounded-xl flex items-center gap-3 shadow-lg relative z-10`}>
                            <span className="text-white text-sm font-black uppercase tracking-wider">Jogar</span>
                            <span className="bg-black/40 px-3 py-1 rounded-lg text-white font-bold shadow-inner">{game.price}</span>
                          </span>
                          <span className="flex items-center gap-1 text-[10px] text-gray-400 pr-2 relative z-10">
                            <svg className={`w-3.5 h-3.5 ${colors.text}`} fill="currentColor" viewBox="0 0 24 24">
                              <path d="M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 0 0-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z"/>
                            </svg>
                            <span className="font-medium uppercase">Ver Prêmios</span>
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                            </svg>
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          }
        </div>
      </div>
    </MobileLayout>
  );
}