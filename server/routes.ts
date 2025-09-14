import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db, pool } from "./db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import fetch from "node-fetch";
import twilio from "twilio";
import { createPixPayment, getTransactionStatus, createCashout, handleLiraPayWebhook, getLiraPayBalance } from './services/lirapay';

// Extend Express session types
declare module 'express-session' {
  interface SessionData {
    isAdminAuthenticated?: boolean;
    adminUserId?: number;
    adminUsername?: string;
    clickId?: string;
    conversionRecorded?: boolean;
    affiliateId?: number;
    adminLastActivity?: number;
    affiliateToken?: string;
    affiliateUserId?: number;
  }
}

import {
  loginSchema,
  registerSchema,
  adminLoginSchema,
  insertGameSchema,
  insertDepositSchema,
  insertWithdrawalSchema,
  users,
  wallets,
  games,
  gamePremios,
  deposits,
  withdrawals,
  supportChats,
  supportMessages,
  referrals,
  referralEarnings,
  siteAccesses,
  smsVerificationCodes,
  affiliates,
  affiliateClicks,
  affiliateConversions,
  affiliatePayouts,
  affiliateCodes,
  affiliateTierConfig,
  paymentAuditLogs,
  paymentProviderConfig,
  affiliatesWallet,
  affiliatesWalletTransactions,
  affiliatesWithdrawals,
  marketingLinks,
  marketingClicks,
  marketingConversions,
  partners,
  partnerCodes,
  partnerClicks,
  partnerConversions,
  partnersWallet,
  partnersWalletTransactions,
  partnersWithdrawals,
  activeGameSessions,
} from "@shared/schema";
import { randomUUID } from "crypto";
import * as crypto from "crypto";
import { eq, desc, asc, sql, inArray, and, or, gte, count, not, lt, isNotNull } from "drizzle-orm";
import { cacheMiddleware, clearUserCache, clearAllCache } from "./cache-middleware";
import { trackAccess } from "./access-tracker";
import cookieParser from "cookie-parser";
import session from "express-session";
import rateLimit from "express-rate-limit";

// Security: Use a strong JWT secret from environment or fallback to a fixed secret
// IMPORTANT: In production, always use a secure JWT_SECRET environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'maniabrasil-jwt-secret-key-2025-secure-token-generation';
const JWT_EXPIRY = '24h'; // Tokens expire after 24 hours
const JWT_REFRESH_EXPIRY = '7d'; // Refresh tokens expire after 7 days
// LiraPay is now the only payment provider

// Function to perform weighted random selection based on probabilities
async function performWeightedPrizeSelection(gameType: string): Promise<string | null> {
  try {
    // Get probabilities from database
    const probabilities = await storage.getPrizeProbabilitiesByGame(gameType);
    
    if (!probabilities || probabilities.length === 0) {
      console.log(`No probabilities found for ${gameType}, using fallback`);
      return null; // Fallback to old logic
    }
    
    // Calculate cumulative weights
    const cumulativeWeights: number[] = [];
    let totalWeight = 0;
    
    for (const prob of probabilities) {
      totalWeight += parseFloat(prob.probability);
      cumulativeWeights.push(totalWeight);
    }
    
    // Generate random number between 0 and totalWeight
    const random = Math.random() * totalWeight;
    
    // Find which prize was selected
    for (let i = 0; i < cumulativeWeights.length; i++) {
      if (random < cumulativeWeights[i]) {
        console.log(`Prize selected: ${probabilities[i].prizeValue} with probability ${probabilities[i].probability}%`);
        return probabilities[i].prizeValue;
      }
    }
    
    // Fallback to last prize if nothing selected (shouldn't happen)
    return probabilities[probabilities.length - 1].prizeValue;
  } catch (error) {
    console.error(`Error selecting prize for ${gameType}:`, error);
    return null;
  }
}

// ==================== MANIA FLY GAME SYSTEM ====================
// Authoritative server-side game round manager for Mania Fly

interface ManiaFlyRound {
  roundId: string;
  startTime: number;
  crashPoint: number;
  state: 'waiting' | 'playing' | 'crashed';
  nextRoundTime?: number;
  bets: Map<number, { amount: number; cashedOut: boolean; cashoutMultiplier?: number }>;
}

class ManiaFlyManager {
  private currentRound: ManiaFlyRound | null = null;
  private roundHistory: number[] = [];
  private roundTimer: NodeJS.Timeout | null = null;
  private readonly ROUND_INTERVAL = 10000; // 10 seconds between rounds
  private readonly MULTIPLIER_SPEED = 0.05; // Multiplier increases by 0.05 per 100ms
  
  constructor() {
    this.startNewRound();
  }
  
  private generateCrashPoint(): number {
    // Generate crash point with house edge
    // 50% chance to crash before 2x
    // 25% chance to crash between 2x-5x  
    // 25% chance to crash above 5x
    const rand = Math.random();
    
    if (rand < 0.5) {
      // 50% chance: 1.00 - 2.00
      return 1.00 + Math.random();
    } else if (rand < 0.75) {
      // 25% chance: 2.00 - 5.00
      return 2.00 + Math.random() * 3;
    } else {
      // 25% chance: 5.00 - 20.00 (with exponential decay)
      return 5.00 + Math.random() * Math.random() * 15;
    }
  }
  
  private startNewRound() {
    // Clear any existing timer
    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
    }
    
    // Create new round
    const roundId = `round-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const crashPoint = this.generateCrashPoint();
    
    this.currentRound = {
      roundId,
      startTime: Date.now() + this.ROUND_INTERVAL, // Round starts after waiting period
      crashPoint,
      state: 'waiting',
      nextRoundTime: Date.now() + this.ROUND_INTERVAL,
      bets: new Map()
    };
    
    console.log(`[ManiaFly] New round ${roundId} - Crash at ${crashPoint.toFixed(2)}x`);
    
    // Start waiting phase (10 seconds)
    this.roundTimer = setTimeout(() => {
      this.startPlaying();
    }, this.ROUND_INTERVAL);
  }
  
  private startPlaying() {
    if (!this.currentRound) return;
    
    this.currentRound.state = 'playing';
    this.currentRound.startTime = Date.now();
    
    console.log(`[ManiaFly] Round ${this.currentRound.roundId} started playing`);
    
    // Check for crash every 100ms
    const checkCrash = () => {
      if (!this.currentRound || this.currentRound.state !== 'playing') return;
      
      const currentMultiplier = this.getCurrentMultiplier();
      
      if (currentMultiplier >= this.currentRound.crashPoint) {
        this.crashRound();
      } else {
        this.roundTimer = setTimeout(checkCrash, 100);
      }
    };
    
    checkCrash();
  }
  
  private crashRound() {
    if (!this.currentRound) return;
    
    this.currentRound.state = 'crashed';
    
    // Add to history (keep last 10)
    this.roundHistory.unshift(this.currentRound.crashPoint);
    if (this.roundHistory.length > 10) {
      this.roundHistory.pop();
    }
    
    console.log(`[ManiaFly] Round ${this.currentRound.roundId} crashed at ${this.currentRound.crashPoint.toFixed(2)}x`);
    
    // Process all active bets as losses
    for (const [userId, bet] of this.currentRound.bets) {
      if (!bet.cashedOut) {
        console.log(`[ManiaFly] User ${userId} lost ${bet.amount}`);
      }
    }
    
    // Start new round after 3 seconds to show crash
    this.roundTimer = setTimeout(() => {
      this.startNewRound();
    }, 3000);
  }
  
  getCurrentMultiplier(): number {
    if (!this.currentRound || this.currentRound.state !== 'playing') {
      return 0;
    }
    
    const elapsed = Date.now() - this.currentRound.startTime;
    const multiplier = 1.00 + (elapsed / 100) * this.MULTIPLIER_SPEED;
    
    return Math.min(multiplier, this.currentRound.crashPoint);
  }
  
  getStatus() {
    if (!this.currentRound) {
      return {
        roundId: null,
        state: 'waiting',
        multiplier: 0,
        history: this.roundHistory,
        countdown: 0
      };
    }
    
    let countdown = 0;
    if (this.currentRound.state === 'waiting') {
      countdown = Math.max(0, Math.ceil((this.currentRound.nextRoundTime! - Date.now()) / 1000));
    }
    
    return {
      roundId: this.currentRound.roundId,
      state: this.currentRound.state,
      multiplier: this.currentRound.state === 'playing' ? this.getCurrentMultiplier() : 
                  this.currentRound.state === 'crashed' ? this.currentRound.crashPoint : 0,
      history: this.roundHistory,
      countdown,
      activeBets: this.currentRound.bets.size
    };
  }
  
  placeBet(userId: number, amount: number): { success: boolean; message: string; roundId?: string } {
    if (!this.currentRound) {
      return { success: false, message: "Nenhum round ativo" };
    }
    
    if (this.currentRound.state !== 'waiting') {
      return { success: false, message: "Apostas só podem ser feitas antes do avião decolar" };
    }
    
    if (this.currentRound.bets.has(userId)) {
      return { success: false, message: "Você já apostou neste round" };
    }
    
    this.currentRound.bets.set(userId, {
      amount,
      cashedOut: false
    });
    
    console.log(`[ManiaFly] User ${userId} placed bet of ${amount} on round ${this.currentRound.roundId}`);
    
    return { 
      success: true, 
      message: "Aposta realizada com sucesso",
      roundId: this.currentRound.roundId 
    };
  }
  
  cashOut(userId: number, roundId: string): { success: boolean; message: string; multiplier?: number; profit?: number } {
    if (!this.currentRound || this.currentRound.roundId !== roundId) {
      return { success: false, message: "Round inválido" };
    }
    
    if (this.currentRound.state !== 'playing') {
      return { success: false, message: "Só é possível sacar durante o voo" };
    }
    
    const bet = this.currentRound.bets.get(userId);
    if (!bet) {
      return { success: false, message: "Você não tem aposta ativa neste round" };
    }
    
    if (bet.cashedOut) {
      return { success: false, message: "Você já sacou neste round" };
    }
    
    const multiplier = this.getCurrentMultiplier();
    const profit = bet.amount * multiplier;
    
    bet.cashedOut = true;
    bet.cashoutMultiplier = multiplier;
    
    console.log(`[ManiaFly] User ${userId} cashed out at ${multiplier.toFixed(2)}x for profit of ${profit.toFixed(2)}`);
    
    return {
      success: true,
      message: "Sacou com sucesso",
      multiplier,
      profit
    };
  }
  
  getUserBet(userId: number): { amount: number; cashedOut: boolean; cashoutMultiplier?: number } | null {
    if (!this.currentRound) return null;
    return this.currentRound.bets.get(userId) || null;
  }
}

// Initialize the game manager
const maniaFlyManager = new ManiaFlyManager();

// ==================== END MANIA FLY SYSTEM ====================

// Twilio configuration
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const twilioClient = TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) : null;

// Helper function to process affiliate wallet transaction
async function processAffiliateWalletTransaction(
  affiliateId: number,
  amount: number,
  depositId: number,
  status: string = 'pending',
  description?: string
) {
  try {
    console.log(`[WalletTransaction] Processing for affiliate ${affiliateId}, amount: R$${amount.toFixed(2)}, status: ${status}`);
    
    // Get or create wallet for affiliate
    let wallet = await db
      .select()
      .from(affiliatesWallet)
      .where(eq(affiliatesWallet.affiliateId, affiliateId))
      .limit(1);
    
    if (wallet.length === 0) {
      // Create wallet if it doesn't exist
      console.log(`[WalletTransaction] Creating new wallet for affiliate ${affiliateId}`);
      const [newWallet] = await db
        .insert(affiliatesWallet)
        .values({
          affiliateId,
          balance: '0.00',
          totalEarned: '0.00',
          totalWithdrawn: '0.00'
        })
        .returning();
      wallet = [newWallet];
      console.log(`[WalletTransaction] New wallet created with ID ${newWallet.id}`);
    }
    
    const currentWallet = wallet[0];
    const balanceBefore = parseFloat(currentWallet.balance);
    
    let balanceAfter = balanceBefore;
    
    if (status === 'completed') {
      balanceAfter = balanceBefore + amount;
    }
    
    // Create wallet transaction record
    await db.insert(affiliatesWalletTransactions).values({
      walletId: currentWallet.id,
      affiliateId,
      type: 'commission',
      status: status === 'completed' ? 'completed' : 'pending',
      amount: amount.toFixed(2),
      balanceBefore: balanceBefore.toFixed(2),
      balanceAfter: balanceAfter.toFixed(2),
      description: description || `Comissão de depósito #${depositId}`,
      referenceId: depositId,
      referenceType: 'deposit',
      metadata: { depositId },
      processedAt: status === 'completed' ? new Date() : null
    });
    
    // Update wallet balances
    const updates: any = {
      lastTransactionAt: new Date(),
      updatedAt: new Date()
    };
    
    if (status === 'completed') {
      updates.balance = balanceAfter.toFixed(2);
      updates.totalEarned = (parseFloat(currentWallet.totalEarned) + amount).toFixed(2);
      console.log(`[WalletTransaction] Updating wallet balance: ${balanceBefore.toFixed(2)} -> ${balanceAfter.toFixed(2)}`);
    }
    
    await db
      .update(affiliatesWallet)
      .set(updates)
      .where(eq(affiliatesWallet.id, currentWallet.id));
    
    // Log transaction without sensitive data
    console.log(`[WalletTransaction] ✅ Transaction created: ${status} commission of R$${amount.toFixed(2)}`);
    console.log(`[WalletTransaction] ✅ New balance: R$${status === 'completed' ? balanceAfter.toFixed(2) : balanceBefore.toFixed(2)}`);
    return true;
  } catch (error) {
    console.error('Error processing wallet transaction:', error);
    return false;
  }
}

// Helper function to detect PIX key type - Only accepts CPF or CNPJ
function detectPixKeyType(pixKey: string): string | null {
  // Remove all non-alphanumeric characters for analysis
  const cleanKey = pixKey.replace(/[^a-zA-Z0-9]/g, '');
  
  // CPF: 11 digits
  if (/^\d{11}$/.test(cleanKey)) {
    return 'cpf';
  }
  
  // CNPJ: 14 digits
  if (/^\d{14}$/.test(cleanKey)) {
    return 'cnpj';
  }
  
  // Return null for invalid key types
  return null;
}

// Game configurations
const GAME_CONFIGS = {
  pix_na_conta: { cost: "5.00", prizes: [5, 10, 25, 50], odds: 0.3 },
  sonho_consumo: { cost: "10.00", prizes: [10, 25, 50, 100], odds: 0.25 },
  me_mimei: { cost: "2.00", prizes: [2, 5, 10, 20], odds: 0.4 },
  super_premios: { cost: "50.00", prizes: [50, 100, 500, 1000], odds: 0.1 },
};



// Middleware to verify JWT token
const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Token de acesso requerido" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(403).json({ message: "Token inválido" });
  }
};

// Middleware to allow both authenticated users and welcome users
const authenticateOptionalWithWelcome = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      req.userId = decoded.userId;
      next();
    } catch (error) {
      return res.status(403).json({ message: "Token inválido" });
    }
  } else if (req.body.isWelcomeUser && req.body.freePlay) {
    // Allow non-authenticated users with welcome bonus
    req.userId = null;
    req.isWelcomeUser = true;
    next();
  } else {
    return res.status(401).json({ message: "Token de acesso requerido" });
  }
};

// Middleware to verify admin session (supports both session cookie and Bearer token)
const authenticateAdmin = async (req: any, res: any, next: any) => {
  // First, check if user is authenticated via session (cookie)
  if (req.session?.isAdminAuthenticated && req.session?.adminUserId) {
    // User is authenticated via session cookie
    req.adminSession = {
      sessionId: req.sessionID,
      username: req.session.adminUsername,
      userId: req.session.adminUserId
    };
    return next();
  }

  // If not authenticated via session, check Bearer token
  const authHeader = req.headers.authorization;
  const sessionId = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!sessionId) {
    return res.status(401).json({ message: "Sessão de admin requerida" });
  }

  try {
    const session = await storage.getAdminSession(sessionId);
    if (!session) {
      return res.status(403).json({ message: "Sessão inválida ou expirada" });
    }
    
    // Set admin session data for downstream use
    req.adminSession = session;
    next();
  } catch (error) {
    console.error('Admin authentication error:', error);
    return res.status(500).json({ message: "Erro ao verificar sessão" });
  }
};


// Legacy OrinPay function - DEPRECATED (replaced with LiraPay)
const createOrinPayPixPayment_OLD_DEPRECATED = async (amount: number, customerData: any) => {
  const orinpayToken = process.env.ORINPAY_TOKEN;
  // Use www.orinpay.com.br as per documentation
  const orinpayApiUrl = 'https://www.orinpay.com.br/api';
  
  if (!orinpayToken) {
    throw new Error("OrinPay token not configured - please configure token in admin panel");
  }

  const payload = {
    paymentMethod: "pix",
    reference: `PIX-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    customer: {
      name: customerData.name || "Cliente",
      email: customerData.email || "cliente@mania-brasil.com",
      phone: customerData.phone || "11999999999",
      document: {
        number: "07325503601", // CPF válido fornecido pelo usuário
        type: "cpf"
      }
    },
    shipping: {
      fee: 0,
      address: {
        street: "Rua Exemplo",
        streetNumber: "123",
        zipCode: "12345678",
        neighborhood: "Centro",
        city: "São Paulo",
        state: "SP",
        country: "Brasil",
        complement: ""
      }
    },
    items: [
      {
        title: "Deposito",
        description: `Deposito PIX`,
        unitPrice: Math.round(amount * 100), // Convert to cents
        quantity: 1,
        tangible: false
      }
    ],
    isInfoProducts: true
  };

  const apiUrl = `${orinpayApiUrl}/v1/transactions/pix`;
  
  // Creating OrinPay PIX payment

  try {
    const { default: fetch } = await import("node-fetch");

    // Configure to follow redirects (OrinPay API redirects)
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": orinpayToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      follow: 20, // Follow up to 20 redirects
      redirect: 'follow' // Enable redirect following
    });

    const responseText = await response.text();
    console.log("OrinPay API Response:", {
      status: response.status,
      headers: response.headers,
      body: responseText.substring(0, 500), // Log first 500 chars for debugging
    });

    if (!response.ok) {
      console.error("OrinPay error response:", responseText);
      throw new Error(
        `OrinPay API error: ${response.status} - ${responseText}`,
      );
    }

    const data = JSON.parse(responseText);
    console.log("OrinPay parsed data:", {
      id: data.id,
      status: data.status,
      pixPayload: data.pix?.payload ? "present" : "missing",
      pixEncoded: data.pix?.encodedImage ? "present" : "missing"
    });
    
    // Check if we have valid PIX data
    const pixCode = data.pix?.payload || data.pix?.encodedImage;
    if (!pixCode) {
      console.error("OrinPay: No PIX QR code in response");
      console.log("Full OrinPay response:", data);
      throw new Error("OrinPay não retornou um código PIX válido");
    }
    
    // Map OrinPay response to our expected format
    return {
      pixCode: pixCode,
      transactionId: String(data.id || data.orderId || payload.reference),
      qrCode: pixCode,
      amount: amount
    };
  } catch (error) {
    console.error("OrinPay PIX payment error:", error);
    throw error;
  }
};


const createPixPaymentHandler = async (amount: number, customerData: any, depositId: number, utmData?: any) => {
  // Use LiraPay as payment provider
  console.log("Creating PIX payment with LiraPay");
  
  try {
    // LiraPay expects amount in reais, not cents
    const amountInReais = amount / 100;
    const response = await createPixPayment(amountInReais, customerData, depositId);
    console.log("LiraPay payment created successfully");
    return response;
  } catch (error) {
    console.error("LiraPay payment failed:", error);
    throw new Error("Erro ao processar pagamento. Tente novamente mais tarde.");
  }
};

const verifyPixPayment = async (transactionId: string) => {
  try {
    // First check if payment was already processed in our database
    const deposit = await storage.getDepositByTransactionId(transactionId);
    if (deposit && deposit.status === "completed") {
      console.log("Payment already completed in database");
      return { status: "completed" };
    }

    // OrinPay verification is handled via webhooks
    // Return current status from database or pending
    const result = await getTransactionStatus(transactionId);
    
    if (result.success && result.status === 'completed') {
      return { status: 'completed' };
    }
    
    // Payment is still pending or failed
    return { status: deposit?.status || 'pending' };
  } catch (error) {
    console.error("PIX verification error:", error);
    // Don't throw - return pending to avoid breaking the flow
    return { status: "pending" };
  }
};

// In-memory game state storage (in production, use Redis or database)
const activeGames = new Map<string, any>();
const gameBoxes = new Map<string, any[]>(); // Store boxes for each game

// Helper function to calculate total probability
// Function removed - no longer needed with new independent probability system

// Coupon system now uses database storage instead of in-memory sets

// In-memory store for user claimed rewards
const userClaimedRewards = new Map<number, number[]>();

// In-memory store for daily chest claims
const userDailyChestClaims = new Map<number, Date>();

// Clean up old games periodically
setInterval(
  () => {
    const now = Date.now();
    const GAME_EXPIRY = 30 * 60 * 1000; // 30 minutes

    activeGames.forEach((game, gameId) => {
      if (now - game.createdAt.getTime() > GAME_EXPIRY) {
        activeGames.delete(gameId);
      }
    });
  },
  5 * 60 * 1000,
); // Clean up every 5 minutes

// Helper function to validate referral when deposit is made (first deposit only)
const validateReferralOnDeposit = async (userId: number, depositAmount: string) => {
  try {
    // Get referral configuration
    const config = await storage.getReferralConfig();
    if (!config.isActive) {
      return;
    }
    
    // Check if deposit meets minimum requirement (R$20)
    if (parseFloat(depositAmount) < 20) {
      return;
    }
    
    // Check if user was referred
    const referral = await storage.getReferralsByReferred(userId);
    if (!referral || referral.status === 'validated') {
      return;
    }
    
    // Validate the referral
    await storage.validateReferral(referral.id);
    
    // Use fixed amount from configuration
    const commission = config.paymentAmount;
    
    // Create referral earning for the referrer
    await storage.createReferralEarning({
      userId: referral.referrerId,
      referralId: referral.id,
      amount: commission
    });
    
    console.log(`Validated first deposit referral: R$${commission} (fixed amount) for user ${referral.referrerId}`);
  } catch (error) {
    console.error("Error validating referral on deposit:", error);
  }
};

// Helper function to calculate affiliate level based on total earnings
const calculateAffiliateLevel = (totalEarnings: number): number => {
  // Progressive earnings requirement using exponential growth
  for (let level = 100; level >= 1; level--) {
    const requirement = level === 1 ? 0 : Math.floor(50 * Math.pow(1.05, level - 1));
    if (totalEarnings >= requirement) {
      return level;
    }
  }
  return 1;
};

// Helper function to get commission rate based on level
const getAffiliateCommissionRate = (level: number): number => {
  // Progressive commission: starts at 20%, reaches 90% at level 100
  const baseRate = 20;
  const maxRate = 90;
  const progression = (level - 1) / 99; // 0 to 1 scale
  return Math.round(baseRate + (maxRate - baseRate) * progression);
};

// Helper function to check and update affiliate level based on earnings
const checkAndUpdateAffiliateLevel = async (affiliateId: number) => {
  try {
    // Get affiliate data
    const [affiliate] = await db.select().from(affiliates).where(eq(affiliates.id, affiliateId));
    if (!affiliate) return;
    
    // Get total approved earnings
    const totalApproved = parseFloat(affiliate.approvedEarnings || '0');
    
    // Determine new level based on earnings
    let newLevel = 'bronze';
    let newRate = '40.00';
    
    if (totalApproved >= 100000) {
      newLevel = 'diamond';
      newRate = '70.00';
    } else if (totalApproved >= 50000) {
      newLevel = 'platinum';
      newRate = '60.00';
    } else if (totalApproved >= 20000) {
      newLevel = 'gold';
      newRate = '50.00';
    } else if (totalApproved >= 5000) {
      newLevel = 'silver';
      newRate = '45.00';
    }
    
    // Check if level changed
    if (affiliate.affiliateLevel !== newLevel) {
      console.log(`🎉 LEVEL UP! Affiliate ${affiliateId} promoted from ${affiliate.affiliateLevel} to ${newLevel}`);
      console.log(`New commission rate: ${newRate}% (Total earned: R$${totalApproved.toFixed(2)})`);
      
      // Update affiliate level and rate (preserve custom rate if exists)
      const updateData: any = {
        affiliateLevel: newLevel,
        approvedEarnings: totalApproved.toFixed(2)
      };
      
      // Only update rate if no custom rate is set
      if (!affiliate.customCommissionRate) {
        updateData.currentLevelRate = newRate;
      }
      
      await db.update(affiliates)
        .set(updateData)
        .where(eq(affiliates.id, affiliateId));
      
      console.log(`✅ Affiliate ${affiliateId} level updated to ${newLevel}`);
    }
  } catch (error) {
    console.error(`Error checking affiliate level for ${affiliateId}:`, error);
  }
};

// Helper function to process referral commission for all deposits
const processReferralCommission = async (userId: number, depositAmount: string) => {
  try {
    // Get referral configuration
    const config = await storage.getReferralConfig();
    if (!config.isActive) {
      return;
    }
    
    // Check if user was referred
    const referral = await storage.getReferralsByReferred(userId);
    if (!referral) {
      return;
    }
    
    // Skip if config is set to first deposit only and referral is already validated
    if (config.paymentType === 'first_deposit' && referral.status === 'validated') {
      return;
    }
    
    // Get referred user info for transaction description
    const referredUser = await storage.getUser(userId);
    const referredName = referredUser?.name || 'Usuário';
    
    // Use fixed amount from configuration
    const commission = config.paymentAmount;
    
    // Create referral earning for the referrer
    await storage.createReferralEarning({
      userId: referral.referrerId,
      referralId: referral.id,
      amount: commission
    });
    
    console.log(`Processed referral commission: R$${commission} (fixed amount) for user ${referral.referrerId} from deposit of R$${depositAmount} by ${referredName}`);
  } catch (error) {
    console.error("Error processing referral commission:", error);
  }
};

// Helper function to process partner commission when deposit is confirmed
const processPartnerCommission = async (userId: number, depositAmount: string, partnerCode: string) => {
  try {
    console.log(`=== PROCESSING PARTNER COMMISSION ===`);
    console.log(`User ID: ${userId}, Deposit: R$${depositAmount}, Partner Code: ${partnerCode}`);
    
    // Get partner details
    const [partner] = await db.select()
      .from(partners)
      .where(eq(partners.code, partnerCode))
      .limit(1);
    
    if (!partner || !partner.isActive) {
      console.log(`Partner not found or inactive for code: ${partnerCode}`);
      return null;
    }
    
    // Get affiliate details to calculate total commission
    const affiliate = await storage.getAffiliateById(partner.affiliateId);
    if (!affiliate || !affiliate.isActive) {
      console.log(`Affiliate not found or inactive for partner ${partner.id}`);
      return null;
    }
    
    // Calculate TOTAL commission based on affiliate's configuration
    let totalCommission: number;
    let affiliateCommissionType = affiliate.commissionType || 'fixed';
    
    // Check for custom commission settings first
    if (affiliate.customFixedAmount && parseFloat(affiliate.customFixedAmount) > 0) {
      totalCommission = parseFloat(affiliate.customFixedAmount);
      affiliateCommissionType = 'fixed';
      console.log(`Using affiliate CUSTOM fixed commission: R$${totalCommission}`);
    } else if (affiliate.customCommissionRate && parseFloat(affiliate.customCommissionRate) > 0) {
      totalCommission = parseFloat(depositAmount) * parseFloat(affiliate.customCommissionRate) / 100;
      affiliateCommissionType = 'percentage';
      console.log(`Using affiliate CUSTOM percentage: ${affiliate.customCommissionRate}% = R$${totalCommission}`);
    } else if (affiliateCommissionType === 'fixed') {
      totalCommission = parseFloat(affiliate.fixedCommissionAmount || '7.00');
      console.log(`Using affiliate FIXED commission: R$${totalCommission}`);
    } else {
      const rate = parseFloat(affiliate.currentLevelRate || '40.00');
      totalCommission = parseFloat(depositAmount) * rate / 100;
      console.log(`Using affiliate PERCENTAGE: ${rate}% = R$${totalCommission}`);
    }
    
    // Calculate partner's share based on their configuration
    let partnerCommission: number;
    if (partner.commissionType === 'fixed') {
      partnerCommission = parseFloat(partner.fixedCommissionAmount || '3.00');
      console.log(`Partner gets FIXED: R$${partnerCommission}`);
    } else {
      const partnerRate = parseFloat(partner.commissionRate || '5.00');
      partnerCommission = parseFloat(depositAmount) * partnerRate / 100;
      console.log(`Partner gets PERCENTAGE: ${partnerRate}% = R$${partnerCommission}`);
    }
    
    // Partner cannot receive more than the total commission
    if (partnerCommission > totalCommission) {
      partnerCommission = totalCommission * 0.5; // Give partner 50% if their config exceeds total
      console.log(`Partner commission limited to 50% of total: R$${partnerCommission}`);
    }
    
    // Calculate affiliate's share (rest of the commission)
    const affiliateCommission = Math.max(0, totalCommission - partnerCommission);
    
    console.log(`=== COMMISSION SPLIT ===`);
    console.log(`Total Commission: R$${totalCommission.toFixed(2)}`);
    console.log(`Partner Share: R$${partnerCommission.toFixed(2)}`);
    console.log(`Affiliate Share: R$${affiliateCommission.toFixed(2)}`);
    
    // Check if there's a pending conversion first
    const existingPendingConversions = await db.select()
      .from(partnerConversions)
      .where(
        and(
          eq(partnerConversions.partnerId, partner.id),
          eq(partnerConversions.userId, userId),
          eq(partnerConversions.status, 'pending'),
          eq(partnerConversions.conversionValue, depositAmount)
        )
      );
    
    let partnerConversionId: number | null = null;
    
    if (existingPendingConversions.length > 0) {
      // Update existing pending conversion to completed
      const pendingConversion = existingPendingConversions[0];
      await db.update(partnerConversions)
        .set({
          status: 'completed'
        })
        .where(eq(partnerConversions.id, pendingConversion.id));
      
      partnerConversionId = pendingConversion.id;
      console.log(`✅ Updated existing pending partner conversion ID ${pendingConversion.id} to completed`);
    } else {
      // Create new partner conversion record
      try {
        const [insertedConversion] = await db.insert(partnerConversions).values({
          partnerId: partner.id,
          affiliateId: partner.affiliateId,
          userId: userId,
          type: 'commission', // Add the required type field
          conversionType: 'deposit',
          conversionValue: depositAmount,
          partnerCommission: partnerCommission.toFixed(2),
          affiliateCommission: affiliateCommission.toFixed(2),
          commissionRate: partner.commissionType === 'percentage' ? partner.commissionRate : null,
          status: 'completed',
          createdAt: new Date()
        }).returning();
        
        partnerConversionId = insertedConversion?.id || null;
        console.log(`✅ Partner conversion created successfully with ID ${insertedConversion?.id}`);
      } catch (err) {
        console.error("❌ CRITICAL ERROR: Failed to create partner conversion:", err);
        console.error("Partner ID:", partner.id);
        console.error("User ID:", userId);
        console.error("Deposit Amount:", depositAmount);
        // Don't stop execution - continue to process wallet update
      }
    }
    
    // Update partner earnings and wallet
    await db.update(partners)
      .set({
        totalEarnings: sql`COALESCE(${partners.totalEarnings}, 0) + ${partnerCommission}`,
        approvedEarnings: sql`COALESCE(${partners.approvedEarnings}, 0) + ${partnerCommission}`,
        totalDeposits: sql`COALESCE(${partners.totalDeposits}, 0) + 1`
      })
      .where(eq(partners.id, partner.id));
    
    // Update partner wallet
    let [partnerWallet] = await db.select()
      .from(partnersWallet)
      .where(eq(partnersWallet.partnerId, partner.id));
    
    if (!partnerWallet) {
      // Create wallet if it doesn't exist
      console.log(`Creating wallet for partner ${partner.id}`);
      const [newWallet] = await db.insert(partnersWallet)
        .values({
          partnerId: partner.id,
          balance: "0.00",
          totalEarned: "0.00",
          totalWithdrawn: "0.00",
          createdAt: new Date()
        })
        .returning();
      partnerWallet = newWallet;
    }
    
    if (partnerWallet) {
      await db.update(partnersWallet)
        .set({
          balance: sql`COALESCE(${partnersWallet.balance}, 0) + ${partnerCommission}`,
          totalEarned: sql`COALESCE(${partnersWallet.totalEarned}, 0) + ${partnerCommission}`,
          lastTransactionAt: new Date()
        })
        .where(eq(partnersWallet.partnerId, partner.id));
      
      // Create wallet transaction for partner
      await db.insert(partnersWalletTransactions).values({
        walletId: partnerWallet.id,
        partnerId: partner.id,
        type: 'commission' as const,
        amount: partnerCommission.toFixed(2),
        balanceBefore: partnerWallet.balance || "0.00",
        balanceAfter: (parseFloat(partnerWallet.balance || "0") + partnerCommission).toFixed(2),
        description: `Comissão de depósito - Usuário #${userId}`,
        referenceId: null,
        referenceType: 'deposit',
        metadata: {}, // Add empty metadata to match schema
        status: 'completed' as const,
        createdAt: new Date(),
        processedAt: new Date()
      });
      
      console.log(`✅ Partner wallet updated. New balance: R$${(parseFloat(partnerWallet.balance || "0") + partnerCommission).toFixed(2)}`);
    }
    
    console.log(`✅ Partner commission processed: R$${partnerCommission.toFixed(2)} for partner ${partner.id}`);
    
    // Now process affiliate wallet update for their share
    if (affiliate && affiliate.isActive && affiliateCommission > 0) {
      console.log(`Processing affiliate wallet for commission R$${affiliateCommission.toFixed(2)}`);
      
      // Process affiliate wallet transaction
      const affiliateWalletSuccess = await processAffiliateWalletTransaction(
        partner.affiliateId,
        affiliateCommission,
        partnerConversionId || 0, // Use partner conversion ID as reference, default to 0 if null
        'completed',
        `Comissão aprovada - Depósito usuário #${userId} (divisão com parceiro ${partner.code})`
      );
      
      if (affiliateWalletSuccess) {
        // Update affiliate earnings
        await db.update(affiliates)
          .set({
            totalEarnings: sql`COALESCE(${affiliates.totalEarnings}, 0) + ${affiliateCommission}`,
            approvedEarnings: sql`COALESCE(${affiliates.approvedEarnings}, 0) + ${affiliateCommission}`
          })
          .where(eq(affiliates.id, partner.affiliateId));
        
        console.log(`✅ Affiliate wallet updated with commission: R$${affiliateCommission.toFixed(2)} for affiliate ${partner.affiliateId}`);
        
        // Check and update affiliate level
        await checkAndUpdateAffiliateLevel(partner.affiliateId);
      }
    }
    
    // Return affiliate commission to be processed
    return {
      affiliateId: partner.affiliateId,
      affiliateCommission: affiliateCommission,
      totalCommission: totalCommission,
      partnerConversionId: partnerConversionId
    };
    
  } catch (error) {
    console.error("Error processing partner commission:", error);
    return null;
  }
};

// Helper function to process affiliate commission when a deposit is confirmed
const processAffiliateCommission = async (userId: number, depositAmount: string, transactionId?: string) => {
  try {
    console.log(`\n=== STARTING COMMISSION PROCESSING ===`);
    console.log(`User ID: ${userId}, Deposit Amount: ${depositAmount}`);
    
    // Get user to check if they were referred
    const user = await storage.getUser(userId);
    if (!user) {
      console.log(`User ${userId} not found, aborting commission processing`);
      return;
    }
    
    console.log(`\n=== PROCESSING COMMISSION FOR USER ${userId} ===`);
    console.log(`PartnerId: ${user.partnerId}, AffiliateId: ${user.affiliateId}, ReferredBy: ${user.referredBy}`);
    
    // PRIORITY 1: Check if user has partnerId (registered using partner code)
    if (user.partnerId) {
      // Get partner details
      const [partner] = await db.select()
        .from(partners)
        .where(eq(partners.id, user.partnerId))
        .limit(1);
      
      if (partner) {
        console.log(`User ${userId} has partnerId ${user.partnerId} (${partner.code}) - processing split commission`);
        
        // Process partner commission and get affiliate share
        const result = await processPartnerCommission(userId, depositAmount, partner.code);
        
        if (result) {
          // Affiliate wallet and earnings already processed inside processPartnerCommission
          console.log(`✅ Commission split processed - Partner: R$${(result.totalCommission - result.affiliateCommission).toFixed(2)}, Affiliate: R$${result.affiliateCommission.toFixed(2)}`);
        }
        return; // Commission processed via partner
      }
    }
    
    // PRIORITY 2: Check if user was referred by a code (could be partner code or affiliate code)
    if (user.referredBy && !user.partnerId) {
      // Check if it's a partner code
      const [partnerCode] = await db.select()
        .from(partnerCodes)
        .where(eq(partnerCodes.code, user.referredBy))
        .limit(1);
      
      if (partnerCode) {
        const [partner] = await db.select()
          .from(partners)
          .where(eq(partners.id, partnerCode.partnerId))
          .limit(1);
        
        if (partner) {
          console.log(`User ${userId} was referred by partner code ${partner.code} - processing split commission`);
          
          // Process partner commission and get affiliate share
          const result = await processPartnerCommission(userId, depositAmount, partner.code);
          
          if (result) {
            // Affiliate wallet and earnings already processed inside processPartnerCommission
            console.log(`✅ Commission split processed - Partner: R$${(result.totalCommission - result.affiliateCommission).toFixed(2)}, Affiliate: R$${result.affiliateCommission.toFixed(2)}`);
          }
          return; // Commission processed via partner
        }
      }
    }
    
    // If user has direct affiliateId (not via partner), process normal affiliate commission
    if (!user.affiliateId) {
      // User has no affiliate associated
      return;
    }
    
    // Get affiliate details - FRESH FROM DATABASE
    const affiliate = await storage.getAffiliateById(user.affiliateId);
    console.log(`=== FETCHED AFFILIATE DATA ===`);
    console.log(`Affiliate ID: ${affiliate?.id}`);
    console.log(`Name: ${affiliate?.name}`);
    console.log(`Level: ${affiliate?.affiliateLevel}`);
    console.log(`Commission Type: ${affiliate?.commissionType}`);
    console.log(`Current Level Rate: ${affiliate?.currentLevelRate}`);
    console.log(`Custom Commission Rate: ${affiliate?.customCommissionRate}`);
    console.log(`Custom Fixed Amount: ${affiliate?.customFixedAmount}`);
    console.log(`Is Active: ${affiliate?.isActive}`);
    
    if (!affiliate || !affiliate.isActive) {
      console.log(`Affiliate not found or inactive, skipping commission`);
      return;
    }
    
    // Check if commission already exists for this deposit
    const existingCommissions = await storage.getAffiliateConversionsByUser(userId);
    const existingCommission = existingCommissions.find(
      c => c.conversionValue === depositAmount && 
           c.conversionType === 'deposit' &&
           c.affiliateId === affiliate.id &&
           Math.abs(new Date(c.createdAt).getTime() - Date.now()) < 300000 // Within 5 minutes
    );
    
    if (existingCommission) {
      // If commission exists but is pending, approve it
      if (existingCommission.status === 'pending') {
        console.log(`Found pending commission ${existingCommission.id}, approving it...`);
        
        // Update commission status to completed
        await db.update(affiliateConversions)
          .set({ status: 'completed' })
          .where(eq(affiliateConversions.id, existingCommission.id));
        
        // Check if wallet transaction already exists for this commission
        const existingWalletTransaction = await db
          .select()
          .from(affiliatesWalletTransactions)
          .where(eq(affiliatesWalletTransactions.referenceId, existingCommission.id))
          .limit(1);
        
        if (existingWalletTransaction.length === 0) {
          // Process wallet transaction to add money
          const commissionAmount = parseFloat(existingCommission.commission);
          console.log(`Creating wallet transaction for commission R$${commissionAmount}`);
          
          const success = await processAffiliateWalletTransaction(
            existingCommission.affiliateId,
            commissionAmount,
            existingCommission.id,
            'completed',
            `Comissão aprovada - Depósito usuário #${userId}`
          );
          
          if (success) {
            // Update affiliate's approved earnings
            await db.update(affiliates)
              .set({
                approvedEarnings: sql`COALESCE(${affiliates.approvedEarnings}, 0) + ${commissionAmount}`,
                totalEarnings: sql`COALESCE(${affiliates.totalEarnings}, 0) + ${commissionAmount}`
              })
              .where(eq(affiliates.id, existingCommission.affiliateId));
            
            console.log(`✅ Approved pending commission: R$${existingCommission.commission} for affiliate ${existingCommission.affiliateId}`);
            console.log(`✅ Wallet balance updated successfully`);
            
            // Check and update affiliate level based on new earnings
            await checkAndUpdateAffiliateLevel(existingCommission.affiliateId);
          } else {
            console.error(`❌ Failed to update wallet for commission ${existingCommission.id}`);
          }
        } else {
          console.log(`Wallet transaction already exists for commission ${existingCommission.id}`);
        }
      } else {
        console.log(`Commission already exists and is ${existingCommission.status}`);
      }
      return;
    }
    
    // Calculate commission based on affiliate configuration
    let commissionAmount: number;
    let commissionRate: number | null = null;
    
    if (affiliate.commissionType === 'fixed') {
      // Use fixed commission amount - check for custom rate first (any tier can have custom)
      if (affiliate.customFixedAmount) {
        commissionAmount = parseFloat(affiliate.customFixedAmount);
        console.log(`Using CUSTOM fixed commission: R$${commissionAmount.toFixed(2)} for affiliate ${affiliate.id} (tier: ${affiliate.affiliateLevel})`);
      } else {
        // Use tier-based fixed amount
        commissionAmount = parseFloat(affiliate.fixedCommissionAmount || '6.00');
        console.log(`Using tier-based fixed commission: R$${commissionAmount.toFixed(2)} for tier ${affiliate.affiliateLevel}`);
      }
    } else {
      // Use percentage commission - check for custom rate first (any tier can have custom)
      if (affiliate.customCommissionRate) {
        commissionRate = parseFloat(affiliate.customCommissionRate);
        console.log(`Using CUSTOM percentage commission: ${commissionRate}% for affiliate ${affiliate.id} (tier: ${affiliate.affiliateLevel})`);
      } else {
        // Use tier-based percentage
        commissionRate = parseFloat(affiliate.currentLevelRate || '40.00');
        console.log(`Using tier-based percentage commission: ${commissionRate}% for tier ${affiliate.affiliateLevel}`);
      }
      const depositValue = parseFloat(depositAmount);
      commissionAmount = (depositValue * commissionRate / 100);
      console.log(`Calculated commission: ${commissionRate}% of R$${depositValue.toFixed(2)} = R$${commissionAmount.toFixed(2)}`);
    }
    
    // Create affiliate conversion record
    const conversion = await storage.createAffiliateConversion({
      affiliateId: affiliate.id,
      userId: userId,
      conversionType: 'deposit',
      conversionValue: depositAmount,
      commission: commissionAmount.toFixed(2),
      commissionRate: commissionRate ? commissionRate.toFixed(2) : null,
      status: 'completed' // Auto-approve commission when deposit is confirmed
    });
    
    // Process wallet transaction (add directly to available balance)
    console.log(`Processing wallet transaction for affiliate ${affiliate.id} - Amount: R$${commissionAmount.toFixed(2)}`);
    const success = await processAffiliateWalletTransaction(
      affiliate.id,
      commissionAmount,
      conversion.id,
      'completed',
      `Comissão de depósito - Usuário #${userId}`
    );
    
    if (!success) {
      console.error(`❌ Failed to create wallet transaction for commission ${conversion.id}`);
    } else {
      console.log(`✅ Wallet transaction created successfully`);
      console.log(`✅ Commission R$${commissionAmount.toFixed(2)} added to affiliate ${affiliate.id} wallet`);
    }
    
    // Update affiliate's total and approved earnings
    await db.update(affiliates)
      .set({
        totalEarnings: sql`COALESCE(${affiliates.totalEarnings}, 0) + ${commissionAmount}`,
        approvedEarnings: sql`COALESCE(${affiliates.approvedEarnings}, 0) + ${commissionAmount}`
      })
      .where(eq(affiliates.id, affiliate.id));
    
    console.log(`Created and auto-approved ${affiliate.commissionType} commission for affiliate ${affiliate.id}: R$${commissionAmount.toFixed(2)}`);
    
    // Check and update affiliate level based on new earnings
    await checkAndUpdateAffiliateLevel(affiliate.id);
    
  } catch (error) {
    console.error("Error processing affiliate commission:", error);
  }
};

// Helper function to update affiliate commission status based on deposit status
const updateAffiliateCommissionStatus = async (userId: number, depositAmount: string, newStatus: string) => {
  try {
    const commissions = await storage.getAffiliateConversionsByUser(userId);
    const commission = commissions.find(
      c => c.conversionValue === depositAmount && 
           c.conversionType === 'deposit' &&
           c.status === 'pending'
    );
    
    if (commission && commission.affiliateId) {
      let commissionStatus = 'pending';
      
      if (newStatus === 'completed') {
        commissionStatus = 'completed';
        // Move balance from pending to available
        const wallet = await db
          .select()
          .from(affiliatesWallet)
          .where(eq(affiliatesWallet.affiliateId, commission.affiliateId))
          .limit(1);
        
        if (wallet.length > 0) {
          const currentWallet = wallet[0];
          const commissionAmount = parseFloat(commission.commission || '0');
          const newBalance = parseFloat(currentWallet.balance) + commissionAmount;
          
          await db
            .update(affiliatesWallet)
            .set({
              balance: newBalance.toFixed(2),
              totalEarned: (parseFloat(currentWallet.totalEarned) + commissionAmount).toFixed(2),
              lastTransactionAt: new Date(),
              updatedAt: new Date()
            })
            .where(eq(affiliatesWallet.id, currentWallet.id));
          
          // Commission added to available balance
        }
      } else if (newStatus === 'cancelled' || newStatus === 'expired' || newStatus === 'failed') {
        commissionStatus = 'cancelled';
        // Commission was cancelled, no balance update needed
        // Commission cancelled
      }
      
      await storage.updateAffiliateConversionStatus(commission.id, commissionStatus);
      // Commission status updated successfully
    }
  } catch (error) {
    console.error("Error updating affiliate commission status:", error);
  }
};

// Game logic
const generateScratchResult = (gameType: keyof typeof GAME_CONFIGS) => {
  const config = GAME_CONFIGS[gameType];
  const symbols = ["💰", "🎯", "🎲", "💎", "🍀", "⭐", "🎁", "🔥"];

  const isWinner = Math.random() < config.odds;
  const grid = Array(9).fill(null);

  if (isWinner) {
    const winningSymbol = symbols[Math.floor(Math.random() * symbols.length)];
    const winningPositions = [0, 4, 8]; // Diagonal win

    winningPositions.forEach((pos) => {
      grid[pos] = winningSymbol;
    });

    // Fill remaining positions with random symbols
    grid.forEach((cell, index) => {
      if (cell === null) {
        grid[index] = symbols[Math.floor(Math.random() * symbols.length)];
      }
    });

    const prizeIndex = Math.floor(Math.random() * config.prizes.length);
    const prize = config.prizes[prizeIndex];

    return { grid, won: true, prize };
  } else {
    // Generate losing combination
    grid.forEach((_, index) => {
      grid[index] = symbols[Math.floor(Math.random() * symbols.length)];
    });

    // Ensure no winning combinations
    const symbolCounts: Record<string, number> = {};
    grid.forEach((symbol) => {
      symbolCounts[symbol] = (symbolCounts[symbol] || 0) + 1;
    });

    // If we accidentally created a winning combination, break it
    Object.keys(symbolCounts).forEach((symbol) => {
      if (symbolCounts[symbol] >= 3) {
        const positions = grid
          .map((s, i) => (s === symbol ? i : -1))
          .filter((i) => i !== -1);
        const differentSymbol = symbols.find((s) => s !== symbol);
        if (differentSymbol) {
          grid[positions[0]] = differentSymbol;
        }
      }
    });

    return { grid, won: false, prize: 0 };
  }
};

// Rate limiting configurations for security
const createAccountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Muitas tentativas de criação de conta, tente novamente mais tarde.',
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login attempts per windowMs
  message: 'Muitas tentativas de login, tente novamente mais tarde.',
  standardHeaders: true,
  legacyHeaders: false,
});

const withdrawalLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 withdrawal requests per hour
  message: 'Muitas tentativas de saque, tente novamente mais tarde.',
  standardHeaders: true,
  legacyHeaders: false,
});

const gameLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 game plays per minute
  message: 'Você está jogando muito rápido. Por favor, aguarde um momento.',
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 API requests per windowMs
  message: 'Muitas requisições, tente novamente mais tarde.',
  standardHeaders: true,
  legacyHeaders: false,
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Add cookie parser middleware
  app.use(cookieParser());
  
  // Session configuration for affiliate panel and other features
  app.use(session({
    secret: process.env.SESSION_SECRET || 'affiliate-secret-key-change-this',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
  }));

  // Site access tracking middleware
  app.use(async (req: any, res, next) => {
    try {
      // Skip tracking for certain paths
      if (
        req.path.startsWith('/api/affiliate/') || // Skip affiliate routes
        req.path.startsWith('/api/') || 
        req.path.startsWith('/assets/') ||
        req.path.startsWith('/node_modules/') ||
        req.path.includes('.') // Skip static files
      ) {
        return next();
      }

      // Track access with user ID if authenticated
      const authHeader = req.headers.authorization;
      let userId: number | undefined;
      
      if (authHeader) {
        const token = authHeader.split(' ')[1];
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          userId = decoded.userId;
        } catch (error) {
          // Invalid token, proceed without user ID
        }
      }

      // Track the access
      await trackAccess(req, userId);
    } catch (error) {
      console.error("Error in access tracking middleware:", error);
    }
    
    next();
  });

  // Auth routes
  app.post("/api/auth/register", createAccountLimiter, async (req, res) => {
    try {
      const validatedData = registerSchema.parse(req.body);
      const { referralCode, couponCode, utmData, cpf, isAdult, affiliateCode } = req.body; // Get referral, coupon codes, UTM data, CPF, isAdult and affiliate code from request

      // Check if user already exists by email
      const existingUserByEmail = await storage.getUserByEmail(validatedData.email);
      if (existingUserByEmail) {
        return res.status(400).json({ message: "Email já cadastrado" });
      }

      // Check if user already exists by phone
      const existingUserByPhone = await storage.getUserByPhone(validatedData.phone);
      if (existingUserByPhone) {
        return res.status(400).json({ message: "Telefone já cadastrado" });
      }
      
      // Check if CPF already exists (if provided)
      if (cpf) {
        const cleanCPF = cpf.replace(/\D/g, '');
        const existingUserByCPF = await storage.getUserByCPF(cleanCPF);
        if (existingUserByCPF) {
          return res.status(400).json({ message: "CPF já cadastrado" });
        }
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);

      // Create user with UTM tracking data and referral/affiliate code
      const codeToSave = affiliateCode || referralCode || couponCode;
      
      // Check if there's a matching coupon for the code
      let shouldApplyCoupon = false;
      let couponToApply = null;
      
      if (codeToSave) {
        // Try to find a coupon with the same code
        const matchingCoupon = await storage.getCoupon(codeToSave.toUpperCase());
        if (matchingCoupon && matchingCoupon.isActive) {
          shouldApplyCoupon = true;
          couponToApply = matchingCoupon.code;
          console.log(`Coupon ${matchingCoupon.code} will be applied to user upon registration`);
        }
      }
      
      // Check if code is from a partner or affiliate
      let affiliateIdToSave = null;
      let partnerIdToSave = null;
      
      if (codeToSave) {
        // First check if it's a partner code
        const partnerCode = await db.select().from(partnerCodes)
          .where(eq(partnerCodes.code, codeToSave.toUpperCase()))
          .limit(1);
        
        if (partnerCode.length > 0) {
          // It's a partner code
          partnerIdToSave = partnerCode[0].partnerId;
          console.log(`User registering with partner code: ${codeToSave}, Partner ID: ${partnerIdToSave}`);
        } else {
          // Check if it's an affiliate code
          const affiliateCode = await db.select().from(affiliateCodes)
            .where(eq(affiliateCodes.code, codeToSave.toUpperCase()))
            .limit(1);
          
          if (affiliateCode.length > 0) {
            // It's an affiliate code
            affiliateIdToSave = affiliateCode[0].affiliateId;
            console.log(`User registering with affiliate code: ${codeToSave}, Affiliate ID: ${affiliateIdToSave}`);
          }
        }
      }
      
      // Create user with better error handling using direct database function
      let user;
      try {
        console.log("Creating user with data:", {
          name: validatedData.name,
          email: validatedData.email,
          phone: validatedData.phone,
          cpf: cpf ? cpf.replace(/\D/g, '') : null,
          affiliateId: affiliateIdToSave,
          partnerId: partnerIdToSave
        });
        
        // Create user using storage
        user = await storage.createUser({
          name: validatedData.name,
          email: validatedData.email,
          phone: validatedData.phone,
          password: hashedPassword,
          cpf: cpf ? cpf.replace(/\D/g, '') : null,
          isAdult: isAdult || null,
          referredBy: codeToSave ? codeToSave.toUpperCase() : null, // Save the code that was used
          couponApplied: shouldApplyCoupon ? 1 : 0, // Apply coupon if found
          currentCoupon: couponToApply, // Save the coupon code
          affiliateId: affiliateIdToSave, // Save affiliate ID if code was from affiliate
          partnerId: partnerIdToSave, // Save partner ID if code was from partner
          utmSource: utmData?.utm_source || null,
          utmMedium: utmData?.utm_medium || null,
          utmCampaign: utmData?.utm_campaign || null,
          utmTerm: utmData?.utm_term || null,
          utmContent: utmData?.utm_content || null,
          utmSrc: utmData?.utm_src || null,
          landingPage: utmData?.landing_page || null,
        });
        
        console.log("User created successfully:", user.id);
      } catch (createError) {
        console.error("Error creating user in database:", createError);
        return res.status(500).json({ message: "Erro ao criar usuário", error: createError instanceof Error ? createError.message : "Unknown error" });
      }

      // Send Discord notification for new user
      try {
        const { notifyNewUser } = await import('./discord-webhook');
        await notifyNewUser({
          name: user.name,
          email: user.email,
          phone: user.phone,
          referredBy: codeToSave || undefined
        });
      } catch (error) {
        console.error("Error sending Discord notification for new user:", error);
      }

      // Coupon tracking is now handled via database when deposits are made
      
      // Track marketing source if available (from cookies or UTM)
      const marketingSrc = req.cookies?.marketing_src || utmData?.utm_src;
      if (marketingSrc) {
        try {
          const marketingLink = await storage.getMarketingLinkByShortCode(marketingSrc);
          if (marketingLink) {
            // Track conversion for marketing link
            await storage.trackMarketingConversion(marketingLink.id, user.id);
            console.log(`Marketing conversion tracked for user ${user.id} from ${marketingLink.source}`);
          }
        } catch (error) {
          console.error("Marketing tracking error:", error);
        }
      }

      // Handle affiliate code if provided (check affiliate first, then regular referral)
      const codeToProcess = affiliateCode || referralCode;
      
      if (codeToProcess) {
        try {
          const normalizedCode = codeToProcess.toUpperCase();
          
          // Check if it's a system promo code
          if (normalizedCode === 'SORTE100' || normalizedCode === 'BONUS') {
            // System codes don't create referral relationships
            // Do nothing here
          } else {
            // First check if it's a partner code
            const [partner] = await db.select()
              .from(partners)
              .where(eq(partners.code, normalizedCode))
              .limit(1);
            
            if (partner && partner.isActive) {
              // Track partner registration
              await db.update(partners)
                .set({
                  totalRegistrations: sql`${partners.totalRegistrations} + 1`,
                  updatedAt: new Date()
                })
                .where(eq(partners.id, partner.id));
              
              // Partner conversion tracking (skip if table doesn't exist)
              try {
                // Table partnerConversions may not exist, so we skip it
                console.log("Partner conversion tracking skipped");
              } catch (err) {
                console.log("Partner conversion tracking error:", err);
              }
              
              console.log(`User ${user.id} registered with partner code ${normalizedCode}`);
            } else {
              // Check if it's a code from affiliate_codes table
              const affiliateCode = await storage.getAffiliateCodeByCode(normalizedCode);
              if (affiliateCode && affiliateCode.isActive) {
                // Update affiliate code statistics
                await storage.updateAffiliateCodeStats(normalizedCode, 'totalRegistrations');
                
                // Get the affiliate from the code
                const affiliate = await storage.getAffiliateById(affiliateCode.affiliateId);
                
                if (affiliate && affiliate.isActive) {
                  // Don't create registration conversions - only track affiliate relationship
                  // await storage.createAffiliateConversion({
                  //   affiliateId: affiliate.id,
                  //   userId: user.id,
                  //   conversionType: 'registration'
                  // });
                  
                  // Update affiliate statistics
                  await storage.updateAffiliateStats(affiliate.id, {
                    totalRegistrations: (affiliate.totalRegistrations || 0) + 1
                  });
                  
                  // Save affiliate reference for commission tracking
                  await storage.setUserAffiliate(user.id, affiliate.id);
                  
                  // Affiliate relationship saved via affiliate code
                }
              } else {
                // Check if it's a direct affiliate code
                const affiliate = await storage.getAffiliateByCode(normalizedCode);
                if (affiliate && affiliate.isActive) {
                  // Don't create registration conversions - only track affiliate relationship
                  // await storage.createAffiliateConversion({
                  //   affiliateId: affiliate.id,
                  //   userId: user.id,
                  //   conversionType: 'registration'
                  // });
                  
                  // Update affiliate statistics
                  await storage.updateAffiliateStats(affiliate.id, {
                    totalRegistrations: (affiliate.totalRegistrations || 0) + 1
                  });
                  
                  // Save affiliate reference for commission tracking
                  await storage.setUserAffiliate(user.id, affiliate.id);
                  
                  // Affiliate relationship saved
                } else {
                  // Try regular referral code
                  const referrer = await storage.getUserByReferralCode(normalizedCode);
                  if (referrer && referrer.id !== user.id) {
                    // Create referral entry
                    await storage.createReferral({
                      referrerId: referrer.id,
                      referredId: user.id,
                      status: 'pending'
                    });
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error("Referral/Affiliate creation error:", error);
          // Don't fail registration if code is invalid
        }
      }

      // Generate JWT token
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
        expiresIn: "7d",
      });

      res.json({
        message: "Usuário criado com sucesso",
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
        },
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ message: "Erro ao criar usuário" });
    }
  });

  app.post("/api/auth/login", loginLimiter, async (req, res) => {
    try {
      const { email, phone, password } = req.body;

      // Validate input - require either email or phone
      if ((!email && !phone) || !password) {
        return res
          .status(400)
          .json({ message: "Email/telefone e senha são obrigatórios" });
      }

      // Find user by email or phone
      let user;
      if (email) {
        user = await storage.getUserByEmail(email);
      } else if (phone) {
        user = await storage.getUserByPhone(phone);
      }
      
      if (!user) {
        return res.status(400).json({ message: "Credenciais inválidas" });
      }

      // Check password
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(400).json({ message: "Credenciais inválidas" });
      }

      // Get wallet balance
      const wallet = await storage.getWallet(user.id);

      // Generate JWT token
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
        expiresIn: "7d",
      });

      res.json({
        message: "Login realizado com sucesso",
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          balance: wallet?.balance || "0.00",
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(400).json({ message: "Erro ao fazer login" });
    }
  });

  // Check if phone exists endpoint
  app.post("/api/auth/check-phone", async (req, res) => {
    try {
      const { phone } = req.body;
      
      if (!phone) {
        return res.status(400).json({ exists: false });
      }
      
      // Clean phone number (remove formatting)
      const cleanPhone = phone.replace(/\D/g, '');
      
      const user = await storage.getUserByPhone(cleanPhone);
      
      res.json({ exists: !!user });
    } catch (error) {
      console.error("Check phone error:", error);
      res.status(200).json({ exists: false });
    }
  });
  
  // Check if email exists endpoint
  app.post("/api/auth/check-email", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ exists: false });
      }
      
      const user = await storage.getUserByEmail(email);
      
      res.json({ exists: !!user });
    } catch (error) {
      console.error("Check email error:", error);
      res.status(200).json({ exists: false });
    }
  });
  
  // Check if CPF exists endpoint
  app.post("/api/auth/check-cpf", async (req, res) => {
    try {
      const { cpf } = req.body;
      
      if (!cpf) {
        return res.status(400).json({ exists: false });
      }
      
      // Clean CPF (remove formatting)
      const cleanCPF = cpf.replace(/\D/g, '');
      
      const user = await storage.getUserByCPF(cleanCPF);
      
      res.json({ exists: !!user });
    } catch (error) {
      console.error("Check CPF error:", error);
      res.status(200).json({ exists: false });
    }
  });

  app.post("/api/auth/forgot-password/verify", async (req, res) => {
    try {
      const { email, phone, cpf } = req.body;

      // Validate input
      if (!email || !phone || !cpf) {
        return res
          .status(400)
          .json({ message: "Email, telefone e CPF são obrigatórios" });
      }

      // Clean phone number and CPF (remove formatting)
      const cleanPhone = phone.replace(/\D/g, '');
      const cleanCPF = cpf.replace(/\D/g, '');

      // Find user by email AND phone AND CPF
      const user = await storage.getUserByEmail(email);
      
      if (!user || user.phone !== cleanPhone || user.cpf !== cleanCPF) {
        return res.status(400).json({ message: "Dados não encontrados" });
      }

      // Generate a temporary token for password reset (valid for 10 minutes)
      const resetToken = jwt.sign(
        { userId: user.id, type: 'password-reset' }, 
        JWT_SECRET, 
        { expiresIn: "10m" }
      );

      res.json({
        message: "Dados verificados com sucesso",
        resetToken,
        userId: user.id
      });
    } catch (error) {
      console.error("Forgot password verify error:", error);
      res.status(400).json({ message: "Erro ao verificar dados" });
    }
  });

  app.post("/api/auth/forgot-password/reset", async (req, res) => {
    try {
      const { resetToken, newPassword } = req.body;

      // Validate input
      if (!resetToken || !newPassword) {
        return res
          .status(400)
          .json({ message: "Token e nova senha são obrigatórios" });
      }

      // Verify reset token
      let decoded: any;
      try {
        decoded = jwt.verify(resetToken, JWT_SECRET);
        if (decoded.type !== 'password-reset') {
          throw new Error('Invalid token type');
        }
      } catch (error) {
        return res.status(400).json({ message: "Token inválido ou expirado" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update user password
      await storage.updateUserPassword(decoded.userId, hashedPassword);

      res.json({
        message: "Senha alterada com sucesso"
      });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(400).json({ message: "Erro ao redefinir senha" });
    }
  });

  // SMS Password Recovery - Send verification code
  app.post("/api/auth/send-sms-code", async (req, res) => {
    try {
      const { phone } = req.body;

      if (!phone) {
        return res.status(400).json({ message: "Telefone é obrigatório" });
      }

      // Clean phone number (remove formatting)
      const cleanPhone = phone.replace(/\D/g, '');

      // Check if user exists with this phone
      const user = await storage.getUserByPhone(cleanPhone);
      if (!user) {
        return res.status(400).json({ message: "Telefone não encontrado" });
      }

      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      // Save code to database
      await storage.createSmsVerificationCode(cleanPhone, code, 'password_reset');

      // Send SMS if Twilio is configured
      if (twilioClient && TWILIO_PHONE_NUMBER) {
        try {
          // Format phone for Brazil (+55)
          const formattedPhone = cleanPhone.startsWith('55') ? `+${cleanPhone}` : `+55${cleanPhone}`;
          
          await twilioClient.messages.create({
            body: `Mania Brasil - Seu código de verificação é: ${code}. Válido por 10 minutos.`,
            from: TWILIO_PHONE_NUMBER,
            to: formattedPhone
          });

          console.log(`SMS sent to ${formattedPhone} with code ${code}`);
        } catch (twilioError) {
          console.error('Twilio SMS error:', twilioError);
          return res.status(500).json({ message: "Erro ao enviar SMS. Tente novamente." });
        }
      } else {
        // For testing without Twilio
        console.log(`[TEST MODE] SMS code for ${cleanPhone}: ${code}`);
      }

      res.json({
        message: "Código de verificação enviado por SMS",
        phone: cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3') // Format for display
      });
    } catch (error) {
      console.error("Send SMS code error:", error);
      res.status(500).json({ message: "Erro ao enviar código SMS" });
    }
  });

  // SMS Password Recovery - Verify code
  app.post("/api/auth/verify-sms-code", async (req, res) => {
    try {
      const { phone, code } = req.body;

      if (!phone || !code) {
        return res.status(400).json({ message: "Telefone e código são obrigatórios" });
      }

      // Clean phone number
      const cleanPhone = phone.replace(/\D/g, '');

      // Check if valid code exists
      const validCode = await storage.getValidSmsCode(cleanPhone, 'password_reset');
      
      if (!validCode || validCode.code !== code) {
        return res.status(400).json({ message: "Código inválido ou expirado" });
      }

      // Mark code as used
      await storage.markSmsCodeAsUsed(validCode.id);

      // Find user
      const user = await storage.getUserByPhone(cleanPhone);
      if (!user) {
        return res.status(400).json({ message: "Usuário não encontrado" });
      }

      // Generate reset token valid for 10 minutes
      const resetToken = jwt.sign(
        { userId: user.id, type: 'sms-password-reset' },
        JWT_SECRET,
        { expiresIn: "10m" }
      );

      res.json({
        message: "Código verificado com sucesso",
        resetToken,
        userId: user.id
      });
    } catch (error) {
      console.error("Verify SMS code error:", error);
      res.status(500).json({ message: "Erro ao verificar código" });
    }
  });

  // SMS Password Recovery - Reset password
  app.post("/api/auth/reset-password-sms", async (req, res) => {
    try {
      const { resetToken, newPassword } = req.body;

      if (!resetToken || !newPassword) {
        return res.status(400).json({ message: "Token e nova senha são obrigatórios" });
      }

      // Verify reset token
      let decoded: any;
      try {
        decoded = jwt.verify(resetToken, JWT_SECRET);
        if (decoded.type !== 'sms-password-reset') {
          throw new Error('Invalid token type');
        }
      } catch (error) {
        return res.status(400).json({ message: "Token inválido ou expirado" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update user password
      await storage.updateUserPassword(decoded.userId, hashedPassword);

      res.json({
        message: "Senha alterada com sucesso"
      });
    } catch (error) {
      console.error("SMS password reset error:", error);
      res.status(500).json({ message: "Erro ao redefinir senha" });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Check for pending deposits and update if paid
      const pendingDeposits = await storage.getDepositsByUser(req.userId);
      const pendingOnes = pendingDeposits.filter((d) => d.status === "pending");

      for (const deposit of pendingOnes) {
        try {
          const verification = await verifyPixPayment(deposit.transactionId);

          if (verification.status === "completed") {
            // Update deposit status
            await storage.updateDepositStatus(
              deposit.transactionId,
              "completed",
            );

            // Update wallet balance
            const currentWallet = await storage.getWallet(deposit.userId);
            if (currentWallet && currentWallet.balance) {
              const newBalance =
                parseFloat(currentWallet.balance) + parseFloat(deposit.amount);
              await storage.updateWalletBalance(
                deposit.userId,
                newBalance.toFixed(2),
              );
            }

            // Process affiliate commission (auto-approved)
            try {
              await processAffiliateCommission(deposit.userId, deposit.amount);
              console.log(`Affiliate commission auto-approved for user ${deposit.userId} (from /auth/me)`);
            } catch (error) {
              console.error("Error processing affiliate commission:", error);
            }
          }
        } catch (error) {
          console.error(
            "Error checking pending deposit:",
            deposit.transactionId,
            error,
          );
        }
      }

      const wallet = await storage.getWallet(user.id);

      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        cpf: user.cpf,
        balance: wallet?.balance || "0.00",
      });
    } catch (error) {
      console.error("Me error:", error);
      res.status(500).json({ message: "Erro ao buscar usuário" });
    }
  });

  // User balance route - Optimized for performance
  app.get("/api/user/balance", authenticateToken, async (req: any, res) => {
    try {
      // Get wallet balance immediately without checking pending deposits
      const wallet = await storage.getWallet(req.userId);
      
      // Return balance immediately for better performance
      res.json({
        balance: wallet?.balance || "0.00",
        scratchBonus: wallet?.scratchBonus || 0,
        totalWagered: wallet?.totalWagered || "0.00",
      });
      
      // Check pending deposits asynchronously after response (non-blocking)
      // This improves response time from 3+ seconds to milliseconds
      setImmediate(async () => {
        try {
          const pendingDeposits = await storage.getDepositsByUser(req.userId);
          const pendingOnes = pendingDeposits.filter((d) => d.status === "pending");
          
          // Only check the most recent pending deposit to avoid multiple API calls
          const recentPending = pendingOnes.slice(0, 1);
          
          for (const deposit of recentPending) {
            try {
              const verification = await verifyPixPayment(deposit.transactionId);

              if (verification.status === "completed") {
                // Update deposit status
                await storage.updateDepositStatus(
                  deposit.transactionId,
                  "completed",
                );

                // Update wallet balance
                const currentWallet = await storage.getWallet(deposit.userId);
                if (currentWallet && currentWallet.balance) {
                  const newBalance =
                    parseFloat(currentWallet.balance) + parseFloat(deposit.amount);
                  await storage.updateWalletBalance(
                    deposit.userId,
                    newBalance.toFixed(2),
                  );
                }

                // Process affiliate commission (auto-approved)
                try {
                  await processAffiliateCommission(deposit.userId, deposit.amount);
                } catch (error) {
                  console.error("Error processing affiliate commission:", error);
                }
              }
            } catch (error) {
              // Silently handle errors in background process
            }
          }
        } catch (error) {
          // Silently handle errors in background process
        }
      });
    } catch (error) {
      console.error("Balance error:", error);
      res.status(500).json({ message: "Erro ao buscar saldo" });
    }
  });

  // Update user profile
  app.patch(
    "/api/user/update-profile",
    authenticateToken,
    async (req: any, res) => {
      try {
        const { name, email, phone } = req.body;

        // Validate input
        if (!name || !email || !phone) {
          return res
            .status(400)
            .json({ message: "Todos os campos são obrigatórios" });
        }
        
        // Check if this is a demo account (CPF 99999999999)
        const currentUser = await storage.getUser(req.userId);
        if (currentUser && currentUser.cpf === '99999999999') {
          return res.status(403).json({ message: "Contas demo não podem editar o perfil" });
        }

        // Check if email is already taken by another user
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser && existingUser.id !== req.userId) {
          return res.status(400).json({ message: "Email já está em uso" });
        }

        // Update user profile
        await storage.updateUserProfile(req.userId, { name, email, phone });

        res.json({ message: "Perfil atualizado com sucesso" });
      } catch (error) {
        console.error("Update profile error:", error);
        res.status(500).json({ message: "Erro ao atualizar perfil" });
      }
    },
  );

  // Change user password
  app.post(
    "/api/user/change-password",
    authenticateToken,
    async (req: any, res) => {
      try {
        const { currentPassword, newPassword } = req.body;

        // Get user
        const user = await storage.getUser(req.userId);
        if (!user) {
          return res.status(404).json({ message: "Usuário não encontrado" });
        }

        // Verify current password
        const validPassword = await bcrypt.compare(
          currentPassword,
          user.password,
        );
        if (!validPassword) {
          return res.status(400).json({ message: "Senha atual incorreta" });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        await storage.updateUserPassword(req.userId, hashedPassword);

        res.json({ message: "Senha alterada com sucesso" });
      } catch (error) {
        console.error("Change password error:", error);
        res.status(500).json({ message: "Erro ao alterar senha" });
      }
    },
  );

  // User Level route - Calculate level based on total wagered
  app.get("/api/user/level", authenticateToken, async (req: any, res) => {
    try {
      const wallet = await storage.getWallet(req.userId);
      const totalWagered = parseFloat(wallet?.totalWagered || "0");

      // Calculate current level (0-100) based on total wagered
      // Custom thresholds for reward levels with more reasonable progression
      const levelThresholds: Record<number, number> = {
        1: 0,       // Nível 1 é o inicial (0 apostado)
        2: 50,      // R$50 apostados para nível 2 (forçar primeiro upgrade)
        5: 150,     // R$150 apostados (reduzido)
        10: 400,    // R$400 apostados (bem mais baixo)
        20: 1200,   // R$1,200 apostados (mais acessível)
        30: 3000,   // R$3,000 apostados (reduzido)
        50: 8000,   // R$8,000 apostados (bem mais baixo)
        70: 20000,  // R$20,000 apostados (reduzido)
        100: 50000, // R$50,000 apostados (muito mais alcançável)
      };

      // Function to calculate required amount for any level
      function getRequiredForLevel(n: number): number {
        if (levelThresholds[n]) {
          return levelThresholds[n];
        }
        // Exponential growth between reward levels
        const rewardLevels = [1, 2, 5, 10, 20, 30, 50, 70, 100];
        const prevRewardLevel = rewardLevels.filter((l) => l < n).pop() || 0;
        const nextRewardLevel = rewardLevels.find((l) => l > n) || 100;

        if (prevRewardLevel <= 1) return 50 + (n - 2) * 33; // Levels 3-4 (progressão mais suave após nível 2)

        const prevRequired = levelThresholds[prevRewardLevel];
        const nextRequired = levelThresholds[nextRewardLevel];
        const levelsBetween = nextRewardLevel - prevRewardLevel;
        const positionBetween = n - prevRewardLevel;

        return Math.floor(
          prevRequired +
            ((nextRequired - prevRequired) / levelsBetween) * positionBetween,
        );
      }

      // Start at level 1 by default (new users)
      let level = 1;
      let levelProgress = 0;
      let requiredForCurrentLevel = 0;
      let requiredForNextLevel = getRequiredForLevel(2); // Level 2 requires R$50

      // Find current level
      for (let n = 1; n <= 100; n++) {
        const requiredAmount = getRequiredForLevel(n);

        if (totalWagered >= requiredAmount) {
          level = n;
          requiredForCurrentLevel = requiredAmount;
          // Calculate requirement for next level
          if (n < 100) {
            requiredForNextLevel = getRequiredForLevel(n + 1);
          } else {
            requiredForNextLevel = requiredAmount; // Max level
          }
        } else {
          // If we haven't reached the required amount for level n
          // The next level requirement is already set correctly
          break;
        }
      }

      // Calculate progress to next level
      if (level < 100) {
        const progressAmount = totalWagered - requiredForCurrentLevel;
        const neededAmount = requiredForNextLevel - requiredForCurrentLevel;
        levelProgress = Math.floor((progressAmount / neededAmount) * 100);
      } else {
        levelProgress = 100; // Max level
      }

      res.json({
        level,
        totalWagered: totalWagered.toFixed(2),
        requiredForCurrentLevel: requiredForCurrentLevel.toFixed(2),
        requiredForNextLevel: requiredForNextLevel.toFixed(2),
        progress: levelProgress,
        maxLevel: level === 100,
      });
    } catch (error) {
      console.error("Level error:", error);
      res.status(500).json({ error: "Error fetching level" });
    }
  });

  // User XP route (kept for backwards compatibility)
  app.get("/api/user/xp", authenticateToken, async (req: any, res) => {
    try {
      const games = await storage.getGamesByUser(req.userId);
      const xp = games.length * 10;
      res.json({ xp });
    } catch (error) {
      console.error("XP error:", error);
      res.status(500).json({ error: "Error fetching XP" });
    }
  });

  // Level rewards route - Get available rewards and claimed status
  app.get("/api/level/rewards", authenticateToken, async (req: any, res) => {
    try {
      const wallet = await storage.getWallet(req.userId);
      const totalWagered = parseFloat(wallet?.totalWagered || "0");
      const claimedRewards = await storage.getLevelRewardsClaimed(req.userId);

      // Define rewards for specific levels only - Total: R$50,000
      const levelRewards: Record<number, number> = {
        1: 10, // R$10 (0.02%)
        5: 50, // R$50 (0.1%)
        10: 100, // R$100 (0.2%)
        20: 250, // R$250 (0.5%)
        30: 500, // R$500 (1%)
        50: 2000, // R$2,000 (4%)
        70: 5590, // R$5,590 (11.18%)
        100: 41500, // R$41,500 (83%)
      };

      // Custom thresholds for reward levels
      const levelThresholds: Record<number, number> = {
        1: 100, // R$100 apostados
        5: 1000, // R$1,000 apostados
        10: 5000, // R$5,000 apostados
        20: 20000, // R$20,000 apostados
        30: 50000, // R$50,000 apostados
        50: 150000, // R$150,000 apostados
        70: 300000, // R$300,000 apostados
        100: 1000000, // R$1,000,000 apostados
      };

      // Function to calculate required amount for any level
      function getRequiredForLevel(n: number): number {
        if (levelThresholds[n]) {
          return levelThresholds[n];
        }
        const rewardLevels = [1, 5, 10, 20, 30, 50, 70, 100];
        const prevRewardLevel = rewardLevels.filter((l) => l < n).pop() || 0;
        const nextRewardLevel = rewardLevels.find((l) => l > n) || 100;

        if (prevRewardLevel === 0) return n * 20;

        const prevRequired = levelThresholds[prevRewardLevel];
        const nextRequired = levelThresholds[nextRewardLevel];
        const levelsBetween = nextRewardLevel - prevRewardLevel;
        const positionBetween = n - prevRewardLevel;

        return Math.floor(
          prevRequired +
            ((nextRequired - prevRequired) / levelsBetween) * positionBetween,
        );
      }

      // Calculate current level
      let currentLevel = 0;
      for (let n = 1; n <= 100; n++) {
        const requiredAmount = getRequiredForLevel(n);
        if (totalWagered >= requiredAmount) {
          currentLevel = n;
        } else {
          break;
        }
      }

      // Build rewards list with claimed status (only for levels that have rewards)
      const rewards = [];
      for (let level = 1; level <= currentLevel; level++) {
        if (levelRewards[level]) {
          const claimed = claimedRewards.some((r) => r.level === level);
          rewards.push({
            level,
            reward: levelRewards[level],
            claimed,
            available: !claimed,
          });
        }
      }

      res.json({
        currentLevel,
        totalWagered: totalWagered.toFixed(2),
        rewards,
        totalUnclaimed: rewards
          .filter((r) => r.available)
          .reduce((sum, r) => sum + r.reward, 0),
      });
    } catch (error) {
      console.error("Level rewards error:", error);
      res.status(500).json({ error: "Error fetching level rewards" });
    }
  });

  // Claim level reward
  app.post(
    "/api/level/claim/:level",
    authenticateToken,
    async (req: any, res) => {
      try {
        const level = parseInt(req.params.level);

        // Verify user has reached this level
        const wallet = await storage.getWallet(req.userId);
        const totalWagered = parseFloat(wallet?.totalWagered || "0");

        // Custom thresholds for reward levels
        const levelThresholds: Record<number, number> = {
          1: 0,       // Nível 1 é o inicial (0 apostado)
          2: 50,      // R$50 apostados para nível 2 (forçar primeiro upgrade)
          5: 150,     // R$150 apostados (reduzido)
          10: 400,    // R$400 apostados (bem mais baixo)
          20: 1200,   // R$1,200 apostados (mais acessível)
          30: 3000,   // R$3,000 apostados (reduzido)
          50: 8000,   // R$8,000 apostados (bem mais baixo)
          70: 20000,  // R$20,000 apostados (reduzido)
          100: 50000, // R$50,000 apostados (muito mais alcançável)
        };

        // Function to calculate required amount for any level
        function getRequiredForLevel(n: number): number {
          if (levelThresholds[n]) {
            return levelThresholds[n];
          }
          const rewardLevels = [1, 2, 5, 10, 20, 30, 50, 70, 100];
          const prevRewardLevel = rewardLevels.filter((l) => l < n).pop() || 0;
          const nextRewardLevel = rewardLevels.find((l) => l > n) || 100;

          if (prevRewardLevel <= 1) return 50 + (n - 2) * 33; // Levels 3-4 (progressão mais suave após nível 2)

          const prevRequired = levelThresholds[prevRewardLevel];
          const nextRequired = levelThresholds[nextRewardLevel];
          const levelsBetween = nextRewardLevel - prevRewardLevel;
          const positionBetween = n - prevRewardLevel;

          return Math.floor(
            prevRequired +
              ((nextRequired - prevRequired) / levelsBetween) * positionBetween,
          );
        }

        // Calculate if user has reached this level
        const requiredAmount = getRequiredForLevel(level);
        if (totalWagered < requiredAmount) {
          return res
            .status(400)
            .json({ error: "Você ainda não alcançou este nível" });
        }

        // Check if already claimed
        const alreadyClaimed = await storage.hasClaimedLevelReward(
          req.userId,
          level,
        );
        if (alreadyClaimed) {
          return res.status(400).json({ error: "Recompensa já resgatada" });
        }

        // Define rewards for specific levels - now in scratch bonus tickets
        const levelRewards: Record<number, number> = {
          1: 10, // 10 Mania Bônus
          5: 50, // 50 Mania Bônus
          10: 100, // 100 Mania Bônus
          20: 250, // 250 Mania Bônus
          30: 500, // 500 Mania Bônus
          50: 2000, // 2000 Mania Bônus
          70: 5590, // 5590 Mania Bônus
          100: 41500, // 41500 Mania Bônus
        };

        const rewardAmount = levelRewards[level];
        if (!rewardAmount) {
          return res.status(400).json({ error: "Nível inválido" });
        }

        // Add reward to user scratch bonus
        const currentScratchBonus = wallet?.scratchBonus || 0;
        const newScratchBonus = currentScratchBonus + rewardAmount;
        await storage.updateWalletScratchBonus(req.userId, newScratchBonus);

        // Record the claim
        await storage.createLevelRewardClaimed({
          userId: req.userId,
          level,
          reward: rewardAmount.toString(),
        });

        res.json({
          success: true,
          reward: rewardAmount,
          newScratchBonus: newScratchBonus,
        });
      } catch (error) {
        console.error("Claim reward error:", error);
        res.status(500).json({ error: "Erro ao resgatar recompensa" });
      }
    },
  );

  // Coupon routes
  app.get("/api/coupons/current", authenticateToken, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      let couponDetails = null;
      if (user.currentCoupon) {
        const coupon = await storage.getCoupon(user.currentCoupon);
        if (coupon && coupon.isActive) {
          couponDetails = {
            code: coupon.code,
            description: coupon.description,
            minDeposit: coupon.minDeposit
          };
        }
      }
      
      res.json({
        hasAppliedCoupon: user.couponApplied === 1,
        currentCoupon: user.currentCoupon,
        couponDetails
      });
    } catch (error) {
      console.error("Get current coupon error:", error);
      res.status(500).json({ error: "Erro ao buscar cupom atual" });
    }
  });
  
  app.post("/api/coupons/apply", authenticateToken, async (req: any, res) => {
    try {
      const { code } = req.body;
      
      if (!code) {
        return res.status(400).json({ error: "Código do cupom é obrigatório" });
      }
      
      // Get user
      const user = await storage.getUser(req.userId);
      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }
      
      // Check if user already has a coupon applied
      if (user.couponApplied === 1) {
        return res.status(400).json({ error: "Você já tem um cupom aplicado" });
      }
      
      // Get coupon
      const coupon = await storage.getCoupon(code.toUpperCase());
      if (!coupon) {
        return res.status(404).json({ error: "Cupom não encontrado" });
      }
      
      // Check if coupon is active
      if (!coupon.isActive) {
        return res.status(400).json({ error: "Este cupom não está mais ativo" });
      }
      
      // Check if coupon has expired
      if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
        return res.status(400).json({ error: "Este cupom expirou" });
      }
      
      // Check usage limits
      if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
        return res.status(400).json({ error: "Este cupom atingiu o limite de uso" });
      }
      
      // Check per-user limit
      const userUses = await storage.getUserCouponUses(req.userId, coupon.id);
      if (userUses.length >= coupon.perUserLimit) {
        return res.status(400).json({ error: "Você já usou este cupom o máximo de vezes permitido" });
      }
      
      // Apply coupon to user
      await storage.applyCouponToUser(req.userId, coupon.code);
      
      res.json({
        success: true,
        message: "Cupom aplicado com sucesso!",
        coupon: {
          code: coupon.code,
          description: coupon.description,
          minDeposit: coupon.minDeposit
        }
      });
    } catch (error) {
      console.error("Apply coupon error:", error);
      res.status(500).json({ error: "Erro ao aplicar cupom" });
    }
  });
  
  app.delete("/api/coupons/remove", authenticateToken, async (req: any, res) => {
    try {
      await storage.removeCouponFromUser(req.userId);
      res.json({ success: true, message: "Cupom removido com sucesso" });
    } catch (error) {
      console.error("Remove coupon error:", error);
      res.status(500).json({ error: "Erro ao remover cupom" });
    }
  });

  // Get user deposits only (for checking first deposit)
  app.get("/api/user/deposits", authenticateToken, async (req: any, res) => {
    try {
      const deposits = await storage.getDepositsByUser(req.userId);
      const completedDeposits = deposits.filter((d: any) => d.status === 'completed');
      res.json(completedDeposits);
    } catch (error) {
      console.error("Get deposits error:", error);
      res.status(500).json({ error: "Error fetching deposits" });
    }
  });

  app.get(
    "/api/user/transactions",
    authenticateToken,
    async (req: any, res) => {
      try {
        // Get deposits and withdrawals for the user
        const deposits = await storage.getDepositsByUser(req.userId);
        const withdrawals = await storage.getWithdrawalsByUser(req.userId);

        console.log(
          "Raw withdrawals from DB:",
          JSON.stringify(withdrawals, null, 2),
        );

        // Format deposits
        const formattedDeposits = deposits.map((d: any) => ({
          id: d.id,
          displayId: d.displayId,
          type: "deposit",
          amount: d.amount,
          status: d.status,
          transactionId: d.transactionId,
          createdAt: d.createdAt,
        }));

        // Format withdrawals
        const formattedWithdrawals = withdrawals.map((w: any) => ({
          id: w.id,
          displayId: w.displayId,
          type: "withdrawal",
          amount: w.amount,
          status: w.status,
          pixKey: w.pixKey,
          pixKeyType: w.pixKeyType,
          createdAt: w.requestedAt || w.createdAt, // Use requestedAt from withdrawals table
          requestedAt: w.requestedAt, // Also include requestedAt for debugging
          processedAt: w.processedAt, // Include processedAt for receipt
          endToEndId: w.endToEndId, // Include end-to-end ID for receipt
          transactionHash: w.transactionHash, // Include transaction hash
          originName: w.originName,
          originCnpj: w.originCnpj,
          destinationName: w.destinationName,
          destinationDocument: w.destinationDocument
        }));

        // Combine and sort by date
        const allTransactions = [
          ...formattedDeposits,
          ...formattedWithdrawals,
        ].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );

        console.log("Formatted withdrawals:", formattedWithdrawals);

        res.json(allTransactions);
      } catch (error) {
        console.error("Get transactions error:", error);
        res.status(500).json({ error: "Error fetching transactions" });
      }
    },
  );

  // Withdrawal routes
  app.post(
    "/api/withdrawals/create",
    authenticateToken,
    async (req: any, res) => {
      try {
        const { amount, pixKey } = req.body;

        // Validate input
        if (!amount || !pixKey) {
          return res
            .status(400)
            .json({ error: "Valor e chave PIX são obrigatórios" });
        }

        const withdrawalAmount = parseFloat(amount);
        if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
          return res.status(400).json({ error: "Valor inválido" });
        }

        // Identify PIX key type - Only CPF/CNPJ allowed
        const pixKeyType = identifyPixKeyType(pixKey);
        if (!pixKeyType) {
          return res.status(400).json({ error: "Chave PIX inválida. Use apenas CPF ou CNPJ" });
        }
        
        // Check if this is a demo account (CPF 99999999999)
        const user = await storage.getUser(req.userId);
        if (user && user.cpf === '99999999999') {
          return res.status(403).json({ error: "Contas demo não podem fazer saques" });
        }

        // Get user wallet
        const wallet = await storage.getWallet(req.userId);
        if (!wallet) {
          return res.status(400).json({ error: "Carteira não encontrada" });
        }

        // Check if user has sufficient balance
        const currentBalance = parseFloat(wallet.balance || "0");
        if (currentBalance < withdrawalAmount) {
          return res.status(400).json({ error: "Saldo insuficiente" });
        }

        // Deduct amount from wallet
        const newBalance = currentBalance - withdrawalAmount;
        await storage.updateWalletBalance(req.userId, newBalance.toFixed(2));

        // Create withdrawal request
        const withdrawal = await storage.createWithdrawal({
          userId: req.userId,
          displayId: 0, // Will be generated by storage
          amount: withdrawalAmount.toFixed(2),
          pixKey,
          pixKeyType,
          status: "pending",
        });

        console.log("Created withdrawal:", withdrawal);

        // Send Discord notification for withdrawal
        try {
          const user = await storage.getUser(req.userId);
          const { notifyWithdrawal } = await import('./discord-webhook');
          await notifyWithdrawal({
            userId: req.userId,
            userName: user?.name || 'Unknown',
            amount: withdrawalAmount.toFixed(2),
            pixKey: pixKey,
            status: 'pending'
          });
        } catch (error) {
          console.error("Error sending Discord notification for withdrawal:", error);
        }

        res.json({
          message: "Saque solicitado com sucesso",
          withdrawal,
        });
      } catch (error) {
        console.error("Create withdrawal error:", error);
        res.status(500).json({ error: "Erro ao processar saque" });
      }
    },
  );

  // Get user withdrawals with receipt data
  app.get("/api/user/withdrawals", authenticateToken, async (req: any, res) => {
    try {
      const userWithdrawals = await db
        .select()
        .from(withdrawals)
        .where(eq(withdrawals.userId, req.userId))
        .orderBy(desc(withdrawals.requestedAt));

      const formattedWithdrawals = userWithdrawals.map((w) => ({
        id: w.id,
        displayId: w.displayId || `${w.id}`.padStart(5, "0"),
        amount: w.amount,
        pixKey: w.pixKey,
        pixKeyType: w.pixKeyType || "PIX",
        status: w.status,
        requestedAt: w.requestedAt,
        processedAt: w.processedAt,
        adminNotes: w.adminNotes,
        // Receipt fields
        endToEndId: w.endToEndId,
        transactionHash: w.transactionHash,
        originName: w.originName || "Mania Brasil",
        originCnpj: w.originCnpj || "62.134.421/0001-62",
        destinationName: w.destinationName,
        destinationDocument: w.destinationDocument,
      }));

      res.json(formattedWithdrawals);
    } catch (error) {
      console.error("Get user withdrawals error:", error);
      res.status(500).json({ error: "Erro ao buscar saques" });
    }
  });

  app.post(
    "/api/withdrawals/:id/cancel",
    authenticateToken,
    async (req: any, res) => {
      try {
        const withdrawalId = parseInt(req.params.id);

        // Get withdrawal
        const withdrawal = await storage.getWithdrawal(withdrawalId);
        if (!withdrawal) {
          return res.status(404).json({ error: "Saque não encontrado" });
        }

        // Check if withdrawal belongs to user
        if (withdrawal.userId !== req.userId) {
          return res.status(403).json({ error: "Acesso negado" });
        }

        // Check if withdrawal can be cancelled
        if (withdrawal.status !== "pending") {
          return res
            .status(400)
            .json({ error: "Este saque não pode ser cancelado" });
        }

        // Get user wallet
        const wallet = await storage.getWallet(req.userId);
        if (!wallet) {
          return res.status(400).json({ error: "Carteira não encontrada" });
        }

        // Refund amount to wallet
        const currentBalance = parseFloat(wallet.balance || "0");
        const refundAmount = parseFloat(withdrawal.amount);
        const newBalance = currentBalance + refundAmount;
        await storage.updateWalletBalance(req.userId, newBalance.toFixed(2));

        // Update withdrawal status
        await storage.updateWithdrawalStatus(withdrawalId, "cancelled");

        res.json({
          message: "Saque cancelado com sucesso",
          newBalance: newBalance.toFixed(2),
        });
      } catch (error) {
        console.error("Cancel withdrawal error:", error);
        res.status(500).json({ error: "Erro ao cancelar saque" });
      }
    },
  );

  // Get claimed tier rewards endpoint
  app.get("/api/tier-rewards/claimed", authenticateToken, async (req: any, res) => {
    try {
      const claimedRewards = await storage.getTierRewardsClaimed(req.userId);
      res.json(claimedRewards);
    } catch (error) {
      console.error("Get claimed tier rewards error:", error);
      res.status(500).json({ error: "Erro ao buscar recompensas resgatadas" });
    }
  });
  
  // Claim tier rewards endpoint
  app.post("/api/tier-rewards/claim", authenticateToken, async (req: any, res) => {
    try {
      const { tier, amount, level } = req.body;
      
      if (!tier || !amount || level === undefined) {
        return res.status(400).json({ error: "Tier, quantidade e nível são obrigatórios" });
      }
      
      // Check if user has already claimed this tier reward
      const hasClaimed = await storage.hasClaimedTierReward(req.userId, tier, level);
      if (hasClaimed) {
        return res.status(400).json({ error: "Você já resgatou esta recompensa" });
      }
      
      // Get user wallet
      const wallet = await storage.getWallet(req.userId);
      if (!wallet) {
        return res.status(400).json({ error: "Carteira não encontrada" });
      }
      
      // Add Mania Bônus to user's scratchBonus
      const currentBonus = wallet.scratchBonus || 0;
      const newBonus = currentBonus + amount;
      
      // Update wallet with new scratch bonus
      await storage.updateWalletScratchBonus(req.userId, newBonus);
      
      // Record that this tier reward has been claimed
      await storage.createTierRewardClaimed({
        userId: req.userId,
        tier,
        level,
        amount
      });
      
      res.json({
        message: `${amount} Mania Bônus adicionados com sucesso!`,
        newScratchBonus: newBonus
      });
    } catch (error) {
      console.error("Claim tier reward error:", error);
      res.status(500).json({ error: "Erro ao resgatar recompensa" });
    }
  });

  // Helper function to identify PIX key type
  function identifyPixKeyType(pixKey: string): string | null {
    // Remove spaces and special characters for validation
    const cleanKey = pixKey.replace(/[\s\-\.]/g, "");

    // CPF pattern (11 digits)
    if (/^\d{11}$/.test(cleanKey)) {
      return "cpf";
    }
    
    // CNPJ pattern (14 digits)
    if (/^\d{14}$/.test(cleanKey)) {
      return "cnpj";
    }

    // Return null for invalid key types (only CPF/CNPJ allowed)
    return null;
  }

  // Game routes

  // Game PIX routes
  app.post(
    "/api/games/pix/create",
    authenticateToken,
    async (req: any, res) => {
      try {
        const { mode = "normal" } = req.body;
        const wallet = await storage.getWallet(req.userId);

        const gameModes: Record<string, { cost: number; multiplier: number }> =
          {
            normal: { cost: 1, multiplier: 1 },
            prata: { cost: 5, multiplier: 5 },
            ouro: { cost: 10, multiplier: 10 },
            diamante: { cost: 100, multiplier: 100 },
          };

        const gameMode = gameModes[mode] || gameModes.normal;

        if (!wallet || parseFloat(wallet.balance || "0") < gameMode.cost) {
          return res.status(400).json({ error: "Saldo insuficiente" });
        }

        // Generate random values
        const possibleValues = [
          "R$ 0,50",
          "R$ 1",
          "R$ 2",
          "R$ 10",
          "R$ 50",
          "R$ 100",
          "R$ 500",
          "R$ 1000",
        ];
        const values = [];
        for (let i = 0; i < 9; i++) {
          values.push(
            possibleValues[Math.floor(Math.random() * possibleValues.length)],
          );
        }

        // Determine if won (simplified logic)
        const won = Math.random() < 0.15; // 15% chance
        if (won) {
          const winValue = possibleValues[Math.floor(Math.random() * 4)]; // Lower values more likely
          values[0] = winValue;
          values[4] = winValue;
          values[8] = winValue;
        }

        // Deduct cost and update total wagered
        const newBalance = parseFloat(wallet.balance || "0") - gameMode.cost;
        await storage.updateWalletBalance(req.userId, newBalance.toFixed(2));
        await storage.incrementTotalWagered(
          req.userId,
          gameMode.cost.toString(),
        );

        // Store game state
        const gameId = Math.random().toString(36).substring(7);
        activeGames.set(gameId, {
          userId: req.userId,
          type: "pix",
          mode,
          cost: gameMode.cost,
          values,
          won,
          createdAt: new Date(),
        });

        res.json({
          gameId,
          hiddenValues: values,
          mode,
          cost: gameMode.cost,
        });
      } catch (error) {
        console.error("PIX game error:", error);
        res.status(500).json({ error: "Erro ao criar jogo" });
      }
    },
  );

  app.post(
    "/api/games/pix/:gameId/reveal",
    authenticateToken,
    async (req: any, res) => {
      try {
        const { gameId } = req.params;

        // Retrieve game state
        const gameState = activeGames.get(gameId);
        if (!gameState || gameState.userId !== req.userId) {
          return res.status(404).json({ error: "Jogo não encontrado" });
        }

        const { won, mode, cost } = gameState;
        let prize = 0;

        if (won) {
          // Prize based on mode
          const modeMultipliers: Record<string, number> = {
            normal: 1,
            prata: 5,
            ouro: 10,
            diamante: 100,
          };

          const basePrizes = [2, 5, 10, 20, 50, 100];
          const basePrize =
            basePrizes[Math.floor(Math.random() * basePrizes.length)];
          prize = basePrize * (modeMultipliers[mode] || 1);
        }

        if (prize > 0) {
          const wallet = await storage.getWallet(req.userId);
          if (wallet) {
            const newBalance = parseFloat(wallet.balance || "0") + prize;
            await storage.updateWalletBalance(
              req.userId,
              newBalance.toFixed(2),
            );
          }
        }



        // Clean up game state
        activeGames.delete(gameId);

        res.json({ won, prize });
      } catch (error) {
        console.error("PIX reveal error:", error);
        res.status(500).json({ error: "Erro ao revelar resultado" });
      }
    },
  );


  // Prize Scratch Card Games

  // Generic scratch games route (for chest games)
  app.post(
    "/api/games/scratch",
    authenticateToken,
    async (req: any, res) => {
      try {
        const { gameType, multiplier = 1, useBonus = false } = req.body;
        const userId = req.userId;
        
        // Map gameType to correct premio type and database enum values
        const gameTypeMap: Record<string, string> = {
          'premio-pix': 'premio-pix',
          'premio-me-mimei': 'premio-me-mimei',
          'premio-eletronicos': 'premio-eletronicos',
          'premio-super-premios': 'premio-super-premios',
          'bau-pix': 'bau-pix',
          'bau-me-mimei': 'bau-me-mimei',
          'bau-eletronicos': 'bau-eletronicos',
          'bau-super-premios': 'bau-super-premios'
        };
        
        // Map to valid database enum values
        const dbGameTypeMap: Record<string, string> = {
          'premio-pix': 'pix_na_conta',
          'premio-me-mimei': 'me_mimei',
          'premio-eletronicos': 'sonho_consumo',
          'premio-super-premios': 'super_premios',
          'bau-pix': 'pix_na_conta',
          'bau-me-mimei': 'me_mimei',
          'bau-eletronicos': 'sonho_consumo',
          'bau-super-premios': 'super_premios'
        };

        if (!gameType || !gameTypeMap[gameType]) {
          return res.status(400).json({ error: "Tipo de jogo inválido" });
        }

        const mappedType = gameTypeMap[gameType];
        const wallet = await storage.getWallet(userId);
        
        // Define base costs for each game type
        const baseCosts: Record<string, number> = {
          'premio-pix': 1.00,
          'premio-me-mimei': 1.00,
          'premio-eletronicos': 1.00,
          'premio-super-premios': 20.00,
          'bau-pix': 1.00,
          'bau-me-mimei': 1.00,
          'bau-eletronicos': 1.00,
          'bau-super-premios': 20.00
        };
        
        const baseCost = baseCosts[mappedType];
        const cost = useBonus ? 0 : baseCost * multiplier;
        const scratchBonusCost = useBonus ? multiplier : 0;

        // Check if user has sufficient funds
        if (!useBonus && (!wallet || parseFloat(wallet.balance || '0') < cost)) {
          return res.status(400).json({ error: "Saldo insuficiente" });
        }

        // Check if user has sufficient scratch bonus when using bonus
        if (useBonus && wallet) {
          const currentScratchBonus = wallet.scratchBonus || 0;
          if (currentScratchBonus < scratchBonusCost) {
            return res.status(400).json({ error: "Mania Bônus insuficientes" });
          }
        }

        // Get prize probabilities from database
        const gameKey = mappedType.replace(/-/g, '_');
        const { probabilities } = await storage.getGameProbabilities(gameKey);
        
        if (!probabilities || probabilities.length === 0) {
          console.error(`No probabilities configured for game: ${gameKey}`);
          return res.status(500).json({ error: "Jogo não configurado corretamente" });
        }

        // Extract prize values from probabilities
        const prizeValues = probabilities.map(p => p.value);

        // Check if this is the test account
        const user = await storage.getUser(userId);
        const isTestAccount = user?.email === "teste@gmail.com";

        // Determine if the player wins using configured probabilities
        let winningValue: string | null = null;
        
        if (isTestAccount) {
          // Test account always wins a random prize
          winningValue = prizeValues[Math.floor(Math.random() * prizeValues.length)];
        } else {
          // Use weighted random selection based on configured probabilities
          const random = Math.random() * 100;
          let cumulativeProbability = 0;
          
          for (const prize of probabilities) {
            cumulativeProbability += prize.probability;
            if (random <= cumulativeProbability) {
              winningValue = prize.value;
              break;
            }
          }
        }

        // Generate hidden values for the scratch game
        const hiddenValues: string[] = [];
        
        if (winningValue) {
          // Place winning value 3 times
          hiddenValues.push(winningValue, winningValue, winningValue);
          
          // Fill rest with random values
          const allValues = prizeValues.concat(["", "", ""]);
          for (let i = 3; i < 9; i++) {
            let value: string;
            do {
              value = allValues[Math.floor(Math.random() * allValues.length)];
            } while (
              hiddenValues.filter((v) => v === value).length >= 2 &&
              value !== ""
            );
            hiddenValues.push(value);
          }
        } else {
          // Generate non-winning grid
          const allValues = prizeValues.concat(["", "", "", ""]);
          for (let i = 0; i < 9; i++) {
            let value: string = allValues[Math.floor(Math.random() * allValues.length)];
            while (
              hiddenValues.filter((v) => v === value).length >= 2 &&
              value !== ""
            ) {
              value = allValues[Math.floor(Math.random() * allValues.length)];
            }
            hiddenValues.push(value);
          }
        }

        // Shuffle the values
        for (let i = hiddenValues.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [hiddenValues[i], hiddenValues[j]] = [hiddenValues[j], hiddenValues[i]];
        }

        // Deduct cost or scratch bonus
        if (useBonus) {
          const newScratchBonus = (wallet?.scratchBonus || 0) - scratchBonusCost;
          await storage.updateWalletScratchBonus(userId, newScratchBonus);
        } else {
          const newBalance = parseFloat(wallet?.balance || "0") - cost;
          await storage.updateWalletBalance(userId, newBalance.toFixed(2));
          await storage.incrementTotalWagered(userId, cost.toString());
        }

        // Calculate actual prize (apply multiplier if won)
        let prize = 0;
        if (winningValue) {
          prize = parseFloat(winningValue) * multiplier;
          
          // Update wallet with winnings
          const currentBalance = parseFloat(wallet?.balance || "0");
          const newBalance = currentBalance + prize;
          await storage.updateWalletBalance(userId, newBalance.toFixed(2));
        }

        // Create game record with correct database enum value
        const gameRecord = {
          userId,
          gameType: dbGameTypeMap[mappedType] || mappedType, // Use mapped DB value
          cost: cost.toFixed(2),
          prize: prize.toFixed(2),
          result: JSON.stringify(hiddenValues),
          won: winningValue !== null,
          gameData: JSON.stringify({ multiplier, type: 'chest' })
        };
        
        await storage.createGame(gameRecord as any);

        // Return response in the format expected by the frontend
        res.json({
          id: Math.random().toString(36).substring(7),
          values: hiddenValues,
          prizeValue: winningValue ? (parseFloat(winningValue) * multiplier).toFixed(2) : null,
          won: winningValue !== null
        });

      } catch (error) {
        console.error("Scratch game error:", error);
        res.status(500).json({ error: "Erro ao criar jogo" });
      }
    }
  );

  // Premio PIX routes
  app.post(
    "/api/games/premio-pix/create",
    authenticateOptionalWithWelcome,
    async (req: any, res) => {
      try {
        const { multiplier = 1, freePlay = false, useBonus = false, isWelcomeUser = false } = req.body;
        const userId = req.userId;
        
        // For non-authenticated users, skip wallet checks
        if (!userId) {
          if (!freePlay || !isWelcomeUser) {
            return res.status(401).json({ error: "Autenticação requerida" });
          }
        }
        
        const wallet = userId ? await storage.getWallet(userId) : null;
        const baseCost = 1.00; // Base cost for PIX scratch card
        const cost = (freePlay || useBonus) ? 0 : baseCost * multiplier;
        const scratchBonusCost = useBonus ? multiplier : 0; // Scratch bonus cost is multiplier

        if (!freePlay && !useBonus && userId && (!wallet || parseFloat(wallet.balance || '0') < cost)) {
          return res.status(400).json({ error: "Saldo insuficiente" });
        }

        // Get prize values from database probabilities
        const probabilities = await storage.getPrizeProbabilitiesByGame('premio-pix');
        const prizeValues = probabilities.length > 0 
          ? probabilities.map(p => p.prizeValue) 
          : ["0.50", "1.00", "2.00", "3.00", "4.00", "5.00", "10.00", "15.00", "20.00", "50.00", "100.00", "200.00", "500.00", "1000.00", "2000.00", "5000.00", "10000.00", "100000.00"];

        const hiddenValues: string[] = [];

        // Check if this is the test account
        const user = userId ? await storage.getUser(userId) : null;
        const isTestAccount = user?.email === "teste@gmail.com";

        // Use weighted probability system from database
        let winningValue: string | null = null;
        
        if (isTestAccount) {
          // Test account always wins a random prize
          winningValue = prizeValues[Math.floor(Math.random() * prizeValues.length)];
          console.log("Test account detected - always wins:", winningValue);
        } else {
          // Use weighted random selection from database
          const selectedPrize = await performWeightedPrizeSelection('premio-pix');
          
          if (selectedPrize) {
            // Player wins based on weighted probability
            winningValue = selectedPrize;
            console.log(`Weighted selection: Won ${winningValue}`);
          } else {
            // Fallback to 30% chance if database selection fails
            const winChance = Math.random();
            console.log(`Fallback - Win chance: ${winChance}, Won: ${winChance < 0.30}`);
            
            if (winChance < 0.30) {
              const weightedIndex = Math.floor(Math.pow(Math.random(), 2) * prizeValues.length);
              winningValue = prizeValues[weightedIndex];
              console.log(`Won ${winningValue}`);
            }
          }
        }

        // Generate the grid based on whether we have a winner
        if (winningValue) {
          // Place winning value 3 times
          hiddenValues.push(winningValue, winningValue, winningValue);

          // Fill rest with random values (ensuring no accidental 3-match)
          const allValues = prizeValues.concat(["", "", ""]);
          for (let i = 3; i < 9; i++) {
            let value: string;
            do {
              value = allValues[Math.floor(Math.random() * allValues.length)];
            } while (
              hiddenValues.filter((v) => v === value).length >= 2 &&
              value !== ""
            );
            hiddenValues.push(value);
          }
        } else {
          // Generate non-winning grid
          const allValues = prizeValues.concat(["", "", "", ""]);
          for (let i = 0; i < 9; i++) {
            let value = allValues[Math.floor(Math.random() * allValues.length)];
            // Ensure no value appears 3 times
            while (
              hiddenValues.filter((v) => v === value).length >= 2 &&
              value !== ""
            ) {
              value = allValues[Math.floor(Math.random() * allValues.length)];
            }
            hiddenValues.push(value);
          }
        }

        // Shuffle the values
        for (let i = hiddenValues.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [hiddenValues[i], hiddenValues[j]] = [
            hiddenValues[j],
            hiddenValues[i],
          ];
        }

        // Check if user has sufficient scratch bonus when using bonus
        if (useBonus && userId && wallet) {
          const currentScratchBonus = wallet.scratchBonus || 0;
          if (currentScratchBonus < scratchBonusCost) {
            return res.status(400).json({ error: "Mania Bônus insuficientes" });
          }
        }
        
        // Deduct cost or scratch bonus
        if (!freePlay && wallet && userId) {
          if (useBonus) {
            // Deduct from scratch bonus
            const newScratchBonus = (wallet.scratchBonus || 0) - scratchBonusCost;
            await storage.updateWalletScratchBonus(userId, newScratchBonus);
          } else {
            // Deduct from real balance
            const newBalance = parseFloat(wallet.balance || '0') - cost;
            await storage.updateWalletBalance(userId, newBalance.toFixed(2));
            await storage.incrementTotalWagered(userId, cost.toString());
          }
        }

        const gameId = Math.random().toString(36).substring(7);
        activeGames.set(gameId, {
          userId: userId || 'welcome-' + gameId, // Use a special ID for welcome users
          type: "premio-pix",
          hiddenValues,
          cost,
          multiplier, // Store multiplier to apply to prizes
          createdAt: new Date(),
        });

        res.json({ gameId, hiddenValues });
      } catch (error) {
        console.error("Premio PIX create error:", error);
        res.status(500).json({ error: "Erro ao criar jogo" });
      }
    },
  );

  app.post(
    "/api/games/premio-pix/:gameId/reveal",
    authenticateOptionalWithWelcome,
    async (req: any, res) => {
      try {
        const { gameId } = req.params;
        const userId = req.userId;
        const isWelcomeUser = req.isWelcomeUser;

        const gameState = activeGames.get(gameId);
        if (!gameState) {
          return res.status(404).json({ error: "Jogo não encontrado" });
        }
        
        // Check if the game belongs to the current user or welcome user
        const expectedUserId = userId || 'welcome-' + gameId;
        if (gameState.userId !== expectedUserId) {
          return res.status(404).json({ error: "Jogo não encontrado" });
        }

        const { hiddenValues, cost, multiplier = 1 } = gameState;

        // Check for winning condition (3 matching non-empty values)
        const valueCounts = hiddenValues.reduce((acc: any, val: string) => {
          if (val && val !== "") {
            acc[val] = (acc[val] || 0) + 1;
          }
          return acc;
        }, {});

        const winningValue = Object.entries(valueCounts).find(
          ([_, count]: any) => count >= 3,
        );
        const won = !!winningValue;
        const prizeValue = won ? winningValue![0] : "";
        
        // Extract numeric value from prize value and apply multiplier
        let numericPrize = 0;
        if (won && prizeValue) {
          const basePrize = parseFloat(prizeValue) || 0;
          numericPrize = basePrize * multiplier; // Multiply prize by multiplier
        }

        if (won && numericPrize > 0 && userId) {
          const wallet = await storage.getWallet(userId);
          if (wallet) {
            const newBalance = parseFloat(wallet.balance || '0') + numericPrize;
            await storage.updateWalletBalance(
              userId,
              newBalance.toFixed(2),
            );
          }
        }

        // Save game result to premios table only for authenticated users
        if (userId) {
          // Generate unique displayId
          const displayId = Math.floor(10000 + Math.random() * 90000);
          await storage.createGamePremio({
            userId: userId,
            gameType: "pix",
            displayId: displayId,
            cost: cost.toString(),
            prize: numericPrize.toString(),
            result: JSON.stringify({ gameId, hiddenValues, prizeValue }),
            won,
          });
        }

        activeGames.delete(gameId);
        
        // Clean up active game session
        if (userId) {
          const sessions = await storage.getUserActiveGameSessions(userId);
          for (const session of sessions) {
            if (session.gameType === 'premio-pix' && (session.gameState as any)?.gameId === gameId) {
              await storage.deleteActiveGameSession(session.id.toString());
            }
          }
        }

        res.json({ won, prize: numericPrize, prizeValue });
      } catch (error) {
        console.error("Premio PIX reveal error:", error);
        res.status(500).json({ error: "Erro ao revelar" });
      }
    },
  );

  // Premio Me Mimei routes
  app.post(
    "/api/games/premio-me-mimei/create",
    authenticateToken,
    async (req: any, res) => {
      try {
        const { multiplier = 1, freePlay = false, useBonus = false } = req.body;
        const wallet = await storage.getWallet(req.userId);
        const baseCost = 1.00; // Base cost for Me Mimei scratch card
        const cost = (freePlay || useBonus) ? 0 : baseCost * multiplier;
        const scratchBonusCost = useBonus ? multiplier : 0; // Scratch bonus cost is multiplier

        if (!freePlay && !useBonus && (!wallet || parseFloat(wallet.balance || '0') < cost)) {
          return res.status(400).json({ error: "Saldo insuficiente" });
        }

        // Get prize values from database probabilities
        const probabilities = await storage.getPrizeProbabilitiesByGame('premio-me-mimei');
        const prizeValues = probabilities.length > 0 
          ? probabilities.map(p => p.prizeValue) 
          : ["0.50", "1.00", "2.00", "3.00", "4.00", "5.00", "10.00", "15.00", "20.00", "50.00", "100.00", "200.00", "500.00", "1000.00", "2000.00", "5000.00", "10000.00", "100000.00"];

        const hiddenValues: string[] = [];

        // Check if this is the test account
        const user = await storage.getUser(req.userId);
        const isTestAccount = user?.email === "teste@gmail.com";

        // Use weighted probability system from database
        let winningValue: string | null = null;
        
        if (isTestAccount) {
          // Test account always wins a random prize
          winningValue = prizeValues[Math.floor(Math.random() * prizeValues.length)];
          console.log("Test account detected - always wins:", winningValue);
        } else {
          // Use weighted random selection from database
          const selectedPrize = await performWeightedPrizeSelection('premio-me-mimei');
          
          if (selectedPrize) {
            // Player wins based on weighted probability
            winningValue = selectedPrize;
            console.log(`Weighted selection: Won ${winningValue}`);
          } else {
            // Fallback to 30% chance if database selection fails
            const winChance = Math.random();
            console.log(`Fallback - Win chance: ${winChance}, Won: ${winChance < 0.30}`);
            
            if (winChance < 0.30) {
              const weightedIndex = Math.floor(Math.pow(Math.random(), 2) * prizeValues.length);
              winningValue = prizeValues[weightedIndex];
              console.log(`Won ${winningValue}`);
            }
          }
        }

        // Generate the grid based on whether we have a winner
        if (winningValue) {
          // Place winning value 3 times
          hiddenValues.push(winningValue, winningValue, winningValue);

          // Fill rest with random values (ensuring no accidental 3-match)
          const allValues = prizeValues.concat(["", "", ""]);
          for (let i = 3; i < 9; i++) {
            let value: string;
            do {
              value = allValues[Math.floor(Math.random() * allValues.length)];
            } while (
              hiddenValues.filter((v) => v === value).length >= 2 &&
              value !== ""
            );
            hiddenValues.push(value);
          }
        } else {
          // Generate non-winning grid
          const allValues = prizeValues.concat(["", "", "", ""]);
          for (let i = 0; i < 9; i++) {
            let value = allValues[Math.floor(Math.random() * allValues.length)];
            // Ensure no value appears 3 times
            while (
              hiddenValues.filter((v) => v === value).length >= 2 &&
              value !== ""
            ) {
              value = allValues[Math.floor(Math.random() * allValues.length)];
            }
            hiddenValues.push(value);
          }
        }

        // Shuffle the values
        for (let i = hiddenValues.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [hiddenValues[i], hiddenValues[j]] = [
            hiddenValues[j],
            hiddenValues[i],
          ];
        }

        // Check if user has sufficient scratch bonus when using bonus
        if (useBonus && wallet) {
          const currentScratchBonus = wallet.scratchBonus || 0;
          if (currentScratchBonus < scratchBonusCost) {
            return res.status(400).json({ error: "Mania Bônus insuficientes" });
          }
        }
        
        // Deduct cost or scratch bonus
        if (!freePlay && wallet) {
          if (useBonus) {
            // Deduct from scratch bonus
            const newScratchBonus = (wallet.scratchBonus || 0) - scratchBonusCost;
            await storage.updateWalletScratchBonus(req.userId, newScratchBonus);
          } else {
            // Deduct from real balance
            const newBalance = parseFloat(wallet.balance || '0') - cost;
            await storage.updateWalletBalance(req.userId, newBalance.toFixed(2));
            await storage.incrementTotalWagered(req.userId, cost.toString());
          }
        }

        const gameId = Math.random().toString(36).substring(7);
        activeGames.set(gameId, {
          userId: req.userId,
          type: "premio-me-mimei",
          hiddenValues,
          cost,
          multiplier, // Store multiplier to apply to prizes
          createdAt: new Date(),
        });

        res.json({ gameId, hiddenValues });
      } catch (error) {
        console.error("Premio Me Mimei create error:", error);
        res.status(500).json({ error: "Erro ao criar jogo" });
      }
    },
  );

  app.post(
    "/api/games/premio-me-mimei/:gameId/reveal",
    authenticateToken,
    async (req: any, res) => {
      try {
        const { gameId } = req.params;

        const gameState = activeGames.get(gameId);
        if (!gameState || gameState.userId !== req.userId) {
          return res.status(404).json({ error: "Jogo não encontrado" });
        }

        const { hiddenValues, cost, multiplier = 1 } = gameState;

        // Check for winning condition
        const valueCounts = hiddenValues.reduce((acc: any, val: string) => {
          if (val && val !== "") {
            acc[val] = (acc[val] || 0) + 1;
          }
          return acc;
        }, {});

        const winningValue = Object.entries(valueCounts).find(
          ([_, count]: any) => count >= 3,
        );
        const won = !!winningValue;
        const prizeValue = won ? winningValue![0] : "";
        
        // Apply multiplier to prize
        let numericPrize = 0;
        if (won && prizeValue) {
          const basePrize = parseFloat(prizeValue) || 0;
          numericPrize = basePrize * multiplier; // Multiply prize by multiplier
        }

        if (won && numericPrize > 0) {
          const wallet = await storage.getWallet(req.userId);
          if (wallet) {
            const newBalance = parseFloat(wallet.balance || '0') + numericPrize;
            await storage.updateWalletBalance(
              req.userId,
              newBalance.toFixed(2),
            );
          }
        }

        // Save game result to premios table
        // Generate unique displayId
        const displayId = Math.floor(10000 + Math.random() * 90000);
        await storage.createGamePremio({
          userId: req.userId,
          gameType: "me_mimei",
          displayId: displayId,
          cost: cost.toString(),
          prize: numericPrize.toString(),
          result: JSON.stringify({ gameId, hiddenValues, prizeValue }),
          won,
        });

        activeGames.delete(gameId);
        
        // Clean up active game session
        const sessions = await storage.getUserActiveGameSessions(req.userId);
        for (const session of sessions) {
          if (session.gameType === 'premio-me-mimei' && (session.gameState as any)?.gameId === gameId) {
            await storage.deleteActiveGameSession(session.id.toString());
          }
        }

        res.json({ won, prize: numericPrize, prizeValue });
      } catch (error) {
        console.error("Premio Me Mimei reveal error:", error);
        res.status(500).json({ error: "Erro ao revelar" });
      }
    },
  );

  // Premio Eletronicos routes
  app.post(
    "/api/games/premio-eletronicos/create",
    authenticateToken,
    async (req: any, res) => {
      try {
        const { multiplier = 1, freePlay = false, useBonus = false } = req.body;
        const wallet = await storage.getWallet(req.userId);
        const baseCost = 1.00; // Base cost for Eletrônicos scratch card
        const cost = (freePlay || useBonus) ? 0 : baseCost * multiplier;
        const scratchBonusCost = useBonus ? multiplier : 0; // Scratch bonus cost is multiplier

        if (!freePlay && !useBonus && (!wallet || parseFloat(wallet.balance || '0') < cost)) {
          return res.status(400).json({ error: "Saldo insuficiente" });
        }

        // Get prize values from database probabilities
        const probabilities = await storage.getPrizeProbabilitiesByGame('premio-eletronicos');
        const prizeValues = probabilities.length > 0 
          ? probabilities.map(p => p.prizeValue) 
          : ["0.50", "1.00", "2.00", "3.00", "4.00", "5.00", "10.00", "15.00", "20.00", "50.00", "100.00", "200.00", "500.00", "1000.00", "2000.00", "5000.00", "10000.00", "100000.00"];

        const hiddenValues: string[] = [];

        // Check if this is the test account
        const user = await storage.getUser(req.userId);
        const isTestAccount = user?.email === "teste@gmail.com";

        // Use weighted probability system from database
        let winningValue: string | null = null;
        
        if (isTestAccount) {
          // Test account always wins a random prize
          winningValue = prizeValues[Math.floor(Math.random() * prizeValues.length)];
          console.log("Test account detected - always wins:", winningValue);
        } else {
          // Use weighted random selection from database
          const selectedPrize = await performWeightedPrizeSelection('premio-eletronicos');
          
          if (selectedPrize) {
            // Player wins based on weighted probability
            winningValue = selectedPrize;
            console.log(`Weighted selection: Won ${winningValue}`);
          } else {
            // Fallback to 30% chance if database selection fails
            const winChance = Math.random();
            console.log(`Fallback - Win chance: ${winChance}, Won: ${winChance < 0.30}`);
            
            if (winChance < 0.30) {
              const weightedIndex = Math.floor(Math.pow(Math.random(), 2) * prizeValues.length);
              winningValue = prizeValues[weightedIndex];
              console.log(`Won ${winningValue}`);
            }
          }
        }

        // Generate the grid based on whether we have a winner
        if (winningValue) {
          // Place winning value 3 times
          hiddenValues.push(winningValue, winningValue, winningValue);

          // Fill rest with random values (ensuring no accidental 3-match)
          const allValues = prizeValues.concat(["", "", ""]);
          for (let i = 3; i < 9; i++) {
            let value: string;
            do {
              value = allValues[Math.floor(Math.random() * allValues.length)];
            } while (
              hiddenValues.filter((v) => v === value).length >= 2 &&
              value !== ""
            );
            hiddenValues.push(value);
          }
        } else {
          // Generate non-winning grid
          const allValues = prizeValues.concat(["", "", "", ""]);
          for (let i = 0; i < 9; i++) {
            let value = allValues[Math.floor(Math.random() * allValues.length)];
            // Ensure no value appears 3 times
            while (
              hiddenValues.filter((v) => v === value).length >= 2 &&
              value !== ""
            ) {
              value = allValues[Math.floor(Math.random() * allValues.length)];
            }
            hiddenValues.push(value);
          }
        }

        // Shuffle the values
        for (let i = hiddenValues.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [hiddenValues[i], hiddenValues[j]] = [
            hiddenValues[j],
            hiddenValues[i],
          ];
        }

        // Check if user has sufficient scratch bonus when using bonus
        if (useBonus && wallet) {
          const currentScratchBonus = wallet.scratchBonus || 0;
          if (currentScratchBonus < scratchBonusCost) {
            return res.status(400).json({ error: "Mania Bônus insuficientes" });
          }
        }
        
        // Deduct cost or scratch bonus
        if (!freePlay && wallet) {
          if (useBonus) {
            // Deduct from scratch bonus
            const newScratchBonus = (wallet.scratchBonus || 0) - scratchBonusCost;
            await storage.updateWalletScratchBonus(req.userId, newScratchBonus);
          } else {
            // Deduct from real balance
            const newBalance = parseFloat(wallet.balance || '0') - cost;
            await storage.updateWalletBalance(req.userId, newBalance.toFixed(2));
            await storage.incrementTotalWagered(req.userId, cost.toString());
          }
        }

        const gameId = Math.random().toString(36).substring(7);
        activeGames.set(gameId, {
          userId: req.userId,
          type: "premio-eletronicos",
          hiddenValues,
          cost,
          multiplier, // Store multiplier to apply to prizes
          createdAt: new Date(),
        });

        res.json({ gameId, hiddenValues });
      } catch (error) {
        console.error("Premio Eletronicos create error:", error);
        res.status(500).json({ error: "Erro ao criar jogo" });
      }
    },
  );

  app.post(
    "/api/games/premio-eletronicos/:gameId/reveal",
    authenticateToken,
    async (req: any, res) => {
      try {
        const { gameId } = req.params;

        const gameState = activeGames.get(gameId);
        if (!gameState || gameState.userId !== req.userId) {
          return res.status(404).json({ error: "Jogo não encontrado" });
        }

        const { hiddenValues, cost, multiplier = 1 } = gameState;

        // Check for winning condition
        const valueCounts = hiddenValues.reduce((acc: any, val: string) => {
          if (val && val !== "") {
            acc[val] = (acc[val] || 0) + 1;
          }
          return acc;
        }, {});

        const winningValue = Object.entries(valueCounts).find(
          ([_, count]: any) => count >= 3,
        );
        const won = !!winningValue;
        const prizeValue = won ? winningValue![0] : "";
        
        // Apply multiplier to prize
        let numericPrize = 0;
        if (won && prizeValue) {
          const basePrize = parseFloat(prizeValue) || 0;
          numericPrize = basePrize * multiplier; // Multiply prize by multiplier
        }

        if (won && numericPrize > 0) {
          const wallet = await storage.getWallet(req.userId);
          if (wallet) {
            const newBalance = parseFloat(wallet.balance || '0') + numericPrize;
            await storage.updateWalletBalance(
              req.userId,
              newBalance.toFixed(2),
            );
          }
        }

        // Save game result to premios table
        // Generate unique displayId
        const displayId = Math.floor(10000 + Math.random() * 90000);
        await storage.createGamePremio({
          userId: req.userId,
          gameType: "eletronicos",
          displayId: displayId,
          cost: cost.toString(),
          prize: numericPrize.toString(),
          result: JSON.stringify({ gameId, hiddenValues, prizeValue }),
          won,
        });

        activeGames.delete(gameId);
        
        // Clean up active game session
        const sessions = await storage.getUserActiveGameSessions(req.userId);
        for (const session of sessions) {
          if (session.gameType === 'premio-eletronicos' && (session.gameState as any)?.gameId === gameId) {
            await storage.deleteActiveGameSession(session.id.toString());
          }
        }

        res.json({ won, prize: numericPrize, prizeValue });
      } catch (error) {
        console.error("Premio Eletronicos reveal error:", error);
        res.status(500).json({ error: "Erro ao revelar" });
      }
    },
  );

  // Premio Super Premios routes
  app.post(
    "/api/games/premio-super-premios/create",
    authenticateToken,
    async (req: any, res) => {
      try {
        const { multiplier = 1, freePlay = false, useBonus = false } = req.body;
        const wallet = await storage.getWallet(req.userId);
        const baseCost = 20.00; // Base cost for Super Prêmios scratch card
        const cost = (freePlay || useBonus) ? 0 : baseCost * multiplier;
        const scratchBonusCost = useBonus ? 20 * multiplier : 0; // Scratch bonus cost is 20 × multiplier

        if (!freePlay && !useBonus && (!wallet || parseFloat(wallet.balance || '0') < cost)) {
          return res.status(400).json({ error: "Saldo insuficiente" });
        }

        // Get prize values from database probabilities
        const probabilities = await storage.getPrizeProbabilitiesByGame('premio-super-premios');
        const prizeValues = probabilities.length > 0 
          ? probabilities.map(p => p.prizeValue) 
          : ["10.00", "20.00", "40.00", "60.00", "80.00", "100.00", "200.00", "300.00", "400.00", "1000.00", "2000.00", "4000.00", "10000.00", "20000.00", "200000.00", "500000.00"];

        const hiddenValues: string[] = [];

        // Check if this is the test account
        const user = await storage.getUser(req.userId);
        const isTestAccount = user?.email === "teste@gmail.com";

        // Use weighted probability system from database
        let winningValue: string | null = null;
        
        if (isTestAccount) {
          // Test account always wins a random prize
          winningValue = prizeValues[Math.floor(Math.random() * prizeValues.length)];
          console.log("Test account detected - always wins:", winningValue);
        } else {
          // Use weighted random selection from database
          const selectedPrize = await performWeightedPrizeSelection('premio-super-premios');
          
          if (selectedPrize) {
            // Player wins based on weighted probability
            winningValue = selectedPrize;
            console.log(`Weighted selection: Won ${winningValue}`);
          } else {
            // Fallback to 30% chance if database selection fails
            const winChance = Math.random();
            console.log(`Fallback - Win chance: ${winChance}, Won: ${winChance < 0.30}`);
            
            if (winChance < 0.30) {
              const weightedIndex = Math.floor(Math.pow(Math.random(), 2) * prizeValues.length);
              winningValue = prizeValues[weightedIndex];
              console.log(`Won ${winningValue}`);
            }
          }
        }

        // Generate the grid based on whether we have a winner
        if (winningValue) {
          // Place winning value 3 times
          hiddenValues.push(winningValue, winningValue, winningValue);

          // Fill rest with random values (ensuring no accidental 3-match)
          const allValues = prizeValues.concat(["", "", ""]);
          for (let i = 3; i < 9; i++) {
            let value: string;
            do {
              value = allValues[Math.floor(Math.random() * allValues.length)];
            } while (
              hiddenValues.filter((v) => v === value).length >= 2 &&
              value !== ""
            );
            hiddenValues.push(value);
          }
        } else {
          // Generate non-winning grid
          const allValues = prizeValues.concat(["", "", "", ""]);
          for (let i = 0; i < 9; i++) {
            let value = allValues[Math.floor(Math.random() * allValues.length)];
            // Ensure no value appears 3 times
            while (
              hiddenValues.filter((v) => v === value).length >= 2 &&
              value !== ""
            ) {
              value = allValues[Math.floor(Math.random() * allValues.length)];
            }
            hiddenValues.push(value);
          }
        }

        // Shuffle the values
        for (let i = hiddenValues.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [hiddenValues[i], hiddenValues[j]] = [
            hiddenValues[j],
            hiddenValues[i],
          ];
        }

        // Check if user has sufficient scratch bonus when using bonus
        if (useBonus && wallet) {
          const currentScratchBonus = wallet.scratchBonus || 0;
          if (currentScratchBonus < scratchBonusCost) {
            return res.status(400).json({ error: "Mania Bônus insuficientes" });
          }
        }
        
        // Deduct cost or scratch bonus
        if (!freePlay && wallet) {
          if (useBonus) {
            // Deduct from scratch bonus
            const newScratchBonus = (wallet.scratchBonus || 0) - scratchBonusCost;
            await storage.updateWalletScratchBonus(req.userId, newScratchBonus);
          } else {
            // Deduct from real balance
            const newBalance = parseFloat(wallet.balance || '0') - cost;
            await storage.updateWalletBalance(req.userId, newBalance.toFixed(2));
            await storage.incrementTotalWagered(req.userId, cost.toString());
          }
        }

        const gameId = Math.random().toString(36).substring(7);
        activeGames.set(gameId, {
          userId: req.userId,
          type: "premio-super-premios",
          hiddenValues,
          cost,
          multiplier, // Store multiplier to apply to prizes
          createdAt: new Date(),
        });

        res.json({ gameId, hiddenValues });
      } catch (error) {
        console.error("Premio Super Premios create error:", error);
        res.status(500).json({ error: "Erro ao criar jogo" });
      }
    },
  );

  app.post(
    "/api/games/premio-super-premios/:gameId/reveal",
    authenticateToken,
    async (req: any, res) => {
      try {
        const { gameId } = req.params;

        const gameState = activeGames.get(gameId);
        if (!gameState || gameState.userId !== req.userId) {
          return res.status(404).json({ error: "Jogo não encontrado" });
        }

        const { hiddenValues, cost, multiplier = 1 } = gameState;

        // Check for winning condition
        const valueCounts = hiddenValues.reduce((acc: any, val: string) => {
          if (val && val !== "") {
            acc[val] = (acc[val] || 0) + 1;
          }
          return acc;
        }, {});

        const winningValue = Object.entries(valueCounts).find(
          ([_, count]: any) => count >= 3,
        );
        const won = !!winningValue;
        const prizeValue = won ? winningValue![0] : "";
        
        // Apply multiplier to prize
        let numericPrize = 0;
        if (won && prizeValue) {
          const basePrize = parseFloat(prizeValue) || 0;
          numericPrize = basePrize * multiplier; // Multiply prize by multiplier
        }

        if (won && numericPrize > 0) {
          const wallet = await storage.getWallet(req.userId);
          if (wallet) {
            const newBalance = parseFloat(wallet.balance || '0') + numericPrize;
            await storage.updateWalletBalance(
              req.userId,
              newBalance.toFixed(2),
            );
          }
        }

        // Save game result to premios table
        // Generate unique displayId
        const displayId = Math.floor(10000 + Math.random() * 90000);
        await storage.createGamePremio({
          userId: req.userId,
          gameType: "super",
          displayId: displayId,
          cost: cost.toString(),
          prize: numericPrize.toString(),
          result: JSON.stringify({ gameId, hiddenValues, prizeValue }),
          won,
        });

        activeGames.delete(gameId);
        
        // Clean up active game session
        const sessions = await storage.getUserActiveGameSessions(req.userId);
        for (const session of sessions) {
          if (session.gameType === 'premio-super-premios' && (session.gameState as any)?.gameId === gameId) {
            await storage.deleteActiveGameSession(session.id.toString());
          }
        }

        res.json({ won, prize: numericPrize, prizeValue });
      } catch (error) {
        console.error("Premio Super Premios reveal error:", error);
        res.status(500).json({ error: "Erro ao revelar" });
      }
    },
  );

  // Premio PIX Conta routes
  app.post(
    "/api/games/premio-pix-conta/create",
    authenticateToken,
    async (req: any, res) => {
      try {
        const wallet = await storage.getWallet(req.userId);
        const gameCost = 20; // Fixed cost for premio PIX conta

        if (!wallet || parseFloat(wallet.balance || '0') < gameCost) {
          return res.status(400).json({ error: "Saldo insuficiente" });
        }

        // Define possible prize values (excluding R$ 10 and R$ 2000 as requested)
        const prizeValues = [1000, 500, 200, 100, 50, 20, 5, 2, 1, 0.5];

        // Generate 9 values for the grid
        const hiddenValues: number[] = [];

        // Determine if player wins (10% chance)
        const won = Math.random() < 0.1;
        let winningValue = 0;

        if (won) {
          // Select winning value with weighted probability (lower values more likely)
          const weights = [1, 2, 3, 5, 10, 20, 30, 40, 50, 60]; // Higher weight = more likely
          const totalWeight = weights.reduce((a, b) => a + b, 0);
          let random = Math.random() * totalWeight;
          let selectedIndex = 0;

          for (let i = 0; i < weights.length; i++) {
            random -= weights[i];
            if (random <= 0) {
              selectedIndex = i;
              break;
            }
          }

          winningValue = prizeValues[selectedIndex];

          // Place 3 matching values randomly in the grid
          const winPositions: number[] = [];
          while (winPositions.length < 3) {
            const pos = Math.floor(Math.random() * 9);
            if (!winPositions.includes(pos)) {
              winPositions.push(pos);
            }
          }

          // Fill grid
          for (let i = 0; i < 9; i++) {
            if (winPositions.includes(i)) {
              hiddenValues.push(winningValue);
            } else {
              // Add random non-winning values
              let randomValue;
              do {
                randomValue =
                  prizeValues[Math.floor(Math.random() * prizeValues.length)];
              } while (randomValue === winningValue);
              hiddenValues.push(randomValue);
            }
          }
        } else {
          // No win - ensure no 3 matching values
          for (let i = 0; i < 9; i++) {
            hiddenValues.push(
              prizeValues[Math.floor(Math.random() * prizeValues.length)],
            );
          }

          // Check and fix if accidentally created 3 matching
          const valueCounts = new Map<number, number>();
          hiddenValues.forEach((val) => {
            valueCounts.set(val, (valueCounts.get(val) || 0) + 1);
          });

          for (const [value, count] of valueCounts) {
            if (count >= 3) {
              // Replace one instance with a different value
              const index = hiddenValues.indexOf(value);
              let newValue;
              do {
                newValue =
                  prizeValues[Math.floor(Math.random() * prizeValues.length)];
              } while (newValue === value);
              hiddenValues[index] = newValue;
            }
          }
        }

        // Deduct cost
        const newBalance = parseFloat(wallet.balance || '0') - gameCost;
        await storage.updateWalletBalance(req.userId, newBalance.toFixed(2));

        // Store game state
        const gameId = Math.random().toString(36).substring(7);
        activeGames.set(gameId, {
          userId: req.userId,
          type: "premio-pix-conta",
          cost: gameCost,
          hiddenValues,
          won,
          prize: winningValue,
          createdAt: new Date(),
        });

        res.json({
          gameId,
          hiddenValues,
          cost: gameCost,
        });
      } catch (error) {
        console.error("Premio PIX Conta create error:", error);
        res.status(500).json({ error: "Erro ao criar jogo" });
      }
    },
  );

  app.post(
    "/api/games/premio-pix-conta/:gameId/reveal",
    authenticateToken,
    async (req: any, res) => {
      try {
        const { gameId } = req.params;

        // Retrieve game state
        const gameState = activeGames.get(gameId);
        if (!gameState || gameState.userId !== req.userId) {
          return res.status(404).json({ error: "Jogo não encontrado" });
        }

        const { won, prize, cost, hiddenValues } = gameState;

        if (won && prize > 0) {
          const wallet = await storage.getWallet(req.userId);
          if (wallet) {
            const newBalance = parseFloat(wallet.balance || '0') + prize;
            await storage.updateWalletBalance(
              req.userId,
              newBalance.toFixed(2),
            );
          }
        }

        // Count matching values for game data
        const valueCounts = new Map<number, number>();
        hiddenValues.forEach((val: number) => {
          valueCounts.set(val, (valueCounts.get(val) || 0) + 1);
        });

        let matchingValue = null;
        let matchCount = 0;
        for (const [value, count] of valueCounts) {
          if (count >= 3) {
            matchingValue = value;
            matchCount = count;
            break;
          }
        }

        // Save game result to premios table
        // Generate unique displayId
        const displayId = Math.floor(10000 + Math.random() * 90000);
        await storage.createGamePremio({
          userId: req.userId,
          gameType: "pix",
          displayId: displayId,
          cost: cost.toString(),
          prize: prize.toString(),
          result: JSON.stringify({ gameId, won, hiddenValues }),
          won,
          gameData: JSON.stringify({
            revealedSymbols: hiddenValues.map(
              (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`,
            ),
            matchingSymbol: matchingValue
              ? `R$ ${matchingValue.toFixed(2).replace(".", ",")}`
              : null,
            matchCount,
          }),
        });

        // Clean up game state
        activeGames.delete(gameId);

        res.json({ won, prize });
      } catch (error) {
        console.error("Premio PIX Conta reveal error:", error);
        res.status(500).json({ error: "Erro ao revelar resultado" });
      }
    },
  );

  // Jogo do Esquilo - Check for active game (allow public access for game display)
  app.get("/api/games/jogo-esquilo/active", async (req: any, res) => {
    // Try to get user from token if available
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    
    if (!token) {
      // No token, return no active game
      return res.json({ hasActiveGame: false });
    }
    
    let userId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "placeholder-secret-key-change-in-production") as any;
      userId = decoded.userId;
    } catch (error) {
      // Invalid token, return no active game
      return res.json({ hasActiveGame: false });
    }
    try {
      // Ensure table exists before querying
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS esquilo_game_states (
          id SERIAL PRIMARY KEY,
          game_id VARCHAR(20) NOT NULL UNIQUE,
          user_id INTEGER NOT NULL REFERENCES users(id),
          bet_amount DECIMAL(10, 2) NOT NULL,
          current_multiplier DECIMAL(10, 2) DEFAULT 0.00,
          used_bonus BOOLEAN DEFAULT false,
          is_active BOOLEAN DEFAULT true,
          boxes JSONB NOT NULL,
          opened_boxes JSONB NOT NULL,
          bonus_activated BOOLEAN DEFAULT false,
          bonus_used BOOLEAN DEFAULT false,
          bonus_multipliers JSONB,
          bonus_winner_multiplier DECIMAL(10, 2),
          active_bonus_multiplier DECIMAL(10, 2),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `).catch(() => {}); // Ignore error if table already exists
      
      // Check if user has an active game in database
      const activeGame = await db.execute(sql`
        SELECT 
          game_id as "gameId",
          bet_amount as "betAmount",
          current_multiplier as "currentMultiplier",
          used_bonus as "usedBonus",
          boxes,
          opened_boxes as "openedBoxes",
          bonus_activated as "bonusActivated",
          bonus_used as "bonusUsed",
          bonus_multipliers as "bonusMultipliers",
          bonus_winner_multiplier as "bonusWinnerMultiplier",
          active_bonus_multiplier as "activeBonusMultiplier"
        FROM esquilo_game_states
        WHERE user_id = ${userId} AND is_active = true
        LIMIT 1
      `);
      
      if (activeGame.rows.length > 0) {
        const game = activeGame.rows[0];
        
        // Restore game state in memory
        const gameState = {
          userId: userId,
          betAmount: parseFloat(game.betAmount),
          currentMultiplier: parseFloat(game.currentMultiplier || '0'),
          isActive: true,
          usedBonus: game.usedBonus,
          bonusUsed: game.bonusUsed,
          bonusActivated: game.bonusActivated,
          bonusWinnerMultiplier: game.bonusWinnerMultiplier ? parseFloat(game.bonusWinnerMultiplier) : null,
          activeBonusMultiplier: game.activeBonusMultiplier ? parseFloat(game.activeBonusMultiplier) : null,
          bonusMultipliers: game.bonusMultipliers || [],
          openedBoxes: new Set(game.openedBoxes || []),
          createdAt: new Date()
        };
        
        console.log(`Restored game ${game.gameId} with bonus multiplier: ${gameState.activeBonusMultiplier}`);
        
        // Restore in memory
        activeGames.set(game.gameId, gameState);
        gameBoxes.set(game.gameId, game.boxes);
        
        return res.json({
          hasActiveGame: true,
          gameId: game.gameId,
          betAmount: parseFloat(game.betAmount),
          currentMultiplier: parseFloat(game.currentMultiplier || '0'),
          openedBoxes: game.openedBoxes || [],
          boxes: game.boxes || [],
          bonusActivated: game.bonusActivated,
          bonusUsed: game.bonusUsed,
          bonusMultipliers: game.bonusMultipliers || [],
          bonusWinnerMultiplier: game.bonusWinnerMultiplier ? parseFloat(game.bonusWinnerMultiplier) : null,
          activeBonusMultiplier: game.activeBonusMultiplier ? parseFloat(game.activeBonusMultiplier) : null,
          usedBonus: game.usedBonus
        });
      }
      
      return res.json({ hasActiveGame: false });
    } catch (error) {
      console.error("Error checking active Esquilo game:", error);
      res.status(500).json({ error: "Erro ao verificar jogo ativo" });
    }
  });
  
  // Jogo do Esquilo routes
  app.post("/api/games/jogo-esquilo/create", authenticateToken, async (req: any, res) => {
    try {
      const { betAmount = 1, useBonus = false } = req.body;
      
      // First, create tables if they don't exist (MUST be done before any queries)
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS esquilo_games (
          id SERIAL PRIMARY KEY,
          game_id VARCHAR(20) NOT NULL UNIQUE,
          user_id INTEGER NOT NULL REFERENCES users(id),
          bet_amount DECIMAL(10, 2) NOT NULL,
          final_multiplier DECIMAL(10, 2) DEFAULT 0.00,
          win_amount DECIMAL(10, 2) DEFAULT 0.00,
          used_bonus BOOLEAN DEFAULT false,
          status VARCHAR(20) NOT NULL,
          boxes JSONB NOT NULL,
          opened_boxes JSONB NOT NULL,
          bonus_activated BOOLEAN DEFAULT false,
          bonus_used BOOLEAN DEFAULT false,
          bonus_multipliers JSONB,
          bonus_winner_multiplier DECIMAL(10, 2),
          active_bonus_multiplier DECIMAL(10, 2),
          started_at TIMESTAMP NOT NULL,
          completed_at TIMESTAMP
        )
      `);
      
      // Add missing column if it doesn't exist
      await db.execute(sql`
        ALTER TABLE esquilo_games 
        ADD COLUMN IF NOT EXISTS bonus_used BOOLEAN DEFAULT false
      `).catch(() => {});
      
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS esquilo_game_states (
          id SERIAL PRIMARY KEY,
          game_id VARCHAR(20) NOT NULL UNIQUE,
          user_id INTEGER NOT NULL REFERENCES users(id),
          bet_amount DECIMAL(10, 2) NOT NULL,
          current_multiplier DECIMAL(10, 2) DEFAULT 0.00,
          used_bonus BOOLEAN DEFAULT false,
          is_active BOOLEAN DEFAULT true,
          boxes JSONB NOT NULL,
          opened_boxes JSONB NOT NULL,
          bonus_activated BOOLEAN DEFAULT false,
          bonus_used BOOLEAN DEFAULT false,
          bonus_multipliers JSONB,
          bonus_winner_multiplier DECIMAL(10, 2),
          active_bonus_multiplier DECIMAL(10, 2),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      // Security validations
      if (betAmount < 0.5 || betAmount > 1000) {
        return res.status(400).json({ error: "Valor de aposta inválido (mínimo R$ 0,50, máximo R$ 1000)" });
      }
      
      // Rate limiting check - prevent creating multiple games too quickly
      const recentGames = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM esquilo_games 
        WHERE user_id = ${req.userId} 
          AND started_at > NOW() - INTERVAL '5 seconds'
      `);
      
      if (recentGames.rows[0] && parseInt(recentGames.rows[0].count) > 3) {
        return res.status(429).json({ error: "Muitas tentativas, aguarde alguns segundos" });
      }
      
      const wallet = await storage.getWallet(req.userId);
      
      if (!wallet) {
        return res.status(400).json({ error: "Carteira não encontrada" });
      }
      
      // Check balance based on type selected
      if (useBonus) {
        // Check if user has enough scratch bonus (1 bonus = R$ 1)
        if (!wallet.scratchBonus || wallet.scratchBonus < betAmount) {
          return res.status(400).json({ error: "Mania Bônus insuficientes" });
        }
        // Deduct scratch bonus
        await storage.updateWalletScratchBonus(req.userId, wallet.scratchBonus - betAmount);
      } else {
        // Check if user has enough real balance
        const currentBalance = parseFloat(wallet.balance || "0");
        if (currentBalance < betAmount) {
          return res.status(400).json({ error: "Saldo insuficiente" });
        }
        // Deduct real balance and increment total wagered
        const newBalance = currentBalance - betAmount;
        await storage.updateWalletBalance(req.userId, newBalance.toFixed(2));
        await storage.incrementTotalWagered(req.userId, betAmount.toString());
      }
      
      // Get user to check if demo account
      const user = await storage.getUser(req.userId);
      const isDemo = user?.cpf === '999.999.999-99';
      
      // Simple prize types for Esquilo (no probabilities)
      const prizeTypes = [
        { prizeType: 'pinecone', multiplier: 0.3 },
        { prizeType: 'acorn', multiplier: 0.5 },
        { prizeType: 'apple', multiplier: 0.8 },
        { prizeType: 'ring', multiplier: 2.0 },
        { prizeType: 'goldenacorn', multiplier: 5.0 }
      ];
      
      // Generate 9 boxes: 2 foxes + 7 prizes based on probabilities
      const boxes: any[] = [];
      
      // Add 2 foxes
      boxes.push({ type: 'fox', multiplier: 0 });
      boxes.push({ type: 'fox', multiplier: 0 });
      
      // Generate 7 random prizes (no probabilities)
      for (let i = 0; i < 7; i++) {
        // Simple weighted random selection
        const weights = [30, 25, 25, 15, 5]; // Weight distribution
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;
        let selectedIndex = 0;
        
        for (let j = 0; j < weights.length; j++) {
          random -= weights[j];
          if (random <= 0) {
            selectedIndex = j;
            break;
          }
        }
        
        const selectedPrize = prizeTypes[selectedIndex];
        boxes.push({
          type: selectedPrize.prizeType,
          multiplier: selectedPrize.multiplier
        });
      }
      
      // Shuffle the boxes
      for (let i = boxes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [boxes[i], boxes[j]] = [boxes[j], boxes[i]];
      }
      
      // Create game session
      const gameId = Math.random().toString(36).substring(7);
      const gameState = {
        userId: req.userId,
        betAmount,
        currentMultiplier: 0,
        isActive: true,
        usedBonus: useBonus,
        bonusUsed: false, // Track if bonus has been activated
        activeBonusMultiplier: null, // Track active bonus multiplier
        openedBoxes: new Set<number>(),
        createdAt: new Date()
      };
      
      activeGames.set(gameId, gameState);
      gameBoxes.set(gameId, boxes); // Store boxes for this game
      
      // Save game to database for history
      await storage.createEsquiloGame({
        gameId,
        userId: req.userId,
        betAmount: betAmount.toString(),
        usedBonus: useBonus,
        status: 'playing',
        boxes,
        openedBoxes: [],
        startedAt: new Date()
      });
      
      // Save game state for resume functionality
      await storage.createEsquiloGameState({
        gameId,
        userId: req.userId,
        betAmount: betAmount.toString(),
        currentMultiplier: '0',
        usedBonus: useBonus,
        isActive: true,
        boxes,
        openedBoxes: []
      });
      
      res.json({
        gameId,
        betAmount,
        currentMultiplier: 0
      });
    } catch (error) {
      console.error("Jogo do Esquilo create error:", error);
      res.status(500).json({ error: "Erro ao criar jogo" });
    }
  });
  
  // Get bonus configuration for Jogo do Esquilo (public endpoint for game display)
  app.get("/api/games/jogo-esquilo/config", async (req: any, res) => {
    try {
      const isDemo = false; // Public access doesn't have demo status
      
      // Simple bonus cost multiplier (no database)
      const bonusCostMultiplier = '20.00';
      
      res.json({
        bonusCostMultiplier: parseFloat(bonusCostMultiplier)
      });
    } catch (error) {
      console.error("Error fetching bonus config:", error);
      res.status(500).json({ error: "Erro ao buscar configuração" });
    }
  });
  
  // Buy bonus for Jogo do Esquilo
  app.post("/api/games/jogo-esquilo/buy-bonus", authenticateToken, async (req: any, res) => {
    try {
      const { betAmount = 1, useBonus = false } = req.body;
      const isDemo = req.userType === 'demo';
      
      // Security validations
      if (betAmount < 0.5 || betAmount > 1000) {
        return res.status(400).json({ error: "Valor de aposta inválido (mínimo R$ 0,50, máximo R$ 1000)" });
      }
      
      // Simple bonus cost multiplier (no database)
      const bonusCostMultiplier = 20.00;
      const totalCost = betAmount * bonusCostMultiplier;
      
      // Check balance
      const wallet = await storage.getWallet(req.userId);
      if (!wallet) {
        return res.status(404).json({ error: "Carteira não encontrada" });
      }
      
      // Determine which balance to use
      const usingBonus = useBonus && parseFloat(wallet.scratchBonus?.toString() || '0') > 0;
      const currentBalance = usingBonus ? parseFloat(wallet.scratchBonus?.toString() || '0') : parseFloat(wallet.balance || '0');
      
      if (currentBalance < totalCost) {
        return res.status(400).json({ 
          error: usingBonus ? "Saldo bônus insuficiente" : "Saldo insuficiente", 
          required: totalCost,
          available: currentBalance 
        });
      }
      
      // Deduct cost from appropriate balance and update total_wagered
      if (usingBonus) {
        const newBonusBalance = (currentBalance - totalCost).toFixed(2);
        await db.execute(sql`
          UPDATE wallets 
          SET scratch_bonus = ${newBonusBalance},
              total_wagered = total_wagered + ${totalCost}
          WHERE user_id = ${req.userId}
        `);
      } else {
        const newBalance = (currentBalance - totalCost).toFixed(2);
        await db.execute(sql`
          UPDATE wallets 
          SET balance = ${newBalance},
              total_wagered = total_wagered + ${totalCost}
          WHERE user_id = ${req.userId}
        `);
      }
      
      // Simple prize types (no probabilities)
      const prizeTypes = [
        { prizeType: 'pinecone', multiplier: 0.3 },
        { prizeType: 'acorn', multiplier: 0.5 },
        { prizeType: 'apple', multiplier: 0.8 },
        { prizeType: 'ring', multiplier: 2.0 },
        { prizeType: 'goldenacorn', multiplier: 5.0 }
      ];
      
      // Generate 9 boxes: 2 foxes + 7 prizes
      const boxes: any[] = [];
      
      // Add 2 foxes
      boxes.push({ type: 'fox', multiplier: 0 });
      boxes.push({ type: 'fox', multiplier: 0 });
      
      // Generate 7 random prizes (no probabilities)
      for (let i = 0; i < 7; i++) {
        // Simple weighted random selection
        const weights = [30, 25, 25, 15, 5];
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;
        let selectedIndex = 0;
        
        for (let j = 0; j < weights.length; j++) {
          random -= weights[j];
          if (random <= 0) {
            selectedIndex = j;
            break;
          }
        }
        
        const selectedPrize = prizeTypes[selectedIndex];
        boxes.push({
          type: selectedPrize.prizeType,
          multiplier: selectedPrize.multiplier
        });
      }
      
      // Shuffle the boxes
      for (let i = boxes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [boxes[i], boxes[j]] = [boxes[j], boxes[i]];
      }
      
      // Don't pre-generate bonus multipliers - they will be calculated when player selects
      // Just mark that bonus is ready for selection
      
      // Create game session with bonus ready for selection
      const gameId = Math.random().toString(36).substring(7);
      const gameState = {
        userId: req.userId,
        betAmount,
        currentMultiplier: 0,
        isActive: true,
        usedBonus: false, // Bonus not used yet
        bonusUsed: false, // Bonus not active yet
        bonusActivated: true, // Bonus mode is activated for selection
        bonusPurchased: true, // Flag that bonus was purchased
        bonusMultipliers: null, // Will be generated when player selects
        activeBonusMultiplier: null, // Will be set after selection
        openedBoxes: new Set<number>(),
        createdAt: new Date()
      };
      
      activeGames.set(gameId, gameState);
      gameBoxes.set(gameId, boxes);
      
      // Save game to database with bonus ready for selection
      await storage.createEsquiloGame({
        gameId,
        userId: req.userId,
        betAmount: betAmount.toString(),
        usedBonus: false,
        bonusActivated: true,
        status: 'playing',
        boxes,
        openedBoxes: [],
        startedAt: new Date()
      });
      
      // Save game state with bonus multipliers for selection
      await storage.createEsquiloGameState({
        gameId,
        userId: req.userId,
        betAmount: betAmount.toString(),
        currentMultiplier: '0',
        usedBonus: false,
        bonusUsed: false,
        bonusActivated: true,
        isActive: true,
        boxes,
        openedBoxes: []
      });
      
      // Wager is automatically tracked through games history
      
      console.log(`Bonus purchased, awaiting chest selection`);
      
      res.json({
        gameId,
        betAmount,
        currentMultiplier: 0,
        bonusPurchased: true,
        bonusActivated: true,
        bonusMultipliers: null, // Will be generated on selection
        totalCost,
        newBalance: currentBalance - totalCost
      });
    } catch (error) {
      console.error("Buy bonus error:", error);
      res.status(500).json({ error: "Erro ao comprar bônus" });
    }
  });
  
  app.post("/api/games/jogo-esquilo/:gameId/play", authenticateToken, async (req: any, res) => {
    try {
      const { gameId } = req.params;
      const { action, boxId } = req.body; // 'continue' or 'cashout', and boxId for opening
      
      // Create a simple game state if it doesn't exist (for recovery after server restart)
      let gameState = activeGames.get(gameId);
      if (!gameState) {
        // Try to restore from database first
        const dbGame = await storage.getEsquiloGameState(gameId);
        
        if (dbGame && dbGame.userId === req.userId) {
          const game = dbGame;
          gameState = {
            userId: req.userId,
            betAmount: parseFloat(game.betAmount),
            currentMultiplier: parseFloat(game.currentMultiplier || '0'),
            isActive: true,
            usedBonus: game.usedBonus,
            bonusUsed: game.bonusUsed,
            bonusActivated: game.bonusActivated,
            activeBonusMultiplier: game.activeBonusMultiplier ? parseFloat(game.activeBonusMultiplier) : null,
            openedBoxes: new Set(game.openedBoxes || []),
            createdAt: new Date()
          };
          
          // Restore boxes if available
          if (game.boxes) {
            gameBoxes.set(gameId, game.boxes);
          }
        } else {
          // Fallback to defaults
          gameState = {
            userId: req.userId,
            betAmount: 1, // Default bet
            currentMultiplier: 0,
            isActive: true,
            usedBonus: false,
            bonusUsed: false,
            activeBonusMultiplier: null,
            openedBoxes: new Set<number>(),
            createdAt: new Date()
          };
        }
        activeGames.set(gameId, gameState);
      }
      
      // Verify user owns this game
      if (gameState.userId !== req.userId) {
        return res.status(404).json({ error: "Jogo não encontrado" });
      }
      
      if (action === 'cashout') {
        // Cash out with current multiplier
        const winAmount = gameState.betAmount * gameState.currentMultiplier;
        
        // Always update real balance (even if played with bonus)
        const wallet = await storage.getWallet(req.userId);
        if (wallet) {
          const newBalance = parseFloat(wallet.balance || '0') + winAmount;
          await storage.updateWalletBalance(req.userId, newBalance.toFixed(2));
        }
        
        // Update game history in database
        await db.execute(sql`
          UPDATE esquilo_games 
          SET status = 'cashed_out',
              final_multiplier = ${gameState.currentMultiplier},
              win_amount = ${winAmount},
              completed_at = NOW()
          WHERE game_id = ${gameId}
        `);
        
        // Remove from active game states
        await db.execute(sql`
          DELETE FROM esquilo_game_states WHERE game_id = ${gameId}
        `);
        
        // Mark game as finished
        gameState.isActive = false;
        activeGames.delete(gameId);
        gameBoxes.delete(gameId);
        
        return res.json({
          result: 'cashout',
          multiplier: gameState.currentMultiplier,
          winAmount
        });
      }
      
      // Get or recreate boxes for this game (using gameId as seed for consistency)
      let boxes = gameBoxes.get(gameId);
      if (!boxes) {
        // Recreate boxes with same seed to ensure consistency
        const user = await storage.getUser(req.userId);
        const isDemo = user?.cpf === '999.999.999-99';
        
        // Get probabilities from database
        let prizes: any[] = [];
        try {
          const probs = await db.execute(sql`
            SELECT prize_type AS "prizeType", multiplier, probability 
            FROM esquilo_probabilities 
            WHERE for_demo = ${isDemo} 
            ORDER BY multiplier
          `);
          
          if (probs.rows.length > 0) {
            prizes = probs.rows;
          }
        } catch (error) {
          console.error("Error fetching Esquilo probabilities:", error);
        }
        
        // Default probabilities if not in database
        if (prizes.length === 0) {
          prizes = [
            { prizeType: 'pinecone', multiplier: '0.3', probability: '30' },
            { prizeType: 'acorn', multiplier: '0.5', probability: '25' },
            { prizeType: 'apple', multiplier: '0.8', probability: '25' },
            { prizeType: 'ring', multiplier: '2.0', probability: '15' },
            { prizeType: 'goldenacorn', multiplier: '5.0', probability: '5' }
          ];
        }
        
        // Generate boxes using gameId as seed for consistency
        boxes = [];
        
        // Simple seeded random based on gameId
        const seed = gameId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const seededRandom = (i: number) => {
          const x = Math.sin(seed + i) * 10000;
          return x - Math.floor(x);
        };
        
        // Add 2 foxes
        boxes.push({ type: 'fox', multiplier: 0 });
        boxes.push({ type: 'fox', multiplier: 0 });
        
        // Generate 7 prizes based on probabilities
        for (let i = 0; i < 7; i++) {
          const random = seededRandom(i) * 100;
          let cumulative = 0;
          let selectedPrize = prizes[0];
          
          for (const prize of prizes) {
            cumulative += parseFloat(prize.probability);
            if (random < cumulative) {
              selectedPrize = prize;
              break;
            }
          }
          
          boxes.push({
            type: selectedPrize.prizeType,
            multiplier: parseFloat(selectedPrize.multiplier)
          });
        }
        
        // Shuffle using seeded random
        for (let i = boxes.length - 1; i > 0; i--) {
          const j = Math.floor(seededRandom(i + 10) * (i + 1));
          [boxes[i], boxes[j]] = [boxes[j], boxes[i]];
        }
        
        // Store regenerated boxes
        gameBoxes.set(gameId, boxes);
      }
      
      const boxIdNum = parseInt(boxId);
      
      // Enhanced validation
      if (isNaN(boxIdNum) || boxIdNum < 0 || boxIdNum > 8) {
        return res.status(400).json({ error: "Baú inválido" });
      }
      
      if (!boxes || boxes.length !== 9) {
        return res.status(500).json({ error: "Estado do jogo inválido" });
      }
      
      // Check if box was already opened
      if (gameState.openedBoxes && gameState.openedBoxes.has(boxIdNum)) {
        return res.status(400).json({ error: "Baú já foi aberto" });
      }
      
      // Get the selected box
      const selectedBox = boxes[boxIdNum];
      
      // Mark box as opened
      if (!gameState.openedBoxes) {
        gameState.openedBoxes = new Set<number>();
      }
      gameState.openedBoxes.add(boxIdNum);
      
      if (selectedBox.type === 'fox') {
        // Found fox - game over
        gameState.isActive = false;
        activeGames.delete(gameId);
        gameBoxes.delete(gameId);
        
        // Update game history in database
        await db.execute(sql`
          UPDATE esquilo_games 
          SET status = 'lost',
              final_multiplier = 0,
              win_amount = 0,
              opened_boxes = ${JSON.stringify(Array.from(gameState.openedBoxes))},
              completed_at = NOW()
          WHERE game_id = ${gameId}
        `);
        
        // Remove from active game states
        await db.execute(sql`
          DELETE FROM esquilo_game_states WHERE game_id = ${gameId}
        `);
        
        return res.json({
          result: 'fox',
          prizeType: 'fox',
          prizeMultiplier: 0,
          multiplier: 0,
          gameOver: true,
          winAmount: 0,
          boxes // Send all boxes to reveal them
        });
      } else {
        // Found prize
        let prizeMultiplier = selectedBox.multiplier;
        const originalMultiplier = selectedBox.multiplier;
        
        // Check for bonus mode activation FIRST (10% chance by default)
        // Only activate if bonus hasn't been activated before in this game
        let bonusActivated = false;
        let bonusMultipliers: number[] = [];
        
        try {
          // Get bonus chance from database
          const bonusChanceResult = await db.execute(sql`
            SELECT bonus_chance FROM esquilo_probabilities LIMIT 1
          `);
          
          const bonusChance = bonusChanceResult.rows.length > 0 
            ? parseFloat(bonusChanceResult.rows[0].bonus_chance || '10') 
            : 10;
          
          // Check if bonus mode should activate (only once per game)
          // Only activate if:
          // 1. Never activated before in this game
          // 2. No active bonus multiplier
          if (!gameState.bonusUsed && !gameState.activeBonusMultiplier && Math.random() * 100 < bonusChance) {
            bonusActivated = true;
            gameState.bonusActivated = true; // Mark bonus as activated
            // Don't mark as used yet - will be marked after selection
            
            // Get user to check if demo
            const user = await storage.getUser(req.userId);
            const isDemo = user?.cpf === '999.999.999-99';
            
            // Get bonus multipliers from database
            const bonusProbs = await db.execute(sql`
              SELECT multiplier, probability 
              FROM esquilo_bonus_probabilities 
              WHERE for_demo = ${isDemo} 
              ORDER BY multiplier
            `);
            
            if (bonusProbs.rows.length >= 8) {
              // Get all 8 configured multipliers
              bonusMultipliers = bonusProbs.rows.map(row => parseFloat(row.multiplier));
              
              // Ensure we have exactly 8 multipliers
              if (bonusMultipliers.length > 8) {
                bonusMultipliers = bonusMultipliers.slice(0, 8);
              }
              
              // Shuffle the multipliers to randomize positions
              for (let i = bonusMultipliers.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [bonusMultipliers[i], bonusMultipliers[j]] = [bonusMultipliers[j], bonusMultipliers[i]];
              }
              
              // Store multipliers in game state
              gameState.bonusMultipliers = bonusMultipliers;
              
              // Update database with bonus activation and box state
              await storage.updateEsquiloGameState(gameId, {
                bonusActivated: true,
                bonusMultipliers,
                boxes
              });
              
              await db.execute(sql`
                UPDATE esquilo_games 
                SET bonus_activated = true,
                    bonus_multipliers = ${JSON.stringify(bonusMultipliers)},
                    boxes = ${JSON.stringify(boxes)}
                WHERE game_id = ${gameId}
              `);
              
            } else {
              // Default multipliers if not enough in database - use all 8 different values
              bonusMultipliers = [1.5, 2, 3, 5, 10, 20, 50, 100];
              
              // Shuffle
              for (let i = bonusMultipliers.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [bonusMultipliers[i], bonusMultipliers[j]] = [bonusMultipliers[j], bonusMultipliers[i]];
              }
              
              // Store multipliers in game state
              gameState.bonusMultipliers = bonusMultipliers;
            }
            
            // Store bonus multipliers for this game
            const bonusData = activeGames.get(gameId);
            if (bonusData) {
              bonusData.bonusMultipliers = bonusMultipliers;
              bonusData.bonusActivated = true;
            }
          }
        } catch (error) {
          console.error("Error checking bonus mode:", error);
        }
        
        // IMPORTANT: Only apply bonus multiplier if:
        // 1. There's an active bonus multiplier AND
        // 2. The bonus was NOT just activated naturally on this box
        // For purchased bonus, activeBonusMultiplier is set immediately, so it applies from first box
        // For natural bonus, activeBonusMultiplier is only set after selecting a bonus chest
        if (gameState.activeBonusMultiplier && !bonusActivated) {
          prizeMultiplier = prizeMultiplier * gameState.activeBonusMultiplier;
          console.log(`Applying bonus multiplier: ${originalMultiplier} * ${gameState.activeBonusMultiplier} = ${prizeMultiplier}`);
        } else if (bonusActivated) {
          // Natural bonus just activated - don't apply multiplier to this box
          console.log(`Natural bonus activated on this box - no multiplier applied to current prize: ${originalMultiplier}`);
        }
        
        // Add to total multiplier
        gameState.currentMultiplier += prizeMultiplier;
        const winAmount = gameState.betAmount * gameState.currentMultiplier;
        
        // Update game state in database with box contents and bonus info
        await storage.updateEsquiloGameState(gameId, {
          currentMultiplier: gameState.currentMultiplier.toString(),
          openedBoxes: Array.from(gameState.openedBoxes),
          boxes,
          activeBonusMultiplier: gameState.activeBonusMultiplier ? gameState.activeBonusMultiplier.toString() : undefined
        });
        
        // Update game history with box contents
        await db.execute(sql`
          UPDATE esquilo_games 
          SET opened_boxes = ${JSON.stringify(Array.from(gameState.openedBoxes))},
              boxes = ${JSON.stringify(boxes)}
          WHERE game_id = ${gameId}
        `);
        
        return res.json({
          result: 'treasure',
          prizeType: selectedBox.type,
          prizeMultiplier: prizeMultiplier, // Return the actual multiplier applied (with or without bonus)
          multiplier: gameState.currentMultiplier,
          gameOver: false,
          winAmount,
          bonusActivated,
          bonusUsed: gameState.bonusUsed,
          bonusMultipliers: bonusActivated ? bonusMultipliers : undefined,
          activeBonusMultiplier: gameState.activeBonusMultiplier
        });
      }
      
      // Rest of the play logic is already handled above
    } catch (error) {
      console.error("Jogo do Esquilo play error:", error);
      res.status(500).json({ error: "Erro ao jogar" });
    }
  });

  // Esquilo Bonus Mode endpoint
  app.post("/api/games/jogo-esquilo/:gameId/bonus", authenticateToken, async (req: any, res) => {
    try {
      const { gameId } = req.params;
      const { chestId } = req.body;
      
      const gameState = activeGames.get(gameId);
      
      if (!gameState) {
        return res.status(404).json({ error: "Jogo não encontrado" });
      }
      
      // Verify user owns this game
      if (gameState.userId !== req.userId) {
        return res.status(404).json({ error: "Jogo não encontrado" });
      }
      
      // Check if bonus mode is active
      if (!gameState.bonusActivated) {
        return res.status(400).json({ error: "Modo bônus não está ativo" });
      }
      
      // Validate chest ID
      if (chestId < 0 || chestId >= 8) {
        return res.status(400).json({ error: "Baú bônus inválido" });
      }
      
      // Get bonus probabilities from database
      const isDemo = req.userType === 'demo';
      const bonusProbsResult = await db.execute(sql`
        SELECT multiplier, probability 
        FROM esquilo_bonus_probabilities 
        WHERE for_demo = ${isDemo}
        ORDER BY multiplier
      `);
      
      let availableMultipliers = [];
      let probabilities = [];
      
      if (bonusProbsResult.rows.length >= 8) {
        // Use configured probabilities
        for (const row of bonusProbsResult.rows) {
          availableMultipliers.push(parseFloat(row.multiplier));
          probabilities.push(parseFloat(row.probability));
        }
      } else {
        // Default values if not configured
        availableMultipliers = [1.5, 2, 3, 5, 10, 20, 50, 100];
        probabilities = [30, 25, 20, 12, 8, 3, 1.5, 0.5]; // Default probabilities
      }
      
      // Calculate the selected multiplier based on probabilities
      const random = Math.random() * 100;
      let cumulative = 0;
      let selectedMultiplier = availableMultipliers[0];
      
      for (let i = 0; i < availableMultipliers.length && i < probabilities.length; i++) {
        cumulative += probabilities[i];
        if (random < cumulative) {
          selectedMultiplier = availableMultipliers[i];
          break;
        }
      }
      
      // Generate the other 7 multipliers to show (not selected)
      // Remove the selected multiplier from available ones
      const remainingMultipliers = availableMultipliers.filter(m => m !== selectedMultiplier);
      
      // If we have fewer than 7 remaining, duplicate some
      while (remainingMultipliers.length < 7) {
        const randomIndex = Math.floor(Math.random() * availableMultipliers.length);
        remainingMultipliers.push(availableMultipliers[randomIndex]);
      }
      
      // Take only 7 for the other boxes
      const otherMultipliers = remainingMultipliers.slice(0, 7);
      
      // Create final array with selected multiplier at the clicked position
      const finalMultipliers = [...otherMultipliers];
      finalMultipliers.splice(chestId, 0, selectedMultiplier);
      
      // Ensure we have exactly 8 multipliers
      if (finalMultipliers.length > 8) {
        finalMultipliers.length = 8;
      }
      
      // Store the bonus multiplier to apply to all future prizes
      gameState.activeBonusMultiplier = selectedMultiplier;
      gameState.bonusActivated = false; // Bonus mode selection done
      gameState.bonusUsed = true; // Mark bonus as used
      
      console.log(`Bonus chest selected: position ${chestId}, multiplier ${selectedMultiplier}`);
      
      // Get boxes for saving state
      const boxes = gameBoxes.get(gameId) || [];
      
      // Update database with bonus selection and box state
      await storage.updateEsquiloGameState(gameId, {
        activeBonusMultiplier: selectedMultiplier.toString(),
        bonusUsed: true,
        bonusActivated: false,
        boxes
      });
      
      await db.execute(sql`
        UPDATE esquilo_games 
        SET active_bonus_multiplier = ${selectedMultiplier},
            bonus_activated = false,
            bonus_used = true,
            boxes = ${JSON.stringify(boxes)}
        WHERE game_id = ${gameId}
      `);
      
      // Current winnings stay the same - the multiplier will apply to future prizes
      const currentWinnings = gameState.betAmount * gameState.currentMultiplier;
      
      return res.json({
        result: 'bonus',
        selectedMultiplier,
        currentWinnings,
        totalMultiplier: gameState.currentMultiplier,
        allMultipliers: finalMultipliers, // Return the rearranged multipliers
        message: `Multiplicador ${selectedMultiplier}x será aplicado aos próximos prêmios!`
      });
      
    } catch (error) {
      console.error("Jogo do Esquilo bonus error:", error);
      res.status(500).json({ error: "Erro ao processar bônus" });
    }
  });

  // Legacy game route
  app.post("/api/games/play", gameLimiter, authenticateToken, async (req: any, res) => {
    try {
      const { gameType } = req.body;

      if (!gameType || !(gameType in GAME_CONFIGS)) {
        return res.status(400).json({ message: "Tipo de jogo inválido" });
      }

      const config = GAME_CONFIGS[gameType as keyof typeof GAME_CONFIGS];
      const wallet = await storage.getWallet(req.userId);

      if (
        !wallet ||
        !wallet.balance ||
        parseFloat(wallet.balance || '0') < parseFloat(config.cost)
      ) {
        return res.status(400).json({ message: "Saldo insuficiente" });
      }

      // Generate game result
      const result = generateScratchResult(
        gameType as keyof typeof GAME_CONFIGS,
      );

      // Create game record
      const game = await storage.createGame({
        userId: req.userId,
        gameType,
        cost: config.cost,
        prize: result.prize.toString(),
        result: JSON.stringify(result.grid),
        won: result.won,
      });

      // Update wallet balance
      const newBalance =
        parseFloat(wallet.balance || '0') - parseFloat(config.cost) + result.prize;
      await storage.updateWalletBalance(req.userId, newBalance.toFixed(2));

      res.json({
        gameId: game.id,
        result: result.grid,
        won: result.won,
        prize: result.prize,
        newBalance: newBalance.toFixed(2),
      });
    } catch (error) {
      console.error("Game play error:", error);
      res.status(500).json({ message: "Erro ao jogar" });
    }
  });

  app.get("/api/games/history", authenticateToken, async (req: any, res) => {
    try {
      // Get esquilo games from database
      const esquiloGamesResult = await db.execute(sql`
        SELECT 
          game_id as "gameId",
          bet_amount as "betAmount",
          final_multiplier as "finalMultiplier",
          win_amount as "winAmount",
          used_bonus as "usedBonus",
          status,
          boxes,
          opened_boxes as "openedBoxes",
          bonus_activated as "bonusActivated",
          bonus_multipliers as "bonusMultipliers",
          active_bonus_multiplier as "activeBonusMultiplier",
          started_at as "startedAt",
          completed_at as "completedAt"
        FROM esquilo_games 
        WHERE user_id = ${req.userId} 
        ORDER BY started_at DESC 
        LIMIT 100
      `);

      // Format esquilo games for frontend
      const esquiloGames = esquiloGamesResult.rows.map((game: any) => ({
        ...game,
        gameType: 'esquilo',
        playedAt: game.completedAt || game.startedAt,
        cost: parseFloat(game.betAmount),
        prize: parseFloat(game.winAmount || '0'),
        won: game.status === 'won' || game.status === 'cashed_out',
        betAmount: parseFloat(game.betAmount),
        finalMultiplier: parseFloat(game.finalMultiplier || '0'),
        winAmount: parseFloat(game.winAmount || '0')
      }));

      // Get premio games
      const premios = await storage.getGamePremiosByUser(req.userId);

      // Combine and sort by playedAt date
      const allGames = [...esquiloGames, ...premios].sort(
        (a, b) =>
          new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime(),
      );

      // Limit to 100 most recent games
      const limitedGames = allGames.slice(0, 100);

      res.json(limitedGames);
    } catch (error) {
      console.error("Game history error:", error);
      res.status(500).json({ message: "Erro ao buscar histórico" });
    }
  });

  // Active game session routes
  app.get(
    "/api/games/active-sessions",
    authenticateToken,
    async (req: any, res) => {
      try {
        const sessions = await storage.getUserActiveGameSessions(req.userId);
        res.json(sessions);
      } catch (error) {
        console.error("Get active sessions error:", error);
        res.status(500).json({ error: "Erro ao buscar sessões ativas" });
      }
    },
  );

  app.post(
    "/api/games/save-state",
    authenticateToken,
    async (req: any, res) => {
      try {
        const { gameType, gameId, gameState } = req.body;
        const userId = req.userId;

        console.log("Saving game state:", { userId, gameType, gameId });

        // Use Drizzle ORM instead of raw SQL
        const existingSession = await db
          .select()
          .from(activeGameSessions)
          .where(
            and(
              eq(activeGameSessions.userId, userId),
              eq(activeGameSessions.gameType, gameType)
            )
          )
          .limit(1);

        if (existingSession.length > 0) {
          // Update existing session
          await db
            .update(activeGameSessions)
            .set({
              gameState: gameState,
              updatedAt: new Date()
            })
            .where(
              and(
                eq(activeGameSessions.userId, userId),
                eq(activeGameSessions.gameType, gameType)
              )
            );
          console.log("Updated existing game session");
        } else {
          // Create new session
          await db
            .insert(activeGameSessions)
            .values({
              userId,
              gameType,
              gameId,
              gameState,
              createdAt: new Date(),
              updatedAt: new Date()
            });
          console.log("Created new game session");
        }

        res.json({ success: true });
      } catch (error) {
        console.error("Save game state error - detailed:", error);
        res.status(500).json({ error: "Erro ao salvar estado do jogo" });
      }
    },
  );

  app.get(
    "/api/games/restore-state/:gameType",
    authenticateToken,
    async (req: any, res) => {
      try {
        const { gameType } = req.params;
        const userId = req.userId;
        
        // Use Drizzle ORM instead of raw SQL
        const sessionResult = await db
          .select()
          .from(activeGameSessions)
          .where(
            and(
              eq(activeGameSessions.userId, userId),
              eq(activeGameSessions.gameType, gameType)
            )
          )
          .orderBy(desc(activeGameSessions.createdAt))
          .limit(1);

        if (sessionResult.length === 0) {
          return res
            .status(404)
            .json({ error: "Nenhuma sessão ativa encontrada" });
        }

        const session = sessionResult[0];
        const gameState = session.gameState as any;
        const gameId = gameState?.gameId;
        
        if (gameId && gameType.startsWith('premio-')) {
          const activeGame = activeGames.get(gameId);
          if (!activeGame || activeGame.userId !== req.userId) {
            // Game no longer exists, clean up the stale session
            await storage.deleteActiveGameSession(session.gameId);
            return res
              .status(404)
              .json({ error: "Sessão expirada ou jogo concluído" });
          }
        }

        res.json(session);
      } catch (error) {
        console.error("Restore game state error:", error);
        res.status(500).json({ error: "Erro ao restaurar estado do jogo" });
      }
    },
  );

  app.delete(
    "/api/games/clear-state/:gameId",
    authenticateToken,
    async (req: any, res) => {
      try {
        const { gameId } = req.params;

        // Get all active sessions for the user
        const sessions = await storage.getUserActiveGameSessions(req.userId);

        for (const session of sessions) {
          // Check if the gameState is a string or object
          let gameStateObj = session.gameState as any;
          if (typeof gameStateObj === "string") {
            try {
              gameStateObj = JSON.parse(gameStateObj);
            } catch (e) {
              // If parsing fails, delete the session anyway
              await storage.deleteActiveGameSession(session.gameId);
              continue;
            }
          }

          // Delete if:
          // 1. The session gameId matches the requested gameId
          // 2. The gameState contains the requested gameId
          // 3. It's a premio game type (to ensure cleanup)
          if (
            session.gameId === gameId ||
            (gameStateObj && (gameStateObj as any).gameId === gameId) ||
            (session.gameType.startsWith("premio-") &&
              gameStateObj &&
              (gameStateObj as any).gameId === gameId)
          ) {
            await storage.deleteActiveGameSession(session.gameId);
          }
        }

        res.json({ success: true });
      } catch (error) {
        console.error("Clear game state error:", error);
        res.status(500).json({ error: "Erro ao limpar estado do jogo" });
      }
    },
  );

  // Clear all active sessions for a user
  app.delete(
    "/api/games/clear-all-sessions",
    authenticateToken,
    async (req: any, res) => {
      try {
        const sessions = await storage.getUserActiveGameSessions(req.userId);
        for (const session of sessions) {
          await storage.deleteActiveGameSession(session.gameId);
        }
        res.json({ success: true, cleared: sessions.length });
      } catch (error) {
        console.error("Clear all sessions error:", error);
        res.status(500).json({ error: "Erro ao limpar sessões" });
      }
    },
  );

  // Clear sessions by game type
  app.delete(
    "/api/games/clear-game-type/:gameType",
    authenticateToken,
    async (req: any, res) => {
      try {
        const { gameType } = req.params;
        const userId = req.userId;

        // Use Drizzle ORM instead of raw SQL
        const result = await db
          .delete(activeGameSessions)
          .where(
            and(
              eq(activeGameSessions.userId, userId),
              eq(activeGameSessions.gameType, gameType)
            )
          );

        res.json({ success: true, cleared: 0 });
      } catch (error) {
        console.error("Clear game type sessions error:", error);
        res
          .status(500)
          .json({ error: "Erro ao limpar sessões do tipo de jogo" });
      }
    },
  );

  // Payment routes
  app.post(
    "/api/payments/create-pix",
    authenticateToken,
    async (req: any, res) => {
      try {
        const { amount } = req.body;

        console.log("Create PIX request:", { userId: req.userId, amount });

        if (!amount || amount < 15) {
          return res.status(400).json({ message: "Valor mínimo é R$ 15,00" });
        }

        const user = await storage.getUser(req.userId);
        if (!user) {
          return res.status(404).json({ message: "Usuário não encontrado" });
        }

        // Check if this is a demo account (CPF 99999999999)
        if (user.cpf === '99999999999') {
          return res.status(403).json({ message: "Contas demo não podem fazer depósitos" });
        }

        console.log("Creating PIX for user:", {
          id: user.id,
          name: user.name,
          email: user.email,
          utmData: {
            utmSrc: user.utmSrc,
            utmSource: user.utmSource,
            utmMedium: user.utmMedium,
            utmCampaign: user.utmCampaign,
            utmTerm: user.utmTerm,
            utmContent: user.utmContent
          }
        });

        // Generate unique displayId for deposit
        const depositDisplayId = Math.floor(10000 + Math.random() * 90000);
        
        // Create deposit record first (with temporary transaction ID)
        const deposit = await storage.createDeposit({
          userId: req.userId,
          displayId: depositDisplayId,
          transactionId: `TEMP-${Date.now()}`,
          amount: amount.toString(),
          pixCode: "",
          status: "pending",
          paymentProvider: "lirapay",
        });
        
        // Create PIX payment with deposit ID
        const pixResponse = await createPixPaymentHandler(
          amount * 100, // Amount will be converted to reais inside the handler
          {
            name: user.name,
            phone: user.phone,
            email: user.email,
            cpf: user.cpf || '00000000000',
          },
          deposit.id,
          {
            utmSrc: user.utmSrc,
            utmSource: user.utmSource,
            utmMedium: user.utmMedium,
            utmCampaign: user.utmCampaign,
            utmTerm: user.utmTerm,
            utmContent: user.utmContent
          }
        );

        console.log("PIX creation response:", pixResponse);

        // Check for the new API response format
        if (!pixResponse.pixCode || !pixResponse.transactionId) {
          console.error("PIX creation failed - Invalid response:", pixResponse);
          // Delete the temporary deposit
          await db.delete(deposits).where(eq(deposits.id, deposit.id));
          return res
            .status(400)
            .json({ message: "Erro ao criar pagamento PIX" });
        }
        
        // Update deposit with actual PIX data
        await db.update(deposits)
          .set({
            transactionId: pixResponse.transactionId,
            pixCode: pixResponse.pixCode
          })
          .where(eq(deposits.id, deposit.id));
        
        // Send Discord notification for pending deposit
        try {
          const user = await storage.getUser(req.userId);
          const { notifyDepositPending } = await import('./discord-webhook');
          await notifyDepositPending({
            userId: req.userId,
            userName: user?.name || 'Unknown',
            amount: amount.toString(),
            transactionId: pixResponse.transactionId,
            paymentProvider: pixResponse.provider || 'unknown'
          });
        } catch (error) {
          console.error("Error sending Discord notification for pending deposit:", error);
        }
        
        // Create pending commission for partner/affiliate when deposit is created
        try {
          const user = await storage.getUser(req.userId);
          
          // Check if user has partnerId (registered via partner code)
          if (user && user.partnerId) {
            const [partner] = await db.select()
              .from(partners)
              .where(eq(partners.id, user.partnerId))
              .limit(1);
            
            if (partner) {
              // Calculate total commission (for affiliate)
              const affiliate = await storage.getAffiliateById(partner.affiliateId);
              if (affiliate && affiliate.isActive) {
                let totalCommission: number;
                
                if (affiliate.commissionType === 'fixed') {
                  totalCommission = parseFloat(affiliate.customFixedAmount || affiliate.fixedCommissionAmount || '6.00');
                } else {
                  const rate = parseFloat(affiliate.customCommissionRate || affiliate.currentLevelRate || '40.00');
                  totalCommission = amount * rate / 100;
                }
                
                // Calculate partner's share
                let partnerCommission: number;
                if (partner.commissionType === 'fixed') {
                  partnerCommission = parseFloat(partner.fixedCommissionAmount || '3.00');
                } else {
                  const partnerRate = parseFloat(partner.commissionRate || '5.00');
                  partnerCommission = amount * partnerRate / 100;
                }
                
                // Partner cannot receive more than total commission
                if (partnerCommission > totalCommission) {
                  partnerCommission = totalCommission * 0.5;
                }
                
                // Calculate affiliate's share
                const affiliateCommission = Math.max(0, totalCommission - partnerCommission);
                
                // Create pending partner conversion
                await db.insert(partnerConversions).values({
                  partnerId: partner.id,
                  affiliateId: partner.affiliateId,
                  userId: req.userId,
                  type: 'commission',
                  conversionType: 'deposit',
                  conversionValue: amount.toString(),
                  partnerCommission: partnerCommission.toFixed(2),
                  affiliateCommission: affiliateCommission.toFixed(2),
                  commissionRate: partner.commissionType === 'percentage' ? partner.commissionRate : null,
                  status: 'pending', // Pending until deposit is confirmed
                  createdAt: new Date()
                });
                
                // DO NOT create a separate affiliate conversion - the affiliate commission is already tracked in partnerConversions
                // This prevents duplicate entries in the affiliate earnings panel
                
                console.log(`Created pending commission - Partner: R$ ${partnerCommission.toFixed(2)}, Affiliate: R$ ${affiliateCommission.toFixed(2)}`);
              }
            }
          } 
          // If no partner, check for direct affiliate
          else if (user && user.affiliateId) {
            const affiliate = await storage.getAffiliateById(user.affiliateId);
            if (affiliate && affiliate.isActive) {
              let commissionAmount: number;
              let commissionRate: number | null = null;
              
              if (affiliate.commissionType === 'fixed') {
                // Check for custom fixed amount first
                if (affiliate.customFixedAmount) {
                  commissionAmount = parseFloat(affiliate.customFixedAmount);
                } else {
                  commissionAmount = parseFloat(affiliate.fixedCommissionAmount || '6.00');
                }
              } else {
                // Check for custom percentage rate first
                if (affiliate.customCommissionRate) {
                  commissionRate = parseFloat(affiliate.customCommissionRate);
                } else {
                  commissionRate = parseFloat(affiliate.currentLevelRate || '40.00');
                }
                commissionAmount = amount * commissionRate / 100;
              }
              
              await storage.createAffiliateConversion({
                affiliateId: affiliate.id,
                userId: req.userId,
                conversionType: 'deposit',
                conversionValue: amount.toString(),
                commission: commissionAmount.toFixed(2),
                commissionRate: commissionRate ? commissionRate.toFixed(2) : null,
                status: 'pending' // Will be updated when deposit is confirmed
              });
              
              console.log(`Created pending commission for deposit ${deposit.id}: R$ ${commissionAmount.toFixed(2)} (${commissionRate ? commissionRate + '%' : 'fixed'})`);
            }
          }
        } catch (error) {
          console.error("Error creating pending commission:", error);
        }

        res.json({
          transactionId: pixResponse.transactionId,
          qrCode: pixResponse.pixCode,
          amount: amount,
          depositId: deposit.id,
        });
      } catch (error) {
        console.error("Create PIX error:", error);
        res.status(500).json({ message: "Erro ao criar pagamento PIX" });
      }
    },
  );

  app.get(
    "/api/payments/pending-pix",
    authenticateToken,
    async (req: any, res) => {
      try {
        const deposits = await storage.getDepositsByUser(req.userId);
        // Only find deposits that are explicitly "pending", not cancelled or expired
        const pendingDeposit = deposits.find((d) => d.status === "pending");

        console.log(`=== GET PENDING PIX ===`);
        console.log(`User ID: ${req.userId}`);
        console.log(`Total deposits: ${deposits.length}`);
        console.log(`Pending deposit found: ${pendingDeposit ? pendingDeposit.transactionId : 'none'}`);

        if (pendingDeposit) {
          // Check if payment is older than 30 minutes
          const createdAt = new Date(pendingDeposit.createdAt);
          const now = new Date();
          const diffMinutes =
            (now.getTime() - createdAt.getTime()) / (1000 * 60);

          if (diffMinutes > 30) {
            console.log(`PIX expired (${diffMinutes} minutes old), updating status`);
            // Expire the payment
            await storage.updateDepositStatus(
              pendingDeposit.transactionId,
              "expired",
            );
            
            // Cancel the affiliate conversion if exists
            const user = await storage.getUser(req.userId);
            if (user && user.affiliateId) {
              try {
                // Find and cancel any pending conversions for this deposit
                const conversions = await storage.getAffiliateConversionsByUser(req.userId);
                const depositAmount = pendingDeposit.amount;
                
                for (const conversion of conversions) {
                  if (conversion.status === 'pending' && 
                      conversion.conversionValue === depositAmount &&
                      conversion.conversionType === 'deposit') {
                    console.log(`Cancelling affiliate conversion ${conversion.id} for expired deposit`);
                    await storage.updateAffiliateConversionStatus(conversion.id, 'cancelled');
                    
                    // Update affiliate wallet if needed
                    await processAffiliateWalletTransaction(
                      user.affiliateId,
                      0, // No value since it's cancelled
                      conversion.id,
                      'cancelled',
                      `Depósito expirado - Usuário #${req.userId}`
                    );
                  }
                }
              } catch (error) {
                console.error("Error cancelling affiliate conversion for expired deposit:", error);
              }
            }
            
            return res.json({ hasPending: false });
          }

          console.log(`Returning pending PIX: ${pendingDeposit.transactionId}`);
          return res.json({
            hasPending: true,
            pixData: {
              transactionId: pendingDeposit.transactionId,
              qrCode: pendingDeposit.pixCode,
              amount: parseFloat(pendingDeposit.amount),
              depositId: pendingDeposit.id,
              createdAt: pendingDeposit.createdAt,
            },
          });
        }

        console.log("No pending PIX found");
        res.json({ hasPending: false });
      } catch (error) {
        console.error("Get pending PIX error:", error);
        res.status(500).json({ message: "Erro ao buscar pagamento pendente" });
      }
    },
  );

  app.post(
    "/api/payments/cancel-pix",
    authenticateToken,
    async (req: any, res) => {
      try {
        const { transactionId } = req.body;
        console.log(`=== CANCEL PIX REQUEST ===`);
        console.log(`Transaction ID to cancel: ${transactionId}`);
        console.log(`User ID: ${req.userId}`);

        if (!transactionId) {
          return res.status(400).json({ message: "ID da transação requerido" });
        }

        // Check if deposit exists and belongs to the user
        const deposit = await storage.getDepositByTransactionId(transactionId);
        if (!deposit) {
          console.log("Deposit not found for transaction:", transactionId);
          return res.status(404).json({ message: "Pagamento não encontrado" });
        }

        if (deposit.userId !== req.userId) {
          console.log("Deposit does not belong to user");
          return res.status(403).json({ message: "Não autorizado" });
        }

        if (deposit.status !== "pending") {
          console.log(`Deposit status is ${deposit.status}, cannot cancel`);
          return res.status(400).json({ message: "Pagamento não pode ser cancelado" });
        }

        // Update deposit status to cancelled
        await storage.updateDepositStatus(transactionId, "cancelled");
        console.log(`Successfully cancelled PIX transaction: ${transactionId}`);
        
        // Cancel the affiliate conversion if exists
        const user = await storage.getUser(req.userId);
        if (user && user.affiliateId) {
          try {
            // Find and cancel any pending conversions for this deposit
            const conversions = await storage.getAffiliateConversionsByUser(req.userId);
            const depositAmount = deposit.amount;
            
            for (const conversion of conversions) {
              if (conversion.status === 'pending' && 
                  conversion.conversionValue === depositAmount &&
                  conversion.conversionType === 'deposit') {
                console.log(`Cancelling affiliate conversion ${conversion.id} for cancelled deposit`);
                await storage.updateAffiliateConversionStatus(conversion.id, 'cancelled');
                
                // Update affiliate wallet to mark transaction as cancelled
                await processAffiliateWalletTransaction(
                  user.affiliateId,
                  0, // No value since it's cancelled
                  conversion.id,
                  'cancelled',
                  `Depósito cancelado - Usuário #${req.userId}`
                );
              }
            }
          } catch (error) {
            console.error("Error cancelling affiliate conversion for cancelled deposit:", error);
          }
        }

        // Cancel partner conversions if exists
        if (user && user.partnerId) {
          try {
            // Find and cancel any pending partner conversions for this deposit
            const partnerConversionsResult = await db
              .select()
              .from(partnerConversions)
              .where(
                and(
                  eq(partnerConversions.userId, req.userId),
                  eq(partnerConversions.status, 'pending'),
                  eq(partnerConversions.conversionType, 'deposit')
                )
              );
            
            const depositAmount = deposit.amount;
            
            for (const conversion of partnerConversionsResult) {
              if (conversion.conversionValue === depositAmount) {
                console.log(`Cancelling partner conversion ${conversion.id} for cancelled deposit`);
                
                // Update partner conversion status to cancelled
                await db
                  .update(partnerConversions)
                  .set({ status: 'cancelled' })
                  .where(eq(partnerConversions.id, conversion.id));
                
                console.log(`Partner conversion ${conversion.id} cancelled successfully`);
              }
            }
          } catch (error) {
            console.error("Error cancelling partner conversion for cancelled deposit:", error);
          }
        }

        res.json({
          status: "success",
          message: "Pagamento cancelado",
        });
      } catch (error) {
        console.error("Cancel PIX error:", error);
        res.status(500).json({ message: "Erro ao cancelar pagamento" });
      }
    },
  );

  app.post(
    "/api/payments/verify-pix",
    authenticateToken,
    async (req: any, res) => {
      try {
        const { transactionId } = req.body;
        console.log(`=== VERIFY PIX REQUEST ===`);
        console.log(`Transaction ID: ${transactionId}`);
        console.log(`User ID: ${req.userId}`);

        if (!transactionId) {
          return res.status(400).json({ message: "ID da transação requerido" });
        }

        // First check if already completed in database
        const existingDeposit = await storage.getDepositByTransactionId(transactionId);
        console.log(`Existing deposit status: ${existingDeposit?.status}`);
        
        if (existingDeposit && existingDeposit.status === "completed") {
          console.log("Payment already completed, returning success");
          const wallet = await storage.getWallet(req.userId);
          return res.json({
            status: "completed",
            message: "Pagamento já confirmado",
            newBalance: wallet?.balance || "0.00",
            scratchBonus: wallet?.scratchBonus || 0
          });
        }

        // Verify payment with provider
        const verification = await verifyPixPayment(transactionId);
        console.log(`Payment verification result: ${verification.status}`);

        if (verification.status === "completed") {
          const deposit =
            await storage.getDepositByTransactionId(transactionId);

          if (deposit && deposit.status === "pending") {
            // Update deposit status
            await storage.updateDepositStatus(transactionId, "completed");

            // Send Discord notification for confirmed deposit
            try {
              const user = await storage.getUser(deposit.userId);
              const { notifyDepositPaid } = await import('./discord-webhook');
              await notifyDepositPaid({
                userId: deposit.userId,
                userName: user?.name || 'Unknown',
                amount: deposit.amount,
                transactionId: transactionId,
                paymentProvider: deposit.paymentProvider || 'unknown'
              });
            } catch (error) {
              console.error("Error sending Discord notification for paid deposit:", error);
            }

            // Update wallet balance
            const wallet = await storage.getWallet(deposit.userId);
            if (wallet && wallet.balance) {
              const newBalance =
                parseFloat(wallet.balance || '0') + parseFloat(deposit.amount);
              await storage.updateWalletBalance(
                deposit.userId,
                newBalance.toFixed(2),
              );
              
              // Get user to check for applied coupons
              const user = await storage.getUser(deposit.userId);
              
              // Process affiliate commission if applicable
              if (user && user.affiliateId) {
                // Get the affiliate details directly
                const affiliate = await storage.getAffiliateById(user.affiliateId);
                if (affiliate && affiliate.isActive) {
                  let commissionAmount: number;
                  let commissionRate: number | null = null;
                  
                  if (affiliate.commissionType === 'fixed') {
                    // Check for custom fixed amount first
                    if (affiliate.customFixedAmount) {
                      commissionAmount = parseFloat(affiliate.customFixedAmount);
                    } else {
                      commissionAmount = parseFloat(affiliate.fixedCommissionAmount || '6.00');
                    }
                  } else {
                    // Check for custom percentage rate first
                    if (affiliate.customCommissionRate) {
                      commissionRate = parseFloat(affiliate.customCommissionRate);
                    } else {
                      commissionRate = parseFloat(affiliate.currentLevelRate || '40.00');
                    }
                    const depositAmount = parseFloat(deposit.amount.toString());
                    commissionAmount = depositAmount * commissionRate / 100;
                  }
                  
                  // Create affiliate conversion record
                  await storage.createAffiliateConversion({
                    affiliateId: affiliate.id,
                    userId: deposit.userId,
                    conversionType: 'deposit',
                    conversionValue: deposit.amount,
                    commission: commissionAmount.toFixed(2),
                    commissionRate: commissionRate ? commissionRate.toFixed(2) : null,
                    status: 'pending' // Will be marked as completed when admin approves
                  });
                  
                  console.log(`Created affiliate commission: R$${commission.toFixed(2)} for affiliate ${affiliate.id} from deposit of R$${depositAmount}`);
                }
              }
              const depositAmount = parseFloat(deposit.amount.toString());
              
              // Check if this is the user's first deposit
              const isFirstDeposit = user && !user.hasFirstDeposit;
              
              let bonusAmount = 0;
              let finalScratchBonus = wallet.scratchBonus || 0;
              
              // Define the fixed tier structure for scratch card bonuses
              const bonusTiers = [
                { minAmount: 300, cards: 250 },
                { minAmount: 200, cards: 150 },
                { minAmount: 150, cards: 100 },
                { minAmount: 100, cards: 60 },
                { minAmount: 80, cards: 45 },
                { minAmount: 60, cards: 30 },
                { minAmount: 50, cards: 24 },
                { minAmount: 40, cards: 12 },
                { minAmount: 30, cards: 6 },
                { minAmount: 20, cards: 3 },
                { minAmount: 15, cards: 1 }
              ];
              
              // Check if user has an applied coupon
              if (user && user.couponApplied === 1 && user.currentCoupon) {
                const coupon = await storage.getCoupon(user.currentCoupon);
                
                if (coupon && coupon.isActive && depositAmount >= parseFloat(coupon.minDeposit)) {
                  // Apply fixed tier bonus based on deposit amount
                  const tier = bonusTiers.find(t => depositAmount >= t.minAmount);
                  if (tier) {
                    bonusAmount = tier.cards;
                    console.log(`Coupon ${coupon.code}: ${bonusAmount} scratch cards bonus for R$${depositAmount} deposit`);
                  }
                  
                  // Track coupon use for this deposit
                  await storage.createCouponUse({
                    couponId: coupon.id,
                    userId: deposit.userId,
                    depositId: deposit.id
                  });
                  
                  // Update coupon usage count
                  await storage.incrementCouponUsageCount(coupon.id);
                  
                  // DO NOT remove coupon - it stays active for future deposits
                  console.log(`Coupon ${coupon.code} applied with ${bonusAmount} bonus cards`);
                } else if (coupon && depositAmount < parseFloat(coupon.minDeposit)) {
                  console.log(`Coupon ${coupon.code} not applied: deposit amount ${depositAmount} < minimum ${coupon.minDeposit}`);
                }
              }
              
              // Update user's first deposit status if this is their first deposit
              if (isFirstDeposit) {
                await storage.updateUserFirstDeposit(deposit.userId);
                console.log(`User ${deposit.userId} marked as having made first deposit`);
              }
              
              // Apply bonus if any
              if (bonusAmount > 0) {
                finalScratchBonus = (wallet.scratchBonus || 0) + bonusAmount;
                await storage.updateWalletScratchBonus(deposit.userId, finalScratchBonus);
                console.log(`Scratch bonus added: ${bonusAmount} cards (total: ${finalScratchBonus})`);
              }
              
              // Validate referral if applicable
              await validateReferralOnDeposit(deposit.userId, deposit.amount);
              
              // Process commission for ALL deposits from referred users
              await processReferralCommission(deposit.userId, deposit.amount);
              
              res.json({
                status: "completed",
                message: "Pagamento confirmado",
                newBalance: newBalance.toFixed(2),
                scratchBonus: finalScratchBonus,
              });
            } else {
              res.json({
                status: "completed",
                message: "Pagamento confirmado",
                newBalance: parseFloat(deposit.amount).toFixed(2),
              });
            }
          } else {
            res.json({
              status: "completed",
              message: "Pagamento já processado",
            });
          }
        } else {
          res.json({
            status: "pending",
            message: "Pagamento ainda não confirmado",
          });
        }
      } catch (error) {
        console.error("Verify PIX error:", error);
        res.status(500).json({ message: "Erro ao verificar pagamento" });
      }
    },
  );

  // Simulate successful payment (TEST ONLY)
  app.post(
    "/api/payments/simulate-success",
    authenticateToken,
    async (req: any, res) => {
      try {
        const { transactionId } = req.body;

        if (!transactionId) {
          return res.status(400).json({ message: "ID da transação requerido" });
        }

        // Get the deposit
        const deposit = await storage.getDepositByTransactionId(transactionId);

        if (!deposit) {
          return res.status(404).json({ message: "Depósito não encontrado" });
        }

        if (deposit.userId !== req.userId) {
          return res.status(403).json({ message: "Acesso negado" });
        }

        if (deposit.status === "completed") {
          return res.json({
            status: "already_completed",
            message: "Pagamento já processado",
          });
        }

        // Update deposit status to completed
        await storage.updateDepositStatus(transactionId, "completed");

        // Update wallet balance
        const wallet = await storage.getWallet(deposit.userId);
        if (wallet && wallet.balance) {
          const newBalance =
            parseFloat(wallet.balance || '0') + parseFloat(deposit.amount);
          await storage.updateWalletBalance(
            deposit.userId,
            newBalance.toFixed(2),
          );

          // Get user to check for applied coupons
          const user = await storage.getUser(deposit.userId);
          const depositAmount = parseFloat(deposit.amount.toString());
          
          // Check if this is the user's first deposit
          const isFirstDeposit = user && !user.hasFirstDeposit;
          
          let bonusAmount = 0;
          
          // Define the fixed tier structure for scratch card bonuses
          const bonusTiers = [
            { minAmount: 300, cards: 250 },
            { minAmount: 200, cards: 150 },
            { minAmount: 150, cards: 100 },
            { minAmount: 100, cards: 60 },
            { minAmount: 80, cards: 45 },
            { minAmount: 60, cards: 30 },
            { minAmount: 50, cards: 24 },
            { minAmount: 40, cards: 12 },
            { minAmount: 30, cards: 6 },
            { minAmount: 20, cards: 3 },
            { minAmount: 15, cards: 1 }
          ];
          
          // Check if user has an applied coupon
          if (user && user.couponApplied === 1 && user.currentCoupon) {
            const coupon = await storage.getCoupon(user.currentCoupon);
            
            if (coupon && coupon.isActive && depositAmount >= parseFloat(coupon.minDeposit)) {
              // Apply fixed tier bonus based on deposit amount
              const tier = bonusTiers.find(t => depositAmount >= t.minAmount);
              if (tier) {
                bonusAmount = tier.cards;
                console.log(`Coupon ${coupon.code}: ${bonusAmount} scratch cards bonus for R$${depositAmount} deposit`);
              }
              
              // Track coupon use for this deposit
              await storage.createCouponUse({
                couponId: coupon.id,
                userId: deposit.userId,
                depositId: deposit.id,
              });
              
              // Update coupon usage count
              await storage.incrementCouponUsageCount(coupon.id);
              
              // DO NOT remove coupon - it stays active for future deposits
              console.log(`Coupon ${coupon.code} applied with ${bonusAmount} bonus cards`);
            } else if (coupon && depositAmount < parseFloat(coupon.minDeposit)) {
              console.log(`Coupon ${coupon.code} not applied: deposit amount ${depositAmount} < minimum ${coupon.minDeposit}`);
            }
          } else if (isFirstDeposit) {
            // Apply fixed tier bonus for first deposit without coupon
            const tier = bonusTiers.find(t => depositAmount >= t.minAmount);
            if (tier) {
              bonusAmount = tier.cards;
              console.log(`First deposit bonus: ${bonusAmount} scratch cards for R$${depositAmount} deposit`);
            }
          }
          // Update user's first deposit status if this is their first deposit
          if (isFirstDeposit) {
            await storage.updateUserFirstDeposit(deposit.userId);
            console.log(`User ${deposit.userId} marked as having made first deposit`);
          }
          
          // Apply bonus if any
          if (bonusAmount > 0) {
            const currentScratchBonus = wallet.scratchBonus || 0;
            const newScratchBonus = currentScratchBonus + bonusAmount;
            await storage.updateWalletScratchBonus(deposit.userId, newScratchBonus);
            console.log(`Scratch bonus added: ${bonusAmount} cards (total: ${newScratchBonus})`);
          }
          
          // Validate referral if applicable
          await validateReferralOnDeposit(deposit.userId, deposit.amount);
          
          // Process commission for ALL deposits from referred users
          await processReferralCommission(deposit.userId, deposit.amount);

          // Get final scratch bonus after applying coupon
          const finalWallet = await storage.getWallet(deposit.userId);
          const finalScratchBonus = finalWallet?.scratchBonus || 0;
          
          res.json({
            status: "success",
            message: "Pagamento simulado com sucesso",
            newBalance: newBalance.toFixed(2),
            scratchBonus: finalScratchBonus,
          });
        } else {
          res.json({
            status: "success",
            message: "Pagamento simulado com sucesso",
            newBalance: parseFloat(deposit.amount).toFixed(2),
          });
        }
      } catch (error) {
        console.error("Simulate payment error:", error);
        console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
        res.status(500).json({ message: "Erro ao simular pagamento" });
      }
    },
  );

  // Withdrawal routes
  // Webhook route for LiraPay PIX payment notifications
  app.post("/api/webhook/lirapay", async (req, res) => {
    try {
      console.log("=== WEBHOOK LIRAPAY RECEIVED ===");
      console.log("Headers:", req.headers);
      console.log("Body:", JSON.stringify(req.body, null, 2));

      // Process LiraPay webhook
      await handleLiraPayWebhook(req.body);

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("LiraPay webhook error:", error);
      res.status(500).json({ success: false });
    }
  });

  // Legacy webhook route for backwards compatibility
  app.post("/api/webhook/pix", async (req, res) => {
    try {
      console.log("=== WEBHOOK PIX RECEIVED ===");
      console.log("Headers:", req.headers);
      console.log("Body:", JSON.stringify(req.body, null, 2));

      // Payment webhook sends different formats, so we need to handle multiple scenarios
      const transactionId = req.body.transactionId || req.body.transaction_id || req.body.id;
      const status = req.body.status || req.body.payment_status;
      const amount = req.body.amount || req.body.value;
      
      console.log(`Processing webhook - TransactionID: ${transactionId}, Status: ${status}, Amount: ${amount}`);

      if (!transactionId) {
        console.error("Webhook error: No transaction ID provided");
        return res.status(400).json({ message: "Transaction ID não fornecido" });
      }

      // Payment API uses different status values
      const isPaymentCompleted = 
        status === "completed" || 
        status === "paid" || 
        status === "approved" || 
        status === "PAID" ||
        status === "APPROVED" ||
        status === "success";

      if (isPaymentCompleted) {
        console.log(`Payment confirmed for transaction ${transactionId}`);
        
        // Get deposit info
        const deposit = await storage.getDepositByTransactionId(transactionId);
        
        if (!deposit) {
          console.error(`No deposit found for transaction ${transactionId}`);
          // Still return success to avoid webhook retries
          return res.json({ success: true });
        }

        if (deposit.status === "completed") {
          console.log(`Deposit ${transactionId} already completed, skipping`);
          return res.json({ success: true });
        }

        if (deposit.status === "pending") {
          console.log(`Processing deposit for user ${deposit.userId}, amount: ${deposit.amount}`);
          
          // Update deposit status
          await storage.updateDepositStatus(transactionId, "completed");
          console.log(`Deposit status updated to completed`);

          // Update wallet balance
          const wallet = await storage.getWallet(deposit.userId);
          if (!wallet) {
            console.error(`No wallet found for user ${deposit.userId}`);
            return res.status(500).json({ message: "Carteira não encontrada" });
          }

          const oldBalance = parseFloat(wallet.balance || "0");
          const depositAmount = parseFloat(deposit.amount.toString());
          const newBalance = oldBalance + depositAmount;
          
          await storage.updateWalletBalance(deposit.userId, newBalance.toFixed(2));
          console.log(`Wallet balance updated: ${oldBalance} -> ${newBalance}`);

          // Get user to check for applied coupons
          const user = await storage.getUser(deposit.userId);
          if (!user) {
            console.error(`No user found for ID ${deposit.userId}`);
            return res.status(500).json({ message: "Usuário não encontrado" });
          }
          
          // Check if this is the user's first deposit
          const userDeposits = await storage.getDepositsByUser(deposit.userId);
          const completedDeposits = userDeposits.filter(d => d.status === 'completed');
          const isFirstDeposit = completedDeposits.length === 0; // This deposit isn't completed yet in the list
          
          let bonusAmount = 0;
          let couponUsed = false;
          
          // Check if user has an applied coupon
          if (user.couponApplied === 1 && user.currentCoupon) {
            const coupon = await storage.getCoupon(user.currentCoupon);
            
            if (coupon && coupon.isActive && depositAmount >= parseFloat(coupon.minDeposit)) {
              // Apply coupon bonus
              if (coupon.bonusType === 'scratch_cards') {
                bonusAmount = coupon.bonusAmount ? parseInt(coupon.bonusAmount.toString()) : 0;
                console.log(`Coupon ${coupon.code}: ${bonusAmount} scratch cards bonus`);
              } else if (coupon.bonusType === 'percentage') {
                // For percentage bonus, calculate based on deposit amount
                const percentage = coupon.bonusAmount ? parseFloat(coupon.bonusAmount.toString()) : 0;
                bonusAmount = Math.floor(depositAmount * (percentage / 100));
                console.log(`Coupon ${coupon.code}: ${percentage}% bonus = ${bonusAmount} scratch cards`);
              }
              
              // Track coupon use for this deposit
              await storage.createCouponUse({
                couponId: coupon.id,
                userId: deposit.userId,
                depositId: deposit.id,
              });
              
              // Update coupon usage count
              await storage.incrementCouponUsageCount(coupon.id);
              
              // DO NOT remove coupon - it stays active for future deposits
              couponUsed = true;
              console.log(`Coupon ${coupon.code} applied with ${bonusAmount} bonus cards`);
            } else if (coupon && depositAmount < coupon.minDeposit) {
              console.log(`Coupon ${coupon.code} not applied: deposit amount ${depositAmount} < minimum ${coupon.minDeposit}`);
            }
          
          }
          // Update user's first deposit status if this is their first deposit
          if (isFirstDeposit) {
            await storage.updateUserFirstDeposit(deposit.userId);
            console.log(`User ${deposit.userId} marked as having made first deposit`);
          }
          
          // Apply bonus if any
          if (bonusAmount > 0) {
            const currentScratchBonus = wallet.scratchBonus || 0;
            const newScratchBonus = currentScratchBonus + bonusAmount;
            await storage.updateWalletScratchBonus(deposit.userId, newScratchBonus);
            console.log(`Scratch bonus added: ${bonusAmount} cards (total: ${newScratchBonus})`);
          }
          
          // Validate referral if applicable
          try {
            await validateReferralOnDeposit(deposit.userId, deposit.amount);
            console.log(`Referral validation completed for user ${deposit.userId}`);
          } catch (error) {
            console.error("Error validating referral:", error);
          }
          
          // Process commission for ALL deposits from referred users
          try {
            await processReferralCommission(deposit.userId, deposit.amount);
            console.log(`Referral commission processed for user ${deposit.userId}`);
          } catch (error) {
            console.error("Error processing referral commission:", error);
          }
          
          // Process affiliate commission if user has an affiliate
          try {
            console.log(`=== CALLING processAffiliateCommission ===`);
            console.log(`User ID: ${deposit.userId}`);
            console.log(`Deposit Amount: ${deposit.amount}`);
            await processAffiliateCommission(deposit.userId, deposit.amount);
            console.log(`Affiliate commission processed for user ${deposit.userId}`);
          } catch (error) {
            console.error("Error processing affiliate commission:", error);
          }
          
          // Track affiliate code deposits
          if (user?.affiliateId) {
            // Check if user was registered with an affiliate code
            const affiliateCodes = await storage.getAffiliateCodes(user.affiliateId);
            
            // For now, update the first active code with registrations
            // In a production system, you'd track which specific code was used
            for (const code of affiliateCodes) {
              if (code.totalRegistrations > 0 && code.isActive) {
                await storage.updateAffiliateCodeStats(code.code, 'totalDeposits');
                console.log(`Payment: Updated deposit stats for affiliate code ${code.code}`);
                break; // Only update one code
              }
            }
          }

          // Get final wallet state for logging
          const finalWallet = await storage.getWallet(deposit.userId);
          const finalScratchBonus = finalWallet?.scratchBonus || 0;
          
          console.log(`=== WEBHOOK PROCESSING COMPLETED SUCCESSFULLY ===`);
          console.log(`User ${deposit.userId}: Balance ${newBalance}, Scratch Bonus: ${finalScratchBonus}`);
        }
      } else {
        console.log(`Payment status ${status} - no action needed`);
      }

      // Always return success to prevent webhook retries
      res.json({ success: true, message: "Webhook processado com sucesso" });
    } catch (error) {
      console.error("=== WEBHOOK ERROR ===");
      console.error("Error details:", error);
      console.error("Stack trace:", (error as any).stack);
      
      // Still return success to avoid infinite webhook retries
      res.json({ success: true, message: "Erro processado" });
    }
  });

  // OrinPay webhook endpoints
  app.post("/api/webhook/orinpay/transaction", async (req, res) => {
    try {
      console.log("=== ORINPAY TRANSACTION WEBHOOK RECEIVED ===");
      console.log("Headers:", req.headers);
      console.log("Body:", JSON.stringify(req.body, null, 2));

      // OrinPay webhook format based on documentation
      const transactionId = req.body.id || req.body.transactionId || req.body.reference;
      const status = req.body.status || req.body.payment_status;
      const amount = req.body.amount || req.body.value;
      
      console.log(`Processing OrinPay webhook - TransactionID: ${transactionId}, Status: ${status}, Amount: ${amount}`);

      if (!transactionId) {
        console.error("OrinPay webhook error: No transaction ID provided");
        return res.status(400).json({ message: "Transaction ID não fornecido" });
      }

      // OrinPay uses different status values
      const isPaymentCompleted = 
        status === "paid" || 
        status === "completed" || 
        status === "approved" || 
        status === "confirmed" ||
        status === "success";

      if (isPaymentCompleted) {
        console.log(`OrinPay payment confirmed for transaction ${transactionId}`);
        
        // Get deposit info by reference
        const deposit = await storage.getDepositByTransactionId(transactionId.toString());
        
        if (!deposit) {
          console.error(`No deposit found for OrinPay transaction ${transactionId}`);
          // Still return success to avoid webhook retries
          return res.json({ success: true });
        }

        if (deposit.status === "completed") {
          console.log(`OrinPay deposit ${transactionId} already completed, skipping`);
          return res.json({ success: true });
        }

        if (deposit.status === "pending") {
          console.log(`Processing OrinPay deposit for user ${deposit.userId}, amount: ${deposit.amount}`);
          
          // Update deposit status
          await storage.updateDepositStatus(transactionId.toString(), "completed");
          console.log(`OrinPay deposit status updated to completed`);

          // Update wallet balance
          const wallet = await storage.getWallet(deposit.userId);
          if (!wallet) {
            console.error(`No wallet found for user ${deposit.userId}`);
            return res.status(500).json({ message: "Carteira não encontrada" });
          }

          const oldBalance = parseFloat(wallet.balance || "0");
          const depositAmount = parseFloat(deposit.amount.toString());
          const newBalance = oldBalance + depositAmount;
          
          await storage.updateWalletBalance(deposit.userId, newBalance.toFixed(2));
          console.log(`OrinPay wallet updated: Old balance: ${oldBalance}, Deposit: ${depositAmount}, New balance: ${newBalance}`);

          // Get user for affiliate commission and other checks
          const user = await storage.getUser(deposit.userId);
          
          // Track affiliate code deposits
          if (user?.affiliateId) {
            // Check if user was registered with an affiliate code
            const affiliateCodes = await storage.getAffiliateCodes(user.affiliateId);
            
            // For now, update the first active code with registrations
            // In a production system, you'd track which specific code was used
            for (const code of affiliateCodes) {
              if (code.totalRegistrations > 0 && code.isActive) {
                await storage.updateAffiliateCodeStats(code.code, 'totalDeposits');
                console.log(`OrinPay: Updated deposit stats for affiliate code ${code.code}`);
                break; // Only update one code
              }
            }
          }

          // Handle scratch bonus and coupons
          // User already fetched above for affiliate tracking
          const isFirstDeposit = user && !user.hasFirstDeposit;
          
          let bonusAmount = 0;
          let newScratchBonus = wallet.scratchBonus || 0;
          
          // Define the fixed tier structure for scratch card bonuses
          const bonusTiers = [
            { minAmount: 300, cards: 250 },
            { minAmount: 200, cards: 150 },
            { minAmount: 150, cards: 100 },
            { minAmount: 100, cards: 60 },
            { minAmount: 80, cards: 45 },
            { minAmount: 60, cards: 30 },
            { minAmount: 50, cards: 24 },
            { minAmount: 40, cards: 12 },
            { minAmount: 30, cards: 6 },
            { minAmount: 20, cards: 3 },
            { minAmount: 15, cards: 1 }
          ];
          
          // Check if user has an applied coupon
          if (user && user.couponApplied === 1 && user.currentCoupon) {
            const coupon = await storage.getCoupon(user.currentCoupon);
            
            if (coupon && coupon.isActive && depositAmount >= parseFloat(coupon.minDeposit)) {
              // Apply fixed tier bonus based on deposit amount
              const tier = bonusTiers.find(t => depositAmount >= t.minAmount);
              if (tier) {
                bonusAmount = tier.cards;
                console.log(`OrinPay Coupon ${coupon.code}: ${bonusAmount} scratch cards bonus for R$${depositAmount} deposit`);
              }
              
              // Track coupon use for this deposit
              await storage.createCouponUse({
                couponId: coupon.id,
                userId: deposit.userId,
                depositId: deposit.id
              });
              
              // Update coupon usage count
              await storage.incrementCouponUsageCount(coupon.id);
              
              // DO NOT remove coupon - it stays active for future deposits
              
              console.log(`OrinPay Coupon ${coupon.code} applied with ${bonusAmount} bonus cards`);
            } else if (coupon && depositAmount < parseFloat(coupon.minDeposit)) {
              console.log(`OrinPay Coupon ${coupon.code} not applied: deposit amount ${depositAmount} < minimum ${coupon.minDeposit}`);
            }
          }
          
          // Update user's first deposit status if this is their first deposit
          if (isFirstDeposit) {
            await storage.updateUserFirstDeposit(deposit.userId);
            console.log(`OrinPay User ${deposit.userId} marked as having made first deposit`);
          }
          
          // Apply bonus if any
          if (bonusAmount > 0) {
            const currentScratchBonus = wallet.scratchBonus || 0;
            newScratchBonus = currentScratchBonus + bonusAmount;
            await storage.updateWalletScratchBonus(deposit.userId, newScratchBonus);
            console.log(`OrinPay Scratch bonus added: ${bonusAmount} cards (total: ${newScratchBonus})`);
          }
          
          // Validate referral if applicable
          try {
            await validateReferralOnDeposit(deposit.userId, deposit.amount);
            console.log(`OrinPay Referral validation completed for user ${deposit.userId}`);
          } catch (error) {
            console.error("OrinPay Error validating referral:", error);
          }
          
          // Process commission for ALL deposits from referred users
          try {
            await processReferralCommission(deposit.userId, deposit.amount);
            console.log(`OrinPay Referral commission processed for user ${deposit.userId}`);
          } catch (error) {
            console.error("OrinPay Error processing referral commission:", error);
          }
          
          // Process affiliate commission if user has an affiliate
          try {
            await processAffiliateCommission(deposit.userId, deposit.amount);
            console.log(`OrinPay Affiliate commission processed for user ${deposit.userId}`);
          } catch (error) {
            console.error("OrinPay Error processing affiliate commission:", error);
          }

          console.log(`=== ORINPAY WEBHOOK PROCESSING COMPLETED SUCCESSFULLY ===`);
          console.log(`User ${deposit.userId}: Balance ${newBalance}, Scratch Bonus: ${newScratchBonus}`);
        }
      } else {
        console.log(`OrinPay Payment status ${status} - no action needed`);
      }

      // Always return success to prevent webhook retries
      res.json({ success: true, message: "OrinPay webhook processado com sucesso" });
    } catch (error) {
      console.error("=== ORINPAY WEBHOOK ERROR ===");
      console.error("Error details:", error);
      console.error("Stack trace:", (error as any).stack);
      
      // Still return success to avoid infinite webhook retries
      res.json({ success: true, message: "Erro processado" });
    }
  });

  // OrinPay withdrawal webhook
  app.post("/api/webhook/orinpay/withdrawal", async (req, res) => {
    try {
      console.log("=== ORINPAY WITHDRAWAL WEBHOOK RECEIVED ===");
      console.log("Headers:", req.headers);
      console.log("Body:", JSON.stringify(req.body, null, 2));

      const withdrawalId = req.body.id || req.body.withdrawalId || req.body.reference;
      const status = req.body.status || req.body.payment_status;
      
      console.log(`Processing OrinPay withdrawal webhook - ID: ${withdrawalId}, Status: ${status}`);

      if (!withdrawalId) {
        console.error("OrinPay withdrawal webhook error: No withdrawal ID provided");
        return res.status(400).json({ message: "Withdrawal ID não fornecido" });
      }

      // OrinPay withdrawal status handling
      const isWithdrawalCompleted = 
        status === "paid" || 
        status === "completed" || 
        status === "success";

      const isWithdrawalFailed = 
        status === "failed" || 
        status === "rejected" || 
        status === "cancelled";

      if (isWithdrawalCompleted || isWithdrawalFailed) {
        // Get withdrawal info
        const withdrawal = await storage.getWithdrawal(withdrawalId);
        
        if (!withdrawal) {
          console.error(`No withdrawal found for OrinPay ID ${withdrawalId}`);
          // Still return success to avoid webhook retries
          return res.json({ success: true });
        }

        if (withdrawal.status === "completed" || withdrawal.status === "rejected") {
          console.log(`OrinPay withdrawal ${withdrawalId} already processed (${withdrawal.status}), skipping`);
          return res.json({ success: true });
        }

        if (isWithdrawalCompleted) {
          await storage.updateWithdrawalStatus(withdrawalId, "completed");
          console.log(`OrinPay withdrawal ${withdrawalId} marked as completed`);
        } else if (isWithdrawalFailed) {
          await storage.updateWithdrawalStatus(withdrawalId, "rejected");
          
          // Refund the amount to user's wallet
          const wallet = await storage.getWallet(withdrawal.userId);
          if (wallet) {
            const currentBalance = parseFloat(wallet.balance || "0");
            const withdrawalAmount = parseFloat(withdrawal.amount);
            const newBalance = currentBalance + withdrawalAmount;
            
            await storage.updateWalletBalance(withdrawal.userId, newBalance.toFixed(2));
            console.log(`OrinPay withdrawal failed - refunded ${withdrawalAmount} to user ${withdrawal.userId}`);
          }
        }

        console.log(`=== ORINPAY WITHDRAWAL WEBHOOK COMPLETED ===`);
      } else {
        console.log(`OrinPay Withdrawal status ${status} - no action needed`);
      }

      // Always return success to prevent webhook retries
      res.json({ success: true, message: "OrinPay withdrawal webhook processado com sucesso" });
    } catch (error) {
      console.error("=== ORINPAY WITHDRAWAL WEBHOOK ERROR ===");
      console.error("Error details:", error);
      console.error("Stack trace:", (error as any).stack);
      
      // Still return success to avoid infinite webhook retries
      res.json({ success: true, message: "Erro processado" });
    }
  });


  // Fast payment status check endpoint (for real-time updates)
  app.get(
    "/api/payments/status/:transactionId",
    authenticateToken,
    async (req: any, res) => {
      try {
        const { transactionId } = req.params;
        
        // Quick check - only database, no external API calls
        const deposit = await storage.getDepositByTransactionId(transactionId);
        
        if (!deposit) {
          return res.status(404).json({ status: "not_found" });
        }
        
        if (deposit.userId !== req.userId) {
          return res.status(403).json({ status: "forbidden" });
        }
        
        // If completed, return with updated balance info
        if (deposit.status === "completed") {
          const wallet = await storage.getWallet(req.userId);
          return res.json({ 
            status: deposit.status,
            completed: true,
            newBalance: wallet?.balance || "0.00",
            scratchBonus: wallet?.scratchBonus || 0
          });
        }
        
        // Return minimal response for fast polling
        res.json({ 
          status: deposit.status,
          completed: false
        });
      } catch (error) {
        console.error("Payment status check error:", error);
        res.status(500).json({ status: "error" });
      }
    },
  );

  // Direct payment confirmation endpoint for testing
  app.post("/api/payments/confirm-test", async (req: any, res) => {
    try {
      console.log("=== DIRECT PAYMENT CONFIRMATION ===");
      const { transactionId } = req.body;
      
      if (!transactionId) {
        return res.status(400).json({ message: "Transaction ID é obrigatório" });
      }

      // Get the deposit
      const deposit = await storage.getDepositByTransactionId(transactionId);
      
      if (!deposit) {
        return res.status(404).json({ message: "Depósito não encontrado" });
      }

      if (deposit.status === "completed") {
        return res.json({ 
          success: true, 
          message: "Pagamento já foi confirmado anteriormente" 
        });
      }

      // Update deposit status
      await storage.updateDepositStatus(transactionId, "completed");

      // Update user balance
      const wallet = await storage.getWallet(deposit.userId);
      const currentBalance = parseFloat(wallet?.balance || "0");
      const depositAmount = parseFloat(deposit.amount.toString());
      const newBalance = currentBalance + depositAmount;

      await storage.updateWalletBalance(deposit.userId, newBalance.toFixed(2));

      // Handle first deposit bonus
      let finalScratchBonus = wallet?.scratchBonus || 0;
      const user = await storage.getUser(deposit.userId);
      
      if (user && user.firstDepositCompleted === false) {
        const bonusCards = Math.floor(depositAmount);
        finalScratchBonus += bonusCards;
        
        await storage.updateWalletScratchBonus(deposit.userId, finalScratchBonus);
        // Mark first deposit as completed
        await db.update(users)
          .set({ firstDepositCompleted: true })
          .where(eq(users.id, deposit.userId));
        
        console.log(`First deposit bonus applied: ${bonusCards} scratch cards`);
      }

      // Process referral commission
      try {
        await processReferralCommission(deposit.userId, deposit.amount);
        console.log(`Referral commission processed for user ${deposit.userId}`);
      } catch (error) {
        console.error("Error processing referral commission:", error);
      }

      // Process affiliate commission (auto-approved)
      try {
        await processAffiliateCommission(deposit.userId, deposit.amount);
        console.log(`Affiliate commission auto-approved for user ${deposit.userId}`);
      } catch (error) {
        console.error("Error processing affiliate commission:", error);
      }

      console.log(`Payment confirmed: User ${deposit.userId}, Balance: ${newBalance}, Scratch Bonus: ${finalScratchBonus}`);

      res.json({
        success: true,
        message: "Pagamento confirmado com sucesso",
        newBalance: newBalance.toFixed(2),
        scratchBonus: finalScratchBonus
      });
    } catch (error) {
      console.error("Direct payment confirmation error:", error);
      res.status(500).json({ message: "Erro ao confirmar pagamento" });
    }
  });

  // Test webhook endpoint for development
  app.post("/api/webhook/test-pix", authenticateToken, async (req: any, res) => {
    try {
      console.log("=== TEST WEBHOOK PIX ===");
      const { transactionId } = req.body;
      
      if (!transactionId) {
        return res.status(400).json({ message: "Transaction ID é obrigatório" });
      }
      
      // Simulate IronPay webhook call
      const webhookPayload = {
        transactionId: transactionId,
        status: "paid",
        payment_status: "PAID",
        amount: null // Will be fetched from deposit
      };
      
      console.log("Simulating webhook with payload:", webhookPayload);
      
      // Dynamic import for ESM module
      const { default: fetch } = await import("node-fetch");
      
      // Call the webhook endpoint internally
      const webhookResponse = await fetch(`http://localhost:5000/api/webhook/pix`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload)
      });
      
      const result = await webhookResponse.json();
      console.log("Webhook response:", result);
      
      res.json({
        success: true,
        message: "Webhook de teste enviado com sucesso",
        webhookResponse: result
      });
    } catch (error) {
      console.error("Test webhook error:", error);
      res.status(500).json({ message: "Erro ao enviar webhook de teste" });
    }
  });

  app.post(
    "/api/withdrawals/request",
    authenticateToken,
    async (req: any, res) => {
      try {
        const { amount, pixKey } = req.body;

        if (!amount || amount < 10) {
          return res
            .status(400)
            .json({ message: "Valor mínimo para saque é R$ 10,00" });
        }

        const wallet = await storage.getWallet(req.userId);
        if (!wallet || !wallet.balance || parseFloat(wallet.balance || '0') < amount) {
          return res.status(400).json({ message: "Saldo insuficiente" });
        }

        // Validate PIX key type - Only CPF/CNPJ allowed
        const pixKeyType = detectPixKeyType(pixKey);
        if (!pixKeyType) {
          return res.status(400).json({ message: "Chave PIX inválida. Use apenas CPF ou CNPJ" });
        }

        // Create withdrawal request
        const displayId = Math.floor(10000 + Math.random() * 90000);
        const withdrawal = await storage.createWithdrawal({
          userId: req.userId,
          displayId,
          amount: amount.toString(),
          pixKey,
          pixKeyType,
          status: "pending",
        });

        // Update wallet balance
        const newBalance = parseFloat(wallet.balance || '0') - amount;
        await storage.updateWalletBalance(req.userId, newBalance.toFixed(2));

        res.json({
          withdrawalId: withdrawal.id,
          message: "Solicitação de saque enviada",
          newBalance: newBalance.toFixed(2),
        });
      } catch (error) {
        console.error("Withdrawal request error:", error);
        res.status(500).json({ message: "Erro ao solicitar saque" });
      }
    },
  );

  app.get(
    "/api/withdrawals/history",
    authenticateToken,
    async (req: any, res) => {
      try {
        const withdrawals = await storage.getWithdrawalsByUser(req.userId);
        res.json(withdrawals);
      } catch (error) {
        console.error("Withdrawal history error:", error);
        res.status(500).json({ message: "Erro ao buscar histórico de saques" });
      }
    },
  );

  // Admin routes
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = adminLoginSchema.parse(req.body);

      // Check admin user in database
      const adminUser = await storage.getAdminUserByUsername(username);
      
      if (!adminUser) {
        return res
          .status(401)
          .json({ message: "Credenciais de admin inválidas" });
      }

      // Compare password with hashed password in database
      const isPasswordValid = await bcrypt.compare(password, adminUser.password);
      
      if (!isPasswordValid) {
        return res
          .status(401)
          .json({ message: "Credenciais de admin inválidas" });
      }

      const sessionId = randomUUID();
      const session = await storage.createAdminSession(sessionId, username);

      // Set session flag for probability routes
      req.session.isAdminAuthenticated = true;
      req.session.adminUsername = username;
      req.session.adminSessionId = sessionId;

      res.json({
        sessionId,
        message: "Login de admin realizado com sucesso",
      });
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(400).json({ message: "Erro ao fazer login de admin" });
    }
  });

  app.post("/api/admin/logout", authenticateAdmin, async (req: any, res) => {
    try {
      await storage.deleteAdminSession(req.adminSession.sessionId);
      res.json({ message: "Logout realizado com sucesso" });
    } catch (error) {
      console.error("Admin logout error:", error);
      res.status(500).json({ message: "Erro ao fazer logout" });
    }
  });

  // Admin check auth
  app.get("/api/admin/check", async (req, res) => {
    const sessionId = req.headers.authorization?.split(" ")[1];

    if (!sessionId) {
      return res.status(401).json({ authenticated: false });
    }

    try {
      const session = await storage.getAdminSession(sessionId);
      if (session) {
        res.json({ authenticated: true, username: session.username });
      } else {
        res.status(401).json({ authenticated: false });
      }
    } catch (error) {
      console.error("Admin check error:", error);
      res.status(500).json({ authenticated: false });
    }
  });

  // Payment configuration endpoints
  app.get("/api/admin/payment-config", authenticateAdmin, async (req, res) => {
    try {
      // Get payment API key from database
      const ironpayApiKey = await getIronpayApiKey();
      
      // Ensure IronPay is always the default provider for now
      const activeProvider = process.env.ACTIVE_PAYMENT_PROVIDER === "orinpay" && process.env.ORINPAY_TOKEN ? "orinpay" : "ironpay";
      
      const config = {
        activeProvider: activeProvider,
        ironpay: {
          apiKey: ironpayApiKey ? "configured" : "not_configured",
          webhookUrl: "https://mania-brasil.com/api/webhook/pix"
        },
        orinpay: {
          token: process.env.ORINPAY_TOKEN ? "configured" : "not_configured",
          webhookUrl: "https://mania-brasil.com/api/webhook/orinpay/transaction"
        }
      };
      
      res.json(config);
    } catch (error) {
      console.error("Error fetching payment config:", error);
      res.status(500).json({ message: "Erro ao buscar configuração de pagamento" });
    }
  });

  // Remove duplicate endpoint - using database-based configuration instead

  // Test endpoint for fake payment approval
  app.post("/api/test/approve-payment", async (req, res) => {
    try {
      console.log("=== TEST PAYMENT APPROVAL ===");
      const { transactionId, depositId, amount } = req.body;
      
      if (!transactionId || !depositId) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      // Get deposit info
      const deposit = await storage.getDepositByTransactionId(transactionId);
      
      if (!deposit) {
        return res.status(404).json({ error: "Deposit not found" });
      }
      
      if (deposit.status === "completed") {
        return res.json({ success: true, message: "Deposit already completed" });
      }
      
      // Update deposit status
      await storage.updateDepositStatus(transactionId, "completed");
      
      // Update wallet balance
      const wallet = await storage.getWallet(deposit.userId);
      if (!wallet) {
        return res.status(500).json({ error: "Wallet not found" });
      }
      
      const oldBalance = parseFloat(wallet.balance || "0");
      const depositAmount = parseFloat(deposit.amount.toString());
      const newBalance = oldBalance + depositAmount;
      
      await storage.updateWalletBalance(deposit.userId, newBalance.toFixed(2));
      
      // Get user to check for coupons and referrals
      const user = await storage.getUser(deposit.userId);
      
      // Define the fixed tier structure for scratch card bonuses
      const bonusTiers = [
        { minAmount: 300, cards: 250 },
        { minAmount: 200, cards: 150 },
        { minAmount: 150, cards: 100 },
        { minAmount: 100, cards: 60 },
        { minAmount: 80, cards: 45 },
        { minAmount: 60, cards: 30 },
        { minAmount: 50, cards: 24 },
        { minAmount: 40, cards: 12 },
        { minAmount: 30, cards: 6 },
        { minAmount: 20, cards: 3 },
        { minAmount: 15, cards: 1 }
      ];
      
      // Check and apply coupon bonus if applicable
      if (user && user.couponApplied === 1 && user.currentCoupon) {
        const coupon = await storage.getCoupon(user.currentCoupon);
        
        if (coupon && coupon.isActive && depositAmount >= parseFloat(coupon.minDeposit)) {
          let bonusAmount = 0;
          
          // Apply fixed tier bonus based on deposit amount
          const tier = bonusTiers.find(t => depositAmount >= t.minAmount);
          if (tier) {
            bonusAmount = tier.cards;
            console.log(`TEST: Coupon ${coupon.code}: ${bonusAmount} scratch cards bonus for R$${depositAmount} deposit`);
          }
          
          if (bonusAmount > 0) {
            // Apply bonus to wallet - get fresh wallet data
            const freshWallet = await storage.getWallet(deposit.userId);
            const currentScratchBonus = freshWallet?.scratchBonus || 0;
            const newScratchBonus = currentScratchBonus + bonusAmount;
            await storage.updateWalletScratchBonus(deposit.userId, newScratchBonus);
            console.log(`TEST: Scratch bonus added: ${bonusAmount} cards (total: ${newScratchBonus})`);
            
            // Track coupon use for this deposit
            await storage.createCouponUse({
              couponId: coupon.id,
              userId: deposit.userId,
              depositId: deposit.id,
            });
            
            // Update coupon usage count
            await storage.incrementCouponUsageCount(coupon.id);
            
            // DO NOT remove coupon - it stays active for future deposits
            console.log(`TEST: Coupon ${coupon.code} applied with ${bonusAmount} bonus cards`);
          }
        } else if (coupon && depositAmount < parseFloat(coupon.minDeposit)) {
          console.log(`TEST: Coupon ${coupon.code} not applied: deposit amount ${depositAmount} < minimum ${coupon.minDeposit}`);
        }
      }
      
      // Process referral commission if applicable
      if (user && user.referralUserId) {
        try {
          const referralConfig = await storage.getReferralConfig();
          const isFirstDeposit = await storage.isFirstCompletedDeposit(deposit.userId);
          
          if (referralConfig.paymentType === "all_deposits" || 
              (referralConfig.paymentType === "first_deposit" && isFirstDeposit)) {
            
            // Create referral earning
            await storage.createReferralEarning({
              referredUserId: deposit.userId,
              referrerUserId: user.referralUserId,
              depositId: deposit.id,
              amount: referralConfig.paymentAmount.toString(),
              status: "pending"
            });
            
            console.log(`TEST: Created referral earning for user ${user.referralUserId}`);
          }
        } catch (error) {
          console.error("TEST: Error processing referral:", error);
        }
      }
      
      // Process affiliate/partner commission if applicable
      // Check for both direct affiliate or partner referral
      console.log(`TEST: Checking commission for user ${deposit.userId}`);
      console.log(`TEST: User has affiliateId: ${user?.affiliateId}, partnerId: ${user?.partnerId}`);
      
      if (user && (user.affiliateId || user.partnerId)) {
        try {
          console.log(`TEST: Calling processAffiliateCommission for user ${deposit.userId}`);
          await processAffiliateCommission(deposit.userId, depositAmount.toFixed(2));
          console.log(`TEST: Successfully processed affiliate/partner commission for deposit ${deposit.id}`);
        } catch (error) {
          console.error("TEST: Error processing affiliate/partner commission:", error);
          console.error("TEST: Error stack:", (error as any).stack);
        }
      } else {
        console.log(`TEST: User has no affiliate or partner, skipping commission`);
      }
      
      console.log(`TEST: Payment approved successfully for deposit ${depositId}`);
      res.json({ success: true, message: "Payment approved (TEST)" });
      
    } catch (error) {
      console.error("TEST approval error:", error);
      res.status(500).json({ error: "Failed to approve payment" });
    }
  });

  // OrinPay Webhook for Transactions
  app.post("/api/webhook/orinpay/transaction", async (req, res) => {
    try {
      console.log("=== ORINPAY TRANSACTION WEBHOOK RECEIVED ===");
      console.log("Headers:", req.headers);
      console.log("Body:", JSON.stringify(req.body, null, 2));

      const { event, id, orderId, status, reference, customer, paymentMethod, pix } = req.body;
      
      // Check if payment is approved
      if (event === "compra_aprovada" && status === "approved") {
        console.log(`OrinPay payment confirmed for reference ${reference}`);
        
        // The reference field should contain our deposit transaction ID
        const transactionId = reference;
        
        if (!transactionId) {
          console.error("No transaction reference provided");
          return res.json({ success: true }); // Still return success to avoid retries
        }

        // Get deposit info
        const deposit = await storage.getDepositByTransactionId(transactionId);
        
        if (!deposit) {
          console.error(`No deposit found for transaction ${transactionId}`);
          return res.json({ success: true });
        }

        if (deposit.status === "completed") {
          console.log(`Deposit ${transactionId} already completed, skipping`);
          return res.json({ success: true });
        }

        if (deposit.status === "pending") {
          console.log(`Processing OrinPay deposit for user ${deposit.userId}, amount: ${deposit.amount}`);
          
          // Update deposit status
          await storage.updateDepositStatus(transactionId, "completed");
          
          // Update wallet balance
          const wallet = await storage.getWallet(deposit.userId);
          if (!wallet) {
            console.error(`No wallet found for user ${deposit.userId}`);
            return res.status(500).json({ message: "Carteira não encontrada" });
          }

          const oldBalance = parseFloat(wallet.balance || "0");
          const depositAmount = parseFloat(deposit.amount.toString());
          const newBalance = oldBalance + depositAmount;
          
          await storage.updateWalletBalance(deposit.userId, newBalance.toFixed(2));
          console.log(`OrinPay: Updated wallet balance from ${oldBalance} to ${newBalance}`);

          // Process referral payment if applicable
          const user = await storage.getUser(deposit.userId);
          if (user?.referrerId) {
            await processReferralPayment(user.referrerId, deposit.userId, depositAmount);
          }

          // Process affiliate commission if applicable
          if (user?.affiliateId) {
            await processAffiliateCommission(deposit.userId, depositAmount.toFixed(2));
          }
        }
      }

      res.json({ success: true });
    } catch (error) {
      console.error("LiraPay webhook error:", error);
      res.status(500).json({ message: "Erro ao processar webhook" });
    }
  });

  // OrinPay Webhook for Withdrawals
  app.post("/api/webhook/orinpay/withdrawal", async (req, res) => {
    try {
      console.log("=== ORINPAY WITHDRAWAL WEBHOOK RECEIVED ===");
      console.log("Headers:", req.headers);
      console.log("Body:", JSON.stringify(req.body, null, 2));

      const { eventType, status: webhookStatus, data } = req.body;
      
      if (!data || !data.metadata) {
        console.error("No withdrawal metadata provided");
        return res.json({ success: true });
      }

      // Parse metadata to get our withdrawal ID
      const metadata = typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata;
      const withdrawalId = metadata.sellerExternalRef;

      if (!withdrawalId) {
        console.error("No withdrawal ID in metadata");
        return res.json({ success: true });
      }

      // Get withdrawal from database
      const withdrawal = await storage.getWithdrawal(parseInt(withdrawalId));
      if (!withdrawal) {
        console.error(`No withdrawal found for ID ${withdrawalId}`);
        return res.json({ success: true });
      }

      // Update withdrawal status based on webhook event
      if (eventType === "WITHDRAWAL_APPROVED" && data.status === "APPROVED") {
        await storage.updateWithdrawalStatus(parseInt(withdrawalId), "completed");
        console.log(`OrinPay: Withdrawal ${withdrawalId} marked as completed`);
      } else if (eventType === "WITHDRAWAL_REJECTED" && data.status === "REJECTED") {
        // Refund the amount back to user's wallet
        const wallet = await storage.getWallet(withdrawal.userId);
        if (wallet) {
          const currentBalance = parseFloat(wallet.balance || '0');
          const withdrawalAmount = parseFloat(withdrawal.amount);
          const newBalance = currentBalance + withdrawalAmount;
          await storage.updateWalletBalance(withdrawal.userId, newBalance.toFixed(2));
        }
        
        await storage.updateWithdrawalStatus(parseInt(withdrawalId), "rejected");
        console.log(`OrinPay: Withdrawal ${withdrawalId} rejected and refunded`);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("OrinPay withdrawal webhook error:", error);
      res.status(500).json({ message: "Erro ao processar webhook de saque" });
    }
  });


  // Helper function to generate premio game results for admin testing (simplified without probabilities)
  const generatePremioGameResultForAdmin = async (type: string, multiplier: number) => {
    // Simple prize values based on game type (no probabilities)
    const prizeValues: Record<string, string[]> = {
        'pix': ["0.50", "1.00", "2.00", "3.00", "4.00", "5.00", "10.00", "15.00", "20.00", "50.00", "100.00", "200.00", "500.00", "1000.00", "2000.00", "5000.00", "10000.00", "100000.00"],
        'me-mimei': ["0.50", "1.00", "2.00", "3.00", "4.00", "5.00", "10.00", "15.00", "20.00", "50.00", "100.00", "200.00", "500.00", "1000.00", "2000.00", "5000.00", "10000.00", "100000.00"],
        'eletronicos': ["0.50", "1.00", "2.00", "3.00", "4.00", "5.00", "10.00", "15.00", "20.00", "50.00", "100.00", "200.00", "500.00", "1000.00", "2000.00", "5000.00", "10000.00", "100000.00"],
        'super-premios': ["10.00", "20.00", "40.00", "60.00", "80.00", "100.00", "200.00", "300.00", "400.00", "1000.00", "2000.00", "4000.00", "10000.00", "20000.00", "200000.00", "500000.00"]
      };
    
    const availablePrizes = prizeValues[type] || [];

    const hiddenValues: string[] = [];
    let winningValue: string | null = null;
    
    // Simple 30% win chance (no probabilities)
    const winChance = Math.random();
    
    if (winChance < 0.30) {
      // Select a random prize (weighted for lower values)
      const weightedIndex = Math.floor(Math.pow(Math.random(), 2) * availablePrizes.length);
      winningValue = availablePrizes[weightedIndex];
    }

    // Generate the grid based on whether we have a winner
    if (winningValue) {
      // Place winning value 3 times
      hiddenValues.push(winningValue, winningValue, winningValue);

      // Fill rest with random values (ensuring no accidental 3-match)
      const allValues = availablePrizes.concat(["", "", ""]);
      for (let i = 3; i < 9; i++) {
        let value;
        do {
          value = allValues[Math.floor(Math.random() * allValues.length)];
        } while (
          hiddenValues.filter((v) => v === value).length >= 2 &&
          value !== ""
        );
        hiddenValues.push(value);
      }
    } else {
      // Generate non-winning grid
      const allValues = availablePrizes.concat(["", "", "", ""]);
      for (let i = 0; i < 9; i++) {
        let value = allValues[Math.floor(Math.random() * allValues.length)];
        // Ensure no value appears 3 times
        while (
          hiddenValues.filter((v) => v === value).length >= 2 &&
          value !== ""
        ) {
          value = allValues[Math.floor(Math.random() * allValues.length)];
        }
        hiddenValues.push(value);
      }
    }

    // Shuffle the values
    for (let i = hiddenValues.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [hiddenValues[i], hiddenValues[j]] = [
        hiddenValues[j],
        hiddenValues[i],
      ];
    }

    return {
      won: !!winningValue,
      prize: winningValue,
      cards: hiddenValues
    };
  };

  // Daily Cashback Routes
  app.get("/api/cashback/status", authenticateToken, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.userId);
      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      // Get user's tier
      const tier = storage.getUserTier(user.totalWagered || "0");
      
      // Get cashback percentage for tier
      const percentages: Record<string, number> = {
        bronze: 1.5,
        silver: 3,
        gold: 6,
        platinum: 12,
        diamond: 24
      };
      
      const percentage = percentages[tier.toLowerCase()] || 1.5;
      
      // Get today's cashback if exists
      const today = new Date().toISOString().split('T')[0];
      console.log('Checking cashback for user:', req.userId, 'date:', today);
      const todaysCashback = await storage.getTodaysCashback(req.userId, today);
      console.log('Found cashback:', todaysCashback);
      
      res.json({
        tier,
        percentage,
        hasCashbackToday: !!todaysCashback,
        cashbackAmount: todaysCashback ? parseFloat(todaysCashback.cashbackAmount) : 0,
        status: todaysCashback?.status || 'none'
      });
    } catch (error) {
      console.error("Get cashback status error:", error);
      res.status(500).json({ error: "Erro ao buscar status do cashback" });
    }
  });

  app.get("/api/cashback/history", authenticateToken, async (req: any, res) => {
    try {
      const cashbackHistory = await storage.getUserCashbackHistory(req.userId);
      res.json(cashbackHistory);
    } catch (error) {
      console.error("Get cashback history error:", error);
      res.status(500).json({ error: "Erro ao buscar histórico de cashback" });
    }
  });

  app.post("/api/cashback/claim", authenticateToken, async (req: any, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const cashback = await storage.getTodaysCashback(req.userId, today);
      
      if (!cashback) {
        return res.status(404).json({ error: "Nenhum cashback disponível hoje" });
      }
      
      if (cashback.status !== 'pending') {
        return res.status(400).json({ error: "Cashback já foi resgatado" });
      }
      
      // Credit cashback to wallet
      const wallet = await storage.getWallet(req.userId);
      if (!wallet) {
        return res.status(404).json({ error: "Carteira não encontrada" });
      }
      
      const newBalance = parseFloat(wallet.balance || '0') + parseFloat(cashback.cashbackAmount.toString());
      await storage.updateWalletBalance(req.userId, newBalance.toFixed(2));
      
      // Mark cashback as credited
      await storage.creditCashback(cashback.id);
      
      res.json({
        success: true,
        amount: parseFloat(cashback.cashbackAmount),
        newBalance: newBalance.toFixed(2)
      });
    } catch (error) {
      console.error("Claim cashback error:", error);
      res.status(500).json({ error: "Erro ao resgatar cashback" });
    }
  });

  // Admin probability management routes
  app.get("/api/admin/probabilities", authenticateAdmin, async (req: any, res) => {
    try {
      // Get all scratch games with their probabilities
      const games = await storage.listScratchGames();
      
      // Get prize probabilities for each game
      const gamesWithProbabilities = await Promise.all(games.map(async (game) => {
        const { probabilities } = await storage.getGameProbabilities(game.game_key);
        return {
          gameKey: game.game_key,
          name: game.name,
          cost: game.cost,
          image: game.image_url,
          isActive: game.is_active,
          prizes: probabilities || []
        };
      }));
      
      res.json(gamesWithProbabilities);
    } catch (error) {
      console.error("Get probabilities error:", error);
      res.status(500).json({ error: "Erro ao buscar probabilidades" });
    }
  });

  app.put("/api/admin/probabilities/:gameKey", authenticateAdmin, async (req: any, res) => {
    try {
      const { gameKey } = req.params;
      const { probabilities } = req.body;
      
      if (!probabilities || !Array.isArray(probabilities)) {
        return res.status(400).json({ message: "Probabilidades inválidas" });
      }
      
      // Validate that probabilities sum to 100%
      const total = probabilities.reduce((sum, p) => sum + (parseFloat(p.probability) || 0), 0);
      if (Math.abs(total - 100) > 0.01) {
        return res.status(400).json({ 
          message: `Soma das probabilidades deve ser 100% (atual: ${total.toFixed(2)}%)`
        });
      }
      
      // Update probabilities
      await storage.updateGameProbabilities(gameKey, probabilities);
      
      res.json({ success: true, message: "Probabilidades atualizadas com sucesso" });
    } catch (error) {
      console.error("Update probabilities error:", error);
      res.status(500).json({ error: "Erro ao atualizar probabilidades" });
    }
  });

  app.post("/api/admin/probabilities/:gameKey/distribute", authenticateAdmin, async (req: any, res) => {
    try {
      const { gameKey } = req.params;
      
      await storage.distributeEqually(gameKey);
      
      res.json({ success: true, message: "Probabilidades distribuídas igualmente" });
    } catch (error) {
      console.error("Distribute probabilities error:", error);
      res.status(500).json({ error: "Erro ao distribuir probabilidades" });
    }
  });

  app.post("/api/admin/probabilities/:gameKey/reset", authenticateAdmin, async (req: any, res) => {
    try {
      const { gameKey } = req.params;
      
      await storage.resetToDefaults(gameKey);
      
      res.json({ success: true, message: "Probabilidades restauradas ao padrão" });
    } catch (error) {
      console.error("Reset probabilities error:", error);
      res.status(500).json({ error: "Erro ao restaurar probabilidades" });
    }
  });

  app.get("/api/admin/probabilities/history", authenticateAdmin, async (req: any, res) => {
    try {
      // Get history of probability changes
      const history = await db
        .select({
          gameKey: prizeProbabilities.gameType,
          updatedBy: prizeProbabilities.updatedBy,
          createdAt: prizeProbabilities.createdAt,
          updatedAt: prizeProbabilities.updatedAt
        })
        .from(prizeProbabilities)
        .orderBy(desc(prizeProbabilities.updatedAt))
        .limit(50);
      
      res.json(history);
    } catch (error) {
      console.error("Get probability history error:", error);
      res.status(500).json({ error: "Erro ao buscar histórico" });
    }
  });

  // Admin Prize Probabilities endpoints
  app.get("/api/admin/prize-probabilities", authenticateAdmin, async (req: any, res) => {
    try {
      const allProbabilities = await storage.getAllPrizeProbabilities();
      
      // Group by game type
      const grouped = allProbabilities.reduce((acc, prob) => {
        if (!acc[prob.gameType]) {
          acc[prob.gameType] = [];
        }
        acc[prob.gameType].push(prob);
        return acc;
      }, {} as Record<string, typeof allProbabilities>);
      
      res.json(grouped);
    } catch (error) {
      console.error("Get prize probabilities error:", error);
      res.status(500).json({ error: "Erro ao buscar probabilidades" });
    }
  });

  app.post("/api/admin/prize-probabilities/:gameType", authenticateAdmin, async (req: any, res) => {
    try {
      const { gameType } = req.params;
      const { probabilities } = req.body;
      
      // Validate that probabilities sum to 100%
      const sum = probabilities.reduce((acc: number, p: any) => acc + p.probability, 0);
      if (Math.abs(sum - 100) > 0.01) {
        return res.status(400).json({ 
          error: `A soma das probabilidades deve ser 100%. Soma atual: ${sum.toFixed(2)}%` 
        });
      }
      
      // Get admin username from session
      const adminUsername = req.adminUsername || 'admin';
      
      // Update probabilities
      await storage.updatePrizeProbabilities(gameType, probabilities, adminUsername);
      
      // Log the change
      console.log(`[AUDIT] Admin ${adminUsername} updated probabilities for ${gameType}`);
      
      res.json({ success: true, message: "Probabilidades atualizadas com sucesso" });
    } catch (error) {
      console.error("Update prize probabilities error:", error);
      res.status(500).json({ error: "Erro ao atualizar probabilidades" });
    }
  });

  // Admin users endpoint
  app.get("/api/admin/users", authenticateAdmin, async (req: any, res) => {
    try {
      const users = await storage.getUsers();
      
      // Get wallet information for each user
      const usersWithWallets = await Promise.all(users.map(async (user) => {
        const wallet = await storage.getWallet(user.id);
        return {
          ...user,
          balance: wallet?.balance || "0.00",
          scratchBonus: wallet?.scratchBonus || 0
        };
      }));
      
      res.json(usersWithWallets);
    } catch (error) {
      console.error("Get admin users error:", error);
      res.status(500).json({ error: "Erro ao buscar usuários" });
    }
  });

  // Admin stats endpoint
  app.get("/api/admin/stats", authenticateAdmin, async (req: any, res) => {
    try {
      const userStats = await storage.getUserStats();
      const revenueStats = await storage.getRevenueStats();
      const gameStats = await storage.getGameStats();
      const withdrawalStats = await storage.getWithdrawalStats();
      
      // Get active affiliates count
      const activeAffiliates = await db
        .select({ count: sql<number>`count(*)` })
        .from(affiliates)
        .where(eq(affiliates.status, 'active'));
      
      // Get today's deposits
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayDeposits = await db
        .select({ count: sql<number>`count(*)` })
        .from(deposits)
        .where(
          and(
            gte(deposits.createdAt, today),
            eq(deposits.status, 'completed')
          )
        );
      
      // Get pending cashbacks
      const pendingCashbacks = await db
        .select({ count: sql<number>`count(*)` })
        .from(dailyCashback)
        .where(eq(dailyCashback.status, 'pending'));
      
      // Get active chats
      const activeChats = await db
        .select({ count: sql<number>`count(*)` })
        .from(supportChats)
        .where(eq(supportChats.status, 'active'));
      
      res.json({
        ...userStats,
        ...revenueStats,
        ...gameStats,
        ...withdrawalStats,
        activeAffiliates: activeAffiliates[0]?.count || 0,
        todayDeposits: todayDeposits[0]?.count || 0,
        pendingCashbacks: pendingCashbacks[0]?.count || 0,
        activeChats: activeChats[0]?.count || 0
      });
    } catch (error) {
      console.error("Get admin stats error:", error);
      res.status(500).json({ error: "Erro ao buscar estatísticas" });
    }
  });

  // Admin cashback routes
  app.get("/api/admin/cashback/pending", authenticateAdmin, async (req: any, res) => {
    try {
      const pendingCashbacks = await storage.getPendingCashbacks();
      res.json(pendingCashbacks);
    } catch (error) {
      console.error("Get pending cashbacks error:", error);
      res.status(500).json({ error: "Erro ao buscar cashbacks pendentes" });
    }
  });

  app.post("/api/admin/cashback/process", authenticateAdmin, async (req: any, res) => {
    try {
      const date = new Date().toISOString().split('T')[0];
      const result = await storage.processDailyCashback(date);
      res.json({
        success: true,
        processed: result.length,
        totalAmount: result.reduce((sum, c) => sum + parseFloat(c.cashback_amount.toString()), 0)
      });
    } catch (error) {
      console.error("Process cashback error:", error);
      res.status(500).json({ error: "Erro ao processar cashback" });
    }
  });

  // Admin endpoints for probability testing
  app.post("/api/admin/games/premio-:type/create", authenticateAdmin, async (req: any, res) => {
    try {
      const { type } = req.params;
      const { multiplier = 1 } = req.body;
      
      // Define base costs
      const baseCosts: Record<string, number> = {
        'pix': 1,
        'me-mimei': 1,
        'eletronicos': 1,
        'super-premios': 20
      };
      
      // Create a test game
      const gameId = Date.now().toString();
      const cost = baseCosts[type] * multiplier;
      
      // Generate cards based on game type using the same logic as regular games
      const { won, prize, cards } = await generatePremioGameResultForAdmin(type, multiplier);
      
      const gameState = {
        id: gameId,
        cards,
        revealedCards: Array(9).fill(false),
        multiplier,
        completed: false,
        won,
        prize,
        type,
        cost
      };
      
      // Store game in memory for testing
      activeGames.set(gameId, {
        userId: 'admin-test',
        type: `premio-${type}`,
        hiddenValues: cards,
        cost,
        multiplier,
        createdAt: new Date(),
      });
      
      res.json({
        gameId,
        cards: Array(9).fill(null), // Hidden initially
        revealedCards: Array(9).fill(false),
        multiplier
      });
    } catch (error) {
      console.error("Admin create game error:", error);
      res.status(500).json({ message: "Erro ao criar jogo de teste" });
    }
  });

  app.post("/api/admin/games/premio-:type/:gameId/reveal", authenticateAdmin, async (req: any, res) => {
    try {
      const { type, gameId } = req.params;
      const { index } = req.body;
      
      const gameState = activeGames.get(gameId);
      if (!gameState) {
        return res.status(404).json({ message: "Jogo não encontrado" });
      }
      
      // For admin testing, reveal all cards at once on last reveal
      const allRevealed = index === 8;
      
      if (allRevealed) {
        const hiddenValues = gameState.hiddenValues;
        
        // Check if won
        const won = hiddenValues.some((value: string) => 
          hiddenValues.filter((v: string) => v === value && value !== "").length >= 3
        );
        
        // Find prize value
        let prize = null;
        if (won) {
          for (const value of hiddenValues) {
            if (value && hiddenValues.filter((v: string) => v === value).length >= 3) {
              prize = value;
              break;
            }
          }
        }
        
        // Clean up game after completion
        setTimeout(() => {
          activeGames.delete(gameId);
        }, 60000); // 1 minute
        
        res.json({
          cards: hiddenValues,
          revealedCards: Array(9).fill(true),
          completed: true,
          won,
          prize
        });
      } else {
        res.json({
          cards: Array(9).fill(null),
          revealedCards: Array(9).fill(false),
          completed: false,
          won: false,
          prize: null
        });
      }
    } catch (error) {
      console.error("Admin reveal card error:", error);
      res.status(500).json({ message: "Erro ao revelar carta" });
    }
  });

  // Optimized batch probability testing endpoint for faster testing
  app.post("/api/admin/games/premio-:type/batch-test", authenticateAdmin, async (req: any, res) => {
    try {
      const { type } = req.params;
      const { multiplier = 1, count = 100 } = req.body;
      
      // Define base costs
      const baseCosts: Record<string, number> = {
        'pix': 1,
        'me-mimei': 1,
        'eletronicos': 1,
        'super-premios': 20
      };
      
      const cost = baseCosts[type] * multiplier;
      
      // Load probabilities once before the loop
      // Simple prize values (no probabilities)
      let probabilities: any[] = [];
      
      console.log(`Loading probabilities for ${type}, found ${probabilities?.length || 0} entries`);
      
      if (!probabilities || probabilities.length === 0) {
        // Use default probabilities if none configured
        const defaultProbs: Record<string, Array<{ value: string; probability: number }>> = {
          'pix': [
            { value: "0.50", probability: 11.00 },
            { value: "1.00", probability: 8.50 },
            { value: "2.00", probability: 5.00 },
            { value: "3.00", probability: 3.20 },
            { value: "4.00", probability: 2.00 },
            { value: "5.00", probability: 1.60 },
            { value: "10.00", probability: 1.20 },
            { value: "15.00", probability: 0.80 },
            { value: "20.00", probability: 0.60 },
            { value: "50.00", probability: 0.40 },
            { value: "100.00", probability: 0.30 },
            { value: "200.00", probability: 0.20 },
            { value: "500.00", probability: 0.10 },
            { value: "1000.00", probability: 0.05 },
            { value: "2000.00", probability: 0.03 },
            { value: "5000.00", probability: 0.01 },
            { value: "10000.00", probability: 0.005 },
            { value: "100000.00", probability: 0.001 },
          ],
          'me-mimei': [
            { value: "0.50", probability: 11.00 },
            { value: "1.00", probability: 8.50 },
            { value: "2.00", probability: 5.00 },
            { value: "3.00", probability: 3.20 },
            { value: "4.00", probability: 2.00 },
            { value: "5.00", probability: 1.60 },
            { value: "10.00", probability: 1.20 },
            { value: "15.00", probability: 0.80 },
            { value: "20.00", probability: 0.60 },
            { value: "50.00", probability: 0.40 },
            { value: "100.00", probability: 0.30 },
            { value: "200.00", probability: 0.20 },
            { value: "500.00", probability: 0.10 },
            { value: "1000.00", probability: 0.05 },
            { value: "2000.00", probability: 0.03 },
            { value: "5000.00", probability: 0.01 },
            { value: "10000.00", probability: 0.005 },
            { value: "100000.00", probability: 0.001 },
          ],
          'eletronicos': [
            { value: "0.50", probability: 11.00 },
            { value: "1.00", probability: 8.50 },
            { value: "2.00", probability: 5.00 },
            { value: "3.00", probability: 3.20 },
            { value: "4.00", probability: 2.00 },
            { value: "5.00", probability: 1.60 },
            { value: "10.00", probability: 1.20 },
            { value: "15.00", probability: 0.80 },
            { value: "20.00", probability: 0.60 },
            { value: "50.00", probability: 0.40 },
            { value: "100.00", probability: 0.30 },
            { value: "200.00", probability: 0.20 },
            { value: "500.00", probability: 0.10 },
            { value: "1000.00", probability: 0.05 },
            { value: "2000.00", probability: 0.03 },
            { value: "5000.00", probability: 0.01 },
            { value: "10000.00", probability: 0.005 },
            { value: "100000.00", probability: 0.001 },
          ],
          'super-premios': [
            { value: "10.00", probability: 11.00 },
            { value: "20.00", probability: 8.50 },
            { value: "40.00", probability: 5.00 },
            { value: "60.00", probability: 3.20 },
            { value: "80.00", probability: 2.00 },
            { value: "100.00", probability: 1.60 },
            { value: "200.00", probability: 1.20 },
            { value: "300.00", probability: 0.80 },
            { value: "400.00", probability: 0.60 },
            { value: "1000.00", probability: 0.40 },
            { value: "2000.00", probability: 0.30 },
            { value: "4000.00", probability: 0.20 },
            { value: "10000.00", probability: 0.10 },
            { value: "20000.00", probability: 0.05 },
            { value: "200000.00", probability: 0.01 },
            { value: "500000.00", probability: 0.001 }
          ]
        };
        
        const prizeData = defaultProbs[type] || [];
        probabilities = prizeData.map(p => ({
          id: 0,
          gameType: type,
          prize_value: p.value,
          probability: p.probability,
          createdAt: new Date(),
          updatedAt: new Date()
        }));
      }
      
      // Calculate total probability once
      const totalProbability = probabilities.reduce((sum, p) => sum + parseFloat(p.probability.toString()), 0);
      
      // DEBUG: Log total probability and multiplier info
      console.log(`BATCH TEST DEBUG - Type: ${type}, Multiplier: ${multiplier}x, Total Probability: ${totalProbability}%, Adjusted: ${Math.min(totalProbability * multiplier, 100)}%`);
      
      // Get prize options from probabilities
      const prizeOptions = probabilities.map(p => p.prize_value);
      
      // Run all games in batch without logging
      const results = [];
      let wonCount = 0;
      
      for (let i = 0; i < count; i++) {
        // Simple game logic (no probabilities)
        const { won, prize, cards } = generatePremioGameResultForAdmin(type, multiplier);
        
        if (won) wonCount++;
        
        results.push({
          gameId: Date.now().toString() + '-' + i,
          won,
          prize,
          cards,
          cost,
          profit: prize ? parseFloat(prize) - cost : -cost
        });
      }
      
      // DEBUG: Log win rate
      console.log(`BATCH TEST RESULTS - Total: ${count}, Won: ${wonCount}, Win Rate: ${(wonCount/count*100).toFixed(2)}%`);
      
      res.json({ results });
    } catch (error) {
      console.error("Admin batch test error:", error);
      res.status(500).json({ message: "Erro ao executar teste em lote", error: error.message });
    }
  });

  // Support agent authentication
  const authenticateSupportAgent = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: "Token não fornecido" });
    }
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { agentId: string; role: string };
      if (decoded.role !== "support-agent") {
        return res.status(403).json({ message: "Acesso negado" });
      }
      req.agentId = decoded.agentId;
      next();
    } catch (error) {
      return res.status(403).json({ message: "Token inválido" });
    }
  };

  // Get open support chats for agents
  app.get("/api/support-agent/chats", authenticateSupportAgent, async (req, res) => {
    try {
      const chats = await storage.getOpenSupportChats();
      
      // Transform chats to include user names and messages
      const chatsWithDetails = await Promise.all(
        chats.map(async (chat) => {
          const user = await storage.getUserById(chat.userId);
          const messages = await storage.getSupportChatMessages(chat.id);
          
          // Get the first user message as the subject
          const firstUserMessage = messages.find(msg => msg.senderType === 'user');
          const subject = firstUserMessage ? firstUserMessage.message : "Sem assunto";
          
          return {
            id: chat.id,
            userId: chat.userId,
            userName: user?.name || "Usuário",
            subject: subject,
            status: chat.status,
            messages: messages.map(msg => ({
              id: msg.id,
              content: msg.message,
              sender: msg.senderType,
              createdAt: msg.createdAt
            })),
            createdAt: chat.createdAt
          };
        })
      );
      
      res.json(chatsWithDetails);
    } catch (error) {
      console.error("Get support chats error:", error);
      res.status(500).json({ message: "Erro ao buscar chamados" });
    }
  });

  // Send message as support agent
  app.post("/api/support-agent/send", authenticateSupportAgent, async (req, res) => {
    try {
      const { chatId, content } = req.body;
      
      if (!content) {
        return res.status(400).json({ message: "Mensagem é obrigatória" });
      }
      
      // Using a fixed admin user ID (1) for support agents
      const message = await storage.createSupportMessage({
        chatId,
        senderId: 1, // Fixed admin user ID
        senderType: "admin",
        message: content
      });
      
      res.json({ success: true, message });
    } catch (error) {
      console.error("Send support message error:", error);
      res.status(500).json({ message: "Erro ao enviar mensagem" });
    }
  });

  // Close support chat
  app.post("/api/support-agent/close/:id", authenticateSupportAgent, async (req, res) => {
    try {
      const chatId = parseInt(req.params.id);
      
      await storage.closeSupportChat(chatId);
      
      res.json({ success: true, message: "Chamado finalizado com sucesso" });
    } catch (error) {
      console.error("Close support chat error:", error);
      res.status(500).json({ message: "Erro ao finalizar chamado" });
    }
  });

  // ===== AFFILIATE ROUTES =====
  
  // Middleware to authenticate affiliate with enhanced security
  const authenticateAffiliate = async (req: any, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Token não fornecido" });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      // Verify token type (allow old tokens without type field for backwards compatibility)
      if (decoded.type && decoded.type !== 'affiliate') {
        return res.status(401).json({ error: "Token inválido - tipo incorreto" });
      }
      
      // Verify affiliate exists and is active
      const affiliate = await storage.getAffiliateById(decoded.affiliateId);
      if (!affiliate || !affiliate.isActive) {
        return res.status(403).json({ error: "Acesso negado" });
      }
      
      req.affiliateId = decoded.affiliateId;
      req.affiliate = affiliate;
      req.affiliateData = decoded;
      next();
    } catch (error: any) {
      console.error("Token verification error:", error.message);
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: "Token expirado - faça login novamente" });
      } else if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: "Token inválido - faça login novamente" });
      }
      return res.status(401).json({ error: "Erro de autenticação - faça login novamente" });
    }
  };
  
  // Validation schemas for affiliates
  const affiliateRegisterSchema = z.object({
    name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
    email: z.string().email("Email inválido"),
    phone: z.string().min(10, "Telefone inválido"),
    password: z.string()
      .min(8, "Senha deve ter pelo menos 8 caracteres")
      .regex(/[A-Z]/, "Senha deve conter pelo menos uma letra maiúscula")
      .regex(/[a-z]/, "Senha deve conter pelo menos uma letra minúscula")
      .regex(/[0-9]/, "Senha deve conter pelo menos um número"),
    confirmPassword: z.string()
  }).refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"]
  });
  
  const affiliateLoginSchema = z.object({
    email: z.string().email("Email inválido"),
    password: z.string().min(1, "Senha obrigatória")
  });
  
  const payoutRequestSchema = z.object({
    amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Valor inválido"),
    pixKey: z.string().min(3, "Chave PIX inválida")
  });
  
  app.post("/api/affiliate/register", createAccountLimiter, async (req, res) => {
    try {
      
      const validationResult = affiliateRegisterSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: validationResult.error.errors[0].message 
        });
      }
      
      const { name, email, phone, password } = validationResult.data;
      
      // Sanitize inputs to prevent SQL injection (extra layer of protection)
      const sanitizedEmail = email.toLowerCase().trim();
      
      // Check if affiliate already exists (use generic error message)
      const existingAffiliate = await storage.getAffiliateByEmail(sanitizedEmail);
      
      if (existingAffiliate) {
        // Generic error to prevent enumeration
        return res.status(400).json({ error: "Dados já cadastrados no sistema" });
      }
      
      // Hash password with stronger salt rounds
      const hashedPassword = await bcrypt.hash(password, 12);
      
      // Generate cryptographically secure unique code
      const randomBytes = crypto.randomBytes(4);
      const code = `AF${randomBytes.toString('hex').toUpperCase()}`;
      
      // Create affiliate with default 40% percentage commission
      const affiliate = await storage.createAffiliate({
        name: name.trim(),
        email: sanitizedEmail,
        phone: phone.trim(),
        password: hashedPassword,
        code,
        commissionRate: 40.00,  // Default 40% commission
        commissionType: 'percentage',  // Default to percentage
        currentLevelRate: '40.00',  // Current level rate
        affiliateLevel: 'bronze',  // Start at bronze level
        totalEarnings: "0.00",
        pendingEarnings: "0.00",
        isActive: true
      });
      
      // Generate JWT token for automatic login
      const token = jwt.sign(
        { affiliateId: affiliate.id, type: 'affiliate' },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
      );
      
      // Log registration (without sensitive data)
      console.log(`New affiliate registered: ID ${affiliate.id} at ${new Date().toISOString()}`);
      
      res.json({ 
        success: true, 
        token,  // Return token for automatic login
        affiliate: { ...affiliate, password: undefined } 
      });
    } catch (error) {
      console.error("Error during affiliate registration:", error);
      res.status(500).json({ error: "Erro ao cadastrar afiliado" });
    }
  });

  // Public route to get affiliate pixel ID
  app.get("/api/public/affiliate-pixel/:code", async (req, res) => {
    try {
      const { code } = req.params;
      
      if (!code) {
        return res.status(400).json({ error: "Affiliate code is required" });
      }

      // Get pixel ID for this affiliate code
      const affiliateCode = await storage.getAffiliateCodeByCode(code.toUpperCase());
      
      if (!affiliateCode) {
        return res.status(404).json({ error: "Affiliate code not found" });
      }

      // Security validation before returning pixel ID
      let safePixelId = null;
      
      if (affiliateCode.facebookPixelId) {
        const pixelId = affiliateCode.facebookPixelId;
        
        // Security: Validate pixel ID format before sending to client
        // Only return if it's a valid Facebook Pixel ID format
        if (/^\d{15,16}$/.test(pixelId)) {
          safePixelId = pixelId;
        } else {
          // Log suspicious pixel ID but don't expose to client
          console.error(`[Security] Invalid pixel ID format detected for code ${code}:`, pixelId);
        }
      }
      
      // Return validated pixel ID or null
      res.json({ 
        pixelId: safePixelId 
      });
    } catch (error) {
      console.error('Error fetching affiliate pixel:', error);
      res.status(500).json({ error: "Failed to fetch pixel ID" });
    }
  });

  // Rate limiting for login attempts
  const loginAttempts = new Map<string, { count: number, firstAttempt: number }>();
  
  app.post("/api/affiliate/login", loginLimiter, async (req, res) => {
    try {
      // Security: Rate limiting for brute force protection
      const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
      const emailForRateLimit = req.body.email?.toLowerCase();
      const rateLimitKey = `${clientIp}-${emailForRateLimit}`;
      
      const now = Date.now();
      const attemptData = loginAttempts.get(rateLimitKey);
      
      if (attemptData) {
        const timeSinceFirst = now - attemptData.firstAttempt;
        const timeWindow = 15 * 60 * 1000; // 15 minutes
        
        if (timeSinceFirst < timeWindow) {
          if (attemptData.count >= 5) {
            return res.status(429).json({ 
              error: "Muitas tentativas de login. Tente novamente em 15 minutos." 
            });
          }
          attemptData.count++;
        } else {
          // Reset after time window
          loginAttempts.set(rateLimitKey, { count: 1, firstAttempt: now });
        }
      } else {
        loginAttempts.set(rateLimitKey, { count: 1, firstAttempt: now });
      }
      
      console.log("Affiliate login attempt received:", { email: req.body.email });
      
      const validationResult = affiliateLoginSchema.safeParse(req.body);
      if (!validationResult.success) {
        console.log("Validation failed:", validationResult.error.errors[0].message);
        return res.status(400).json({ 
          error: validationResult.error.errors[0].message 
        });
      }
      
      const { email, password } = validationResult.data;
      
      const affiliate = await storage.getAffiliateByEmail(email);
      console.log("Affiliate found:", affiliate ? { id: affiliate.id, email: affiliate.email, isActive: affiliate.isActive } : "NOT FOUND");
      
      // Check both email and password to prevent information leakage
      const validPassword = affiliate ? await bcrypt.compare(password, affiliate.password) : false;
      console.log("Password validation result:", validPassword);
      
      if (!affiliate || !validPassword) {
        // Always return the same error to prevent user enumeration
        return res.status(401).json({ error: "Email ou senha incorretos" });
      }
      
      // Check if affiliate is active
      if (!affiliate.isActive) {
        return res.status(403).json({ error: "Conta desativada. Entre em contato com o suporte." });
      }
      
      // Generate token with shorter expiration (24 hours instead of 7 days)
      const token = jwt.sign(
        { 
          affiliateId: affiliate.id, 
          type: 'affiliate',
          iat: Math.floor(Date.now() / 1000)
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      // Store token in session
      req.session.affiliateToken = token;
      req.session.affiliateId = affiliate.id;
      
      // Log successful login (without sensitive data)
      console.log(`Affiliate login successful: ID ${affiliate.id} at ${new Date().toISOString()}`);
      
      res.json({ 
        success: true,
        token,
        affiliate: { ...affiliate, password: undefined }
      });
    } catch (error) {
      console.error("Error during affiliate login:", error);
      res.status(500).json({ error: "Erro ao fazer login" });
    }
  });

  app.get("/api/affiliate/check", async (req, res) => {
    try {
      // Check session first
      if (req.session && req.session.affiliateToken) {
        const token = req.session.affiliateToken;
        
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          
          // Verify token type
          if (decoded.type !== 'affiliate') {
            delete req.session.affiliateToken;
            delete req.session.affiliateId;
            return res.json({ authenticated: false });
          }
          
          const affiliate = await storage.getAffiliateById(decoded.affiliateId);
          if (affiliate && affiliate.isActive) {
            return res.json({ 
              authenticated: true,
              affiliate: { ...affiliate, password: undefined }
            });
          }
        } catch (jwtError) {
          // Token expired or invalid
          delete req.session.affiliateToken;
          delete req.session.affiliateId;
        }
      }
      
      // Check header token
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          
          if (decoded.type === 'affiliate') {
            const affiliate = await storage.getAffiliateById(decoded.affiliateId);
            if (affiliate && affiliate.isActive) {
              return res.json({ 
                authenticated: true,
                affiliate: { ...affiliate, password: undefined }
              });
            }
          }
        } catch (jwtError) {
          // Token invalid - don't expose error details
        }
      }
      
      res.json({ authenticated: false });
    } catch (error) {
      console.error("Error checking affiliate session:", error);
      res.status(500).json({ error: "Erro ao verificar sessão" });
    }
  });

  app.post("/api/affiliate/logout", async (req, res) => {
    try {
      // Clear session data
      if (req.session) {
        delete req.session.affiliateToken;
        delete req.session.affiliateId;
        
        // Destroy session completely
        req.session.destroy((err: any) => {
          if (err) {
            console.error("Error destroying session:", err);
          }
        });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error logging out affiliate:", error);
      res.status(500).json({ error: "Erro ao fazer logout" });
    }
  });
  
  // ===== AFFILIATE CODES MANAGEMENT =====
  
  // Get all codes for an affiliate
  app.get("/api/affiliate/codes", authenticateAffiliate, async (req: any, res) => {
    try {
      const affiliateId = req.affiliateId;
      
      // Always get real codes from database
      const codes = await storage.getAffiliateCodes(affiliateId);
      
      // For each code, get deposit details from affiliate_conversions
      const codesWithDepositDetails = await Promise.all(codes.map(async (code) => {
        // Get users who registered with THIS SPECIFIC CODE
        const users = await storage.getUsersByReferralCode(code.code);
        
        // Get conversions from affiliate_conversions table for all users
        let totalCompleted = 0;
        let totalPending = 0;
        let totalCancelled = 0;
        let countCompleted = 0;
        let countPending = 0;
        let countCancelled = 0;
        let completedCommission = 0;
        let pendingCommission = 0;
        let cancelledCommission = 0;
        
        for (const user of users) {
          // Get conversions for this user from affiliate_conversions
          const conversions = await db
            .select()
            .from(affiliateConversions)
            .where(
              and(
                eq(affiliateConversions.affiliateId, affiliateId),
                eq(affiliateConversions.userId, user.id)
              )
            );
          
          conversions.forEach((conv: any) => {
            const depositAmount = parseFloat(conv.conversionValue || '0');
            const commission = parseFloat(conv.commission || '0');
            
            if (conv.status === 'completed') {
              totalCompleted += depositAmount;
              countCompleted++;
              completedCommission += commission;
            } else if (conv.status === 'pending') {
              totalPending += depositAmount;
              countPending++;
              pendingCommission += commission;
            } else if (conv.status === 'cancelled') {
              totalCancelled += depositAmount;
              countCancelled++;
              cancelledCommission += commission;
            }
          });
        }
        
        return {
          ...code,
          completedDeposits: totalCompleted,
          pendingDeposits: totalPending,
          cancelledDeposits: totalCancelled,
          completedCount: countCompleted,
          pendingCount: countPending,
          cancelledCount: countCancelled,
          completedCommission, // Commission for completed deposits
          pendingCommission,   // Commission for pending deposits
          cancelledCommission, // Commission for cancelled deposits
          totalCommission: completedCommission + pendingCommission + cancelledCommission // Total commission
        };
      }));
      
      res.json(codesWithDepositDetails);
    } catch (error) {
      console.error("Error getting affiliate codes:", error);
      res.status(500).json({ error: "Erro ao buscar códigos" });
    }
  });
  
  // Create a new code
  app.post("/api/affiliate/codes", authenticateAffiliate, async (req: any, res) => {
    try {
      const affiliateId = req.affiliateId;
      const { code, name } = req.body;
      
      if (!code) {
        return res.status(400).json({ error: "Código é obrigatório" });
      }
      
      // Validate code format (alphanumeric, 3-20 chars)
      if (!/^[A-Z0-9]{3,20}$/i.test(code)) {
        return res.status(400).json({ error: "Código deve conter apenas letras e números (3-20 caracteres)" });
      }
      
      // Block codes starting with RAS (reserved for direct client referrals)
      const upperCode = code.toUpperCase();
      console.log(`Checking code: "${upperCode}", starts with RAS? ${upperCode.startsWith('RAS')}`);
      if (upperCode.startsWith('RAS')) {
        console.log('Code blocked - starts with RAS');
        return res.status(400).json({ error: "Códigos iniciados com 'RAS' são reservados para o sistema" });
      }
      
      // Block codes starting with AFF (reserved for clients)
      console.log(`Checking code: "${upperCode}", starts with AFF? ${upperCode.startsWith('AFF')}`);
      if (upperCode.startsWith('AFF')) {
        console.log('Code blocked - starts with AFF');
        return res.status(400).json({ error: "Códigos iniciados com 'AFF' são exclusivos para clientes!" });
      }
      
      // Check if code already exists
      const existingCode = await storage.getAffiliateCodeByCode(upperCode);
      if (existingCode) {
        return res.status(400).json({ error: "Este código já está em uso" });
      }
      
      // Create the code
      const newCode = await storage.createAffiliateCode({
        affiliateId,
        code: code.toUpperCase(),
        name: name || null,
        totalClicks: 0,
        totalRegistrations: 0,
        totalDeposits: 0,
        isActive: true
      });
      
      console.log(`Created new code for affiliate ${affiliateId}:`, { id: newCode.id, code: newCode.code, name: newCode.name });
      
      res.json({ success: true, code: newCode });
    } catch (error) {
      console.error("Error creating affiliate code:", error);
      res.status(500).json({ error: "Erro ao criar código" });
    }
  });
  
  // Get affiliate network (users registered through affiliate codes AND partner codes)
  app.get("/api/affiliate/network", authenticateAffiliate, async (req: any, res) => {
    try {
      const affiliateId = req.affiliateId;
      
      // Get all codes for this affiliate
      const affiliateCodes = await storage.getAffiliateCodes(affiliateId);
      const codesList = affiliateCodes.map(c => c.code);
      
      // Get all partners for this affiliate and their codes
      const affiliatePartners = await db.select()
        .from(partners)
        .where(eq(partners.affiliateId, affiliateId));
      
      const partnerCodes = affiliatePartners.map(p => p.code).filter(code => code);
      // Skip partner codes table lookup as it doesn't exist
      // Partners use their main code directly
      
      // Get users who registered using affiliate codes
      const registrationsFromAffiliate = codesList.length > 0 
        ? await storage.getUsersByAffiliateCodes(codesList)
        : [];
      
      // Get users who registered through partners (using partnerId field)
      const partnerIds = affiliatePartners.map(p => p.id);
      let registrationsFromPartners = [];
      
      if (partnerIds.length > 0) {
        registrationsFromPartners = await db.select()
          .from(users)
          .where(inArray(users.partnerId, partnerIds))
          .orderBy(desc(users.createdAt));
      }
      
      console.log('Partner IDs:', partnerIds);
      console.log('Users from partners found:', registrationsFromPartners.length);
      
      // Mark which users came from partners
      const markedRegistrationsFromAffiliate = registrationsFromAffiliate.map((user: any) => ({
        ...user,
        isFromPartner: false
      }));
      
      const markedRegistrationsFromPartners = registrationsFromPartners.map((user: any) => ({
        ...user,
        isFromPartner: true
      }));
      
      // Combine all registrations and sort by date (most recent first)
      const registrations = [...markedRegistrationsFromAffiliate, ...markedRegistrationsFromPartners]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      console.log('Total registrations:', registrations.length);
      console.log('From affiliate:', markedRegistrationsFromAffiliate.length);
      console.log('From partners:', markedRegistrationsFromPartners.length);
      
      // Calculate statistics
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const monthlyNew = registrations.filter((reg: any) => 
        new Date(reg.createdAt) >= startOfMonth
      ).length;
      
      // Calculate today's new registrations
      const todayNew = registrations.filter((reg: any) => 
        new Date(reg.createdAt) >= startOfToday
      ).length;
      
      // Get commission data for each registration from affiliate_conversions
      // Remove slice limit to show all registrations including partners
      const recentReferrals = await Promise.all(
        registrations.map(async (user: any) => {
          // Get conversions for this user from affiliate_conversions table
          const conversions = await db
            .select()
            .from(affiliateConversions)
            .where(
              and(
                eq(affiliateConversions.affiliateId, affiliateId),
                eq(affiliateConversions.userId, user.id)
              )
            );
          
          // Calculate totals from affiliate_conversions
          let totalCompleted = 0;
          let totalPending = 0;
          let totalCancelled = 0;
          let completedCount = 0;
          let pendingCount = 0;
          let cancelledCount = 0;
          let completedCommission = 0;
          let pendingCommission = 0;
          let cancelledCommission = 0;
          
          conversions.forEach((conv: any) => {
            const depositAmount = parseFloat(conv.conversionValue || '0');
            const commission = parseFloat(conv.commission || '0');
            
            if (conv.status === 'completed') {
              totalCompleted += depositAmount;
              completedCount++;
              completedCommission += commission;
            } else if (conv.status === 'pending') {
              totalPending += depositAmount;
              pendingCount++;
              pendingCommission += commission;
            } else if (conv.status === 'cancelled') {
              totalCancelled += depositAmount;
              cancelledCount++;
              cancelledCommission += commission;
            }
          });
          
          return {
            id: user.id,
            name: user.name,
            email: user.email || '',
            phone: user.phone || '',
            cpf: user.cpf || '',
            date: user.createdAt,
            totalDeposits: totalCompleted,  // Only completed deposits
            pendingDeposits: totalPending,  // Pending deposits
            cancelledDeposits: totalCancelled,  // Cancelled deposits
            completedCount,  // Count of completed conversions
            pendingCount,  // Count of pending conversions
            cancelledCount,  // Count of cancelled conversions
            completedCommission,  // Commission for completed deposits
            pendingCommission,    // Commission for pending deposits  
            cancelledCommission,  // Commission for cancelled deposits
            commission: completedCommission + pendingCommission + cancelledCommission,  // Total commission
            code: user.affiliateCode || user.referredBy || 'N/A',
            isFromPartner: user.isFromPartner || false,  // Flag to identify partner registrations
            partnerId: user.partnerId || null  // Include the partner ID when user came from partner
          };
        })
      );
      
      res.json({
        directReferrals: registrations.length,
        monthlyNew,
        todayNew, // New field for today's registrations
        totalNetwork: registrations.length, // Can be expanded for multi-level
        activeLevels: 1, // Currently only direct level
        recentReferrals
      });
      
    } catch (error) {
      console.error("Error getting affiliate network:", error);
      res.status(500).json({ error: "Erro ao buscar rede de afiliados" });
    }
  });
  
  // Delete a code (only if no registrations)
  app.delete("/api/affiliate/codes/:id", authenticateAffiliate, async (req: any, res) => {
    try {
      const affiliateId = req.affiliateId;
      const codeId = parseInt(req.params.id);
      
      // Get the code to check ownership and registrations
      const code = await storage.getAffiliateCodeById(codeId);
      
      if (!code) {
        return res.status(404).json({ error: "Código não encontrado" });
      }
      
      if (code.affiliateId !== affiliateId) {
        return res.status(403).json({ error: "Você não tem permissão para deletar este código" });
      }
      
      if (code.totalRegistrations > 0) {
        return res.status(400).json({ error: "Não é possível deletar um código que já tem cadastros" });
      }
      
      await storage.deleteAffiliateCode(codeId);
      
      res.json({ success: true, message: "Código deletado com sucesso" });
    } catch (error) {
      console.error("Error deleting affiliate code:", error);
      res.status(500).json({ error: "Erro ao deletar código" });
    }
  });

  // Update Facebook Pixel ID for a code
  app.put("/api/affiliate/codes/:id/pixel", authenticateAffiliate, async (req: any, res) => {
    try {
      const affiliateId = req.affiliateId;
      const codeId = parseInt(req.params.id);
      const { pixelId } = req.body;
      
      // Get the code to check ownership
      const code = await storage.getAffiliateCodeById(codeId);
      
      if (!code) {
        return res.status(404).json({ error: "Código não encontrado" });
      }
      
      if (code.affiliateId !== affiliateId) {
        return res.status(403).json({ error: "Você não tem permissão para editar este código" });
      }
      
      // Validate Facebook Pixel ID if provided
      if (pixelId && pixelId.trim() !== "") {
        // Security validation for Facebook Pixel ID
        const cleanPixelId = pixelId.trim();
        
        // 1. Remove any non-numeric characters for safety
        const sanitizedPixelId = cleanPixelId.replace(/[^0-9]/g, '');
        
        // 2. Check if the original had any non-numeric characters (potential attack)
        if (sanitizedPixelId !== cleanPixelId) {
          return res.status(400).json({ 
            error: "ID do Pixel inválido. Apenas números são permitidos por segurança" 
          });
        }
        
        // 3. Validate length - Facebook Pixel IDs are strictly 15-16 digits
        if (!/^\d{15,16}$/.test(sanitizedPixelId)) {
          return res.status(400).json({ 
            error: "ID do Pixel do Facebook inválido. Deve conter exatamente 15 ou 16 dígitos" 
          });
        }
        
        // 4. Additional security: Check for suspicious patterns
        // Reject IDs that are all zeros, all same digit, or sequential
        if (/^0+$/.test(sanitizedPixelId) || 
            /^(\d)\1+$/.test(sanitizedPixelId) || 
            sanitizedPixelId === '123456789012345' ||
            sanitizedPixelId === '1234567890123456') {
          return res.status(400).json({ 
            error: "ID do Pixel inválido. Use um ID real do Facebook Business Manager" 
          });
        }
      }
      
      // Update the pixel ID
      await storage.updateAffiliateCodePixel(codeId, pixelId ? pixelId.trim() : null);
      
      res.json({ 
        success: true, 
        message: pixelId ? "Pixel ID configurado com sucesso" : "Pixel ID removido com sucesso" 
      });
    } catch (error) {
      console.error("Error updating pixel ID:", error);
      res.status(500).json({ error: "Erro ao atualizar Pixel ID" });
    }
  });
  
  // Dashboard statistics endpoint
  app.get("/api/affiliate/dashboard/stats", authenticateAffiliate, async (req: any, res) => {
    try {
      const affiliateId = req.affiliateId;
      
      // Get recent clicks - simplified query without join
      const clicksResult = await db
        .select({
          id: affiliateClicks.id,
          affiliateId: affiliateClicks.affiliateId,
          clickedAt: affiliateClicks.clickedAt,
          ipAddress: affiliateClicks.ipAddress,
          userAgent: affiliateClicks.userAgent,
          referrerUrl: affiliateClicks.referrerUrl
        })
        .from(affiliateClicks)
        .where(eq(affiliateClicks.affiliateId, affiliateId))
        .orderBy(desc(affiliateClicks.clickedAt))
        .limit(10);
      
      // Get code names for clicks
      const recentClicks = clicksResult.map((click) => ({
        linkName: 'Link Direto',
        clickedAt: click.clickedAt,
        source: click.referrerUrl || 'Direto'
      }));
      
      // Get recent conversions
      const recentConversions = await db
        .select({
          amount: affiliateConversions.conversionValue,
          commissionAmount: affiliateConversions.commission,
          status: affiliateConversions.status,
          createdAt: affiliateConversions.createdAt
        })
        .from(affiliateConversions)
        .where(eq(affiliateConversions.affiliateId, affiliateId))
        .orderBy(desc(affiliateConversions.createdAt))
        .limit(10);
      
      res.json({
        recentClicks: recentClicks || [],
        recentConversions: recentConversions || []
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Erro ao buscar estatísticas" });
    }
  });
  
  // Performance data endpoint
  app.get("/api/affiliate/dashboard/performance", authenticateAffiliate, async (req: any, res) => {
    try {
      const affiliateId = req.affiliateId;
      
      // Get weekly performance data for last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      // Get clicks grouped by day
      const dailyClicks = await db
        .select({
          date: sql<string>`DATE(${affiliateClicks.clickedAt})`,
          clicks: sql<number>`count(*)`
        })
        .from(affiliateClicks)
        .where(and(
          eq(affiliateClicks.affiliateId, affiliateId),
          gte(affiliateClicks.clickedAt, sevenDaysAgo)
        ))
        .groupBy(sql`DATE(${affiliateClicks.clickedAt})`)
        .orderBy(sql`DATE(${affiliateClicks.clickedAt})`);
      
      // Get conversions grouped by day
      const dailyConversions = await db
        .select({
          date: sql<string>`DATE(${affiliateConversions.createdAt})`,
          conversions: sql<number>`count(*)`
        })
        .from(affiliateConversions)
        .where(and(
          eq(affiliateConversions.affiliateId, affiliateId),
          gte(affiliateConversions.createdAt, sevenDaysAgo)
        ))
        .groupBy(sql`DATE(${affiliateConversions.createdAt})`)
        .orderBy(sql`DATE(${affiliateConversions.createdAt})`);
      
      // Get commissions grouped by day
      const dailyCommissions = await db
        .select({
          date: sql<string>`DATE(${affiliateConversions.createdAt})`,
          commission: sql<number>`SUM(CAST(${affiliateConversions.commission} AS DECIMAL))`
        })
        .from(affiliateConversions)
        .where(and(
          eq(affiliateConversions.affiliateId, affiliateId),
          gte(affiliateConversions.createdAt, sevenDaysAgo)
        ))
        .groupBy(sql`DATE(${affiliateConversions.createdAt})`)
        .orderBy(sql`DATE(${affiliateConversions.createdAt})`);
      
      // Get approved deposits grouped by day
      const dailyApproved = await db
        .select({
          date: sql<string>`DATE(${affiliateConversions.createdAt})`,
          count: sql<number>`count(*)`,
          total: sql<number>`SUM(CAST(${affiliateConversions.commission} AS DECIMAL))`
        })
        .from(affiliateConversions)
        .where(and(
          eq(affiliateConversions.affiliateId, affiliateId),
          or(eq(affiliateConversions.status, 'completed'), eq(affiliateConversions.status, 'paid')),
          gte(affiliateConversions.createdAt, sevenDaysAgo)
        ))
        .groupBy(sql`DATE(${affiliateConversions.createdAt})`)
        .orderBy(sql`DATE(${affiliateConversions.createdAt})`);
      
      // Get pending deposits grouped by day
      const dailyPending = await db
        .select({
          date: sql<string>`DATE(${affiliateConversions.createdAt})`,
          count: sql<number>`count(*)`,
          total: sql<number>`SUM(CAST(${affiliateConversions.commission} AS DECIMAL))`
        })
        .from(affiliateConversions)
        .where(and(
          eq(affiliateConversions.affiliateId, affiliateId),
          eq(affiliateConversions.status, 'pending'),
          gte(affiliateConversions.createdAt, sevenDaysAgo)
        ))
        .groupBy(sql`DATE(${affiliateConversions.createdAt})`)
        .orderBy(sql`DATE(${affiliateConversions.createdAt})`);
      
      // Get cancelled deposits grouped by day
      const dailyCancelled = await db
        .select({
          date: sql<string>`DATE(${affiliateConversions.createdAt})`,
          count: sql<number>`count(*)`,
          total: sql<number>`SUM(CAST(${affiliateConversions.commission} AS DECIMAL))`
        })
        .from(affiliateConversions)
        .where(and(
          eq(affiliateConversions.affiliateId, affiliateId),
          eq(affiliateConversions.status, 'cancelled'),
          gte(affiliateConversions.createdAt, sevenDaysAgo)
        ))
        .groupBy(sql`DATE(${affiliateConversions.createdAt})`)
        .orderBy(sql`DATE(${affiliateConversions.createdAt})`);
      
      // Create last 7 days array
      const weekDays = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayName = date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
        const dayCapitalized = dayName.charAt(0).toUpperCase() + dayName.slice(1);
        
        const clickData = dailyClicks.find(c => c.date === dateStr) || { clicks: 0 };
        const conversionData = dailyConversions.find(c => c.date === dateStr) || { conversions: 0 };
        const commissionData = dailyCommissions.find(c => c.date === dateStr) || { commission: 0 };
        const approvedData = dailyApproved.find(c => c.date === dateStr) || { count: 0, total: 0 };
        const pendingData = dailyPending.find(c => c.date === dateStr) || { count: 0, total: 0 };
        const cancelledData = dailyCancelled.find(c => c.date === dateStr) || { count: 0, total: 0 };
        
        weekDays.push({
          name: dayCapitalized,
          clicks: Number(clickData.clicks),
          conversions: Number(conversionData.conversions),
          commission: Number(commissionData.commission || 0),
          approved: Number(approvedData.count),
          pending: Number(pendingData.count),
          cancelled: Number(cancelledData.count),
          approvedAmount: Number(approvedData.total || 0),
          pendingAmount: Number(pendingData.total || 0),
          cancelledAmount: Number(cancelledData.total || 0)
        });
      }
      
      res.json({
        monthly: weekDays  // Keep the same key for frontend compatibility
      });
    } catch (error) {
      console.error("Error fetching performance data:", error);
      res.status(500).json({ error: "Erro ao buscar dados de performance" });
    }
  });
  
  // Get affiliate info with level data
  // Update affiliate avatar
  app.post("/api/affiliate/update-avatar", authenticateAffiliate, async (req: any, res) => {
    try {
      const affiliateId = req.affiliateId;
      const { avatar } = req.body;
      
      if (!avatar || !avatar.match(/^avatar([1-9]|10)$/)) {
        return res.status(400).json({ error: "Avatar inválido" });
      }
      
      await db
        .update(affiliates)
        .set({ avatar })
        .where(eq(affiliates.id, affiliateId));
      
      res.json({ success: true, avatar });
    } catch (error) {
      console.error('Error updating avatar:', error);
      res.status(500).json({ error: 'Erro ao atualizar avatar' });
    }
  });
  
  app.get("/api/affiliate/info", authenticateAffiliate, async (req: any, res) => {
    try {
      const affiliateId = req.affiliateId;
      
      // Get affiliate data directly from database to ensure fresh data
      const [affiliate] = await db.select().from(affiliates).where(eq(affiliates.id, affiliateId));
      if (!affiliate) {
        return res.status(404).json({ error: "Afiliado não encontrado" });
      }

      // Simply use the data from database - it's already correct
      const approvedEarnings = parseFloat(affiliate.approvedEarnings || '0');

      // Get unique users who made deposits (not total deposit count)
      const uniqueDepositors = await db
        .selectDistinct({ userId: users.id })
        .from(users)
        .innerJoin(deposits, eq(users.id, deposits.userId))
        .where(
          and(
            eq(users.affiliateId, affiliateId),
            eq(deposits.status, 'completed')
          )
        );

      const uniqueDepositorsCount = uniqueDepositors.length;

      // Get tier configuration to determine commission type and value
      const tierConfig = await db
        .select()
        .from(affiliateTierConfig)
        .where(eq(affiliateTierConfig.tier, affiliate.affiliateLevel || 'bronze'))
        .limit(1);
      
      const currentTier = tierConfig[0];
      
      // Determine commission type and value - PRIORITY: Custom > Tier > Default
      let commissionType = 'fixed'; // Default type
      let commissionValue = 7; // Default value
      
      // FIRST PRIORITY: Check for custom commission settings
      if (affiliate.customFixedAmount && parseFloat(affiliate.customFixedAmount) > 0) {
        // Custom fixed commission takes priority
        commissionType = 'fixed';
        commissionValue = parseFloat(affiliate.customFixedAmount);
        console.log('Using CUSTOM fixed commission:', commissionValue);
      } else if (affiliate.customCommissionRate && parseFloat(affiliate.customCommissionRate) > 0) {
        // Custom percentage commission takes priority
        commissionType = 'percentage';
        commissionValue = parseFloat(affiliate.customCommissionRate);
        console.log('Using CUSTOM percentage commission:', commissionValue);
      } 
      // SECOND PRIORITY: Use tier configuration if no custom settings
      else if (currentTier) {
        // Check affiliate's commission type setting
        if (affiliate.commissionType === 'percentage') {
          commissionType = 'percentage';
          commissionValue = parseFloat(currentTier.percentageRate || '40');
          console.log('Using TIER percentage commission:', commissionValue);
        } else {
          // Use fixed commission
          commissionType = 'fixed';
          commissionValue = parseFloat(currentTier.fixedAmount || '6');
          console.log('Using TIER fixed commission:', commissionValue);
        }
      }
      // THIRD PRIORITY: Fallback options
      else if (affiliate.affiliateLevel === 'silver') {
        // Default silver tier commission when no config found
        if (affiliate.commissionType === 'percentage') {
          commissionType = 'percentage';
          commissionValue = 45; // 45% default for silver
          console.log('Using DEFAULT silver percentage commission:', commissionValue);
        } else {
          commissionType = 'fixed';
          commissionValue = 7; // R$ 7.00 default for silver
          console.log('Using DEFAULT silver fixed commission:', commissionValue);
        }
      } else if (affiliate.commissionType === 'fixed' && affiliate.currentLevelRate) {
        // Fallback to current level rate if stored as fixed
        commissionType = 'fixed';
        commissionValue = parseFloat(affiliate.currentLevelRate);
        console.log('Using FALLBACK current level rate:', commissionValue);
      }
      
      // Return actual data from database with proper commission info
      res.json({
        name: affiliate.name,
        email: affiliate.email,
        code: affiliate.code,
        avatar: affiliate.avatar || 'avatar1',
        affiliateLevel: affiliate.affiliateLevel || 'bronze', // Direct from DB
        currentLevelRate: parseFloat(affiliate.currentLevelRate || '40'), // Direct from DB
        customCommissionRate: affiliate.customCommissionRate, // Add custom rate to response
        customFixedAmount: affiliate.customFixedAmount, // Add custom fixed amount
        commission_type: commissionType, // Actual commission type (fixed for tier system)
        commission_rate: commissionType === 'percentage' ? commissionValue.toString() : null, // Commission rate for percentage
        fixed_commission_amount: commissionType === 'fixed' ? commissionValue.toString() : null, // Fixed amount for fixed commission
        commissionType: commissionType, // Keep for backward compatibility
        approvedEarnings: approvedEarnings, // Direct from DB
        totalEarnings: parseFloat(affiliate.totalEarnings || '0'),
        pendingEarnings: parseFloat(affiliate.pendingEarnings || '0'),
        totalClicks: affiliate.totalClicks || 0,
        totalRegistrations: affiliate.totalRegistrations || 0,
        totalDeposits: uniqueDepositorsCount, // Now returns unique users who deposited
        totalDepositsCount: affiliate.totalDeposits || 0 // Keep original count for reference
      });
    } catch (error) {
      console.error('Error fetching affiliate info:', error);
      res.status(500).json({ error: 'Failed to fetch affiliate info' });
    }
  });
  
  // Get detailed deposit statistics for affiliate
  app.get("/api/affiliate/deposits-stats", authenticateAffiliate, async (req: any, res) => {
    try {
      const affiliateId = req.affiliateId;
      
      // Get affiliate's commission rate
      const affiliate = await storage.getAffiliateById(affiliateId);
      if (!affiliate) {
        return res.status(404).json({ error: "Afiliado não encontrado" });
      }
      
      // Get current commission rate
      const commissionRate = parseFloat(affiliate.currentLevelRate || '40') / 100;
      
      // Get all conversions for this affiliate
      const conversions = await db
        .select()
        .from(affiliateConversions)
        .where(eq(affiliateConversions.affiliateId, affiliateId));
      
      // Calculate statistics based on conversions
      let completedCount = 0;
      let pendingCount = 0;
      let cancelledCount = 0;
      let completedCommission = 0;
      let pendingCommission = 0;
      let cancelledCommission = 0;
      
      conversions.forEach(conversion => {
        const commission = parseFloat(conversion.commission || '0');
        
        if (conversion.status === 'completed' || conversion.status === 'paid') {
          completedCount++;
          completedCommission += commission;
        } else if (conversion.status === 'pending') {
          pendingCount++;
          pendingCommission += commission;
        } else if (conversion.status === 'cancelled') {
          cancelledCount++;
          cancelledCommission += commission;
        }
      });
      
      const totalConversions = conversions.length;
      
      // Calculate rates
      const completedRate = totalConversions > 0 ? ((completedCount / totalConversions) * 100).toFixed(1) : '0.0';
      const pendingRate = totalConversions > 0 ? ((pendingCount / totalConversions) * 100).toFixed(1) : '0.0';
      const cancelledRate = totalConversions > 0 ? ((cancelledCount / totalConversions) * 100).toFixed(1) : '0.0';
      
      res.json({
        totalDeposits: totalConversions,
        completedDeposits: completedCount,
        pendingDeposits: pendingCount,
        cancelledDeposits: cancelledCount,
        completedRate,
        pendingRate,
        cancelledRate,
        completedAmount: completedCommission.toFixed(2),
        pendingAmount: pendingCommission.toFixed(2),
        cancelledAmount: cancelledCommission.toFixed(2),
        commissionRate: (commissionRate * 100).toFixed(0)
      });
      
    } catch (error) {
      console.error('Error fetching deposit stats:', error);
      res.status(500).json({ error: 'Failed to fetch deposit statistics' });
    }
  });
  
  // Get affiliate earnings
  app.get("/api/affiliate/earnings", authenticateAffiliate, async (req: any, res) => {
    try {
      const affiliateId = req.affiliateId;
      
      // Get affiliate details for commission rate
      const affiliate = await storage.getAffiliateById(affiliateId);
      if (!affiliate) {
        return res.status(404).json({ error: "Afiliado não encontrado" });
      }
      
      // Get wallet information
      let wallet = await db
        .select()
        .from(affiliatesWallet)
        .where(eq(affiliatesWallet.affiliateId, affiliateId))
        .limit(1);
      
      // Create wallet if doesn't exist
      if (wallet.length === 0) {
        const [newWallet] = await db
          .insert(affiliatesWallet)
          .values({
            affiliateId,
            balance: '0.00',
            totalEarned: '0.00',
            totalWithdrawn: '0.00'
          })
          .returning();
        wallet = [newWallet];
      }
      
      const walletData = wallet[0];
      
      // Get all conversions for this affiliate
      const conversions = await storage.getAffiliateConversions(affiliateId);
      
      // Get partner conversions for this affiliate
      const partnerConversionsRaw = await db
        .select({
          id: partnerConversions.id,
          partnerId: partnerConversions.partnerId,
          userId: partnerConversions.userId,
          conversionType: partnerConversions.conversionType,
          conversionValue: partnerConversions.conversionValue,
          affiliateCommission: partnerConversions.affiliateCommission,
          partnerCommission: partnerConversions.partnerCommission,
          status: partnerConversions.status,
          createdAt: partnerConversions.createdAt,
          partnerName: partners.name,
          partnerCode: partners.code
        })
        .from(partnerConversions)
        .leftJoin(partners, eq(partnerConversions.partnerId, partners.id))
        .where(eq(partnerConversions.affiliateId, affiliateId))
        .orderBy(desc(partnerConversions.createdAt));
      
      // Calculate totals
      let totalEarnings = 0;
      let pendingEarnings = 0;
      let completedEarnings = 0;
      let cancelledEarnings = 0;
      
      // Process each conversion with user data lookup (with timeout protection)
      // Filter out conversions that have partner_id to avoid duplicates
      const affiliateOnlyConversions = conversions.filter((conv: any) => !conv.partnerId);
      
      const transactions = await Promise.all(
        affiliateOnlyConversions.map(async (conversion: any) => {
          // Get actual user data with timeout protection
          let userName = 'Usuário';
          let userEmail = '';
          
          try {
            // Skip invalid user IDs that are causing timeouts
            if (conversion.userId === 122 || conversion.userId === 128 || conversion.userId > 200) {
              userName = `Usuário Removido #${conversion.userId}`;
              userEmail = 'removido@sistema.com';
            } else {
              // Create a timeout promise
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), 1000)
              );
              
              // Race between the actual query and timeout
              const user = await Promise.race([
                storage.getUser(conversion.userId),
                timeoutPromise
              ]).catch(() => null);
              
              if (user) {
                userName = user.name || user.email || `Usuário #${conversion.userId}`;
                userEmail = user.email || '';
              } else {
                userName = `Usuário #${conversion.userId}`;
              }
            }
          } catch (error) {
            // Silently handle errors to avoid spamming logs
            userName = `Usuário #${conversion.userId}`;
          }
          
          // Calculate commission based on status
          const commissionAmount = parseFloat(conversion.commission || '0');
          
          if (conversion.status === 'completed' || conversion.status === 'paid') {
            completedEarnings += commissionAmount;
          } else if (conversion.status === 'pending') {
            pendingEarnings += commissionAmount;
          } else if (conversion.status === 'cancelled') {
            cancelledEarnings += commissionAmount;
          }
          
          totalEarnings += commissionAmount;
          
          // Determine commission type based on current affiliate configuration
          // For now, use the affiliate's current settings (will be historical when DB is updated)
          const commissionType = affiliate.commissionType || 'percentage';
          const commissionValue = commissionType === 'fixed' 
            ? (affiliate.customFixedAmount || affiliate.fixedCommissionAmount || '10')
            : (conversion.commissionRate || affiliate.customCommissionRate || affiliate.currentLevelRate || '40');
          
          return {
            id: conversion.id,
            userId: conversion.userId,
            userName,
            userEmail,
            conversionType: conversion.conversionType,
            depositAmount: parseFloat(conversion.conversionValue || '0'),
            commission: commissionAmount,
            commissionRate: conversion.commissionRate || (affiliate.customCommissionRate || affiliate.currentLevelRate || '40'),
            commissionType: commissionType,
            commissionValue: commissionValue,
            status: conversion.status || 'pending',
            createdAt: conversion.createdAt,
            source: 'affiliate' // Mark as coming from affiliate
          };
        })
      );
      
      // Process partner conversions and add to transactions
      const partnerTransactions = await Promise.all(
        partnerConversionsRaw.map(async (pConv: any) => {
          // Get user data
          let userName = 'Usuário';
          let userEmail = '';
          
          try {
            // Skip invalid user IDs
            if (pConv.userId === 122 || pConv.userId === 128 || pConv.userId > 200) {
              userName = `Usuário Removido #${pConv.userId}`;
              userEmail = 'removido@sistema.com';
            } else {
              // Create a timeout promise
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), 1000)
              );
              
              // Race between the actual query and timeout
              const user = await Promise.race([
                storage.getUser(pConv.userId),
                timeoutPromise
              ]).catch(() => null);
              
              if (user) {
                userName = user.name || user.email || `Usuário #${pConv.userId}`;
                userEmail = user.email || '';
              } else {
                userName = `Usuário #${pConv.userId}`;
              }
            }
          } catch (error) {
            userName = `Usuário #${pConv.userId}`;
          }
          
          // Calculate affiliate's commission from this partner conversion
          const affiliateCommission = parseFloat(pConv.affiliateCommission || '0');
          
          if (pConv.status === 'completed' || pConv.status === 'approved') {
            completedEarnings += affiliateCommission;
          } else if (pConv.status === 'pending') {
            pendingEarnings += affiliateCommission;
          } else if (pConv.status === 'cancelled') {
            cancelledEarnings += affiliateCommission;
          }
          
          totalEarnings += affiliateCommission;
          
          return {
            id: `partner-${pConv.id}`,
            userId: pConv.userId,
            userName,
            userEmail,
            conversionType: pConv.conversionType,
            depositAmount: parseFloat(pConv.conversionValue || '0'),
            commission: affiliateCommission,
            commissionRate: '', // Not applicable for partner split
            commissionType: 'partner_split',
            commissionValue: '',
            status: pConv.status || 'pending',
            createdAt: pConv.createdAt,
            source: 'partner', // Mark as coming from partner
            partnerId: pConv.partnerId,
            partnerName: pConv.partnerName,
            partnerCode: pConv.partnerCode,
            partnerCommission: parseFloat(pConv.partnerCommission || '0')
          };
        })
      );
      
      // Combine all transactions
      const allTransactions = [...transactions, ...partnerTransactions];
      
      // Sort transactions by date (most recent first)
      allTransactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      res.json({
        totalEarnings: totalEarnings, // Use calculated total
        pendingEarnings: pendingEarnings, // Use calculated pending from conversions
        completedEarnings: completedEarnings, // Use calculated completed
        cancelledEarnings,
        availableBalance: parseFloat(walletData.balance || '0'), // Real wallet balance available for withdrawal
        totalWithdrawn: parseFloat(walletData.totalWithdrawn || '0'),
        commissionRate: affiliate.customCommissionRate || affiliate.currentLevelRate || '40',
        transactions: allTransactions, // Return combined transactions
        wallet: {
          balance: parseFloat(walletData.balance || '0'),
          pendingBalance: pendingEarnings, // Use calculated pending
          totalEarned: totalEarnings, // Use calculated total
          totalWithdrawn: parseFloat(walletData.totalWithdrawn || '0'),
          lastTransactionAt: walletData.lastTransactionAt
        }
      });
      
    } catch (error) {
      console.error("Error getting affiliate earnings:", error);
      res.status(500).json({ error: "Erro ao buscar ganhos" });
    }
  });
  
  // Get affiliate withdrawals - usando tabela affiliates_withdrawals
  app.get("/api/affiliate/withdrawals", authenticateAffiliate, async (req: any, res) => {
    try {
      const affiliateId = req.affiliateId;
      
      // Get withdrawals from affiliates_withdrawals table
      const withdrawals = await storage.getAffiliateWithdrawals(affiliateId);
      
      res.json(withdrawals);
    } catch (error) {
      console.error("Error getting affiliate withdrawals:", error);
      res.status(500).json({ error: "Erro ao buscar saques" });
    }
  });
  
  // Create new withdrawal request - usando tabela affiliates_withdrawals
  app.post("/api/affiliate/withdrawals", withdrawalLimiter, authenticateAffiliate, async (req: any, res) => {
    try {
      const affiliateId = req.affiliateId;
      const { amount, pixKey, pixKeyType } = req.body;
      
      // Security: Input validation
      if (!amount || !pixKey) {
        return res.status(400).json({ error: "Valor e chave PIX são obrigatórios" });
      }
      
      // Security: Sanitize inputs
      const sanitizedPixKey = String(pixKey).trim().substring(0, 100); // Limit PIX key length
      const sanitizedPixKeyType = pixKeyType ? String(pixKeyType).toLowerCase().trim() : 'cpf';
      
      const WITHDRAWAL_FEE = 3.00;
      const MIN_WITHDRAW = 20.00;
      const MAX_WITHDRAW = 1000.00;
      
      // Security: Strict amount validation
      const withdrawAmount = parseFloat(String(amount).replace(',', '.'));
      if (isNaN(withdrawAmount) || !isFinite(withdrawAmount) || withdrawAmount <= 0) {
        return res.status(400).json({ error: "Valor inválido" });
      }
      
      if (withdrawAmount < MIN_WITHDRAW) {
        return res.status(400).json({ error: `Valor mínimo para saque é R$ ${MIN_WITHDRAW.toFixed(2)}` });
      }
      
      if (withdrawAmount > MAX_WITHDRAW) {
        return res.status(400).json({ error: `Valor máximo por saque é R$ ${MAX_WITHDRAW.toFixed(2)}` });
      }
      
      // Security: Validate PIX key type
      const validTypes = ['cpf', 'cnpj'];  // Only allow CPF/CNPJ for security
      if (!validTypes.includes(sanitizedPixKeyType)) {
        return res.status(400).json({ error: "Tipo de chave PIX inválido. Use apenas CPF ou CNPJ" });
      }
      
      // Security: Validate PIX key format
      if (sanitizedPixKeyType === 'cpf') {
        // Remove non-numeric characters
        const cpfClean = sanitizedPixKey.replace(/\D/g, '');
        if (cpfClean.length !== 11) {
          return res.status(400).json({ error: "CPF deve ter 11 dígitos" });
        }
      } else if (sanitizedPixKeyType === 'cnpj') {
        // Remove non-numeric characters
        const cnpjClean = sanitizedPixKey.replace(/\D/g, '');
        if (cnpjClean.length !== 14) {
          return res.status(400).json({ error: "CNPJ deve ter 14 dígitos" });
        }
      }
      
      // Security: Check for pending withdrawals to prevent duplicate requests
      const pendingWithdrawals = await db
        .select()
        .from(affiliatesWithdrawals)
        .where(and(
          eq(affiliatesWithdrawals.affiliateId, affiliateId),
          eq(affiliatesWithdrawals.status, 'pending')
        ));
      
      if (pendingWithdrawals.length > 0) {
        return res.status(400).json({ 
          error: "Você já possui um saque pendente. Aguarde o processamento antes de solicitar outro." 
        });
      }
      
      // Security: Rate limiting - max 3 withdrawals per day
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentWithdrawals = await db
        .select()
        .from(affiliatesWithdrawals)
        .where(and(
          eq(affiliatesWithdrawals.affiliateId, affiliateId),
          gte(affiliatesWithdrawals.requestedAt, twentyFourHoursAgo)
        ));
      
      if (recentWithdrawals.length >= 3) {
        return res.status(429).json({ 
          error: "Limite de saques excedido. Máximo 3 saques por dia." 
        });
      }
      
      // Get wallet balance with transaction isolation
      const [wallet] = await db
        .select()
        .from(affiliatesWallet)
        .where(eq(affiliatesWallet.affiliateId, affiliateId))
        .limit(1);
      
      if (!wallet) {
        return res.status(400).json({ error: "Carteira não encontrada" });
      }
      
      const availableBalance = parseFloat(wallet.balance || '0');
      
      // Security: Double-check balance is positive
      if (availableBalance < 0) {
        console.error(`SECURITY WARNING: Negative balance detected for affiliate ${affiliateId}: ${availableBalance}`);
        return res.status(500).json({ error: "Erro no saldo da carteira" });
      }
      
      if (withdrawAmount > availableBalance) {
        return res.status(400).json({ 
          error: `Saldo insuficiente. Disponível: R$ ${availableBalance.toFixed(2)}` 
        });
      }
      
      // Calculate net amount after fee
      const netAmountToReceive = withdrawAmount - WITHDRAWAL_FEE;
      
      // Security: Ensure net amount is positive
      if (netAmountToReceive <= 0) {
        return res.status(400).json({ 
          error: "Valor líquido após taxa deve ser positivo" 
        });
      }
      
      // Security: Log withdrawal attempt for audit trail
      console.log(`[WITHDRAWAL] Affiliate ${affiliateId} requesting withdrawal: Amount: R$${withdrawAmount}, PIX: ${sanitizedPixKey.substring(0, 4)}****, Type: ${sanitizedPixKeyType}`);
      
      // Create withdrawal in affiliates_withdrawals table
      // Store the NET amount (after tax) in the database
      const withdrawal = await storage.createAffiliateWithdrawal({
        affiliateId,
        amount: netAmountToReceive,  // Save the net amount (after tax deduction)
        pixKey: sanitizedPixKey,
        pixKeyType: sanitizedPixKeyType
      });
      
      // Update wallet balance
      const newBalance = availableBalance - withdrawAmount;
      await db
        .update(affiliatesWallet)
        .set({ 
          balance: newBalance.toFixed(2),
          lastTransactionAt: new Date()
        })
        .where(eq(affiliatesWallet.affiliateId, affiliateId));
      
      // Also create a transaction record for history
      await db
        .insert(affiliatesWalletTransactions)
        .values({
          walletId: wallet.id,
          affiliateId,
          type: 'withdrawal',
          amount: withdrawAmount.toFixed(2),
          balanceBefore: availableBalance.toFixed(2),
          balanceAfter: newBalance.toFixed(2),
          description: `Saque PIX - ${pixKey}`,
          status: 'pending',
          metadata: JSON.stringify({ 
            pixKey, 
            pixKeyType,
            withdrawalId: withdrawal.id,
            grossAmount: withdrawAmount.toFixed(2),
            fee: WITHDRAWAL_FEE.toFixed(2),
            netAmount: netAmountToReceive.toFixed(2)
          })
        })
        .returning();
      
      res.json({
        success: true,
        withdrawal: {
          ...withdrawal,
          grossAmount: withdrawAmount.toFixed(2), // Original amount requested
          netAmount: netAmountToReceive.toFixed(2), // Amount after fee
          fee: WITHDRAWAL_FEE.toFixed(2) // Fee amount
        },
        message: `Saque solicitado com sucesso. Você receberá R$ ${netAmountToReceive.toFixed(2)} (desconto de R$ ${WITHDRAWAL_FEE.toFixed(2)} de taxa). Processamento em até 24h úteis.`
      });
      
    } catch (error) {
      console.error("Error creating withdrawal:", error);
      res.status(500).json({ error: "Erro ao processar saque" });
    }
  });
  
  // Check if a code exists
  app.get("/api/affiliate/codes/check/:code", async (req, res) => {
    try {
      const { code } = req.params;
      
      const existingCode = await storage.getAffiliateCodeByCode(code.toUpperCase());
      
      res.json({ exists: !!existingCode });
    } catch (error) {
      console.error("Error checking affiliate code:", error);
      res.status(500).json({ error: "Erro ao verificar código" });
    }
  });

  app.get("/api/affiliate/stats", authenticateAffiliate, async (req: any, res) => {
    try {
      const affiliateId = req.affiliateId;
      const decoded = req.affiliateData;
      
      // Special handling for test account
      if (decoded && decoded.isTest) {
        return res.json({
          totalClicks: 1250,
          totalRegistrations: 45,
          totalConversions: 23,
          conversionRate: 51.1,
          totalEarnings: "2340.00",
          pendingEarnings: "480.00",
          availableEarnings: "1860.00",
          code: "AFTESTE",
          level: 3,
          commissionRate: 25
        });
      }
      
      const stats = await storage.getAffiliateStats(affiliateId);
      const affiliate = await storage.getAffiliateById(affiliateId);
      
      // Calculate level and commission rate based on total earnings
      const totalEarnings = parseFloat(stats.totalEarnings || '0');
      const level = calculateAffiliateLevel(totalEarnings);
      const commissionRate = getAffiliateCommissionRate(level);
      
      res.json({ 
        ...stats,
        code: affiliate?.code,
        level,
        commissionRate
      });
    } catch (error) {
      console.error("Error getting affiliate stats:", error);
      res.status(500).json({ error: "Erro ao buscar estatísticas" });
    }
  });

  app.post("/api/affiliate/track-click", async (req, res) => {
    try {
      const { code } = req.body;
      
      if (!code) {
        return res.json({ success: true });
      }
      
      const normalizedCode = code.toUpperCase();
      
      // First check if it's a code from affiliate_codes table
      const affiliateCode = await storage.getAffiliateCodeByCode(normalizedCode);
      if (affiliateCode) {
        // Update click statistics for the code
        await storage.updateAffiliateCodeStats(normalizedCode, 'totalClicks');
        
        // Also track the affiliate click
        const affiliate = await storage.getAffiliateById(affiliateCode.affiliateId);
        if (affiliate) {
          await storage.trackAffiliateClick({
            affiliateId: affiliate.id,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            referrerUrl: req.headers.referer,
          });
        }
        return res.json({ success: true });
      }
      
      // Check if it's a direct affiliate code
      const affiliate = await storage.getAffiliateByCode(normalizedCode);
      if (affiliate) {
        await storage.trackAffiliateClick({
          affiliateId: affiliate.id,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          referrerUrl: req.headers.referer,
        });
        return res.json({ success: true });
      }
      
      // Code not found - return 404 so frontend can try partner tracking
      res.status(404).json({ error: "Código não encontrado" });
    } catch (error) {
      console.error("Error tracking affiliate click:", error);
      res.status(500).json({ error: "Erro ao rastrear clique" });
    }
  });

  // ===== ADDITIONAL AFFILIATE ROUTES =====
  
  // Check if affiliate code is available
  app.get("/api/affiliate/check-code", async (req, res) => {
    try {
      const { code } = req.query;
      
      if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: "Código é obrigatório" });
      }
      
      // Validate code format
      if (code.length < 3 || !/^[a-z0-9-_]+$/.test(code)) {
        return res.status(400).json({ error: "Código inválido" });
      }
      
      const existingAffiliate = await storage.getAffiliateByCode(code);
      
      res.json({ 
        available: !existingAffiliate,
        code: code 
      });
    } catch (error) {
      console.error("Error checking code availability:", error);
      res.status(500).json({ error: "Erro ao verificar disponibilidade do código" });
    }
  });
  
  app.post("/api/affiliate/payout", authenticateAffiliate, async (req: any, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      const affiliateId = req.affiliateId;
      
      const validationResult = payoutRequestSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: validationResult.error.errors[0].message 
        });
      }
      
      const { amount, pixKey } = validationResult.data;
      
      const affiliate = await storage.getAffiliateById(affiliateId);
      if (!affiliate) {
        return res.status(404).json({ error: "Afiliado não encontrado" });
      }
      
      if (parseFloat(amount) < 50) {
        return res.status(400).json({ error: "Valor mínimo para saque: R$ 50,00" });
      }
      
      if (parseFloat(amount) > parseFloat(affiliate.pendingEarnings)) {
        return res.status(400).json({ error: "Saldo insuficiente para saque" });
      }
      
      const payout = await storage.requestAffiliatePayout(affiliateId, amount, pixKey);
      res.json({ success: true, payout });
    } catch (error) {
      console.error("Error requesting payout:", error);
      res.status(500).json({ error: "Erro ao solicitar saque" });
    }
  });

  app.get("/api/affiliate/payouts", authenticateAffiliate, async (req: any, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      const affiliateId = req.affiliateId;
      
      const payouts = await storage.getAffiliatePayouts(affiliateId);
      res.json(payouts || []);
    } catch (error) {
      console.error("Error getting payouts - full error:", error);
      console.error("Stack trace:", (error as any).stack);
      res.status(500).json({ error: "Erro ao buscar saques" });
    }
  });

  app.get("/api/affiliate/performance", authenticateAffiliate, async (req: any, res) => {
    try {
      const affiliateId = req.affiliateId;
      
      // Generate performance data for last 30 days
      const today = new Date();
      const performanceData = [];
      
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        // In production, query actual data from database
        // For now, return structure with zeros (will be populated as conversions happen)
        performanceData.push({
          date: dateStr,
          clicks: 0,
          registrations: 0,
          deposits: 0,
          earnings: 0
        });
      }
      
      res.json(performanceData);
    } catch (error) {
      console.error("Error getting performance data:", error);
      res.status(500).json({ error: "Erro ao buscar dados de desempenho" });
    }
  });

  app.get("/api/affiliate/conversions", authenticateAffiliate, async (req: any, res) => {
    try {
      const affiliateId = req.affiliateId;
      
      // Get conversions from database
      try {
        const conversions = await db.select()
          .from(affiliateConversions)
          .where(eq(affiliateConversions.affiliateId, affiliateId))
          .orderBy(desc(affiliateConversions.createdAt))
          .limit(100);
        
        return res.json(conversions || []);
      } catch (dbError) {
        console.error("Database error in conversions:", dbError);
        return res.json([]); // Return empty array on error for now
      }
    } catch (error) {
      console.error("Error in conversions route:", error);
      return res.status(500).json({ error: "Erro ao buscar conversões" });
    }
  });

  app.patch("/api/affiliate/profile", authenticateAffiliate, async (req: any, res) => {
    try {
      const affiliateId = req.affiliateId;
      
      const { name, phone, pixKey } = req.body;
      
      // If PIX key is provided, validate it
      if (pixKey) {
        const detectedType = detectPixKeyType(pixKey);
        if (!detectedType) {
          return res.status(400).json({ error: "Chave PIX inválida. Use apenas CPF ou CNPJ" });
        }
      }
      
      const updated = await storage.updateAffiliate(affiliateId, {
        name,
        phone,
        pixKey
      });
      
      res.json({ success: true, affiliate: { ...updated, password: undefined } });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "Erro ao atualizar perfil" });
    }
  });

  // Affiliate Settings Endpoints
  app.get("/api/affiliate/settings", authenticateAffiliate, async (req: any, res) => {
    try {
      const affiliateId = req.affiliateId;
      
      const affiliate = await storage.getAffiliate(affiliateId);
      if (!affiliate) {
        return res.status(404).json({ error: "Afiliado não encontrado" });
      }
      
      res.json({
        name: affiliate.name,
        email: affiliate.email,
        phone: affiliate.phone || '',
        pixKeyType: affiliate.pixKeyType || 'cpf',
        pixKey: affiliate.pixKey || ''
      });
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: "Erro ao buscar configurações" });
    }
  });

  app.put("/api/affiliate/settings/profile", authenticateAffiliate, async (req: any, res) => {
    try {
      const affiliateId = req.affiliateId;
      
      const { name, email, phone } = req.body;
      
      // Update affiliate profile
      await db.update(affiliates)
        .set({ 
          name, 
          email, 
          phone 
        })
        .where(eq(affiliates.id, affiliateId));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "Erro ao atualizar perfil" });
    }
  });

  app.put("/api/affiliate/settings/password", authenticateAffiliate, async (req: any, res) => {
    try {
      const affiliateId = req.affiliateId;
      
      const { oldPassword, newPassword } = req.body;
      
      // Validate new password
      if (newPassword.length < 8) {
        return res.status(400).json({ error: "A senha deve ter no mínimo 8 caracteres" });
      }
      if (!/[A-Z]/.test(newPassword)) {
        return res.status(400).json({ error: "A senha deve conter pelo menos uma letra maiúscula" });
      }
      if (!/[0-9]/.test(newPassword)) {
        return res.status(400).json({ error: "A senha deve conter pelo menos um número" });
      }
      
      // Get current affiliate
      const affiliate = await storage.getAffiliate(affiliateId);
      if (!affiliate) {
        return res.status(404).json({ error: "Afiliado não encontrado" });
      }
      
      // Verify old password
      const isValid = await bcrypt.compare(oldPassword, affiliate.password);
      if (!isValid) {
        return res.status(400).json({ error: "Senha atual incorreta" });
      }
      
      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Update password
      await db.update(affiliates)
        .set({ password: hashedPassword })
        .where(eq(affiliates.id, affiliateId));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating password:", error);
      res.status(500).json({ error: "Erro ao alterar senha" });
    }
  });

  app.put("/api/affiliate/settings/pix", authenticateAffiliate, async (req: any, res) => {
    try {
      const affiliateId = req.affiliateId;
      
      const { pixKeyType, pixKey } = req.body;
      
      // Validate PIX key type - Only CPF/CNPJ allowed
      if (pixKeyType !== 'cpf' && pixKeyType !== 'cnpj') {
        return res.status(400).json({ error: "Tipo de chave PIX inválido. Use apenas CPF ou CNPJ" });
      }
      
      // Validate PIX key format
      const detectedType = detectPixKeyType(pixKey);
      if (!detectedType || detectedType !== pixKeyType) {
        return res.status(400).json({ error: "Formato de chave PIX inválido para o tipo selecionado" });
      }
      
      // Update PIX key
      await db.update(affiliates)
        .set({ 
          pixKeyType,
          pixKey 
        })
        .where(eq(affiliates.id, affiliateId));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating PIX key:", error);
      res.status(500).json({ error: "Erro ao atualizar chave PIX" });
    }
  });

  app.delete("/api/affiliate/settings/pix", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Token não fornecido" });
      }
      
      const token = authHeader.split(" ")[1];
      let decoded: any;
      try {
        decoded = jwt.verify(token, JWT_SECRET) as any;
      } catch (jwtError) {
        return res.status(401).json({ error: "Token inválido ou expirado" });
      }
      
      if (decoded.type !== 'affiliate') {
        return res.status(401).json({ error: "Token inválido" });
      }
      
      // Remove PIX key
      await db.update(affiliates)
        .set({ 
          pixKeyType: null,
          pixKey: null
        })
        .where(eq(affiliates.id, decoded.affiliateId));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting PIX key:", error);
      res.status(500).json({ error: "Erro ao remover chave PIX" });
    }
  });

  // Affiliate Support Chat Routes
  app.get("/api/affiliate/support/active-chat", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Token não fornecido" });
      }
      
      const token = authHeader.split(" ")[1];
      let decoded: any;
      try {
        decoded = jwt.verify(token, JWT_SECRET) as any;
      } catch (jwtError) {
        return res.status(401).json({ error: "Token inválido ou expirado" });
      }
      
      if (decoded.type !== 'affiliate') {
        return res.status(401).json({ error: "Token inválido" });
      }
      
      // Get active support chat for affiliate
      const activeChat = await storage.getAffiliateActiveChat(decoded.affiliateId);
      
      if (!activeChat) {
        return res.status(404).json({ message: "Nenhum chamado ativo" });
      }
      
      res.json(activeChat);
    } catch (error) {
      console.error("Error fetching active chat:", error);
      res.status(500).json({ error: "Erro ao buscar chamado ativo" });
    }
  });

  app.get("/api/affiliate/support/chat/:chatId", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Token não fornecido" });
      }
      
      const token = authHeader.split(" ")[1];
      let decoded: any;
      try {
        decoded = jwt.verify(token, JWT_SECRET) as any;
      } catch (jwtError) {
        return res.status(401).json({ error: "Token inválido ou expirado" });
      }
      
      if (decoded.type !== 'affiliate') {
        return res.status(401).json({ error: "Token inválido" });
      }
      
      const chatId = parseInt(req.params.chatId);
      const chat = await storage.getAffiliateSupportChat(chatId);
      
      if (!chat || chat.affiliateId !== decoded.affiliateId) {
        return res.status(403).json({ message: "Chat não encontrado" });
      }
      
      const messages = await storage.getAffiliateChatMessages(chatId);
      
      // Map messages to match frontend expectations
      const mappedMessages = messages.map(msg => ({
        ...msg,
        sender: msg.senderType === 'affiliate' ? 'user' : msg.senderType
      }));
      
      res.json({ chat, messages: mappedMessages });
    } catch (error) {
      console.error("Error fetching chat:", error);
      res.status(500).json({ error: "Erro ao buscar chat" });
    }
  });

  app.post("/api/affiliate/support/create", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Token não fornecido" });
      }
      
      const token = authHeader.split(" ")[1];
      let decoded: any;
      try {
        decoded = jwt.verify(token, JWT_SECRET) as any;
      } catch (jwtError) {
        return res.status(401).json({ error: "Token inválido ou expirado" });
      }
      
      if (decoded.type !== 'affiliate') {
        return res.status(401).json({ error: "Token inválido" });
      }
      
      const { description } = req.body;
      
      // Check if affiliate already has active chat
      const existingChat = await storage.getAffiliateActiveChat(decoded.affiliateId);
      if (existingChat) {
        return res.status(400).json({ message: "Você já possui um chat ativo" });
      }
      
      // Create new chat for affiliate
      const chat = await storage.createAffiliateSupportChat(decoded.affiliateId);
      
      // Send automatic welcome message
      await storage.createAffiliateSupportMessage({
        chatId: chat.id,
        senderId: 0,
        senderType: "support",
        message: `Olá! Bem-vindo ao suporte de afiliados. Nossa equipe está pronta para ajudar você. Como podemos ajudá-lo hoje?`,
      });
      
      res.json(chat);
    } catch (error) {
      console.error("Error creating chat:", error);
      res.status(500).json({ error: "Erro ao criar chamado" });
    }
  });

  app.post("/api/affiliate/support/message/:chatId", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Token não fornecido" });
      }
      
      const token = authHeader.split(" ")[1];
      let decoded: any;
      try {
        decoded = jwt.verify(token, JWT_SECRET) as any;
      } catch (jwtError) {
        return res.status(401).json({ error: "Token inválido ou expirado" });
      }
      
      if (decoded.type !== 'affiliate') {
        return res.status(401).json({ error: "Token inválido" });
      }
      
      const chatId = parseInt(req.params.chatId);
      const { message } = req.body;
      
      if (!message || !message.trim()) {
        return res.status(400).json({ message: "Mensagem é obrigatória" });
      }
      
      // Verify chat belongs to affiliate and is active
      const chat = await storage.getAffiliateSupportChat(chatId);
      if (!chat || chat.affiliateId !== decoded.affiliateId) {
        return res.status(403).json({ message: "Chat não encontrado" });
      }
      
      if (chat.status !== "open") {
        return res.status(400).json({ message: "Este chat está fechado" });
      }
      
      // Send message
      const newMessage = await storage.createAffiliateSupportMessage({
        chatId: chatId,
        senderId: decoded.affiliateId,
        senderType: "affiliate",
        message: message.trim(),
      });
      
      // Map message to match frontend expectations
      const mappedMessage = {
        ...newMessage,
        sender: 'user'
      };
      
      res.json(mappedMessage);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ error: "Erro ao enviar mensagem" });
    }
  });

  app.post("/api/affiliate/support/send", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Token não fornecido" });
      }
      
      const token = authHeader.split(" ")[1];
      let decoded: any;
      try {
        decoded = jwt.verify(token, JWT_SECRET) as any;
      } catch (jwtError) {
        return res.status(401).json({ error: "Token inválido ou expirado" });
      }
      
      if (decoded.type !== 'affiliate') {
        return res.status(401).json({ error: "Token inválido" });
      }
      
      const { chatId, message } = req.body;
      
      if (!chatId || !message) {
        return res.status(400).json({ message: "Chat ID e mensagem são obrigatórios" });
      }
      
      // Verify chat belongs to affiliate
      const chat = await storage.getAffiliateSupportChat(chatId);
      if (!chat || chat.affiliateId !== decoded.affiliateId) {
        return res.status(403).json({ message: "Chat não encontrado" });
      }
      
      if (chat.status !== "active") {
        return res.status(400).json({ message: "Este chat está fechado" });
      }
      
      // Create message
      const newMessage = await storage.createAffiliateSupportMessage({
        chatId,
        senderId: decoded.affiliateId,
        senderType: "affiliate",
        message,
      });
      
      res.json(newMessage);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ error: "Erro ao enviar mensagem" });
    }
  });

  app.post("/api/affiliate/support/close/:chatId", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Token não fornecido" });
      }
      
      const token = authHeader.split(" ")[1];
      let decoded: any;
      try {
        decoded = jwt.verify(token, JWT_SECRET) as any;
      } catch (jwtError) {
        return res.status(401).json({ error: "Token inválido ou expirado" });
      }
      
      if (decoded.type !== 'affiliate') {
        return res.status(401).json({ error: "Token inválido" });
      }
      
      const chatId = parseInt(req.params.chatId);
      
      // Verify chat belongs to affiliate
      const chat = await storage.getAffiliateSupportChat(chatId);
      if (!chat || chat.affiliateId !== decoded.affiliateId) {
        return res.status(403).json({ message: "Chat não encontrado" });
      }
      
      await storage.closeAffiliateSupportChat(chatId, "affiliate");
      
      res.json({ message: "Chat fechado com sucesso" });
    } catch (error) {
      console.error("Error closing chat:", error);
      res.status(500).json({ error: "Erro ao fechar chat" });
    }
  });

  // Admin: Complete Affiliate Management Routes
  app.get("/api/admin/affiliates/complete", authenticateAdmin, async (req, res) => {
    try {
      // Get all affiliates with complete data
      const allAffiliates = await db.select().from(affiliates).orderBy(desc(affiliates.createdAt));
      
      // Calculate stats for each affiliate
      const affiliatesWithStats = await Promise.all(allAffiliates.map(async (affiliate) => {
        // Get conversion stats
        const conversions = await db.select({
          totalAmount: sql`COALESCE(SUM(CAST(commission AS DECIMAL)), 0)`,
          count: sql`COUNT(*)`
        })
        .from(affiliateConversions)
        .where(eq(affiliateConversions.affiliateId, affiliate.id));
        
        // Get pending earnings
        const pending = await db.select({
          total: sql`COALESCE(SUM(CAST(commission AS DECIMAL)), 0)`
        })
        .from(affiliateConversions)
        .where(and(
          eq(affiliateConversions.affiliateId, affiliate.id),
          eq(affiliateConversions.status, 'pending')
        ));
        
        // Get paid earnings
        const paid = await db.select({
          total: sql`COALESCE(SUM(amount), 0)`
        })
        .from(affiliatesWalletTransactions)
        .where(and(
          eq(affiliatesWalletTransactions.affiliateId, affiliate.id),
          eq(affiliatesWalletTransactions.type, 'commission'),
          eq(affiliatesWalletTransactions.status, 'completed')
        ));
        
        return {
          id: affiliate.id,
          name: affiliate.name,
          email: affiliate.email,
          phone: affiliate.phone || '',
          cpf: affiliate.cpf || '',
          pix_key: affiliate.pixKey || '',
          pix_key_type: affiliate.pixKeyType || 'cpf',
          commission_rate: parseFloat(affiliate.customCommissionRate || affiliate.currentLevelRate || '40'),
          total_earnings: parseFloat(conversions[0]?.totalAmount || '0'),
          paid_earnings: parseFloat(paid[0]?.total || '0'),
          pending_earnings: parseFloat(pending[0]?.total || '0'),
          total_clicks: parseInt(affiliate.totalClicks || '0'),
          total_registrations: parseInt(affiliate.totalRegistrations || '0'),
          total_deposits: parseInt(affiliate.totalDeposits || '0'),
          is_active: affiliate.isActive,
          level: affiliate.affiliateLevel || 'bronze',
          created_at: affiliate.createdAt,
          last_activity: affiliate.lastActivity || affiliate.createdAt,
          commissionType: affiliate.commissionType || 'percentage',
          customCommissionRate: affiliate.customCommissionRate || null,
          customFixedAmount: affiliate.customFixedAmount || null
        };
      }));
      
      // Calculate overall stats
      const totalEarnings = affiliatesWithStats.reduce((sum, a) => sum + a.total_earnings, 0);
      const pendingPayouts = affiliatesWithStats.reduce((sum, a) => sum + a.pending_earnings, 0);
      const totalClicks = affiliatesWithStats.reduce((sum, a) => sum + a.total_clicks, 0);
      const totalRegistrations = affiliatesWithStats.reduce((sum, a) => sum + a.total_registrations, 0);
      const totalDeposits = affiliatesWithStats.reduce((sum, a) => sum + a.total_deposits, 0);
      const conversionRate = totalRegistrations > 0 ? (totalDeposits / totalRegistrations) * 100 : 0;
      
      res.json({
        affiliates: affiliatesWithStats,
        totalEarnings,
        pendingPayouts,
        totalClicks,
        totalRegistrations,
        totalDeposits,
        conversionRate
      });
    } catch (error) {
      console.error("Error fetching complete affiliates data:", error);
      res.status(500).json({ error: "Erro ao buscar dados dos afiliados" });
    }
  });
  
  // Admin: Get affiliate withdrawals - usando tabela affiliates_withdrawals
  app.get("/api/admin/affiliate-withdrawals", authenticateAdmin, async (req, res) => {
    try {
      const withdrawals = await storage.getAffiliateWithdrawals();
      
      const formattedWithdrawals = withdrawals.map(withdrawal => ({
        id: withdrawal.id,
        displayId: withdrawal.displayId,
        affiliate_id: withdrawal.affiliateId,
        affiliate_name: withdrawal.affiliateName || 'Unknown',
        affiliate_email: withdrawal.affiliateEmail || '',
        amount: parseFloat(withdrawal.amount),
        status: withdrawal.status || 'pending',
        pix_key: withdrawal.pixKey || '',
        pix_key_type: withdrawal.pixKeyType || 'pix',
        requested_at: withdrawal.requestedAt,
        processed_at: withdrawal.processedAt,
        end_to_end_id: withdrawal.endToEndId || null,
        admin_notes: withdrawal.adminNotes,
        rejection_reason: withdrawal.rejectionReason
      }));
      
      res.json(formattedWithdrawals);
    } catch (error) {
      console.error("Error fetching affiliate withdrawals:", error);
      res.status(500).json({ error: "Erro ao buscar saques" });
    }
  });
  
  // Admin: Get affiliate details (links and codes)
  app.get("/api/admin/affiliates/:id/details", authenticateAdmin, async (req, res) => {
    try {
      const affiliateId = parseInt(req.params.id);
      
      // Get affiliate codes
      const codes = await db.select()
        .from(affiliateCodes)
        .where(eq(affiliateCodes.affiliateId, affiliateId))
        .orderBy(desc(affiliateCodes.createdAt));
      
      // Get marketing links with proper aggregation
      const links = await db.select()
        .from(marketingLinks)
        .where(eq(marketingLinks.affiliateId, affiliateId))
        .orderBy(desc(marketingLinks.createdAt));
        
      // Format links with click data
      const formattedLinks = await Promise.all(links.map(async (link) => {
        // Get click count for this link
        const clickData = await db.select({
          totalClicks: sql<string>`COALESCE(SUM(${marketingClicks.count}), 0)::text`
        })
        .from(marketingClicks)
        .where(eq(marketingClicks.linkId, link.id));
        
        // Get conversion data
        const conversionData = await db.select({
          registrations: sql<string>`COUNT(DISTINCT ${marketingConversions.userId})::text`,
          deposits: sql<string>`COUNT(*)::text`
        })
        .from(marketingConversions)
        .where(eq(marketingConversions.linkId, link.id));
        
        const clicks = parseInt(clickData[0]?.totalClicks || '0');
        const registrations = parseInt(conversionData[0]?.registrations || '0');
        const deposits = parseInt(conversionData[0]?.deposits || '0');
        
        return {
          id: link.id,
          name: link.linkName,
          url: `https://mania-brasil.com/${link.customPath}`,
          clicks,
          registrations,
          deposits,
          conversion_rate: clicks > 0 ? ((registrations / clicks) * 100).toFixed(1) : '0',
          created_at: link.createdAt
        };
      }));
      
      // Format codes
      const formattedCodes = codes.map(code => ({
        id: code.id,
        code: code.code,
        clicks: parseInt(code.clicks || '0'),
        registrations: parseInt(code.registrations || '0'),
        deposits: parseInt(code.deposits || '0'),
        created_at: code.createdAt
      }));
      
      res.json({
        codes: formattedCodes,
        links: formattedLinks
      });
    } catch (error) {
      console.error("Error fetching affiliate details:", error);
      res.status(500).json({ error: "Erro ao buscar detalhes do afiliado" });
    }
  });
  
  // Admin: Get all partners with metrics
  app.get("/api/admin/partners", authenticateAdmin, async (req, res) => {
    try {
      // Get all partners
      const partnersData = await db.select()
        .from(partners)
        .orderBy(desc(partners.createdAt));

      // Calculate additional metrics for each partner
      const formattedPartners = await Promise.all(partnersData.map(async (partner) => {
        // Get affiliate info
        const [affiliate] = partner.affiliateId ? await db.select()
          .from(affiliates)
          .where(eq(affiliates.id, partner.affiliateId))
          .limit(1) : [null];
        // Get recent activity (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Get recent conversions
        const recentConversions = await db.select({
          count: sql<string>`COUNT(*)::text`
        })
        .from(marketingConversions)
        .leftJoin(marketingLinks, eq(marketingConversions.linkId, marketingLinks.id))
        .where(and(
          eq(marketingLinks.partnerId, partner.id),
          gte(marketingConversions.createdAt, thirtyDaysAgo)
        ));

        // Get active marketing links count
        const activeLinks = await db.select({
          count: sql<string>`COUNT(*)::text`
        })
        .from(marketingLinks)
        .where(eq(marketingLinks.partnerId, partner.id));

        // Calculate commission display
        const commissionDisplay = partner.commissionType === 'percentage'
          ? `${partner.commissionValue}%`
          : `R$ ${parseFloat(partner.commissionValue || '0').toFixed(2)}`;

        // Calculate conversion rate
        const totalClicks = parseInt(partner.totalClicks || '0');
        const totalRegistrations = parseInt(partner.totalRegistrations || '0');
        const conversionRate = totalClicks > 0
          ? ((totalRegistrations / totalClicks) * 100).toFixed(1)
          : '0';

        return {
          id: partner.id,
          name: partner.name,
          email: partner.email,
          phone: partner.phone,
          cpf: partner.cpf,
          pixKey: partner.pixKey,
          pixKeyType: partner.pixKeyType,
          commissionType: partner.commissionType,
          commissionValue: partner.commissionValue,
          commissionDisplay,
          isActive: partner.isActive,
          createdAt: partner.createdAt,
          lastActivity: partner.lastActivity,
          affiliateId: affiliate?.id || null,
          affiliateName: affiliate?.name || 'N/A',
          affiliateEmail: affiliate?.email || 'N/A',
          metrics: {
            totalEarnings: parseFloat(partner.totalEarnings || '0'),
            paidEarnings: parseFloat(partner.paidEarnings || '0'),
            pendingEarnings: parseFloat(partner.pendingEarnings || '0'),
            totalClicks: parseInt(partner.totalClicks || '0'),
            totalRegistrations: parseInt(partner.totalRegistrations || '0'),
            totalDeposits: parseInt(partner.totalDeposits || '0'),
            conversionRate,
            recentConversions: parseInt(recentConversions[0]?.count || '0'),
            activeLinks: parseInt(activeLinks[0]?.count || '0')
          }
        };
      }));

      // Calculate summary statistics
      const summary = {
        totalPartners: formattedPartners.length,
        activePartners: formattedPartners.filter(p => p.isActive).length,
        totalEarnings: formattedPartners.reduce((sum, p) => sum + p.metrics.totalEarnings, 0),
        totalPendingEarnings: formattedPartners.reduce((sum, p) => sum + p.metrics.pendingEarnings, 0),
        totalPaidEarnings: formattedPartners.reduce((sum, p) => sum + p.metrics.paidEarnings, 0),
        totalClicks: formattedPartners.reduce((sum, p) => sum + p.metrics.totalClicks, 0),
        totalRegistrations: formattedPartners.reduce((sum, p) => sum + p.metrics.totalRegistrations, 0),
        totalDeposits: formattedPartners.reduce((sum, p) => sum + p.metrics.totalDeposits, 0)
      };

      res.json({
        partners: formattedPartners,
        summary
      });
    } catch (error) {
      console.error("Error fetching partners:", error);
      res.status(500).json({ error: "Erro ao buscar parceiros" });
    }
  });
  
  // Admin: Create new affiliate
  app.post("/api/admin/affiliates/create", authenticateAdmin, async (req, res) => {
    try {
      const { name, email, phone, password, commission_rate } = req.body;
      
      // Check if email already exists
      const existing = await db.select()
        .from(affiliates)
        .where(eq(affiliates.email, email))
        .limit(1);
      
      if (existing.length > 0) {
        return res.status(400).json({ error: "Email já cadastrado" });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create affiliate
      const [newAffiliate] = await db.insert(affiliates).values({
        name,
        email,
        phone: phone || null,
        cpf: null,
        password: hashedPassword,
        pixKey: null,
        pixKeyType: null,
        commissionRate: commission_rate.toString(),
        isActive: true,
        createdAt: new Date(),
        totalClicks: '0',
        totalRegistrations: '0',
        totalDeposits: '0',
        affiliateLevel: 'bronze',
        currentLevelRate: '40',
        approvedEarnings: '0'
      }).returning();
      
      res.json({
        id: newAffiliate.id,
        name: newAffiliate.name,
        email: newAffiliate.email,
        password // Return plain password for admin to share
      });
    } catch (error) {
      console.error("Error creating affiliate:", error);
      res.status(500).json({ error: "Erro ao criar afiliado" });
    }
  });
  
  // Admin: Reset affiliate password
  app.post("/api/admin/affiliates/:id/reset-password", authenticateAdmin, async (req, res) => {
    try {
      const affiliateId = parseInt(req.params.id);
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({ error: "Senha é obrigatória" });
      }
      
      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Update password
      await db.update(affiliates)
        .set({ password: hashedPassword })
        .where(eq(affiliates.id, affiliateId));
      
      res.json({ success: true, message: "Senha atualizada com sucesso" });
    } catch (error) {
      console.error("Error resetting affiliate password:", error);
      res.status(500).json({ error: "Erro ao resetar senha" });
    }
  });
  
  // Admin: Update affiliate
  app.patch("/api/admin/affiliates/:id", authenticateAdmin, async (req, res) => {
    try {
      const affiliateId = parseInt(req.params.id);
      const updates = req.body;
      
      // Build update object
      const updateData: any = {};
      if (updates.is_active !== undefined) updateData.isActive = updates.is_active;
      if (updates.commission_rate !== undefined) updateData.commissionRate = updates.commission_rate.toString();
      if (updates.pix_key !== undefined) updateData.pixKey = updates.pix_key;
      if (updates.pix_key_type !== undefined) updateData.pixKeyType = updates.pix_key_type;
      
      await db.update(affiliates)
        .set(updateData)
        .where(eq(affiliates.id, affiliateId));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating affiliate:", error);
      res.status(500).json({ error: "Erro ao atualizar afiliado" });
    }
  });
  
  // Admin: Process affiliate withdrawal - usando tabela affiliates_withdrawals
  app.patch("/api/admin/affiliate-withdrawals/:id", authenticateAdmin, async (req, res) => {
    try {
      const withdrawalId = parseInt(req.params.id);
      const { action, notes, rejectionReason } = req.body;
      
      if (!['approve', 'reject', 'paid'].includes(action)) {
        return res.status(400).json({ error: "Ação inválida" });
      }
      
      const statusMap = {
        approve: 'approved',
        reject: 'rejected',
        paid: 'completed'
      };
      
      // Get withdrawal details first
      const { affiliatesWithdrawals } = await import("@shared/schema");
      const [withdrawal] = await db.select()
        .from(affiliatesWithdrawals)
        .where(eq(affiliatesWithdrawals.id, withdrawalId));
      
      if (!withdrawal) {
        return res.status(404).json({ error: "Saque não encontrado" });
      }
      
      // If approving, process via OrinPay
      let endToEndId = null;
      if (action === 'approve') {
        try {
          console.log(`[LIRAPAY] Processing affiliate withdrawal #${withdrawalId}`);
          
          // For now, we'll mark as approved and the actual PIX will be processed manually
          // Process withdrawal via LiraPay
          console.log(`[LIRAPAY] Affiliate withdrawal #${withdrawalId} marked as approved for processing`);
        } catch (error: any) {
          console.error(`[LIRAPAY] Error processing affiliate withdrawal:`, error);
          return res.status(500).json({ 
            error: `Erro ao processar PIX via LiraPay: ${error.message}`
          });
        }
      }
      
      // Update withdrawal status using storage method
      const updateData: any = {
        status: statusMap[action],
        processedAt: new Date()
      };
      
      if (notes) updateData.adminNotes = notes;
      if (action === 'reject' && rejectionReason) {
        updateData.rejectionReason = rejectionReason;
      }
      if (endToEndId) {
        updateData.endToEndId = endToEndId;
      }
      
      await storage.updateAffiliateWithdrawal(withdrawalId, updateData);
      
      // If rejecting, refund the amount to wallet
      if (action === 'reject') {
        // Add amount back to affiliate wallet
        const [wallet] = await db.select()
          .from(affiliatesWallet)
          .where(eq(affiliatesWallet.affiliateId, withdrawal.affiliateId));
          
        if (wallet) {
          const currentBalance = parseFloat(wallet.balance || '0');
          // IMPORTANT: Refund the ORIGINAL amount (net amount + fee)
          // The amount stored in DB is the net amount (after R$ 3 fee)
          // We need to refund the full original amount that was deducted
          const WITHDRAWAL_FEE = 3.00;
          const netAmount = parseFloat(withdrawal.amount);
          const refundAmount = netAmount + WITHDRAWAL_FEE; // Add back the fee to get original amount
          const newBalance = currentBalance + refundAmount;
          
          // Update wallet balance
          await db.update(affiliatesWallet)
            .set({ 
              balance: newBalance.toFixed(2),
              lastTransactionAt: new Date()
            })
            .where(eq(affiliatesWallet.affiliateId, withdrawal.affiliateId));
          
          // Create refund transaction
          await db.insert(affiliatesWalletTransactions).values({
            walletId: wallet.id,
            affiliateId: withdrawal.affiliateId,
            type: 'refund',
            amount: refundAmount.toFixed(2),
            balanceBefore: currentBalance.toFixed(2),
            balanceAfter: newBalance.toFixed(2),
            description: `Saque rejeitado - valor devolvido (R$ ${netAmount.toFixed(2)} + R$ ${WITHDRAWAL_FEE.toFixed(2)} taxa)${rejectionReason ? ': ' + rejectionReason : ''}`,
            status: 'completed',
            createdAt: new Date()
          });
        }
      }
      
      res.json({ success: true, endToEndId });
    } catch (error) {
      console.error("Error processing affiliate withdrawal:", error);
      res.status(500).json({ error: "Erro ao processar saque" });
    }
  });
  
  // Affiliate SMS password recovery endpoints
  app.post("/api/affiliate/send-sms-code", async (req, res) => {
    try {
      const { phone } = req.body;
      
      if (!phone) {
        return res.status(400).json({ message: "Telefone é obrigatório" });
      }
      
      // Clean phone number
      const cleanPhone = phone.replace(/\D/g, '');
      
      // Check if affiliate exists with this phone
      const affiliate = await db.select()
        .from(affiliates)
        .where(eq(affiliates.phone, cleanPhone))
        .limit(1);
      
      if (!affiliate || affiliate.length === 0) {
        return res.status(400).json({ message: "Telefone não encontrado" });
      }
      
      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Delete any existing codes for this phone
      await db.delete(smsVerificationCodes)
        .where(eq(smsVerificationCodes.phone, cleanPhone));
      
      // Store new code in database (expires in 10 minutes)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);
      
      await db.insert(smsVerificationCodes).values({
        phone: cleanPhone,
        code,
        type: 'affiliate_reset',
        used: false,
        expiresAt
      });
      
      // Send SMS via Twilio
      try {
        const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
        const formattedPhone = `+55${cleanPhone}`;
        
        await twilioClient.messages.create({
          body: `Seu código de recuperação Mania Brasil (Afiliado): ${code}`,
          from: twilioPhone,
          to: formattedPhone
        });
        
        console.log(`SMS sent to affiliate ${formattedPhone} with code ${code}`);
        res.json({ message: "Código de verificação enviado por SMS" });
      } catch (twilioError: any) {
        console.error("Twilio SMS error:", twilioError);
        res.status(500).json({ message: "Erro ao enviar SMS. Tente novamente." });
      }
    } catch (error) {
      console.error("Error sending SMS code:", error);
      res.status(500).json({ message: "Erro ao processar solicitação" });
    }
  });
  
  app.post("/api/affiliate/verify-sms-code", async (req, res) => {
    try {
      const { phone, code } = req.body;
      
      if (!phone || !code) {
        return res.status(400).json({ message: "Telefone e código são obrigatórios" });
      }
      
      const cleanPhone = phone.replace(/\D/g, '');
      
      // Verify code from database
      const verificationCode = await db.select()
        .from(smsVerificationCodes)
        .where(
          and(
            eq(smsVerificationCodes.phone, cleanPhone),
            eq(smsVerificationCodes.code, code),
            eq(smsVerificationCodes.type, 'affiliate_reset'),
            eq(smsVerificationCodes.used, false),
            gte(smsVerificationCodes.expiresAt, new Date())
          )
        )
        .limit(1);
      
      if (!verificationCode || verificationCode.length === 0) {
        return res.status(400).json({ message: "Código inválido ou expirado" });
      }
      
      // Mark code as used
      await db.update(smsVerificationCodes)
        .set({ used: true })
        .where(eq(smsVerificationCodes.id, verificationCode[0].id));
      
      // Generate reset token
      const resetToken = jwt.sign(
        { phone: cleanPhone, type: 'affiliate_reset' },
        JWT_SECRET,
        { expiresIn: '15m' }
      );
      
      res.json({ 
        message: "Código verificado com sucesso",
        resetToken 
      });
    } catch (error) {
      console.error("Error verifying SMS code:", error);
      res.status(500).json({ message: "Erro ao verificar código" });
    }
  });
  
  // Discord webhook routes
  app.get("/api/admin/discord-webhooks", authenticateAdmin, async (req, res) => {
    try {
      const webhooks = await storage.getDiscordWebhooks();
      res.json(webhooks);
    } catch (error) {
      console.error("Error fetching Discord webhooks:", error);
      res.status(500).json({ message: "Failed to fetch Discord webhooks" });
    }
  });

  app.post("/api/admin/discord-webhooks", authenticateAdmin, async (req, res) => {
    try {
      const { webhookType, webhookUrl } = req.body;
      
      if (!webhookType) {
        return res.status(400).json({ message: "Webhook type is required" });
      }
      
      await storage.saveDiscordWebhook(webhookType, webhookUrl);
      res.json({ message: "Discord webhook saved successfully" });
    } catch (error) {
      console.error("Error saving Discord webhook:", error);
      res.status(500).json({ message: "Failed to save Discord webhook" });
    }
  });

  app.post("/api/admin/test-discord-webhook", authenticateAdmin, async (req, res) => {
    try {
      const { webhookType } = req.body;
      
      if (!webhookType) {
        return res.status(400).json({ message: "Webhook type is required" });
      }
      
      // Import Discord notification functions
      const { 
        notifyNewUser, 
        notifyDepositPending, 
        notifyDepositPaid, 
        notifyWithdrawal, 
        notifySupportTicket 
      } = await import('./discord-webhook');
      
      // Send test notification based on type
      switch(webhookType) {
        case 'new_user':
          await notifyNewUser({
            name: 'Usuário Teste',
            email: 'teste@exemplo.com',
            phone: '11999999999',
            referredBy: 'TESTE123'
          });
          break;
        case 'deposit_pending':
          await notifyDepositPending({
            userId: 999,
            userName: 'Usuário Teste',
            amount: '100.00',
            transactionId: 'TEST-123456',
            paymentProvider: 'horsepay'
          });
          break;
        case 'deposit_paid':
          await notifyDepositPaid({
            userId: 999,
            userName: 'Usuário Teste',
            amount: '100.00',
            transactionId: 'TEST-123456',
            paymentProvider: 'horsepay'
          });
          break;
        case 'withdrawal':
          await notifyWithdrawal({
            userId: 999,
            userName: 'Usuário Teste',
            amount: '50.00',
            pixKey: 'teste@pix.com',
            status: 'approved'
          });
          break;
        case 'support':
          await notifySupportTicket({
            userId: 999,
            userName: 'Usuário Teste',
            message: 'Esta é uma mensagem de teste do sistema de suporte.',
            ticketId: 99999
          });
          break;
        default:
          return res.status(400).json({ message: "Invalid webhook type" });
      }
      
      res.json({ message: "Test notification sent successfully" });
    } catch (error) {
      console.error("Error sending test Discord notification:", error);
      res.status(500).json({ message: "Failed to send test notification" });
    }
  });

  app.post("/api/affiliate/reset-password-sms", async (req, res) => {
    try {
      const { resetToken, newPassword } = req.body;
      
      if (!resetToken || !newPassword) {
        return res.status(400).json({ message: "Token e nova senha são obrigatórios" });
      }
      
      // Verify token
      let decoded: any;
      try {
        decoded = jwt.verify(resetToken, JWT_SECRET);
      } catch (err) {
        return res.status(400).json({ message: "Token inválido ou expirado" });
      }
      
      if (decoded.type !== 'affiliate_reset') {
        return res.status(400).json({ message: "Token inválido" });
      }
      
      // Find affiliate by phone
      const affiliateResult = await db.select()
        .from(affiliates)
        .where(eq(affiliates.phone, decoded.phone))
        .limit(1);
      
      if (!affiliateResult || affiliateResult.length === 0) {
        return res.status(400).json({ message: "Afiliado não encontrado" });
      }
      
      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Update password
      await db.update(affiliates)
        .set({ password: hashedPassword })
        .where(eq(affiliates.id, affiliateResult[0].id));
      
      res.json({ message: "Senha alterada com sucesso" });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Erro ao redefinir senha" });
    }
  });

  // Marketing Links Routes
  app.get("/api/admin/marketing-links", authenticateAdmin, async (req, res) => {
    try {
      const links = await storage.getMarketingLinks();
      const linksWithStats = await Promise.all(
        links.map(async (link) => {
          const stats = await storage.getMarketingLinkStats(link.id);
          return stats;
        })
      );
      res.json(linksWithStats);
    } catch (error) {
      console.error("Error getting marketing links:", error);
      res.status(500).json({ error: "Erro ao buscar links de marketing" });
    }
  });

  app.get("/api/admin/marketing-links/:id", authenticateAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const link = await storage.getMarketingLinkById(id);
      if (!link) {
        return res.status(404).json({ error: "Link não encontrado" });
      }
      const stats = await storage.getMarketingLinkStats(id);
      res.json(stats);
    } catch (error) {
      console.error("Error getting marketing link:", error);
      res.status(500).json({ error: "Erro ao buscar link de marketing" });
    }
  });

  app.post("/api/admin/marketing-links", authenticateAdmin, async (req, res) => {
    try {
      const { name, source, utmSource, utmMedium, utmCampaign, utmContent, description } = req.body;
      
      if (!name || !source) {
        return res.status(400).json({ error: "Nome e fonte são obrigatórios" });
      }
      
      const link = await storage.createMarketingLink({
        name,
        source,
        utmSource: utmSource || source,
        utmMedium: utmMedium || 'social',
        utmCampaign: utmCampaign || name.toLowerCase().replace(/\s+/g, '_'),
        utmContent,
        description,
        isActive: true
      });
      
      res.json(link);
    } catch (error) {
      console.error("Error creating marketing link:", error);
      res.status(500).json({ error: "Erro ao criar link de marketing" });
    }
  });

  app.put("/api/admin/marketing-links/:id", authenticateAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const updated = await storage.updateMarketingLink(id, updates);
      if (!updated) {
        return res.status(404).json({ error: "Link não encontrado" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating marketing link:", error);
      res.status(500).json({ error: "Erro ao atualizar link de marketing" });
    }
  });

  app.delete("/api/admin/marketing-links/:id", authenticateAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteMarketingLink(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting marketing link:", error);
      res.status(500).json({ error: "Erro ao excluir link de marketing" });
    }
  });

  // Referral configuration endpoints
  app.get("/api/admin/referral-config", authenticateAdmin, async (req, res) => {
    try {
      const config = await storage.getReferralConfig();
      res.json(config);
    } catch (error) {
      console.error("Error fetching referral config:", error);
      res.status(500).json({ message: "Erro ao buscar configuração de indicação" });
    }
  });

  app.post("/api/admin/referral-config", authenticateAdmin, async (req, res) => {
    try {
      const { paymentType, paymentAmount, isActive } = req.body;
      
      // Validate input
      if (!paymentType || !['first_deposit', 'all_deposits'].includes(paymentType)) {
        return res.status(400).json({ 
          message: "Tipo de pagamento inválido. Use 'first_deposit' ou 'all_deposits'" 
        });
      }
      
      if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
        return res.status(400).json({ 
          message: "Valor de pagamento deve ser maior que zero" 
        });
      }
      
      const config = await storage.updateReferralConfig({
        paymentType,
        paymentAmount: parseFloat(paymentAmount).toFixed(2),
        isActive: isActive !== undefined ? isActive : true
      });
      
      res.json({
        message: "Configuração de indicação atualizada com sucesso",
        config
      });
    } catch (error) {
      console.error("Error updating referral config:", error);
      res.status(500).json({ message: "Erro ao atualizar configuração de indicação" });
    }
  });
  
  // Get affiliate levels information
  app.get("/api/affiliate/levels", authenticateAffiliate, async (req: any, res) => {
    try {
      const affiliateId = req.affiliateId;
      const affiliate = req.affiliate;
      
      // Calculate approved earnings for level
      const totalEarnings = parseFloat(affiliate.totalEarnings || '0');
      const paidEarnings = parseFloat(affiliate.paidEarnings || '0');
      const approvedEarnings = totalEarnings + paidEarnings;
      
      // Define levels
      const levels = [
        { name: 'Bronze', min: 0, max: 5000, rate: 40, color: '#CD7F32' },
        { name: 'Prata', min: 5000, max: 20000, rate: 45, color: '#C0C0C0' },
        { name: 'Ouro', min: 20000, max: 50000, rate: 50, color: '#FFD700' },
        { name: 'Platina', min: 50000, max: 100000, rate: 60, color: '#E5E4E2' },
        { name: 'Diamante', min: 100000, max: null, rate: 70, color: '#B9F2FF' }
      ];
      
      // Find current level
      let currentLevel = levels[0];
      let nextLevel = levels[1];
      
      for (let i = 0; i < levels.length; i++) {
        const level = levels[i];
        if (level.max === null || approvedEarnings < level.max) {
          currentLevel = level;
          nextLevel = levels[i + 1] || null;
          break;
        }
      }
      
      // Calculate progress to next level
      let progress = 0;
      if (nextLevel) {
        const currentLevelRange = currentLevel.max - currentLevel.min;
        const earnedInLevel = approvedEarnings - currentLevel.min;
        progress = Math.min(100, (earnedInLevel / currentLevelRange) * 100);
      } else {
        progress = 100; // Max level reached
      }
      
      res.json({
        currentLevel: {
          ...currentLevel,
          earnings: approvedEarnings
        },
        nextLevel,
        progress,
        levels,
        totalEarnings: approvedEarnings,
        currentRate: parseFloat(affiliate.customCommissionRate || affiliate.currentLevelRate || '40')
      });
    } catch (error) {
      console.error("Error fetching levels:", error);
      res.status(500).json({ error: "Erro ao buscar níveis" });
    }
  });
  
  // Get affiliate profile information
  app.get("/api/affiliate/me", authenticateAffiliate, async (req: any, res) => {
    try {
      const affiliate = req.affiliate;
      
      // Remove password from response
      const { password, ...affiliateData } = affiliate;
      
      res.json({
        ...affiliateData,
        totalEarnings: parseFloat(affiliate.totalEarnings || '0'),
        pendingEarnings: parseFloat(affiliate.pendingEarnings || '0'),
        paidEarnings: parseFloat(affiliate.paidEarnings || '0'),
        commissionRate: parseFloat(affiliate.customCommissionRate || affiliate.currentLevelRate || '40')
      });
    } catch (error) {
      console.error("Error fetching affiliate info:", error);
      res.status(500).json({ error: "Erro ao buscar informações do afiliado" });
    }
  });
  
  // Get affiliate support chat (simplified route)
  app.get("/api/affiliate/support/chat", authenticateAffiliate, async (req: any, res) => {
    try {
      const affiliateId = req.affiliateId;
      
      // Get active support chat for affiliate
      const activeChat = await storage.getAffiliateActiveChat(affiliateId);
      
      if (!activeChat) {
        return res.json({ 
          chat: null,
          messages: []
        });
      }
      
      const messages = await storage.getAffiliateChatMessages(activeChat.id);
      
      // Map messages to match frontend expectations
      const mappedMessages = messages.map(msg => ({
        ...msg,
        sender: msg.senderType === 'affiliate' ? 'user' : msg.senderType
      }));
      
      res.json({ 
        chat: activeChat, 
        messages: mappedMessages 
      });
    } catch (error) {
      console.error("Error fetching chat:", error);
      res.status(500).json({ error: "Erro ao buscar chat" });
    }
  });

  // ===== DEMO ACCOUNT MANAGEMENT =====
  
  // Get demo account for affiliate
  app.get("/api/affiliate/demo-account", authenticateAffiliate, async (req: any, res) => {
    try {
      const affiliateId = req.affiliateId;
      
      // Get demo account if exists
      const demoAccount = await storage.getDemoAccountByAffiliateId(affiliateId);
      
      if (demoAccount) {
        // Get the real password (stored unhashed for demo purposes)
        // Note: Demo accounts are test accounts so we can show the password
        // This is not done for real user accounts
        // Extract randomId from email to recreate password
        const emailMatch = demoAccount.email.match(/demo_([a-z0-9]+)@demo\.com/);
        const randomId = emailMatch ? emailMatch[1] : '';
        const password = `Demo${randomId}2025`;
        
        const demoData = {
          id: demoAccount.id,
          name: demoAccount.name,
          email: demoAccount.email,
          password: password, // Recreated deterministic password
          phone: demoAccount.phone,
          balance: 0,
          bonusBalance: 0,
          createdAt: demoAccount.createdAt
        };
        
        // Get wallet to get balances
        const wallet = await storage.getWallet(demoAccount.id);
        if (wallet) {
          demoData.balance = parseFloat(wallet.balance || '0');
          demoData.bonusBalance = wallet.scratchBonus || 0;
        }
        
        res.json(demoData);
      } else {
        res.status(404).json({ error: "Conta demo não encontrada" });
      }
    } catch (error) {
      console.error("Error getting demo account:", error);
      res.status(500).json({ error: "Erro ao buscar conta demo" });
    }
  });
  
  // Create demo account
  app.post("/api/affiliate/demo-account", authenticateAffiliate, async (req: any, res) => {
    try {
      const affiliateId = req.affiliateId;
      const { name, balance, bonusBalance } = req.body;
      
      // Check if demo account already exists
      const existing = await storage.getDemoAccountByAffiliateId(affiliateId);
      if (existing) {
        return res.status(400).json({ error: "Você já possui uma conta demo" });
      }
      
      // Validate input
      if (!name || name.trim().length < 3) {
        return res.status(400).json({ error: "Nome deve ter pelo menos 3 caracteres" });
      }
      
      const safeBalance = parseFloat(balance) || 0;
      const safeScratchBonus = parseInt(bonusBalance) || 0; // Convert to integer for scratchBonus
      
      if (safeBalance < 0 || safeScratchBonus < 0) {
        return res.status(400).json({ error: "Saldos não podem ser negativos" });
      }
      
      // Create demo account
      const result = await storage.createDemoAccount(affiliateId, name, safeBalance, safeScratchBonus);
      
      res.json({
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        password: result.password, // Plain password for demo account
        phone: result.user.phone,
        balance: safeBalance,
        bonusBalance: safeScratchBonus,
        createdAt: result.user.createdAt
      });
    } catch (error) {
      console.error("Error creating demo account:", error);
      res.status(500).json({ error: "Erro ao criar conta demo" });
    }
  });
  
  // Update demo account
  app.put("/api/affiliate/demo-account", authenticateAffiliate, async (req: any, res) => {
    try {
      const affiliateId = req.affiliateId;
      const { name, balance, bonusBalance } = req.body;
      
      // Get demo account
      const demoAccount = await storage.getDemoAccountByAffiliateId(affiliateId);
      if (!demoAccount) {
        return res.status(404).json({ error: "Conta demo não encontrada" });
      }
      
      // Validate input
      if (!name || name.trim().length < 3) {
        return res.status(400).json({ error: "Nome deve ter pelo menos 3 caracteres" });
      }
      
      const safeBalance = parseFloat(balance) || 0;
      const safeScratchBonus = parseInt(bonusBalance) || 0; // Convert to integer for scratchBonus
      
      if (safeBalance < 0 || safeScratchBonus < 0) {
        return res.status(400).json({ error: "Saldos não podem ser negativos" });
      }
      
      // Update demo account
      await storage.updateDemoAccount(demoAccount.id, name, safeBalance, safeScratchBonus);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating demo account:", error);
      res.status(500).json({ error: "Erro ao atualizar conta demo" });
    }
  });
  
  // Delete demo account
  app.delete("/api/affiliate/demo-account", authenticateAffiliate, async (req: any, res) => {
    try {
      const affiliateId = req.affiliateId;
      
      // Get demo account
      const demoAccount = await storage.getDemoAccountByAffiliateId(affiliateId);
      if (!demoAccount) {
        return res.status(404).json({ error: "Conta demo não encontrada" });
      }
      
      // Delete demo account
      await storage.deleteDemoAccount(demoAccount.id);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting demo account:", error);
      res.status(500).json({ error: "Erro ao excluir conta demo" });
    }
  });

  // Track marketing link click
  app.get("/api/track/marketing/:shortCode", async (req, res) => {
    try {
      const { shortCode } = req.params;
      const link = await storage.getMarketingLinkByShortCode(shortCode);
      
      if (!link || !link.isActive) {
        return res.redirect("https://mania-brasil.com");
      }
      
      // Get visitor data
      const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'] || '';
      const referrer = req.headers['referer'] || '';
      
      // Detect device type
      const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent);
      const isTablet = /iPad|Tablet/i.test(userAgent);
      const deviceType = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop';
      
      // Track the click
      await storage.trackMarketingClick(link.id, {
        ip,
        userAgent,
        referrer,
        deviceType,
        os: userAgent.includes('Windows') ? 'Windows' : 
            userAgent.includes('Mac') ? 'macOS' : 
            userAgent.includes('Linux') ? 'Linux' : 
            userAgent.includes('Android') ? 'Android' : 
            userAgent.includes('iOS') ? 'iOS' : 'Other',
        browser: userAgent.includes('Chrome') ? 'Chrome' :
                 userAgent.includes('Firefox') ? 'Firefox' :
                 userAgent.includes('Safari') ? 'Safari' :
                 userAgent.includes('Edge') ? 'Edge' : 'Other'
      });
      
      // Set cookie to track conversion
      res.cookie('marketing_src', shortCode, { 
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        httpOnly: true 
      });
      
      // Redirect to the site with UTM parameters
      res.redirect(link.url);
    } catch (error) {
      console.error("Error tracking marketing link:", error);
      res.redirect("https://mania-brasil.com");
    }
  });

  // Track marketing conversion on registration
  app.post("/api/track/marketing-conversion", async (req, res) => {
    try {
      const { userId, shortCode } = req.body;
      
      if (!userId || !shortCode) {
        return res.status(400).json({ error: "Dados incompletos" });
      }
      
      const link = await storage.getMarketingLinkByShortCode(shortCode);
      if (link) {
        await storage.trackMarketingConversion(link.id, userId);
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking marketing conversion:", error);
      res.status(500).json({ error: "Erro ao rastrear conversão" });
    }
  });

  // =============================================
  // PARTNER (SUB-AFFILIATE) AUTHENTICATION ROUTES
  // =============================================
  
  // Middleware to authenticate partner
  const authenticatePartner = async (req: any, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Token não fornecido" });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      // Verify it's a partner token
      if (!decoded.partnerId) {
        return res.status(401).json({ error: "Token inválido" });
      }
      
      // Verify partner exists and is active
      const [partner] = await db.select()
        .from(partners)
        .where(eq(partners.id, decoded.partnerId))
        .limit(1);
      
      if (!partner || !partner.isActive) {
        return res.status(403).json({ error: "Acesso negado" });
      }
      
      req.partnerId = decoded.partnerId;
      req.affiliateId = decoded.affiliateId;
      req.partner = partner;
      next();
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: "Token expirado" });
      }
      return res.status(401).json({ error: "Token inválido" });
    }
  };
  
  // Partner Login
  app.post("/api/partner/auth/login", loginLimiter, async (req, res) => {
    try {
      const { email, password, rememberMe } = req.body;
      
      // Find partner by email
      const [partner] = await db.select()
        .from(partners)
        .where(eq(partners.email, email))
        .limit(1);
      
      if (!partner) {
        return res.status(401).json({ error: "Email ou senha inválidos" });
      }
      
      // Check if partner is active
      if (!partner.isActive) {
        return res.status(403).json({ 
          error: "Conta bloqueada", 
          reason: partner.blockedReason || "Entre em contato com o suporte" 
        });
      }
      
      // Verify password
      const validPassword = await bcrypt.compare(password, partner.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Email ou senha inválidos" });
      }
      
      // Generate JWT token
      const token = jwt.sign(
        { 
          partnerId: partner.id, 
          email: partner.email,
          affiliateId: partner.affiliateId 
        },
        JWT_SECRET,
        { expiresIn: "7d" }
      );
      
      // Generate remember token if requested
      let rememberToken = null;
      if (rememberMe) {
        rememberToken = crypto.randomBytes(32).toString('hex');
        await db.update(partners)
          .set({ rememberToken })
          .where(eq(partners.id, partner.id));
      }
      
      res.json({
        success: true,
        token,
        rememberToken,
        partner: {
          id: partner.id,
          name: partner.name,
          email: partner.email,
          affiliateId: partner.affiliateId,
          avatar: partner.avatar
        }
      });
    } catch (error) {
      console.error("Partner login error:", error);
      res.status(500).json({ error: "Erro ao fazer login" });
    }
  });
  
  // Partner Register
  app.post("/api/partner/auth/register", createAccountLimiter, async (req, res) => {
    try {
      const { name, email, phone, password, inviteCode } = req.body;
      
      // Validate invite code format (2 numbers + 4 letters)
      if (!inviteCode || !/^[0-9]{2}[A-Z]{4}$/i.test(inviteCode)) {
        return res.status(400).json({ error: "Código de convite inválido. Deve ter 2 números e 4 letras." });
      }
      
      // Check if email already exists
      const [existingPartner] = await db.select()
        .from(partners)
        .where(eq(partners.email, email))
        .limit(1);
      
      if (existingPartner) {
        return res.status(400).json({ error: "Email já cadastrado" });
      }
      
      // Find affiliate by partner invite code
      const [affiliate] = await db.select()
        .from(affiliates)
        .where(eq(affiliates.partnerInviteCode, inviteCode.toUpperCase()))
        .limit(1);
      
      if (!affiliate) {
        return res.status(400).json({ error: "Código de convite não encontrado" });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Generate unique partner code (similar format to invite code)
      const partnerCode = `P${Math.floor(10 + Math.random() * 90)}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      
      // Create partner with affiliate's commission type
      const [newPartner] = await db.insert(partners)
        .values({
          affiliateId: affiliate.id,
          name,
          email,
          phone,
          password: hashedPassword,
          code: partnerCode,
          commissionType: affiliate.commissionType,
          // Partner gets a lower commission rate than the affiliate
          commissionRate: affiliate.commissionType === "percentage" 
            ? String(Math.min(5, parseFloat(affiliate.commissionRate || "5") / 2))
            : "5.00",
          fixedCommissionAmount: affiliate.commissionType === "fixed"
            ? String(Math.min(3, parseFloat(affiliate.fixedCommissionAmount || "3") / 2))
            : "3.00"
        })
        .returning();
      
      // Create wallet for partner
      await db.insert(partnersWallet)
        .values({
          partnerId: newPartner.id,
          balance: "0.00",
          totalEarned: "0.00",
          totalWithdrawn: "0.00"
        });
      
      res.json({
        success: true,
        message: "Conta de parceiro criada com sucesso",
        code: partnerCode
      });
    } catch (error) {
      console.error("Partner registration error:", error);
      res.status(500).json({ error: "Erro ao criar conta de parceiro" });
    }
  });
  
  // Partner Remember Token Login
  app.post("/api/partner/auth/remember", async (req, res) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ error: "Token não fornecido" });
      }
      
      // Find partner by remember token
      const [partner] = await db.select()
        .from(partners)
        .where(eq(partners.rememberToken, token))
        .limit(1);
      
      if (!partner || !partner.isActive) {
        return res.status(401).json({ error: "Token inválido ou expirado" });
      }
      
      // Generate new JWT token
      const jwtToken = jwt.sign(
        { 
          partnerId: partner.id, 
          email: partner.email,
          affiliateId: partner.affiliateId 
        },
        JWT_SECRET,
        { expiresIn: "7d" }
      );
      
      // Generate new remember token
      const newRememberToken = crypto.randomBytes(32).toString('hex');
      await db.update(partners)
        .set({ rememberToken: newRememberToken })
        .where(eq(partners.id, partner.id));
      
      res.json({
        success: true,
        token: jwtToken,
        rememberToken: newRememberToken,
        partner: {
          id: partner.id,
          name: partner.name,
          email: partner.email,
          affiliateId: partner.affiliateId,
          avatar: partner.avatar
        }
      });
    } catch (error) {
      console.error("Partner remember login error:", error);
      res.status(500).json({ error: "Erro ao fazer login automático" });
    }
  });
  
  // Partner Logout
  app.post("/api/partner/auth/logout", authenticatePartner, async (req, res) => {
    try {
      const partnerId = (req as any).partnerId;
      
      // Clear remember token
      await db.update(partners)
        .set({ rememberToken: null })
        .where(eq(partners.id, partnerId));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Partner logout error:", error);
      res.status(500).json({ error: "Erro ao fazer logout" });
    }
  });

  // ===== PARTNER DEMO ACCOUNT MANAGEMENT =====
  
  // Get demo account for partner
  app.get("/api/partner/demo-account", authenticatePartner, async (req: any, res) => {
    try {
      const partnerId = req.partnerId;
      
      // Get demo account if exists - using partnerId instead of affiliateId
      const demoAccount = await storage.getDemoAccountByPartnerId(partnerId);
      
      if (demoAccount) {
        // Get the real password (stored unhashed for demo purposes)
        // Note: Demo accounts are test accounts so we can show the password
        // This is not done for real user accounts
        // Extract randomId from email to recreate password
        const emailMatch = demoAccount.email.match(/demo_([a-z0-9]+)@demo\.com/);
        const randomId = emailMatch ? emailMatch[1] : '';
        const password = `Demo${randomId}2025`;
        
        const demoData = {
          id: demoAccount.id,
          name: demoAccount.name,
          email: demoAccount.email,
          password: password, // Recreated deterministic password
          phone: demoAccount.phone,
          balance: 0,
          bonusBalance: 0,
          createdAt: demoAccount.createdAt
        };
        
        // Get wallet to get balances
        const wallet = await storage.getWallet(demoAccount.id);
        if (wallet) {
          demoData.balance = parseFloat(wallet.balance || '0');
          demoData.bonusBalance = wallet.scratchBonus || 0;
        }
        
        res.json(demoData);
      } else {
        res.status(404).json({ error: "Conta demo não encontrada" });
      }
    } catch (error) {
      console.error("Error getting partner demo account:", error);
      res.status(500).json({ error: "Erro ao buscar conta demo" });
    }
  });
  
  // Create demo account for partner
  app.post("/api/partner/demo-account", authenticatePartner, async (req: any, res) => {
    try {
      const partnerId = req.partnerId;
      const { name, balance, bonusBalance } = req.body;
      
      // Check if demo account already exists
      const existing = await storage.getDemoAccountByPartnerId(partnerId);
      if (existing) {
        return res.status(400).json({ error: "Você já possui uma conta demo" });
      }
      
      // Validate input
      if (!name || name.trim().length < 3) {
        return res.status(400).json({ error: "Nome deve ter pelo menos 3 caracteres" });
      }
      
      const safeBalance = parseFloat(balance) || 0;
      const safeScratchBonus = parseInt(bonusBalance) || 0; // Convert to integer for scratchBonus
      
      if (safeBalance < 0 || safeScratchBonus < 0) {
        return res.status(400).json({ error: "Saldos não podem ser negativos" });
      }
      
      // Create demo account for partner
      const result = await storage.createPartnerDemoAccount(partnerId, name, safeBalance, safeScratchBonus);
      
      res.json({
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        password: result.password, // Plain password for demo account
        phone: result.user.phone,
        balance: safeBalance,
        bonusBalance: safeScratchBonus,
        createdAt: result.user.createdAt
      });
    } catch (error) {
      console.error("Error creating partner demo account:", error);
      res.status(500).json({ error: "Erro ao criar conta demo" });
    }
  });
  
  // Update demo account for partner
  app.put("/api/partner/demo-account", authenticatePartner, async (req: any, res) => {
    try {
      const partnerId = req.partnerId;
      const { name, balance, bonusBalance } = req.body;
      
      // Get demo account
      const demoAccount = await storage.getDemoAccountByPartnerId(partnerId);
      if (!demoAccount) {
        return res.status(404).json({ error: "Conta demo não encontrada" });
      }
      
      // Validate input
      if (!name || name.trim().length < 3) {
        return res.status(400).json({ error: "Nome deve ter pelo menos 3 caracteres" });
      }
      
      const safeBalance = parseFloat(balance) || 0;
      const safeScratchBonus = parseInt(bonusBalance) || 0; // Convert to integer for scratchBonus
      
      if (safeBalance < 0 || safeScratchBonus < 0) {
        return res.status(400).json({ error: "Saldos não podem ser negativos" });
      }
      
      // Update demo account
      await storage.updateDemoAccount(demoAccount.id, name, safeBalance, safeScratchBonus);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating partner demo account:", error);
      res.status(500).json({ error: "Erro ao atualizar conta demo" });
    }
  });
  
  // Delete demo account for partner
  app.delete("/api/partner/demo-account", authenticatePartner, async (req: any, res) => {
    try {
      const partnerId = req.partnerId;
      
      // Get demo account
      const demoAccount = await storage.getDemoAccountByPartnerId(partnerId);
      if (!demoAccount) {
        return res.status(404).json({ error: "Conta demo não encontrada" });
      }
      
      // Delete demo account
      await storage.deleteDemoAccount(demoAccount.id);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting partner demo account:", error);
      res.status(500).json({ error: "Erro ao excluir conta demo" });
    }
  });
  
  // Partner Dashboard
  // Get partner info
  app.get("/api/partner/info", authenticatePartner, async (req: any, res) => {
    try {
      const partnerId = req.partnerId;
      
      // Get partner data from database
      const [partner] = await db.select().from(partners).where(eq(partners.id, partnerId));
      if (!partner) {
        return res.status(404).json({ error: "Parceiro não encontrado" });
      }
      
      // Return partner info with commission details
      res.json({
        id: partner.id,
        name: partner.name,
        email: partner.email,
        phone: partner.phone || '',
        pixKeyType: partner.pixKeyType || 'cpf',
        pixKey: partner.pixKey || '',
        affiliateId: partner.affiliateId,
        commissionType: partner.commissionType || 'percentage',
        commissionRate: partner.commissionRate,
        fixedCommissionAmount: partner.fixedCommissionAmount,
        createdAt: partner.createdAt
      });
    } catch (error) {
      console.error("Error fetching partner info:", error);
      res.status(500).json({ error: "Erro ao buscar informações do parceiro" });
    }
  });

  // Get partner settings (alias for partner/info used by withdrawals page)
  app.get("/api/partner/settings", authenticatePartner, async (req: any, res) => {
    try {
      const partnerId = req.partnerId;
      
      // Get partner data from database
      const [partner] = await db.select().from(partners).where(eq(partners.id, partnerId));
      if (!partner) {
        return res.status(404).json({ error: "Parceiro não encontrado" });
      }
      
      // Return partner settings
      res.json({
        name: partner.name,
        email: partner.email,
        phone: partner.phone || '',
        pixKeyType: partner.pixKeyType || 'cpf',
        pixKey: partner.pixKey || ''
      });
    } catch (error) {
      console.error("Error fetching partner settings:", error);
      res.status(500).json({ error: "Erro ao buscar configurações do parceiro" });
    }
  });

  // Get partner earnings
  app.get("/api/partner/earnings", authenticatePartner, async (req: any, res) => {
    try {
      const partnerId = req.partnerId;
      
      // Get partner data
      const [partner] = await db.select().from(partners).where(eq(partners.id, partnerId));
      if (!partner) {
        return res.status(404).json({ error: "Parceiro não encontrado" });
      }
      
      // Get conversions with user data
      const conversions = await db
        .select({
          id: partnerConversions.id,
          partnerId: partnerConversions.partnerId,
          affiliateId: partnerConversions.affiliateId,
          userId: partnerConversions.userId,
          conversionType: partnerConversions.conversionType,
          conversionValue: partnerConversions.conversionValue,
          partnerCommission: partnerConversions.partnerCommission,
          commissionRate: partnerConversions.commissionRate,
          status: partnerConversions.status,
          createdAt: partnerConversions.createdAt,
          userName: users.name,
          userEmail: users.email
        })
        .from(partnerConversions)
        .leftJoin(users, eq(partnerConversions.userId, users.id))
        .where(eq(partnerConversions.partnerId, partnerId))
        .orderBy(desc(partnerConversions.createdAt));
      
      // Calculate totals
      const totalEarnings = conversions
        .filter(c => c.status !== 'cancelled') // Exclude cancelled from total
        .reduce((sum, c) => sum + parseFloat(c.partnerCommission || '0'), 0);
      const pendingEarnings = conversions
        .filter(c => c.status === 'pending')
        .reduce((sum, c) => sum + parseFloat(c.partnerCommission || '0'), 0);
      const completedEarnings = conversions
        .filter(c => c.status === 'approved' || c.status === 'completed')
        .reduce((sum, c) => sum + parseFloat(c.partnerCommission || '0'), 0);
      const cancelledEarnings = conversions
        .filter(c => c.status === 'cancelled')
        .reduce((sum, c) => sum + parseFloat(c.partnerCommission || '0'), 0);
      
      // Get wallet balance
      const [wallet] = await db
        .select()
        .from(partnersWallet)
        .where(eq(partnersWallet.partnerId, partnerId));
      
      const availableBalance = wallet ? parseFloat(wallet.balance || '0') : 0;
      const totalWithdrawn = wallet ? parseFloat(wallet.totalWithdrawn || '0') : 0;
      
      // Format transactions for frontend
      const transactions = conversions.map(c => {
        // Deduce commission type from stored values
        // If commissionRate exists and is not 0, it was percentage
        // If commissionRate is null or 0 but partnerCommission exists, it was fixed
        const storedRate = parseFloat(c.commissionRate || '0');
        const storedCommission = parseFloat(c.partnerCommission || '0');
        
        let commissionType = 'percentage';
        if (storedRate === 0 && storedCommission > 0) {
          // No rate but has commission value = fixed commission
          commissionType = 'fixed';
        } else if (storedRate > 0) {
          // Has rate = percentage commission
          commissionType = 'percentage';
        }
        
        return {
          id: c.id,
          userId: c.userId,
          userName: c.userName,
          userEmail: c.userEmail,
          conversionType: c.conversionType,
          conversionValue: parseFloat(c.conversionValue || '0').toFixed(2),
          commission: storedCommission.toFixed(2),
          commissionRate: c.commissionRate,
          commissionType: commissionType,
          status: c.status || 'pending',
          createdAt: c.createdAt
        };
      });
      
      res.json({
        totalEarnings: totalEarnings.toFixed(2),
        pendingEarnings: pendingEarnings.toFixed(2),
        completedEarnings: completedEarnings.toFixed(2),
        cancelledEarnings: cancelledEarnings.toFixed(2),
        approvedEarnings: completedEarnings.toFixed(2), // For backward compatibility
        availableBalance: availableBalance.toFixed(2),
        totalWithdrawn: totalWithdrawn.toFixed(2),
        // Include wallet object for sidebar and withdrawal page
        wallet: {
          balance: availableBalance,
          pendingBalance: pendingEarnings,
          totalEarned: completedEarnings,
          totalWithdrawn: totalWithdrawn
        },
        transactions
      });
    } catch (error) {
      console.error("Error fetching partner earnings:", error);
      res.status(500).json({ error: "Erro ao buscar ganhos do parceiro" });
    }
  });

  // Get partner dashboard stats
  app.get("/api/partner/dashboard-stats", authenticatePartner, async (req: any, res) => {
    try {
      const partnerId = req.partnerId;
      
      // Get partner info with stats
      const [partner] = await db
        .select()
        .from(partners)
        .where(eq(partners.id, partnerId));
      
      // Get conversions for the partner
      const conversions = await db
        .select()
        .from(partnerConversions)
        .where(eq(partnerConversions.partnerId, partnerId));
      
      // Calculate total clicks (partners track clicks differently than affiliates)
      const totalClicks = partner?.totalClicks || 0;
      
      // Get registrations (using partner's code)
      let registrations: any[] = [];
      if (partner?.code) {
        registrations = await db
          .select()
          .from(users)
          .where(eq(users.referredBy, partner.code));
      }
      
      const totalRegistrations = registrations.length;
      
      // Get deposits count
      let depositsQuery: any[] = [];
      if (partner?.code) {
        depositsQuery = await db
          .select()
          .from(deposits)
          .innerJoin(users, eq(deposits.userId, users.id))
          .where(
            and(
              eq(users.referredBy, partner.code),
              eq(deposits.status, 'completed')
            )
          );
      }
      
      const totalDeposits = depositsQuery.length;
      
      // Calculate conversion rates
      const conversionRate = totalClicks > 0 ? ((totalRegistrations / totalClicks) * 100).toFixed(1) : '0.0';
      const depositRate = totalRegistrations > 0 ? ((totalDeposits / totalRegistrations) * 100).toFixed(1) : '0.0';
      
      // Get recent activity
      const recentActivity = conversions
        .slice(0, 5)
        .map(c => ({
          type: c.status === 'approved' || c.status === 'completed' ? 'commission' : 'pending',
          description: `Comissão ${c.status === 'approved' || c.status === 'completed' ? 'aprovada' : 'pendente'}`,
          amount: formatBRL(parseFloat(c.partnerCommission || '0')),
          timestamp: new Date(c.createdAt || '').toISOString()
        }));
      
      res.json({
        totalClicks,
        totalRegistrations,
        totalDeposits,
        recentActivity,
        conversionRate,
        depositRate
      });
    } catch (error) {
      console.error("Error fetching partner dashboard stats:", error);
      res.status(500).json({ error: "Erro ao buscar estatísticas do parceiro" });
    }
  });

  app.get("/api/partner/dashboard", authenticatePartner, async (req, res) => {
    try {
      const partnerId = (req as any).partnerId;
      
      // Get partner data
      const [partner] = await db.select()
        .from(partners)
        .where(eq(partners.id, partnerId))
        .limit(1);
      
      if (!partner) {
        return res.status(404).json({ error: "Parceiro não encontrado" });
      }
      
      // Get recent conversions
      const recentConversions = await db.select()
        .from(partnerConversions)
        .where(eq(partnerConversions.partnerId, partnerId))
        .orderBy(desc(partnerConversions.createdAt))
        .limit(10);
      
      // Calculate conversion rate
      const conversionRate = partner.totalClicks > 0
        ? ((partner.totalRegistrations / partner.totalClicks) * 100).toFixed(2)
        : "0.00";
      
      res.json({
        totalEarnings: partner.totalEarnings,
        pendingEarnings: partner.pendingEarnings,
        approvedEarnings: partner.approvedEarnings,
        totalClicks: partner.totalClicks,
        totalRegistrations: partner.totalRegistrations,
        totalDeposits: partner.totalDeposits,
        conversionRate,
        recentConversions
      });
    } catch (error) {
      console.error("Partner dashboard error:", error);
      res.status(500).json({ error: "Erro ao carregar dashboard" });
    }
  });

  // Partner performance data - Last 7 days (weekly)
  app.get("/api/partner/performance", authenticatePartner, async (req: any, res) => {
    try {
      const partnerId = req.partnerId;
      
      // Get performance data for the last 7 days
      const now = new Date();
      
      const weeklyData = [];
      const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      
      for (let i = 6; i >= 0; i--) {
        const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);
        
        // Get conversions for this day
        const dayConversions = await db
          .select()
          .from(partnerConversions)
          .where(
            and(
              eq(partnerConversions.partnerId, partnerId),
              gte(partnerConversions.createdAt, dayStart),
              lt(partnerConversions.createdAt, dayEnd)
            )
          );
        
        const approved = dayConversions.filter(c => c.status === 'approved' || c.status === 'completed').length;
        const pending = dayConversions.filter(c => c.status === 'pending').length;
        const cancelled = dayConversions.filter(c => c.status === 'cancelled').length;
        const revenue = dayConversions
          .filter(c => c.status === 'approved' || c.status === 'completed')
          .reduce((sum, c) => sum + parseFloat(c.partnerCommission || '0'), 0);
        
        weeklyData.push({
          name: dayNames[dayStart.getDay()],
          approved,
          pending,
          cancelled,
          revenue
        });
      }
      
      res.json({ monthly: weeklyData });
    } catch (error) {
      console.error("Partner performance error:", error);
      res.status(500).json({ error: "Erro ao buscar dados de performance" });
    }
  });

  // Partner Settings Routes
  app.put("/api/partner/settings/personal", authenticatePartner, async (req, res) => {
    try {
      const partnerId = (req as any).partnerId;
      const { name, email, phone } = req.body;
      
      // Update partner personal info
      await db.update(partners)
        .set({ 
          name,
          email,
          phone,
          updatedAt: new Date()
        })
        .where(eq(partners.id, partnerId));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Update partner personal info error:", error);
      res.status(500).json({ error: "Erro ao atualizar informações" });
    }
  });
  
  app.put("/api/partner/settings/password", authenticatePartner, async (req, res) => {
    try {
      const partnerId = (req as any).partnerId;
      const { currentPassword, newPassword } = req.body;
      
      // Get current partner to verify password
      const [partner] = await db.select()
        .from(partners)
        .where(eq(partners.id, partnerId))
        .limit(1);
      
      if (!partner) {
        return res.status(404).json({ error: "Parceiro não encontrado" });
      }
      
      // Verify current password
      const validPassword = await bcrypt.compare(currentPassword, partner.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Senha atual incorreta" });
      }
      
      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Update password
      await db.update(partners)
        .set({ 
          password: hashedPassword,
          updatedAt: new Date()
        })
        .where(eq(partners.id, partnerId));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Update partner password error:", error);
      res.status(500).json({ error: "Erro ao alterar senha" });
    }
  });
  
  app.put("/api/partner/settings/pix", authenticatePartner, async (req, res) => {
    try {
      const partnerId = (req as any).partnerId;
      const { pixKey, pixKeyType } = req.body;
      
      // Update PIX key
      await db.update(partners)
        .set({ 
          pixKey,
          pixKeyType,
          updatedAt: new Date()
        })
        .where(eq(partners.id, partnerId));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Update partner PIX key error:", error);
      res.status(500).json({ error: "Erro ao atualizar chave PIX" });
    }
  });

  // Delete partner PIX key
  app.delete("/api/partner/settings/pix", authenticatePartner, async (req, res) => {
    try {
      const partnerId = (req as any).partnerId;
      
      // Remove PIX key
      await db.update(partners)
        .set({ 
          pixKey: null,
          pixKeyType: null,
          updatedAt: new Date()
        })
        .where(eq(partners.id, partnerId));
      
      res.json({ success: true, message: "Chave PIX removida com sucesso" });
    } catch (error) {
      console.error("Delete partner PIX key error:", error);
      res.status(500).json({ error: "Erro ao remover chave PIX" });
    }
  });

  // Partner Network Route - shows partners' referred users (IDENTICAL TO AFFILIATE)
  app.get("/api/partner/network", authenticatePartner, async (req, res) => {
    try {
      const partnerId = (req as any).partnerId;
      
      console.log(`[Partner Network] Request for partner ID: ${partnerId}`);
      
      // Get partner info
      const [partner] = await db.select()
        .from(partners)
        .where(eq(partners.id, partnerId))
        .limit(1);
      
      if (!partner || !partner.code) {
        console.log(`[Partner Network] Partner not found or no code for ID: ${partnerId}`);
        return res.json({
          directReferrals: 0,
          todayNew: 0,
          recentReferrals: []
        });
      }
      
      // Get users referred by this partner (via partnerId field)
      const referredUsers = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        referredBy: users.referredBy,
        partnerId: users.partnerId
      })
      .from(users)
      .where(eq(users.partnerId, partnerId))  // Look for users with this partnerId
      .orderBy(desc(users.createdAt));
      
      console.log(`[Partner Network] Found ${referredUsers.length} users for partner ID ${partnerId}`);
      
      // Calculate today's new registrations
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayNew = referredUsers.filter((user: any) => 
        new Date(user.createdAt) >= startOfToday
      ).length;
      
      // Get commission data for each user (SAME STRUCTURE AS AFFILIATE)
      const recentReferrals = await Promise.all(
        referredUsers.map(async (user: any) => {
          // Get partner conversions for this user
          const conversions = await db.select()
            .from(partnerConversions)
            .where(and(
              eq(partnerConversions.partnerId, partnerId),
              eq(partnerConversions.userId, user.id)
            ));
          
          console.log(`[Partner Network] User ${user.id} has ${conversions.length} conversions`);
          
          // Calculate totals from conversions
          let totalCompleted = 0;
          let totalPending = 0;
          let totalCancelled = 0;
          let completedCommission = 0;
          let pendingCommission = 0;
          let cancelledCommission = 0;
          let completedCount = 0;
          let pendingCount = 0;
          let cancelledCount = 0;
          
          conversions.forEach((conv: any) => {
            const depositAmount = parseFloat(conv.conversionValue || '0');
            const partnerComm = parseFloat(conv.partnerCommission || '0');
            
            if (conv.status === 'completed' || conv.status === 'approved') {
              totalCompleted += depositAmount;
              completedCommission += partnerComm;
              completedCount++;
            } else if (conv.status === 'pending') {
              totalPending += depositAmount;
              pendingCommission += partnerComm;
              pendingCount++;
            } else if (conv.status === 'cancelled' || conv.status === 'expired') {
              totalCancelled += depositAmount;
              cancelledCommission += partnerComm;
              cancelledCount++;
            }
          });
          
          // Debug log
          if (conversions.length > 0) {
            console.log(`User ${user.id} has ${conversions.length} conversions:`, {
              completedCommission,
              pendingCommission,
              cancelledCommission
            });
          }
          
          return {
            id: user.id,
            name: user.name || "Usuário",
            email: user.email || '',
            phone: user.phone || '',
            cpf: user.cpf || '',
            date: user.createdAt,
            totalDeposits: totalCompleted,
            pendingDeposits: totalPending,
            cancelledDeposits: totalCancelled,
            completedCount,
            pendingCount,
            cancelledCount,
            completedCommission,
            pendingCommission,
            cancelledCommission,
            commission: completedCommission + pendingCommission + cancelledCommission,
            code: user.referredBy || partner.code  // Use the code the user registered with
          };
        })
      );
      
      res.json({
        directReferrals: referredUsers.length,
        todayNew,
        recentReferrals
      });
    } catch (error) {
      console.error("Get partner network error:", error);
      res.status(500).json({ error: "Erro ao buscar rede" });
    }
  });
  
  // ===== PARTNER CODES MANAGEMENT =====
  
  // NOTE: Old GET route removed - using the proper implementation below that uses partner_codes table
  
  // NOTE: Old duplicate routes removed - using the proper implementation below that saves to partner_codes table
  
  // Partner Codes Route - Get partner's codes (EXACT same structure as affiliate codes)
  app.get("/api/partner/codes", authenticatePartner, async (req, res) => {
    try {
      const partnerId = (req as any).partnerId;
      
      // Get partner codes with stats (EXACT same structure as affiliate codes)
      const codes = await db
        .select({
          id: partnerCodes.id,
          code: partnerCodes.code,
          name: partnerCodes.name,
          createdAt: partnerCodes.createdAt,
          clickCount: partnerCodes.clickCount,
          registrationCount: partnerCodes.registrationCount,
          depositCount: partnerCodes.depositCount,
        })
        .from(partnerCodes)
        .where(eq(partnerCodes.partnerId, partnerId))
        .orderBy(desc(partnerCodes.createdAt));
      
      // Get partner commission percentage
      const [partner] = await db.select()
        .from(partners)
        .where(eq(partners.id, partnerId))
        .limit(1);
      
      const partnerCommissionRate = partner?.commissionPercent || 10;
      
      // For each code, calculate additional stats
      const enrichedCodes = await Promise.all(codes.map(async (code) => {
        // Get total registrations for this code
        const registeredUsers = await db.select()
          .from(users)
          .where(eq(users.referredBy, code.code));
        
        const totalRegistrations = registeredUsers.length;
        
        // Get deposits for users referred by this code
        let completedDeposits = 0;
        let pendingDeposits = 0;
        let depositAmount = 0;
        let completedCommission = 0;
        let pendingCommission = 0;
        let cancelledCommission = 0;
        
        if (registeredUsers.length > 0) {
          const userIds = registeredUsers.map(u => u.id);
          const depositsData = await db.select()
            .from(deposits)
            .where(inArray(deposits.userId, userIds));
          
          // Calculate commissions based on deposit status
          for (const deposit of depositsData) {
            const depositValue = parseFloat(deposit.amount);
            const commission = (depositValue * partnerCommissionRate) / 100;
            
            if (deposit.status === 'completed') {
              completedDeposits++;
              depositAmount += depositValue;
              completedCommission += commission;
            } else if (deposit.status === 'pending') {
              pendingDeposits++;
              pendingCommission += commission;
            } else if (deposit.status === 'failed' || deposit.status === 'cancelled') {
              cancelledCommission += commission;
            }
          }
        }
        
        return {
          id: code.id,
          code: code.code,
          name: code.name || code.code,
          createdAt: code.createdAt,
          clickCount: code.clickCount || 0,
          totalRegistrations,
          completedDeposits,
          pendingDeposits,
          depositAmount: depositAmount.toFixed(2),
          completedCommission: parseFloat(completedCommission.toFixed(2)),
          pendingCommission: parseFloat(pendingCommission.toFixed(2)),
          cancelledCommission: parseFloat(cancelledCommission.toFixed(2)),
          conversionRate: code.clickCount > 0 
            ? ((totalRegistrations / code.clickCount) * 100).toFixed(1) 
            : "0.0"
        };
      }));
      
      res.json(enrichedCodes);
    } catch (error) {
      console.error("Get partner codes error:", error);
      res.status(500).json({ error: "Erro ao buscar códigos" });
    }
  });
  
  // Create partner code (EXACT same as affiliate codes)
  app.post("/api/partner/codes", authenticatePartner, async (req, res) => {
    try {
      const partnerId = (req as any).partnerId;
      const { name, code } = req.body;
      
      console.log("Creating partner code - Partner ID:", partnerId, "Code:", code, "Name:", name);
      
      if (!partnerId) {
        return res.status(401).json({ error: "Partner não autenticado" });
      }
      
      if (!code) {
        return res.status(400).json({ error: "Código é obrigatório" });
      }
      
      // Validate code format
      if (!/^[A-Z0-9]{3,20}$/i.test(code)) {
        return res.status(400).json({ error: "Código deve conter apenas letras e números (3-20 caracteres)" });
      }
      
      const upperCode = code.toUpperCase();
      
      // Check if code starts with AFF (reserved for affiliates)
      if (upperCode.startsWith('AFF')) {
        return res.status(400).json({ error: "Códigos iniciados com 'AFF' são exclusivos para clientes!" });
      }
      
      // Check if code already exists in any table
      const existingAffiliate = await db.select()
        .from(affiliateCodes)
        .where(eq(affiliateCodes.code, upperCode))
        .limit(1);
      
      const existingPartner = await db.select()
        .from(partnerCodes)
        .where(eq(partnerCodes.code, upperCode))
        .limit(1);
      
      if (existingAffiliate.length > 0 || existingPartner.length > 0) {
        return res.status(400).json({ error: "Este código já está em uso" });
      }
      
      // Create new code in partner_codes table
      console.log("Inserting code into database...");
      const [newCode] = await db.insert(partnerCodes).values({
        partnerId: partnerId,
        code: upperCode,
        name: name || upperCode,
        isActive: true,
        clickCount: 0,
        registrationCount: 0,
        depositCount: 0,
        createdAt: new Date()
      }).returning();
      
      console.log("Code created successfully:", newCode);
      
      res.json({
        success: true,
        code: {
          id: newCode.id,
          code: newCode.code,
          name: newCode.name || newCode.code,
          createdAt: newCode.createdAt,
          clickCount: 0,
          totalRegistrations: 0,
          completedDeposits: 0,
          pendingDeposits: 0,
          depositAmount: "0.00",
          conversionRate: "0.0"
        }
      });
    } catch (error) {
      console.error("Create partner code error:", error);
      res.status(500).json({ error: "Erro ao criar código" });
    }
  });
  
  // Delete partner code (EXACT same as affiliate codes)
  app.delete("/api/partner/codes/:codeId", authenticatePartner, async (req, res) => {
    try {
      const partnerId = (req as any).partnerId;
      const codeId = parseInt(req.params.codeId);
      
      // Verify code belongs to partner
      const [existingCode] = await db.select()
        .from(partnerCodes)
        .where(and(
          eq(partnerCodes.id, codeId),
          eq(partnerCodes.partnerId, partnerId)
        ))
        .limit(1);
      
      if (!existingCode) {
        return res.status(404).json({ error: "Código não encontrado" });
      }
      
      // Check if code has registrations
      const [hasUsers] = await db.select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.referredBy, existingCode.code));
      
      if (hasUsers && hasUsers.count > 0) {
        return res.status(400).json({ 
          error: "Não é possível deletar código com cadastros registrados" 
        });
      }
      
      // Delete code
      await db.delete(partnerCodes)
        .where(eq(partnerCodes.id, codeId));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Delete partner code error:", error);
      res.status(500).json({ error: "Erro ao deletar código" });
    }
  });
  
  // Track partner code clicks (EXACT same as affiliate track-click)
  app.post("/api/partner/track-click", async (req, res) => {
    try {
      const { code, ipAddress, userAgent, referrer } = req.body;
      
      if (!code) {
        return res.status(400).json({ error: "Código é obrigatório" });
      }
      
      const normalizedCode = code.toUpperCase();
      
      // Find the partner code
      const [partnerCode] = await db.select()
        .from(partnerCodes)
        .where(eq(partnerCodes.code, normalizedCode))
        .limit(1);
      
      if (!partnerCode) {
        return res.status(404).json({ error: "Código não encontrado" });
      }
      
      // Use storage method to track click (same pattern as affiliate)
      await storage.trackPartnerClick({
        partnerId: partnerCode.partnerId,
        code: normalizedCode,
        ipAddress: ipAddress || req.ip || '',
        userAgent: userAgent || req.headers['user-agent'] || '',
        referrer: referrer || '',
        landingPage: req.body.url || '/'
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Track partner click error:", error);
      res.status(500).json({ error: "Erro ao registrar clique" });
    }
  });
  
  // Debug route for partner wallet and commissions
  app.get("/api/partner/debug-wallet", authenticatePartner, async (req, res) => {
    try {
      const partnerId = (req as any).partnerId;
      
      // Get partner info
      const [partner] = await db.select().from(partners).where(eq(partners.id, partnerId));
      
      // Get partner wallet
      const [wallet] = await db.select().from(partnersWallet).where(eq(partnersWallet.partnerId, partnerId));
      
      // Get all partner conversions
      const conversions = await db.select()
        .from(partnerConversions)
        .where(eq(partnerConversions.partnerId, partnerId))
        .orderBy(desc(partnerConversions.createdAt));
      
      // Calculate totals by status
      const stats = {
        pending: conversions.filter(c => c.status === 'pending'),
        completed: conversions.filter(c => c.status === 'completed' || c.status === 'approved'),
        cancelled: conversions.filter(c => c.status === 'cancelled'),
        totalPending: conversions.filter(c => c.status === 'pending').reduce((sum, c) => sum + parseFloat(c.partnerCommission || '0'), 0),
        totalCompleted: conversions.filter(c => c.status === 'completed' || c.status === 'approved').reduce((sum, c) => sum + parseFloat(c.partnerCommission || '0'), 0),
        totalCancelled: conversions.filter(c => c.status === 'cancelled').reduce((sum, c) => sum + parseFloat(c.partnerCommission || '0'), 0)
      };
      
      res.json({
        partner: {
          id: partner?.id,
          name: partner?.name,
          commissionType: partner?.commissionType,
          commissionRate: partner?.commissionRate,
          fixedCommissionAmount: partner?.fixedCommissionAmount
        },
        wallet: {
          balance: wallet?.balance || '0.00',
          totalEarned: wallet?.totalEarned || '0.00',
          totalWithdrawn: wallet?.totalWithdrawn || '0.00',
          lastTransactionAt: wallet?.lastTransactionAt
        },
        conversions: {
          total: conversions.length,
          pending: stats.pending.length,
          completed: stats.completed.length,
          cancelled: stats.cancelled.length,
          totalPendingAmount: stats.totalPending.toFixed(2),
          totalCompletedAmount: stats.totalCompleted.toFixed(2),
          totalCancelledAmount: stats.totalCancelled.toFixed(2),
          recentConversions: conversions.slice(0, 10).map(c => ({
            id: c.id,
            userId: c.userId,
            status: c.status,
            partnerCommission: c.partnerCommission,
            createdAt: c.createdAt
          }))
        },
        calculatedBalance: stats.totalCompleted.toFixed(2),
        expectedBalance: (stats.totalCompleted - parseFloat(wallet?.totalWithdrawn || '0')).toFixed(2)
      });
    } catch (error) {
      console.error("Debug wallet error:", error);
      res.status(500).json({ error: "Erro ao buscar informações de debug" });
    }
  });
  
  // Partner History Route - shows partner's activity history
  app.get("/api/partner/history", authenticatePartner, async (req, res) => {
    try {
      const partnerId = (req as any).partnerId;
      
      // For now, return empty history as tables might not be initialized
      // This prevents errors and allows the page to load
      const activities = [];
      
      // Try to get partner conversions if table exists
      try {
        const conversions = await db.select()
          .from(partnerConversions)
          .where(eq(partnerConversions.partnerId, partnerId))
          .orderBy(desc(partnerConversions.createdAt))
          .limit(50);
        
        // Add conversions to activities
        for (const conversion of conversions) {
          activities.push({
            id: `conv-${conversion.id}`,
            type: "commission",
            icon: "DollarSign",
            title: "Comissão recebida",
            description: `Depósito de usuário #${conversion.userId}`,
            amount: parseFloat(conversion.partnerCommission || "0"),
            date: conversion.createdAt,
            status: "success"
          });
        }
      } catch (error) {
        console.log("Partner conversions table not available");
      }
      
      // Try to get partner withdrawals if table exists
      try {
        const withdrawals = await db.select()
          .from(partnersWithdrawals)
          .where(eq(partnersWithdrawals.partnerId, partnerId))
          .orderBy(desc(partnersWithdrawals.requestedAt))
          .limit(50);
        
        // Add withdrawals to activities
        for (const withdrawal of withdrawals) {
          activities.push({
            id: `with-${withdrawal.id}`,
            type: "withdrawal",
            icon: "TrendingUp",
            title: withdrawal.status === 'completed' ? "Saque aprovado" : 
                   withdrawal.status === 'pending' ? "Saque pendente" : "Saque rejeitado",
            description: "Saque via PIX",
            amount: parseFloat(withdrawal.amount),
            date: withdrawal.requestedAt,
            status: withdrawal.status === 'completed' ? "success" : 
                    withdrawal.status === 'pending' ? "info" : "error"
          });
        }
      } catch (error) {
        console.log("Partner withdrawals table not available");
      }
      
      // Sort activities by date if any exist
      if (activities.length > 0) {
        activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }
      
      res.json({ activities });
    } catch (error) {
      console.error("Get partner history error:", error);
      res.status(500).json({ error: "Erro ao buscar histórico" });
    }
  });

  // =============================================
  // AFFILIATE PARTNER MANAGEMENT ROUTES
  // =============================================
  
  // Get affiliate's partners list
  app.get("/api/affiliate/partners", authenticateAffiliate, async (req: any, res) => {
    try {
      const affiliateId = req.affiliateId;
      
      // Get all partners for this affiliate
      const partnersList = await db.select()
        .from(partners)
        .where(eq(partners.affiliateId, affiliateId))
        .orderBy(desc(partners.createdAt));
      
      // For each partner, get the actual registration count and deposit stats
      const partnersWithStats = await Promise.all(
        partnersList.map(async (partner) => {
          // Count users registered through this partner
          const usersResult = await db.select({ 
            count: sql<number>`count(*)` 
          })
          .from(users)
          .where(eq(users.partnerId, partner.id));
          
          const registrationCount = usersResult[0]?.count || 0;
          
          // Get deposits from users registered through this partner
          const depositsResult = await db.select({
            count: sql<number>`count(*)`,
            total: sql<string>`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)::text`
          })
          .from(deposits)
          .where(and(
            sql`user_id IN (SELECT id FROM users WHERE partner_id = ${partner.id})`,
            eq(deposits.status, 'completed')
          ));
          
          const depositCount = depositsResult[0]?.count || 0;
          const totalRevenue = depositsResult[0]?.total || '0.00';
          
          return {
            ...partner,
            totalRegistrations: registrationCount,
            totalDeposits: depositCount,
            totalRevenue: totalRevenue
          };
        })
      );
      
      res.json(partnersWithStats);
    } catch (error) {
      console.error("Get affiliate partners error:", error);
      res.status(500).json({ error: "Erro ao buscar parceiros" });
    }
  });
  
  // Get affiliate's partner stats
  app.get("/api/affiliate/partners/stats", authenticateAffiliate, async (req: any, res) => {
    try {
      const affiliateId = req.affiliateId;
      
      // Get all partners for stats
      const partnersList = await db.select()
        .from(partners)
        .where(eq(partners.affiliateId, affiliateId));
      
      const totalPartners = partnersList.length;
      const activePartners = partnersList.filter(p => p.isActive).length;
      
      // Calculate total earnings from partners
      const totalEarnings = partnersList.reduce((sum, p) => 
        sum + parseFloat(p.totalEarnings || "0"), 0
      ).toFixed(2);
      
      // Calculate monthly earnings (simplified - current month)
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const monthlyPartnerConversions = await db.select()
        .from(partnerConversions)
        .where(
          and(
            eq(partnerConversions.affiliateId, affiliateId),
            gte(partnerConversions.createdAt, new Date(currentYear, currentMonth, 1))
          )
        );
      
      const monthlyEarnings = monthlyPartnerConversions.reduce((sum, c) => 
        sum + parseFloat(c.affiliateCommission || "0"), 0
      ).toFixed(2);
      
      // Total clicks and conversions
      const totalClicks = partnersList.reduce((sum, p) => 
        sum + (p.totalClicks || 0), 0
      );
      
      const totalConversions = partnersList.reduce((sum, p) => 
        sum + (p.totalRegistrations || 0) + (p.totalDeposits || 0), 0
      );
      
      res.json({
        totalPartners,
        activePartners,
        totalEarnings,
        monthlyEarnings,
        totalClicks,
        totalConversions
      });
    } catch (error) {
      console.error("Get partner stats error:", error);
      res.status(500).json({ error: "Erro ao buscar estatísticas" });
    }
  });
  
  // Toggle partner status (activate/deactivate)
  app.post("/api/affiliate/partners/:partnerId/toggle", authenticateAffiliate, async (req: any, res) => {
    try {
      const affiliateId = req.affiliateId;
      const partnerId = parseInt(req.params.partnerId);
      const { isActive } = req.body;
      
      // Verify partner belongs to affiliate
      const [partner] = await db.select()
        .from(partners)
        .where(
          and(
            eq(partners.id, partnerId),
            eq(partners.affiliateId, affiliateId)
          )
        )
        .limit(1);
      
      if (!partner) {
        return res.status(404).json({ error: "Parceiro não encontrado" });
      }
      
      // Toggle status
      await db.update(partners)
        .set({ 
          isActive: !isActive,
          blockedAt: !isActive ? new Date() : null,
          blockedReason: !isActive ? "Bloqueado pelo afiliado" : null
        })
        .where(eq(partners.id, partnerId));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Toggle partner status error:", error);
      res.status(500).json({ error: "Erro ao atualizar status" });
    }
  });
  
  // Get affiliate profile (for invite code)
  app.get("/api/affiliate/profile", authenticateAffiliate, async (req: any, res) => {
    try {
      const affiliateId = req.affiliateId;
      const affiliate = req.affiliate;
      
      res.json({
        id: affiliate.id,
        name: affiliate.name,
        email: affiliate.email,
        code: affiliate.code,
        partnerInviteCode: affiliate.partnerInviteCode,
        avatar: affiliate.avatar
      });
    } catch (error) {
      console.error("Get affiliate profile error:", error);
      res.status(500).json({ error: "Erro ao buscar perfil" });
    }
  });
  
  // Create partner account (from affiliate panel only)
  app.post("/api/affiliate/partners/create", authenticateAffiliate, async (req: any, res) => {
    try {
      const affiliateId = req.affiliateId;
      const { name, email, phone, commissionType, commissionRate } = req.body;
      
      // Validate required fields
      if (!name || !email) {
        return res.status(400).json({ error: "Nome e email são obrigatórios" });
      }
      
      // Get affiliate details to validate commission limits
      const affiliate = await storage.getAffiliateById(affiliateId);
      if (!affiliate) {
        return res.status(404).json({ error: "Afiliado não encontrado" });
      }
      
      // Get tier configuration to determine actual commission
      const tierConfig = await db
        .select()
        .from(affiliateTierConfig)
        .where(eq(affiliateTierConfig.tier, affiliate.affiliateLevel || 'bronze'))
        .limit(1);
      
      const currentTier = tierConfig[0];
      
      // Determine actual commission type and value - PRIORITY: Custom > Tier > Default
      let affiliateCommissionType = 'fixed'; // Default type
      let affiliateCommissionValue = 7; // Default value
      
      // FIRST PRIORITY: Check for custom commission settings
      if (affiliate.customFixedAmount && parseFloat(affiliate.customFixedAmount) > 0) {
        // Custom fixed commission takes priority
        affiliateCommissionType = 'fixed';
        affiliateCommissionValue = parseFloat(affiliate.customFixedAmount);
        console.log('Partner creation - Using CUSTOM fixed commission:', affiliateCommissionValue);
      } else if (affiliate.customCommissionRate && parseFloat(affiliate.customCommissionRate) > 0) {
        // Custom percentage commission takes priority
        affiliateCommissionType = 'percentage';
        affiliateCommissionValue = parseFloat(affiliate.customCommissionRate);
        console.log('Partner creation - Using CUSTOM percentage commission:', affiliateCommissionValue);
      }
      // SECOND PRIORITY: Use tier configuration if no custom settings
      else if (currentTier) {
        // Check affiliate's commission type setting
        if (affiliate.commissionType === 'percentage') {
          affiliateCommissionType = 'percentage';
          affiliateCommissionValue = parseFloat(currentTier.percentageRate || '40');
          console.log('Partner creation - Using TIER percentage commission:', affiliateCommissionValue);
        } else {
          // Use fixed commission
          affiliateCommissionType = 'fixed';
          affiliateCommissionValue = parseFloat(currentTier.fixedAmount || '6');
          console.log('Partner creation - Using TIER fixed commission:', affiliateCommissionValue);
        }
      }
      // THIRD PRIORITY: Fallback options
      else if (affiliate.affiliateLevel === 'silver') {
        // Default silver tier commission when no config found
        if (affiliate.commissionType === 'percentage') {
          affiliateCommissionType = 'percentage';
          affiliateCommissionValue = 45; // 45% default for silver
          console.log('Partner creation - Using DEFAULT silver percentage commission:', affiliateCommissionValue);
        } else {
          affiliateCommissionType = 'fixed';
          affiliateCommissionValue = 7; // R$ 7.00 default for silver
          console.log('Partner creation - Using DEFAULT silver fixed commission:', affiliateCommissionValue);
        }
      } else if (affiliate.commissionType === 'fixed' && affiliate.currentLevelRate) {
        // Fallback to current level rate if stored as fixed
        affiliateCommissionType = 'fixed';
        affiliateCommissionValue = parseFloat(affiliate.currentLevelRate);
        console.log('Partner creation - Using FALLBACK current level rate:', affiliateCommissionValue);
      }
      
      // Validate commission limits based on affiliate's commission structure
      const MINIMUM_DEPOSIT = 20; // Minimum deposit amount in BRL
      const partnerCommissionValue = parseFloat(commissionRate || '0');
      
      if (partnerCommissionValue <= 0) {
        return res.status(400).json({ error: "A comissão deve ser maior que zero" });
      }
      
      // Calculate maximum allowed commission for partner
      let maxAllowed = 0;
      let errorMessage = "";
      
      if (affiliateCommissionType === 'percentage') {
        if (commissionType === 'percentage') {
          // Partner percentage cannot exceed affiliate percentage
          maxAllowed = affiliateCommissionValue;
          if (partnerCommissionValue > maxAllowed) {
            errorMessage = `A comissão percentual não pode ser maior que ${maxAllowed.toFixed(1)}% (sua comissão)`;
          }
        } else {
          // Partner wants fixed, calculate max based on minimum deposit
          maxAllowed = (affiliateCommissionValue / 100) * MINIMUM_DEPOSIT;
          if (partnerCommissionValue > maxAllowed) {
            errorMessage = `A comissão fixa não pode ser maior que R$ ${maxAllowed.toFixed(2)} (${affiliateCommissionValue}% do depósito mínimo de R$ ${MINIMUM_DEPOSIT})`;
          }
        }
      } else {
        // Affiliate has fixed commission
        if (commissionType === 'fixed') {
          // Partner fixed cannot exceed affiliate fixed
          maxAllowed = affiliateCommissionValue;
          if (partnerCommissionValue > maxAllowed) {
            errorMessage = `A comissão fixa não pode ser maior que R$ ${maxAllowed.toFixed(2)} (sua comissão fixa)`;
          }
        } else {
          // Partner wants percentage, calculate based on fixed amount over minimum deposit
          maxAllowed = Math.min((affiliateCommissionValue / MINIMUM_DEPOSIT) * 100, 100);
          if (partnerCommissionValue > maxAllowed) {
            errorMessage = `A comissão percentual não pode ser maior que ${maxAllowed.toFixed(1)}% (equivalente ao seu valor fixo de R$ ${affiliateCommissionValue.toFixed(2)} sobre o depósito mínimo)`;
          }
        }
      }
      
      if (errorMessage) {
        return res.status(400).json({ error: errorMessage });
      }
      
      // Check if email already exists
      const [existingPartner] = await db.select()
        .from(partners)
        .where(eq(partners.email, email))
        .limit(1);
      
      if (existingPartner) {
        return res.status(400).json({ error: "Email já cadastrado como parceiro" });
      }
      
      // Generate unique partner code
      let partnerCode;
      let isUnique = false;
      
      while (!isUnique) {
        partnerCode = 'P' + Math.random().toString(36).substring(2, 8).toUpperCase();
        const [existing] = await db.select()
          .from(partners)
          .where(eq(partners.code, partnerCode))
          .limit(1);
        isUnique = !existing;
      }
      
      // Generate random password
      const password = Math.random().toString(36).substring(2, 10) + 
                      Math.random().toString(36).substring(2, 6).toUpperCase();
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create partner account
      const [newPartner] = await db.insert(partners)
        .values({
          affiliateId,
          name,
          email,
          phone: phone || null,
          password: hashedPassword,
          code: partnerCode,
          commissionType: commissionType || 'percentage',
          commissionRate: parseFloat(commissionRate || '10'),
          fixedCommissionAmount: commissionType === 'fixed' ? parseFloat(commissionRate || '50') : null,
          totalEarnings: "0.00",
          pendingEarnings: "0.00",
          approvedEarnings: "0.00",
          totalClicks: 0,
          totalRegistrations: 0,
          totalDeposits: 0,
          lastClickAt: null,
          isActive: true,
          blockedAt: null,
          blockedReason: null,
          createdAt: new Date()
        })
        .returning();
      
      // Create wallet for partner
      await db.insert(partnersWallet)
        .values({
          partnerId: newPartner.id,
          balance: "0.00",
          lastTransactionAt: null,
          createdAt: new Date()
        });
      
      res.json({
        success: true,
        partner: {
          id: newPartner.id,
          name: newPartner.name,
          email: newPartner.email,
          code: newPartner.code
        },
        password: password, // Return plain password for the affiliate to share
        message: "Parceiro criado com sucesso"
      });
      
    } catch (error) {
      console.error("Create partner error:", error);
      res.status(500).json({ error: "Erro ao criar parceiro" });
    }
  });

  // Generate partner invite code for affiliate
  // Reset partner password
  app.post("/api/affiliate/partners/:partnerId/reset-password", authenticateAffiliate, async (req: any, res) => {
    try {
      const affiliateId = req.affiliateId;
      const partnerId = parseInt(req.params.partnerId);
      
      // Verify partner belongs to affiliate
      const [partner] = await db
        .select()
        .from(partners)
        .where(and(
          eq(partners.id, partnerId),
          eq(partners.affiliateId, affiliateId)
        ))
        .limit(1);
      
      if (!partner) {
        return res.status(404).json({ error: "Parceiro não encontrado" });
      }
      
      // Generate new password (8-12 characters with letters and numbers)
      const length = Math.floor(Math.random() * 5) + 8;
      const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
      let newPassword = "";
      for (let i = 0; i < length; i++) {
        newPassword += charset.charAt(Math.floor(Math.random() * charset.length));
      }
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Update partner password
      await db
        .update(partners)
        .set({ 
          password: hashedPassword,
          updatedAt: new Date()
        })
        .where(eq(partners.id, partnerId));
      
      res.json({ 
        success: true,
        partnerId: partner.id,
        name: partner.name,
        email: partner.email,
        newPassword: newPassword,
        message: "Senha redefinida com sucesso"
      });
      
    } catch (error) {
      console.error("Reset partner password error:", error);
      res.status(500).json({ error: "Erro ao redefinir senha do parceiro" });
    }
  });
  
  // Delete partner (only if no commissions)
  app.delete("/api/affiliate/partners/:partnerId", authenticateAffiliate, async (req: any, res) => {
    try {
      const affiliateId = req.affiliateId;
      const partnerId = parseInt(req.params.partnerId);
      
      // Verify partner belongs to affiliate
      const [partner] = await db.select()
        .from(partners)
        .where(
          and(
            eq(partners.id, partnerId),
            eq(partners.affiliateId, affiliateId)
          )
        )
        .limit(1);
      
      if (!partner) {
        return res.status(404).json({ error: "Parceiro não encontrado" });
      }
      
      // Check if partner has any commissions (in partner_conversions table)
      const [hasCommissions] = await db.select({ count: sql<number>`count(*)` })
        .from(partnerConversions)
        .where(eq(partnerConversions.partnerId, partnerId));
      
      if (hasCommissions && hasCommissions.count > 0) {
        return res.status(400).json({ 
          error: `Não é possível excluir. Este parceiro possui ${hasCommissions.count} comissão(ões) registrada(s)`,
          hasCommissions: true,
          commissionCount: hasCommissions.count
        });
      }
      
      // Check if partner has any withdrawals
      const [hasWithdrawals] = await db.select({ count: sql<number>`count(*)` })
        .from(partnersWithdrawals)
        .where(eq(partnersWithdrawals.partnerId, partnerId));
      
      if (hasWithdrawals && hasWithdrawals.count > 0) {
        return res.status(400).json({ 
          error: `Não é possível excluir. Este parceiro possui ${hasWithdrawals.count} saque(s) no histórico`,
          hasWithdrawals: true,
          withdrawalCount: hasWithdrawals.count
        });
      }
      
      // Check if partner has any balance in wallet
      const [partnerWallet] = await db.select()
        .from(partnersWallet)
        .where(eq(partnersWallet.partnerId, partnerId))
        .limit(1);
      
      if (partnerWallet && parseFloat(partnerWallet.balance) > 0) {
        return res.status(400).json({ 
          error: `Não é possível excluir. Este parceiro possui saldo de R$ ${partnerWallet.balance} na carteira`,
          hasBalance: true,
          balance: partnerWallet.balance
        });
      }
      
      // Delete partner's wallet (if exists with zero balance)
      if (partnerWallet) {
        await db.delete(partnersWallet)
          .where(eq(partnersWallet.partnerId, partnerId));
      }
      
      // Delete partner's wallet transactions (should be empty)
      // Note: partners_wallet_transactions doesn't have a direct partner_id, so we skip this
      // as wallet transactions are tied to wallet, and we're deleting the wallet anyway
      
      // Delete partner's clicks
      await db.delete(partnerClicks)
        .where(eq(partnerClicks.partnerId, partnerId));
      
      // Delete partner's marketing links
      await db.delete(marketingLinks)
        .where(and(
          eq(marketingLinks.partnerId, partnerId),
          eq(marketingLinks.affiliateId, affiliateId)
        ));
      
      // Delete partner's codes
      await db.delete(partnerCodes)
        .where(eq(partnerCodes.partnerId, partnerId));
      
      // Delete partner
      await db.delete(partners)
        .where(eq(partners.id, partnerId));
      
      res.json({ 
        success: true,
        message: "Parceiro excluído com sucesso"
      });
    } catch (error) {
      console.error("Delete partner error:", error);
      res.status(500).json({ error: "Erro ao excluir parceiro" });
    }
  });

  // Update partner commission
  app.put("/api/affiliate/partners/:partnerId/commission", authenticateAffiliate, async (req: any, res) => {
    try {
      const affiliateId = req.affiliateId;
      const partnerId = parseInt(req.params.partnerId);
      const { name, email, phone, commissionType, commissionRate } = req.body;
      
      // Verify partner belongs to affiliate
      const [partner] = await db
        .select()
        .from(partners)
        .where(and(
          eq(partners.id, partnerId),
          eq(partners.affiliateId, affiliateId)
        ))
        .limit(1);
      
      if (!partner) {
        return res.status(404).json({ error: "Parceiro não encontrado" });
      }
      
      // Get affiliate details to validate commission limits
      const [affiliate] = await db
        .select()
        .from(affiliates)
        .where(eq(affiliates.id, affiliateId))
        .limit(1);
      
      // Get tier configuration
      const tierConfig = await db
        .select()
        .from(affiliateTierConfig)
        .where(eq(affiliateTierConfig.tier, affiliate.affiliateLevel || 'bronze'))
        .limit(1);
      
      const currentTier = tierConfig[0];
      
      // Determine actual affiliate commission
      let affiliateCommissionType = 'fixed';
      let affiliateCommissionValue = 7;
      
      // FIRST PRIORITY: Check for custom commission settings
      if (affiliate.customFixedAmount && parseFloat(affiliate.customFixedAmount) > 0) {
        affiliateCommissionType = 'fixed';
        affiliateCommissionValue = parseFloat(affiliate.customFixedAmount);
      } else if (affiliate.customCommissionRate && parseFloat(affiliate.customCommissionRate) > 0) {
        affiliateCommissionType = 'percentage';
        affiliateCommissionValue = parseFloat(affiliate.customCommissionRate);
      }
      // SECOND PRIORITY: Use tier configuration
      else if (currentTier) {
        affiliateCommissionType = 'fixed';
        affiliateCommissionValue = parseFloat(currentTier.fixedAmount || '7');
      }
      // THIRD PRIORITY: Fallback options
      else if (affiliate.affiliateLevel === 'silver') {
        affiliateCommissionType = 'fixed';
        affiliateCommissionValue = 7;
      } else if (affiliate.commissionType === 'fixed' && affiliate.currentLevelRate) {
        affiliateCommissionType = 'fixed';
        affiliateCommissionValue = parseFloat(affiliate.currentLevelRate);
      }
      
      // Validate commission limits
      const MINIMUM_DEPOSIT = 20;
      const partnerCommissionValue = parseFloat(commissionRate || '0');
      
      if (partnerCommissionValue <= 0) {
        return res.status(400).json({ error: "A comissão deve ser maior que zero" });
      }
      
      // Calculate maximum allowed commission
      let maxAllowed = 0;
      let errorMessage = "";
      
      if (affiliateCommissionType === 'percentage') {
        if (commissionType === 'percentage') {
          maxAllowed = affiliateCommissionValue;
          if (partnerCommissionValue > maxAllowed) {
            errorMessage = `A comissão percentual não pode ser maior que ${maxAllowed.toFixed(1)}% (sua comissão)`;
          }
        } else {
          maxAllowed = (affiliateCommissionValue / 100) * MINIMUM_DEPOSIT;
          if (partnerCommissionValue > maxAllowed) {
            errorMessage = `A comissão fixa não pode ser maior que R$ ${maxAllowed.toFixed(2)}`;
          }
        }
      } else {
        if (commissionType === 'fixed') {
          maxAllowed = affiliateCommissionValue;
          if (partnerCommissionValue > maxAllowed) {
            errorMessage = `A comissão fixa não pode ser maior que R$ ${maxAllowed.toFixed(2)} (sua comissão)`;
          }
        } else {
          maxAllowed = Math.min((affiliateCommissionValue / MINIMUM_DEPOSIT) * 100, 100);
          if (partnerCommissionValue > maxAllowed) {
            errorMessage = `A comissão percentual não pode ser maior que ${maxAllowed.toFixed(1)}%`;
          }
        }
      }
      
      if (errorMessage) {
        return res.status(400).json({ error: errorMessage });
      }
      
      // Check if email is being changed and is not already in use
      if (email && email !== partner.email) {
        const [existingPartner] = await db
          .select()
          .from(partners)
          .where(and(
            eq(partners.email, email),
            not(eq(partners.id, partnerId))
          ))
          .limit(1);
        
        if (existingPartner) {
          return res.status(400).json({ error: "Este email já está em uso por outro parceiro" });
        }
      }
      
      // Update partner details and commission
      const updateData: any = {
        commissionType,
        updatedAt: new Date()
      };
      
      // Add optional fields if provided
      if (name) updateData.name = name;
      if (email) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone || null;
      
      if (commissionType === 'percentage') {
        updateData.commissionRate = partnerCommissionValue.toString();
        updateData.fixedCommissionAmount = null;
      } else {
        updateData.fixedCommissionAmount = partnerCommissionValue.toString();
        updateData.commissionRate = null;
      }
      
      await db
        .update(partners)
        .set(updateData)
        .where(eq(partners.id, partnerId));
      
      res.json({ 
        success: true,
        message: "Comissão do parceiro atualizada com sucesso"
      });
      
    } catch (error) {
      console.error("Update partner commission error:", error);
      res.status(500).json({ error: "Erro ao atualizar comissão do parceiro" });
    }
  });

  app.post("/api/affiliate/generate-partner-code", authenticateAffiliate, async (req: any, res) => {
    try {
      const affiliateId = req.affiliateId;
      
      // Check if affiliate already has a partner invite code
      const [affiliate] = await db.select()
        .from(affiliates)
        .where(eq(affiliates.id, affiliateId))
        .limit(1);
      
      if (affiliate.partnerInviteCode) {
        return res.json({ 
          success: true,
          code: affiliate.partnerInviteCode,
          message: "Você já possui um código de convite" 
        });
      }
      
      // Generate unique partner invite code (2 numbers + 4 letters)
      let partnerInviteCode;
      let isUnique = false;
      
      while (!isUnique) {
        const numbers = Math.floor(10 + Math.random() * 90).toString();
        const letters = Array.from({ length: 4 }, () => 
          String.fromCharCode(65 + Math.floor(Math.random() * 26))
        ).join('');
        partnerInviteCode = numbers + letters;
        
        // Check if code is unique
        const [existing] = await db.select()
          .from(affiliates)
          .where(eq(affiliates.partnerInviteCode, partnerInviteCode))
          .limit(1);
        
        isUnique = !existing;
      }
      
      // Update affiliate with partner invite code
      await db.update(affiliates)
        .set({ partnerInviteCode })
        .where(eq(affiliates.id, affiliateId));
      
      res.json({ 
        success: true,
        code: partnerInviteCode,
        message: "Código de convite gerado com sucesso" 
      });
    } catch (error) {
      console.error("Generate partner code error:", error);
      res.status(500).json({ error: "Erro ao gerar código de convite" });
    }
  });

  // ==================== MANIA FLY ENDPOINTS ====================
  
  // Get current game status (public endpoint)
  app.get("/api/games/mania-fly/status", (req, res) => {
    const status = maniaFlyManager.getStatus();
    res.json(status);
  });
  
  // Place a bet - SECURE VERSION
  app.post("/api/games/mania-fly/bet", authenticateToken, async (req: any, res) => {
    try {
      const { amount } = req.body;
      const userId = req.userId;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Valor de aposta inválido" });
      }
      
      // Check user balance
      const wallet = await storage.getWallet(userId);
      if (!wallet || parseFloat(wallet.balance) < amount) {
        return res.status(400).json({ message: "Saldo insuficiente" });
      }
      
      // Place bet in game manager
      const result = maniaFlyManager.placeBet(userId, amount);
      
      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }
      
      // Deduct from wallet
      const newBalance = parseFloat(wallet.balance) - amount;
      await storage.updateWalletBalance(userId, newBalance.toFixed(2));
      await storage.incrementTotalWagered(userId, amount.toString());
      
      // Record game in database
      await storage.createGame({
        userId,
        gameType: 'mania_fly',
        betAmount: amount.toFixed(2),
        result: 'pending',
        prizeAmount: '0.00',
        completed: false,
        gameData: { roundId: result.roundId }
      });
      
      res.json({ 
        success: true, 
        message: result.message,
        roundId: result.roundId,
        balance: newBalance.toFixed(2)
      });
    } catch (error) {
      console.error("Mania Fly bet error:", error);
      res.status(500).json({ message: "Erro ao processar aposta" });
    }
  });
  
  // Cash out - SECURE VERSION
  app.post("/api/games/mania-fly/cashout", authenticateToken, async (req: any, res) => {
    try {
      const { roundId } = req.body;
      const userId = req.userId;
      
      if (!roundId) {
        return res.status(400).json({ message: "Round ID é obrigatório" });
      }
      
      // Process cashout in game manager - SERVER CALCULATES EVERYTHING
      const result = maniaFlyManager.cashOut(userId, roundId);
      
      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }
      
      // Update wallet with winnings
      const wallet = await storage.getWallet(userId);
      if (!wallet) {
        return res.status(400).json({ message: "Carteira não encontrada" });
      }
      
      const newBalance = parseFloat(wallet.balance) + result.profit!;
      await storage.updateWalletBalance(userId, newBalance.toFixed(2));
      
      // Update game record
      await db
        .update(games)
        .set({
          result: 'won',
          prizeAmount: result.profit!.toFixed(2),
          completed: true,
          gameData: sql`jsonb_set(game_data, '{multiplier}', '${result.multiplier}'::jsonb)`
        })
        .where(
          and(
            eq(games.userId, userId),
            sql`game_data->>'roundId' = ${roundId}`
          )
        );
      
      res.json({
        success: true,
        message: result.message,
        multiplier: result.multiplier,
        profit: result.profit,
        balance: newBalance.toFixed(2)
      });
    } catch (error) {
      console.error("Mania Fly cashout error:", error);
      res.status(500).json({ message: "Erro ao processar saque" });
    }
  });
  
  // ==================== END MANIA FLY ENDPOINTS ====================

  const httpServer = createServer(app);
  return httpServer;
}
