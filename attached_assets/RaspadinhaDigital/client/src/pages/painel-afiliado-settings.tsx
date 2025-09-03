import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AffiliateLayout } from "@/components/affiliate/affiliate-layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  Settings,
  User,
  Mail,
  Phone,
  Lock,
  Key,
  Save,
  Eye,
  EyeOff,
  Check,
  X,
  CreditCard,
  Shield,
  Trash2,
  Edit,
  AlertCircle
} from "lucide-react";

interface AffiliateSettings {
  name: string;
  email: string;
  phone: string;
  pixKeyType: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
  pixKey: string;
}

export function PainelAfiliadoSettings() {
  const { toast } = useToast();
  const [location] = useLocation();
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'pix'>('profile');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isEditingPix, setIsEditingPix] = useState(false);
  
  // Format phone number as user types
  const formatPhone = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Limit to 11 digits (Brazilian mobile)
    const limited = digits.slice(0, 11);
    
    // Format as (00) 00000-0000
    if (limited.length <= 2) {
      return limited;
    }
    if (limited.length <= 6) {
      return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
    }
    if (limited.length <= 10) {
      return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`;
    }
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
  };
  
  // Check for section query parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const section = params.get('section');
    
    if (section === 'pix') {
      setActiveTab('pix');
      // Scroll to the PIX section after a short delay
      setTimeout(() => {
        const pixSection = document.getElementById('pix-section');
        if (pixSection) {
          pixSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  }, []);
  
  // Form states
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [pixData, setPixData] = useState({
    pixKeyType: 'cpf' as 'cpf' | 'cnpj' | 'email' | 'phone' | 'random',
    pixKey: ''
  });

  const [originalPixData, setOriginalPixData] = useState({
    pixKeyType: 'cpf' as 'cpf' | 'cnpj' | 'email' | 'phone' | 'random',
    pixKey: ''
  });

  // Fetch current settings
  const { data: settingsData, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/affiliate/settings'],
    queryFn: async () => {
      const token = localStorage.getItem('affiliateToken');
      if (!token) throw new Error('No token found');
      
      const response = await fetch('/api/affiliate/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized - please login again');
        }
        throw new Error('Failed to fetch settings');
      }
      
      const data = await response.json();
      return data;
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 0, // Always fetch fresh data
    refetchOnWindowFocus: true
  });
  
  // Update form states when settingsData changes
  useEffect(() => {
    if (settingsData) {
      console.log('Settings data loaded:', settingsData); // Debug log
      
      // Update profile data
      setProfileData({
        name: settingsData.name || '',
        email: settingsData.email || '',
        phone: settingsData.phone || ''
      });
      
      // Update PIX data
      setPixData({
        pixKeyType: settingsData.pixKeyType || 'cpf',
        pixKey: settingsData.pixKey || ''
      });
      
      setOriginalPixData({
        pixKeyType: settingsData.pixKeyType || 'cpf',
        pixKey: settingsData.pixKey || ''
      });
    }
  }, [settingsData]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileData) => {
      return await apiRequest('/api/affiliate/settings/profile', 'PUT', data);
    },
    onSuccess: async () => {
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso"
      });
      await queryClient.invalidateQueries({ queryKey: ['/api/affiliate/settings'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/affiliate/info'] });
      await refetch(); // Force refetch the data
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message || "Erro ao atualizar perfil",
        variant: "destructive"
      });
    }
  });

  // Update password mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async (data: typeof passwordData) => {
      if (data.newPassword !== data.confirmPassword) {
        throw new Error("As senhas não coincidem");
      }
      if (data.newPassword.length < 8) {
        throw new Error("A senha deve ter no mínimo 8 caracteres");
      }
      if (!/[A-Z]/.test(data.newPassword)) {
        throw new Error("A senha deve conter pelo menos uma letra maiúscula");
      }
      if (!/[0-9]/.test(data.newPassword)) {
        throw new Error("A senha deve conter pelo menos um número");
      }
      return await apiRequest('/api/affiliate/settings/password', 'PUT', {
        oldPassword: data.oldPassword,
        newPassword: data.newPassword
      });
    },
    onSuccess: () => {
      toast({
        title: "Senha atualizada",
        description: "Sua senha foi alterada com sucesso"
      });
      setPasswordData({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar senha",
        description: error.message || "Erro ao alterar senha",
        variant: "destructive"
      });
    }
  });

  // Update PIX key mutation
  const updatePixMutation = useMutation({
    mutationFn: async (data: typeof pixData) => {
      return await apiRequest('/api/affiliate/settings/pix', 'PUT', data);
    },
    onSuccess: async () => {
      toast({
        title: "Chave PIX atualizada",
        description: "Sua chave PIX padrão foi salva"
      });
      await queryClient.invalidateQueries({ queryKey: ['/api/affiliate/settings'] });
      await refetch(); // Force refetch the data
      setIsEditingPix(false);
      setOriginalPixData(pixData);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message || "Erro ao salvar chave PIX",
        variant: "destructive"
      });
    }
  });

  // Delete PIX key mutation
  const deletePixMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/affiliate/settings/pix', 'DELETE');
    },
    onSuccess: async () => {
      toast({
        title: "Chave PIX removida",
        description: "Sua chave PIX padrão foi removida"
      });
      await queryClient.invalidateQueries({ queryKey: ['/api/affiliate/settings'] });
      await refetch(); // Force refetch the data
      setPixData({ pixKeyType: 'cpf', pixKey: '' });
      setOriginalPixData({ pixKeyType: 'cpf', pixKey: '' });
      setIsEditingPix(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover",
        description: error.message || "Erro ao remover chave PIX",
        variant: "destructive"
      });
    }
  });

  const handleProfileSubmit = () => {
    updateProfileMutation.mutate(profileData);
  };

  const handlePasswordSubmit = () => {
    updatePasswordMutation.mutate(passwordData);
  };

  const handlePixSubmit = () => {
    updatePixMutation.mutate(pixData);
  };

  const handleEditPix = () => {
    setIsEditingPix(true);
  };

  const handleCancelEditPix = () => {
    setPixData(originalPixData);
    setIsEditingPix(false);
  };

  const handleDeletePix = () => {
    if (confirm('Tem certeza que deseja remover sua chave PIX padrão?')) {
      deletePixMutation.mutate();
    }
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11);
    return numbers
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2');
  };

  const formatCNPJ = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 14);
    return numbers
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})/, '$1-$2');
  };

  const handlePixKeyChange = (value: string) => {
    let formatted = value;
    if (pixData.pixKeyType === 'cpf') {
      formatted = formatCPF(value);
    } else if (pixData.pixKeyType === 'cnpj') {
      formatted = formatCNPJ(value);
    }
    setPixData({ ...pixData, pixKey: formatted });
  };

  const getPixKeyPlaceholder = () => {
    switch (pixData.pixKeyType) {
      case 'cpf':
        return '000.000.000-00';
      case 'cnpj':
        return '00.000.000/0000-00';
      default:
        return '';
    }
  };

  const validatePassword = (password: string) => {
    const requirements = {
      length: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasNumber: /[0-9]/.test(password)
    };
    return requirements;
  };

  const passwordRequirements = validatePassword(passwordData.newPassword);

  if (isLoading) {
    return (
      <AffiliateLayout activeSection="settings">
        <div className="flex items-center justify-center h-[600px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00E880] mx-auto mb-4"></div>
            <p className="text-gray-400">Carregando configurações...</p>
          </div>
        </div>
      </AffiliateLayout>
    );
  }
  
  if (error) {
    return (
      <AffiliateLayout activeSection="settings">
        <div className="flex items-center justify-center h-[600px]">
          <div className="text-center">
            <div className="p-4 bg-red-950/30 rounded-xl border border-red-900/50 max-w-md">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-white font-semibold mb-2">Erro ao carregar configurações</h3>
              <p className="text-gray-400 mb-4">{(error as Error).message}</p>
              <Button
                onClick={() => refetch()}
                className="bg-[#00E880] hover:bg-[#00E880]/90 text-black"
              >
                Tentar novamente
              </Button>
            </div>
          </div>
        </div>
      </AffiliateLayout>
    );
  }

  return (
    <AffiliateLayout activeSection="settings">
      <div className="space-y-3 md:space-y-6">
        {/* Compact Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-gray-900/50 to-gray-950/50 backdrop-blur-sm rounded-xl md:rounded-2xl p-4 md:p-4 mb-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 md:p-2 bg-gray-800 rounded-xl">
              <Settings className="w-5 h-5 md:w-6 md:h-6 text-gray-400" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-white">Configurações</h1>
              <p className="text-gray-400 text-xs md:text-sm">Gerencie suas informações e preferências</p>
            </div>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex gap-2 md:gap-3 p-2 bg-gray-900/50 backdrop-blur-sm rounded-xl md:rounded-2xl"
        >
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 flex items-center justify-center gap-1 md:gap-2 px-2 md:px-4 py-2.5 md:py-3 rounded-xl font-medium transition-all ${
              activeTab === 'profile'
                ? 'bg-gradient-to-r from-[#00E880] to-emerald-600 text-black'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-white'
            }`}
          >
            <User className="w-4 h-4 md:w-5 md:h-5" />
            <span className="text-xs md:text-base">Perfil</span>
          </button>
          
          <button
            onClick={() => setActiveTab('password')}
            className={`flex-1 flex items-center justify-center gap-1 md:gap-2 px-2 md:px-4 py-2.5 md:py-3 rounded-xl font-medium transition-all ${
              activeTab === 'password'
                ? 'bg-gradient-to-r from-[#00E880] to-emerald-600 text-black'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-white'
            }`}
          >
            <Lock className="w-4 h-4 md:w-5 md:h-5" />
            <span className="text-xs md:text-base">Senha</span>
          </button>
          
          <button
            onClick={() => setActiveTab('pix')}
            className={`flex-1 flex items-center justify-center gap-1 md:gap-2 px-2 md:px-4 py-2.5 md:py-3 rounded-xl font-medium transition-all ${
              activeTab === 'pix'
                ? 'bg-gradient-to-r from-[#00E880] to-emerald-600 text-black'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-white'
            }`}
          >
            <CreditCard className="w-4 h-4 md:w-5 md:h-5" />
            <span className="text-xs md:text-base">PIX</span>
          </button>
        </motion.div>

        {/* Profile Settings - Premium Design */}
        {activeTab === 'profile' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="relative"
          >
          <div className="relative rounded-xl md:rounded-3xl overflow-hidden">
            {/* Inner Card */}
            <div className="relative bg-gradient-to-br from-gray-900/95 to-gray-950/95 backdrop-blur-xl border border-gray-800 rounded-xl md:rounded-3xl overflow-hidden">
              {/* Pattern Background */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0" style={{
                  backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.05) 10px, rgba(255,255,255,.05) 20px)`
                }} />
              </div>
              
              {/* Content */}
              <div className="relative p-4 md:p-8">
                <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
                  <div className="p-2 md:p-2 bg-gray-800/30 rounded-xl">
                    <User className="w-5 h-5 md:w-6 md:h-6 text-gray-400" />
                  </div>
                  <h2 className="text-base md:text-xl font-bold text-white">Informações Pessoais</h2>
                </div>

                <div className="grid gap-4 md:gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-xs md:text-sm text-gray-400">Nome Completo</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <Input
                        id="name"
                        value={profileData.name}
                        onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                        className="pl-10 bg-gray-800/30 border-gray-700/50 text-white rounded-xl text-sm md:text-base"
                        placeholder="Seu nome completo"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs md:text-sm text-gray-400">E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <Input
                        id="email"
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        className="pl-10 bg-gray-800/30 border-gray-700/50 text-white rounded-xl text-sm md:text-base"
                        placeholder="seu@email.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-xs md:text-sm text-gray-400">Telefone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <Input
                        id="phone"
                        inputMode="tel"
                        value={profileData.phone}
                        onChange={(e) => {
                          const formatted = formatPhone(e.target.value);
                          setProfileData({ ...profileData, phone: formatted });
                        }}
                        className="pl-10 bg-gray-800/30 border-gray-700/50 text-white rounded-xl text-sm md:text-base"
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleProfileSubmit}
                    disabled={updateProfileMutation.isPending}
                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold rounded-xl py-2.5 md:py-3 text-sm md:text-base"
                  >
                    {updateProfileMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Salvando...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Save className="w-4 h-4 md:w-5 md:h-5" />
                        Salvar Alterações
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
        )}

        {/* Password Settings - Premium Design */}
        {activeTab === 'password' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="relative"
          >
          <div className="relative rounded-xl md:rounded-3xl overflow-hidden">
            {/* Inner Card */}
            <div className="relative bg-gradient-to-br from-gray-900/95 to-gray-950/95 backdrop-blur-xl border border-gray-800 rounded-xl md:rounded-3xl overflow-hidden">
              {/* Pattern Background */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0" style={{
                  backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.05) 10px, rgba(255,255,255,.05) 20px)`
                }} />
              </div>
              
              {/* Content */}
              <div className="relative p-4 md:p-8">
                <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
                  <div className="p-2 md:p-2 bg-gray-800/30 rounded-xl">
                    <Lock className="w-5 h-5 md:w-6 md:h-6 text-gray-400" />
                  </div>
                  <h2 className="text-base md:text-xl font-bold text-white">Alterar Senha</h2>
                </div>

                <div className="grid gap-4 md:gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="oldPassword" className="text-xs md:text-sm text-gray-400">Senha Atual</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <Input
                        id="oldPassword"
                        type={showOldPassword ? "text" : "password"}
                        value={passwordData.oldPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                        className="pl-10 pr-10 bg-gray-800/30 border-gray-700/50 text-white rounded-xl text-sm md:text-base"
                        placeholder="Digite sua senha atual"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOldPassword(!showOldPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                      >
                        {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-xs md:text-sm text-gray-400">Nova Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        className="pl-10 pr-10 bg-gray-800/30 border-gray-700/50 text-white rounded-xl text-sm md:text-base"
                        placeholder="Mínimo 8 caracteres, 1 maiúscula e 1 número"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    
                    {/* Password Requirements */}
                    {passwordData.newPassword && (
                      <div className="mt-3 p-3 bg-gray-900/50 rounded-xl space-y-2">
                        <p className="text-sm font-medium text-gray-400">Requisitos da senha:</p>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {passwordRequirements.length ? (
                              <Check className="w-4 h-4 text-[#00E880]" />
                            ) : (
                              <X className="w-4 h-4 text-red-400" />
                            )}
                            <span className={`text-sm ${passwordRequirements.length ? 'text-[#00E880]' : 'text-gray-500'}`}>
                              Mínimo 8 caracteres
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {passwordRequirements.hasUpperCase ? (
                              <Check className="w-4 h-4 text-[#00E880]" />
                            ) : (
                              <X className="w-4 h-4 text-red-400" />
                            )}
                            <span className={`text-sm ${passwordRequirements.hasUpperCase ? 'text-[#00E880]' : 'text-gray-500'}`}>
                              Pelo menos uma letra maiúscula
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {passwordRequirements.hasNumber ? (
                              <Check className="w-4 h-4 text-[#00E880]" />
                            ) : (
                              <X className="w-4 h-4 text-red-400" />
                            )}
                            <span className={`text-sm ${passwordRequirements.hasNumber ? 'text-[#00E880]' : 'text-gray-500'}`}>
                              Pelo menos um número
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-xs md:text-sm text-gray-400">Confirmar Nova Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        className="pl-10 pr-10 bg-gray-800/30 border-gray-700/50 text-white rounded-xl text-sm md:text-base"
                        placeholder="Digite a nova senha novamente"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                      <p className="text-sm text-red-400 mt-1">As senhas não coincidem</p>
                    )}
                  </div>

                  <Button
                    onClick={handlePasswordSubmit}
                    disabled={updatePasswordMutation.isPending || !passwordData.oldPassword || !passwordData.newPassword || passwordData.newPassword !== passwordData.confirmPassword}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-xl py-2.5 md:py-3 text-sm md:text-base"
                  >
                    {updatePasswordMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Alterando...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Shield className="w-4 h-4 md:w-5 md:h-5" />
                        Alterar Senha
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
        )}

        {/* PIX Settings - Premium Design */}
        {activeTab === 'pix' && (
          <motion.div
            id="pix-section"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="relative"
          >
          <div className="relative rounded-xl md:rounded-3xl overflow-hidden">
            {/* Inner Card */}
            <div className="relative bg-gradient-to-br from-gray-900/95 to-gray-950/95 backdrop-blur-xl border border-gray-800 rounded-xl md:rounded-3xl overflow-hidden">
              {/* Pattern Background */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0" style={{
                  backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.05) 10px, rgba(255,255,255,.05) 20px)`
                }} />
              </div>
              
              {/* Content */}
              <div className="relative p-4 md:p-8">
                <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
                  <div className="p-2 md:p-2 bg-gray-800/30 rounded-xl">
                    <CreditCard className="w-5 h-5 md:w-6 md:h-6 text-gray-400" />
                  </div>
                  <h2 className="text-base md:text-xl font-bold text-white">Chave PIX Padrão</h2>
                </div>

                <div className="grid gap-4 md:gap-6">
                  {/* Info Box */}
                  <div className="bg-gray-800/30 rounded-xl p-3 md:p-4 border border-gray-700/50">
                    <p className="text-xs md:text-sm text-gray-300">
                      Configure sua chave PIX padrão para facilitar os saques. Esta chave será preenchida automaticamente quando você solicitar um saque.
                    </p>
                  </div>

                  {/* Current PIX Key Display or Edit Form */}
                  {originalPixData.pixKey && !isEditingPix ? (
                    <div className="bg-gray-800/30 rounded-xl p-4 md:p-6 border border-gray-700/50">
                      <div className="flex items-center justify-between mb-3 md:mb-4">
                        <h3 className="text-xs md:text-sm font-medium text-gray-400">Chave PIX Configurada</h3>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleEditPix}
                            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-all"
                            title="Editar chave PIX"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleDeletePix}
                            disabled={deletePixMutation.isPending}
                            className="p-2 rounded-lg bg-red-900/20 hover:bg-red-900/30 text-red-400 hover:text-red-300 transition-all"
                            title="Remover chave PIX"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Tipo de Chave</p>
                          <p className="text-sm md:text-base text-white font-medium">
                            {originalPixData.pixKeyType === 'cpf' ? 'CPF' : 'CNPJ'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Chave PIX</p>
                          <p className="text-[#00E880] font-mono text-sm md:text-lg">
                            {originalPixData.pixKey}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="pixKeyType" className="text-xs md:text-sm text-gray-400">Tipo de Chave</Label>
                        <Select 
                          value={pixData.pixKeyType} 
                          onValueChange={(value: any) => {
                            setPixData({ ...pixData, pixKeyType: value, pixKey: '' });
                          }}
                        >
                          <SelectTrigger className="bg-gray-800/30 border-gray-700/50 text-white rounded-xl text-sm md:text-base">
                            <SelectValue placeholder="Selecione o tipo de chave" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-950 border-gray-700">
                            <SelectItem value="cpf" className="text-white hover:bg-gray-900">CPF</SelectItem>
                            <SelectItem value="cnpj" className="text-white hover:bg-gray-900">CNPJ</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="pixKey" className="text-xs md:text-sm text-gray-400">Chave PIX</Label>
                        <div className="relative">
                          <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <Input
                            id="pixKey"
                            type="text"
                            inputMode="numeric"
                            value={pixData.pixKey}
                            onChange={(e) => handlePixKeyChange(e.target.value)}
                            className="pl-10 bg-gray-800/30 border-gray-700/50 text-white rounded-xl font-mono text-sm md:text-base"
                            placeholder={getPixKeyPlaceholder()}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {originalPixData.pixKey && (
                          <Button
                            onClick={handleCancelEditPix}
                            className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl py-3"
                          >
                            Cancelar
                          </Button>
                        )}
                        <Button
                          onClick={handlePixSubmit}
                          disabled={updatePixMutation.isPending || !pixData.pixKey}
                          className="flex-1 bg-gradient-to-r from-[#00E880] to-green-600 hover:from-[#00E880]/90 hover:to-green-600/90 text-black font-bold rounded-xl py-2.5 md:py-3 text-sm md:text-base"
                        >
                          {updatePixMutation.isPending ? (
                            <span className="flex items-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                              Salvando...
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              <Save className="w-4 h-4 md:w-5 md:h-5" />
                              {originalPixData.pixKey ? 'Atualizar' : 'Salvar'} Chave PIX
                            </span>
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
        )}
      </div>
    </AffiliateLayout>
  );
}