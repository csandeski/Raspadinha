import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Send, User, Headphones, Clock, CheckCircle, LogOut, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

interface Message {
  id: number;
  content: string;
  sender: 'user' | 'admin';
  createdAt: string;
}

interface SupportChat {
  id: number;
  userId: number;
  userName: string;
  subject: string;
  status: 'active' | 'closed';
  messages: Message[];
  createdAt: string;
}

export default function SupportAgent() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedChat, setSelectedChat] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem("supportAgentToken");
    if (!token) {
      setLocation("/macaco123");
    }
  }, [setLocation]);

  // Query open support tickets
  const { data: chats = [], refetch } = useQuery<SupportChat[]>({
    queryKey: ['/api/support-agent/chats'],
    queryFn: async () => {
      const token = localStorage.getItem('supportAgentToken');
      const response = await fetch('/api/support-agent/chats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch chats');
      return response.json();
    },
    refetchInterval: 3000, // Poll every 3 seconds
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ chatId, content }: { chatId: number; content: string }) => {
      return fetch('/api/support-agent/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('supportAgentToken')}`
        },
        body: JSON.stringify({ chatId, content }),
      }).then(res => res.json());
    },
    onSuccess: () => {
      setMessage("");
      refetch();
      scrollToBottom();
    },
    onError: () => {
      toast({
        description: "Não foi possível enviar a mensagem",
      });
    },
  });

  // Close chat mutation
  const closeChat = useMutation({
    mutationFn: async (chatId: number) => {
      return fetch(`/api/support-agent/close/${chatId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supportAgentToken')}`
        }
      }).then(res => res.json());
    },
    onSuccess: () => {
      setSelectedChat(null);
      refetch();
      toast({
        description: "Chamado finalizado com sucesso",
      });
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !selectedChat) return;
    
    sendMessageMutation.mutate({ chatId: selectedChat, content: message });
  };

  const handleLogout = () => {
    localStorage.removeItem("supportAgentToken");
    localStorage.removeItem("supportAgentName");
    setLocation("/macaco123");
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [selectedChat, chats]);

  const currentChat = chats.find(chat => chat.id === selectedChat);
  const agentName = localStorage.getItem("supportAgentName") || "Atendente";

  // Chat list view
  if (!selectedChat) {
    return (
      <div className="min-h-screen bg-black">
        {/* Header */}
        <div className="bg-gradient-to-br from-gray-900 to-black border-b border-gray-800 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00E880] to-[#00D470] flex items-center justify-center flex-shrink-0">
                <Headphones className="w-4 h-4 text-black" />
              </div>
              <div>
                <h1 className="text-base font-bold text-white">Central de Suporte</h1>
                <p className="text-xs text-gray-400">Olá, Bruna Pinheiro</p>
              </div>
            </div>
            <Button
              onClick={handleLogout}
              size="sm"
              variant="ghost"
              className="text-gray-400 hover:text-white p-2"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Chat list */}
        <div className="p-3 space-y-2">
          {chats.length === 0 ? (
            <Card className="p-6 text-center border-gray-800 bg-gray-900">
              <Headphones className="w-10 h-10 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Nenhum chamado em aberto</p>
            </Card>
          ) : (
            chats.map((chat) => (
              <Card
                key={chat.id}
                onClick={() => setSelectedChat(chat.id)}
                className="p-3 border-gray-800 bg-gradient-to-br from-gray-900 to-black cursor-pointer hover:border-[#00E880]/50 transition-colors active:scale-[0.98]"
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white text-sm truncate">{chat.userName}</h3>
                      <p className="text-xs text-gray-400">Chamado #{chat.id}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    {format(new Date(chat.createdAt), "HH:mm")}
                  </span>
                </div>
                <p className="text-sm text-gray-300 line-clamp-2 ml-10">{chat.subject}</p>
                {chat.messages.length > 0 && (
                  <div className="flex items-center justify-between mt-2 ml-10">
                    <p className="text-xs text-gray-500">
                      {chat.messages.length} {chat.messages.length === 1 ? 'mensagem' : 'mensagens'}
                    </p>
                    <div className="w-2 h-2 rounded-full bg-[#00E880] animate-pulse" />
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      </div>
    );
  }

  // Chat view
  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Chat header */}
      <div className="bg-gradient-to-br from-gray-900 to-black border-b border-gray-800 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Button
              onClick={() => setSelectedChat(null)}
              size="sm"
              variant="ghost"
              className="text-gray-400 hover:text-white p-1.5 -ml-1"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">
                <User className="w-3.5 h-3.5 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-white text-sm truncate">{currentChat?.userName}</h2>
                <p className="text-xs text-gray-400">Chamado #{currentChat?.id}</p>
              </div>
            </div>
          </div>
          <Button
            onClick={() => closeChat.mutate(selectedChat)}
            size="sm"
            className="bg-green-600/20 text-green-400 hover:bg-green-600/30 border-0 px-2 py-1.5 text-xs"
          >
            <CheckCircle className="w-3.5 h-3.5 mr-1" />
            Finalizar
          </Button>
        </div>
      </div>

      {/* Subject */}
      {currentChat && (
        <div className="bg-gray-900/50 p-3 border-b border-gray-800">
          <p className="text-xs text-gray-300">
            <span className="text-gray-500">Assunto:</span> {currentChat.subject}
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {currentChat?.messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl p-3 ${
                msg.sender === 'admin'
                  ? 'bg-gradient-to-r from-[#00E880] to-[#00D470] text-black'
                  : 'bg-gray-800 text-white'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              <div className={`flex items-center gap-2 mt-1 text-xs ${
                msg.sender === 'admin' ? 'text-black/70' : 'text-gray-500'
              }`}>
                <span>{format(new Date(msg.createdAt), "HH:mm")}</span>
                {msg.sender === 'admin' && (
                  <div className="flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span className="text-xs">atendente Bruna Pinheiro</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-800 bg-gray-900">
        <div className="flex gap-2 items-end">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            rows={1}
            className="flex-1 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-[#00E880] focus:ring-[#00E880] resize-none text-sm min-h-[36px] py-2"
            disabled={sendMessageMutation.isPending}
          />
          <Button
            type="submit"
            disabled={!message.trim() || sendMessageMutation.isPending}
            className="bg-gradient-to-r from-[#00E880] to-[#00D470] text-black hover:opacity-90 transition-opacity disabled:opacity-50 p-2"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}