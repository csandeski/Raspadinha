import { useState, useEffect } from 'react';
import { AffiliateLayout } from '@/components/affiliate/affiliate-layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { motion } from 'framer-motion';
import { 
  UserPlus, 
  Copy, 
  Edit, 
  Trash2, 
  User,
  Mail,
  Lock,
  Wallet,
  Check,
  X,
  TestTube
} from 'lucide-react';

interface DemoAccount {
  id: number;
  name: string;
  email: string;
  password: string;
  phone: string;
  balance: number;
  bonusBalance: number;
  createdAt: string;
}

export function PainelAfiliadoDemo() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    balance: 0,
    bonusBalance: 0
  });
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Fetch demo account
  const { data: demoAccount, isLoading } = useQuery<DemoAccount | null>({
    queryKey: ['/api/affiliate/demo-account'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/affiliate/demo-account', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('affiliateToken')}`
          }
        });
        
        if (response.status === 404) {
          // No demo account exists, return null
          return null;
        }
        
        if (!response.ok) {
          throw new Error('Failed to fetch demo account');
        }
        
        return response.json();
      } catch (error) {
        console.error('Error fetching demo account:', error);
        return null;
      }
    },
    retry: false
  });

  // Create demo account mutation
  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => 
      apiRequest('/api/affiliate/demo-account', 'POST', data),
    onSuccess: () => {
      toast({
        title: "Conta demo criada!",
        description: "A conta foi criada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/demo-account'] });
      setFormData({ name: '', balance: 0, bonusBalance: 0 });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar conta",
        description: error.message || "Ocorreu um erro ao criar a conta demo.",
        variant: "destructive"
      });
    }
  });

  // Update demo account mutation
  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) => 
      apiRequest('/api/affiliate/demo-account', 'PUT', data),
    onSuccess: () => {
      toast({
        title: "Conta atualizada!",
        description: "Os dados foram atualizados com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/demo-account'] });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message || "Ocorreu um erro ao atualizar a conta.",
        variant: "destructive"
      });
    }
  });

  // Delete demo account mutation
  const deleteMutation = useMutation({
    mutationFn: () => 
      apiRequest('/api/affiliate/demo-account', 'DELETE'),
    onSuccess: () => {
      toast({
        title: "Conta excluída!",
        description: "A conta demo foi excluída com sucesso.",
      });
      // Reset query data and refetch
      queryClient.setQueryData(['/api/affiliate/demo-account'], undefined);
      queryClient.invalidateQueries({ queryKey: ['/api/affiliate/demo-account'] });
      // Reset form data
      setFormData({ name: '', balance: 0, bonusBalance: 0 });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir",
        description: error.message || "Ocorreu um erro ao excluir a conta.",
        variant: "destructive"
      });
    }
  });

  // Set form data when editing
  useEffect(() => {
    if (isEditing && demoAccount) {
      setFormData({
        name: demoAccount.name,
        balance: demoAccount.balance,
        bonusBalance: demoAccount.bonusBalance
      });
    }
  }, [isEditing, demoAccount]);

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      toast({
        title: "Copiado!",
        description: `${field === 'email' ? 'Email' : 'Senha'} copiado para a área de transferência.`,
      });
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o texto.",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, insira um nome para a conta demo.",
        variant: "destructive"
      });
      return;
    }

    if (demoAccount && isEditing) {
      updateMutation.mutate(formData);
    } else if (!demoAccount) {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = () => {
    if (window.confirm('Tem certeza que deseja excluir esta conta demo?')) {
      deleteMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <AffiliateLayout activeSection="demo">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00E880]"></div>
        </div>
      </AffiliateLayout>
    );
  }

  return (
    <AffiliateLayout activeSection="demo">
      <div className="space-y-6">
        {/* Responsive Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-gray-900/50 to-gray-950/50 backdrop-blur-sm rounded-2xl p-4 md:p-6 mb-4"
        >
          <div className="flex items-center gap-3 md:gap-4">
            <div className="p-2 md:p-3 bg-gray-800 rounded-xl">
              <TestTube className="w-5 h-5 md:w-6 md:h-6 text-gray-400" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">Conta Demo</h1>
              <p className="text-gray-400 text-xs md:text-sm">Crie uma conta de demonstração para testar a plataforma</p>
            </div>
          </div>
        </motion.div>

        {!demoAccount ? (
          // Create Account Form
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gradient-to-br from-gray-900/95 to-gray-950/95 backdrop-blur-xl border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-[#00E880]" />
                  Criar Conta Demo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-gray-300">Nome da Conta</Label>
                    <Input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Teste Demo"
                      className="bg-gray-800/50 border-gray-700 text-white"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="balance" className="text-gray-300">Saldo Normal (R$)</Label>
                      <Input
                        id="balance"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.balance}
                        onChange={(e) => setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })}
                        className="bg-gray-800/50 border-gray-700 text-white"
                      />
                    </div>

                    <div>
                      <Label htmlFor="bonusBalance" className="text-gray-300">Saldo Bônus (R$)</Label>
                      <Input
                        id="bonusBalance"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.bonusBalance}
                        onChange={(e) => setFormData({ ...formData, bonusBalance: parseFloat(e.target.value) || 0 })}
                        className="bg-gray-800/50 border-gray-700 text-white"
                      />
                    </div>
                  </div>

                  <div className="bg-amber-900/20 p-3 md:p-4 rounded-lg border border-amber-700/50">
                    <p className="text-xs md:text-sm text-amber-400 mb-2">
                      <strong>⚠️ Conta Demo</strong>
                    </p>
                    <p className="text-xs md:text-xs text-amber-300/80">
                      Esta conta é apenas para demonstração e testes de jogos. 
                      Não permite realizar depósitos, saques ou editar perfil. 
                      Ideal para mostrar o funcionamento da plataforma aos seus clientes.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-[#00E880] to-emerald-600 hover:from-[#00E880]/90 hover:to-emerald-600/90 text-black font-semibold"
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                        Criando...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <UserPlus className="w-4 h-4" />
                        Criar Conta Demo
                      </span>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          // Display Account Info
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gradient-to-br from-gray-900/95 to-gray-950/95 backdrop-blur-xl border-gray-800">
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <CardTitle className="text-white flex items-center gap-2">
                    <User className="w-5 h-5 text-[#00E880]" />
                    Informações da Conta Demo
                  </CardTitle>
                  <div className="flex gap-2">
                    {!isEditing ? (
                      <>
                        <Button
                          onClick={() => setIsEditing(true)}
                          variant="outline"
                          size="sm"
                          className="border-gray-700 hover:bg-gray-800 text-xs md:text-sm px-3 md:px-4"
                        >
                          <Edit className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                          Editar
                        </Button>
                        <Button
                          onClick={handleDelete}
                          variant="outline"
                          size="sm"
                          className="border-red-900 hover:bg-red-900/20 text-red-400 text-xs md:text-sm px-3 md:px-4"
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                          Excluir
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          onClick={handleSubmit}
                          size="sm"
                          className="bg-[#00E880] hover:bg-[#00E880]/90 text-black text-xs md:text-sm px-3 md:px-4"
                          disabled={updateMutation.isPending}
                        >
                          <Check className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                          Salvar
                        </Button>
                        <Button
                          onClick={() => {
                            setIsEditing(false);
                            setFormData({
                              name: demoAccount.name,
                              balance: demoAccount.balance,
                              bonusBalance: demoAccount.bonusBalance
                            });
                          }}
                          variant="outline"
                          size="sm"
                          className="border-gray-700 hover:bg-gray-800 text-xs md:text-sm px-3 md:px-4"
                        >
                          <X className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                          Cancelar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  // Edit Form
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="edit-name" className="text-gray-300">Nome</Label>
                      <Input
                        id="edit-name"
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="bg-gray-800/50 border-gray-700 text-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-balance" className="text-gray-300">Saldo Normal (R$)</Label>
                        <Input
                          id="edit-balance"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.balance}
                          onChange={(e) => setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })}
                          className="bg-gray-800/50 border-gray-700 text-white"
                        />
                      </div>

                      <div>
                        <Label htmlFor="edit-bonusBalance" className="text-gray-300">Saldo Bônus (R$)</Label>
                        <Input
                          id="edit-bonusBalance"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.bonusBalance}
                          onChange={(e) => setFormData({ ...formData, bonusBalance: parseFloat(e.target.value) || 0 })}
                          className="bg-gray-800/50 border-gray-700 text-white"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  // Display Info
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-800/30 p-3 md:p-4 rounded-lg border border-gray-700/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs md:text-sm text-gray-400 flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Nome
                          </span>
                        </div>
                        <p className="text-sm md:text-base text-white font-semibold">{demoAccount.name}</p>
                      </div>

                      <div className="bg-gray-800/30 p-3 md:p-4 rounded-lg border border-gray-700/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs md:text-sm text-gray-400 flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            Email
                          </span>
                          <Button
                            onClick={() => handleCopy(demoAccount.email, 'email')}
                            variant="ghost"
                            size="sm"
                            className="hover:bg-gray-800"
                          >
                            {copiedField === 'email' ? (
                              <Check className="w-4 h-4 text-[#00E880]" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                        <p className="text-xs md:text-sm text-white font-semibold break-all">{demoAccount.email}</p>
                      </div>

                      <div className="bg-gray-800/30 p-3 md:p-4 rounded-lg border border-gray-700/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs md:text-sm text-gray-400 flex items-center gap-2">
                            <Lock className="w-4 h-4" />
                            Senha
                          </span>
                          <Button
                            onClick={() => handleCopy(demoAccount.password, 'password')}
                            variant="ghost"
                            size="sm"
                            className="hover:bg-gray-800"
                          >
                            {copiedField === 'password' ? (
                              <Check className="w-4 h-4 text-[#00E880]" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                        <p className="text-sm md:text-base text-white font-semibold">{demoAccount.password}</p>
                      </div>

                      <div className="bg-gray-800/30 p-3 md:p-4 rounded-lg border border-gray-700/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs md:text-sm text-gray-400 flex items-center gap-2">
                            <Wallet className="w-4 h-4" />
                            Saldo Normal
                          </span>
                        </div>
                        <p className="text-sm md:text-base text-white font-semibold">R$ {demoAccount.balance.toFixed(2)}</p>
                      </div>

                      <div className="bg-gray-800/30 p-3 md:p-4 rounded-lg border border-gray-700/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs md:text-sm text-gray-400 flex items-center gap-2">
                            <Wallet className="w-4 h-4" />
                            Saldo Bônus
                          </span>
                        </div>
                        <p className="text-sm md:text-base text-white font-semibold">R$ {demoAccount.bonusBalance.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="bg-amber-900/20 p-3 md:p-4 rounded-lg border border-amber-700/50">
                      <p className="text-xs md:text-sm text-amber-400 mb-2">
                        <strong>⚠️ Conta Demo</strong>
                      </p>
                      <p className="text-xs md:text-xs text-amber-300/80">
                        Esta conta é apenas para demonstração e testes de jogos. 
                        Não permite realizar depósitos, saques ou editar perfil. 
                        Pode jogar normalmente com o saldo disponível.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </AffiliateLayout>
  );
}