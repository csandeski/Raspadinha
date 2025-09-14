import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { MobileLayout } from "@/components/mobile-layout";
import { ArrowLeft, Plane, Play, DollarSign, History, TrendingUp, TrendingDown, Zap, Clock } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import rocketImg from "@assets/rocket.png";

// Types
interface GameStatus {
  roundId: string | null;
  state: 'waiting' | 'playing' | 'crashed';
  multiplier: number;
  history: number[];
  countdown: number;
  activeBets?: number;
}

interface Bet {
  amount: number;
  roundId?: string;
  status: 'idle' | 'placed' | 'won' | 'lost';
  winMultiplier?: number;
  profit?: number;
}

interface TrailPoint {
  x: number;
  y: number;
  time: number;
}

export default function ManiaFly() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const gameStartTimeRef = useRef<number>(0);
  const trailPointsRef = useRef<TrailPoint[]>([]);
  const rocketImageRef = useRef<HTMLImageElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 400 });
  const [rocketLoaded, setRocketLoaded] = useState(false);
  const cloudOffsetRef = useRef<number>(0);
  const rocketAnimationRef = useRef<number>(0);
  
  // Game state from server
  const [gameStatus, setGameStatus] = useState<GameStatus>({
    roundId: null,
    state: 'waiting',
    multiplier: 0,
    history: [],
    countdown: 0
  });
  
  // Betting state
  const [bet1, setBet1] = useState<Bet>({ amount: 1, status: 'idle' });
  const [bet2, setBet2] = useState<Bet>({ amount: 1, status: 'idle' });
  const [bet1Input, setBet1Input] = useState("1");
  const [bet2Input, setBet2Input] = useState("1");
  const [autoCashout1, setAutoCashout1] = useState("");
  const [autoCashout2, setAutoCashout2] = useState("");
  
  // Load rocket image
  useEffect(() => {
    const image = new Image();
    image.src = rocketImg;
    image.onload = () => {
      rocketImageRef.current = image;
      setRocketLoaded(true);
    };
    image.onerror = () => {
      console.error('Failed to load rocket image');
    };
  }, []);
  
  // Resize canvas
  useEffect(() => {
    const handleResize = () => {
      const container = canvasRef.current?.parentElement;
      if (container) {
        setCanvasSize({
          width: container.clientWidth,
          height: 400
        });
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Canvas drawing functions
  const drawGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw sky gradient background
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGradient.addColorStop(0, '#0a1929'); // Very dark blue at top
    skyGradient.addColorStop(0.3, '#1e3a5f'); // Dark blue
    skyGradient.addColorStop(0.5, '#2e5c8a'); // Mid blue
    skyGradient.addColorStop(0.7, '#4a8bc2'); // Light blue
    skyGradient.addColorStop(1, '#87ceeb'); // Sky blue at bottom
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw sunburst effect
    const sunX = canvas.width * 0.85;
    const sunY = canvas.height * 0.15;
    
    // Sun glow
    const sunGradient = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 250);
    sunGradient.addColorStop(0, 'rgba(255, 220, 100, 0.6)');
    sunGradient.addColorStop(0.3, 'rgba(255, 200, 50, 0.3)');
    sunGradient.addColorStop(0.6, 'rgba(255, 180, 0, 0.1)');
    sunGradient.addColorStop(1, 'rgba(255, 180, 0, 0)');
    ctx.fillStyle = sunGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Update cloud offset for animation
    if (gameStatus.state === 'playing') {
      cloudOffsetRef.current -= 0.5 * Math.max(1, gameStatus.multiplier / 2); // Speed based on multiplier
    }
    
    // Draw animated clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    for (let i = 0; i < 8; i++) {
      const baseX = i * 200 + cloudOffsetRef.current;
      const cloudX = ((baseX % (canvas.width + 200)) + canvas.width + 200) % (canvas.width + 200) - 100;
      const cloudY = 50 + Math.sin(i * 0.8) * 40;
      
      // Cloud shape with multiple circles
      ctx.beginPath();
      ctx.arc(cloudX, cloudY, 35, 0, Math.PI * 2);
      ctx.arc(cloudX + 25, cloudY - 5, 30, 0, Math.PI * 2);
      ctx.arc(cloudX + 50, cloudY, 28, 0, Math.PI * 2);
      ctx.arc(cloudX + 20, cloudY + 10, 25, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Draw horizon line
    const horizonGradient = ctx.createLinearGradient(0, canvas.height - 50, 0, canvas.height);
    horizonGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    horizonGradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
    ctx.fillStyle = horizonGradient;
    ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
    
    if (gameStatus.state === 'playing') {
      const elapsed = (Date.now() - gameStartTimeRef.current) / 1000;
      
      // Progressive multiplier - starts VERY slow then accelerates
      let progressiveMultiplier;
      if (elapsed < 2) {
        // Very slow start for first 2 seconds
        progressiveMultiplier = 1.0 + (elapsed * 0.05);
      } else if (elapsed < 5) {
        // Gradual acceleration
        progressiveMultiplier = 1.1 + Math.pow(elapsed - 2, 1.3) * 0.15;
      } else {
        // Faster acceleration after 5 seconds
        progressiveMultiplier = 1.5 + Math.pow(elapsed - 5, 1.6) * 0.25;
      }
      
      // Plane position - moves right and up
      const startX = 80;
      const startY = canvas.height - 80;
      const endX = canvas.width - 100;
      const endY = 50;
      
      // Non-linear movement that matches multiplier growth
      const progress = Math.min(elapsed / 30, 1); // 30 seconds to reach top
      const easedProgress = 1 - Math.pow(1 - progress, 2.5); // Smooth acceleration
      
      const planeX = startX + (endX - startX) * easedProgress;
      const planeY = startY - (startY - endY) * easedProgress;
      
      // Add to trail with more frequent points
      const now = Date.now();
      if (trailPointsRef.current.length === 0 || 
          now - trailPointsRef.current[trailPointsRef.current.length - 1].time > 15) {
        trailPointsRef.current.push({ x: planeX, y: planeY, time: now });
        
        // Keep trail limited to last 150 points for longer trail
        if (trailPointsRef.current.length > 150) {
          trailPointsRef.current.shift();
        }
      }
      
      // Draw trail that grows from bottom
      if (trailPointsRef.current.length > 1) {
        // Get starting position (fixed at bottom)
        const startX = 80;
        const startY = canvas.height - 80;
        
        // Create gradient for trail
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Draw the trail from start position to current plane position
        const trailGradient = ctx.createLinearGradient(startX, startY, planeX, planeY);
        trailGradient.addColorStop(0, 'rgba(255, 100, 50, 0.9)');
        trailGradient.addColorStop(0.5, 'rgba(255, 150, 100, 0.7)');
        trailGradient.addColorStop(1, 'rgba(255, 200, 150, 0.5)');
        
        // Draw main trail with growing thickness
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        
        // Create smooth curve to plane position
        const midX = startX + (planeX - startX) * 0.3;
        const midY = startY + (planeY - startY) * 0.7;
        
        ctx.quadraticCurveTo(midX, startY, midX, midY);
        ctx.quadraticCurveTo(midX, planeY, planeX, planeY);
        
        ctx.strokeStyle = trailGradient;
        ctx.lineWidth = 12;
        ctx.stroke();
        
        // Add glow effect
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ff6600';
        ctx.strokeStyle = 'rgba(255, 100, 50, 0.3)';
        ctx.lineWidth = 20;
        ctx.stroke();
        
        ctx.shadowBlur = 0;
        
        // Add glow effect to trail
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ff1493';
        ctx.strokeStyle = 'rgba(255, 20, 147, 0.3)';
        ctx.lineWidth = 15;
        
        ctx.beginPath();
        ctx.moveTo(trailPointsRef.current[0].x, trailPointsRef.current[0].y);
        for (let i = 1; i < trailPointsRef.current.length; i++) {
          const point = trailPointsRef.current[i];
          const prevPoint = trailPointsRef.current[i - 1];
          const cpx = (prevPoint.x + point.x) / 2;
          const cpy = (prevPoint.y + point.y) / 2;
          ctx.quadraticCurveTo(prevPoint.x, prevPoint.y, cpx, cpy);
        }
        ctx.stroke();
        
        // Reset shadow
        ctx.shadowBlur = 0;
      }
      
      // Draw rocket with image
      ctx.save();
      ctx.translate(planeX, planeY);
      
      // Calculate rotation based on movement direction
      let rotation;
      if (trailPointsRef.current.length >= 2) {
        const lastPoint = trailPointsRef.current[trailPointsRef.current.length - 1];
        const prevPoint = trailPointsRef.current[trailPointsRef.current.length - 2];
        const dx = lastPoint.x - prevPoint.x;
        const dy = lastPoint.y - prevPoint.y;
        rotation = Math.atan2(dy, dx) + Math.PI / 2; // Adjust rotation for vertical rocket
      } else {
        rotation = Math.PI / 3; // Default angle (60 degrees)
      }
      ctx.rotate(rotation);
      
      // Draw rocket image if loaded, otherwise draw fallback
      if (rocketLoaded && rocketImageRef.current) {
        // Preserve aspect ratio
        const imgAspectRatio = rocketImageRef.current.width / rocketImageRef.current.height;
        const rocketHeight = 60;
        const rocketWidth = rocketHeight * imgAspectRatio;
        
        // Add flying animation (small oscillation)
        rocketAnimationRef.current += 0.1;
        const wobble = Math.sin(rocketAnimationRef.current) * 2;
        
        // Add subtle glow effect
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ff6600';
        
        // Save and apply wobble
        ctx.save();
        ctx.translate(0, wobble);
        
        // Draw the rocket image centered with proper aspect ratio
        ctx.drawImage(
          rocketImageRef.current,
          -rocketWidth / 2,
          -rocketHeight / 2,
          rocketWidth,
          rocketHeight
        );
        
        ctx.restore();
        
        // Reset shadow
        ctx.shadowBlur = 0;
      } else {
        // Fallback: simple rocket shape if image not loaded
        ctx.fillStyle = '#ff6600';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ff6600';
        
        // Simple rocket body
        ctx.beginPath();
        ctx.moveTo(0, -25);
        ctx.lineTo(10, 10);
        ctx.lineTo(5, 25);
        ctx.lineTo(-5, 25);
        ctx.lineTo(-10, 10);
        ctx.closePath();
        ctx.fill();
      }
      
      ctx.restore();
      
      // Draw multiplier fixed in center
      ctx.save();
      
      // Fixed position in center of screen
      const multX = canvas.width / 2;
      const multY = canvas.height / 2;
      
      // Background for multiplier
      const multText = `${progressiveMultiplier.toFixed(2)}x`;
      ctx.font = 'bold 56px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const metrics = ctx.measureText(multText);
      
      // Draw background box
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(multX - metrics.width / 2 - 20, multY - 35, metrics.width + 40, 70, 15);
      ctx.fill();
      ctx.stroke();
      
      // Draw multiplier text
      ctx.fillStyle = '#00ff88';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#00ff88';
      ctx.fillText(multText, multX, multY);
      
      ctx.restore();
      
    } else if (gameStatus.state === 'crashed') {
      // Draw explosion effect at last plane position
      if (trailPointsRef.current.length > 0) {
        const lastPoint = trailPointsRef.current[trailPointsRef.current.length - 1];
        
        // Explosion effect
        ctx.save();
        ctx.translate(lastPoint.x, lastPoint.y);
        
        // Draw explosion circles
        for (let i = 0; i < 3; i++) {
          ctx.strokeStyle = `rgba(255, 0, 0, ${0.6 - i * 0.2})`;
          ctx.lineWidth = 3 - i;
          ctx.beginPath();
          ctx.arc(0, 0, 20 + i * 15, 0, Math.PI * 2);
          ctx.stroke();
        }
        
        ctx.restore();
      }
      
      // Draw crashed text with style
      ctx.save();
      ctx.font = 'bold 56px Arial';
      ctx.textAlign = 'center';
      
      // Text shadow
      ctx.shadowBlur = 20;
      ctx.shadowColor = 'rgba(255, 0, 0, 0.8)';
      
      // Crashed text
      ctx.fillStyle = '#ff0000';
      ctx.fillText('CRASHED', canvas.width / 2, canvas.height / 2);
      
      // Multiplier text
      ctx.font = 'bold 36px Arial';
      ctx.fillStyle = 'white';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.fillText(`@ ${gameStatus.multiplier.toFixed(2)}x`, canvas.width / 2, canvas.height / 2 + 50);
      
      ctx.restore();
    } else {
      // Clear trail when waiting
      trailPointsRef.current = [];
    }
  }, [gameStatus, canvasSize]);
  
  // Animation loop
  useEffect(() => {
    const animate = () => {
      drawGame();
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [drawGame]);
  
  // Track game start time
  useEffect(() => {
    if (gameStatus.state === 'playing' && gameStartTimeRef.current === 0) {
      gameStartTimeRef.current = Date.now();
      trailPointsRef.current = []; // Clear trail on new round
    } else if (gameStatus.state !== 'playing') {
      gameStartTimeRef.current = 0;
    }
  }, [gameStatus.state]);
  
  // Polling for game status
  useEffect(() => {
    const pollStatus = async () => {
      try {
        const response = await fetch('/api/games/mania-fly/status');
        const data = await response.json();
        setGameStatus(data);
        
        // Auto cashout logic
        if (data.state === 'playing' && data.multiplier > 0) {
          if (bet1.status === 'placed' && autoCashout1 && parseFloat(autoCashout1) <= data.multiplier) {
            handleCashOut(1);
          }
          if (bet2.status === 'placed' && autoCashout2 && parseFloat(autoCashout2) <= data.multiplier) {
            handleCashOut(2);
          }
        }
        
        // Reset bets when round changes
        if (data.state === 'waiting' && (bet1.roundId !== data.roundId || bet2.roundId !== data.roundId)) {
          if (bet1.status === 'placed' && bet1.roundId !== data.roundId) {
            setBet1(prev => ({ ...prev, status: 'lost' }));
          }
          if (bet2.status === 'placed' && bet2.roundId !== data.roundId) {
            setBet2(prev => ({ ...prev, status: 'lost' }));
          }
        }
        
        // Reset to idle when new round starts
        if (data.state === 'waiting' && gameStatus.state === 'crashed') {
          setBet1(prev => ({ ...prev, status: 'idle', roundId: undefined }));
          setBet2(prev => ({ ...prev, status: 'idle', roundId: undefined }));
        }
      } catch (error) {
        console.error('Error polling status:', error);
      }
    };
    
    // Poll every 100ms for smooth updates
    const interval = setInterval(pollStatus, 100);
    pollStatus(); // Initial poll
    
    return () => clearInterval(interval);
  }, [bet1, bet2, autoCashout1, autoCashout2, gameStatus.state]);
  
  // Query user balance
  const { data: userWallet } = useQuery<{
    balance: string;
    scratchBonus: number;
  }>({
    queryKey: ['/api/user/balance'],
  });

  const balance = parseFloat(userWallet?.balance || "0");

  // Place bet mutation
  const placeBetMutation = useMutation({
    mutationFn: async (data: { betNumber: 1 | 2; amount: number }) => {
      return apiRequest('/api/games/mania-fly/bet', 'POST', { 
        amount: data.amount
      });
    },
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/balance'] });
      
      if (variables.betNumber === 1) {
        setBet1({
          amount: variables.amount,
          roundId: response.roundId,
          status: 'placed'
        });
      } else {
        setBet2({
          amount: variables.amount,
          roundId: response.roundId,
          status: 'placed'
        });
      }
      
      toast({
        title: "✅ Aposta realizada!",
        description: `Aposta de ${formatMoney(variables.amount)} confirmada`,
        className: "bg-green-900/90 border-green-500"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao fazer aposta",
        description: error.message || "Tente novamente",
        variant: "destructive"
      });
    }
  });

  // Cash out mutation - SECURE VERSION  
  const cashOutMutation = useMutation({
    mutationFn: async (data: { betNumber: 1 | 2; roundId: string }) => {
      return apiRequest('/api/games/mania-fly/cashout', 'POST', { 
        roundId: data.roundId
      });
    },
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/balance'] });
      
      if (variables.betNumber === 1) {
        setBet1(prev => ({
          ...prev,
          status: 'won',
          winMultiplier: response.multiplier,
          profit: response.profit
        }));
      } else {
        setBet2(prev => ({
          ...prev,
          status: 'won',
          winMultiplier: response.multiplier,
          profit: response.profit
        }));
      }
      
      toast({
        title: "💰 Sacou com sucesso!",
        description: `Multiplicador ${response.multiplier.toFixed(2)}x • Ganhou ${formatMoney(response.profit)}`,
        className: "bg-green-900/90 border-green-500"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao sacar",
        description: error.message || "Tente novamente",
        variant: "destructive"
      });
    }
  });

  const handlePlaceBet = (betNumber: 1 | 2) => {
    const amount = betNumber === 1 ? parseFloat(bet1Input) : parseFloat(bet2Input);
    
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Valor inválido",
        description: "Digite um valor válido para apostar",
        variant: "destructive"
      });
      return;
    }
    
    if (amount > balance) {
      toast({
        title: "Saldo insuficiente",
        description: "Você não tem saldo suficiente para esta aposta",
        variant: "destructive"
      });
      return;
    }
    
    if (gameStatus.state !== 'waiting') {
      toast({
        title: "Aguarde o próximo round",
        description: "Você só pode apostar antes do avião decolar",
        variant: "destructive"
      });
      return;
    }
    
    placeBetMutation.mutate({ betNumber, amount });
  };

  const handleCashOut = (betNumber: 1 | 2) => {
    const bet = betNumber === 1 ? bet1 : bet2;
    
    if (bet.status === 'placed' && bet.roundId && gameStatus.state === 'playing') {
      cashOutMutation.mutate({ betNumber, roundId: bet.roundId });
    }
  };

  return (
    <MobileLayout 
      title="Mania Fly"
      showBackButton
      onBackClick={() => setLocation("/")}
    >
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        {/* Header */}
        <div className="bg-gradient-to-b from-[#111111] to-transparent p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation("/")}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Plane className="w-6 h-6 text-[#00E880]" />
              <span className="bg-gradient-to-r from-[#00E880] to-[#00FFB3] bg-clip-text text-transparent">
                MANIA FLY
              </span>
            </h1>
          </div>
        </div>

        {/* Multiplier History */}
        <div className="px-4 py-2">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <History className="w-4 h-4 text-gray-500 flex-shrink-0" />
            {gameStatus.history.map((item, index) => (
              <div
                key={index}
                className={cn(
                  "px-3 py-1 rounded-lg font-mono text-sm font-bold flex-shrink-0",
                  item < 1.5 ? "bg-red-900/50 text-red-400" :
                  item < 3 ? "bg-yellow-900/50 text-yellow-400" :
                  item < 10 ? "bg-green-900/50 text-green-400" :
                  "bg-purple-900/50 text-purple-400"
                )}
                data-testid={`history-${index}`}
              >
                {(item || 0).toFixed(2)}x
              </div>
            ))}
          </div>
        </div>

        {/* Game Display Area - Canvas Based */}
        <div className="relative h-[400px] mx-4 rounded-xl overflow-hidden border border-[#00E880]/20">
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            className="w-full h-full"
            style={{ display: 'block' }}
          />
          
          {/* Overlay for waiting state */}
          {gameStatus.state === 'waiting' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="text-center bg-black/60 p-8 rounded-2xl border border-[#00E880]/30">
                <Clock className="w-20 h-20 text-[#00E880] mx-auto mb-4 animate-pulse" />
                <div className="text-6xl font-bold text-white mb-2 tabular-nums">
                  {gameStatus.countdown}s
                </div>
                <div className="text-gray-300 text-lg">
                  Próximo voo começando...
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Betting Controls */}
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bet Panel 1 */}
            <div className="bg-[#111111] rounded-xl p-4 border border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-gray-400">APOSTA 1</span>
                {bet1.status === 'placed' && (
                  <span className="text-xs px-2 py-1 bg-blue-900/50 text-blue-400 rounded">
                    ATIVA
                  </span>
                )}
                {bet1.status === 'won' && (
                  <span className="text-xs px-2 py-1 bg-green-900/50 text-green-400 rounded">
                    GANHOU {bet1.winMultiplier?.toFixed(2)}x
                  </span>
                )}
                {bet1.status === 'lost' && (
                  <span className="text-xs px-2 py-1 bg-red-900/50 text-red-400 rounded">
                    PERDEU
                  </span>
                )}
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Valor da Aposta</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={bet1Input}
                      onChange={(e) => setBet1Input(e.target.value)}
                      className="flex-1 bg-black/50 border-gray-700 text-white"
                      placeholder="0.00"
                      min="1"
                      step="0.5"
                      disabled={bet1.status === 'placed'}
                      data-testid="input-bet1-amount"
                    />
                    <div className="flex gap-1">
                      {[1, 5, 10].map(val => (
                        <button
                          key={val}
                          onClick={() => setBet1Input(val.toString())}
                          className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded transition-colors"
                          disabled={bet1.status === 'placed'}
                          data-testid={`button-bet1-quick-${val}`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Auto Sacar em</label>
                  <Input
                    type="number"
                    value={autoCashout1}
                    onChange={(e) => setAutoCashout1(e.target.value)}
                    className="bg-black/50 border-gray-700 text-white"
                    placeholder="Desativado"
                    min="1.01"
                    step="0.1"
                    disabled={bet1.status === 'placed'}
                    data-testid="input-bet1-auto"
                  />
                </div>
                
                {bet1.status === 'placed' && gameStatus.state === 'playing' ? (
                  <Button
                    onClick={() => handleCashOut(1)}
                    className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-bold py-3"
                    data-testid="button-bet1-cashout"
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    SACAR {formatMoney(bet1.amount * gameStatus.multiplier)}
                  </Button>
                ) : (
                  <Button
                    onClick={() => handlePlaceBet(1)}
                    className="w-full bg-gradient-to-r from-[#00E880] to-[#00FFB3] hover:from-[#00D070] hover:to-[#00EEA0] text-black font-bold py-3"
                    disabled={gameStatus.state !== 'waiting' || placeBetMutation.isPending}
                    data-testid="button-bet1-place"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    APOSTAR {formatMoney(parseFloat(bet1Input) || 0)}
                  </Button>
                )}
              </div>
            </div>

            {/* Bet Panel 2 */}
            <div className="bg-[#111111] rounded-xl p-4 border border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-gray-400">APOSTA 2</span>
                {bet2.status === 'placed' && (
                  <span className="text-xs px-2 py-1 bg-blue-900/50 text-blue-400 rounded">
                    ATIVA
                  </span>
                )}
                {bet2.status === 'won' && (
                  <span className="text-xs px-2 py-1 bg-green-900/50 text-green-400 rounded">
                    GANHOU {bet2.winMultiplier?.toFixed(2)}x
                  </span>
                )}
                {bet2.status === 'lost' && (
                  <span className="text-xs px-2 py-1 bg-red-900/50 text-red-400 rounded">
                    PERDEU
                  </span>
                )}
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Valor da Aposta</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={bet2Input}
                      onChange={(e) => setBet2Input(e.target.value)}
                      className="flex-1 bg-black/50 border-gray-700 text-white"
                      placeholder="0.00"
                      min="1"
                      step="0.5"
                      disabled={bet2.status === 'placed'}
                      data-testid="input-bet2-amount"
                    />
                    <div className="flex gap-1">
                      {[1, 5, 10].map(val => (
                        <button
                          key={val}
                          onClick={() => setBet2Input(val.toString())}
                          className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded transition-colors"
                          disabled={bet2.status === 'placed'}
                          data-testid={`button-bet2-quick-${val}`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Auto Sacar em</label>
                  <Input
                    type="number"
                    value={autoCashout2}
                    onChange={(e) => setAutoCashout2(e.target.value)}
                    className="bg-black/50 border-gray-700 text-white"
                    placeholder="Desativado"
                    min="1.01"
                    step="0.1"
                    disabled={bet2.status === 'placed'}
                    data-testid="input-bet2-auto"
                  />
                </div>
                
                {bet2.status === 'placed' && gameStatus.state === 'playing' ? (
                  <Button
                    onClick={() => handleCashOut(2)}
                    className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-bold py-3"
                    data-testid="button-bet2-cashout"
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    SACAR {formatMoney(bet2.amount * gameStatus.multiplier)}
                  </Button>
                ) : (
                  <Button
                    onClick={() => handlePlaceBet(2)}
                    className="w-full bg-gradient-to-r from-[#00E880] to-[#00FFB3] hover:from-[#00D070] hover:to-[#00EEA0] text-black font-bold py-3"
                    disabled={gameStatus.state !== 'waiting' || placeBetMutation.isPending}
                    data-testid="button-bet2-place"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    APOSTAR {formatMoney(parseFloat(bet2Input) || 0)}
                  </Button>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </MobileLayout>
  );
}