import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface AvatarSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatar: string;
  affiliateName: string;
  onAvatarChange: (avatar: string) => void;
}

const avatarOptions = [
  { id: 'avatar1', name: 'Profissional', style: 'avataaars', colors: ['#00E880', '#00C770'] },
  { id: 'avatar2', name: 'Robô Tech', style: 'bottts', colors: ['#667EEA', '#764BA2'] },
  { id: 'avatar3', name: 'Pixel Art', style: 'pixel-art', colors: ['#F093FB', '#F5576C'] },
  { id: 'avatar4', name: 'Casual', style: 'personas', colors: ['#FA709A', '#FEE140'] },
  { id: 'avatar5', name: 'Minimalista', style: 'miniavs', colors: ['#30CFD0', '#330867'] },
  { id: 'avatar6', name: 'Notion Style', style: 'notionists', colors: ['#A8E6CF', '#FFDAC1'] },
  { id: 'avatar7', name: 'Emoji Fun', style: 'fun-emoji', colors: ['#FF9A00', '#C32BAC'] },
  { id: 'avatar8', name: 'Elegante', style: 'lorelei', colors: ['#6A0572', '#AB83A1'] },
  { id: 'avatar9', name: 'Geométrico', style: 'shapes', colors: ['#2AF598', '#009EFD'] },
  { id: 'avatar10', name: 'Cartoon', style: 'micah', colors: ['#F857A6', '#FF5858'] }
];

export function AvatarSelector({ isOpen, onClose, currentAvatar, affiliateName, onAvatarChange }: AvatarSelectorProps) {
  const [selectedAvatar, setSelectedAvatar] = useState(currentAvatar);
  const [isLoading, setIsLoading] = useState(false);

  const getAvatarUrl = (avatarId: string) => {
    const avatar = avatarOptions.find(a => a.id === avatarId);
    if (!avatar) return '';
    return `https://api.dicebear.com/7.x/${avatar.style}/svg?seed=${affiliateName}&backgroundColor=b6e3f4`;
  };

  const handleSave = async () => {
    if (selectedAvatar === currentAvatar) {
      onClose();
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/affiliate/update-avatar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('affiliateToken')}`
        },
        body: JSON.stringify({ avatar: selectedAvatar })
      });
      
      if (!res.ok) {
        throw new Error('Failed to update avatar');
      }

      onAvatarChange(selectedAvatar);
      toast({
        title: "Avatar atualizado!",
        description: "Seu novo avatar foi salvo com sucesso.",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Erro ao atualizar avatar",
        description: "Não foi possível salvar seu avatar. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60]"
          />

          {/* Modal Container - Centralizado */}
          <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto mx-auto"
            >
            <div className="bg-gradient-to-b from-gray-900 to-gray-950 rounded-2xl border border-gray-800 shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="relative px-6 py-5 border-b border-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">Escolha seu Avatar</h2>
                    <p className="text-sm text-gray-400 mt-0.5">
                      <span className="sm:hidden">Selecione seu estilo</span>
                      <span className="hidden sm:inline">Selecione um estilo que combine com você</span>
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 transition-all group"
                  >
                    <X className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                  </button>
                </div>
              </div>

              {/* Avatar Grid */}
              <div className="p-3 sm:p-6">
                <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-4">
                  {avatarOptions.map((avatar, index) => {
                    const isSelected = selectedAvatar === avatar.id;
                    return (
                      <motion.button
                        key={avatar.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => setSelectedAvatar(avatar.id)}
                        className={cn(
                          "relative group rounded-lg sm:rounded-xl p-2 sm:p-4 transition-all duration-300",
                          "bg-gradient-to-b from-gray-800/50 to-gray-900/50",
                          "border sm:border-2",
                          isSelected
                            ? "border-[#00E880] shadow-lg shadow-[#00E880]/20 sm:scale-105"
                            : "border-gray-700 hover:border-gray-600 sm:hover:scale-105"
                        )}
                      >
                        {/* Selected Badge */}
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-[#00E880] flex items-center justify-center z-10"
                          >
                            <Check className="w-3 h-3 sm:w-4 sm:h-4 text-gray-900" />
                          </motion.div>
                        )}

                        {/* Avatar Background Gradient */}
                        <div
                          className="absolute inset-0 rounded-xl opacity-20 blur-xl"
                          style={{
                            background: `linear-gradient(135deg, ${avatar.colors[0]}, ${avatar.colors[1]})`
                          }}
                        />

                        {/* Avatar Image */}
                        <div className="relative">
                          <div className="w-12 h-12 sm:w-20 sm:h-20 mx-auto rounded-full overflow-hidden bg-gray-800/50 border border-gray-700 group-hover:border-gray-600 transition-all">
                            <img
                              src={getAvatarUrl(avatar.id)}
                              alt={avatar.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <p className={cn(
                            "text-[10px] sm:text-xs font-medium mt-2 sm:mt-3 transition-colors",
                            isSelected ? "text-[#00E880]" : "text-gray-400 group-hover:text-white"
                          )}>
                            {avatar.name}
                          </p>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-800 bg-gray-900/50">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-400">
                    Avatar atual: <span className="text-white font-medium">
                      {avatarOptions.find(a => a.id === currentAvatar)?.name || 'Padrão'}
                    </span>
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={onClose}
                      className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white font-medium transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isLoading || selectedAvatar === currentAvatar}
                      className={cn(
                        "px-6 py-2 rounded-lg font-medium transition-all",
                        "bg-gradient-to-r from-[#00E880] to-green-600",
                        "text-gray-900 shadow-lg",
                        isLoading || selectedAvatar === currentAvatar
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:shadow-[#00E880]/30 hover:scale-105"
                      )}
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-gray-900/30 border-t-gray-900 rounded-full animate-spin" />
                          Salvando...
                        </div>
                      ) : (
                        <>
                          <span className="sm:hidden">Salvar</span>
                          <span className="hidden sm:inline">Salvar Avatar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}