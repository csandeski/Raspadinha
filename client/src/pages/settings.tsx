import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MobileLayout } from "@/components/mobile-layout";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Eye, 
  EyeOff,
  Save,
  Shield,
  UserCircle,
  KeyRound,
  Sparkles,
  Check,
  ArrowLeft,
  CreditCard
} from "lucide-react";

// Schema para atualizar informações básicas
const updateProfileSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string()
    .min(1, "Telefone é obrigatório")
    .refine((val) => {
      const cleaned = val.replace(/\D/g, '');
      return cleaned.length >= 10 && cleaned.length <= 11;
    }, "Telefone deve ter 10 ou 11 dígitos")
});

// Schema para mudar senha
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Senha atual é obrigatória"),
  newPassword: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

export function SettingsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

  // Form para informações básicas
  const profileForm = useForm({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: ""
    }
  });

  // Set form values when user data is available
  useEffect(() => {
    if (user) {
      profileForm.reset({
        name: user.name || "",
        email: user.email || "",
        phone: formatPhone(user.phone || "")
      });
    }
  }, [user, profileForm]);

  // Form para senha
  const passwordForm = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    }
  });

  // Mutation para atualizar perfil
  const updateProfileMutation = useMutation({
    mutationFn: (data: z.infer<typeof updateProfileSchema>) => {
      // Remove formatting from phone number before sending to backend
      const cleanedData = {
        ...data,
        phone: data.phone.replace(/\D/g, '') // Remove all non-digits
      };
      return apiRequest("/api/user/update-profile", "PATCH", cleanedData);
    },
    onSuccess: (response, variables) => {
      toast({
        description: "Perfil atualizado com sucesso!"
      });
      
      // Invalidate queries to update the auth context globally
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      
      // The form already has the updated values, no need to reset
      // Just clear the form state to show values are saved
      profileForm.clearErrors();
    },
    onError: (error: any) => {
      toast({
        description: "Não foi possível atualizar suas informações"
      });
    }
  });

  // Mutation para mudar senha
  const changePasswordMutation = useMutation({
    mutationFn: (data: z.infer<typeof changePasswordSchema>) => 
      apiRequest("/api/user/change-password", "POST", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      }),
    onSuccess: () => {
      toast({
        description: "Senha alterada com sucesso!"
      });
      passwordForm.reset();
    },
    onError: (error: any) => {
      toast({
        description: "Senha atual incorreta"
      });
    }
  });

  // Formatar telefone
  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{2})(\d{5})(\d{4})$/);
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    return value;
  };

  return (
    <MobileLayout>
      <div className="min-h-screen bg-[#1a1b23] pb-20">
        <div className="max-w-lg mx-auto p-4">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setLocation('/profile')}
                className="p-2 hover:bg-gray-900 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">Configurações</h1>
                <p className="text-gray-400 text-sm">Gerencie sua conta</p>
              </div>
            </div>
          </div>

          {/* Tab Navigation - Matching Home Style */}
          <div className="mb-8">
            <div className="relative mx-auto max-w-sm">
              <div className="relative bg-gray-950 rounded-2xl p-1 shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-gray-800">
              {/* Sliding Indicator */}
              <div
                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl transition-all duration-500 ease-out ${
                  activeTab === "security" ? "left-[50%]" : "left-1"
                }`}
              >
                <div className="h-full bg-gradient-to-r from-[#00E880] to-[#00D074] rounded-xl shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/20 to-white/10 rounded-xl"></div>
                  <div className="absolute -inset-0.5 bg-[#00E880] rounded-xl blur opacity-50"></div>
                </div>
              </div>

              {/* Buttons Container */}
              <div className="relative flex">
                <button
                  onClick={() => setActiveTab("profile")}
                  className={`relative z-10 flex-1 px-6 py-3.5 rounded-xl font-medium transition-all duration-300 ${
                    activeTab === "profile"
                      ? "text-black"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  <span className="flex items-center justify-center gap-2.5">
                    <UserCircle className="w-6 h-6" />
                    <span className="text-sm font-black tracking-wide">
                      PERFIL
                    </span>
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab("security")}
                  className={`relative z-10 flex-1 px-6 py-3.5 rounded-xl font-medium transition-all duration-300 ${
                    activeTab === "security"
                      ? "text-black"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  <span className="flex items-center justify-center gap-2.5">
                    <Shield className="w-6 h-6" />
                    <span className="text-sm font-black tracking-wide">
                      SEGURANÇA
                    </span>
                  </span>
                </button>
                </div>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: activeTab === 'profile' ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'profile' ? (
              <div className="bg-gradient-to-b from-gray-800/40 to-gray-900/40 backdrop-blur-md rounded-2xl p-6 border border-gray-700/50 shadow-xl">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#00E880] to-[#00D470] rounded-xl flex items-center justify-center shadow-lg">
                      <UserCircle className="w-6 h-6 text-black" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Informações Pessoais</h2>
                      <p className="text-gray-400 text-sm">Atualize seus dados</p>
                    </div>
                  </div>
                
                <form onSubmit={profileForm.handleSubmit((data) => updateProfileMutation.mutate(data))} className="space-y-6">
                  {/* Name Input */}
                  <div className="group">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-[#00E880]/20 to-[#00D470]/20 rounded-lg flex items-center justify-center">
                          <User className="w-4 h-4 text-[#00E880]" />
                        </div>
                        <span>Nome Completo</span>
                      </div>
                    </label>
                    <input
                      id="name"
                      {...profileForm.register("name")}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#00E880] focus:ring-2 focus:ring-[#00E880]/20 transition-all duration-300"
                      placeholder="Digite seu nome completo"
                    />
                    {profileForm.formState.errors.name && (
                      <motion.p 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-400 text-sm mt-2 flex items-center gap-1"
                      >
                        <span className="w-1 h-1 bg-red-400 rounded-full"></span>
                        {profileForm.formState.errors.name.message}
                      </motion.p>
                    )}
                  </div>

                  {/* Email Input */}
                  <div className="group">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-[#00E880]/20 to-[#00D470]/20 rounded-lg flex items-center justify-center">
                          <Mail className="w-4 h-4 text-[#00E880]" />
                        </div>
                        <span>Email</span>
                      </div>
                    </label>
                    <input
                      id="email"
                      type="email"
                      {...profileForm.register("email")}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#00E880] focus:ring-2 focus:ring-[#00E880]/20 transition-all duration-300"
                      placeholder="seu@email.com"
                    />
                    {profileForm.formState.errors.email && (
                      <motion.p 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-400 text-sm mt-2 flex items-center gap-1"
                      >
                        <span className="w-1 h-1 bg-red-400 rounded-full"></span>
                        {profileForm.formState.errors.email.message}
                      </motion.p>
                    )}
                  </div>

                  {/* CPF Display (Non-editable) */}
                  {user?.cpf && (
                    <div className="group">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-[#00E880]/20 to-[#00D470]/20 rounded-lg flex items-center justify-center">
                            <CreditCard className="w-4 h-4 text-[#00E880]" />
                          </div>
                          <span>CPF</span>
                        </div>
                      </label>
                      <div className="w-full bg-gray-900/60 border border-gray-700/50 rounded-xl px-4 py-3.5 text-gray-400 flex items-center justify-between">
                        <span>{user.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</span>
                        <span className="text-xs text-gray-500 bg-gray-800/50 px-2 py-1 rounded">Não editável</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">O CPF não pode ser alterado após o cadastro</p>
                    </div>
                  )}

                  {/* Phone Input */}
                  <div className="group">
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-[#00E880]/20 to-[#00D470]/20 rounded-lg flex items-center justify-center">
                          <Phone className="w-4 h-4 text-[#00E880]" />
                        </div>
                        <span>Telefone</span>
                      </div>
                    </label>
                    <input
                      id="phone"
                      {...profileForm.register("phone")}
                      onChange={(e) => {
                        const formatted = formatPhone(e.target.value);
                        profileForm.setValue("phone", formatted);
                      }}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#00E880] focus:ring-2 focus:ring-[#00E880]/20 transition-all duration-300"
                      placeholder="(11) 91234-5678"
                      maxLength={15}
                    />
                    {profileForm.formState.errors.phone && (
                      <motion.p 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-400 text-sm mt-2 flex items-center gap-1"
                      >
                        <span className="w-1 h-1 bg-red-400 rounded-full"></span>
                        {profileForm.formState.errors.phone.message}
                      </motion.p>
                    )}
                  </div>

                  <motion.button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-gradient-to-r from-[#00E880] to-[#00D470] hover:from-[#00D470] hover:to-[#00C060] text-black font-bold py-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {updateProfileMutation.isPending ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-5 h-5 border-2 border-black border-t-transparent rounded-full"
                        />
                        <span>Salvando...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        <span>Salvar Alterações</span>
                      </>
                    )}
                  </motion.button>
                </form>
              </div>

            ) : (
              <div className="bg-gradient-to-b from-gray-800/40 to-gray-900/40 backdrop-blur-md rounded-2xl p-6 border border-gray-700/50 shadow-xl">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
                      <KeyRound className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Alterar Senha</h2>
                      <p className="text-gray-400 text-sm">Mantenha sua conta segura</p>
                    </div>
                  </div>
            
                <form onSubmit={passwordForm.handleSubmit((data) => changePasswordMutation.mutate(data))} className="space-y-6">
                  {/* Current Password */}
                  <div className="group">
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-300 mb-2">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-lg flex items-center justify-center">
                          <Lock className="w-4 h-4 text-purple-400" />
                        </div>
                        <span>Senha Atual</span>
                      </div>
                    </label>
                    <div className="relative">
                      <input
                        id="currentPassword"
                        type={showCurrentPassword ? "text" : "password"}
                        {...passwordForm.register("currentPassword")}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 pr-12"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-1"
                      >
                        {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {passwordForm.formState.errors.currentPassword && (
                      <motion.p 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-400 text-sm mt-2 flex items-center gap-1"
                      >
                        <span className="w-1 h-1 bg-red-400 rounded-full"></span>
                        {passwordForm.formState.errors.currentPassword.message}
                      </motion.p>
                    )}
                  </div>

                  {/* New Password */}
                  <div className="group">
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-300 mb-2">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-lg flex items-center justify-center">
                          <Lock className="w-4 h-4 text-purple-400" />
                        </div>
                        <span>Nova Senha</span>
                      </div>
                    </label>
                    <div className="relative">
                      <input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        {...passwordForm.register("newPassword")}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 pr-12"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-1"
                      >
                        {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {passwordForm.formState.errors.newPassword && (
                      <motion.p 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-400 text-sm mt-2 flex items-center gap-1"
                      >
                        <span className="w-1 h-1 bg-red-400 rounded-full"></span>
                        {passwordForm.formState.errors.newPassword.message}
                      </motion.p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="group">
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-lg flex items-center justify-center">
                          <Lock className="w-4 h-4 text-purple-400" />
                        </div>
                        <span>Confirmar Nova Senha</span>
                      </div>
                    </label>
                    <div className="relative">
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        {...passwordForm.register("confirmPassword")}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 pr-12"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-1"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {passwordForm.formState.errors.confirmPassword && (
                      <motion.p 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-400 text-sm mt-2 flex items-center gap-1"
                      >
                        <span className="w-1 h-1 bg-red-400 rounded-full"></span>
                        {passwordForm.formState.errors.confirmPassword.message}
                      </motion.p>
                    )}
                  </div>

                  <div className="pt-2">
                    <p className="text-gray-500 text-sm mb-4">
                      A senha deve ter pelo menos 8 caracteres
                    </p>
                    <motion.button
                      type="submit"
                      disabled={changePasswordMutation.isPending}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold py-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {changePasswordMutation.isPending ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                          />
                          <span>Alterando...</span>
                        </>
                      ) : (
                        <>
                          <Shield className="w-5 h-5" />
                          <span>Alterar Senha</span>
                        </>
                      )}
                    </motion.button>
                  </div>
                </form>
              </div>
            )}
          </motion.div>

          
        </div>
      </div>
    </MobileLayout>
  );
}