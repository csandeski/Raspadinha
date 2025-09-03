import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { EyeIcon, EyeOffIcon, X, Mail, Phone, User, Lock, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { suggestEmailDomains } from "@/lib/utils";

// Import banners
import loginBanner from "/banners/login-banner.webp";
import registerBanner from "/banners/register-banner.webp";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "login" | "register";
}

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha obrigatória"),
});

const phoneSchema = z.object({
  phone: z.string().min(14, "Telefone inválido").max(15, "Telefone inválido"),
  password: z.string().min(1, "Senha obrigatória"),
});

const registerSchema = z.object({
  name: z.string().min(2, "Nome muito curto"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().min(14, "Telefone inválido").max(15, "Telefone inválido"),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

export default function AuthModal({ isOpen, onClose, defaultTab = "login" }: AuthModalProps) {
  const [, setLocation] = useLocation();
  const { login, register } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("email");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailSuggestions, setEmailSuggestions] = useState<string[]>([]);
  const [showEmailSuggestions, setShowEmailSuggestions] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isPhoneLoading, setIsPhoneLoading] = useState(false);
  const [isRegisterLoading, setIsRegisterLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [registerError, setRegisterError] = useState("");

  const emailForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const phoneForm = useForm<z.infer<typeof phoneSchema>>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: "", password: "" },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", phone: "", password: "", confirmPassword: "" },
  });

  // Clear errors when changing tabs or login method
  useEffect(() => {
    setLoginError("");
    setRegisterError("");
  }, [activeTab, loginMethod]);

  // Format phone number
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "").slice(0, 11);
    if (numbers.length <= 2) return `(${numbers}`;
    if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  };

  const handleEmailLogin = async (data: z.infer<typeof loginSchema>) => {
    setIsEmailLoading(true);
    setLoginError("");
    try {
      await login({ email: data.email, password: data.password });
      onClose();
    } catch (error: any) {
      // Extract clean error message
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || "Email ou senha incorretos";
      // Format professional error message
      if (errorMessage.toLowerCase().includes("credenciais") || errorMessage.toLowerCase().includes("invalid")) {
        setLoginError("Email ou senha incorretos. Verifique suas credenciais e tente novamente.");
      } else if (errorMessage.toLowerCase().includes("não encontrado")) {
        setLoginError("Usuário não encontrado. Verifique o email digitado.");
      } else {
        setLoginError(errorMessage);
      }
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handlePhoneLogin = async (data: z.infer<typeof phoneSchema>) => {
    setIsPhoneLoading(true);
    setLoginError("");
    try {
      const cleanPhone = data.phone.replace(/\D/g, "");
      await login({ phone: cleanPhone, password: data.password });
      onClose();
    } catch (error: any) {
      // Extract clean error message
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || "Telefone ou senha incorretos";
      // Format professional error message
      if (errorMessage.toLowerCase().includes("credenciais") || errorMessage.toLowerCase().includes("invalid")) {
        setLoginError("Telefone ou senha incorretos. Verifique suas credenciais e tente novamente.");
      } else if (errorMessage.toLowerCase().includes("não encontrado")) {
        setLoginError("Usuário não encontrado. Verifique o telefone digitado.");
      } else {
        setLoginError(errorMessage);
      }
    } finally {
      setIsPhoneLoading(false);
    }
  };

  const handleRegister = async (data: z.infer<typeof registerSchema>) => {
    setIsRegisterLoading(true);
    setRegisterError("");
    try {
      const cleanPhone = data.phone.replace(/\D/g, "");
      await register({
        name: data.name,
        email: data.email,
        phone: cleanPhone,
        password: data.password,
        cpf: "00000000000",
        isAdult: true
      });
      toast({ description: "Conta criada com sucesso!" });
      onClose();
    } catch (error: any) {
      // Extract clean error message
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || "Erro ao criar conta";
      // Format professional error message
      if (errorMessage.toLowerCase().includes("already exists") || errorMessage.toLowerCase().includes("já existe") || errorMessage.toLowerCase().includes("already registered")) {
        setRegisterError("Este email já está cadastrado. Use outro email ou faça login.");
      } else if (errorMessage.toLowerCase().includes("phone") && errorMessage.toLowerCase().includes("exists")) {
        setRegisterError("Este telefone já está cadastrado. Use outro número ou faça login.");
      } else if (errorMessage.toLowerCase().includes("invalid") || errorMessage.toLowerCase().includes("inválido")) {
        setRegisterError("Dados inválidos. Verifique as informações e tente novamente.");
      } else if (errorMessage.toLowerCase().includes("password")) {
        setRegisterError("A senha deve ter no mínimo 8 caracteres.");
      } else {
        setRegisterError("Erro ao criar conta. Verifique os dados e tente novamente.");
      }
    } finally {
      setIsRegisterLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Container */}
          <div className="bg-gradient-to-b from-gray-900 to-gray-800 backdrop-blur-xl rounded-3xl border border-gray-700 shadow-2xl relative overflow-hidden">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-white/[0.02] pointer-events-none"></div>
            
            {/* Banner at top */}
            <div className="relative h-36 w-full overflow-hidden">
              <img 
                src={activeTab === "login" ? loginBanner : registerBanner} 
                alt={activeTab === "login" ? "Login" : "Cadastro"}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-900/60 to-gray-900/90"></div>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/80 hover:text-white transition-all z-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full p-2.5 shadow-lg hover:shadow-xl hover:scale-110"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Content */}
            <div className="p-8 pt-4">
              {/* Tab Navigation */}
              <div className="flex bg-black/30 rounded-xl p-1.5 mb-8 border border-gray-700/50 shadow-inner">
                <button
                  onClick={() => setActiveTab("login")}
                  className={`flex-1 py-3 text-center rounded-lg font-bold transition-all duration-300 ${
                    activeTab === "login"
                      ? "bg-gradient-to-r from-[#00E880] to-[#00D470] text-black shadow-lg shadow-[#00E880]/30 scale-[1.02]"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  Conecte-se
                </button>
                <button
                  onClick={() => setActiveTab("register")}
                  className={`flex-1 py-3 text-center rounded-lg font-bold transition-all duration-300 ${
                    activeTab === "register"
                      ? "bg-gradient-to-r from-[#00E880] to-[#00D470] text-black shadow-lg shadow-[#00E880]/30 scale-[1.02]"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  Inscrever-se
                </button>
              </div>

              {/* Login Tab */}
              {activeTab === "login" && (
                <>
                  {/* Title with decorative line */}
                  <div className="mb-6">
                    <h2 className="text-white text-xl font-bold mb-2">
                      Bem-vindo de volta!
                    </h2>
                    <p className="text-gray-400 text-sm">Faça login para continuar jogando</p>
                  </div>

                  {/* Login Method Buttons */}
                  <div className="flex gap-2 mb-6 p-1 bg-black/20 rounded-xl">
                    <button
                      onClick={() => setLoginMethod("email")}
                      className={`flex-1 py-2.5 px-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                        loginMethod === "email"
                          ? "bg-gradient-to-r from-[#00E880] to-[#00D470] text-black shadow-lg scale-[1.02]"
                          : "bg-transparent text-gray-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Mail className="w-4 h-4" />
                      E-mail
                    </button>
                    <button
                      onClick={() => setLoginMethod("phone")}
                      className={`flex-1 py-2.5 px-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                        loginMethod === "phone"
                          ? "bg-gradient-to-r from-[#00E880] to-[#00D470] text-black shadow-lg scale-[1.02]"
                          : "bg-transparent text-gray-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Phone className="w-4 h-4" />
                      Telefone
                    </button>
                  </div>

                  {/* Login Forms */}
                  {loginMethod === "email" ? (
                    <Form {...emailForm}>
                      <form onSubmit={emailForm.handleSubmit(handleEmailLogin)} className="space-y-5">
                        <FormField
                          control={emailForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-300 text-sm font-semibold">E-mail</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                                  <Input
                                    {...field}
                                    type="email"
                                    placeholder="seu@email.com"
                                    className="bg-black/40 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-[#00E880] focus:ring-2 focus:ring-[#00E880]/20 h-12 pl-10 rounded-xl hover:bg-black/50 transition-colors"
                                  />
                                </div>
                              </FormControl>
                              <FormMessage className="text-red-400 text-xs mt-1" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={emailForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-300 text-sm font-semibold">Senha</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                                  <Input
                                    {...field}
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    className="bg-black/40 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-[#00E880] focus:ring-2 focus:ring-[#00E880]/20 h-12 pl-10 pr-12 rounded-xl hover:bg-black/50 transition-colors"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-1"
                                  >
                                    {showPassword ? (
                                      <EyeOffIcon className="w-4 h-4" />
                                    ) : (
                                      <EyeIcon className="w-4 h-4" />
                                    )}
                                  </button>
                                </div>
                              </FormControl>
                              <FormMessage className="text-red-400 text-xs mt-1" />
                            </FormItem>
                          )}
                        />

                        {/* Error Message */}
                        {loginError && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-3 bg-red-900/20 border border-red-800/50 rounded-lg"
                          >
                            <p className="text-red-400 text-sm font-medium text-center">
                              {loginError}
                            </p>
                          </motion.div>
                        )}

                        <Button
                          type="submit"
                          className="w-full bg-gradient-to-r from-[#00E880] to-[#00D470] hover:from-[#00D470] hover:to-[#00C560] text-black font-bold py-5 rounded-xl shadow-lg transform transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                          disabled={emailForm.formState.isSubmitting}
                        >
                          {emailForm.formState.isSubmitting ? (
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                              <span>Entrando...</span>
                            </div>
                          ) : (
                            "Entrar"
                          )}
                        </Button>
                      </form>
                    </Form>
                  ) : (
                    <Form {...phoneForm}>
                      <form onSubmit={phoneForm.handleSubmit(handlePhoneLogin)} className="space-y-5">
                        <FormField
                          control={phoneForm.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-300 text-sm font-semibold">Telefone</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                                  <Input
                                    {...field}
                                    type="tel"
                                    placeholder="(11) 91234-5678"
                                    className="bg-black/40 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-[#00E880] focus:ring-2 focus:ring-[#00E880]/20 h-12 pl-10 rounded-xl hover:bg-black/50 transition-colors"
                                    onChange={(e) => {
                                      const formatted = formatPhone(e.target.value);
                                      field.onChange(formatted);
                                    }}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage className="text-red-400 text-xs mt-1" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={phoneForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-300 text-sm font-semibold">Senha</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                                  <Input
                                    {...field}
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    className="bg-black/40 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-[#00E880] focus:ring-2 focus:ring-[#00E880]/20 h-12 pl-10 pr-12 rounded-xl hover:bg-black/50 transition-colors"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-1"
                                  >
                                    {showPassword ? (
                                      <EyeOffIcon className="w-4 h-4" />
                                    ) : (
                                      <EyeIcon className="w-4 h-4" />
                                    )}
                                  </button>
                                </div>
                              </FormControl>
                              <FormMessage className="text-red-400 text-xs mt-1" />
                            </FormItem>
                          )}
                        />

                        {/* Error Message */}
                        {loginError && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-3 bg-red-900/20 border border-red-800/50 rounded-lg"
                          >
                            <p className="text-red-400 text-sm font-medium text-center">
                              {loginError}
                            </p>
                          </motion.div>
                        )}

                        <Button
                          type="submit"
                          className="w-full bg-gradient-to-r from-[#00E880] to-[#00D470] hover:from-[#00D470] hover:to-[#00C560] text-black font-bold py-5 rounded-xl shadow-lg transform transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                          disabled={phoneForm.formState.isSubmitting}
                        >
                          {phoneForm.formState.isSubmitting ? (
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                              <span>Entrando...</span>
                            </div>
                          ) : (
                            "Entrar"
                          )}
                        </Button>
                      </form>
                    </Form>
                  )}
                </>
              )}

              {/* Register Tab */}
              {activeTab === "register" && (
                <>
                  {/* Title with decorative line */}
                  <div className="mb-4">
                    <h2 className="text-white text-xl font-bold mb-1">
                      Crie sua conta grátis
                    </h2>
                    <p className="text-gray-400 text-sm">Comece a jogar e ganhar agora mesmo</p>
                  </div>

                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-3">
                      <FormField
                        control={registerForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-300 text-sm font-semibold">Nome completo</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <Input
                                  {...field}
                                  placeholder="João Silva"
                                  className="bg-black/40 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-[#00E880] focus:ring-2 focus:ring-[#00E880]/20 h-10 pl-10 rounded-xl hover:bg-black/50 transition-colors"
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    const formatted = value.split(' ')
                                      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                                      .join(' ');
                                    field.onChange(formatted);
                                  }}
                                />
                              </div>
                            </FormControl>
                            <FormMessage className="text-red-400 text-xs" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem className="relative">
                            <FormLabel className="text-gray-300 text-sm font-semibold">E-mail</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <Input
                                  {...field}
                                  type="email"
                                  placeholder="seu@email.com"
                                  className="bg-black/40 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-[#00E880] focus:ring-2 focus:ring-[#00E880]/20 h-10 pl-10 rounded-xl hover:bg-black/50 transition-colors"
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    field.onChange(value);
                                    
                                    if (value.includes('@') && !value.includes('.', value.indexOf('@'))) {
                                      const [, domain] = value.split('@');
                                      const suggestions = suggestEmailDomains(domain);
                                      setEmailSuggestions(suggestions.map(s => value.split('@')[0] + '@' + s));
                                      setShowEmailSuggestions(true);
                                    } else {
                                      setShowEmailSuggestions(false);
                                    }
                                  }}
                                  onBlur={() => setTimeout(() => setShowEmailSuggestions(false), 200)}
                                />
                              </div>
                            </FormControl>
                            {showEmailSuggestions && emailSuggestions.length > 0 && (
                              <div className="absolute z-10 w-full mt-1 bg-gray-900 border border-gray-700 rounded-xl shadow-xl overflow-hidden">
                                {emailSuggestions.map((suggestion, index) => (
                                  <button
                                    key={index}
                                    type="button"
                                    className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-all flex items-center gap-2"
                                    onClick={() => {
                                      field.onChange(suggestion);
                                      setShowEmailSuggestions(false);
                                    }}
                                  >
                                    <Mail className="w-3 h-3 text-gray-500" />
                                    {suggestion}
                                  </button>
                                ))}
                              </div>
                            )}
                            <FormMessage className="text-red-400 text-xs" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-300 text-sm font-semibold">Telefone</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <Input
                                  {...field}
                                  type="tel"
                                  placeholder="(11) 91234-5678"
                                  className="bg-black/40 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-[#00E880] focus:ring-2 focus:ring-[#00E880]/20 h-10 pl-10 rounded-xl hover:bg-black/50 transition-colors"
                                  onChange={(e) => {
                                    const formatted = formatPhone(e.target.value);
                                    field.onChange(formatted);
                                  }}
                                />
                              </div>
                            </FormControl>
                            <FormMessage className="text-red-400 text-xs" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-300 text-sm font-semibold">Senha</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <Input
                                  {...field}
                                  type={showPassword ? "text" : "password"}
                                  placeholder="Mínimo 8 caracteres"
                                  className="bg-black/40 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-[#00E880] focus:ring-2 focus:ring-[#00E880]/20 h-10 pl-10 pr-12 rounded-xl hover:bg-black/50 transition-colors"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-1"
                                >
                                  {showPassword ? (
                                    <EyeOffIcon className="w-4 h-4" />
                                  ) : (
                                    <EyeIcon className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage className="text-red-400 text-xs" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-300 text-sm font-semibold">Confirmar senha</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <Input
                                  {...field}
                                  type={showConfirmPassword ? "text" : "password"}
                                  placeholder="Repita a senha"
                                  className="bg-black/40 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-[#00E880] focus:ring-2 focus:ring-[#00E880]/20 h-10 pl-10 pr-12 rounded-xl hover:bg-black/50 transition-colors"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-1"
                                >
                                  {showConfirmPassword ? (
                                    <EyeOffIcon className="w-4 h-4" />
                                  ) : (
                                    <EyeIcon className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage className="text-red-400 text-xs" />
                          </FormItem>
                        )}
                      />

                      {/* Error Message */}
                      {registerError && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-3 bg-red-900/20 border border-red-800/50 rounded-lg"
                        >
                          <p className="text-red-400 text-sm font-medium text-center">
                            {registerError}
                          </p>
                        </motion.div>
                      )}

                      <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-[#00E880] to-[#00D470] hover:from-[#00D470] hover:to-[#00C560] text-black font-bold py-5 rounded-xl shadow-lg transform transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                        disabled={registerForm.formState.isSubmitting}
                      >
                        {registerForm.formState.isSubmitting ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                            <span>Criando conta...</span>
                          </div>
                        ) : (
                          "Criar conta"
                        )}
                      </Button>
                    </form>
                  </Form>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}