// Global balance change tracker
interface BalanceChange {
  amount: number;
  isBonus: boolean;
}

interface QueuedChange {
  type: 'balance' | 'bonus';
  change: BalanceChange | number;
}

let balanceChangeCallback: ((change: BalanceChange | null) => void) | null = null;
let bonusChangeCallback: ((change: number | null) => void) | null = null;
let lastProcessedBalance: string | null = null;
let lastProcessedBonus: number | null = null;
let isProcessingLocalChange = false;
let processTimeout: NodeJS.Timeout | null = null;
let lastChangeTimestamp = 0;
const MIN_CHANGE_INTERVAL = 500; // Minimum 500ms between changes

// Queue system
let changeQueue: QueuedChange[] = [];
let isProcessingQueue = false;
let queueTimeout: NodeJS.Timeout | null = null;

// Process queue function
const processQueue = () => {
  if (isProcessingQueue || changeQueue.length === 0) {
    return;
  }
  
  // Check if enough time has passed since last change
  const now = Date.now();
  const timeSinceLastChange = now - lastChangeTimestamp;
  
  if (timeSinceLastChange < MIN_CHANGE_INTERVAL) {
    // Wait a bit more before processing
    setTimeout(() => processQueue(), MIN_CHANGE_INTERVAL - timeSinceLastChange);
    return;
  }
  
  isProcessingQueue = true;
  lastChangeTimestamp = now;
  const nextChange = changeQueue.shift();
  
  if (nextChange) {
    if (nextChange.type === 'balance' && balanceChangeCallback) {
      balanceChangeCallback(nextChange.change as BalanceChange);
    } else if (nextChange.type === 'bonus' && bonusChangeCallback) {
      bonusChangeCallback(nextChange.change as number);
    }
    
    // Wait for animation to complete before processing next
    queueTimeout = setTimeout(() => {
      isProcessingQueue = false;
      processQueue(); // Process next item in queue
    }, 3200); // 3 seconds animation + 200ms buffer
  } else {
    isProcessingQueue = false;
  }
};

export const balanceTracker = {
  setBalanceChangeCallback: (callback: (change: BalanceChange | null) => void) => {
    balanceChangeCallback = callback;
  },
  
  setBonusChangeCallback: (callback: (change: number | null) => void) => {
    bonusChangeCallback = callback;
  },
  
  setLocalChangeProcessing: (isProcessing: boolean) => {
    isProcessingLocalChange = isProcessing;
  },
  
  // Add local change directly to queue for proper ordering
  addLocalBalanceChange: (amount: number) => {
    changeQueue.push({
      type: 'balance',
      change: { amount, isBonus: false }
    });
    processQueue();
  },
  
  addLocalBonusChange: (amount: number) => {
    changeQueue.push({
      type: 'bonus',
      change: amount
    });
    processQueue();
  },
  
  trackBalanceChange: (previousBalance: number, newBalance: number, balanceString: string) => {
    // Skip if processing local change
    if (isProcessingLocalChange) {
      return;
    }
    
    // Prevent duplicate processing
    if (lastProcessedBalance === balanceString) {
      return;
    }
    
    const change = newBalance - previousBalance;
    if (change !== 0) {
      lastProcessedBalance = balanceString;
      
      // Add to queue instead of immediate processing
      changeQueue.push({
        type: 'balance',
        change: { amount: change, isBonus: false }
      });
      
      // Start processing queue if not already running
      processQueue();
    }
  },
  
  trackBonusChange: (previousBonus: number, newBonus: number) => {
    // Skip if processing local change
    if (isProcessingLocalChange) {
      return;
    }
    
    // Prevent duplicate processing
    if (lastProcessedBonus === newBonus) {
      return;
    }
    
    const change = newBonus - previousBonus;
    if (change !== 0) {
      lastProcessedBonus = newBonus;
      
      // Add to queue
      changeQueue.push({
        type: 'bonus',
        change: change
      });
      
      // Start processing queue if not already running
      processQueue();
    }
  },
  
  clearCallbacks: () => {
    balanceChangeCallback = null;
    bonusChangeCallback = null;
    lastProcessedBalance = null;
    lastProcessedBonus = null;
    isProcessingLocalChange = false;
    changeQueue = [];
    isProcessingQueue = false;
    
    if (processTimeout) {
      clearTimeout(processTimeout);
      processTimeout = null;
    }
    
    if (queueTimeout) {
      clearTimeout(queueTimeout);
      queueTimeout = null;
    }
  }
};