import { useLocation } from "wouter";

export default function BottomNav() {
  const [location, setLocation] = useLocation();

  const navItems = [
    { id: "home", icon: "🏠", label: "Início", path: "/" },
    { id: "deposit", icon: "💳", label: "Depósito", path: "/deposit" },
    { id: "withdraw", icon: "💸", label: "Saque", path: "/withdraw" },
    { id: "history", icon: "📊", label: "Histórico", path: "/history" },
    { id: "profile", icon: "👤", label: "Perfil", path: "/profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-md border-t border-white/20 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`flex flex-col items-center space-y-1 px-2 py-2 rounded-lg transition-all duration-200 ${
                location === item.path 
                  ? "bg-orange-500/20 text-orange-400" 
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
              onClick={() => setLocation(item.path)}
            >
              <div className="text-xl">{item.icon}</div>
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
