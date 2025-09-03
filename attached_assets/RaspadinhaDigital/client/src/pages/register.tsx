import { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AffiliateTracker } from "@/lib/affiliate-tracker";
import { useAuth } from "@/lib/auth";
import { X, ChevronLeft, Mail, Lock, Phone, User, EyeIcon, EyeOffIcon, Loader2, Gift, CreditCard } from "lucide-react";
import { getStoredUTMData, trackFacebookEvent } from "@/lib/utm-tracking";

// Login schemas
const loginEmailSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória")
});

const loginPhoneSchema = z.object({
  phone: z.string().regex(/^\(\d{2}\) \d{4,5}-\d{4}$/, "Telefone inválido"),
  password: z.string().min(1, "Senha é obrigatória")
});

// CPF validation function
function validateCPF(cpf: string): boolean {
  // Remove non-numeric characters
  const cleanCPF = cpf.replace(/\D/g, '');
  
  // Check if has 11 digits
  if (cleanCPF.length !== 11) return false;
  
  // Check if all digits are the same
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
  
  // Validate first check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(9))) return false;
  
  // Validate second check digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(10))) return false;
  
  return true;
}

// Format CPF for display
function formatCPF(value: string): string {
  const numbers = value.replace(/\D/g, '');
  
  if (numbers.length <= 3) {
    return numbers;
  } else if (numbers.length <= 6) {
    return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  } else if (numbers.length <= 9) {
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  } else {
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  }
}

// Capitalize first letter of each word (for names)
function capitalizeName(value: string): string {
  return value
    .toLowerCase()
    .split(' ')
    .map(word => {
      if (word.length === 0) return word;
      // Don't capitalize certain prepositions and articles in Portuguese
      const doNotCapitalize = ['de', 'da', 'do', 'dos', 'das', 'e'];
      if (doNotCapitalize.includes(word) && value.split(' ').indexOf(word) > 0) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

// Register schemas
const registerStep1Schema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  phone: z.string().regex(/^\(\d{2}\) \d{4,5}-\d{4}$/, "Telefone inválido"),
  referralCode: z.string().optional(),
  couponCode: z.string().optional()
});

const registerStep2Schema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string()
    .min(8, "Senha deve ter pelo menos 8 caracteres")
    .refine((password) => /[0-9]/.test(password), {
      message: "Senha deve conter pelo menos um número",
    })
    .refine((password) => /[A-Z]/.test(password), {
      message: "Senha deve conter pelo menos uma letra maiúscula",
    }),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

const registerStep3Schema = z.object({
  cpf: z.string()
    .refine((val) => {
      const cleanCPF = val.replace(/\D/g, '');
      return cleanCPF.length === 11;
    }, "CPF deve ter 11 dígitos")
    .refine((val) => validateCPF(val), "CPF inválido"),
  acceptTermsAndAge: z.boolean().refine((val) => val === true, {
    message: "Você deve aceitar os termos e confirmar ter mais de 18 anos"
  })
});

type LoginEmailValues = z.infer<typeof loginEmailSchema>;
type LoginPhoneValues = z.infer<typeof loginPhoneSchema>;
type RegisterStep1Values = z.infer<typeof registerStep1Schema>;
type RegisterStep2Values = z.infer<typeof registerStep2Schema>;
type RegisterStep3Values = z.infer<typeof registerStep3Schema>;

function formatPhone(value: string) {
  const numbers = value.replace(/\D/g, '');
  
  if (numbers.length <= 2) {
    return numbers;
  } else if (numbers.length <= 6) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  } else if (numbers.length <= 10) {
    // Formato telefone fixo: (11) 1111-1111
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6, 10)}`;
  } else {
    // Formato celular: (11) 91111-1111
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  }
}

export default function Register() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { login, register } = useAuth();
  
  // Determine initial screen based on URL
  const getInitialScreen = () => {
    if (location.includes('/login')) {
      return 'login';
    }
    return 'register-step1';
  };
  
  const [screen, setScreenState] = useState<'login' | 'register-step1' | 'register-step2' | 'register-step3'>(getInitialScreen());
  const [loginTab, setLoginTab] = useState<'email' | 'phone'>('email');
  const [registerData, setRegisterData] = useState<RegisterStep1Values | null>(null);
  const [registerData2, setRegisterData2] = useState<RegisterStep2Values | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  // Auto-dismiss timer refs
  const errorTimerRef = useRef<NodeJS.Timeout>();
  const successTimerRef = useRef<NodeJS.Timeout>();
  
  // Helper to change screen and clear messages
  const setScreen = (newScreen: typeof screen) => {
    setErrorMessage("");
    setSuccessMessage("");
    setScreenState(newScreen);
  };
  
  // Auto-dismiss error messages after 5 seconds
  useEffect(() => {
    if (errorMessage) {
      // Clear any existing timer
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current);
      }
      // Set new timer to clear error after 5 seconds
      errorTimerRef.current = setTimeout(() => {
        setErrorMessage("");
      }, 5000);
    }
    return () => {
      if (errorTimerRef.current) {
        clearTimeout(errorTimerRef.current);
      }
    };
  }, [errorMessage]);
  
  // Auto-dismiss success messages after 3 seconds
  useEffect(() => {
    if (successMessage) {
      // Clear any existing timer
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
      // Set new timer to clear success after 3 seconds
      successTimerRef.current = setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
    }
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, [successMessage]);
  const [referralCodeValidation, setReferralCodeValidation] = useState<{ 
    status: 'idle' | 'checking' | 'valid' | 'invalid';
    message?: string;
  }>({ status: 'idle' });
  
  // Phone and email validation states
  const [phoneValidation, setPhoneValidation] = useState<{
    status: 'idle' | 'checking' | 'valid' | 'invalid';
    message?: string;
  }>({ status: 'idle' });
  
  const [emailValidation, setEmailValidation] = useState<{
    status: 'idle' | 'checking' | 'valid' | 'invalid';
    message?: string;
  }>({ status: 'idle' });
  
  // CPF validation state
  const [cpfValidation, setCpfValidation] = useState<{
    status: 'idle' | 'checking' | 'valid' | 'invalid';
    message?: string;
  }>({ status: 'idle' });
  
  // Get referral code and coupon from URL
  const urlParams = new URLSearchParams(window.location.search);
  const referralCodeFromUrl = urlParams.get('ref') || AffiliateTracker.getAffiliateRef();
  const couponCodeFromUrl = urlParams.get('coupon');
  const hasReferralFromUrl = !!referralCodeFromUrl;
  const hasCouponFromUrl = !!couponCodeFromUrl;
  
  // Ensure ref parameter stays in URL
  useEffect(() => {
    if (referralCodeFromUrl && !urlParams.get('ref')) {
      const newParams = new URLSearchParams(window.location.search);
      newParams.set('ref', referralCodeFromUrl);
      const newUrl = `${window.location.pathname}?${newParams.toString()}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, [referralCodeFromUrl]);

  // Login forms
  const loginEmailForm = useForm<LoginEmailValues>({
    resolver: zodResolver(loginEmailSchema),
    defaultValues: { email: "", password: "" }
  });

  const loginPhoneForm = useForm<LoginPhoneValues>({
    resolver: zodResolver(loginPhoneSchema),
    defaultValues: { phone: "", password: "" }
  });

  // Register forms
  const registerStep1Form = useForm<RegisterStep1Values>({
    resolver: zodResolver(registerStep1Schema),
    defaultValues: { 
      name: "", 
      phone: "",
      referralCode: referralCodeFromUrl || "",
      couponCode: couponCodeFromUrl || ""
    }
  });

  const registerStep2Form = useForm<RegisterStep2Values>({
    resolver: zodResolver(registerStep2Schema),
    defaultValues: { email: "", password: "", confirmPassword: "" }
  });
  
  const registerStep3Form = useForm<RegisterStep3Values>({
    resolver: zodResolver(registerStep3Schema),
    defaultValues: { cpf: "", acceptTermsAndAge: false }
  });

  // Auto-validate referral code from URL
  useEffect(() => {
    if (hasReferralFromUrl && referralCodeFromUrl && screen === 'register-step1') {
      setReferralCodeValidation({ 
        status: 'valid', 
        message: 'Código válido! Ganhe até 350 raspadinhas' 
      });
    }
  }, [hasReferralFromUrl, referralCodeFromUrl, screen]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (values: LoginEmailValues | LoginPhoneValues) => {
      if ('phone' in values) {
        const cleanPhone = values.phone.replace(/\D/g, '');
        return login({ phone: cleanPhone, password: values.password });
      } else {
        return login({ email: values.email, password: values.password });
      }
    },
    onSuccess: () => {
      setSuccessMessage("Login realizado com sucesso! Redirecionando...");
      setErrorMessage("");
      setTimeout(() => {
        setLocation("/");
      }, 500);
    },
    onError: (error: any) => {
      // Extract error message properly from response or error object
      let message = "Email ou senha incorretos";
      
      // Check for different error structures
      if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.response?.data?.error) {
        message = error.response.data.error;
      } else if (typeof error.message === 'string') {
        // Check if it's a JSON string
        try {
          const parsed = JSON.parse(error.message);
          message = parsed.message || parsed.error || message;
        } catch {
          message = error.message;
        }
      } else if (error.error) {
        message = error.error;
      }
      
      // Format the message professionally
      if (message.toLowerCase().includes('credenciais') || message.toLowerCase().includes('invalid')) {
        setErrorMessage("Email ou senha incorretos. Verifique suas credenciais e tente novamente.");
      } else if (message.toLowerCase().includes('not found') || message.toLowerCase().includes('não encontrado')) {
        setErrorMessage("Usuário não encontrado. Verifique o email ou telefone digitado.");
      } else if (message.toLowerCase().includes('blocked') || message.toLowerCase().includes('bloqueado')) {
        setErrorMessage("Conta bloqueada. Entre em contato com o suporte.");
      } else if (message.toLowerCase().includes('password')) {
        setErrorMessage("Senha incorreta. Tente novamente.");
      } else {
        setErrorMessage("Email ou senha incorretos. Verifique suas credenciais.");
      }
      setSuccessMessage("");
    }
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (values: RegisterStep3Values) => {
      if (!registerData || !registerData2) return;
      const phone = registerData.phone.replace(/\D/g, '');
      const cpf = values.cpf.replace(/\D/g, '');
      
      // Get stored UTM data
      const utmData = getStoredUTMData();
      
      // Get affiliate code from tracker if not already provided
      const affiliateCode = registerData.referralCode || AffiliateTracker.getAffiliateRef();
      
      // Call API directly instead of using auth.register to avoid auto-login
      const response = await apiRequest("/api/auth/register", "POST", {
        name: capitalizeName(registerData.name),
        phone,
        email: registerData2.email,
        password: registerData2.password,
        cpf,
        isAdult: values.acceptTermsAndAge,
        referralCode: registerData.referralCode,
        couponCode: registerData.couponCode,
        affiliateCode: affiliateCode,
        utmData
      });
      
      return { response, email: registerData2.email, password: registerData2.password, affiliateCode };
    },
    onSuccess: async (data) => {
      setSuccessMessage("Conta criada com sucesso! Redirecionando para depósito...");
      setErrorMessage("");
      trackFacebookEvent('CompleteRegistration');
      
      // Clear affiliate reference after successful registration
      if (data.affiliateCode) {
        AffiliateTracker.clearAffiliateRef();
      }
      
      // Aguarda 3 segundos para mostrar a mensagem antes de fazer login e redirecionar
      setTimeout(async () => {
        try {
          // Fazer login após mostrar a mensagem
          await login({ email: data.email, password: data.password });
          setLocation("/deposit");
        } catch (error) {
          // Se falhar o login, ainda redireciona para página de login
          setLocation("/login");
        }
      }, 3000);
    },
    onError: (error: any) => {
      // Extract error message properly from response or error object
      let message = "Erro ao criar conta";
      
      // Check for different error structures
      if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.response?.data?.error) {
        message = error.response.data.error;
      } else if (typeof error.message === 'string') {
        // Check if it's a JSON string
        try {
          const parsed = JSON.parse(error.message);
          message = parsed.message || parsed.error || message;
        } catch {
          message = error.message;
        }
      } else if (error.error) {
        message = error.error;
      }
      
      // Format the message professionally
      if (message.toLowerCase().includes('already exists') || message.toLowerCase().includes('já existe') || message.toLowerCase().includes('already registered')) {
        setErrorMessage("Este email já está cadastrado. Use outro email ou faça login.");
      } else if (message.toLowerCase().includes('phone') && (message.toLowerCase().includes('exists') || message.toLowerCase().includes('existe'))) {
        setErrorMessage("Este telefone já está cadastrado. Use outro número ou faça login.");
      } else if (message.toLowerCase().includes('cpf') && (message.toLowerCase().includes('exists') || message.toLowerCase().includes('existe'))) {
        setErrorMessage("Este CPF já está cadastrado. Use outro CPF ou faça login.");
      } else if (message.toLowerCase().includes('invalid') || message.toLowerCase().includes('inválido')) {
        setErrorMessage("Dados inválidos. Verifique as informações e tente novamente.");
      } else if (message.toLowerCase().includes('password')) {
        setErrorMessage("A senha deve ter no mínimo 8 caracteres.");
      } else {
        setErrorMessage("Erro ao criar conta. Verifique os dados e tente novamente.");
      }
      setSuccessMessage("");
    }
  });

  // Validate referral code mutation
  const validateReferralMutation = useMutation({
    mutationFn: async (code: string) => {
      return apiRequest('/api/referrals/validate', 'POST', { referralCode: code });
    }
  });
  
  // Phone validation function with debouncing
  const validatePhone = useCallback(async (phone: string) => {
    if (!phone || phone.length < 14) {
      setPhoneValidation({ status: 'idle' });
      return;
    }
    
    setPhoneValidation({ status: 'checking' });
    
    try {
      const response = await apiRequest('/api/auth/check-phone', 'POST', { phone });
      if (response.exists) {
        setPhoneValidation({ 
          status: 'invalid', 
          message: 'Telefone já cadastrado' 
        });
      } else {
        setPhoneValidation({ 
          status: 'valid'
        });
      }
    } catch (error) {
      setPhoneValidation({ status: 'idle' });
    }
  }, []);
  
  // Email validation function with debouncing
  const validateEmail = useCallback(async (email: string) => {
    if (!email || !email.includes('@')) {
      setEmailValidation({ status: 'idle' });
      return;
    }
    
    setEmailValidation({ status: 'checking' });
    
    try {
      const response = await apiRequest('/api/auth/check-email', 'POST', { email });
      if (response.exists) {
        setEmailValidation({ 
          status: 'invalid', 
          message: 'Email já cadastrado' 
        });
      } else {
        setEmailValidation({ 
          status: 'valid'
        });
      }
    } catch (error) {
      setEmailValidation({ status: 'idle' });
    }
  }, []);
  
  // Debounce timer refs
  const phoneDebounceRef = useRef<NodeJS.Timeout>();
  const emailDebounceRef = useRef<NodeJS.Timeout>();
  
  // CPF validation function with debouncing
  const validateCPF = useCallback(async (cpf: string) => {
    const cleanCPF = cpf.replace(/\D/g, '');
    if (!cleanCPF || cleanCPF.length < 11) {
      setCpfValidation({ status: 'idle' });
      return;
    }
    
    setCpfValidation({ status: 'checking' });
    
    try {
      const response = await apiRequest('/api/auth/check-cpf', 'POST', { cpf: cleanCPF });
      if (response.exists) {
        setCpfValidation({ 
          status: 'invalid', 
          message: 'CPF já cadastrado' 
        });
      } else {
        setCpfValidation({ 
          status: 'valid'
        });
      }
    } catch (error) {
      setCpfValidation({ status: 'idle' });
    }
  }, []);
  
  // CPF debounce timer ref
  const cpfDebounceRef = useRef<NodeJS.Timeout>();
  
  // Email suggestions state
  const [showEmailSuggestions, setShowEmailSuggestions] = useState(false);
  const [emailSuggestionsFor, setEmailSuggestionsFor] = useState<'login' | 'register' | null>(null);
  const [emailPrefix, setEmailPrefix] = useState('');
  const [emailDomainFilter, setEmailDomainFilter] = useState('');
  
  // Common email domains
  const emailDomains = [
    'gmail.com',
    'hotmail.com',
    'outlook.com',
    'yahoo.com',
    'icloud.com',
    'live.com'
  ];
  
  // Filter domains based on user input
  const filteredDomains = emailDomains.filter(domain => 
    domain.toLowerCase().startsWith(emailDomainFilter.toLowerCase())
  );

  const handleLoginSubmit = (values: LoginEmailValues | LoginPhoneValues) => {
    // Clean phone number if it's a phone login
    if ('phone' in values) {
      const cleanPhone = values.phone.replace(/\D/g, '');
      loginMutation.mutate({ ...values, phone: cleanPhone });
    } else {
      loginMutation.mutate(values);
    }
  };

  const handleRegisterStep1 = async (values: RegisterStep1Values) => {
    // If there's a referral code, validate it first
    if (values.referralCode) {
      try {
        const response = await validateReferralMutation.mutateAsync(values.referralCode);
        if (!response.valid) {
          toast({ description: "O código de indicação não é válido ou não existe." });
          return;
        }
      } catch (error) {
        toast({ description: "Não foi possível validar o código de indicação." });
        return;
      }
    }
    
    // Capitalize name before saving
    const dataWithCapitalizedName = {
      ...values,
      name: capitalizeName(values.name)
    };
    
    setRegisterData(dataWithCapitalizedName);
    setScreen('register-step2');
  };

  const handleRegisterStep2 = (values: RegisterStep2Values) => {
    setRegisterData2(values);
    setScreen('register-step3');
  };
  
  const handleRegisterStep3 = async (values: RegisterStep3Values) => {
    // Check CPF one more time before submitting
    if (cpfValidation.status === 'invalid') {
      setErrorMessage("CPF já cadastrado. Use outro CPF ou faça login.");
      return;
    }
    
    // Wait for CPF validation if it's checking
    if (cpfValidation.status === 'checking') {
      setErrorMessage("Aguarde a validação do CPF...");
      return;
    }
    
    registerMutation.mutate(values);
  };

  const handleApplyReferralCode = async () => {
    const code = registerStep1Form.getValues('referralCode');
    if (!code) {
      setReferralCodeValidation({ status: 'invalid', message: 'Digite um código' });
      return;
    }

    setReferralCodeValidation({ status: 'checking' });
    
    try {
      const response = await validateReferralMutation.mutateAsync(code);
      if (response.valid) {
        // Check if it's the BONUS system code
        if (code.toUpperCase() === 'BONUS') {
          setReferralCodeValidation({ 
            status: 'valid', 
            message: 'Código de bônus válido!' 
          });
        } else {
          setReferralCodeValidation({ 
            status: 'valid', 
            message: 'Código válido! Ganhe até 350 raspadinhas' 
          });
        }
      } else {
        setReferralCodeValidation({ 
          status: 'invalid', 
          message: 'Código inválido ou não existe' 
        });
      }
    } catch (error: any) {
      // Always show simple error message for invalid codes
      setReferralCodeValidation({ 
        status: 'invalid', 
        message: 'Código inválido'
      });
    }
  };

  const handleRemoveReferralCode = () => {
    registerStep1Form.setValue('referralCode', '');
    setReferralCodeValidation({ status: 'idle' });
    // Clear URL params if they exist
    const newUrl = window.location.pathname;
    window.history.replaceState({}, document.title, newUrl);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0E1A] via-[#111827] to-[#0F172A] flex flex-col relative overflow-hidden">
      {/* Animated decorative background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-green-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-500/5 rounded-full blur-3xl animate-pulse" />
        
        {/* Floating particles */}
        <div className="absolute top-10 left-10 w-2 h-2 bg-green-400 rounded-full opacity-50 animate-bounce" style={{ animationDelay: '0s' }} />
        <div className="absolute top-20 right-20 w-2 h-2 bg-green-400 rounded-full opacity-50 animate-bounce" style={{ animationDelay: '0.5s' }} />
        <div className="absolute bottom-20 left-20 w-2 h-2 bg-green-400 rounded-full opacity-50 animate-bounce" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-10 right-10 w-2 h-2 bg-green-400 rounded-full opacity-50 animate-bounce" style={{ animationDelay: '1.5s' }} />
      </div>
      {/* Close button */}
      <button
        onClick={() => setLocation("/")}
        className="absolute top-4 right-4 z-20 p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-all duration-200"
      >
        <X className="w-5 h-5 text-gray-300 hover:text-white" />
      </button>
      {/* Content */}
      <div className="flex-1 flex flex-col justify-center px-6 py-8 relative z-10">
        <div className="w-full max-w-sm mx-auto">
          
          {/* Logo and Welcome - Fixed Section */}
          <div className="mb-8 text-center">
            <img 
              src="/logos/logomania.svg"
              alt="Mania Brasil"
              className="h-20 mx-auto mb-4 animate-pulse"
            />
            <div className="space-y-2">
              <p className="text-gray-400 text-sm">Raspe e ganhe prêmios incríveis!</p>
            </div>
          </div>

          {/* Tab buttons - Fixed Section */}
          <div className="grid grid-cols-2 gap-3 p-1 bg-gray-800/30 rounded-xl mb-6">
            <button
              onClick={() => setScreen('login')}
              className={`py-3 rounded-lg font-semibold transition-all duration-300 ${
                screen === 'login' 
                  ? 'bg-[#00E880] text-black shadow-lg shadow-green-500/25 transform scale-[1.02]' 
                  : 'bg-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              Conecte-se
            </button>
            <button
              onClick={() => setScreen('register-step1')}
              className={`py-3 rounded-lg font-semibold transition-all duration-300 ${
                (screen === 'register-step1' || screen === 'register-step2' || screen === 'register-step3')
                  ? 'bg-[#00E880] text-black shadow-lg shadow-green-500/25 transform scale-[1.02]' 
                  : 'bg-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              Inscrever-se
            </button>
          </div>

          {/* Dynamic Title - Fixed Section with overlapping messages */}
          <div className="text-center mb-6 relative">
            {screen === 'login' && (
              <>
                <h2 className="text-2xl font-bold text-white">Bem-vindo de volta!</h2>
                <p className="text-gray-400 text-sm mt-1">Entre e continue raspando</p>
              </>
            )}
            {screen === 'register-step1' && (
              <>
                <h2 className="text-2xl font-bold text-white">Cadastre-se agora!</h2>
                <p className="text-gray-400 text-sm mt-1">Ganhe bônus exclusivos ao criar sua conta</p>
              </>
            )}
            {screen === 'register-step2' && (
              <>
                <h2 className="text-2xl font-bold text-white">Finalize seu cadastro</h2>
                <p className="text-gray-400 text-sm mt-1">Crie uma senha segura para sua conta</p>
              </>
            )}
            {screen === 'register-step3' && (
              <>
                <h2 className="text-2xl font-bold text-white">Complete seu cadastro</h2>
                <p className="text-gray-400 text-sm mt-1">Confirme sua identidade e idade</p>
              </>
            )}
            
            {/* Error/Success Messages - Floating over title */}
            {/* Error Message */}
            <div className={`absolute inset-x-0 top-0 z-30 ${
              errorMessage ? 'animate-slideInFade' : 'animate-slideOutFade pointer-events-none'
            }`}>
              <div className="flex items-center justify-center">
                <div className="bg-gradient-to-br from-red-950 via-red-900/95 to-red-950 backdrop-blur-2xl border border-red-400/20 rounded-full px-5 py-2 shadow-2xl shadow-red-900/50">
                  <div className="flex items-center gap-2.5">
                    <div className="flex-shrink-0">
                      <div className="w-5 h-5 rounded-full bg-red-500/25 flex items-center justify-center animate-errorPulse">
                        <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-red-100 text-xs font-semibold tracking-wide">
                      {errorMessage}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Success Message with Celebration */}
            <div className={`absolute inset-x-0 top-0 z-30 ${
              successMessage ? 'animate-slideInFade' : 'animate-slideOutFade pointer-events-none'
            }`}>
              <div className="flex items-center justify-center">
                <div className="bg-gradient-to-br from-green-950 via-green-900/95 to-green-950 backdrop-blur-2xl border border-green-400/20 rounded-full px-6 py-3 shadow-2xl shadow-green-900/50 animate-successPulse">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 rounded-full bg-green-500/30 flex items-center justify-center animate-bounce">
                        <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex flex-col items-start">
                      <p className="text-green-100 text-sm font-bold tracking-wide">
                        {successMessage.split('!')[0]}!
                      </p>
                      {successMessage.includes('Redirecionando') && (
                        <p className="text-green-300 text-xs mt-0.5 flex items-center gap-1">
                          Redirecionando
                          <span className="inline-flex gap-0.5">
                            <span className="w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                            <span className="w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                            <span className="w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                          </span>
                        </p>
                      )}
                    </div>
                    {/* Celebration icon */}
                    <div className="flex-shrink-0 animate-spin-slow">
                      <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Login Screen */}
          {screen === 'login' && (
            <div className="space-y-6">
              
              {/* Email/Phone Tab buttons */}
              <div className="grid grid-cols-2 gap-3 p-1 bg-gray-800/30 rounded-xl">
                <button
                  onClick={() => setLoginTab('email')}
                  className={`py-3 rounded-lg font-semibold transition-all duration-300 ${
                    loginTab === 'email' 
                      ? 'bg-[#00E880] text-black shadow-lg shadow-green-500/25 transform scale-[1.02]' 
                      : 'bg-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  E-mail
                </button>
                <button
                  onClick={() => setLoginTab('phone')}
                  className={`py-3 rounded-lg font-semibold transition-all duration-300 ${
                    loginTab === 'phone' 
                      ? 'bg-[#00E880] text-black shadow-lg shadow-green-500/25 transform scale-[1.02]' 
                      : 'bg-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Telefone
                </button>
              </div>

              {/* Email Login Form */}
              {loginTab === 'email' && (
                <Form {...loginEmailForm}>
                  <form onSubmit={loginEmailForm.handleSubmit(handleLoginSubmit)} className="space-y-4">
                    <FormField
                      control={loginEmailForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                              <Input
                                {...field}
                                type="email"
                                placeholder="E-mail"
                                className="bg-gray-900/50 border-gray-700 text-white pl-11 h-12 placeholder:text-gray-500 focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
                                onChange={(e) => {
                                  field.onChange(e);
                                  const value = e.target.value;
                                  
                                  if (value.includes('@')) {
                                    const parts = value.split('@');
                                    setEmailPrefix(parts[0]);
                                    const domainPart = parts[1] || '';
                                    setEmailDomainFilter(domainPart);
                                    // Don't show suggestions if there's already a dot in the domain part
                                    if (!domainPart.includes('.')) {
                                      setShowEmailSuggestions(true);
                                      setEmailSuggestionsFor('login');
                                    } else {
                                      setShowEmailSuggestions(false);
                                    }
                                  } else {
                                    setShowEmailSuggestions(false);
                                    setEmailDomainFilter('');
                                  }
                                }}
                                onBlur={() => {
                                  field.onBlur();
                                  // Delay hiding suggestions to allow clicking
                                  setTimeout(() => setShowEmailSuggestions(false), 200);
                                }}
                              />
                              {/* Email suggestions dropdown */}
                              {showEmailSuggestions && emailSuggestionsFor === 'login' && filteredDomains.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-lg">
                                  {filteredDomains.map((domain) => (
                                    <button
                                      key={domain}
                                      type="button"
                                      className="w-full text-left px-4 py-2 text-white hover:bg-gray-800 transition-colors first:rounded-t-lg last:rounded-b-lg"
                                      onClick={() => {
                                        field.onChange(`${emailPrefix}@${domain}`);
                                        setShowEmailSuggestions(false);
                                        setEmailDomainFilter('');
                                      }}
                                    >
                                      {emailPrefix}@{domain}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={loginEmailForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                              <Input
                                {...field}
                                type={showPassword ? "text" : "password"}
                                placeholder="Digite sua senha"
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

                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm text-gray-400">
                        <Checkbox 
                          checked={rememberMe}
                          onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                          className="border-gray-600 data-[state=checked]:bg-[#00E880] data-[state=checked]:border-[#00E880]"
                        />
                        Lembrar de mim
                      </label>
                      <button 
                        type="button"
                        onClick={() => setLocation('/forgot-password')}
                        className="text-[#00E880] text-sm hover:underline"
                      >
                        Esqueceu sua senha?
                      </button>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-[#00E880] to-[#00D470] hover:from-[#00D470] hover:to-[#00C060] text-black font-bold h-12 shadow-lg shadow-green-500/25 transform hover:scale-[1.02] transition-all duration-200"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Entrando...
                        </>
                      ) : (
                        "Entrar"
                      )}
                    </Button>
                  </form>
                </Form>
              )}

              {/* Phone Login Form */}
              {loginTab === 'phone' && (
                <Form {...loginPhoneForm}>
                  <form onSubmit={loginPhoneForm.handleSubmit(handleLoginSubmit)} className="space-y-4">
                    <FormField
                      control={loginPhoneForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                              <Input
                                {...field}
                                placeholder="Telefone"
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

                    <FormField
                      control={loginPhoneForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                              <Input
                                {...field}
                                type={showPassword ? "text" : "password"}
                                placeholder="Digite sua senha"
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

                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm text-gray-400">
                        <Checkbox 
                          checked={rememberMe}
                          onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                          className="border-gray-600 data-[state=checked]:bg-[#00E880] data-[state=checked]:border-[#00E880]"
                        />
                        Lembrar de mim
                      </label>
                      <button 
                        type="button"
                        onClick={() => setLocation('/forgot-password')}
                        className="text-[#00E880] text-sm hover:underline"
                      >
                        Esqueceu sua senha?
                      </button>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-[#00E880] to-[#00D470] hover:from-[#00D470] hover:to-[#00C060] text-black font-bold h-12 shadow-lg shadow-green-500/25 transform hover:scale-[1.02] transition-all duration-200"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Entrando...
                        </>
                      ) : (
                        "Entrar"
                      )}
                    </Button>
                  </form>
                </Form>
              )}

              <p className="text-center text-gray-400 text-sm">
                Ainda não tem uma conta?{" "}
                <button
                  onClick={() => setScreen('register-step1')}
                  className="text-[#00E880] hover:underline font-medium"
                >
                  Criar uma conta grátis
                </button>
              </p>
            </div>
          )}

          {/* Register Step 1 */}
          {screen === 'register-step1' && (
            <div className="space-y-6">
              
              {/* Progress indicator */}
              <div className="flex items-center justify-center gap-8">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#00E880] text-black font-bold flex items-center justify-center text-sm">
                    1
                  </div>
                  <div className="w-16 h-0.5 bg-gray-700"></div>
                  <div className="w-8 h-8 rounded-full bg-gray-800 text-gray-500 font-bold flex items-center justify-center text-sm">
                    2
                  </div>
                  <div className="w-16 h-0.5 bg-gray-700"></div>
                  <div className="w-8 h-8 rounded-full bg-gray-800 text-gray-500 font-bold flex items-center justify-center text-sm">
                    3
                  </div>
                </div>
              </div>
              
              <Form {...registerStep1Form}>
                <form onSubmit={registerStep1Form.handleSubmit(handleRegisterStep1)} className="space-y-4">
                  <FormField
                    control={registerStep1Form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                              {...field}
                              placeholder="Nome completo"
                              className="bg-gray-900/50 border-gray-700 text-white pl-11 h-12 placeholder:text-gray-500 focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
                              onChange={(e) => {
                                const capitalized = capitalizeName(e.target.value);
                                field.onChange(capitalized);
                              }}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerStep1Form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                              {...field}
                              placeholder="Telefone"
                              inputMode="tel"
                              className="bg-gray-900/50 border-gray-700 text-white pl-11 h-12 placeholder:text-gray-500 focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
                              onChange={(e) => {
                                const formatted = formatPhone(e.target.value);
                                field.onChange(formatted);
                                
                                // Clear previous timeout
                                if (phoneDebounceRef.current) {
                                  clearTimeout(phoneDebounceRef.current);
                                }
                                
                                // Set new timeout for validation
                                phoneDebounceRef.current = setTimeout(() => {
                                  validatePhone(formatted);
                                }, 500);
                              }}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                        {phoneValidation.status !== 'idle' && (
                          <div className={`mt-1 text-sm flex items-center gap-1 ${
                            phoneValidation.status === 'valid' ? 'text-green-400' : 
                            phoneValidation.status === 'invalid' ? 'text-red-400' : 
                            'text-gray-400'
                          }`}>
                            {phoneValidation.status === 'checking' && (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            )}
                            {phoneValidation.message}
                          </div>
                        )}
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerStep1Form.control}
                    name="referralCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div>
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <Gift className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <Input
                                  {...field}
                                  placeholder="Código de indicação"
                                  className="bg-gray-900/50 border-gray-700 text-white pl-11 h-12 placeholder:text-gray-500 focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
                                  disabled={hasReferralFromUrl}
                                />
                                {hasReferralFromUrl && (
                                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#00E880] text-xs">
                                    Via link
                                  </div>
                                )}
                              </div>
                              <Button
                                type="button"
                                onClick={referralCodeValidation.status === 'valid' ? handleRemoveReferralCode : handleApplyReferralCode}
                                disabled={hasReferralFromUrl || referralCodeValidation.status === 'checking'}
                                className={`h-12 px-6 font-bold disabled:opacity-50 ${
                                  referralCodeValidation.status === 'valid' 
                                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                                    : 'bg-[#00E880] hover:bg-[#00D470] text-black'
                                }`}
                              >
                                {referralCodeValidation.status === 'checking' ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : referralCodeValidation.status === 'valid' ? (
                                  "Remover"
                                ) : (
                                  "Aplicar"
                                )}
                              </Button>
                            </div>
                            
                            {/* Validation feedback */}
                            {referralCodeValidation.status !== 'idle' && (
                              <div className={`mt-2 text-sm text-center ${
                                referralCodeValidation.status === 'valid' ? 'text-green-400' : 
                                referralCodeValidation.status === 'invalid' ? 'text-red-400' : 
                                'text-gray-400'
                              }`}>
                                {referralCodeValidation.message}
                              </div>
                            )}
                            
                            {/* Promotional message */}
                            <div className="mt-2 text-xs text-gray-400">Use um código de indicação e ganhe bônus!</div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Coupon Code Field */}
                  {hasCouponFromUrl && (
                    <FormField
                      control={registerStep1Form.control}
                      name="couponCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="space-y-2">
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                Cupom de Bônus
                              </label>
                              <div className="relative">
                                <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                                  <Gift className="w-5 h-5 text-[#00E880]" />
                                </div>
                                <Input
                                  {...field}
                                  placeholder="Cupom de bônus"
                                  className="bg-[#00E880]/10 border-[#00E880]/50 text-white pl-11 h-12 placeholder:text-gray-500 focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
                                  disabled={hasCouponFromUrl}
                                  value="SORTE"
                                />
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#00E880] text-xs font-bold">BÔNUS</div>
                              </div>
                              <div className="mt-2 text-xs text-[#00E880]">✓ Código válido e bônus aplicado!</div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-[#00E880] to-[#00D470] hover:from-[#00D470] hover:to-[#00C060] text-black font-bold h-12 flex items-center justify-center gap-2 shadow-lg shadow-green-500/25 transform transition-all duration-300 hover:scale-[1.02] hover:shadow-green-500/40"
                    disabled={validateReferralMutation.isPending || phoneValidation.status === 'invalid'}
                  >
                    {validateReferralMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Validando...
                      </>
                    ) : (
                      <>
                        Continuar
                        <ChevronLeft className="w-5 h-5 rotate-180" />
                      </>
                    )}
                  </Button>
                </form>
              </Form>

              <p className="text-center text-gray-400 text-sm">
                Já tem uma conta?{" "}
                <button
                  onClick={() => setScreen('login')}
                  className="text-[#00E880] hover:underline font-medium"
                >
                  Conecte-se
                </button>
              </p>
            </div>
          )}

          {/* Register Step 2 */}
          {screen === 'register-step2' && (
            <div className="space-y-6">
              
              {/* Progress indicator */}
              <div className="flex items-center justify-center gap-8">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-700 text-gray-300 font-bold flex items-center justify-center text-sm">
                    1
                  </div>
                  <div className="w-16 h-0.5 bg-[#00E880]"></div>
                  <div className="w-8 h-8 rounded-full bg-[#00E880] text-black font-bold flex items-center justify-center text-sm">
                    2
                  </div>
                  <div className="w-16 h-0.5 bg-gray-700"></div>
                  <div className="w-8 h-8 rounded-full bg-gray-800 text-gray-500 font-bold flex items-center justify-center text-sm">
                    3
                  </div>
                </div>
              </div>
              
              <Form {...registerStep2Form}>
                <form onSubmit={registerStep2Form.handleSubmit(handleRegisterStep2)} className="space-y-4">
                  <FormField
                    control={registerStep2Form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                              {...field}
                              type="email"
                              placeholder="E-mail"
                              className="bg-gray-900/50 border-gray-700 text-white pl-11 h-12 placeholder:text-gray-500 focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
                              onChange={(e) => {
                                field.onChange(e);
                                const value = e.target.value;
                                
                                // Handle email suggestions
                                if (value.includes('@')) {
                                  const parts = value.split('@');
                                  setEmailPrefix(parts[0]);
                                  const domainPart = parts[1] || '';
                                  setEmailDomainFilter(domainPart);
                                  // Don't show suggestions if there's already a dot in the domain part
                                  if (!domainPart.includes('.')) {
                                    setShowEmailSuggestions(true);
                                    setEmailSuggestionsFor('register');
                                  } else {
                                    setShowEmailSuggestions(false);
                                  }
                                } else {
                                  setShowEmailSuggestions(false);
                                  setEmailDomainFilter('');
                                }
                                
                                // Clear previous timeout
                                if (emailDebounceRef.current) {
                                  clearTimeout(emailDebounceRef.current);
                                }
                                
                                // Set new timeout for validation
                                emailDebounceRef.current = setTimeout(() => {
                                  validateEmail(e.target.value);
                                }, 500);
                              }}
                              onBlur={() => {
                                field.onBlur();
                                // Delay hiding suggestions to allow clicking
                                setTimeout(() => setShowEmailSuggestions(false), 200);
                              }}
                            />
                            {/* Email suggestions dropdown */}
                            {showEmailSuggestions && emailSuggestionsFor === 'register' && filteredDomains.length > 0 && (
                              <div className="absolute z-10 w-full mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-lg">
                                {filteredDomains.map((domain) => (
                                  <button
                                    key={domain}
                                    type="button"
                                    className="w-full text-left px-4 py-2 text-white hover:bg-gray-800 transition-colors first:rounded-t-lg last:rounded-b-lg"
                                    onClick={() => {
                                      field.onChange(`${emailPrefix}@${domain}`);
                                      setShowEmailSuggestions(false);
                                      setEmailDomainFilter('');
                                      // Trigger validation for the new email
                                      validateEmail(`${emailPrefix}@${domain}`);
                                    }}
                                  >
                                    {emailPrefix}@{domain}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                        {emailValidation.status !== 'idle' && (
                          <div className={`mt-1 text-sm flex items-center gap-1 ${
                            emailValidation.status === 'valid' ? 'text-green-400' : 
                            emailValidation.status === 'invalid' ? 'text-red-400' : 
                            'text-gray-400'
                          }`}>
                            {emailValidation.status === 'checking' && (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            )}
                            {emailValidation.message}
                          </div>
                        )}
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerStep2Form.control}
                    name="password"
                    render={({ field }) => {
                      const password = field.value || '';
                      const hasMinLength = password.length >= 8;
                      const hasNumber = /[0-9]/.test(password);
                      const hasUpperCase = /[A-Z]/.test(password);
                      
                      return (
                        <FormItem>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                              <Input
                                {...field}
                                type={showPassword ? "text" : "password"}
                                placeholder="Senha"
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
                          {/* Password requirements indicators */}
                          <div className="mt-2 space-y-1">
                            <div className={`text-xs flex items-center gap-1 ${hasMinLength ? 'text-green-400' : 'text-gray-500'}`}>
                              <div className={`w-3 h-3 rounded-full border ${hasMinLength ? 'bg-green-400 border-green-400' : 'border-gray-500'}`}>
                                {hasMinLength && (
                                  <svg className="w-full h-full p-0.5" fill="white" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              Mínimo de 8 caracteres
                            </div>
                            <div className={`text-xs flex items-center gap-1 ${hasNumber ? 'text-green-400' : 'text-gray-500'}`}>
                              <div className={`w-3 h-3 rounded-full border ${hasNumber ? 'bg-green-400 border-green-400' : 'border-gray-500'}`}>
                                {hasNumber && (
                                  <svg className="w-full h-full p-0.5" fill="white" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              Pelo menos um número
                            </div>
                            <div className={`text-xs flex items-center gap-1 ${hasUpperCase ? 'text-green-400' : 'text-gray-500'}`}>
                              <div className={`w-3 h-3 rounded-full border ${hasUpperCase ? 'bg-green-400 border-green-400' : 'border-gray-500'}`}>
                                {hasUpperCase && (
                                  <svg className="w-full h-full p-0.5" fill="white" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              Pelo menos uma letra maiúscula
                            </div>
                          </div>
                        </FormItem>
                      );
                    }}
                  />

                  <FormField
                    control={registerStep2Form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                              {...field}
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Confirmar senha"
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

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setScreen('register-step1')}
                      className="flex-1 bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white h-12"
                    >
                      <ChevronLeft className="w-5 h-5 mr-1" />
                      Voltar
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-[#00E880] to-[#00D470] hover:from-[#00D470] hover:to-[#00C060] text-black font-bold h-12 shadow-lg shadow-green-500/25 transform transition-all duration-300 hover:scale-[1.02] hover:shadow-green-500/40"
                      disabled={registerMutation.isPending || emailValidation.status === 'invalid'}
                    >
                      {registerMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Criando...
                        </>
                      ) : (
                        "Criar conta"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>

              <p className="text-center text-gray-400 text-sm">
                Já tem uma conta?{" "}
                <button
                  onClick={() => setScreen('login')}
                  className="text-[#00E880] hover:underline font-medium"
                >
                  Conecte-se
                </button>
              </p>
            </div>
          )}
          
          {/* Step 3: CPF and Age confirmation */}
          {screen === 'register-step3' && (
            <div className="space-y-6">
              
              {/* Progress indicator */}
              <div className="flex items-center justify-center gap-8">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-700 text-gray-300 font-bold flex items-center justify-center text-sm">
                    1
                  </div>
                  <div className="w-16 h-0.5 bg-[#00E880]"></div>
                  <div className="w-8 h-8 rounded-full bg-gray-700 text-gray-300 font-bold flex items-center justify-center text-sm">
                    2
                  </div>
                  <div className="w-16 h-0.5 bg-[#00E880]"></div>
                  <div className="w-8 h-8 rounded-full bg-[#00E880] text-black font-bold flex items-center justify-center text-sm">
                    3
                  </div>
                </div>
              </div>
              
              <Form {...registerStep3Form}>
                <form onSubmit={registerStep3Form.handleSubmit(handleRegisterStep3)} className="space-y-4">
                  <FormField
                    control={registerStep3Form.control}
                    name="cpf"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                              {...field}
                              placeholder="CPF"
                              inputMode="numeric"
                              maxLength={14}
                              onChange={(e) => {
                                const formatted = formatCPF(e.target.value);
                                field.onChange(formatted);
                                
                                // Clear existing timeout
                                if (cpfDebounceRef.current) {
                                  clearTimeout(cpfDebounceRef.current);
                                }
                                
                                // Set new timeout for validation
                                cpfDebounceRef.current = setTimeout(() => {
                                  validateCPF(formatted);
                                }, 500);
                              }}
                              className={`bg-gray-900/50 border-gray-700 text-white pl-11 h-12 placeholder:text-gray-500 focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20 transition-all duration-200 ${
                                cpfValidation.status === 'invalid' ? 'border-red-500' : 
                                cpfValidation.status === 'valid' ? 'border-green-500' : ''
                              }`}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                        {cpfValidation.status !== 'idle' && (
                          <div className={`text-xs mt-1 flex items-center gap-1 ${
                            cpfValidation.status === 'invalid' ? 'text-red-500' : 
                            cpfValidation.status === 'valid' ? 'text-green-500' : 
                            'text-gray-400'
                          }`}>
                            {cpfValidation.status === 'checking' && (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            )}
                            {cpfValidation.message}
                          </div>
                        )}
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerStep3Form.control}
                    name="acceptTermsAndAge"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-start gap-2">
                          <FormControl>
                            <Checkbox 
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="mt-1 border-gray-600 data-[state=checked]:bg-[#00E880] data-[state=checked]:border-[#00E880]"
                            />
                          </FormControl>
                          <label className="text-sm text-gray-400 leading-tight">
                            Aceito os{" "}
                            <button type="button" className="text-[#00E880] hover:underline">
                              Termos de Uso
                            </button>
                            {" "}e{" "}
                            <button type="button" className="text-[#00E880] hover:underline">
                              Política de Privacidade
                            </button>
                            {" "}e confirmo ter mais de 18 anos
                          </label>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setScreen('register-step2')}
                      className="flex-1 bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white h-12"
                    >
                      <ChevronLeft className="w-5 h-5 mr-1" />
                      Voltar
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-[#00E880] to-[#00D470] hover:from-[#00D470] hover:to-[#00C060] text-black font-bold h-12 shadow-lg shadow-green-500/25 transform transition-all duration-300 hover:scale-[1.02] hover:shadow-green-500/40"
                      disabled={registerMutation.isPending || cpfValidation.status === 'invalid' || cpfValidation.status === 'checking'}
                    >
                      {registerMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Finalizando...
                        </>
                      ) : (
                        "Finalizar cadastro"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>

              <p className="text-center text-gray-400 text-sm">
                Já tem uma conta?{" "}
                <button
                  onClick={() => setScreen('login')}
                  className="text-[#00E880] hover:underline font-medium"
                >
                  Conecte-se
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}