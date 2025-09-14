import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { AdminThemeProvider, useAdminTheme } from "@/contexts/admin-theme-context";
import CountUp from "react-countup";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Activity,
  BarChart3,
  Trophy,
  CreditCard,
  MessageSquare,
  LogOut,
  Bell,
  Settings,
  Shield,
  Zap,
  Globe,
  Server,
  Database,
  Lock,
  Eye,
  ChevronRight,
  Menu,
  X,
  Home,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Filter,
  RefreshCw,
  Gift,
  UserPlus,
  Share2,
  Megaphone,
  Sun,
  Moon
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import UsersManagement from "@/components/admin/users-management";
import WithdrawalsManagement from "@/components/admin/withdrawals-management";
import SupportManagement from "@/components/admin/support-management";
import GamesManagement from "@/components/admin/games-management";
import DepositsManagement from "@/components/admin/deposits-management";
import EnhancedDashboard from "@/components/admin/enhanced-dashboard";
import { PrizeProbabilityEnhanced } from "@/components/admin/prize-probability-enhanced";
import { ChestProbabilityManagement } from "@/components/admin/chest-probability-management";
import { EsquiloProbabilityManagement } from "@/components/admin/esquilo-probability-management";
import { EsquiloBonusManagement } from "@/components/admin/esquilo-bonus-management";
import { CouponsManagement } from "@/components/admin/coupons-management";
import ReferralsManagement from "@/components/admin/referrals-management";
import AffiliatesManagementPremium from "@/components/admin/affiliates-management-premium";
import SiteAccessesManagement from "@/components/admin/site-accesses-management";
import { ChatManagement } from "@/components/admin/chat-management";
import { MarketingLinksManagement } from "@/components/admin/marketing-links-management";
import CashbackManagement from "@/components/admin/cashback-management";
import ApiManagement from "@/components/admin/api-management";
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area,
  BarChart as ReBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

function AdminDashboardContent() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { theme, toggleTheme } = useAdminTheme();
  const [activeSection, setActiveSection] = useState("overview");
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Check admin authentication
  useEffect(() => {
    const checkAuth = async () => {
      const sessionId = localStorage.getItem("adminSessionId");
      if (!sessionId) {
        setLocation("/admin/login");
        return;
      }

      try {
        const response = await fetch("/api/admin/check", {
          headers: {
            Authorization: `Bearer ${sessionId}`,
          },
        });
        if (!response.ok) {
          throw new Error("Unauthorized");
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        localStorage.removeItem("adminSessionId");
        setLocation("/admin/login");
      }
    };

    checkAuth();
  }, [setLocation]);

  // Click outside handler for notifications
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  // Fetch dashboard stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      const sessionId = localStorage.getItem("adminSessionId");
      const response = await fetch("/api/admin/stats", {
        headers: {
          Authorization: `Bearer ${sessionId}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
    refetchInterval: 30000,
  });

  const handleLogout = async () => {
    const sessionId = localStorage.getItem("adminSessionId");
    try {
      await apiRequest("/api/admin/logout", "POST");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("adminSessionId");
      setLocation("/admin/login");
    }
  };

  const menuItems = [
    { id: "overview", label: "Dashboard", icon: Home, badge: null },
    { id: "api", label: "API", icon: Server, badge: null },
    { id: "users", label: "Usuários", icon: Users, badge: stats?.totalUsers },
    { id: "deposits", label: "Depósitos", icon: DollarSign, badge: stats?.todayDeposits },
    { id: "cashback", label: "Cashback", icon: Wallet, badge: stats?.pendingCashbacks },
    { id: "withdrawals", label: "Saques", icon: CreditCard, badge: stats?.pendingWithdrawals },
    { id: "games", label: "Jogos", icon: Trophy, badge: null },
    { id: "support", label: "Suporte", icon: MessageSquare, badge: stats?.activeChats },
    { id: "probabilities", label: "Probabilidades", icon: Settings, badge: null },
    { id: "coupons", label: "Cupons", icon: Gift, badge: null },
    { id: "referrals", label: "Indique e Ganhe", icon: UserPlus, badge: null },
    { id: "affiliates", label: "Afiliados", icon: Zap, badge: stats?.activeAffiliates },
    { id: "accesses", label: "Acessos", icon: Globe, badge: null },
    { id: "marketing", label: "Marketing", icon: Megaphone, badge: null },
    { id: "chat", label: "Chat", icon: MessageSquare, badge: stats?.activeChats },
  ];

  // Dados para gráficos rápidos
  const revenueData = [
    { name: "Seg", value: 4500 },
    { name: "Ter", value: 5200 },
    { name: "Qua", value: 4800 },
    { name: "Qui", value: 6100 },
    { name: "Sex", value: 7300 },
    { name: "Sab", value: 8900 },
    { name: "Dom", value: 7500 },
  ];

  const userGrowth = [
    { name: "Jan", users: 1200 },
    { name: "Fev", users: 1900 },
    { name: "Mar", users: 2400 },
    { name: "Abr", users: 3100 },
    { name: "Mai", users: 4200 },
    { name: "Jun", users: 5800 },
  ];

  return (
    <div className={`min-h-screen overflow-hidden transition-colors duration-300 ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-zinc-900 via-zinc-950 to-black' 
        : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'
    }`}>
      {/* Animated Background Elements */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-20 left-20 w-96 h-96 bg-[#00E880]/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-40 right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl animate-pulse" />
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Modern Sidebar - Desktop Always Visible, Mobile Toggle */}
      <aside
        className={`fixed left-0 top-0 h-screen w-72 md:w-80 backdrop-blur-xl z-50 flex flex-col transition-all duration-300 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 ${
          theme === 'dark'
            ? 'bg-zinc-900/95 border-r border-zinc-800/50'
            : 'bg-white/95 border-r border-gray-200'
        }`}
      >
            {/* Logo Section - Fixed at top */}
            <div className={`flex-shrink-0 p-4 md:p-6 border-b transition-colors duration-300 ${
              theme === 'dark' ? 'border-zinc-800/50' : 'border-gray-200'
            }`}>
              <div className="flex items-center justify-center md:justify-start gap-3">
                <motion.div 
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.5 }}
                  className="p-2 md:p-3 bg-gradient-to-br from-[#00E880] to-[#00B368] rounded-2xl shadow-lg shadow-[#00E880]/20"
                >
                  <Zap className="w-6 md:w-7 h-6 md:h-7 text-black" />
                </motion.div>
                <div className="hidden md:block">
                  <h1 className={`text-2xl font-bold bg-gradient-to-r bg-clip-text text-transparent ${
                    theme === 'dark' ? 'from-white to-zinc-400' : 'from-gray-900 to-gray-600'
                  }`}>
                    Admin Panel
                  </h1>
                  <p className={`text-xs ${theme === 'dark' ? 'text-zinc-500' : 'text-gray-500'}`}>Mania Brasil v2.0</p>
                </div>
              </div>
            </div>

            {/* Navigation Menu - Scrollable */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full px-4">
                <nav className="py-4 space-y-2">
                  {menuItems.map((item, index) => (
                    <motion.button
                    key={item.id}
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ x: 8 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center justify-center md:justify-between p-2 md:p-4 rounded-2xl transition-all duration-300 group ${
                      activeSection === item.id
                        ? theme === 'dark'
                          ? "bg-gradient-to-r from-[#00E880]/15 via-[#00E880]/10 to-transparent !text-[#00E880] shadow-lg shadow-[#00E880]/10"
                          : "bg-gradient-to-r from-[#00E880]/20 via-[#00E880]/15 to-transparent !text-[#00B368] shadow-lg shadow-[#00E880]/10"
                        : theme === 'dark'
                          ? "!text-white hover:!text-white hover:bg-white/10"
                          : "!text-gray-700 hover:!text-gray-900 hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className={`p-2 rounded-xl transition-all duration-300 ${
                          activeSection === item.id 
                            ? "bg-[#00E880]/20" 
                            : "bg-[#00E880]/20 group-hover:bg-[#00E880]/30"
                        }`}>
                          <item.icon className="w-5 h-5 !text-[#00E880]" />
                        </div>
                        {/* Badge indicator */}
                        {item.badge !== null && item.badge !== undefined && (
                          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-[#00E880] text-black text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                            {item.badge > 99 ? '99+' : item.badge}
                          </span>
                        )}
                      </div>
                      <span className={`font-medium ${
                        activeSection === item.id 
                          ? "!text-[#00E880]" 
                          : theme === 'dark' ? "!text-white" : "!text-gray-700"
                      }`}>{item.label}</span>
                    </div>
                    <div className="hidden md:flex items-center gap-2">
                      {item.badge !== null && item.badge !== undefined && (
                        <Badge className="bg-[#00E880]/20 text-[#00E880] border-0">
                          {item.badge}
                        </Badge>
                      )}
                      <ChevronRight className={`w-4 h-4 transition-transform !text-white ${
                        activeSection === item.id ? "translate-x-1 !text-[#00E880]" : "opacity-0 group-hover:opacity-100"
                      }`} />
                    </div>
                  </motion.button>
                  ))}
                </nav>
              </ScrollArea>
            </div>

            {/* Logout Button - Fixed at bottom */}
            <div className={`flex-shrink-0 p-4 md:p-6 border-t ${
              theme === 'dark' ? 'border-zinc-800/50' : 'border-gray-200'
            }`}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout}
                className="w-full flex items-center justify-start gap-3 p-3 md:p-4 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all duration-300"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Sair</span>
              </motion.button>
            </div>

      </aside>

      {/* Mobile Bottom Navigation */}
      <motion.div 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className={`fixed bottom-0 left-0 right-0 z-30 md:hidden backdrop-blur-xl border-t ${
          theme === 'dark'
            ? 'bg-zinc-900/95 border-zinc-800/50'
            : 'bg-white/95 border-gray-200'
        }`}
      >
        <div className="grid grid-cols-5 py-2">
          <button
            onClick={() => setActiveSection('overview')}
            className={`flex flex-col items-center justify-center py-2 px-1 ${
              activeSection === 'overview' ? 'text-[#00E880]' : theme === 'dark' ? 'text-zinc-400' : 'text-gray-600'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] mt-1">Início</span>
          </button>
          <button
            onClick={() => setActiveSection('users')}
            className={`flex flex-col items-center justify-center py-2 px-1 ${
              activeSection === 'users' ? 'text-[#00E880]' : theme === 'dark' ? 'text-zinc-400' : 'text-gray-600'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] mt-1">Usuários</span>
          </button>
          <button
            onClick={() => setActiveSection('deposits')}
            className={`flex flex-col items-center justify-center py-2 px-1 ${
              activeSection === 'deposits' ? 'text-[#00E880]' : theme === 'dark' ? 'text-zinc-400' : 'text-gray-600'
            }`}
          >
            <CreditCard className="w-5 h-5" />
            <span className="text-[10px] mt-1">Depósitos</span>
          </button>
          <button
            onClick={() => setActiveSection('games')}
            className={`flex flex-col items-center justify-center py-2 px-1 ${
              activeSection === 'games' ? 'text-[#00E880]' : theme === 'dark' ? 'text-zinc-400' : 'text-gray-600'
            }`}
          >
            <Trophy className="w-5 h-5" />
            <span className="text-[10px] mt-1">Jogos</span>
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`flex flex-col items-center justify-center py-2 px-1 ${
              theme === 'dark' ? 'text-zinc-400' : 'text-gray-600'
            }`}
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] mt-1">Menu</span>
          </button>
        </div>
      </motion.div>

      {/* Main Content Area - Responsive */}
      <main className="transition-all duration-300 md:ml-80 pb-20 md:pb-0">
        {/* Modern Top Bar */}
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={`sticky top-0 backdrop-blur-xl border-b z-30 transition-colors duration-300 ${
            theme === 'dark'
              ? 'bg-zinc-900/80 border-zinc-800/50'
              : 'bg-white/80 border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between px-4 md:px-8 py-3 md:py-4">
            <div className="flex items-center gap-2 md:gap-4">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`md:hidden p-2 rounded-lg ${
                  theme === 'dark' ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'
                }`}
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h2 className={`text-lg md:text-2xl font-bold flex items-center gap-2 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {menuItems.find(item => item.id === activeSection)?.label || "Dashboard"}
                  {activeSection === "overview" && (
                    <Badge className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border-green-500/30">
                      <Activity className="w-3 h-3 mr-1 animate-pulse" />
                      Ao vivo
                    </Badge>
                  )}
                </h2>
                <p className={`text-xs md:text-sm ${theme === 'dark' ? 'text-zinc-500' : 'text-gray-500'} hidden sm:block`}>
                  {new Date().toLocaleDateString('pt-BR', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              {/* Live Stats - Hidden on small mobile */}
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className={`hidden sm:flex items-center gap-2 md:gap-3 px-3 md:px-5 py-2 md:py-3 rounded-xl md:rounded-2xl border transition-colors duration-300 ${
                  theme === 'dark'
                    ? 'bg-gradient-to-r from-zinc-900/50 to-zinc-900/30 border-zinc-800/50'
                    : 'bg-gradient-to-r from-gray-50 to-white border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#00E880] rounded-full animate-pulse" />
                  <span className={`text-xs md:text-sm ${theme === 'dark' ? 'text-zinc-300' : 'text-gray-700'}`}>
                    <span className="text-[#00E880] font-semibold">{stats?.activeUsers || 0}</span> online
                  </span>
                </div>
                <div className="h-4 w-px bg-zinc-700" />
                <div className="flex items-center gap-2">
                  <Clock className={`w-3 md:w-4 h-3 md:h-4 ${theme === 'dark' ? 'text-zinc-400' : 'text-gray-600'}`} />
                  <span className={`text-xs md:text-sm ${theme === 'dark' ? 'text-zinc-300' : 'text-gray-700'}`}>
                    {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </motion.div>
              
              {/* Refresh Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  queryClient.invalidateQueries();
                  toast({
                    title: "Atualizando...",
                    description: "Os dados estão sendo recarregados",
                  });
                }}
                className={`p-2 md:p-3 rounded-xl md:rounded-2xl border transition-colors ${
                  theme === 'dark'
                    ? 'bg-zinc-900/50 border-zinc-800/50 hover:bg-zinc-900/70'
                    : 'bg-white/80 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <RefreshCw className={`w-4 md:w-5 h-4 md:h-5 ${theme === 'dark' ? 'text-zinc-400' : 'text-gray-600'}`} />
              </motion.button>
              
              {/* Theme Toggle Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleTheme}
                className={`p-2 md:p-3 rounded-xl md:rounded-2xl border transition-colors ${
                  theme === 'dark'
                    ? 'bg-zinc-900/50 border-zinc-800/50 hover:bg-zinc-900/70'
                    : 'bg-white/80 border-gray-200 hover:bg-gray-100'
                }`}
                title={theme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
              >
                {theme === "dark" ? (
                  <Sun className="w-4 md:w-5 h-4 md:h-5 text-amber-400" />
                ) : (
                  <Moon className="w-4 md:w-5 h-4 md:h-5 text-blue-600" />
                )}
              </motion.button>
              
              {/* Notifications */}
              <div className="relative" ref={notificationRef}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`relative p-2 md:p-3 rounded-xl md:rounded-2xl border transition-colors hidden sm:block ${
                    theme === 'dark'
                      ? 'bg-zinc-900/50 border-zinc-800/50 hover:bg-zinc-900/70'
                      : 'bg-white/80 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <Bell className={`w-4 md:w-5 h-4 md:h-5 ${theme === 'dark' ? 'text-zinc-400' : 'text-gray-600'}`} />
                  {(stats?.pendingWithdrawals || 0) > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                      {stats.pendingWithdrawals}
                    </span>
                  )}
                </motion.button>
                
                {/* Notifications Dropdown */}
                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-96 bg-zinc-900/95 backdrop-blur-xl rounded-2xl border border-zinc-800/50 shadow-2xl shadow-black/50 z-50"
                    >
                      <div className="p-4 border-b border-zinc-800/50">
                        <h3 className="text-lg font-semibold text-white flex items-center justify-between">
                          Notificações
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                            {stats?.pendingWithdrawals || 0} pendentes
                          </Badge>
                        </h3>
                      </div>
                      
                      <div className="max-h-96 overflow-y-auto">
                        {/* Pending Withdrawals */}
                        {(stats?.pendingWithdrawals || 0) > 0 ? (
                          <div className="p-4 space-y-3">
                            <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
                              <div className="flex items-start gap-3">
                                <div className="p-2 bg-amber-500/20 rounded-lg">
                                  <AlertCircle className="w-5 h-5 text-amber-500" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-white">Saques Pendentes</p>
                                  <p className="text-sm text-zinc-400 mt-1">
                                    Você tem {stats.pendingWithdrawals} saque(s) aguardando aprovação
                                  </p>
                                  <Button
                                    size="sm"
                                    className="mt-2 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30"
                                    onClick={() => {
                                      setActiveSection('withdrawals');
                                      setShowNotifications(false);
                                    }}
                                  >
                                    Revisar Saques
                                  </Button>
                                </div>
                              </div>
                            </div>
                            
                            {/* Other notifications */}
                            <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                              <div className="flex items-start gap-3">
                                <div className="p-2 bg-blue-500/20 rounded-lg">
                                  <Users className="w-5 h-5 text-blue-500" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-white">Novos Usuários</p>
                                  <p className="text-sm text-zinc-400 mt-1">
                                    {stats?.activeUsers || 0} usuários online agora
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                              <div className="flex items-start gap-3">
                                <div className="p-2 bg-green-500/20 rounded-lg">
                                  <TrendingUp className="w-5 h-5 text-green-500" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-white">Receita Hoje</p>
                                  <p className="text-sm text-zinc-400 mt-1">
                                    R$ {stats?.todayDeposits || "0.00"} em depósitos
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-8 text-center">
                            <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                              <CheckCircle className="w-8 h-8 text-zinc-600" />
                            </div>
                            <p className="text-zinc-400">Nenhuma notificação pendente</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="p-4 border-t border-zinc-800/50">
                        <Button 
                          variant="ghost" 
                          className="w-full text-zinc-400 hover:text-white"
                          onClick={() => setShowNotifications(false)}
                        >
                          Fechar
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>


            </div>
          </div>
        </motion.div>

        {/* Content Sections */}
        <div className="p-4 md:p-8">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center h-96"
              >
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-zinc-800 border-t-[#00E880] rounded-full animate-spin" />
                  <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-b-purple-500 rounded-full animate-spin-reverse" />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {activeSection === "overview" && <EnhancedDashboard stats={stats} />}
                {activeSection === "api" && <ApiManagement />}
                {activeSection === "users" && <UsersManagement />}
                {activeSection === "deposits" && <DepositsManagement />}
                {activeSection === "cashback" && <CashbackManagement />}
                {activeSection === "withdrawals" && <WithdrawalsManagement />}
                {activeSection === "games" && <GamesManagement />}
                {activeSection === "support" && <SupportManagement />}
                {activeSection === "probabilities" && (
                  <div className="space-y-6">
                    <PrizeProbabilityEnhanced />
                    <ChestProbabilityManagement />
                    <EsquiloProbabilityManagement />
                    <EsquiloBonusManagement />
                  </div>
                )}
                {activeSection === "coupons" && <CouponsManagement />}
                {activeSection === "referrals" && <ReferralsManagement />}
                {activeSection === "affiliates" && <AffiliatesManagementPremium />}
                {activeSection === "accesses" && <SiteAccessesManagement />}
                {activeSection === "marketing" && <MarketingLinksManagement />}
                {activeSection === "chat" && <ChatManagement />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// Export wrapper with theme provider
export default function AdminDashboard() {
  return (
    <AdminThemeProvider>
      <AdminDashboardContent />
    </AdminThemeProvider>
  );
}