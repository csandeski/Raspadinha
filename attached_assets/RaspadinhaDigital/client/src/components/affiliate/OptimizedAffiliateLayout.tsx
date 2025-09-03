import { useState, useEffect, useRef, memo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  Link2,
  Users,
  DollarSign,
  Wallet,
  TrendingUp,
  Download,
  History,
  ChevronRight,
  Bell,
  HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAffiliateInfo, useAffiliateLevelInfo } from "@/hooks/useAffiliateData";

interface OptimizedAffiliateLayoutProps {
  children: React.ReactNode;
  activeSection?: string;
}

// Memoize menu items to prevent re-creation
const menuItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/afiliados/dashboard",
    color: "from-blue-500 to-cyan-500"
  },
  {
    id: "links",
    label: "Meus Links",
    icon: Link2,
    path: "/afiliados/links",
    color: "from-purple-500 to-pink-500"
  },
  {
    id: "network",
    label: "Minha Rede",
    icon: Users,
    path: "/afiliados/network",
    color: "from-green-500 to-emerald-500"
  },
  {
    id: "earnings",
    label: "Ganhos",
    icon: DollarSign,
    path: "/afiliados/earnings",
    color: "from-yellow-500 to-orange-500"
  },
  {
    id: "withdrawals",
    label: "Saques",
    icon: Wallet,
    path: "/afiliados/withdrawals",
    color: "from-indigo-500 to-purple-500"
  },
  {
    id: "levels",
    label: "Níveis Comissão",
    icon: TrendingUp,
    path: "/afiliados/levels",
    color: "from-emerald-500 to-green-500"
  },
  {
    id: "materials",
    label: "Materiais",
    icon: Download,
    path: "/afiliados/materials",
    color: "from-teal-500 to-cyan-500"
  },
  {
    id: "history",
    label: "Histórico",
    icon: History,
    path: "/afiliados/history",
    color: "from-gray-500 to-gray-600"
  }
];

// Memoize sidebar item component
const SidebarItem = memo(({ item, isActive, onClick }: {
  item: typeof menuItems[0];
  isActive: boolean;
  onClick: () => void;
}) => {
  const Icon = item.icon;
  
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
        "hover:bg-gray-800/50",
        isActive
          ? "bg-gradient-to-r from-gray-800 to-gray-700 shadow-lg border-l-4 border-[#00E880]"
          : "text-gray-400 hover:text-white"
      )}
    >
      <div className={cn(
        "p-2 rounded-lg bg-gradient-to-br",
        isActive ? item.color : "from-gray-700 to-gray-800"
      )}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <span className={cn(
        "font-medium",
        isActive ? "text-white" : ""
      )}>
        {item.label}
      </span>
      {isActive && (
        <ChevronRight className="w-4 h-4 ml-auto text-[#00E880]" />
      )}
    </motion.button>
  );
});

export const OptimizedAffiliateLayout = memo(({ 
  children, 
  activeSection = "dashboard" 
}: OptimizedAffiliateLayoutProps) => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentSection, setCurrentSection] = useState(activeSection);
  
  // Use optimized hook
  const { data: affiliateInfo, isLoading } = useAffiliateInfo() as { 
    data: { approvedEarnings?: number } | undefined;
    isLoading: boolean;
  };
  
  // Calculate level info
  const approvedEarnings = affiliateInfo?.approvedEarnings || 0;
  const { currentLevel, nextLevel, progressToNext } = useAffiliateLevelInfo(approvedEarnings);
  
  // Update current section when prop changes
  useEffect(() => {
    setCurrentSection(activeSection);
  }, [activeSection]);

  // Memoize logout handler
  const handleLogout = useCallback(() => {
    localStorage.removeItem("affiliateToken");
    localStorage.removeItem("affiliateTokenPersistent");
    localStorage.removeItem("affiliateEmailPersistent");
    toast({
      title: "Logout realizado",
      description: "Você saiu do painel de afiliados"
    });
    setLocation("/afiliados");
  }, [toast, setLocation]);

  // Memoize navigation handler
  const handleNavigation = useCallback((item: typeof menuItems[0]) => {
    setCurrentSection(item.id);
    setLocation(item.path);
    setIsSidebarOpen(false);
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-72 bg-gray-900/50 backdrop-blur-xl border-r border-gray-800">
        {/* Header */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Painel Afiliado</h2>
            <Button
              size="icon"
              variant="ghost"
              className="text-gray-400 hover:text-white"
              onClick={() => setLocation("/")}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Level Progress */}
          {!isLoading && currentLevel && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Nível</span>
                <Badge className={cn("bg-gradient-to-r", currentLevel.color)}>
                  {currentLevel.name}
                </Badge>
              </div>
              <Progress value={progressToNext} className="h-2" />
              {nextLevel && (
                <p className="text-xs text-gray-500">
                  Faltam R$ {((nextLevel.min - approvedEarnings) / 1000).toFixed(1)}k para {nextLevel.name}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <SidebarItem
              key={item.id}
              item={item}
              isActive={currentSection === item.id}
              onClick={() => handleNavigation(item)}
            />
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800">
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-400 hover:text-white"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-xl border-b border-gray-800">
        <div className="flex items-center justify-between p-4">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <h2 className="text-lg font-bold text-white">Painel Afiliado</h2>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setLocation("/")}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/50 z-50"
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 25 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-72 bg-gray-900 z-50 flex flex-col"
            >
              {/* Mobile sidebar content (same as desktop) */}
              <div className="p-6 border-b border-gray-800">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white">Painel Afiliado</h2>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setIsSidebarOpen(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                {!isLoading && currentLevel && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Nível</span>
                      <Badge className={cn("bg-gradient-to-r", currentLevel.color)}>
                        {currentLevel.name}
                      </Badge>
                    </div>
                    <Progress value={progressToNext} className="h-2" />
                  </div>
                )}
              </div>

              <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {menuItems.map((item) => (
                  <SidebarItem
                    key={item.id}
                    item={item}
                    isActive={currentSection === item.id}
                    onClick={() => handleNavigation(item)}
                  />
                ))}
              </nav>

              <div className="p-4 border-t border-gray-800">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-gray-400 hover:text-white"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-4 lg:p-8 mt-16 lg:mt-0">
          {children}
        </div>
      </main>
    </div>
  );
});