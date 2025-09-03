import { useState } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Headphones } from "lucide-react";

export default function SupportAgentLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast({
        description: "Preencha todos os campos",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/support-agent/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store agent session
        localStorage.setItem("supportAgentToken", data.token);
        localStorage.setItem("supportAgentName", data.name);
        
        setLocation("/support-agent");
      } else {
        toast({
          description: data.error || "Credenciais inválidas",
        });
      }
    } catch (error) {
      toast({
        description: "Ocorreu um erro ao fazer login",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="w-full max-w-sm border-gray-800 bg-gradient-to-br from-gray-900 to-black p-6">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#00E880] to-[#00D470] flex items-center justify-center mb-4">
            <Headphones className="w-10 h-10 text-black" />
          </div>
          <h1 className="text-2xl font-bold text-white">Suporte</h1>
          <p className="text-gray-400 text-sm mt-1">Área do Atendente</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Input
              type="text"
              placeholder="Usuário"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 focus:border-[#00E880] focus:ring-[#00E880]"
              disabled={isLoading}
            />
          </div>

          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 focus:border-[#00E880] focus:ring-[#00E880] pr-10"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-[#00E880] to-[#00D470] text-black font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isLoading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </Card>
    </div>
  );
}