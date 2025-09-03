import { useState, useEffect } from "react";
import { Users } from "lucide-react";

interface OnlineUsersCounterProps {
  gameType: string;
  minUsers?: number;
  maxUsers?: number;
}

export function OnlineUsersCounter({ 
  gameType, 
  minUsers = 230, 
  maxUsers = 1300 
}: OnlineUsersCounterProps) {
  const [userCount, setUserCount] = useState(0);

  useEffect(() => {
    // Generate initial count based on game type hash
    const hash = gameType.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const range = maxUsers - minUsers;
    const baseCount = minUsers + (hash % range);
    
    setUserCount(baseCount);

    // Update count smoothly every 3-7 seconds
    const interval = setInterval(() => {
      setUserCount(prev => {
        // Small random change (-5 to +5)
        const change = Math.floor(Math.random() * 11) - 5;
        const newCount = prev + change;
        
        // Keep within bounds
        if (newCount < minUsers) return minUsers;
        if (newCount > maxUsers) return maxUsers;
        
        return newCount;
      });
    }, Math.random() * 4000 + 3000); // 3-7 seconds

    return () => clearInterval(interval);
  }, [gameType, minUsers, maxUsers]);

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <Users className="w-3.5 h-3.5 text-white" />
      <span className="text-white/90 font-medium">
        {userCount} {gameType === 'esquilo' ? 'Jogando' : gameType.includes('bau') ? 'Abrindo' : 'Raspando'}
      </span>
    </div>
  );
}