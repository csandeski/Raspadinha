import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare,
  Send,
  CheckCircle,
  Clock,
  User,
  Shield,
  X,
  Activity,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  MessageCircle,
  Zap,
  Timer,
  Users,
  BarChart3,
  ArrowUpRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  LineChart, 
  Line, 
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

interface SupportChat {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  status: "active" | "closed";
  description: string;
  createdAt: string;
  updatedAt: string;
  messages: SupportMessage[];
}

interface SupportMessage {
  id: number;
  chatId: number;
  senderId: number;
  senderRole: "user" | "admin" | "system";
  message: string;
  createdAt: string;
}

export default function SupportManagement() {
  const { toast } = useToast();
  const [selectedChat, setSelectedChat] = useState<SupportChat | null>(null);
  const [message, setMessage] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "closed">("active");

  // Fetch support chats
  const { data: chats, isLoading, error } = useQuery<SupportChat[]>({
    queryKey: ["/api/admin/support/chats"],
    queryFn: async () => {
      const sessionId = localStorage.getItem("adminSessionId");
      
      if (!sessionId) {
        throw new Error("No admin session found");
      }
      
      const response = await fetch("/api/admin/support/chats", {
        headers: {
          Authorization: `Bearer ${sessionId}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        // Error handled in UI
        throw new Error(errorData.message || "Failed to fetch chats");
      }
      
      const data = await response.json();
      return data;
    },
    refetchInterval: 5000, // Refresh every 5 seconds
    retry: 1,
  });

  // Send message
  const sendMessageMutation = useMutation({
    mutationFn: async ({ chatId, message }: { chatId: number; message: string }) => {
      const sessionId = localStorage.getItem("adminSessionId");
      const response = await fetch("/api/admin/support/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionId}`,
        },
        body: JSON.stringify({ chatId, message }),
      });
      if (!response.ok) throw new Error("Failed to send message");
      return response.json();
    },
    onSuccess: (newMessage) => {
      setMessage("");
      // Update selected chat messages immediately
      if (selectedChat) {
        const updatedChat = {
          ...selectedChat,
          messages: [...selectedChat.messages, newMessage]
        };
        setSelectedChat(updatedChat);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/chats"] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao enviar mensagem",
        variant: "destructive",
      });
    },
  });

  // Close chat
  const closeChatMutation = useMutation({
    mutationFn: async (chatId: number) => {
      const sessionId = localStorage.getItem("adminSessionId");
      const response = await fetch(`/api/admin/support/close/${chatId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionId}`,
        },
      });
      if (!response.ok) throw new Error("Failed to close chat");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Chamado fechado com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/support/chats"] });
      setSelectedChat(null);
    },
  });

  // Update selected chat when chats data changes
  React.useEffect(() => {
    if (selectedChat && chats) {
      const updatedChat = chats.find(chat => chat.id === selectedChat.id);
      if (updatedChat) {
        setSelectedChat(updatedChat);
      }
    }
  }, [chats]);

  const filteredChats = chats?.filter((chat) => {
    if (filterStatus === "all") return true;
    return chat.status === filterStatus;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const activeChatsCount = chats?.filter(c => c.status === "active").length || 0;

  // Calculate stats
  const supportStats = {
    total: chats?.length || 0,
    active: chats?.filter(c => c.status === "active").length || 0,
    closed: chats?.filter(c => c.status === "closed").length || 0,
    avgResponseTime: "2.3 min",
    satisfaction: 94,
    todayTickets: chats?.filter(c => new Date(c.createdAt).toDateString() === new Date().toDateString()).length || 0,
  };

  // Chart data
  const statusDistribution = [
    { name: "Ativos", value: supportStats.active, color: "#00E880" },
    { name: "Fechados", value: supportStats.closed, color: "#71717a" },
  ];

  const responseTimeData = [
    { hour: "00h", time: 2.1 },
    { hour: "04h", time: 1.8 },
    { hour: "08h", time: 3.2 },
    { hour: "12h", time: 4.5 },
    { hour: "16h", time: 3.8 },
    { hour: "20h", time: 2.4 },
  ];

  return (
    <div className="space-y-6">
      {/* Header da Página */}
      <div className="flex items-center justify-between">
        <div>
          <motion.h2 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-3xl font-bold text-white mb-2 flex items-center gap-3"
          >
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1, delay: 0.5 }}
            >
              <MessageSquare className="w-8 h-8 text-[#00E880]" />
            </motion.div>
            Gerenciamento de Suporte
          </motion.h2>
          <p className="text-zinc-400">Responda e gerencie tickets de suporte dos usuários</p>
        </div>
        
        {/* Badges de status no header */}
        <div className="flex gap-2">
          <Badge variant="outline" className="border-[#00E880] text-[#00E880]">
            Total: {supportStats.total}
          </Badge>
          {supportStats.active > 0 && (
            <Badge variant="outline" className="border-amber-500 text-amber-400 animate-pulse">
              Ativos: {supportStats.active}
            </Badge>
          )}
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-zinc-400 text-sm mb-1">Tickets Ativos</p>
                  <p className="text-3xl font-bold text-white">
                    <CountUp end={supportStats.active} duration={1.5} />
                  </p>
                  <Badge className="mt-2 bg-[#00E880]/10 text-[#00E880] border-[#00E880]/20">
                    <ArrowUpRight className="w-3 h-3 mr-1" />
                    Urgente
                  </Badge>
                </div>
                <div className="p-3 bg-gradient-to-br from-[#00E880]/20 to-[#00E880]/30 rounded-xl">
                  <MessageCircle className="w-6 h-6 text-[#00E880]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-blue-100 text-sm mb-1">Tempo Médio</p>
                  <p className="text-2xl font-bold text-white">
                    {supportStats.avgResponseTime}
                  </p>
                  <p className="text-blue-200 text-xs mt-1">
                    Resposta rápida
                  </p>
                </div>
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Timer className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-purple-100 text-sm mb-1">Satisfação</p>
                  <p className="text-3xl font-bold text-white">
                    <CountUp end={supportStats.satisfaction} duration={1.5} />%
                  </p>
                  <div className="flex gap-1 mt-2">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="w-4 h-4 bg-yellow-400 rounded-full" />
                    ))}
                  </div>
                </div>
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Zap className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-orange-100 text-sm mb-1">Tickets Hoje</p>
                  <p className="text-3xl font-bold text-white">
                    <CountUp end={supportStats.todayTickets} duration={1.5} />
                  </p>
                  <p className="text-orange-200 text-xs mt-1">
                    Novos tickets
                  </p>
                </div>
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-100 text-sm mb-1">Total de Tickets</p>
                  <p className="text-3xl font-bold text-white">
                    <CountUp end={supportStats.total} duration={1.5} />
                  </p>
                  <p className="text-gray-200 text-xs mt-1">
                    Histórico completo
                  </p>
                </div>
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Status Distribution */}
        <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#00E880]" />
              Distribuição de Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  paddingAngle={5}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={1000}
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-4">
              {statusDistribution.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-zinc-400">
                    {item.name}: {item.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Response Time Chart */}
        <Card className="lg:col-span-2 bg-black/50 border-zinc-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Timer className="w-5 h-5 text-[#00E880]" />
              Tempo de Resposta (Hoje)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={responseTimeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="hour" stroke="#71717a" />
                <YAxis stroke="#71717a" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                  formatter={(value: number) => [`${value} min`, 'Tempo']}
                />
                <Line
                  type="monotone"
                  dataKey="time"
                  stroke="#00E880"
                  strokeWidth={3}
                  dot={{ fill: '#00E880', r: 4 }}
                  animationDuration={1000}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chats List */}
        <div className="lg:col-span-1 space-y-4">
          {/* Filter */}
          <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={filterStatus === "all" ? "default" : "outline"}
                  onClick={() => setFilterStatus("all")}
                  className={filterStatus === "all" 
                    ? "bg-gradient-to-r from-[#00E880] to-[#00D470] text-black font-bold hover:from-[#00D470] hover:to-[#00C560] transform hover:scale-105 transition-all" 
                    : "bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:bg-zinc-700/50 hover:text-white transition-all"
                  }
                >
                  Todos
                </Button>
                <Button
                  size="sm"
                  variant={filterStatus === "active" ? "default" : "outline"}
                  onClick={() => setFilterStatus("active")}
                  className={filterStatus === "active" 
                    ? "bg-gradient-to-r from-green-500 to-green-600 text-white font-bold hover:from-green-600 hover:to-green-700 transform hover:scale-105 transition-all" 
                    : "bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:bg-zinc-700/50 hover:text-white transition-all"
                  }
                >
                  Ativos ({activeChatsCount})
                </Button>
                <Button
                  size="sm"
                  variant={filterStatus === "closed" ? "default" : "outline"}
                  onClick={() => setFilterStatus("closed")}
                  className={filterStatus === "closed" 
                    ? "bg-gradient-to-r from-gray-500 to-gray-600 text-white font-bold hover:from-gray-600 hover:to-gray-700 transform hover:scale-105 transition-all" 
                    : "bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:bg-zinc-700/50 hover:text-white transition-all"
                  }
                >
                  Fechados
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Chats */}
          <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm">
            <CardHeader className="border-b border-zinc-800">
              <CardTitle className="text-xl font-bold text-[#00E880]">Chamados de Suporte</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00E880]" />
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                  <p className="text-red-400 font-semibold mb-2">Erro ao carregar chats</p>
                  <p className="text-zinc-400 text-sm">{error.message}</p>
                  <Button
                    onClick={() => window.location.reload()}
                    className="mt-4 bg-zinc-800 hover:bg-zinc-700 text-white"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Recarregar
                  </Button>
                </div>
              ) : !filteredChats || filteredChats.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                  <p className="text-zinc-400 font-semibold">Nenhum chamado encontrado</p>
                  <p className="text-zinc-500 text-sm mt-1">
                    {filterStatus === "active" ? "Não há chamados ativos no momento" : 
                     filterStatus === "closed" ? "Não há chamados fechados" : 
                     "Não há chamados de suporte"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredChats.map((chat) => (
                    <div
                      key={chat.id}
                      onClick={() => setSelectedChat(chat)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                        selectedChat?.id === chat.id
                          ? "bg-zinc-800 border-[#00E880] shadow-[0_0_20px_rgba(0,232,128,0.2)]"
                          : "bg-black/30 border-zinc-700 hover:bg-zinc-800/50 hover:border-zinc-600"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-white">{chat.userName}</p>
                          <p className="text-sm text-zinc-400">{chat.userEmail}</p>
                        </div>
                        {chat.status === "active" ? (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 font-semibold">
                            <Clock className="w-3 h-3 mr-1" />
                            Ativo
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 font-semibold">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Fechado
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-zinc-300 line-clamp-2">{chat.description}</p>
                      <p className="text-xs text-zinc-500 mt-2">
                        {formatDate(chat.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Chat Messages */}
        <div className="lg:col-span-2">
          {selectedChat ? (
            <Card className="bg-black/50 border-zinc-800 h-[600px] flex flex-col backdrop-blur-sm">
              <CardHeader className="border-b border-zinc-800">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl font-bold text-[#00E880]">{selectedChat.userName}</CardTitle>
                    <p className="text-sm text-zinc-400">{selectedChat.userEmail}</p>
                  </div>
                  {selectedChat.status === "active" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all"
                      onClick={() => closeChatMutation.mutate(selectedChat.id)}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Fechar Chamado
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  {/* Initial description */}
                  <div className="bg-black/50 rounded-lg p-4 border border-zinc-800">
                    <p className="text-sm text-zinc-400 font-semibold uppercase tracking-wider mb-2">Descrição do chamado:</p>
                    <p className="text-white">{selectedChat.description}</p>
                  </div>

                  {/* Messages */}
                  {selectedChat.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.senderRole === "admin" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-4 ${
                          msg.senderRole === "admin"
                            ? "bg-gradient-to-r from-[#00E880] to-[#00D470] text-black shadow-[0_0_20px_rgba(0,232,128,0.3)]"
                            : msg.senderRole === "system"
                            ? "bg-zinc-800/50 text-zinc-400 italic border border-zinc-700"
                            : "bg-zinc-800 text-white border border-zinc-700"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {msg.senderRole === "admin" ? (
                            <Shield className="w-3 h-3" />
                          ) : msg.senderRole === "user" ? (
                            <User className="w-3 h-3" />
                          ) : (
                            <MessageSquare className="w-3 h-3" />
                          )}
                          <span className="text-xs font-medium">
                            {msg.senderRole === "admin" ? "Admin" : msg.senderRole === "user" ? selectedChat.userName : "Sistema"}
                          </span>
                        </div>
                        <p className="text-sm">{msg.message}</p>
                        <p className={`text-xs mt-1 ${
                          msg.senderRole === "admin" ? "text-black/70" : "text-gray-400"
                        }`}>
                          {formatDate(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              {selectedChat.status === "active" && (
                <div className="border-t border-zinc-800 p-4">
                  <div className="flex gap-2">
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          if (message.trim()) {
                            sendMessageMutation.mutate({ chatId: selectedChat.id, message });
                          }
                        }
                      }}
                      placeholder="Digite sua resposta..."
                      className="flex-1 bg-black/50 border-zinc-700 text-white min-h-[80px] focus:border-[#00E880] transition-colors"
                    />
                    <Button
                      onClick={() => sendMessageMutation.mutate({ chatId: selectedChat.id, message })}
                      disabled={!message.trim() || sendMessageMutation.isPending}
                      className="bg-gradient-to-r from-[#00E880] to-[#00D470] hover:from-[#00D470] hover:to-[#00C560] text-black font-bold transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ) : (
            <Card className="bg-black/50 border-zinc-800 h-[600px] flex items-center justify-center backdrop-blur-sm">
              <div className="text-center">
                <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8 text-zinc-500" />
                </div>
                <p className="text-zinc-400 text-lg">Selecione um chamado para visualizar</p>
                <p className="text-zinc-500 text-sm mt-2">Escolha um chamado da lista à esquerda</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}