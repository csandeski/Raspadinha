import { useState, useEffect } from "react";
import { Users } from "lucide-react";

interface OnlineUsersCounterCompactProps {
  gameType: string;
  minUsers?: number;
  maxUsers?: number;
}

export function OnlineUsersCounterCompact({ 
  gameType, 
  minUsers = 220, 
  maxUsers = 1300 
}: OnlineUsersCounterCompactProps) {
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
    <div className="inline-flex items-center gap-1 text-xs bg-gradient-to-r from-gray-700/30 to-gray-800/30 px-2 py-1 rounded-lg">
      <Users className="w-3 h-3 text-gray-400" />
      <span className="text-gray-400">
        <span className="font-medium text-gray-300">{userCount}</span> online
      </span>
    </div>
  );
}