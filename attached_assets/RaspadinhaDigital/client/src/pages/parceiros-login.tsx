import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import maniaLogo from "/logos/logomania.svg";
import { 
  Lock,
  Mail,
  ArrowLeft,
  LogIn,
  Eye,
  EyeOff,
  TrendingUp,
  DollarSign,
  Zap,
  BarChart3
} from "lucide-react";

export default function ParceirosLogin() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

  // Clear ALL tokens when auth page loads to prevent any loops
  useEffect(() => {
    // Always clear tokens on auth page load to ensure clean state
    localStorage.removeItem("partnerToken");
    localStorage.removeItem("partnerRememberMe");
    sessionStorage.clear();
    
    // Stop any ongoing queries by clearing query cache
    queryClient.clear();
    
    console.log("Cleared all partner authentication data");
  }, []);

  // Login mutation  
  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const response = await fetch("/api/partner/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao fazer login");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      if (data.token) {
        // Always save to localStorage
        localStorage.setItem("partnerToken", data.token);
        
        // Store partner info
        if (data.partner) {
          localStorage.setItem('partnerName', data.partner.name);
          localStorage.setItem('partnerEmail', data.partner.email);
          localStorage.setItem('partnerId', data.partner.id);
        }
        
        // If "remember me" is checked, also save persistently
        if (rememberMe) {
          localStorage.setItem("partnerTokenPersistent", data.token);
          localStorage.setItem("partnerEmailPersistent", formData.email);
        } else {
          // Clear persistent storage if not remembering
          localStorage.removeItem("partnerTokenPersistent");
          localStorage.removeItem("partnerEmailPersistent");
        }
      }
      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo ao painel de parceiros"
      });
      setTimeout(() => {
        setLocation("/parceiros/dashboard");
      }, 100);
    },
    onError: (error: Error) => {
      setLoginError(error.message || "Email ou senha incorretos");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ email: formData.email, password: formData.password });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Mobile Back Button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50">
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => setLocation("/")}
          className="flex items-center gap-3 p-4 w-full text-left hover:bg-gray-900/20 transition-colors group"
        >
          <div className="bg-[#00E880]/10 backdrop-blur-sm p-2 rounded-lg group-hover:bg-[#00E880]/20 transition-colors">
            <ArrowLeft className="w-5 h-5 text-[#00E880]" />
          </div>
          <div>
            <span className="text-white font-semibold block">Voltar</span>
            <span className="text-gray-400 text-xs">Para página inicial</span>
          </div>
        </motion.button>
      </div>

      {/* Modern Gradient Background */}
      <div className="fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-900/20 via-gray-900 to-gray-950" />
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-[#00E880]/5 to-transparent rounded-full blur-3xl"
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, -90, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-green-600/5 to-transparent rounded-full blur-3xl"
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center px-4 min-h-screen pt-20 lg:pt-0">
        <div className="w-full max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
            {/* Left Side - Branding */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="hidden lg:block lg:col-span-2 text-center lg:text-left"
            >
              {/* Back Button Above Logo */}
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => setLocation("/")}
                className="inline-flex items-center gap-2 mb-6 text-gray-400 hover:text-white transition-all group"
              >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                <span className="text-sm font-medium">Voltar para o início</span>
              </motion.button>
              
              <img src={maniaLogo} alt="Logo" className="h-14 w-auto mb-8" />
              <h1 className="text-4xl xl:text-5xl font-bold text-white mb-4 leading-tight">
                Painel de <span className="text-[#00E880]">Parceiros</span>
              </h1>
              <p className="text-gray-400 text-lg mb-8">
                Gerencie suas comissões e acompanhe seu desempenho como parceiro.
              </p>
              
              {/* Minimal Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-xl p-4">
                  <div className="text-[#00E880] text-2xl font-bold mb-1">R$ 125K</div>
                  <div className="text-gray-500 text-sm">Pago em comissões</div>
                </div>
                <div className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-xl p-4">
                  <div className="text-[#00E880] text-2xl font-bold mb-1">1.2K+</div>
                  <div className="text-gray-500 text-sm">Parceiros ativos</div>
                </div>
              </div>
            </motion.div>

            {/* Right Side - Modern Form - Mobile Optimized */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="lg:col-span-3 w-full max-w-md mx-auto lg:max-w-none"
            >
              <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-6 sm:p-8 shadow-2xl">
                {/* Mobile Logo */}
                <div className="lg:hidden mb-6 text-center">
                  <img src={maniaLogo} alt="Logo" className="h-10 w-auto mx-auto mb-3" />
                  <h2 className="text-xl font-bold text-white">Painel de Parceiros</h2>
                </div>

                {/* Login Title */}
                <div className="mb-6 sm:mb-8">
                  <h3 className="text-2xl font-bold text-white mb-2">Fazer Login</h3>
                  <p className="text-gray-400">Entre com suas credenciais de parceiro</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Login Error Message */}
                  {loginError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3"
                    >
                      <p className="text-red-400 text-sm font-medium">{loginError}</p>
                    </motion.div>
                  )}
                  
                  {/* Email Field */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-300">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => {
                          setFormData({ ...formData, email: e.target.value });
                          if (loginError) setLoginError("");
                        }}
                        className="pl-10 bg-gray-800/30 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-[#00E880] focus:bg-gray-800/50 transition-all h-12 rounded-xl"
                        placeholder="seu@email.com"
                        required
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-300">
                      Senha
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => {
                          setFormData({ ...formData, password: e.target.value });
                          if (loginError) setLoginError("");
                        }}
                        className="pl-10 pr-10 bg-gray-800/30 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-[#00E880] focus:bg-gray-800/50 transition-all h-12 rounded-xl"
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me Checkbox */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="rememberMe"
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                        className="border-gray-600 data-[state=checked]:bg-[#00E880] data-[state=checked]:border-[#00E880]"
                      />
                      <Label htmlFor="rememberMe" className="text-sm text-gray-400 cursor-pointer">
                        Lembrar-me
                      </Label>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-[#00E880] to-[#00C068] hover:from-[#00C068] hover:to-[#00A050] text-black font-semibold"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      "Entrando..."
                    ) : (
                      <>
                        <LogIn className="w-4 h-4 mr-2" />
                        Entrar
                      </>
                    )}
                  </Button>
                </form>




              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}