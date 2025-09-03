import logoImg from "/logos/logomania.svg";
import { Shield, FileText, HelpCircle, AlertCircle, DollarSign } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";

export default function Footer() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const handleProtectedClick = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    if (user) {
      setLocation(path);
    } else {
      setLocation('/register');
    }
  };
  return (
    <footer className="mt-auto">
      {/* Gradient separator */}
      <div className="h-[1px] bg-gradient-to-r from-transparent via-gray-700/50 to-transparent" />
      <div className="bg-gradient-to-b from-[#1a1b23] to-[#0E1015] backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-3">
          {/* Logo and copyright */}
          <div className="flex items-center justify-center gap-3 mb-3">
            <img src={logoImg} alt="Mania Brasil" className="h-5 w-auto opacity-70" />
            <div className="text-gray-500">
              <p className="font-medium text-xs">© 2025 Mania Brasil</p>
            </div>
          </div>
          
          {/* Quick links - full width buttons */}
          <div className="grid grid-cols-3 gap-2 mb-2">
            <a 
              href="#" 
              onClick={(e) => handleProtectedClick(e, '/termos')}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gray-800/30 hover:bg-gray-700/40 hover:text-[#00E880] transition-all group border border-gray-700/30 cursor-pointer"
            >
              <FileText className="w-3 h-3 opacity-50 group-hover:opacity-100" />
              <span className="text-xs">Termos</span>
            </a>
            <a 
              href="#" 
              onClick={(e) => handleProtectedClick(e, '/privacidade')}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gray-800/30 hover:bg-gray-700/40 hover:text-[#00E880] transition-all group border border-gray-700/30 cursor-pointer"
            >
              <AlertCircle className="w-3 h-3 opacity-50 group-hover:opacity-100" />
              <span className="text-xs">Privacidade</span>
            </a>
            <a 
              href="#" 
              onClick={(e) => handleProtectedClick(e, '/ajuda')}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gray-800/30 hover:bg-gray-700/40 hover:text-[#00E880] transition-all group border border-gray-700/30 cursor-pointer"
            >
              <HelpCircle className="w-3 h-3 opacity-50 group-hover:opacity-100" />
              <span className="text-xs">Ajuda</span>
            </a>
          </div>
          
          {/* Minimal disclaimer */}
          <p className="text-[10px] text-gray-600 text-center">
            Jogue com responsabilidade. Este site é destinado para maiores de 18 anos.
          </p>
        </div>
      </div>
    </footer>
  );
}