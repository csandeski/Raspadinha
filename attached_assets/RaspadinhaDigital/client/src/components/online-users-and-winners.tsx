import { useState, useEffect } from "react";
import { Users } from "lucide-react";

interface OnlineUsersAndWinnersProps {
  gameType: string;
  minUsers?: number;
  maxUsers?: number;
}

export function OnlineUsersAndWinners({ 
  gameType, 
  minUsers = 220, 
  maxUsers = 1300 
}: OnlineUsersAndWinnersProps) {
  const [userCount, setUserCount] = useState(0);

  // Online users count logic
  useEffect(() => {
    const hash = gameType.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const range = maxUsers - minUsers;
    const baseCount = minUsers + (hash % range);
    
    setUserCount(baseCount);

    const interval = setInterval(() => {
      setUserCount(prev => {
        const change = Math.floor(Math.random() * 11) - 5;
        const newCount = prev + change;
        
        if (newCount < minUsers) return minUsers;
        if (newCount > maxUsers) return maxUsers;
        
        return newCount;
      });
    }, Math.random() * 4000 + 3000);

    return () => clearInterval(interval);
  }, [gameType, minUsers, maxUsers]);

  

  return (
    <>
      {/* Online Users Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs">
          <Users className="w-3.5 h-3.5 text-white" />
          <span className="text-gray-300">
            <span className="font-semibold text-white">{userCount}</span> usuários in-game agora
          </span>
        </div>
      </div>
    </>
  );
}