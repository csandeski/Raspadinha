import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useLocation } from 'wouter';
import { usePrizePopup } from '@/hooks/use-prize-popup';

interface WelcomeSpinWheelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WelcomeSpinWheel({ isOpen, onClose }: WelcomeSpinWheelProps) {
  const [, setLocation] = useLocation();
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [showWin, setShowWin] = useState(false);
  const [wonAmount, setWonAmount] = useState(2);
  const [hasSpun, setHasSpun] = useState(() => {
    return localStorage.getItem('welcomeBonusUsed') === 'true';
  });
  const { showFreePlayWin } = usePrizePopup();

  const segments = [
    { value: 1, color: '#22c55e', label: 'R$ 1', darkColor: '#16a34a', glowColor: 'rgba(34, 197, 94, 0.4)' },
    { value: 2, color: '#3b82f6', label: 'R$ 2', darkColor: '#2563eb', glowColor: 'rgba(59, 130, 246, 0.4)' },
    { value: 5, color: '#a855f7', label: 'R$ 5', darkColor: '#9333ea', glowColor: 'rgba(168, 85, 247, 0.4)' },
    { value: 20, color: '#f43f5e', label: 'R$ 20', darkColor: '#e11d48', glowColor: 'rgba(244, 63, 94, 0.4)' },
    { value: 100, color: '#f59e0b', label: 'R$ 100', darkColor: '#d97706', glowColor: 'rgba(245, 158, 11, 0.4)' },
  ];

  const handleSpin = async () => {
    if (hasSpun || isSpinning) return;
    
    setIsSpinning(true);
    setShowWin(false);
    

    
    try {
      // Pre-defined result - always give R$2 (which is index 1)
      const wonValue = 2;
      setWonAmount(wonValue);
      
      // Calculate target position for bottom pointer
      const segmentIndex = 1; // R$2 is at index 1
      const segmentAngle = 360 / segments.length;
      
      // Calculate the current angle of the winning segment's center
      const segmentStartAngle = -90 + (segmentIndex * segmentAngle);
      const segmentCenterAngle = segmentStartAngle + (segmentAngle / 2);
      
      // To align this segment with the pointer at 90 degrees, we need to rotate by:
      let targetRotation = 90 - segmentCenterAngle;
      
      // Normalize to positive angle
      if (targetRotation < 0) targetRotation += 360;
      
      // Add random offset within segment bounds for variety (-20 to +20 degrees)
      const randomOffset = (Math.random() - 0.5) * 40;
      targetRotation += randomOffset;
      
      // Add multiple spins
      const spins = Math.floor(8 + Math.random() * 4);
      const totalRotation = (spins * 360) + targetRotation;
      
      setRotation(totalRotation);
      
      // Wait for animation to complete
      await new Promise(resolve => setTimeout(resolve, 4500));
      
      // Show win animation
      setShowWin(true);
      setHasSpun(true);
      localStorage.setItem('welcomeBonusUsed', 'true');
      localStorage.setItem('freePlaysAvailable', '2');
      localStorage.setItem('freePlaysGame', 'premio-pix');
      
      // Show prize popup
      showFreePlayWin(2, "Mania Bônus", "Você ganhou 2 Mania Bônus!");
      
    } catch (error: any) {
    } finally {
      setIsSpinning(false);
    }
  };

  const handlePlayNow = () => {
    // Redirect to PIX raspadinha game with free plays
    setLocation('/game/premio-pix?freePlays=2&welcome=true');
    onClose();
  };

  // Prevent event propagation for close button
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Set localStorage to prevent the wheel from appearing again
    localStorage.setItem('welcomeBonusUsed', 'true');
    localStorage.setItem('welcomeWheelClosed', 'true');
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
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button - more prominent */}
          <button
            onClick={handleClose}
            className="absolute -top-2 -right-2 text-white hover:text-gray-300 transition-colors z-50 bg-gray-900 hover:bg-gray-800 rounded-full p-2 shadow-lg border border-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
          
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">
              {hasSpun ? "Bônus de Boas-vindas" : "Bem-vindo!"}
            </h2>
            <p className="text-white/90 drop-shadow-md">
              {hasSpun ? "Você já utilizou seu bônus de boas-vindas!" : "Gire a roleta e ganhe Mania Bônus!"}
            </p>
          </div>

          {/* Wheel - only show if not already spun */}
          {!hasSpun && (
            <div className="relative mx-auto mb-6" style={{ width: '300px', height: '300px' }}>
              {/* Beautiful outer decorative ring */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 p-2">
                <div className="w-full h-full rounded-full bg-gray-900 relative">
                  {/* Inner gradient shadow */}
                  <div className="absolute inset-2 rounded-full bg-gradient-to-b from-gray-800 via-gray-900 to-black shadow-2xl"></div>
                  
                  {/* Beautiful LED lights around the wheel */}
                  {[...Array(16)].map((_, i) => {
                    const angle = (i * 22.5 * Math.PI) / 180;
                    const x = 150 + 135 * Math.cos(angle);
                    const y = 150 + 135 * Math.sin(angle);
                    const colors = ['#fbbf24', '#f59e0b', '#ec4899', '#a855f7', '#3b82f6'];
                    const color = colors[i % colors.length];
                    return (
                      <div
                        key={i}
                        className={`absolute w-4 h-4 rounded-full transition-all duration-300`}
                        style={{
                          left: `${x - 8}px`,
                          top: `${y - 8}px`,
                          background: `radial-gradient(circle, ${color} 0%, ${color}88 50%, transparent 100%)`,
                          boxShadow: isSpinning 
                            ? `0 0 30px ${color}, 0 0 50px ${color}aa, 0 0 70px ${color}66`
                            : `0 0 15px ${color}, 0 0 25px ${color}66`,
                          transform: isSpinning ? 'scale(1.2)' : 'scale(1)',
                        }}
                      />
                    );
                  })}
                </div>
              </div>
              
              {/* Wheel container */}
              <div className="absolute inset-4">
                <svg
                  viewBox="0 0 300 300"
                  className="w-full h-full filter drop-shadow-lg"
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    transition: isSpinning 
                      ? 'transform 4.5s cubic-bezier(0.23, 1, 0.320, 1)' 
                      : 'transform 0.3s ease-out',
                  }}
                >
                  {/* Define gradient fills */}
                  <defs>
                    {segments.map((segment, index) => (
                      <radialGradient key={`grad-${index}`} id={`gradient-${index}`} cx="50%" cy="50%" r="100%">
                        <stop offset="0%" stopColor={segment.color} stopOpacity="1" />
                        <stop offset="50%" stopColor={segment.color} stopOpacity="0.9" />
                        <stop offset="100%" stopColor={segment.darkColor} stopOpacity="1" />
                      </radialGradient>
                    ))}
                    
                    {/* Premium metallic effect */}
                    <filter id="metallic">
                      <feGaussianBlur stdDeviation="0.5" />
                      <feComposite operator="over" />
                    </filter>
                    
                    {/* Inner shadow for depth */}
                    <filter id="innerShadow">
                      <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
                      <feOffset dx="0" dy="2" result="offsetblur"/>
                      <feFlood floodColor="#000000" floodOpacity="0.5"/>
                      <feComposite in2="offsetblur" operator="in"/>
                      <feMerge>
                        <feMergeNode/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                    
                    {/* Golden border gradient */}
                    <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#fbbf24" />
                      <stop offset="50%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#dc2626" />
                    </linearGradient>
                    
                    {/* Center button gradient */}
                    <radialGradient id="center-gradient">
                      <stop offset="0%" stopColor="#fbbf24" />
                      <stop offset="50%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#d97706" />
                    </radialGradient>
                    
                    {/* Center shadow filter */}
                    <filter id="center-shadow">
                      <feDropShadow dx="0" dy="0" stdDeviation="3" floodOpacity="0.5"/>
                    </filter>
                  </defs>
                  
                  {segments.map((segment, index) => {
                    const angle = 360 / segments.length;
                    const startAngle = index * angle - 90;
                    const endAngle = startAngle + angle;
                    const startAngleRad = (startAngle * Math.PI) / 180;
                    const endAngleRad = (endAngle * Math.PI) / 180;
                    
                    const x1 = 150 + 130 * Math.cos(startAngleRad);
                    const y1 = 150 + 130 * Math.sin(startAngleRad);
                    const x2 = 150 + 130 * Math.cos(endAngleRad);
                    const y2 = 150 + 130 * Math.sin(endAngleRad);
                    
                    const largeArcFlag = angle > 180 ? 1 : 0;
                    
                    const pathData = [
                      `M 150 150`,
                      `L ${x1} ${y1}`,
                      `A 130 130 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                      'Z'
                    ].join(' ');
                    
                    const textAngle = startAngle + angle / 2;
                    const textAngleRad = (textAngle * Math.PI) / 180;
                    const textX = 150 + 85 * Math.cos(textAngleRad);
                    const textY = 150 + 85 * Math.sin(textAngleRad);
                    
                    return (
                      <g key={index}>
                        <g>
                          {/* Main segment */}
                          <path
                            d={pathData}
                            fill={`url(#gradient-${index})`}
                            stroke="url(#goldGradient)"
                            strokeWidth="2"
                            filter="url(#innerShadow)"
                          />
                          {/* Highlight effect */}
                          <path
                            d={pathData}
                            fill="none"
                            stroke="rgba(255,255,255,0.2)"
                            strokeWidth="1"
                            transform="translate(-1, -1)"
                          />
                        </g>
                        <text
                          x={textX}
                          y={textY}
                          fill="white"
                          fontSize="26"
                          fontWeight="900"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          transform={`rotate(${textAngle + 90}, ${textX}, ${textY})`}
                          style={{
                            textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                            letterSpacing: '2px'
                          }}
                          filter="drop-shadow(0 2px 4px rgba(0,0,0,0.6))"
                        >
                          {segment.label}
                        </text>
                      </g>
                    );
                  })}
                  
                  {/* Luxurious center button */}
                  <g>
                    {/* Outer glow ring */}
                    <circle cx="150" cy="150" r="45" fill="none" stroke="url(#goldGradient)" strokeWidth="1" opacity="0.3" />
                    <circle cx="150" cy="150" r="42" fill="none" stroke="url(#goldGradient)" strokeWidth="2" opacity="0.5" />
                    
                    {/* Main center circle with premium gradient */}
                    <circle cx="150" cy="150" r="40" fill="url(#center-gradient)" stroke="url(#goldGradient)" strokeWidth="3" filter="url(#center-shadow)" />
                    
                    {/* Inner decorative rings */}
                    <circle cx="150" cy="150" r="35" fill="none" stroke="#fbbf24" strokeWidth="1" opacity="0.6" strokeDasharray="2 4" />
                    <circle cx="150" cy="150" r="30" fill="none" stroke="#f59e0b" strokeWidth="1" opacity="0.4" />
                    
                    {/* Center content - button */}
                    {!isSpinning ? (
                      <g 
                        onClick={handleSpin}
                        style={{ cursor: 'pointer' }}
                      >
                        <circle cx="150" cy="150" r="38" fill="#00E880" opacity="0.95" />
                        <circle cx="150" cy="150" r="38" fill="none" stroke="white" strokeWidth="2" opacity="0.3" />
                        <text x="150" y="156" fill="black" fontSize="18" fontWeight="900" textAnchor="middle" dominantBaseline="middle">
                          GIRAR
                        </text>
                      </g>
                    ) : (
                      <g>
                        <circle cx="150" cy="150" r="25" fill="none" stroke="#00E880" strokeWidth="4" opacity="0.3" />
                        <circle cx="150" cy="150" r="25" fill="none" stroke="#00E880" strokeWidth="4" 
                          strokeDasharray="100 50" 
                          transform="rotate(0 150 150)"
                        >
                          <animateTransform
                            attributeName="transform"
                            type="rotate"
                            from="0 150 150"
                            to="360 150 150"
                            dur="1s"
                            repeatCount="indefinite"
                          />
                        </circle>
                      </g>
                    )}
                  </g>
                </svg>
              </div>
              
              {/* Beautiful modern pointer - at bottom */}
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-8 z-20">
                <div className="relative">
                  {/* Beautiful pointer arrow */}
                  <div className="relative">
                    {/* Glow effect */}
                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                      <div className="w-12 h-12 bg-gradient-to-b from-yellow-400 to-transparent rounded-full blur-xl opacity-80 animate-pulse"></div>
                    </div>
                    {/* Main arrow */}
                    <svg width="60" height="60" viewBox="0 0 60 60" className="relative -top-4">
                      <defs>
                        <linearGradient id="pointer-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#fbbf24" />
                          <stop offset="50%" stopColor="#f59e0b" />
                          <stop offset="100%" stopColor="#dc2626" />
                        </linearGradient>
                        <filter id="pointer-glow">
                          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                          <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                      </defs>
                      <path 
                        d="M 30 10 L 45 45 L 30 38 L 15 45 Z" 
                        fill="url(#pointer-gradient)" 
                        filter="url(#pointer-glow)"
                        stroke="#fff" 
                        strokeWidth="1"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Title below roulette */}
          {!hasSpun && (
            <h3 className="text-lg font-bold text-white mt-4 text-center">
              Roleta da Sorte Diária
            </h3>
          )}

          {/* Win animation overlay */}
          {(showWin || hasSpun) && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center mb-4"
            >
              <div className="bg-black/80 backdrop-blur-sm rounded-2xl p-6">
                <div className="text-center">
                  {showWin ? (
                    <>
                      <div className="text-3xl font-bold text-[#00E880] mb-2">
                        R$ {wonAmount}
                      </div>
                      <div className="text-white font-semibold">Você ganhou!</div>
                      <p className="text-sm text-gray-400 mt-2">
                        2 Mania Bônus!
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="text-xl font-bold text-white mb-1">
                        BÔNUS JÁ USADO
                      </div>
                      <div className="text-gray-300 text-sm">Volte em breve!</div>
                      <div className="text-[#00E880] font-bold text-lg mt-2">
                        Ganhou 2 Mania Bônus
                      </div>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Action Button */}
          <div className="flex justify-center">
            {showWin ? (
              <button
                onClick={handlePlayNow}
                className="bg-gradient-to-r from-[#00E880] to-[#00D470] hover:from-[#00D470] hover:to-[#00C060] text-black font-bold px-8 py-4 text-lg rounded-xl shadow-lg transform transition-all hover:scale-105"
              >
                Jogar Agora
              </button>
            ) : hasSpun ? (
              <button
                onClick={handleClose}
                className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-bold px-8 py-4 text-lg rounded-xl shadow-lg transform transition-all hover:scale-105"
              >
                Fechar
              </button>
            ) : null}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}