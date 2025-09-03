import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
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
  Zap,
  BarChart3
} from "lucide-react";

export function PainelAfiliadoAuth() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    phone: ""
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      return await apiRequest("/api/affiliate/login", "POST", data);
    },
    onSuccess: (data) => {
      if (data.token) {
        localStorage.setItem("affiliateToken", data.token);
      }
      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo ao painel de afiliados"
      });
      setTimeout(() => {
        setLocation("/painel/afiliados/dashboard");
      }, 100);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro no login",
        description: error.message || "Email ou senha incorretos",
        variant: "destructive"
      });
    }
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; name: string; phone: string }) => {
      const requestData = {
        ...data,
        confirmPassword: data.password,
        cpfCnpj: "00000000000"
      };
      return await apiRequest("/api/affiliate/register", "POST", requestData);
    },
    onSuccess: () => {
      toast({
        title: "Cadastro realizado com sucesso!",
        description: "Faça login para acessar o painel"
      });
      setIsLogin(true);
      setFormData({ email: "", password: "", name: "", phone: "" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro no cadastro",
        description: error.message || "Não foi possível realizar o cadastro",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      loginMutation.mutate({ email: formData.email, password: formData.password });
    } else {
      registerMutation.mutate(formData);
    }
  };

  const features = [
    { icon: <TrendingUp className="w-5 h-5" />, text: "Sistema de níveis progressivo" },
    { icon: <DollarSign className="w-5 h-5" />, text: "Comissões de até 70%" },
    { icon: <Zap className="w-5 h-5" />, text: "Pagamentos via PIX instantâneo" },
    { icon: <BarChart3 className="w-5 h-5" />, text: "Dashboard em tempo real" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden">
        <motion.div 
          animate={{ 
            x: [0, 100, 0],
            y: [0, -100, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-br from-[#00E880]/20 to-transparent rounded-full blur-3xl"
        />
        <motion.div
          animate={{ 
            x: [0, -100, 0],
            y: [0, 100, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-br from-purple-600/20 to-transparent rounded-full blur-3xl"
        />
      </div>

      <div className="relative z-10 w-full max-w-6xl">
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => setLocation("/painel/afiliados")}
          className="absolute top-4 left-4 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Voltar</span>
        </motion.button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left Side - Info */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="hidden lg:block space-y-8"
          >
            <div className="space-y-4">
              <img src={maniaLogo} alt="Logo" className="h-16 w-auto" />
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">
                  Programa de Afiliados
                </h1>
                <p className="text-gray-400 text-lg">
                  Transforme sua audiência em <span className="text-[#00E880]">renda recorrente</span>
                </p>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-4">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="p-3 bg-gradient-to-br from-[#00E880]/20 to-green-600/20 rounded-lg">
                    <div className="text-[#00E880]">{feature.icon}</div>
                  </div>
                  <span className="text-gray-300">{feature.text}</span>
                </motion.div>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 p-6 bg-gray-800/30 rounded-xl">
              <div className="text-center">
                <p className="text-2xl font-bold text-[#00E880]">2.8K+</p>
                <p className="text-xs text-gray-500">Afiliados Ativos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-[#00E880]">R$ 487K</p>
                <p className="text-xs text-gray-500">Pago em Comissões</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-[#00E880]">92.4%</p>
                <p className="text-xs text-gray-500">Taxa de Conversão</p>
              </div>
            </div>
          </motion.div>

          {/* Right Side - Form */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="bg-gray-900/90 backdrop-blur-xl border-gray-800 p-8">
              {/* Mobile Logo */}
              <div className="lg:hidden mb-6 text-center">
                <img src={maniaLogo} alt="Logo" className="h-12 w-auto mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white">Programa de Afiliados</h2>
              </div>

              {/* Tabs */}
              <div className="flex mb-8 bg-gray-800/50 rounded-lg p-1">
                <button
                  onClick={() => setIsLogin(true)}
                  className={`flex-1 py-3 px-4 rounded-md font-medium transition-all ${
                    isLogin
                      ? "bg-gradient-to-r from-[#00E880] to-green-600 text-black"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <LogIn className="w-4 h-4 inline mr-2" />
                  Entrar
                </button>
                <button
                  onClick={() => setIsLogin(false)}
                  className={`flex-1 py-3 px-4 rounded-md font-medium transition-all ${
                    !isLogin
                      ? "bg-gradient-to-r from-[#00E880] to-green-600 text-black"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <UserPlus className="w-4 h-4 inline mr-2" />
                  Cadastrar
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <>
                    <div>
                      <Label htmlFor="name" className="text-gray-300">Nome Completo</Label>
                      <div className="relative mt-1">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <Input
                          id="name"
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="pl-10 bg-gray-800/50 border-gray-700 text-white focus:border-[#00E880]"
                          placeholder="Seu nome completo"
                          required={!isLogin}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="phone" className="text-gray-300">Telefone</Label>
                      <div className="relative mt-1">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="pl-10 bg-gray-800/50 border-gray-700 text-white focus:border-[#00E880]"
                          placeholder="(00) 00000-0000"
                          required={!isLogin}
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <Label htmlFor="email" className="text-gray-300">Email</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="pl-10 bg-gray-800/50 border-gray-700 text-white focus:border-[#00E880]"
                      placeholder="seu@email.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="password" className="text-gray-300">Senha</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="pl-10 pr-10 bg-gray-800/50 border-gray-700 text-white focus:border-[#00E880]"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loginMutation.isPending || registerMutation.isPending}
                  className="w-full bg-gradient-to-r from-[#00E880] to-green-600 text-black hover:opacity-90 font-semibold py-6"
                >
                  {loginMutation.isPending || registerMutation.isPending ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      Processando...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      {isLogin ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                      {isLogin ? "Entrar na Conta" : "Criar Conta"}
                    </div>
                  )}
                </Button>
              </form>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}