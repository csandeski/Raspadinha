import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import maniaLogo from "/logos/logomania.svg";
import { 
  User,
  Lock,
  Mail,
  Phone,
  ArrowLeft,
  LogIn,
  UserPlus,
  Eye,
  EyeOff,
  TrendingUp,
  DollarSign,
  Users,
  BarChart3
} from "lucide-react";

export function PainelAfiliadoLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    phone: ""
  });

  // Clear any existing token when page loads
  useEffect(() => {
    // Always clear token when landing on login page
    localStorage.removeItem("affiliateToken");
    sessionStorage.removeItem("affiliateLoggedOut");
  }, []);

  // Check if affiliate is already logged in
  const { data: affiliateSession } = useQuery({
    queryKey: ["/api/affiliate/check"],
    retry: false,
    enabled: true,
    queryFn: async () => {
      try {
        const response = await fetch("/api/affiliate/check", {
          credentials: "include",
        });
        if (response.ok) {
          return response.json();
        }
        return null; // Return null if not authenticated instead of throwing error
      } catch {
        return null; // Return null on any error
      }
    }
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      setErrorMessage("");
      setSuccessMessage("");
      return await apiRequest("/api/affiliate/login", "POST", data);
    },
    onSuccess: (data) => {
      // Store the affiliate token
      if (data.token) {
        localStorage.setItem("affiliateToken", data.token);
      }
      setSuccessMessage("Login realizado com sucesso! Redirecionando...");
      setErrorMessage("");
      // Small delay to ensure token is stored
      setTimeout(() => {
        setLocation("/afiliados/dashboard");
      }, 100);
    },
    onError: (error: any) => {
      // Extract and format error message
      const message = error.error || error.message || "Email ou senha incorretos";
      
      // Format professional error message
      if (message.toLowerCase().includes("incorrect") || message.toLowerCase().includes("incorreto") || message.toLowerCase().includes("invalid")) {
        setErrorMessage("Email ou senha incorretos. Verifique suas credenciais e tente novamente.");
      } else if (message.toLowerCase().includes("not found") || message.toLowerCase().includes("não encontrado")) {
        setErrorMessage("Afiliado não encontrado. Verifique o email digitado.");
      } else if (message.toLowerCase().includes("blocked") || message.toLowerCase().includes("bloqueado")) {
        setErrorMessage("Conta bloqueada. Entre em contato com o suporte.");
      } else if (message.toLowerCase().includes("inactive") || message.toLowerCase().includes("inativo")) {
        setErrorMessage("Conta inativa. Entre em contato com o suporte para reativar.");
      } else {
        setErrorMessage("Email ou senha incorretos. Verifique suas credenciais.");
      }
      setSuccessMessage("");
    }
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; name: string; phone: string }) => {
      setErrorMessage("");
      setSuccessMessage("");
      // Add confirmPassword and cpfCnpj for backend validation
      const requestData = {
        ...data,
        confirmPassword: data.password,
        cpfCnpj: "00000000000" // Default CPF for test
      };
      return await apiRequest("/api/affiliate/register", "POST", requestData);
    },
    onSuccess: () => {
      setSuccessMessage("Cadastro realizado com sucesso! Faça login para continuar.");
      setErrorMessage("");
      setIsLogin(true);
      setFormData({ email: "", password: "", name: "", phone: "" });
    },
    onError: (error: any) => {
      // Extract and format error message
      const message = error.error || error.message || "Não foi possível realizar o cadastro";
      
      // Format professional error message
      if (message.toLowerCase().includes("already exists") || message.toLowerCase().includes("já existe") || message.toLowerCase().includes("already registered")) {
        setErrorMessage("Este email já está cadastrado. Faça login ou use outro email.");
      } else if (message.toLowerCase().includes("phone") && (message.toLowerCase().includes("exists") || message.toLowerCase().includes("existe"))) {
        setErrorMessage("Este telefone já está cadastrado. Use outro número ou faça login.");
      } else if (message.toLowerCase().includes("invalid") || message.toLowerCase().includes("inválido")) {
        setErrorMessage("Dados inválidos. Verifique as informações e tente novamente.");
      } else if (message.toLowerCase().includes("password")) {
        setErrorMessage("A senha deve ter no mínimo 8 caracteres.");
      } else {
        setErrorMessage("Erro ao criar conta. Verifique os dados e tente novamente.");
      }
      setSuccessMessage("");
    }
  });

  // Don't redirect automatically - let user control navigation

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      loginMutation.mutate({ email: formData.email, password: formData.password });
    } else {
      registerMutation.mutate(formData);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#00E880] opacity-10 blur-[120px] rounded-full" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-600 opacity-10 blur-[120px] rounded-full" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img 
              src={maniaLogo} 
              alt="Mania Brasil" 
              className="h-16 w-auto"
            />
          </div>

          {/* Login/Register Card */}
          <Card className="bg-gradient-to-br from-zinc-900/95 to-black/95 border border-zinc-800 backdrop-blur-xl">
            <CardContent className="p-8">
              <div className="space-y-6">
                {/* Title */}
                <div className="text-center space-y-2">
                  <h1 className="text-2xl font-bold text-white">
                    Painel de Afiliados
                  </h1>
                  <p className="text-zinc-400 text-sm">
                    {isLogin ? "Entre na sua conta" : "Crie sua conta de afiliado"}
                  </p>
                </div>

                {/* Error/Success Messages */}
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-red-900/20 border border-red-800/50 rounded-lg"
                  >
                    <p className="text-red-400 text-sm font-medium text-center">
                      {errorMessage}
                    </p>
                  </motion.div>
                )}

                {successMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-green-900/20 border border-green-800/50 rounded-lg"
                  >
                    <p className="text-green-400 text-sm font-medium text-center">
                      {successMessage}
                    </p>
                  </motion.div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {!isLogin && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-zinc-300">Nome completo</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                          <Input
                            id="name"
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="pl-10 bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-500"
                            placeholder="Seu nome"
                            required={!isLogin}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-zinc-300">Telefone</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                          <Input
                            id="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="pl-10 bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-500"
                            placeholder="(00) 00000-0000"
                            required={!isLogin}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-zinc-300">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="pl-10 bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-500"
                        placeholder="seu@email.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-zinc-300">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="pl-10 pr-10 bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-500"
                        placeholder="********"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loginMutation.isPending || registerMutation.isPending}
                    className="w-full bg-gradient-to-r from-[#00E880] to-green-600 hover:from-green-600 hover:to-[#00E880] text-black font-semibold"
                  >
                    {loginMutation.isPending || registerMutation.isPending ? (
                      "Processando..."
                    ) : isLogin ? (
                      <>
                        <LogIn className="w-4 h-4 mr-2" />
                        Entrar
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Cadastrar
                      </>
                    )}
                  </Button>
                </form>

                {/* Toggle Login/Register */}
                <div className="text-center space-y-2">
                  <p className="text-zinc-400 text-sm">
                    {isLogin ? "Não tem conta?" : "Já tem conta?"}
                  </p>
                  <button
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-[#00E880] hover:underline text-sm font-medium"
                  >
                    {isLogin ? "Cadastre-se agora" : "Fazer login"}
                  </button>
                </div>

                {/* Features */}
                <div className="pt-6 border-t border-zinc-800 space-y-3">
                  <p className="text-xs text-zinc-500 text-center mb-3">BENEFÍCIOS DO PROGRAMA</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <TrendingUp className="w-4 h-4 text-[#00E880]" />
                      <span className="text-xs">Comissões até 50%</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-400">
                      <DollarSign className="w-4 h-4 text-[#00E880]" />
                      <span className="text-xs">Pagamento rápido</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Users className="w-4 h-4 text-[#00E880]" />
                      <span className="text-xs">Suporte dedicado</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-400">
                      <BarChart3 className="w-4 h-4 text-[#00E880]" />
                      <span className="text-xs">Dashboard completo</span>
                    </div>
                  </div>
                </div>

                {/* Back Button */}
                <Button
                  onClick={() => setLocation("/")}
                  variant="ghost"
                  className="w-full text-zinc-400 hover:text-white hover:bg-zinc-900/50"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar ao Site
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-zinc-500">
              © 2025 Mania Brasil. Todos os direitos reservados.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}