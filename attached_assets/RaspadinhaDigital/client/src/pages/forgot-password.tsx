import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Loader2, X, Phone, Lock, EyeIcon, EyeOffIcon, CheckCircle2, XCircle, MessageSquare, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Validation schemas
const smsSchema = z.object({
  phone: z.string().min(14, "Telefone inválido").max(15, "Telefone inválido"),
});

const smsCodeSchema = z.object({
  code: z.string().min(6, "Código deve ter 6 dígitos").max(6, "Código deve ter 6 dígitos"),
});

const resetSchema = z.object({
  password: z.string()
    .min(8, "Senha deve ter no mínimo 8 caracteres"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type SmsValues = z.infer<typeof smsSchema>;
type SmsCodeValues = z.infer<typeof smsCodeSchema>;
type ResetValues = z.infer<typeof resetSchema>;

// Phone formatting function
function formatPhone(value: string) {
  const numbers = value.replace(/\D/g, '').slice(0, 11);
  
  if (numbers.length <= 2) {
    return numbers;
  } else if (numbers.length <= 7) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  } else if (numbers.length <= 11) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  }
  
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
}

export default function ForgotPassword() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [screen, setScreen] = useState<'phone' | 'code' | 'reset'>('phone');
  const [resetToken, setResetToken] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [smsPhone, setSmsPhone] = useState<string>('');
  const [canResend, setCanResend] = useState(true);
  const [resendTimer, setResendTimer] = useState(0);

  const smsForm = useForm<SmsValues>({
    resolver: zodResolver(smsSchema),
    defaultValues: { phone: "" }
  });

  const smsCodeForm = useForm<SmsCodeValues>({
    resolver: zodResolver(smsCodeSchema),
    defaultValues: { code: "" }
  });

  const resetForm = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirmPassword: "" }
  });

  // Timer effect for resend countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [resendTimer]);

  const handleSendSms = async (values: SmsValues) => {
    setIsLoading(true);
    try {
      const cleanPhone = values.phone.replace(/\D/g, '');
      setSmsPhone(cleanPhone);
      
      const response = await apiRequest('/api/auth/send-sms-code', 'POST', {
        phone: cleanPhone
      });
      
      setScreen('code');
      setCanResend(false);
      setResendTimer(60); // 1 minute timer
      toast({ description: "Código enviado por SMS!" });
    } catch (error: any) {
      toast({ description: error.message || "Erro ao enviar SMS" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendSms = async () => {
    if (!canResend) return;
    
    setIsLoading(true);
    try {
      await apiRequest('/api/auth/send-sms-code', 'POST', {
        phone: smsPhone
      });
      
      setCanResend(false);
      setResendTimer(60); // 1 minute timer
      toast({ description: "Código reenviado!" });
    } catch (error: any) {
      toast({ description: error.message || "Erro ao reenviar SMS" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifySmsCode = async (values: SmsCodeValues) => {
    setIsLoading(true);
    try {
      const response = await apiRequest('/api/auth/verify-sms-code', 'POST', {
        phone: smsPhone,
        code: values.code
      });
      
      setResetToken(response.resetToken);
      setScreen('reset');
      toast({ description: "Código verificado com sucesso!" });
    } catch (error: any) {
      toast({ description: "Código inválido ou expirado" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async (values: ResetValues) => {
    setIsLoading(true);
    try {
      await apiRequest('/api/auth/reset-password-sms', 'POST', {
        resetToken,
        newPassword: values.password
      });
      
      toast({ description: "Senha alterada com sucesso!" });
      setLocation("/login");
    } catch (error: any) {
      toast({ description: "Erro ao alterar senha. Tente novamente" });
    } finally {
      setIsLoading(false);
    }
  };

  // Password validation helpers
  const password = resetForm.watch("password");

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0E1A] via-[#111827] to-[#0F172A] flex flex-col relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-green-500/5 rounded-full blur-3xl" />
      </div>

      {/* Close button */}
      <button
        onClick={() => setLocation("/login")}
        className="absolute top-4 right-4 z-20 p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-all duration-200"
      >
        <X className="w-5 h-5 text-gray-300 hover:text-white" />
      </button>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center px-6 py-8 relative z-10">
        <div className="w-full max-w-sm mx-auto">
          
          {/* Logo */}
          <div className="mb-8 text-center">
            <img 
              src="/logos/logomania.svg"
              alt="Mania Brasil"
              className="h-20 mx-auto mb-4 animate-pulse"
            />
            <h1 className="text-2xl font-bold text-white">Recuperar Senha</h1>
            <p className="text-gray-400 text-sm mt-2">
              {screen === 'phone' 
                ? 'Informe seu telefone cadastrado'
                : screen === 'code'
                ? 'Digite o código enviado por SMS'
                : 'Crie uma nova senha para sua conta'
              }
            </p>
          </div>

          {/* Phone Input Screen */}
          {screen === 'phone' && (
            <div className="space-y-6">
              <Form {...smsForm}>
                <form onSubmit={smsForm.handleSubmit(handleSendSms)} className="space-y-4">
                  <FormField
                    control={smsForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                              {...field}
                              placeholder="Seu telefone cadastrado"
                              inputMode="tel"
                              className="bg-gray-900/50 border-gray-700 text-white pl-11 h-12 placeholder:text-gray-500 focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
                              onChange={(e) => {
                                const formatted = formatPhone(e.target.value);
                                field.onChange(formatted);
                              }}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full bg-[#00E880] hover:bg-[#00D470] text-black font-bold h-12"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enviando SMS...
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Enviar Código por SMS
                      </>
                    )}
                  </Button>
                </form>
              </Form>

              <div className="text-center">
                <button
                  onClick={() => setLocation("/login")}
                  className="text-gray-400 text-sm hover:text-white"
                >
                  Voltar para o login
                </button>
              </div>
            </div>
          )}

          {/* SMS Code Verification Screen */}
          {screen === 'code' && (
            <div className="space-y-6">
              <Form {...smsCodeForm}>
                <form onSubmit={smsCodeForm.handleSubmit(handleVerifySmsCode)} className="space-y-4">
                  <div className="text-center mb-4">
                    <p className="text-gray-300 text-sm">
                      Código enviado para: {formatPhone(smsPhone)}
                    </p>
                  </div>

                  <FormField
                    control={smsCodeForm.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <MessageSquare className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                              {...field}
                              placeholder="Digite o código de 6 dígitos"
                              inputMode="numeric"
                              maxLength={6}
                              className="bg-gray-900/50 border-gray-700 text-white pl-11 h-12 text-center tracking-wider font-mono text-lg placeholder:text-gray-500 focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '');
                                field.onChange(value);
                              }}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full bg-[#00E880] hover:bg-[#00D470] text-black font-bold h-12"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Verificando código...
                      </>
                    ) : (
                      "Verificar Código"
                    )}
                  </Button>
                </form>
              </Form>

              <div className="text-center space-y-3">
                <button
                  onClick={handleResendSms}
                  className={`text-sm transition-all duration-200 ${
                    canResend 
                      ? 'text-[#00E880] hover:underline cursor-pointer' 
                      : 'text-gray-500 cursor-not-allowed'
                  }`}
                  disabled={!canResend || isLoading}
                >
                  {canResend ? (
                    'Reenviar código'
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Clock className="w-4 h-4" />
                      Aguarde {resendTimer}s para reenviar
                    </span>
                  )}
                </button>
                
                <button
                  onClick={() => {
                    setScreen('phone');
                    smsCodeForm.reset();
                    setCanResend(true);
                    setResendTimer(0);
                  }}
                  className="text-gray-400 text-sm hover:text-white block"
                >
                  Trocar número
                </button>
              </div>
            </div>
          )}

          {/* Reset Password Screen */}
          {screen === 'reset' && (
            <div className="space-y-6">
              <Form {...resetForm}>
                <form onSubmit={resetForm.handleSubmit(handleReset)} className="space-y-4">
                  <FormField
                    control={resetForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                              {...field}
                              type={showPassword ? "text" : "password"}
                              placeholder="Nova senha"
                              className="bg-gray-900/50 border-gray-700 text-white pl-11 pr-11 h-12 placeholder:text-gray-500 focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
                            >
                              {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={resetForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                              {...field}
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Confirme a nova senha"
                              className="bg-gray-900/50 border-gray-700 text-white pl-11 pr-11 h-12 placeholder:text-gray-500 focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
                            >
                              {showConfirmPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Password requirement */}
                  <div className="bg-gray-900/30 border border-gray-800 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      {password?.length >= 8 ? (
                        <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-3 h-3 text-gray-600 flex-shrink-0" />
                      )}
                      <span className={`text-xs ${password?.length >= 8 ? 'text-green-400' : 'text-gray-500'}`}>
                        Mínimo de 8 caracteres
                      </span>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-[#00E880] hover:bg-[#00D470] text-black font-bold h-12"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Alterando senha...
                      </>
                    ) : (
                      "Alterar Senha"
                    )}
                  </Button>
                </form>
              </Form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}