import { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Shield, User } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest<{ sessionId: string; message: string }>({
        url: "/api/admin/login",
        method: "POST",
        body: { username, password },
      });

      // Store admin session
      localStorage.setItem("adminSessionId", response.sessionId);
      
      toast({
        title: "Sucesso",
        description: "Login realizado com sucesso",
      });

      setLocation("/admin/dashboard");
    } catch (error) {
      toast({
        title: "Erro",
        description: "Credenciais inválidas",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0E1015] via-[#1a1b23] to-[#0E1015] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-br from-red-500/30 to-red-600/30 p-4 rounded-full backdrop-blur-sm">
              <Shield className="w-8 h-8 text-red-500" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center text-[#05b771]">
            Painel Administrativo
          </CardTitle>
          <p className="text-center text-gray-400 text-sm mt-2">
            Acesso restrito a administradores
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                Usuário
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 bg-zinc-800 border-zinc-700 text-white focus:border-[#00E880] focus:ring-1 focus:ring-[#00E880]"
                  placeholder="Digite o usuário"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-zinc-800 border-zinc-700 text-white focus:border-[#00E880] focus:ring-1 focus:ring-[#00E880]"
                  placeholder="Digite a senha"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-[#00E880] to-[#00D470] hover:from-[#00D470] hover:to-[#00C560] text-black font-semibold transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mx-auto" />
              ) : (
                "Entrar"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}