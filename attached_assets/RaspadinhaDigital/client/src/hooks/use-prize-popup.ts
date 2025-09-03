import { useState, useCallback } from "react";

interface PrizePopupState {
  isOpen: boolean;
  title: string;
  description: string;
  prize?: string;
  prizeType?: "money" | "product" | "freeplay";
  icon?: string;
  color?: string;
  autoClose?: boolean;
  duration?: number;
}

export function usePrizePopup() {
  const [popup, setPopup] = useState<PrizePopupState>({
    isOpen: false,
    title: "",
    description: "",
  });

  const showPrizePopup = useCallback((options: Omit<PrizePopupState, 'isOpen'>) => {
    setPopup({
      ...options,
      isOpen: true,
      autoClose: options.autoClose ?? true,
      duration: options.duration ?? 3000,
    });
  }, []);

  const closePrizePopup = useCallback(() => {
    setPopup(prev => ({ ...prev, isOpen: false }));
  }, []);

  const showMoneyWin = useCallback((amount: number, description?: string) => {
    showPrizePopup({
      title: "Parabéns!",
      description: description || "Prêmio adicionado ao seu saldo!",
      prize: `R$ ${amount.toFixed(2)}`,
      prizeType: "money",
      icon: "💰",
      color: "#00E880",
    });
  }, [showPrizePopup]);

  const showProductWin = useCallback((productName: string, value?: string, description?: string) => {
    showPrizePopup({
      title: "Parabéns!",
      description: description || "Você ganhou um prêmio incrível!",
      prize: productName,
      prizeType: "product",
      icon: "🎁",
      color: "#8B5CF6",
    });
  }, [showPrizePopup]);

  const showFreePlayWin = useCallback((amount: number, gameType: string, description?: string) => {
    showPrizePopup({
      title: "Parabéns!",
      description: description || `Você ganhou ${amount} ${gameType} grátis!`,
      prize: `${amount} Jogadas`,
      prizeType: "freeplay",
      icon: "🎮",
      color: "#3B82F6",
    });
  }, [showPrizePopup]);

  return {
    popup,
    showPrizePopup,
    closePrizePopup,
    showMoneyWin,
    showProductWin,
    showFreePlayWin,
  };
}