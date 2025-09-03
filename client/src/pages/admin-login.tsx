import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Lock, User, Shield } from "lucide-react";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = useMutation({
    mutationFn: (data: { username: string; password: string }) =>
      apiRequest("/api/admin/login", "POST", data),
    onSuccess: (data) => {
      // Store the session ID in localStorage
      localStorage.setItem('adminSessionId', data.sessionId);
      setLocation("/admin/dashboard");
    },
    onError: () => {
      toast({
        title: "Erro ao fazer login",
        description: "Credenciais inválidas",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username && password) {
      loginMutation.mutate({ username, password });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#00E880]/10 via-transparent to-transparent opacity-30" />
      
      <Card className="w-full max-w-md bg-zinc-900/90 border-zinc-800 backdrop-blur-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#00E880]/5 to-transparent pointer-events-none" />
        
        <CardHeader className="relative">
          <div className="flex flex-col items-center space-y-4">
            <div className="bg-gradient-to-br from-[#00E880]/20 to-[#00D470]/20 p-4 rounded-2xl backdrop-blur-sm border border-[#00E880]/20">
              <Shield className="w-12 h-12 text-[#00E880]" />
            </div>
            <CardTitle className="text-3xl font-bold text-white text-center">
              Painel Administrativo
            </CardTitle>
            <p className="text-zinc-400 text-sm text-center">
              Acesso restrito aos administradores
            </p>
          </div>
        </CardHeader>
        
        <CardContent className="relative">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="relative">
                <User className="absolute left-3 top-3 w-5 h-5 text-[#00E880]" />
                <Input
                  type="text"
                  placeholder="Usuário"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 bg-black/50 border-zinc-700 text-white placeholder-zinc-500 focus:border-[#00E880] focus:ring-[#00E880] transition-all"
                  required
                />
              </div>
              
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-[#00E880]" />
                <Input
                  type="password"
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-black/50 border-zinc-700 text-white placeholder-zinc-500 focus:border-[#00E880] focus:ring-[#00E880] transition-all"
                  required
                />
              </div>
            </div>
            
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-[#00E880] to-[#00D470] hover:from-[#00D470] hover:to-[#00C060] text-black font-bold py-6 text-lg transition-all duration-300 transform hover:scale-105"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black animate-spin rounded-full" />
                  Entrando...
                </span>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>
          
          <div className="mt-6 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
            <p className="text-xs text-zinc-400 text-center">
              Área restrita • Somente administradores autorizados
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}