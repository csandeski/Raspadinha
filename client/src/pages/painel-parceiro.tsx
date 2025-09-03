import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Home,
  Users,
  Link,
  Wallet,
  ChartBar,
  LogOut,
  Menu,
  X,
  DollarSign,
  TrendingUp,
  UserPlus,
  MousePointerClick,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  Clock,
  Eye,
  Copy,
  QrCode,
  Download,
  Settings,
  History,
  FileText,
  HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// Partner Dashboard Component
function PartnerDashboard() {
  const { data: dashboardData, isLoading } = useQuery<{
    totalEarnings: string;
    pendingEarnings: string;
    approvedEarnings: string;
    totalClicks: number;
    totalRegistrations: number;
    totalDeposits: number;
    conversionRate: string;
    recentConversions: any[];
  }>({
    queryKey: ['/api/partner/dashboard']
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
      </div>
    );
  }

  const stats = {
    totalEarnings: dashboardData?.totalEarnings || "0.00",
    pendingEarnings: dashboardData?.pendingEarnings || "0.00",
    approvedEarnings: dashboardData?.approvedEarnings || "0.00",
    totalClicks: dashboardData?.totalClicks || 0,
    totalRegistrations: dashboardData?.totalRegistrations || 0,
    totalDeposits: dashboardData?.totalDeposits || 0,
    conversionRate: dashboardData?.conversionRate || "0.00",
    recentConversions: dashboardData?.recentConversions || []
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-purple-600/20 to-indigo-600/20 rounded-xl p-6 backdrop-blur-sm border border-purple-500/20">
        <h1 className="text-2xl font-bold text-white mb-2">
          Bem-vindo ao Painel de Parceiros
        </h1>
        <p className="text-gray-400">
          Acompanhe seus ganhos e gerencie seus links de afiliado
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-black/40 border-gray-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-green-500/10 rounded-lg p-2">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-xs text-green-400">Total</span>
          </div>
          <div className="text-2xl font-bold text-white">
            R$ {stats.totalEarnings}
          </div>
          <p className="text-xs text-gray-400 mt-1">Ganhos totais</p>
        </Card>

        <Card className="bg-black/40 border-gray-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-yellow-500/10 rounded-lg p-2">
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
            <span className="text-xs text-yellow-400">Pendente</span>
          </div>
          <div className="text-2xl font-bold text-white">
            R$ {stats.pendingEarnings}
          </div>
          <p className="text-xs text-gray-400 mt-1">Aguardando aprovação</p>
        </Card>

        <Card className="bg-black/40 border-gray-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-purple-500/10 rounded-lg p-2">
              <Shield className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-xs text-purple-400">Aprovado</span>
          </div>
          <div className="text-2xl font-bold text-white">
            R$ {stats.approvedEarnings}
          </div>
          <p className="text-xs text-gray-400 mt-1">Disponível para saque</p>
        </Card>

        <Card className="bg-black/40 border-gray-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-indigo-500/10 rounded-lg p-2">
              <Target className="w-5 h-5 text-indigo-400" />
            </div>
            <span className="text-xs text-indigo-400">Conversão</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {stats.conversionRate}%
          </div>
          <p className="text-xs text-gray-400 mt-1">Taxa de conversão</p>
        </Card>
      </div>

      {/* Activity Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-black/40 border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Cliques</p>
              <p className="text-2xl font-bold text-white">{stats.totalClicks}</p>
            </div>
            <div className="bg-blue-500/10 rounded-lg p-3">
              <MousePointerClick className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="bg-black/40 border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Cadastros</p>
              <p className="text-2xl font-bold text-white">{stats.totalRegistrations}</p>
            </div>
            <div className="bg-pink-500/10 rounded-lg p-3">
              <UserPlus className="w-6 h-6 text-pink-400" />
            </div>
          </div>
        </Card>

        <Card className="bg-black/40 border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Depósitos</p>
              <p className="text-2xl font-bold text-white">{stats.totalDeposits}</p>
            </div>
            <div className="bg-green-500/10 rounded-lg p-3">
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Conversions */}
      {stats.recentConversions && stats.recentConversions.length > 0 && (
        <Card className="bg-black/40 border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Conversões Recentes
          </h3>
          <div className="space-y-3">
            {stats.recentConversions.map((conversion: any) => (
              <div
                key={conversion.id}
                className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    conversion.status === "approved" ? "bg-green-400" :
                    conversion.status === "pending" ? "bg-yellow-400" : "bg-gray-400"
                  )} />
                  <div>
                    <p className="text-sm text-white">
                      {conversion.conversionType === "registration" ? "Cadastro" : "Depósito"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(conversion.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-green-400">
                    R$ {conversion.partnerCommission}
                  </p>
                  <p className="text-xs text-gray-400">
                    {conversion.status === "approved" ? "Aprovado" :
                     conversion.status === "pending" ? "Pendente" : "Rejeitado"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// Partner Layout Component
function PartnerLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { toast } = useToast();

  const menuItems = [
    { path: '/parceiros/dashboard', label: 'Dashboard', icon: Home },
    { path: '/parceiros/links', label: 'Meus Links', icon: Link },
    { path: '/parceiros/rede', label: 'Minha Rede', icon: Users },
    { path: '/parceiros/carteira', label: 'Carteira', icon: Wallet },
    { path: '/parceiros/relatorios', label: 'Relatórios', icon: ChartBar },
    { path: '/parceiros/historico', label: 'Histórico', icon: History },
    { path: '/parceiros/configuracoes', label: 'Configurações', icon: Settings },
    { path: '/parceiros/ajuda', label: 'Ajuda', icon: HelpCircle }
  ];

  const handleLogout = () => {
    // Clear tokens
    localStorage.removeItem('partnerToken');
    localStorage.removeItem('partnerName');
    localStorage.removeItem('partnerEmail');
    
    // Clear cache and redirect
    queryClient.clear();
    setLocation('/parceiros');
    
    toast({
      title: "Logout realizado",
      description: "Você saiu do painel de parceiros"
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/10 to-gray-900">
      {/* Mobile Header */}
      <div className="lg:hidden bg-black/40 backdrop-blur-xl border-b border-gray-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-2 rounded-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-semibold">Portal Parceiros</span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="text-gray-400 hover:text-white"
          >
            {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className={cn(
          "fixed lg:relative z-40 h-screen bg-black/40 backdrop-blur-xl border-r border-gray-800 transition-transform duration-300",
          "w-64 lg:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          {/* Logo */}
          <div className="hidden lg:flex items-center space-x-3 p-6 border-b border-gray-800">
            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-2 rounded-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold">Portal Parceiros</h2>
              <p className="text-xs text-gray-400">Sistema de Subafiliados</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="p-4 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    setLocation(item.path);
                    setIsSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all",
                    isActive
                      ? "bg-gradient-to-r from-purple-600/20 to-indigo-600/20 text-white border border-purple-500/20"
                      : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
            
            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-all mt-4"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Sair</span>
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}

// Main Partner Panel Page
export default function PainelParceiro() {
  const [location] = useLocation();
  const path = location.split('/').pop();

  const renderContent = () => {
    switch (path) {
      case 'dashboard':
        return <PartnerDashboard />;
      case 'links':
        return <div className="text-white">Links - Em breve</div>;
      case 'rede':
        return <div className="text-white">Rede - Em breve</div>;
      case 'carteira':
        return <div className="text-white">Carteira - Em breve</div>;
      case 'relatorios':
        return <div className="text-white">Relatórios - Em breve</div>;
      case 'historico':
        return <div className="text-white">Histórico - Em breve</div>;
      case 'configuracoes':
        return <div className="text-white">Configurações - Em breve</div>;
      case 'ajuda':
        return <div className="text-white">Ajuda - Em breve</div>;
      default:
        return <PartnerDashboard />;
    }
  };

  return (
    <PartnerLayout>
      {renderContent()}
    </PartnerLayout>
  );
}