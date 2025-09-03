import { useState, useEffect } from "react";
import { X, Gift } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface Prize {
  id: string;
  type: "money" | "raspadinhas";
  value: number | string;
  label: string;
  displayLabel: string;
  color: string;
  darkColor: string;
  glowColor: string;
  icon: string;
  scratches?: {
    game: string;
    count: number;
    gameLabel: string;
  };
}

const prizes: Prize[] = [
  { 
    id: "1", 
    type: "money", 
    value: 1, 
    label: "R$ 1", 
    displayLabel: "R$ 1",
    color: '#22c55e', 
    darkColor: '#16a34a', 
    glowColor: 'rgba(34, 197, 94, 0.4)',
    icon: "💰" 
  },
  { 
    id: "2", 
    type: "raspadinhas", 
    value: "pix_kit", 
    label: "3 PIX", 
    displayLabel: "3 PIX",
    color: '#3b82f6', 
    darkColor: '#2563eb', 
    glowColor: 'rgba(59, 130, 246, 0.4)',
    icon: "🎫", 
    scratches: { game: "premio-pix", count: 3, gameLabel: "PIX na Conta" } 
  },
  { 
    id: "3", 
    type: "money", 
    value: 2, 
    label: "R$ 2", 
    displayLabel: "R$ 2",
    color: '#a855f7', 
    darkColor: '#9333ea', 
    glowColor: 'rgba(168, 85, 247, 0.4)',
    icon: "💰" 
  },
  { 
    id: "4", 
    type: "raspadinhas", 
    value: "me_mimei_kit", 
    label: "3 MIMEI", 
    displayLabel: "3 MIMEI",
    color: '#f43f5e', 
    darkColor: '#e11d48', 
    glowColor: 'rgba(244, 63, 94, 0.4)',
    icon: "🎫",
    scratches: { game: "premio-me-mimei", count: 3, gameLabel: "Me Mimei" } 
  },
  { 
    id: "5", 
    type: "money", 
    value: 5, 
    label: "R$ 5", 
    displayLabel: "R$ 5",
    color: '#f59e0b', 
    darkColor: '#d97706', 
    glowColor: 'rgba(245, 158, 11, 0.4)',
    icon: "💰" 
  },
];

export function DashboardRewardsWheel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null);
  const [rotation, setRotation] = useState(0);
  const [showWin, setShowWin] = useState(false);
  const [showClaimButton, setShowClaimButton] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) {
      setIsSpinning(false);
      setSelectedPrize(null);
      setRotation(0);
      setShowWin(false);
      setShowClaimButton(false);
    }
  }, [isOpen]);

  const startSpin = async () => {
    if (isSpinning) return;
    
    setIsSpinning(true);
    setSelectedPrize(null);
    setShowWin(false);
    setShowClaimButton(false);
    
    try {
      // Call API to get the result
      const response = await apiRequest('/api/daily-spin/spin', 'POST', {
        includeScratches: true // Tell backend we support raspadinha prizes
      });
      
      // Find the winning prize
      const winningPrize = prizes.find(p => {
        if (p.type === "money" && response.type === "money") {
          return p.value === response.amount;
        } else if (p.type === "raspadinhas" && response.type === "raspadinhas") {
          return p.value === response.scratchType;
        }
        return false;
      });
      
      if (!winningPrize) {
        throw new Error("Prize not found");
      }
      
      setSelectedPrize(winningPrize);
      
      // Calculate target position for bottom pointer
      const segmentIndex = prizes.findIndex(p => p.id === winningPrize.id);
      const segmentAngle = 360 / prizes.length;
      
      // Calculate the current angle of the winning segment's center
      const segmentStartAngle = -90 + (segmentIndex * segmentAngle);
      const segmentCenterAngle = segmentStartAngle + (segmentAngle / 2);
      
      // To align this segment with the pointer at 90 degrees, we need to rotate by:
      let targetRotation = 90 - segmentCenterAngle;
      
      // Normalize to positive angle
      if (targetRotation < 0) targetRotation += 360;
      
      // Add multiple full spins for effect
      const spins = 5;
      const finalRotation = rotation + targetRotation + (spins * 360);
      
      setRotation(finalRotation);
      
      // Stop spinning after animation
      setTimeout(() => {
        setIsSpinning(false);
        setShowWin(true);
        
        // Trigger confetti
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        
        setShowClaimButton(true);
      }, 4000);
      
    } catch (error: any) {
      console.error("Spin error:", error);
      setIsSpinning(false);
      toast({
        title: "Erro",
        description: error.message || "Erro ao girar a roleta",
        variant: "destructive",
      });
    }
  };

  const handleClaim = () => {
    if (!selectedPrize) return;
    
    queryClient.invalidateQueries({ queryKey: ['/api/daily-spin/status'] });
    queryClient.invalidateQueries({ queryKey: ['/api/user/balance'] });
    
    // If it's raspadinhas, redirect to the game with free plays
    if (selectedPrize.type === "scratch_cards" && selectedPrize.scratches) {
      setLocation(`/game/${selectedPrize.scratches.game}?freePlays=${selectedPrize.scratches.count}`);
    }
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget && !isSpinning) {
            onClose();
          }
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="rounded-2xl p-6 relative"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
            disabled={isSpinning}
          >
            <X className="w-6 h-6" />
          </button>

          {/* Wheel */}
          <div className="relative mx-auto" style={{ width: '300px', height: '300px' }}>
            {/* Beautiful outer decorative ring */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 p-2">
              <div className="w-full h-full rounded-full bg-gray-900 relative">
                {/* Inner gradient shadow */}
                <div className="absolute inset-2 rounded-full bg-gradient-to-b from-gray-800 via-gray-900 to-black shadow-2xl"></div>
                
                {/* Beautiful LED lights around the wheel */}
                {[...Array(16)].map((_, i) => {
                  const angle = (i * 22.5) - 90; // Start from top
                  const x = 50 + 45 * Math.cos(angle * Math.PI / 180);
                  const y = 50 + 45 * Math.sin(angle * Math.PI / 180);
                  return (
                    <div
                      key={i}
                      className={`absolute w-2 h-2 rounded-full ${
                        isSpinning ? 'animate-pulse' : ''
                      }`}
                      style={{
                        left: `${x}%`,
                        top: `${y}%`,
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: i % 2 === 0 ? '#fbbf24' : '#f59e0b',
                        boxShadow: `0 0 10px ${i % 2 === 0 ? '#fbbf24' : '#f59e0b'}`,
                      }}
                    />
                  );
                })}
                
                {/* SVG Wheel */}
                <motion.div
                  className="absolute inset-4 w-[calc(100%-2rem)] h-[calc(100%-2rem)]"
                  animate={{ rotate: rotation }}
                  transition={{
                    duration: 4,
                    ease: [0.17, 0.67, 0.25, 1.00],
                  }}
                >
                  <svg
                    className="w-full h-full"
                    viewBox="0 0 200 200"
                    style={{
                      filter: 'drop-shadow(0 4px 20px rgba(0, 0, 0, 0.8))',
                    }}
                  >
                    <defs>
                      {prizes.map((prize, index) => (
                        <radialGradient key={`gradient-${index}`} id={`gradient-${index}`}>
                          <stop offset="0%" stopColor={prize.color} />
                          <stop offset="100%" stopColor={prize.darkColor} />
                        </radialGradient>
                      ))}
                    </defs>
                    
                    <g>
                    {prizes.map((prize, index) => {
                      const segmentAngle = 360 / prizes.length;
                      const startAngle = index * segmentAngle - 90;
                      const endAngle = startAngle + segmentAngle;
                      
                      const startRad = (startAngle * Math.PI) / 180;
                      const endRad = (endAngle * Math.PI) / 180;
                      
                      const x1 = 100 + 85 * Math.cos(startRad);
                      const y1 = 100 + 85 * Math.sin(startRad);
                      const x2 = 100 + 85 * Math.cos(endRad);
                      const y2 = 100 + 85 * Math.sin(endRad);
                      
                      return (
                        <g key={index}>
                          <path
                            d={`M 100 100 L ${x1} ${y1} A 85 85 0 0 1 ${x2} ${y2} Z`}
                            fill={`url(#gradient-${index})`}
                            stroke="#333"
                            strokeWidth="2"
                            style={{
                              filter: `drop-shadow(0 0 5px ${prize.glowColor})`,
                            }}
                          />
                          
                          {/* Prize text */}
                          <text
                            x="100"
                            y="100"
                            fill="white"
                            fontSize="14"
                            fontWeight="bold"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            transform={`rotate(${startAngle + segmentAngle / 2} 100 100) translate(0 -45)`}
                            style={{
                              filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8))',
                            }}
                          >
                            {prize.displayLabel}
                          </text>
                        </g>
                      );
                    })}
                    
                      {/* Center circle */}
                      <circle cx="100" cy="100" r="25" fill="#1f2937" stroke="#374151" strokeWidth="3" />
                      <circle cx="100" cy="100" r="20" fill="#111827" />
                    </g>
                  </svg>
                </motion.div>
                
                {/* Pointer at bottom */}
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1 z-10">
                  <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[25px] border-t-yellow-400 drop-shadow-lg"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Win message */}
          {showWin && selectedPrize && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center mt-6 mb-4"
            >
              {selectedPrize.type === "scratch_cards" ? (
                <>
                  <h3 className="text-2xl font-bold text-white mb-2">Parabéns!</h3>
                  <p className="text-lg text-gray-300">
                    Você ganhou <span className="text-[#00E880] font-bold">{selectedPrize.scratches?.count} raspadinhas {selectedPrize.scratches?.gameLabel}</span>!
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-2xl font-bold text-white mb-2">Parabéns!</h3>
                  <p className="text-lg text-gray-300">
                    Você ganhou <span className="text-[#00E880] font-bold">{selectedPrize.label}</span>!
                  </p>
                </>
              )}
            </motion.div>
          )}

          {/* Spin/Claim Button */}
          <div className="flex justify-center mt-6">
            {!showClaimButton ? (
              <Button
                onClick={startSpin}
                disabled={isSpinning}
                size="lg"
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold px-8 py-6 text-lg rounded-xl shadow-lg transform transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSpinning ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Girando...
                  </div>
                ) : (
                  <>
                    <Gift className="w-5 h-5 mr-2" />
                    Girar Roleta
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleClaim}
                size="lg"
                className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-bold px-8 py-6 text-lg rounded-xl shadow-lg transform transition-all hover:scale-105 animate-pulse"
              >
                {selectedPrize?.type === "scratch_cards" ? "Jogar Grátis" : "Resgatar Prêmio"}
              </Button>
            )}
          </div>

          {/* Prize info */}
          {selectedPrize && showClaimButton && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 text-center"
            >
              <p className="text-xl text-white mb-2">
                Você ganhou{" "}
                <span className="font-bold text-yellow-400">
                  {selectedPrize.label}
                  {selectedPrize.type === "scratch_cards" && " Mania Bônus"}
                </span>
                !
              </p>
              <p className="text-gray-400 text-sm">
                {selectedPrize.type === "money" 
                  ? "O valor será adicionado ao seu saldo bônus."
                  : "Clique em 'Jogar Grátis' para usar suas raspadinhas!"}
              </p>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}