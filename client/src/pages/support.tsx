import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { MobileLayout } from "@/components/mobile-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Send, X, Plus, ChevronRight, Clock, CheckCircle, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id: number;
  chatId: number;
  senderId: number;
  senderType: 'user' | 'admin' | 'system';
  message: string;
  createdAt: string;
  readAt?: string;
}

interface Chat {
  id: number;
  userId: number;
  status: 'active' | 'closed';
  createdAt: string;
  closedAt?: string;
  closedBy?: string;
}

export default function SupportPage() {
  const [, navigate] = useLocation();
  const [showChat, setShowChat] = useState(false);
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [isClosingFromMain, setIsClosingFromMain] = useState(false);

  // Check for existing active chat
  const { data: activeChat, isLoading: isLoadingActiveChat, refetch: refetchActiveChat } = useQuery({
    queryKey: ['/api/support/active-chat'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/support/active-chat', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });
        
        if (response.status === 404) {
          return null;
        }
        
        if (!response.ok) {
          throw new Error('Failed to fetch active chat');
        }
        
        return response.json();
      } catch (error) {
        console.error('Error fetching active chat:', error);
        return null;
      }
    },
  });

  // Get chat details when in chat view
  const { data: chatData, isLoading: isLoadingChat } = useQuery({
    queryKey: ['/api/support/chat', activeChat?.id],
    queryFn: async () => {
      if (!activeChat?.id) return null;
      const response = await apiRequest(`/api/support/chat/${activeChat.id}`, 'GET');
      return response;
    },
    enabled: showChat && !!activeChat?.id,
    refetchInterval: showChat ? 3000 : false, // Poll for new messages every 3 seconds when in chat
  });

  // Create chat mutation
  const createChatMutation = useMutation({
    mutationFn: async (description: string) => {
      const response = await apiRequest('/api/support/create', 'POST', { description });
      return response;
    },
    onSuccess: async (data) => {
      toast({
        description: "Chamado criado com sucesso!",
      });
      setDescription("");
      // Refresh active chat and then show the chat
      await queryClient.invalidateQueries({ queryKey: ['/api/support/active-chat'] });
      await refetchActiveChat();
      // Wait a bit longer to ensure data is loaded
      setTimeout(() => {
        setShowChat(true);
      }, 1000);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || "Erro ao criar chamado. Tente novamente.";
      toast({
        description: message || "Não foi possível criar o chamado",
        variant: "destructive",
      });
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (data: { chatId: number; message: string }) =>
      apiRequest('/api/support/send', 'POST', data),
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ['/api/support/chat', activeChat?.id] });
    },
    onError: () => {
      toast({
        description: "Não foi possível enviar a mensagem",
      });
    },
  });

  // Close chat mutation
  const closeChatMutation = useMutation({
    mutationFn: (chatId: number) =>
      apiRequest('/api/support/close', 'POST', { chatId }),
    onSuccess: () => {
      toast({ description: "O chamado foi fechado com sucesso." });
      setShowChat(false);
      queryClient.invalidateQueries({ queryKey: ['/api/support/active-chat'] });
      queryClient.invalidateQueries({ queryKey: ['/api/support/chat'] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao fechar chamado. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (showChat && chatData?.messages) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatData?.messages, showChat]);

  // Handle create chat
  const handleCreateChat = () => {
    if (!description.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, descreva seu problema.",
        variant: "destructive",
      });
      return;
    }
    createChatMutation.mutate(description.trim());
  };

  // Handle send message
  const handleSendMessage = () => {
    if (!message.trim() || !activeChat?.id) return;
    
    sendMessageMutation.mutate({
      chatId: activeChat.id,
      message: message.trim(),
    });
  };

  // Handle close chat with confirmation
  const handleCloseChat = () => {
    if (!activeChat?.id) return;
    setIsClosing(true);
  };

  const confirmCloseChat = () => {
    if (!activeChat?.id) return;
    closeChatMutation.mutate(activeChat.id);
    setIsClosing(false);
  };

  const cancelCloseChat = () => {
    setIsClosing(false);
  };

  // Handle close from main page
  const handleCloseFromMain = () => {
    setIsClosingFromMain(true);
  };

  const confirmCloseFromMain = () => {
    if (!activeChat?.id) return;
    closeChatMutation.mutate(activeChat.id);
    setIsClosingFromMain(false);
  };

  const cancelCloseFromMain = () => {
    setIsClosingFromMain(false);
  };

  // Format date/time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (isLoadingActiveChat) {
    return (
      <MobileLayout title="Suporte" onBack={() => navigate("/profile")}>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
      </MobileLayout>
    );
  }

  // Show chat view
  if (showChat && activeChat) {
    const messages = (chatData?.messages || []) as Message[];

    return (
      <div className="fixed inset-0 bg-gradient-to-br from-[#1a1f2e] via-[#0f1419] to-[#1a1f2e] flex flex-col h-[100dvh]">
        <div className="max-w-4xl mx-auto w-full flex flex-col h-full relative">
          {/* Chat Header */}
          <div className="bg-gradient-to-r from-[#1f2937] to-[#111827] backdrop-blur-lg p-4 md:p-6 border-b border-gray-700/50 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowChat(false)}
                className="p-2 md:p-3 hover:bg-gray-900 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 md:w-6 md:h-6 text-gray-400" />
              </button>
              <h3 className="font-semibold text-white text-lg md:text-xl">Atendimento ao Cliente</h3>
            </div>
            
            {activeChat.status === 'active' && (
              <button
                onClick={handleCloseChat}
                className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg transition-all duration-200 border border-red-500/20 hover:border-red-500/30"
              >
                <X className="w-4 h-4 md:w-5 md:h-5" />
                <span className="text-sm md:text-base font-medium">Encerrar</span>
              </button>
            )}
          </div>
          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-gradient-to-b from-[#1a1f2e]/50 to-[#0f1419]/50 backdrop-blur-sm">
          {isLoadingChat ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
            </div>
          ) : (
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`flex ${
                    msg.senderType === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div className="max-w-[80%] md:max-w-[70%]">
                    {msg.senderType === 'admin' && (
                      <p className="text-xs md:text-sm text-gray-400 mb-1 ml-3">Atendente Carol S.</p>
                    )}
                    <div
                      className={`${
                        msg.senderType === 'user'
                          ? 'bg-gradient-to-r from-[#00E880] to-[#00D470] text-black'
                          : msg.senderType === 'system'
                          ? 'bg-gray-800/60 backdrop-blur-sm text-gray-300 italic border border-gray-700/30'
                          : 'bg-gradient-to-r from-gray-700/80 to-gray-600/80 backdrop-blur-sm text-white border border-gray-600/30'
                      } rounded-2xl px-4 py-3 md:px-5 md:py-4 shadow-lg`}
                    >
                      <p className="text-sm md:text-base whitespace-pre-wrap">{msg.message}</p>
                      <p className="text-xs md:text-sm opacity-70 mt-1">
                        {formatTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
          <div ref={messagesEndRef} />
        </div>
        {/* Input area - Fixed at bottom */}
        <div className="bg-gradient-to-r from-[#1f2937] to-[#111827] backdrop-blur-lg shadow-[0_-4px_20px_rgba(0,232,128,0.1)] relative z-50">
          {activeChat.status === 'active' ? (
            <div className="border-t border-gray-700/50 p-3 md:p-6 safe-area-bottom">
              <div className="flex gap-2 md:gap-3">
                <Input
                  type="text"
                  placeholder="Digite sua mensagem..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1 bg-gray-800/60 backdrop-blur-sm border-gray-600/50 text-white placeholder:text-gray-400 focus:border-[#00E880] focus:ring-1 focus:ring-[#00E880] transition-all duration-200 text-base h-12 rounded-xl px-4"
                  disabled={sendMessageMutation.isPending}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || sendMessageMutation.isPending}
                  className="bg-gradient-to-r from-[#00E880] to-[#00D470] hover:from-[#00D470] hover:to-[#00C560] text-black px-4 md:px-6 transition-all duration-200 h-12 rounded-xl shadow-lg shadow-[#00E880]/20 font-medium"
                >
                  <Send className="w-4 h-4 md:w-5 md:h-5" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="border-t border-gray-700/50 p-4 md:p-6">
              <p className="text-center text-zinc-400 text-sm md:text-base">
                Este chamado foi encerrado
              </p>
            </div>
          )}
        </div>
        {/* Close confirmation modal */}
        <AnimatePresence>
          {isClosing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={cancelCloseChat}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="bg-gradient-to-br from-gray-800 to-gray-900 backdrop-blur-lg rounded-xl p-6 max-w-sm w-full border border-gray-700/50 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-semibold mb-2 text-white">Encerrar chamado?</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Tem certeza que deseja encerrar este chamado? Você não poderá enviar mais mensagens.
                </p>
                <div className="flex gap-3">
                  <Button
                    className="flex-1 text-black bg-white hover:bg-gray-100 font-semibold"
                    onClick={cancelCloseChat}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold"
                    onClick={confirmCloseChat}
                    disabled={closeChatMutation.isPending}
                  >
                    {closeChatMutation.isPending ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-auto" />
                    ) : (
                      'Encerrar'
                    )}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>
    );
  }

  // Show ticket list/creation view
  return (
    <MobileLayout hideRightSection hideFooter>
      <div className="min-h-full bg-gradient-to-br from-[#1a1f2e] via-[#111827] to-[#1f2937] p-4 md:p-6">
        <div className="max-w-md md:max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <div className="mb-4">
              <h1 className="text-2xl md:text-3xl font-bold text-white">Central de Suporte</h1>
              <p className="text-gray-400 text-sm md:text-base mt-1">Como podemos ajudar você hoje?</p>
            </div>
          </div>

          {/* Active ticket or create new */}
          {activeChat ? (
            <Card className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-sm border-gray-700/50 shadow-xl">
              <CardHeader className="md:p-6">
                <CardTitle className="text-lg md:text-xl flex items-center justify-between">
                  <span className="text-[#03cf72]">Chamado Ativo</span>
                  <span className={`text-xs md:text-sm px-2 py-1 rounded-full ${
                    activeChat.status === 'active' 
                      ? 'bg-green-500/20 text-green-500' 
                      : 'bg-gray-500/20 text-gray-500'
                  }`}>
                    {activeChat.status === 'active' ? 'Em andamento' : 'Fechado'}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="md:p-6">
                <div className="space-y-3 md:space-y-4">
                  <div className="flex items-center gap-2 text-sm md:text-base text-gray-400">
                    <Clock className="w-4 h-4 md:w-5 md:h-5" />
                    <span>Criado em {formatDate(activeChat.createdAt)}</span>
                  </div>
                  
                  <p className="text-sm md:text-base text-gray-300">
                    Você tem um chamado em andamento. Clique abaixo para continuar a conversa.
                  </p>

                  <Button
                    onClick={() => setShowChat(true)}
                    className="w-full bg-gradient-to-r from-[#00E880] to-[#00D470] hover:from-[#00D470] hover:to-[#00C560] text-black font-semibold transition-all duration-200 transform hover:scale-[1.02] md:text-lg md:py-6"
                  >
                    <MessageCircle className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                    Abrir Atendimento
                  </Button>
                  
                  {activeChat.status === 'active' && (
                    <Button
                      onClick={handleCloseFromMain}
                      className="w-full bg-[#ff0000] hover:bg-[#cc0000] text-[#ffffff] font-semibold transition-all duration-200 transform hover:scale-[1.02] md:text-lg md:py-6"
                    >
                      <X className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                      Encerrar Atendimento
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-sm border-gray-700/50 shadow-xl">
              <CardHeader className="md:p-6">
                <CardTitle className="text-lg md:text-xl text-[#05b771]">Criar Novo Chamado</CardTitle>
              </CardHeader>
              <CardContent className="md:p-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm md:text-base text-gray-400 mb-2 block">
                      Descreva seu problema ou dúvida
                    </label>
                    <Textarea
                      placeholder="Explique detalhadamente como podemos ajudar..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="min-h-[120px] md:min-h-[150px] bg-gray-800/60 backdrop-blur-sm border-gray-600/50 text-white placeholder:text-gray-400 md:text-base focus:border-[#00E880] focus:ring-1 focus:ring-[#00E880] transition-all rounded-lg"
                    />
                  </div>

                  <Button
                    onClick={handleCreateChat}
                    disabled={!description.trim() || createChatMutation.isPending}
                    className="w-full bg-gradient-to-r from-[#00E880] to-[#00D470] hover:from-[#00D470] hover:to-[#00C560] text-black font-semibold transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 md:text-lg md:py-6"
                  >
                    {createChatMutation.isPending ? (
                      <div className="animate-spin rounded-full h-4 w-4 md:h-5 md:w-5 border-b-2 border-black mr-2" />
                    ) : (
                      <Plus className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                    )}
                    Criar Chamado
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Info cards */}
          <div className="mt-6 md:mt-8 space-y-3 md:space-y-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
            <Card className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-sm border-gray-700/30 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-500/20 p-2 md:p-3 rounded-full">
                    <Clock className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm md:text-base">Horário de Atendimento</h3>
                    <p className="text-xs md:text-sm text-gray-400 mt-1">Segunda a Sexta: 9h às 18h</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-sm border-gray-700/30 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-start gap-3">
                  <div className="bg-purple-500/20 p-2 md:p-3 rounded-full">
                    <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm md:text-base">Resposta Rápida</h3>
                    <p className="text-xs md:text-sm text-gray-400 mt-1">Respondemos em até 2 horas úteis</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Close confirmation modal from main page */}
        <AnimatePresence>
          {isClosingFromMain && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={cancelCloseFromMain}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="bg-gradient-to-br from-gray-800 to-gray-900 backdrop-blur-lg rounded-xl p-6 max-w-sm w-full border border-gray-700/50 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-semibold mb-2 text-white">Encerrar chamado?</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Tem certeza que deseja encerrar este chamado? Você não poderá enviar mais mensagens.
                </p>
                <div className="flex gap-3">
                  <Button
                    className="flex-1 text-black bg-white hover:bg-gray-100 font-semibold"
                    onClick={cancelCloseFromMain}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold"
                    onClick={confirmCloseFromMain}
                    disabled={closeChatMutation.isPending}
                  >
                    {closeChatMutation.isPending ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-auto" />
                    ) : (
                      'Encerrar'
                    )}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MobileLayout>
  );
}