import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import {
  MessageSquare,
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  RefreshCw,
  Search,
  Filter,
  Archive,
  MessageCircle,
  ChevronRight,
  Inbox,
  Users,
  Activity,
  TrendingUp
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SupportTicket {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  createdAt: string;
  updatedAt: string;
  responses: {
    id: number;
    message: string;
    isAdmin: boolean;
    createdAt: string;
  }[];
}

interface ChatSession {
  id: number;
  userId: number;
  userName: string;
  lastMessage: string;
  unreadCount: number;
  status: 'active' | 'waiting' | 'closed';
  startedAt: string;
  lastActivityAt: string;
}

export function ChatManagement() {
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [selectedChat, setSelectedChat] = useState<ChatSession | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("tickets");

  // Fetch support tickets
  const { data: tickets, isLoading: ticketsLoading, refetch: refetchTickets } = useQuery({
    queryKey: ["/api/admin/support-tickets"],
    queryFn: async () => {
      const sessionId = localStorage.getItem('adminSessionId');
      const response = await fetch('/api/admin/support-tickets', {
        headers: {
          'Authorization': `Bearer ${sessionId}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch tickets');
      }
      
      return response.json();
    },
  });

  // Fetch chat sessions
  const { data: chatSessions, isLoading: chatsLoading, refetch: refetchChats } = useQuery({
    queryKey: ["/api/admin/chat-sessions"],
    queryFn: async () => {
      const sessionId = localStorage.getItem('adminSessionId');
      const response = await fetch('/api/admin/chat-sessions', {
        headers: {
          'Authorization': `Bearer ${sessionId}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch chat sessions');
      }
      
      return response.json();
    },
  });

  // Chat statistics
  const { data: chatStats } = useQuery({
    queryKey: ["/api/admin/chat-stats"],
    queryFn: async () => {
      const sessionId = localStorage.getItem('adminSessionId');
      const response = await fetch('/api/admin/chat-stats', {
        headers: {
          'Authorization': `Bearer ${sessionId}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch chat stats');
      }
      
      return response.json();
    },
  });

  // Send reply mutation
  const sendReplyMutation = useMutation({
    mutationFn: async ({ ticketId, message }: { ticketId: number; message: string }) => {
      const sessionId = localStorage.getItem('adminSessionId');
      const response = await fetch(`/api/admin/support-tickets/${ticketId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionId}`
        },
        body: JSON.stringify({ message })
      });
      
      if (!response.ok) {
        throw new Error('Failed to send reply');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({ description: "Resposta enviada com sucesso!" });
      setReplyMessage("");
      refetchTickets();
    },
    onError: () => {
      toast({
        title: "Erro ao enviar resposta",
        variant: "destructive",
      });
    },
  });

  // Update ticket status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: number; status: string }) => {
      const sessionId = localStorage.getItem('adminSessionId');
      const response = await fetch(`/api/admin/support-tickets/${ticketId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionId}`
        },
        body: JSON.stringify({ status })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update status');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({ description: "Status atualizado com sucesso!" });
      refetchTickets();
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar status",
        variant: "destructive",
      });
    },
  });

  // Filter tickets
  const filteredTickets = tickets?.filter((ticket: SupportTicket) => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          ticket.userName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Mock data for demonstration (replace with real data from API)
  const mockTickets: SupportTicket[] = [
    {
      id: 1,
      userId: 45,
      userName: "João Silva",
      userEmail: "joao@email.com",
      subject: "Problema com depósito",
      message: "Meu depósito não foi creditado na conta",
      status: 'open',
      priority: 'high',
      category: 'payment',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      responses: []
    },
    {
      id: 2,
      userId: 67,
      userName: "Maria Santos",
      userEmail: "maria@email.com",
      subject: "Dúvida sobre raspadinha",
      message: "Como funciona o multiplicador?",
      status: 'in_progress',
      priority: 'medium',
      category: 'game',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      responses: [
        {
          id: 1,
          message: "Olá Maria! O multiplicador aumenta o valor dos prêmios.",
          isAdmin: true,
          createdAt: new Date().toISOString()
        }
      ]
    }
  ];

  const mockChatSessions: ChatSession[] = [
    {
      id: 1,
      userId: 45,
      userName: "João Silva",
      lastMessage: "Preciso de ajuda com meu saque",
      unreadCount: 2,
      status: 'active',
      startedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString()
    },
    {
      id: 2,
      userId: 89,
      userName: "Pedro Costa",
      lastMessage: "Obrigado pela ajuda!",
      unreadCount: 0,
      status: 'waiting',
      startedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString()
    }
  ];

  const displayTickets = filteredTickets || mockTickets;
  const displayChats = chatSessions || mockChatSessions;

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'open': return 'bg-yellow-500';
      case 'in_progress': return 'bg-blue-500';
      case 'resolved': return 'bg-green-500';
      case 'closed': return 'bg-gray-500';
      case 'active': return 'bg-green-500';
      case 'waiting': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'urgent': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

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
            Central de Atendimento
          </motion.h2>
          <p className="text-zinc-400">Gerencie tickets de suporte e chats ao vivo</p>
        </div>
        
        {/* Badges de status no header */}
        <div className="flex gap-2">
          <Badge variant="outline" className="border-[#00E880] text-[#00E880]">
            Tickets: {displayTickets.length}
          </Badge>
          {displayChats.filter((c: ChatSession) => c.status === 'active').length > 0 && (
            <Badge variant="outline" className="border-green-500 text-green-400 animate-pulse">
              Ativos: {displayChats.filter((c: ChatSession) => c.status === 'active').length}
            </Badge>
          )}
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-zinc-400 text-sm mb-1">Tickets Abertos</p>
                  <p className="text-3xl font-bold text-white">
                    <CountUp end={chatStats?.openTickets || displayTickets.filter((t: SupportTicket) => t.status === 'open').length} duration={1.5} />
                  </p>
                  <p className="text-xs text-amber-400 mt-2">Aguardando resposta</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-amber-500/20 to-amber-600/20 rounded-xl">
                  <Inbox className="w-6 h-6 text-amber-400" />
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
                  <p className="text-zinc-400 text-sm mb-1">Chats Ativos</p>
                  <p className="text-3xl font-bold text-white">
                    <CountUp end={chatStats?.activeChats || displayChats.filter((c: ChatSession) => c.status === 'active').length} duration={1.5} />
                  </p>
                  <p className="text-xs text-green-400 mt-2">Em atendimento</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-xl">
                  <MessageCircle className="w-6 h-6 text-green-400" />
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
                  <p className="text-zinc-400 text-sm mb-1">Tempo Médio</p>
                  <p className="text-3xl font-bold text-white">
                    <CountUp end={parseInt(chatStats?.avgResponseTime || "15")} duration={1.5} suffix=" min" />
                  </p>
                  <p className="text-xs text-blue-400 mt-2">Tempo de resposta</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl">
                  <Clock className="w-6 h-6 text-blue-400" />
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
                  <p className="text-zinc-400 text-sm mb-1">Satisfação</p>
                  <p className="text-3xl font-bold text-white">
                    <CountUp end={parseInt(chatStats?.satisfactionRate || "94")} duration={1.5} suffix="%" />
                  </p>
                  <p className="text-xs text-[#00E880] mt-2">Taxa de satisfação</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-[#00E880]/20 to-[#00E880]/30 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-[#00E880]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="tickets" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-[#00E880]">Tickets de Suporte</TabsTrigger>
          <TabsTrigger value="livechat" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-[#00E880]">Chat ao Vivo</TabsTrigger>
        </TabsList>

        {/* Support Tickets Tab */}
        <TabsContent value="tickets" className="space-y-4">
          <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tickets de Suporte</CardTitle>
                  <CardDescription>Gerencie tickets e solicitações dos usuários</CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Buscar tickets..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-400"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white"
                  >
                    <option value="all">Todos</option>
                    <option value="open">Abertos</option>
                    <option value="in_progress">Em Progresso</option>
                    <option value="resolved">Resolvidos</option>
                    <option value="closed">Fechados</option>
                  </select>
                  <Button onClick={() => refetchTickets()} size="sm" variant="outline">
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Assunto</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayTickets?.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell>#{ticket.id}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{ticket.userName}</p>
                          <p className="text-xs text-zinc-400">{ticket.userEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{ticket.subject}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{ticket.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`font-medium ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority.toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(ticket.status)}>
                          {ticket.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(ticket.createdAt), "dd/MM HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedTicket(ticket)}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Ticket Details Modal */}
          {selectedTicket && (
            <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Ticket #{selectedTicket.id} - {selectedTicket.subject}</CardTitle>
                  <div className="flex gap-2">
                    <select
                      value={selectedTicket.status}
                      onChange={(e) => updateStatusMutation.mutate({
                        ticketId: selectedTicket.id,
                        status: e.target.value
                      })}
                      className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white"
                    >
                      <option value="open">Aberto</option>
                      <option value="in_progress">Em Progresso</option>
                      <option value="resolved">Resolvido</option>
                      <option value="closed">Fechado</option>
                    </select>
                    <Button
                      variant="outline"
                      onClick={() => setSelectedTicket(null)}
                    >
                      Fechar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-zinc-400">Mensagem Original:</p>
                  <div className="p-4 bg-zinc-800 rounded-lg">
                    <p className="text-white">{selectedTicket.message}</p>
                  </div>
                </div>

                {selectedTicket.responses.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-zinc-400">Histórico de Conversas:</p>
                    <ScrollArea className="h-64 border border-zinc-700 rounded-lg p-4">
                      {selectedTicket.responses.map((response) => (
                        <div
                          key={response.id}
                          className={`mb-4 p-3 rounded-lg ${
                            response.isAdmin ? 'bg-blue-900/20 ml-8' : 'bg-zinc-800 mr-8'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-zinc-400">
                              {response.isAdmin ? 'Admin' : selectedTicket.userName}
                            </span>
                            <span className="text-xs text-zinc-400">
                              {format(new Date(response.createdAt), "dd/MM HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                          <p className="text-white">{response.message}</p>
                        </div>
                      ))}
                    </ScrollArea>
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-sm text-zinc-400">Enviar Resposta:</p>
                  <Textarea
                    placeholder="Digite sua resposta..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    className="min-h-[100px] bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-400"
                  />
                  <Button
                    onClick={() => sendReplyMutation.mutate({
                      ticketId: selectedTicket.id,
                      message: replyMessage
                    })}
                    disabled={!replyMessage.trim()}
                    className="w-full"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Resposta
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Live Chat Tab */}
        <TabsContent value="livechat" className="space-y-4">
          <Card className="bg-black/50 border-zinc-800 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Chat ao Vivo</CardTitle>
                  <CardDescription>Atenda usuários em tempo real</CardDescription>
                </div>
                <Button onClick={() => refetchChats()} size="sm" variant="outline">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Chat Sessions List */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-white mb-2">Sessões de Chat</h3>
                  <ScrollArea className="h-96 border border-zinc-700 rounded-lg p-2">
                    {displayChats?.map((chat) => (
                      <div
                        key={chat.id}
                        onClick={() => setSelectedChat(chat)}
                        className={`p-3 rounded-lg mb-2 cursor-pointer transition-colors ${
                          selectedChat?.id === chat.id ? 'bg-zinc-700' : 'bg-zinc-800 hover:bg-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-zinc-400" />
                            <span className="font-medium text-white">{chat.userName}</span>
                          </div>
                          {chat.unreadCount > 0 && (
                            <Badge className="bg-red-500 text-white">
                              {chat.unreadCount}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-zinc-400 truncate">{chat.lastMessage}</p>
                        <div className="flex items-center justify-between mt-2">
                          <Badge className={getStatusColor(chat.status)}>
                            {chat.status}
                          </Badge>
                          <span className="text-xs text-zinc-400">
                            {format(new Date(chat.lastActivityAt), "HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                </div>

                {/* Chat Window */}
                <div className="space-y-2">
                  {selectedChat ? (
                    <>
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-white">
                          Chat com {selectedChat.userName}
                        </h3>
                        <Badge className={getStatusColor(selectedChat.status)}>
                          {selectedChat.status}
                        </Badge>
                      </div>
                      <ScrollArea className="h-80 border border-zinc-700 rounded-lg p-4 bg-zinc-900">
                        <div className="space-y-3">
                          {/* Mock messages - replace with real chat messages */}
                          <div className="flex justify-start">
                            <div className="bg-zinc-800 rounded-lg p-3 max-w-xs">
                              <p className="text-white">Olá, preciso de ajuda com meu saque</p>
                              <span className="text-xs text-zinc-400">14:32</span>
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <div className="bg-blue-900/20 rounded-lg p-3 max-w-xs">
                              <p className="text-white">Olá! Claro, posso ajudar. Qual o problema?</p>
                              <span className="text-xs text-zinc-400">14:33</span>
                            </div>
                          </div>
                        </div>
                      </ScrollArea>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Digite sua mensagem..."
                          className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-400"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              // Send message logic
                            }
                          }}
                        />
                        <Button className="bg-[#00E880] hover:bg-[#00E880]/80 text-black">
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="h-96 border border-zinc-700 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <MessageSquare className="w-12 h-12 text-zinc-400 mx-auto mb-2" />
                        <p className="text-zinc-400">Selecione uma conversa para começar</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}