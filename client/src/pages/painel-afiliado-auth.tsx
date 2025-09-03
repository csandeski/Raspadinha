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
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Clear ALL tokens when auth page loads to prevent any loops
  useEffect(() => {
    // Always clear tokens on auth page load to ensure clean state
    localStorage.removeItem("affiliateToken");
    localStorage.removeItem("affiliateRememberMe");
    sessionStorage.clear();
    
    // Stop any ongoing queries by clearing query cache
    queryClient.clear();
  }, []);
  
  // Check URL parameter to determine initial tab
  const searchParams = new URLSearchParams(window.location.search);
  const initialMode = searchParams.get('mode');
  const [isLogin, setIsLogin] = useState(initialMode !== 'register');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registerStep, setRegisterStep] = useState(1);
  const [showEmailSuggestions, setShowEmailSuggestions] = useState(false);
  const [emailPrefix, setEmailPrefix] = useState('');
  const [emailDomainFilter, setEmailDomainFilter] = useState('');
  const [loginError, setLoginError] = useState('');
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    phone: ""
  });
  const [rememberMe, setRememberMe] = useState(false);

  // Common email domains for suggestions (without @ symbol)
  const emailDomains = [
    "gmail.com",
    "hotmail.com", 
    "outlook.com",
    "yahoo.com",
    "icloud.com",
    "live.com"
  ];

  // Format phone number
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      const match = numbers.match(/^(\d{0,2})(\d{0,5})(\d{0,4})$/);
      if (match) {
        return !match[2]
          ? match[1]
          : `(${match[1]}) ${match[3] ? `${match[2]}-${match[3]}` : match[2]}`;
      }
    }
    return value;
  };

  // Filter domains based on user input
  const filteredDomains = emailDomains.filter(domain => 
    domain.toLowerCase().startsWith(emailDomainFilter.toLowerCase())
  );

  // Handle email input and suggestions
  const handleEmailChange = (value: string) => {
    setFormData({ ...formData, email: value });
    
    // Check if @ is typed
    if (value.includes('@')) {
      const parts = value.split('@');
      const prefix = parts[0];
      const domainPart = parts[1] || '';
      
      setEmailPrefix(prefix);
      setEmailDomainFilter(domainPart);
      
      // Don't show suggestions if there's already a dot in the domain part
      if (!domainPart.includes('.')) {
        setShowEmailSuggestions(true);
      } else {
        setShowEmailSuggestions(false);
      }
    } else {
      setShowEmailSuggestions(false);
      setEmailDomainFilter('');
    }
  };

  // Select email suggestion
  const selectEmailSuggestion = (domain: string) => {
    setFormData({ ...formData, email: `${emailPrefix}@${domain}` });
    setShowEmailSuggestions(false);
    setEmailDomainFilter('');
  };

  // Validate password requirements
  const validatePassword = (password: string) => {
    const hasMinLength = password.length >= 8;
    const hasNumber = /\d/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    return {
      isValid: hasMinLength && hasNumber && hasUpperCase,
      hasMinLength,
      hasNumber,
      hasUpperCase
    };
  };

  // NO AUTO-LOGIN - User must manually login
  // This prevents login loop issues when logging out

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      return await apiRequest("/api/affiliate/login", "POST", data);
    },
    onSuccess: (data) => {
      if (data.token) {
        // Always save to sessionStorage
        localStorage.setItem("affiliateToken", data.token);
        
        // If "remember me" is checked, also save persistently
        if (rememberMe) {
          localStorage.setItem("affiliateTokenPersistent", data.token);
          localStorage.setItem("affiliateEmailPersistent", formData.email);
        } else {
          // Clear persistent storage if not remembering
          localStorage.removeItem("affiliateTokenPersistent");
          localStorage.removeItem("affiliateEmailPersistent");
        }
      }
      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo ao painel de afiliados"
      });
      setTimeout(() => {
        setLocation("/afiliados/dashboard");
      }, 100);
    },
    onError: (error: Error) => {
      setLoginError(error.message || "Email ou senha incorretos");
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
      setFormData({ email: "", password: "", confirmPassword: "", name: "", phone: "" });
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
      // Step 1: Validate name and phone
      if (registerStep === 1) {
        if (!formData.name.trim()) {
          toast({
            title: "Nome obrigatório",
            description: "Por favor, preencha seu nome completo",
            variant: "destructive"
          });
          return;
        }
        if (formData.phone.replace(/\D/g, "").length < 10) {
          toast({
            title: "Telefone inválido",
            description: "Por favor, insira um telefone válido",
            variant: "destructive"
          });
          return;
        }
        setRegisterStep(2);
      } 
      // Step 2: Validate email and passwords
      else {
        const passwordValidation = validatePassword(formData.password);
        if (!passwordValidation.isValid) {
          toast({
            title: "Senha inválida",
            description: "A senha deve ter 8+ caracteres, 1 número e 1 letra maiúscula",
            variant: "destructive"
          });
          return;
        }
        if (formData.password !== formData.confirmPassword) {
          toast({
            title: "Senhas não coincidem",
            description: "As duas senhas devem ser iguais",
            variant: "destructive"
          });
          return;
        }
        registerMutation.mutate({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          phone: formData.phone
        });
      }
    }
  };

  const handleBackStep = () => {
    setRegisterStep(1);
  };

  const features = [
    { icon: <TrendingUp className="w-5 h-5" />, text: "Sistema de níveis progressivo" },
    { icon: <DollarSign className="w-5 h-5" />, text: "Comissões de até 70%" },
    { icon: <Zap className="w-5 h-5" />, text: "Pagamentos via PIX instantâneo" },
    { icon: <BarChart3 className="w-5 h-5" />, text: "Dashboard em tempo real" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-black relative overflow-hidden">
      {/* Fixed Mobile Header with Back Button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50">
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => setLocation("/afiliados")}
          className="flex items-center gap-3 p-4 w-full text-left hover:bg-gray-900/20 transition-colors group"
        >
          <div className="bg-[#00E880]/10 backdrop-blur-sm p-2 rounded-lg group-hover:bg-[#00E880]/20 transition-colors">
            <ArrowLeft className="w-5 h-5 text-[#00E880]" />
          </div>
          <div>
            <span className="text-white font-semibold block">Voltar</span>
            <span className="text-gray-400 text-xs">Para página de afiliados</span>
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
                onClick={() => setLocation("/afiliados")}
                className="inline-flex items-center gap-2 mb-6 text-gray-400 hover:text-white transition-all group"
              >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                <span className="text-sm font-medium">Voltar</span>
              </motion.button>
              
              <img src={maniaLogo} alt="Logo" className="h-14 w-auto mb-8" />
              <h1 className="text-4xl xl:text-5xl font-bold text-white mb-4 leading-tight">
                Programa de <span className="text-[#00E880]">Afiliados</span>
              </h1>
              <p className="text-gray-400 text-lg mb-8">
                Ganhe até 70% de comissão e transforme sua audiência em renda recorrente.
              </p>
              
              {/* Minimal Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-xl p-4">
                  <div className="text-[#00E880] text-2xl font-bold mb-1">R$ 487K</div>
                  <div className="text-gray-500 text-sm">Pago em comissões</div>
                </div>
                <div className="bg-gray-900/50 backdrop-blur border border-gray-800 rounded-xl p-4">
                  <div className="text-[#00E880] text-2xl font-bold mb-1">2.8K+</div>
                  <div className="text-gray-500 text-sm">Afiliados ativos</div>
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
                  <h2 className="text-xl font-bold text-white">Programa de Afiliados</h2>
                </div>

                {/* Clean Tabs - Mobile Optimized */}
                <div className="flex gap-2 mb-6 sm:mb-8">
                  <button
                    onClick={() => {
                      setIsLogin(true);
                      setRegisterStep(1);
                    }}
                    className={`flex-1 py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl font-medium text-sm sm:text-base transition-all ${
                      isLogin
                        ? "bg-[#00E880] text-black shadow-lg shadow-[#00E880]/20"
                        : "bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-800"
                    }`}
                  >
                    Entrar
                  </button>
                  <button
                    onClick={() => {
                      setIsLogin(false);
                      setRegisterStep(1);
                    }}
                    className={`flex-1 py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl font-medium text-sm sm:text-base transition-all ${
                      !isLogin
                        ? "bg-[#00E880] text-black shadow-lg shadow-[#00E880]/20"
                        : "bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-800"
                    }`}
                  >
                    Cadastrar
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Registration Step Indicator */}
                  {!isLogin && (
                    <div className="flex items-center justify-center gap-2 mb-6">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                        registerStep >= 1 ? 'bg-[#00E880] text-black' : 'bg-gray-700 text-gray-400'
                      }`}>
                        1
                      </div>
                      <div className={`w-20 h-1 ${registerStep >= 2 ? 'bg-[#00E880]' : 'bg-gray-700'}`} />
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                        registerStep >= 2 ? 'bg-[#00E880] text-black' : 'bg-gray-700 text-gray-400'
                      }`}>
                        2
                      </div>
                    </div>
                  )}

                  {/* Registration Step 1: Name and Phone */}
                  {!isLogin && registerStep === 1 && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium text-gray-300">
                          Nome Completo
                        </Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <Input
                            id="name"
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="pl-10 bg-gray-800/30 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-[#00E880] focus:bg-gray-800/50 transition-all h-12 rounded-xl"
                            placeholder="Seu nome completo"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-sm font-medium text-gray-300">
                          Telefone
                        </Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <Input
                            id="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                            className="pl-10 bg-gray-800/30 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-[#00E880] focus:bg-gray-800/50 transition-all h-12 rounded-xl"
                            placeholder="(00) 00000-0000"
                            maxLength={15}
                            required
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Registration Step 2: Email and Password */}
                  {!isLogin && registerStep === 2 && (
                    <>
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
                            onChange={(e) => handleEmailChange(e.target.value)}
                            onBlur={() => setTimeout(() => setShowEmailSuggestions(false), 200)}
                            className="pl-10 bg-gray-800/30 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-[#00E880] focus:bg-gray-800/50 transition-all h-12 rounded-xl"
                            placeholder="seu@email.com"
                            autoComplete="off"
                            required
                          />
                          {showEmailSuggestions && filteredDomains.length > 0 && (
                            <div className="absolute top-full mt-1 w-full bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                              {filteredDomains.map((domain) => (
                                <button
                                  key={domain}
                                  type="button"
                                  onClick={() => selectEmailSuggestion(domain)}
                                  className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-800 hover:text-[#00E880] transition-colors"
                                >
                                  {emailPrefix}@{domain}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

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
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="pl-10 pr-10 bg-gray-800/30 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-[#00E880] focus:bg-gray-800/50 transition-all h-12 rounded-xl"
                            placeholder="Mínimo 8 caracteres"
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
                        {formData.password && (
                          <div className="text-xs space-y-1 mt-2">
                            <div className={`flex items-center gap-2 ${formData.password.length >= 8 ? 'text-green-500' : 'text-gray-500'}`}>
                              {formData.password.length >= 8 ? '✓' : '○'} Mínimo 8 caracteres
                            </div>
                            <div className={`flex items-center gap-2 ${/\d/.test(formData.password) ? 'text-green-500' : 'text-gray-500'}`}>
                              {/\d/.test(formData.password) ? '✓' : '○'} Pelo menos 1 número
                            </div>
                            <div className={`flex items-center gap-2 ${/[A-Z]/.test(formData.password) ? 'text-green-500' : 'text-gray-500'}`}>
                              {/[A-Z]/.test(formData.password) ? '✓' : '○'} Pelo menos 1 letra maiúscula
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-300">
                          Confirmar Senha
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            className="pl-10 pr-10 bg-gray-800/30 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-[#00E880] focus:bg-gray-800/50 transition-all h-12 rounded-xl"
                            placeholder="Repita a senha"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                          <p className="text-xs text-red-500">As senhas não coincidem</p>
                        )}
                      </div>
                    </>
                  )}

                  {/* Login Fields */}
                  {isLogin && (
                    <>
                      {/* Login Error Message */}
                      {loginError && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mb-4"
                        >
                          <p className="text-red-400 text-sm font-medium">{loginError}</p>
                        </motion.div>
                      )}
                      
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
                              handleEmailChange(e.target.value);
                              if (loginError) setLoginError("");
                            }}
                            onBlur={() => setTimeout(() => setShowEmailSuggestions(false), 200)}
                            className="pl-10 bg-gray-800/30 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-[#00E880] focus:bg-gray-800/50 transition-all h-12 rounded-xl"
                            placeholder="seu@email.com"
                            autoComplete="off"
                            required
                          />
                          {showEmailSuggestions && filteredDomains.length > 0 && (
                            <div className="absolute top-full mt-1 w-full bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                              {filteredDomains.map((domain) => (
                                <button
                                  key={domain}
                                  type="button"
                                  onClick={() => selectEmailSuggestion(domain)}
                                  className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-800 hover:text-[#00E880] transition-colors"
                                >
                                  {emailPrefix}@{domain}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

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
                      <div className="flex items-center gap-2">
                        <Checkbox 
                          id="rememberMe" 
                          checked={rememberMe}
                          onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                          className="border-gray-600 data-[state=checked]:bg-[#00E880] data-[state=checked]:border-[#00E880]"
                        />
                        <Label 
                          htmlFor="rememberMe" 
                          className="text-sm text-gray-400 cursor-pointer hover:text-gray-300 transition-colors"
                        >
                          Lembrar de mim
                        </Label>
                      </div>
                    </>
                  )}

                  <div className="pt-2">
                    {/* Back Button for Step 2 */}
                    {!isLogin && registerStep === 2 && (
                      <Button
                        type="button"
                        onClick={handleBackStep}
                        className="w-full mb-3 bg-gray-800/50 hover:bg-gray-800 text-gray-300 hover:text-white font-medium h-12 rounded-xl transition-all"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Voltar
                      </Button>
                    )}
                    
                    <Button
                      type="submit"
                      disabled={loginMutation.isPending || registerMutation.isPending}
                      className="w-full bg-[#00E880] hover:bg-[#00E880]/90 text-black font-semibold h-12 rounded-xl transition-all shadow-lg shadow-[#00E880]/20 hover:shadow-[#00E880]/30"
                    >
                      {loginMutation.isPending || registerMutation.isPending ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                          Processando...
                        </div>
                      ) : (
                        <span className="text-base">
                          {isLogin ? "Entrar na Conta" : 
                           registerStep === 1 ? "Próximo" : "Criar Conta"}
                        </span>
                      )}
                    </Button>
                  </div>

                  {isLogin && (
                    <div className="text-center pt-4 border-t border-gray-800/50">
                      <p className="text-sm text-gray-400">
                        Ainda não tem conta?{" "}
                        <button
                          type="button"
                          onClick={() => setIsLogin(false)}
                          className="text-[#00E880] hover:underline font-medium"
                        >
                          Cadastre-se agora
                        </button>
                      </p>
                    </div>
                  )}

                  {!isLogin && (
                    <div className="text-center pt-4 border-t border-gray-800/50">
                      <p className="text-sm text-gray-400">
                        Já possui conta?{" "}
                        <button
                          type="button"
                          onClick={() => setIsLogin(true)}
                          className="text-[#00E880] hover:underline font-medium"
                        >
                          Faça login
                        </button>
                      </p>
                    </div>
                  )}
                </form>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}