export interface GameEvent {
  id: string;
  name: string;
  game: string;
  bet: number;
  won?: boolean;
  prize?: number;
  time: string;
  level?: number;
  isReal: boolean;
}

type GameEventListener = (event: GameEvent) => void;

class GameEventsManager {
  private static instance: GameEventsManager;
  private listeners: GameEventListener[] = [];

  private constructor() {}

  static getInstance(): GameEventsManager {
    if (!GameEventsManager.instance) {
      GameEventsManager.instance = new GameEventsManager();
    }
    return GameEventsManager.instance;
  }

  addListener(listener: GameEventListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  emitGamePlay(event: Omit<GameEvent, 'id' | 'time'>) {
    const fullEvent: GameEvent = {
      ...event,
      id: Date.now().toString() + Math.random(),
      time: 'há 1 segundo',
    };
    this.listeners.forEach(listener => listener(fullEvent));
  }
}

export const gameEvents = GameEventsManager.getInstance();