import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useLocation } from "wouter";
import { 
  UserPlus, 
  Mail, 
  Lock, 
  Phone, 
  User, 
  ArrowLeft,
  CreditCard,
  Award,
  CheckCircle,
  Eye,
  EyeOff
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function PainelAfiliadoCadastro() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    cpfCnpj: "",
    password: "",
    confirmPassword: ""
  });

  const formatCpfCnpj = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    
    if (numbers.length <= 11) {
      // CPF format
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
    } else {
      // CNPJ format
      return numbers
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1');
    }
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setErrorMessage("");
    setSuccessMessage("");
    
    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setErrorMessage("As senhas não coincidem");
      return;
    }

    // Validate password strength
    if (formData.password.length < 8) {
      setErrorMessage("A senha deve ter pelo menos 8 caracteres");
      return;
    }

    if (!/[A-Z]/.test(formData.password)) {
      setErrorMessage("A senha deve conter pelo menos uma letra maiúscula");
      return;
    }

    if (!/[a-z]/.test(formData.password)) {
      setErrorMessage("A senha deve conter pelo menos uma letra minúscula");
      return;
    }

    if (!/[0-9]/.test(formData.password)) {
      setErrorMessage("A senha deve conter pelo menos um número");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/affiliate/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage("Cadastro realizado! Entrando automaticamente...");
        setErrorMessage("");
        
        // Auto login with the returned token
        if (data.token) {
          localStorage.setItem('affiliateToken', data.token);
          
          // Redirect to dashboard after 1 second
          setTimeout(() => {
            setLocation("/afiliados/dashboard");
          }, 1000);
        } else {
          // Fallback to login page if no token
          setTimeout(() => {
            setLocation("/afiliados/login");
          }, 2000);
        }
      } else {
        setErrorMessage(data.error || "Ocorreu um erro ao criar sua conta");
        setSuccessMessage("");
      }
    } catch (error) {
      setErrorMessage("Erro ao conectar com o servidor");
      setSuccessMessage("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-[#00E880]/20 to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-purple-600/20 to-transparent rounded-full blur-3xl animate-pulse delay-700" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-lg"
      >
        {/* Back Button */}
        <Button
          variant="ghost"
          className="mb-6 text-gray-400 hover:text-white"
          onClick={() => setLocation("/afiliados")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        <Card className="bg-gray-900/90 backdrop-blur-sm border-gray-800">
          <div className="p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex p-3 bg-gradient-to-br from-[#00E880]/20 to-green-600/20 rounded-full mb-4">
                <UserPlus className="w-8 h-8 text-[#00E880]" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Criar Conta de Afiliado</h1>
              <p className="text-gray-400">Comece a ganhar até 70% de comissão hoje mesmo</p>
            </div>

            {/* Benefits */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="text-center">
                <div className="p-2 bg-gray-800/50 rounded-lg mb-2">
                  <Award className="w-6 h-6 text-[#00E880] mx-auto" />
                </div>
                <p className="text-xs text-gray-400">Comissões Altas</p>
              </div>
              <div className="text-center">
                <div className="p-2 bg-gray-800/50 rounded-lg mb-2">
                  <CreditCard className="w-6 h-6 text-[#00E880] mx-auto" />
                </div>
                <p className="text-xs text-gray-400">Pagamento Rápido</p>
              </div>
              <div className="text-center">
                <div className="p-2 bg-gray-800/50 rounded-lg mb-2">
                  <CheckCircle className="w-6 h-6 text-[#00E880] mx-auto" />
                </div>
                <p className="text-xs text-gray-400">Suporte 24/7</p>
              </div>
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
              <div>
                <Label htmlFor="name" className="text-gray-300">Nome Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Seu nome completo"
                    className="pl-10 bg-gray-800 border-gray-700 text-white"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email" className="text-gray-300">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    className="pl-10 bg-gray-800 border-gray-700 text-white"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="phone" className="text-gray-300">Telefone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    placeholder="(11) 99999-9999"
                    className="pl-10 bg-gray-800 border-gray-700 text-white"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                    maxLength={15}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="cpfCnpj" className="text-gray-300">CPF ou CNPJ</Label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    id="cpfCnpj"
                    type="text"
                    inputMode="numeric"
                    placeholder="000.000.000-00"
                    className="pl-10 bg-gray-800 border-gray-700 text-white"
                    value={formData.cpfCnpj}
                    onChange={(e) => setFormData({ ...formData, cpfCnpj: formatCpfCnpj(e.target.value) })}
                    maxLength={18}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password" className="text-gray-300">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-10 pr-10 bg-gray-800 border-gray-700 text-white"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Mínimo 8 caracteres, incluindo maiúscula, minúscula e número
                </p>
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-gray-300">Confirmar Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-10 pr-10 bg-gray-800 border-gray-700 text-white"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-[#00E880] to-green-600 text-black hover:opacity-90"
                disabled={isLoading}
              >
                {isLoading ? "Criando conta..." : "Criar Conta de Afiliado"}
              </Button>
            </form>

            {/* Login Link */}
            <div className="mt-6 text-center">
              <p className="text-gray-400 text-sm">
                Já tem uma conta?{" "}
                <button
                  onClick={() => setLocation("/afiliados/login")}
                  className="text-[#00E880] hover:underline font-semibold"
                >
                  Fazer Login
                </button>
              </p>
            </div>
          </div>
        </Card>

        {/* Trust Badges */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <Badge className="bg-gray-900/50 text-gray-400 border-gray-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            100% Seguro
          </Badge>
          <Badge className="bg-gray-900/50 text-gray-400 border-gray-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Cadastro Grátis
          </Badge>
          <Badge className="bg-gray-900/50 text-gray-400 border-gray-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Comissões Vitalícias
          </Badge>
        </div>
      </motion.div>
    </div>
  );
}