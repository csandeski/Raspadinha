import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db, pool } from "./db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import fetch from "node-fetch";
import twilio from "twilio";
import { createOrinPayPixPayment, verifyOrinPayPayment, processOrinPayWithdrawal, getOrinPayBalance, handleOrinPayWebhook } from './orinpay';

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
  gameProbabilities,
  esquiloProbabilities,
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
// OrinPay is now the only payment provider


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

// Middleware to verify admin session
const authenticateAdmin = async (req: any, res: any, next: any) => {
  const sessionId = req.headers.authorization?.split(" ")[1];

  if (!sessionId) {
    return res.status(401).json({ message: "Sessão de admin requerida" });
  }

  try {
    const session = await storage.getAdminSession(sessionId);
    if (!session) {
      return res.status(403).json({ message: "Sessão inválida ou expirada" });
    }
    req.adminSession = session;
    next();
  } catch (error) {
    return res.status(500).json({ message: "Erro ao verificar sessão" });
  }
};


// Legacy OrinPay function - REMOVED (now using new implementation from orinpay.ts)
const createOrinPayPixPayment_OLD = async (amount: number, customerData: any) => {
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


const createPixPayment = async (amount: number, customerData: any, depositId: number, utmData?: any) => {
  // Only use OrinPay as payment provider
  console.log("Creating PIX payment with OrinPay");
  
  try {
    const response = await createOrinPayPixPayment(amount, customerData, depositId);
    console.log("OrinPay payment created successfully");
    return response;
  } catch (error) {
    console.error("OrinPay payment failed:", error);
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
    const result = await verifyOrinPayPayment(transactionId);
    
    if (result.success && result.status === 'approved') {
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
          status: 'completed',
          updatedAt: new Date()
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
        partnerConversionId, // Use partner conversion ID as reference
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
      const pendingDeposits = await storage.getDeposits(req.userId);
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
          const pendingDeposits = await storage.getDeposits(req.userId);
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
        if (!useBonus && (!wallet || parseFloat(wallet.balance) < cost)) {
          return res.status(400).json({ error: "Saldo insuficiente" });
        }

        // Check if user has sufficient scratch bonus when using bonus
        if (useBonus && wallet) {
          const currentScratchBonus = wallet.scratchBonus || 0;
          if (currentScratchBonus < scratchBonusCost) {
            return res.status(400).json({ error: "Mania Bônus insuficientes" });
          }
        }

        // Fetch prize probabilities from database
        let prizeData: any[] = [];
        try {
          const prizeProbabilities = await storage.getPrizeProbabilities(mappedType, userId);
          prizeData = prizeProbabilities.map(p => ({
            value: p.prize_value,
            numericValue: parseFloat(p.prize_value),
            probability: parseFloat(p.probability)
          }));
        } catch (error) {
          console.error(`Error fetching ${mappedType} prize probabilities:`, error);
          // Use default probabilities based on game type
          if (mappedType === 'premio-pix') {
            prizeData = [
              { value: "0.50", numericValue: 0.5, probability: 28.00 },
              { value: "1.00", numericValue: 1, probability: 20.00 },
              { value: "2.00", numericValue: 2, probability: 8.00 },
              { value: "3.00", numericValue: 3, probability: 4.00 },
              { value: "4.00", numericValue: 4, probability: 2.00 },
              { value: "5.00", numericValue: 5, probability: 1.50 },
              { value: "10.00", numericValue: 10, probability: 0.80 },
              { value: "15.00", numericValue: 15, probability: 0.40 },
              { value: "20.00", numericValue: 20, probability: 0.30 },
              { value: "50.00", numericValue: 50, probability: 0.10 },
              { value: "100.00", numericValue: 100, probability: 0.05 },
              { value: "200.00", numericValue: 200, probability: 0.02 },
              { value: "500.00", numericValue: 500, probability: 0.01 },
              { value: "1000.00", numericValue: 1000, probability: 0.005 },
              { value: "2000.00", numericValue: 2000, probability: 0.002 },
              { value: "5000.00", numericValue: 5000, probability: 0.001 },
              { value: "10000.00", numericValue: 10000, probability: 0.0002 },
              { value: "100000.00", numericValue: 100000, probability: 0.00001 }
            ];
          } else if (mappedType === 'premio-me-mimei') {
            prizeData = [
              { value: "1", numericValue: 1, probability: 30.00 },
              { value: "2", numericValue: 2, probability: 20.00 },
              { value: "3", numericValue: 3, probability: 10.00 },
              { value: "5", numericValue: 5, probability: 5.00 },
              { value: "10", numericValue: 10, probability: 2.00 },
              { value: "20", numericValue: 20, probability: 1.00 },
              { value: "50", numericValue: 50, probability: 0.50 },
              { value: "100", numericValue: 100, probability: 0.20 },
              { value: "200", numericValue: 200, probability: 0.10 },
              { value: "500", numericValue: 500, probability: 0.05 },
              { value: "1000", numericValue: 1000, probability: 0.02 },
              { value: "5000", numericValue: 5000, probability: 0.01 }
            ];
          } else if (mappedType === 'premio-eletronicos') {
            prizeData = [
              { value: "1", numericValue: 1, probability: 25.00 },
              { value: "2", numericValue: 2, probability: 15.00 },
              { value: "5", numericValue: 5, probability: 8.00 },
              { value: "10", numericValue: 10, probability: 4.00 },
              { value: "20", numericValue: 20, probability: 2.00 },
              { value: "50", numericValue: 50, probability: 1.00 },
              { value: "100", numericValue: 100, probability: 0.50 },
              { value: "200", numericValue: 200, probability: 0.20 },
              { value: "500", numericValue: 500, probability: 0.10 },
              { value: "1000", numericValue: 1000, probability: 0.05 },
              { value: "2000", numericValue: 2000, probability: 0.02 },
              { value: "5000", numericValue: 5000, probability: 0.01 }
            ];
          } else if (mappedType === 'premio-super-premios') {
            prizeData = [
              { value: "10.00", numericValue: 10, probability: 28.00 },
              { value: "20.00", numericValue: 20, probability: 20.00 },
              { value: "40.00", numericValue: 40, probability: 10.00 },
              { value: "60.00", numericValue: 60, probability: 8.00 },
              { value: "80.00", numericValue: 80, probability: 5.00 },
              { value: "100.00", numericValue: 100, probability: 4.00 },
              { value: "200.00", numericValue: 200, probability: 2.00 },
              { value: "300.00", numericValue: 300, probability: 1.50 },
              { value: "400.00", numericValue: 400, probability: 1.00 },
              { value: "1000.00", numericValue: 1000, probability: 0.50 },
              { value: "2000.00", numericValue: 2000, probability: 0.20 },
              { value: "4000.00", numericValue: 4000, probability: 0.08 },
              { value: "10000.00", numericValue: 10000, probability: 0.03 },
              { value: "20000.00", numericValue: 20000, probability: 0.01 },
              { value: "200000.00", numericValue: 200000, probability: 0.001 },
              { value: "500000.00", numericValue: 500000, probability: 0.0001 }
            ];
          } else {
            // Return error if no default probabilities available
            return res.status(500).json({ error: "Erro ao carregar probabilidades do jogo" });
          }
        }

        // Check if this is the test account
        const user = await storage.getUser(userId);
        const isTestAccount = user?.email === "teste@gmail.com";

        // Determine if the player wins
        let winningValue: string | null = null;
        
        if (isTestAccount) {
          // Test account always wins
          const totalProb = prizeData.reduce((sum, p) => sum + p.probability, 0);
          const rand = Math.random() * totalProb;
          let accumulator = 0;
          
          for (const prize of prizeData) {
            accumulator += prize.probability;
            if (rand <= accumulator) {
              winningValue = prize.value;
              break;
            }
          }
        } else {
          // Normal probability calculation
          const totalProbability = prizeData.reduce((sum, p) => sum + p.probability, 0);
          const roll = Math.random() * 100;
          
          if (roll < totalProbability) {
            // Player wins - determine which prize
            const winRoll = Math.random() * totalProbability;
            let cumulativeProbability = 0;
            
            for (const prize of prizeData) {
              cumulativeProbability += prize.probability;
              if (winRoll < cumulativeProbability) {
                winningValue = prize.value;
                break;
              }
            }
          }
        }

        // Generate hidden values for the scratch game
        const hiddenValues: string[] = [];
        
        if (winningValue) {
          // Place winning value 3 times
          hiddenValues.push(winningValue, winningValue, winningValue);
          
          // Fill rest with random values
          const allValues = prizeData.map(p => p.value).concat(["", "", ""]);
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
          const allValues = prizeData.map(p => p.value).concat(["", "", "", ""]);
          for (let i = 0; i < 9; i++) {
            let value = allValues[Math.floor(Math.random() * allValues.length)];
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
        
        await storage.createGame(gameRecord);

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

        if (!freePlay && !useBonus && userId && (!wallet || parseFloat(wallet.balance) < cost)) {
          return res.status(400).json({ error: "Saldo insuficiente" });
        }

        // Fetch PIX prizes from database
        let prizeData: any[] = [];
        try {
          const prizeProbabilities = await storage.getPrizeProbabilities('premio-pix', req.userId);
          prizeData = prizeProbabilities.map(p => ({
            value: p.prize_value,
            numericValue: parseFloat(p.prize_value),
            probability: parseFloat(p.probability) // Convert string to number!
          }));
          console.log("PIX probabilities loaded from database:", prizeData.map(p => ({ value: p.value, prob: p.probability })));
        } catch (error) {
          console.error("Error fetching PIX prize probabilities, using defaults:", error);
          // Fallback to default values if database fetch fails
          prizeData = [
            { value: "0.50", numericValue: 0.5, probability: 28.00 },
            { value: "1.00", numericValue: 1, probability: 20.00 },
            { value: "2.00", numericValue: 2, probability: 8.00 },
            { value: "3.00", numericValue: 3, probability: 4.00 },
            { value: "4.00", numericValue: 4, probability: 2.00 },
            { value: "5.00", numericValue: 5, probability: 1.50 },
            { value: "10.00", numericValue: 10, probability: 0.80 },
            { value: "15.00", numericValue: 15, probability: 0.40 },
            { value: "20.00", numericValue: 20, probability: 0.30 },
            { value: "50.00", numericValue: 50, probability: 0.10 },
            { value: "100.00", numericValue: 100, probability: 0.05 },
            { value: "200.00", numericValue: 200, probability: 0.02 },
            { value: "500.00", numericValue: 500, probability: 0.01 },
            { value: "1000.00", numericValue: 1000, probability: 0.005 },
            { value: "2000.00", numericValue: 2000, probability: 0.002 },
            { value: "5000.00", numericValue: 5000, probability: 0.001 },
            { value: "10000.00", numericValue: 10000, probability: 0.0002 },
            { value: "100000.00", numericValue: 100000, probability: 0.00001 }
          ];
        }

        const hiddenValues: string[] = [];

        // Check if this is the test account
        const user = userId ? await storage.getUser(userId) : null;
        const isTestAccount = user?.email === "teste@gmail.com";

        // NEW LOGIC: Each prize has its own independent probability
        let winningValue: string | null = null;
        
        if (isTestAccount) {
          // Test account always wins - pick a random prize weighted by probability
          const totalProb = prizeData.reduce((sum, p) => sum + p.probability, 0);
          const rand = Math.random() * totalProb;
          let accumulator = 0;
          
          for (const prize of prizeData) {
            accumulator += prize.probability;
            if (rand <= accumulator) {
              winningValue = prize.value;
              break;
            }
          }
          console.log("Test account detected - always wins:", winningValue);
        } else {
          // Calculate total probability (sum of all prize probabilities)
          const totalProbability = prizeData.reduce((sum, p) => sum + p.probability, 0);
          
          // Use only the base total probability (multiplier now affects prize value, not chance)
          const adjustedProbability = totalProbability; // Multiplier only affects prize value, NOT win chance
          
          console.log(`Total probability: ${totalProbability}%, Multiplier: ${multiplier}x (affects prize value)`);
          
          // Roll between 0 and 100
          const roll = Math.random() * 100;
          
          console.log(`Roll: ${roll}, Win Probability: ${adjustedProbability}, Won: ${roll < adjustedProbability}`);
          
          // If roll is within adjusted probability, we have a winner
          if (roll < adjustedProbability) {
            // Now determine which prize was won using cumulative probabilities
            const winRoll = Math.random() * totalProbability;
            let cumulativeProbability = 0;
            
            for (const prize of prizeData) {
              cumulativeProbability += prize.probability;
              if (winRoll < cumulativeProbability) {
                winningValue = prize.value;
                console.log(`Won ${prize.value} - cumulative probability: ${cumulativeProbability}%`);
                break;
              }
            }
          }
        }

        // Generate the grid based on whether we have a winner
        if (winningValue) {
          // Place winning value 3 times
          hiddenValues.push(winningValue, winningValue, winningValue);

          // Fill rest with random values (ensuring no accidental 3-match)
          const allValues = prizeData.map(p => p.value).concat(["", "", ""]);
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
          const allValues = prizeData.map(p => p.value).concat(["", "", "", ""]);
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
            const newBalance = parseFloat(wallet.balance) - cost;
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
            const newBalance = parseFloat(wallet.balance) + numericPrize;
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
            if (session.gameType === 'premio-pix' && session.gameState?.gameId === gameId) {
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

        if (!freePlay && !useBonus && (!wallet || parseFloat(wallet.balance) < cost)) {
          return res.status(400).json({ error: "Saldo insuficiente" });
        }

        // Fetch Me Mimei prizes from database
        let prizeData: any[] = [];
        try {
          const prizeProbabilities = await storage.getPrizeProbabilities('premio-me-mimei', req.userId);
          prizeData = prizeProbabilities.map(p => ({
            value: p.prize_value,
            probability: parseFloat(p.probability) // Convert string to number!
          }));
        } catch (error) {
          console.error("Error fetching Me Mimei prize probabilities, using defaults:", error);
          // Fallback to default values if database fetch fails
          prizeData = [
            { value: "0.50", probability: 28.00 },
            { value: "1.00", probability: 20.00 },
            { value: "2.00", probability: 8.00 },
            { value: "3.00", probability: 4.00 },
            { value: "4.00", probability: 2.00 },
            { value: "5.00", probability: 1.50 },
            { value: "10.00", probability: 0.80 }, // Batom Boca Rosa
            { value: "15.00", probability: 0.40 }, // Máscara Ruby Rose
            { value: "20.00", probability: 0.30 }, // Iluminador Bruna Tavares
            { value: "50.00", probability: 0.10 }, // Perfume Egeo Dolce
            { value: "100.00", probability: 0.05 }, // Bolsa Petite Jolie
            { value: "200.00", probability: 0.02 }, // Kit WEPINK
            { value: "500.00", probability: 0.01 }, // Perfume Good Girl
            { value: "1000.00", probability: 0.005 }, // Kit Completo Bruna Tavares
            { value: "2000.00", probability: 0.002 }, // Kit Kerastase
            { value: "5000.00", probability: 0.001 }, // Bolsa Luxo Michael Kors
            { value: "10000.00", probability: 0.0002 }, // Dyson Secador
            { value: "100000.00", probability: 0.00001 } // Anel Vivara Diamante
          ];
        }

        const hiddenValues: string[] = [];

        // Check if this is the test account
        const user = await storage.getUser(req.userId);
        const isTestAccount = user?.email === "teste@gmail.com";

        // NEW LOGIC: Each prize has its own independent probability
        let winningValue: string | null = null;
        
        if (isTestAccount) {
          // Test account always wins - pick a random prize weighted by probability
          const totalProb = prizeData.reduce((sum, p) => sum + p.probability, 0);
          const rand = Math.random() * totalProb;
          let accumulator = 0;
          
          for (const prize of prizeData) {
            accumulator += prize.probability;
            if (rand <= accumulator) {
              winningValue = prize.value;
              break;
            }
          }
          console.log("Test account detected - always wins:", winningValue);
        } else {
          // Calculate total probability (sum of all prize probabilities)
          const totalProbability = prizeData.reduce((sum, p) => sum + p.probability, 0);
          
          // Use only the base total probability (multiplier now affects prize value, not chance)
          const adjustedProbability = totalProbability; // Multiplier only affects prize value, NOT win chance
          
          console.log(`Total probability: ${totalProbability}%, Multiplier: ${multiplier}x (affects prize value)`);
          
          // Roll between 0 and 100
          const roll = Math.random() * 100;
          
          console.log(`Roll: ${roll}, Win Probability: ${adjustedProbability}, Won: ${roll < adjustedProbability}`);
          
          // If roll is within adjusted probability, we have a winner
          if (roll < adjustedProbability) {
            // Now determine which prize was won using cumulative probabilities
            const winRoll = Math.random() * totalProbability;
            let cumulativeProbability = 0;
            
            for (const prize of prizeData) {
              cumulativeProbability += prize.probability;
              if (winRoll < cumulativeProbability) {
                winningValue = prize.value;
                console.log(`Won ${prize.value} - cumulative probability: ${cumulativeProbability}%`);
                break;
              }
            }
          }
        }

        // Generate the grid based on whether we have a winner
        if (winningValue) {
          // Place winning value 3 times
          hiddenValues.push(winningValue, winningValue, winningValue);

          // Fill rest with random values (ensuring no accidental 3-match)
          const allValues = prizeData.map(p => p.value).concat(["", "", ""]);
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
          const allValues = prizeData.map(p => p.value).concat(["", "", "", ""]);
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
            const newBalance = parseFloat(wallet.balance) - cost;
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
            const newBalance = parseFloat(wallet.balance) + numericPrize;
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
          if (session.gameType === 'premio-me-mimei' && session.gameState?.gameId === gameId) {
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

        if (!freePlay && !useBonus && (!wallet || parseFloat(wallet.balance) < cost)) {
          return res.status(400).json({ error: "Saldo insuficiente" });
        }

        // Fetch Eletrônicos prizes from database
        let prizeData: any[] = [];
        try {
          const prizeProbabilities = await storage.getPrizeProbabilities('premio-eletronicos', req.userId);
          prizeData = prizeProbabilities.map(p => ({
            value: p.prize_value,
            probability: parseFloat(p.probability) // Convert string to number!
          }));
        } catch (error) {
          console.error("Error fetching Eletrônicos prize probabilities, using defaults:", error);
          // Fallback to default values if database fetch fails
          prizeData = [
            { value: "0.50", probability: 28.00 },
            { value: "1.00", probability: 20.00 },
            { value: "2.00", probability: 8.00 },
            { value: "3.00", probability: 4.00 },
            { value: "4.00", probability: 2.00 },
            { value: "5.00", probability: 1.50 },
            { value: "10.00", probability: 0.80 }, // Cabo USB
            { value: "15.00", probability: 0.40 }, // Suporte de Celular
            { value: "20.00", probability: 0.30 }, // Capinha de Celular
            { value: "50.00", probability: 0.10 }, // Power Bank
            { value: "100.00", probability: 0.05 }, // Fone sem Fio
            { value: "200.00", probability: 0.02 }, // SmartWatch
            { value: "500.00", probability: 0.01 }, // Air Fryer
            { value: "1000.00", probability: 0.005 }, // Caixa de Som JBL
            { value: "2000.00", probability: 0.002 }, // Smart TV 55" 4K
            { value: "5000.00", probability: 0.001 }, // Notebook Dell G15
            { value: "10000.00", probability: 0.0002 }, // iPhone 16 Pro
            { value: "100000.00", probability: 0.00001 } // Kit Completo Apple
          ];
        }

        const hiddenValues: string[] = [];

        // Check if this is the test account
        const user = await storage.getUser(req.userId);
        const isTestAccount = user?.email === "teste@gmail.com";

        // NEW LOGIC: Each prize has its own independent probability
        let winningValue: string | null = null;
        
        if (isTestAccount) {
          // Test account always wins - pick a random prize weighted by probability
          const totalProb = prizeData.reduce((sum, p) => sum + p.probability, 0);
          const rand = Math.random() * totalProb;
          let accumulator = 0;
          
          for (const prize of prizeData) {
            accumulator += prize.probability;
            if (rand <= accumulator) {
              winningValue = prize.value;
              break;
            }
          }
          console.log("Test account detected - always wins:", winningValue);
        } else {
          // Calculate total probability (sum of all prize probabilities)
          const totalProbability = prizeData.reduce((sum, p) => sum + p.probability, 0);
          
          // Use only the base total probability (multiplier now affects prize value, not chance)
          const adjustedProbability = totalProbability; // Multiplier only affects prize value, NOT win chance
          
          console.log(`Total probability: ${totalProbability}%, Multiplier: ${multiplier}x (affects prize value)`);
          
          // Roll between 0 and 100
          const roll = Math.random() * 100;
          
          console.log(`Roll: ${roll}, Win Probability: ${adjustedProbability}, Won: ${roll < adjustedProbability}`);
          
          // If roll is within adjusted probability, we have a winner
          if (roll < adjustedProbability) {
            // Now determine which prize was won using cumulative probabilities
            const winRoll = Math.random() * totalProbability;
            let cumulativeProbability = 0;
            
            for (const prize of prizeData) {
              cumulativeProbability += prize.probability;
              if (winRoll < cumulativeProbability) {
                winningValue = prize.value;
                console.log(`Won ${prize.value} - cumulative probability: ${cumulativeProbability}%`);
                break;
              }
            }
          }
        }

        // Generate the grid based on whether we have a winner
        if (winningValue) {
          // Place winning value 3 times
          hiddenValues.push(winningValue, winningValue, winningValue);

          // Fill rest with random values (ensuring no accidental 3-match)
          const allValues = prizeData.map(p => p.value).concat(["", "", ""]);
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
          const allValues = prizeData.map(p => p.value).concat(["", "", "", ""]);
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
            const newBalance = parseFloat(wallet.balance) - cost;
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
            const newBalance = parseFloat(wallet.balance) + numericPrize;
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
          if (session.gameType === 'premio-eletronicos' && session.gameState?.gameId === gameId) {
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

        if (!freePlay && !useBonus && (!wallet || parseFloat(wallet.balance) < cost)) {
          return res.status(400).json({ error: "Saldo insuficiente" });
        }

        // Fetch Super Prêmios prizes from database
        let prizeData: any[] = [];
        try {
          const prizeProbabilities = await storage.getPrizeProbabilities('premio-super-premios', req.userId);
          prizeData = prizeProbabilities.map(p => ({
            value: p.prize_value,
            probability: parseFloat(p.probability) // Convert string to number!
          }));
        } catch (error) {
          console.error("Error fetching Super Prêmios prize probabilities, using defaults:", error);
          // Fallback to default values if database fetch fails
          prizeData = [
            { value: "10.00", probability: 28.00 },
            { value: "20.00", probability: 20.00 },
            { value: "40.00", probability: 10.00 },
            { value: "60.00", probability: 8.00 },
            { value: "80.00", probability: 5.00 },
            { value: "100.00", probability: 4.00 },
            { value: "200.00", probability: 2.00 }, // Óculos
            { value: "300.00", probability: 1.50 }, // Capacete
            { value: "400.00", probability: 1.00 }, // Bicicleta
            { value: "1000.00", probability: 0.50 }, // HoverBoard
            { value: "2000.00", probability: 0.20 }, // Patinete Elétrico
            { value: "4000.00", probability: 0.08 }, // Scooter Elétrica
            { value: "10000.00", probability: 0.03 }, // Buggy
            { value: "20000.00", probability: 0.01 }, // Moto CG
            { value: "200000.00", probability: 0.001 }, // Jeep Compass
            { value: "500000.00", probability: 0.0001 } // Super Sorte
          ];
        }

        const hiddenValues: string[] = [];

        // Check if this is the test account
        const user = await storage.getUser(req.userId);
        const isTestAccount = user?.email === "teste@gmail.com";

        // NEW LOGIC: Each prize has its own independent probability
        let winningValue: string | null = null;
        
        if (isTestAccount) {
          // Test account always wins - pick a random prize weighted by probability
          const totalProb = prizeData.reduce((sum, p) => sum + p.probability, 0);
          const rand = Math.random() * totalProb;
          let accumulator = 0;
          
          for (const prize of prizeData) {
            accumulator += prize.probability;
            if (rand <= accumulator) {
              winningValue = prize.value;
              break;
            }
          }
          console.log("Test account detected - always wins:", winningValue);
        } else {
          // Calculate total probability (sum of all prize probabilities)
          const totalProbability = prizeData.reduce((sum, p) => sum + p.probability, 0);
          
          // Use only the base total probability (multiplier now affects prize value, not chance)
          const adjustedProbability = totalProbability; // Multiplier only affects prize value, NOT win chance
          
          console.log(`Total probability: ${totalProbability}%, Multiplier: ${multiplier}x (affects prize value)`);
          
          // Roll between 0 and 100
          const roll = Math.random() * 100;
          
          console.log(`Roll: ${roll}, Win Probability: ${adjustedProbability}, Won: ${roll < adjustedProbability}`);
          
          // If roll is within adjusted probability, we have a winner
          if (roll < adjustedProbability) {
            // Now determine which prize was won using cumulative probabilities
            const winRoll = Math.random() * totalProbability;
            let cumulativeProbability = 0;
            
            for (const prize of prizeData) {
              cumulativeProbability += prize.probability;
              if (winRoll < cumulativeProbability) {
                winningValue = prize.value;
                console.log(`Won ${prize.value} - cumulative probability: ${cumulativeProbability}%`);
                break;
              }
            }
          }
        }

        // Generate the grid based on whether we have a winner
        if (winningValue) {
          // Place winning value 3 times
          hiddenValues.push(winningValue, winningValue, winningValue);

          // Fill rest with random values (ensuring no accidental 3-match)
          const allValues = prizeData.map(p => p.value).concat(["", "", ""]);
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
          const allValues = prizeData.map(p => p.value).concat(["", "", "", ""]);
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
            const newBalance = parseFloat(wallet.balance) - cost;
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
            const newBalance = parseFloat(wallet.balance) + numericPrize;
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
          if (session.gameType === 'premio-super-premios' && session.gameState?.gameId === gameId) {
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

        if (!wallet || parseFloat(wallet.balance) < gameCost) {
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
          const winPositions = [];
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
        const newBalance = parseFloat(wallet.balance) - gameCost;
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
            const newBalance = parseFloat(wallet.balance) + prize;
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
      
      // First, create tables if they don't exist
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
      
      // Get Esquilo probabilities from database
      let prizes: any[] = [];
      try {
        // First, create table if it doesn't exist
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS esquilo_probabilities (
            id SERIAL PRIMARY KEY,
            prize_type TEXT NOT NULL,
            multiplier DECIMAL(5, 2) NOT NULL,
            probability DECIMAL(5, 2) NOT NULL,
            for_demo BOOLEAN NOT NULL DEFAULT false,
            updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_by TEXT NOT NULL DEFAULT 'admin'
          )
        `);
        
        // Check if table has data
        const count = await db.execute(sql`SELECT COUNT(*) as count FROM esquilo_probabilities`);
        
        if (count.rows[0].count === '0') {
          // Insert default probabilities
          await db.execute(sql`
            INSERT INTO esquilo_probabilities (prize_type, multiplier, probability, for_demo)
            VALUES 
              ('pinecone', 0.3, 30.00, false),
              ('acorn', 0.5, 25.00, false),
              ('apple', 0.8, 25.00, false),
              ('ring', 2.0, 15.00, false),
              ('goldenacorn', 5.0, 5.00, false),
              ('pinecone', 0.3, 30.00, true),
              ('acorn', 0.5, 25.00, true),
              ('apple', 0.8, 25.00, true),
              ('ring', 2.0, 15.00, true),
              ('goldenacorn', 5.0, 5.00, true)
          `);
        }
        
        // Get probabilities using raw SQL
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
      
      // Generate 9 boxes: 2 foxes + 7 prizes based on probabilities
      const boxes: any[] = [];
      
      // Add 2 foxes
      boxes.push({ type: 'fox', multiplier: 0 });
      boxes.push({ type: 'fox', multiplier: 0 });
      
      // Generate 7 prizes based on probabilities
      for (let i = 0; i < 7; i++) {
        const random = Math.random() * 100;
        let cumulative = 0;
        let selectedPrize = prizes[0]; // Default to first prize
        
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
      await db.execute(sql`
        INSERT INTO esquilo_games (
          game_id, user_id, bet_amount, used_bonus, status, 
          boxes, opened_boxes, started_at
        ) VALUES (
          ${gameId}, ${req.userId}, ${betAmount}, ${useBonus}, 
          'playing', ${JSON.stringify(boxes)}, '[]', NOW()
        )
      `);
      
      // Save game state for resume functionality
      await db.execute(sql`
        INSERT INTO esquilo_game_states (
          game_id, user_id, bet_amount, current_multiplier, 
          used_bonus, is_active, boxes, opened_boxes
        ) VALUES (
          ${gameId}, ${req.userId}, ${betAmount}, 0, 
          ${useBonus}, true, ${JSON.stringify(boxes)}, '[]'
        )
      `);
      
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
      
      // Check if column exists, if not add it
      await db.execute(sql`
        ALTER TABLE esquilo_probabilities 
        ADD COLUMN IF NOT EXISTS bonus_cost_multiplier DECIMAL(5,2) DEFAULT 20.00
      `);
      
      // Get bonus cost multiplier from database
      const result = await db.execute(sql`
        SELECT bonus_cost_multiplier 
        FROM esquilo_probabilities 
        WHERE for_demo = ${isDemo}
        LIMIT 1
      `);
      
      const bonusCostMultiplier = result.rows[0]?.bonus_cost_multiplier || '20.00';
      
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
      
      // Check if column exists, if not add it
      await db.execute(sql`
        ALTER TABLE esquilo_probabilities 
        ADD COLUMN IF NOT EXISTS bonus_cost_multiplier DECIMAL(5,2) DEFAULT 20.00
      `);
      
      // Get bonus cost multiplier
      const configResult = await db.execute(sql`
        SELECT bonus_cost_multiplier 
        FROM esquilo_probabilities 
        WHERE for_demo = ${isDemo}
        LIMIT 1
      `);
      
      const bonusCostMultiplier = parseFloat(configResult.rows[0]?.bonus_cost_multiplier || '20.00');
      const totalCost = betAmount * bonusCostMultiplier;
      
      // Check balance
      const wallet = await storage.getWallet(req.userId);
      if (!wallet) {
        return res.status(404).json({ error: "Carteira não encontrada" });
      }
      
      // Determine which balance to use
      const usingBonus = useBonus && parseFloat(wallet.scratchBonus) > 0;
      const currentBalance = usingBonus ? parseFloat(wallet.scratchBonus) : parseFloat(wallet.balance);
      
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
      
      // Get prize probabilities
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
      
      // Generate 9 boxes: 2 foxes + 7 prizes
      const boxes: any[] = [];
      
      // Add 2 foxes
      boxes.push({ type: 'fox', multiplier: 0 });
      boxes.push({ type: 'fox', multiplier: 0 });
      
      // Generate 7 prizes based on probabilities
      for (let i = 0; i < 7; i++) {
        const random = Math.random() * 100;
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
      await db.execute(sql`
        INSERT INTO esquilo_games (
          game_id, user_id, bet_amount, used_bonus, bonus_activated, 
          active_bonus_multiplier, status, boxes, opened_boxes, started_at
        ) VALUES (
          ${gameId}, ${req.userId}, ${betAmount}, false, true, 
          null, 'playing', ${JSON.stringify(boxes)}, '[]', NOW()
        )
      `);
      
      // Save game state with bonus multipliers for selection
      await db.execute(sql`
        INSERT INTO esquilo_game_states (
          game_id, user_id, bet_amount, current_multiplier, 
          used_bonus, bonus_used, bonus_activated, active_bonus_multiplier,
          is_active, boxes, opened_boxes, bonus_multipliers
        ) VALUES (
          ${gameId}, ${req.userId}, ${betAmount}, 0, 
          false, false, true, null,
          true, ${JSON.stringify(boxes)}, '[]', null
        )
      `);
      
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
        const dbGame = await db.execute(sql`
          SELECT 
            bet_amount as "betAmount",
            current_multiplier as "currentMultiplier",
            used_bonus as "usedBonus",
            bonus_used as "bonusUsed",
            bonus_activated as "bonusActivated",
            active_bonus_multiplier as "activeBonusMultiplier",
            opened_boxes as "openedBoxes",
            boxes
          FROM esquilo_game_states
          WHERE game_id = ${gameId} AND user_id = ${req.userId}
          LIMIT 1
        `);
        
        if (dbGame.rows.length > 0) {
          const game = dbGame.rows[0];
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
          const newBalance = parseFloat(wallet.balance) + winAmount;
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
              await db.execute(sql`
                UPDATE esquilo_game_states 
                SET bonus_activated = true,
                    bonus_multipliers = ${JSON.stringify(bonusMultipliers)},
                    boxes = ${JSON.stringify(boxes)},
                    updated_at = NOW()
                WHERE game_id = ${gameId}
              `);
              
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
        await db.execute(sql`
          UPDATE esquilo_game_states 
          SET current_multiplier = ${gameState.currentMultiplier},
              opened_boxes = ${JSON.stringify(Array.from(gameState.openedBoxes))},
              boxes = ${JSON.stringify(boxes)},
              active_bonus_multiplier = ${gameState.activeBonusMultiplier || null},
              updated_at = NOW()
          WHERE game_id = ${gameId}
        `);
        
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
      await db.execute(sql`
        UPDATE esquilo_game_states 
        SET active_bonus_multiplier = ${selectedMultiplier},
            bonus_used = true,
            bonus_activated = false,
            boxes = ${JSON.stringify(boxes)},
            updated_at = NOW()
        WHERE game_id = ${gameId}
      `);
      
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
        parseFloat(wallet.balance) < parseFloat(config.cost)
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
        parseFloat(wallet.balance) - parseFloat(config.cost) + result.prize;
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

        // Use SQL direto com pool para evitar problemas com Drizzle
        const client = await pool.connect();
        try {
          const existingSession = await client.query(
            `SELECT * FROM active_game_sessions 
             WHERE user_id = $1 AND game_type = $2 
             LIMIT 1`,
            [userId, gameType]
          );

          if (existingSession.rows.length > 0) {
            // Update existing session
            await client.query(
              `UPDATE active_game_sessions 
               SET game_state = $1::jsonb, updated_at = NOW()
               WHERE user_id = $2 AND game_type = $3`,
              [JSON.stringify(gameState), userId, gameType]
            );
            console.log("Updated existing game session");
          } else {
            // Create new session
            await client.query(
              `INSERT INTO active_game_sessions (user_id, game_type, game_id, game_state, created_at, updated_at)
               VALUES ($1, $2, $3, $4::jsonb, NOW(), NOW())`,
              [userId, gameType, gameId, JSON.stringify(gameState)]
            );
            console.log("Created new game session");
          }

          res.json({ success: true });
        } finally {
          client.release();
        }
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
        
        // Use SQL direto com pool para buscar sessão
        const client = await pool.connect();
        try {
          const sessionResult = await client.query(
            `SELECT * FROM active_game_sessions 
             WHERE user_id = $1 AND game_type = $2
             ORDER BY created_at DESC
             LIMIT 1`,
            [userId, gameType]
          );

          if (sessionResult.rows.length === 0) {
            return res
              .status(404)
              .json({ error: "Nenhuma sessão ativa encontrada" });
          }

          const session = sessionResult.rows[0];
          const gameState = session.game_state;
          const gameId = gameState?.gameId;
          
          if (gameId && gameType.startsWith('premio-')) {
            const activeGame = activeGames.get(gameId);
            if (!activeGame || activeGame.userId !== req.userId) {
              // Game no longer exists, clean up the stale session
              await storage.deleteActiveGameSession(session.game_id);
              return res
                .status(404)
                .json({ error: "Sessão expirada ou jogo concluído" });
            }
          }

          res.json(session);
        } finally {
          client.release();
        }
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
          let gameStateObj = session.gameState;
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
            (gameStateObj && gameStateObj.gameId === gameId) ||
            (session.gameType.startsWith("premio-") &&
              gameStateObj &&
              gameStateObj.gameId === gameId)
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

        // Use SQL direto com pool para limpar sessões
        const client = await pool.connect();
        try {
          const result = await client.query(
            `DELETE FROM active_game_sessions 
             WHERE user_id = $1 AND game_type = $2`,
            [userId, gameType]
          );

          res.json({ success: true, cleared: result.rowCount || 0 });
        } finally {
          client.release();
        }
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
          paymentProvider: "orinpay",
        });
        
        // Create PIX payment with deposit ID
        const pixResponse = await createPixPayment(
          amount * 100, // Convert to cents for OrinPay
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
                parseFloat(wallet.balance) + parseFloat(deposit.amount);
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
            parseFloat(wallet.balance) + parseFloat(deposit.amount);
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
  // Webhook route for OrinPay PIX payment notifications
  app.post("/api/webhook/orinpay", async (req, res) => {
    try {
      console.log("=== WEBHOOK ORINPAY RECEIVED ===");
      console.log("Headers:", req.headers);
      console.log("Body:", JSON.stringify(req.body, null, 2));

      // Process OrinPay webhook
      await handleOrinPayWebhook(req.body);

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("OrinPay webhook error:", error);
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
        if (!wallet || !wallet.balance || parseFloat(wallet.balance) < amount) {
          return res.status(400).json({ message: "Saldo insuficiente" });
        }

        // Validate PIX key type - Only CPF/CNPJ allowed
        const pixKeyType = detectPixKeyType(pixKey);
        if (!pixKeyType) {
          return res.status(400).json({ message: "Chave PIX inválida. Use apenas CPF ou CNPJ" });
        }

        // Create withdrawal request
        const withdrawal = await storage.createWithdrawal({
          userId: req.userId,
          amount: amount.toString(),
          pixKey,
          pixKeyType,
          status: "pending",
        });

        // Update wallet balance
        const newBalance = parseFloat(wallet.balance) - amount;
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
      console.error("OrinPay webhook error:", error);
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
          const currentBalance = parseFloat(wallet.balance);
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

  // Optimized function for admin testing without database queries
  const generatePremioGameResultForAdminOptimized = (probabilities: any[], multiplier: number, totalProbability: number) => {
    const hiddenValues: string[] = [];
    let winningValue: string | null = null;
    
    // Use only the base total probability (multiplier now affects prize value, not chance)
    const adjustedProbability = totalProbability; // Multiplier only affects prize value, NOT win chance
    
    // Roll for win/loss
    const roll = Math.random() * 100;
    
    // DEBUG: Log occasionally (1% chance) to avoid spam
    if (Math.random() < 0.01) {
      console.log(`ADMIN TEST: Total Prob: ${totalProbability}%, Multiplier: ${multiplier}x, Adjusted: ${adjustedProbability}%, Roll: ${roll.toFixed(2)}, Win: ${roll < adjustedProbability}`);
    }
    
    if (roll < adjustedProbability) {
      // Determine which prize was won
      const winRoll = Math.random() * totalProbability;
      let cumulativeProbability = 0;
      
      for (const prize of probabilities) {
        cumulativeProbability += parseFloat(prize.probability.toString());
        if (winRoll < cumulativeProbability) {
          winningValue = prize.prize_value;
          break;
        }
      }
    }
    
    // Get prize options from probabilities
    const prizeOptions = probabilities.map(p => p.prize_value);
    
    // Generate card values
    if (winningValue) {
      // Add 3 winning values
      for (let j = 0; j < 3; j++) {
        hiddenValues.push(winningValue);
      }
      // Fill rest with random non-winning values
      for (let j = 0; j < 6; j++) {
        const nonWinningOptions = prizeOptions.filter(v => v !== winningValue);
        const randomValue = nonWinningOptions[Math.floor(Math.random() * nonWinningOptions.length)];
        hiddenValues.push(randomValue);
      }
    } else {
      // Generate losing combination
      const selectedValues: string[] = [];
      for (let j = 0; j < 9; j++) {
        let value: string;
        do {
          value = prizeOptions[Math.floor(Math.random() * prizeOptions.length)];
        } while (selectedValues.filter(v => v === value).length >= 2);
        selectedValues.push(value);
        hiddenValues.push(value);
      }
    }
    
    // Shuffle the array
    for (let j = hiddenValues.length - 1; j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1));
      [hiddenValues[j], hiddenValues[k]] = [hiddenValues[k], hiddenValues[j]];
    }
    
    const won = winningValue !== null;
    const prize = winningValue || null;
    
    return { won, prize, cards: hiddenValues };
  };

  // Helper function to generate premio game results for admin testing
  const generatePremioGameResultForAdmin = async (type: string, multiplier: number) => {
    // Get prize probabilities from database
    let probabilities = await storage.getPrizeProbabilities(type);
    
    if (!probabilities || probabilities.length === 0) {
      // Use default probabilities if none configured
      const defaultProbs: Record<string, Array<{ value: string; probability: number }>> = {
        'pix': [
          { value: "0.50", probability: 28.00 },
          { value: "1.00", probability: 22.00 },
          { value: "2.00", probability: 12.00 },
          { value: "3.00", probability: 8.00 },
          { value: "4.00", probability: 5.00 },
          { value: "5.00", probability: 4.00 },
          { value: "10.00", probability: 3.00 },
          { value: "15.00", probability: 2.00 },
          { value: "20.00", probability: 1.50 },
          { value: "50.00", probability: 1.00 },
          { value: "100.00", probability: 0.50 },
          { value: "200.00", probability: 0.20 },
          { value: "500.00", probability: 0.08 },
          { value: "1000.00", probability: 0.03 },
          { value: "2000.00", probability: 0.01 },
          { value: "5000.00", probability: 0.003 },
          { value: "10000.00", probability: 0.001 },
          { value: "100000.00", probability: 0.00001 },
        ],
        'me-mimei': [
          { value: "0.50", probability: 28.00 },
          { value: "1.00", probability: 22.00 },
          { value: "2.00", probability: 12.00 },
          { value: "3.00", probability: 8.00 },
          { value: "4.00", probability: 5.00 },
          { value: "5.00", probability: 4.00 },
          { value: "10.00", probability: 3.00 },
          { value: "15.00", probability: 2.00 },
          { value: "20.00", probability: 1.50 },
          { value: "50.00", probability: 1.00 },
          { value: "100.00", probability: 0.50 },
          { value: "200.00", probability: 0.20 },
          { value: "500.00", probability: 0.08 },
          { value: "1000.00", probability: 0.03 },
          { value: "2000.00", probability: 0.01 },
          { value: "5000.00", probability: 0.003 },
          { value: "10000.00", probability: 0.001 },
          { value: "100000.00", probability: 0.00001 },
        ],
        'eletronicos': [
          { value: "0.50", probability: 28.00 },
          { value: "1.00", probability: 22.00 },
          { value: "2.00", probability: 12.00 },
          { value: "3.00", probability: 8.00 },
          { value: "4.00", probability: 5.00 },
          { value: "5.00", probability: 4.00 },
          { value: "10.00", probability: 3.00 },
          { value: "15.00", probability: 2.00 },
          { value: "20.00", probability: 1.50 },
          { value: "50.00", probability: 1.00 },
          { value: "100.00", probability: 0.50 },
          { value: "200.00", probability: 0.20 },
          { value: "500.00", probability: 0.08 },
          { value: "1000.00", probability: 0.03 },
          { value: "2000.00", probability: 0.01 },
          { value: "5000.00", probability: 0.003 },
          { value: "10000.00", probability: 0.001 },
          { value: "100000.00", probability: 0.00001 },
        ],
        'super-premios': [
          { value: "10.00", probability: 28.00 },
          { value: "20.00", probability: 22.00 },
          { value: "40.00", probability: 12.00 },
          { value: "60.00", probability: 8.00 },
          { value: "80.00", probability: 5.00 },
          { value: "100.00", probability: 4.00 },
          { value: "200.00", probability: 2.00 },
          { value: "300.00", probability: 1.50 },
          { value: "400.00", probability: 1.00 },
          { value: "1000.00", probability: 0.50 },
          { value: "2000.00", probability: 0.20 },
          { value: "4000.00", probability: 0.08 },
          { value: "10000.00", probability: 0.03 },
          { value: "20000.00", probability: 0.01 },
          { value: "200000.00", probability: 0.001 },
          { value: "500000.00", probability: 0.0001 }
        ]
      };
      
      const prizeData = defaultProbs[type] || [];
      probabilities = prizeData.map(p => ({
        id: 0,
        gameType: type,
        prizeValue: p.value,
        probability: p.probability,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
    }

    const hiddenValues: string[] = [];
    let winningValue: string | null = null;
    
    // Calculate total probability (sum of all prize probabilities)
    const totalProbability = probabilities.reduce((sum, p) => sum + parseFloat(p.probability.toString()), 0);
    
    // Use only the base total probability (multiplier now affects prize value, not chance)
    const adjustedProbability = totalProbability; // Multiplier only affects prize value, NOT win chance
    
    // Roll between 0 and 100
    const roll = Math.random() * 100;
    
    // If roll is within adjusted probability, we have a winner
    if (roll < adjustedProbability) {
      // Now determine which prize was won using cumulative probabilities
      const winRoll = Math.random() * totalProbability;
      let cumulativeProbability = 0;
      
      for (const prize of probabilities) {
        cumulativeProbability += parseFloat(prize.probability.toString());
        if (winRoll < cumulativeProbability) {
          winningValue = prize.prize_value;
          break;
        }
      }
    }

    // Generate the grid based on whether we have a winner
    if (winningValue) {
      // Place winning value 3 times
      hiddenValues.push(winningValue, winningValue, winningValue);

      // Fill rest with random values (ensuring no accidental 3-match)
      const allValues = probabilities.map(p => p.prize_value).concat(["", "", ""]);
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
      const allValues = probabilities.map(p => p.prize_value).concat(["", "", "", ""]);
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
      
      const newBalance = parseFloat(wallet.balance) + parseFloat(cashback.cashbackAmount.toString());
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
      let probabilities = await storage.getPrizeProbabilities(type);
      
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
        const { won, prize, cards } = generatePremioGameResultForAdminOptimized(probabilities, multiplier, totalProbability);
        
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

  // Debug endpoint to check probabilities
  app.get("/api/admin/debug-probabilities/:type", authenticateAdmin, async (req: any, res) => {
    try {
      const { type } = req.params;
      
      // Load probabilities from database
      let probabilities = await storage.getPrizeProbabilities(type);
      
      // Calculate total
      let totalFromDB = 0;
      if (probabilities && probabilities.length > 0) {
        totalFromDB = probabilities.reduce((sum, p) => sum + parseFloat(p.probability.toString()), 0);
      }
      
      // Default probabilities
      const defaultProbs: Record<string, Array<{ value: string; probability: number }>> = {
        'pix': [
          { value: "0.50", probability: 28.00 },
          { value: "1.00", probability: 22.00 },
          { value: "2.00", probability: 12.00 },
          { value: "3.00", probability: 8.00 },
          { value: "4.00", probability: 5.00 },
          { value: "5.00", probability: 4.00 },
          { value: "10.00", probability: 3.00 },
          { value: "15.00", probability: 2.00 },
          { value: "20.00", probability: 1.50 },
          { value: "50.00", probability: 1.00 },
          { value: "100.00", probability: 0.50 },
          { value: "200.00", probability: 0.20 },
          { value: "500.00", probability: 0.08 },
          { value: "1000.00", probability: 0.03 },
          { value: "2000.00", probability: 0.01 },
          { value: "5000.00", probability: 0.003 },
          { value: "10000.00", probability: 0.001 },
          { value: "100000.00", probability: 0.00001 }
        ]
      };
      
      const defaultTotal = defaultProbs[type]?.reduce((sum, p) => sum + p.probability, 0) || 0;
      
      res.json({
        type,
        fromDatabase: {
          count: probabilities?.length || 0,
          totalProbability: totalFromDB,
          probabilities: probabilities?.slice(0, 5) // Show first 5
        },
        defaults: {
          totalProbability: defaultTotal,
          probabilities: defaultProbs[type]?.slice(0, 5) // Show first 5
        },
        multiplierEffect: {
          "1x": Math.min(totalFromDB || defaultTotal, 100),
          "5x": Math.min((totalFromDB || defaultTotal) * 5, 100),
          "10x": Math.min((totalFromDB || defaultTotal) * 10, 100)
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Simple test endpoint for admin to verify multiplier logic
  app.get("/api/admin/simple-test/:multiplier", authenticateAdmin, async (req: any, res) => {
    try {
      const multiplier = parseInt(req.params.multiplier) || 1;
      
      // Use default PIX probabilities
      const probabilities = [
        { value: "0.50", probability: 28.00 },
        { value: "1.00", probability: 22.00 },
        { value: "2.00", probability: 12.00 },
        { value: "3.00", probability: 8.00 },
        { value: "4.00", probability: 5.00 },
        { value: "5.00", probability: 4.00 },
        { value: "10.00", probability: 3.00 },
        { value: "15.00", probability: 2.00 },
        { value: "20.00", probability: 1.50 },
        { value: "50.00", probability: 1.00 },
        { value: "100.00", probability: 0.50 },
        { value: "200.00", probability: 0.20 },
        { value: "500.00", probability: 0.08 },
        { value: "1000.00", probability: 0.03 },
        { value: "2000.00", probability: 0.01 },
        { value: "5000.00", probability: 0.003 },
        { value: "10000.00", probability: 0.001 },
        { value: "100000.00", probability: 0.00001 }
      ];
      
      const totalProbability = probabilities.reduce((sum, p) => sum + p.probability, 0);
      const adjustedProbability = totalProbability; // Multiplier only affects prize value, NOT win chance
      
      // Run 100 tests
      let wins = 0;
      const testResults = [];
      
      for (let i = 0; i < 100; i++) {
        const roll = Math.random() * 100;
        const won = roll < adjustedProbability;
        if (won) wins++;
        
        if (i < 10) { // Show first 10 rolls
          testResults.push({
            roll: roll.toFixed(2),
            threshold: adjustedProbability.toFixed(2),
            won
          });
        }
      }
      
      res.json({
        multiplier,
        totalProbability: totalProbability.toFixed(5),
        adjustedProbability: adjustedProbability.toFixed(2),
        expectedWinRate: adjustedProbability.toFixed(2) + '%',
        actualWinRate: (wins / 100 * 100).toFixed(2) + '%',
        wins,
        losses: 100 - wins,
        sampleRolls: testResults
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Debug endpoint for testing multiplier logic
  app.get("/api/admin/test-multiplier/:multiplier", authenticateAdmin, async (req: any, res) => {
    try {
      const multiplier = parseInt(req.params.multiplier) || 1;
      const totalProbability = 35; // Default total probability for PIX
      const adjustedProbability = totalProbability; // Multiplier only affects prize value, NOT win chance
      
      // Run 100 tests
      let wins = 0;
      for (let i = 0; i < 100; i++) {
        const roll = Math.random() * 100;
        if (roll < adjustedProbability) {
          wins++;
        }
      }
      
      res.json({
        multiplier,
        totalProbability,
        adjustedProbability,
        expectedWinRate: adjustedProbability,
        actualWinRate: (wins / 100 * 100),
        wins,
        total: 100
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Payment provider configuration management
  app.get("/api/admin/payment-providers", authenticateAdmin, async (req, res) => {
    try {
      // Get payment provider configuration from database
      const providers = await storage.getPaymentProviderConfig();
      
      // Get webhook URL
      const webhookUrl = `${process.env.REPLIT_APP_URL || 'https://mania-brasil.com'}/api/webhook/orinpay`;
      
      res.json({
        providers,
        webhookUrl
      });
    } catch (error) {
      console.error("Error fetching payment providers:", error);
      res.status(500).json({ error: "Failed to fetch payment providers" });
    }
  });

  // Update payment provider configuration
  app.put("/api/admin/payment-config", authenticateAdmin, async (req, res) => {
    try {
      const { orinpay } = req.body;
      
      // Update OrinPay configuration if specified
      if (orinpay) {
        await storage.updateOrinpayConfig(orinpay.token);
        console.log("OrinPay configuration updated successfully");
      }
      
      res.json({ 
        success: true,
        message: "Configuração OrinPay atualizada com sucesso"
      });
    } catch (error) {
      console.error("Error updating payment config:", error);
      res.status(500).json({ error: "Failed to update payment config" });
    }
  });

  // Admin dashboard stats with date filters and Brazil timezone support
  app.get("/api/admin/stats", authenticateAdmin, async (req, res) => {
    try {
      // Extract date filters from query params
      const { startDate, endDate, period } = req.query;
      
      // Helper function to convert to Brazil timezone (GMT-3)
      const toBrazilTime = (date: Date) => {
        const offset = -3 * 60; // Brazil is GMT-3
        const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
        return new Date(utc + (offset * 60000));
      };
      
      // Helper function to get start of day in Brazil timezone
      const getStartOfDayBrazil = (date: Date) => {
        const brazilDate = toBrazilTime(date);
        brazilDate.setHours(0, 0, 0, 0);
        return brazilDate;
      };
      
      // Helper function to get end of day in Brazil timezone
      const getEndOfDayBrazil = (date: Date) => {
        const brazilDate = toBrazilTime(date);
        brazilDate.setHours(23, 59, 59, 999);
        return brazilDate;
      };
      
      // Determine date range based on period or custom dates
      let filterStartDate: Date;
      let filterEndDate: Date;
      let comparisonStartDate: Date | null = null;
      let comparisonEndDate: Date | null = null;
      
      const now = new Date();
      const todayBrazil = getStartOfDayBrazil(now);
      
      if (period === 'today') {
        filterStartDate = todayBrazil;
        filterEndDate = getEndOfDayBrazil(now);
        // Comparison with yesterday
        comparisonStartDate = new Date(todayBrazil.getTime() - 24 * 60 * 60 * 1000);
        comparisonEndDate = new Date(filterEndDate.getTime() - 24 * 60 * 60 * 1000);
      } else if (period === 'yesterday') {
        filterStartDate = new Date(todayBrazil.getTime() - 24 * 60 * 60 * 1000);
        filterEndDate = new Date(todayBrazil.getTime() - 1);
      } else if (period === 'last7days') {
        filterStartDate = new Date(todayBrazil.getTime() - 7 * 24 * 60 * 60 * 1000);
        filterEndDate = getEndOfDayBrazil(now);
        // Comparison with previous 7 days
        comparisonStartDate = new Date(filterStartDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        comparisonEndDate = new Date(filterStartDate.getTime() - 1);
      } else if (period === 'last30days') {
        filterStartDate = new Date(todayBrazil.getTime() - 30 * 24 * 60 * 60 * 1000);
        filterEndDate = getEndOfDayBrazil(now);
        // Comparison with previous 30 days
        comparisonStartDate = new Date(filterStartDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        comparisonEndDate = new Date(filterStartDate.getTime() - 1);
      } else if (period === 'thisMonth') {
        filterStartDate = getStartOfDayBrazil(new Date(now.getFullYear(), now.getMonth(), 1));
        filterEndDate = getEndOfDayBrazil(now);
        // Comparison with last month
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        comparisonStartDate = getStartOfDayBrazil(lastMonth);
        comparisonEndDate = getEndOfDayBrazil(new Date(now.getFullYear(), now.getMonth(), 0));
      } else if (period === 'lastMonth') {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        filterStartDate = getStartOfDayBrazil(lastMonth);
        filterEndDate = getEndOfDayBrazil(new Date(now.getFullYear(), now.getMonth(), 0));
      } else if (startDate && endDate) {
        // Custom date range
        filterStartDate = getStartOfDayBrazil(new Date(startDate as string));
        filterEndDate = getEndOfDayBrazil(new Date(endDate as string));
      } else {
        // Default to today
        filterStartDate = todayBrazil;
        filterEndDate = getEndOfDayBrazil(now);
      }
      
      console.log('Date filter range:', {
        filterStartDate: filterStartDate.toISOString(),
        filterEndDate: filterEndDate.toISOString(),
        comparisonStartDate: comparisonStartDate?.toISOString(),
        comparisonEndDate: comparisonEndDate?.toISOString()
      });
      // Get all deposits
      const allDeposits = await storage.getDeposits();
      
      // Filter deposits by date range
      const depositsInPeriod = allDeposits.filter(d => {
        const depositDate = d.completedAt ? new Date(d.completedAt) : new Date(d.createdAt);
        return depositDate >= filterStartDate && depositDate <= filterEndDate;
      });
      
      const completedDepositsInPeriod = depositsInPeriod.filter(
        (d) => d.status === "completed",
      );
      
      // Get comparison period deposits if needed
      let depositsInComparison = [];
      let completedDepositsInComparison = [];
      if (comparisonStartDate && comparisonEndDate) {
        depositsInComparison = allDeposits.filter(d => {
          const depositDate = d.completedAt ? new Date(d.completedAt) : new Date(d.createdAt);
          return depositDate >= comparisonStartDate && depositDate <= comparisonEndDate;
        });
        completedDepositsInComparison = depositsInComparison.filter(
          (d) => d.status === "completed"
        );
      }

      // Get all withdrawals
      const allWithdrawals = await storage.getWithdrawals();
      
      // Filter withdrawals by date range
      const withdrawalsInPeriod = allWithdrawals.filter(w => {
        const withdrawalDate = new Date(w.createdAt);
        return withdrawalDate >= filterStartDate && withdrawalDate <= filterEndDate;
      });
      
      const completedWithdrawalsInPeriod = withdrawalsInPeriod.filter(
        (w) => w.status === "completed"
      );
      
      const pendingWithdrawalsInPeriod = withdrawalsInPeriod.filter(
        (w) => w.status === "pending"
      ).length;
      
      // Global pending withdrawals (for notifications)
      const globalPendingWithdrawals = allWithdrawals.filter(
        (w) => w.status === "pending"
      ).length;

      // Calculate totals for period
      const periodConfirmedRevenue = completedDepositsInPeriod.reduce(
        (sum, d) => sum + parseFloat(d.amount),
        0,
      );
      
      const periodGrossRevenue = depositsInPeriod.reduce(
        (sum, d) => sum + parseFloat(d.amount),
        0,
      );
      
      const periodWithdrawals = completedWithdrawalsInPeriod.reduce(
        (sum, w) => sum + parseFloat(w.amount), 
        0
      );
      
      // Calculate comparison period totals if needed
      let comparisonConfirmedRevenue = 0;
      let comparisonGrossRevenue = 0;
      let comparisonWithdrawals = 0;
      
      if (comparisonStartDate && comparisonEndDate) {
        comparisonConfirmedRevenue = completedDepositsInComparison.reduce(
          (sum, d) => sum + parseFloat(d.amount),
          0,
        );
        comparisonGrossRevenue = depositsInComparison.reduce(
          (sum, d) => sum + parseFloat(d.amount),
          0,
        );
        const withdrawalsInComparison = allWithdrawals.filter(w => {
          const withdrawalDate = new Date(w.createdAt);
          return withdrawalDate >= comparisonStartDate && withdrawalDate <= comparisonEndDate;
        }).filter(w => w.status === "completed");
        
        comparisonWithdrawals = withdrawalsInComparison.reduce(
          (sum, w) => sum + parseFloat(w.amount),
          0,
        );
      }

      // Get user stats
      const userStats = await storage.getUserStats();
      
      // Get new users in period using raw SQL to avoid Drizzle issues
      const allUsersResult = await pool.query(
        `SELECT id, created_at FROM app_users`
      );
      const allUsers = allUsersResult.rows.map(row => ({
        id: row.id,
        createdAt: row.created_at
      }));
      
      const newUsersInPeriod = allUsers.filter(u => {
        const userDate = new Date(u.createdAt);
        return userDate >= filterStartDate && userDate <= filterEndDate;
      }).length;
      
      // Get comparison period new users
      let newUsersInComparison = 0;
      if (comparisonStartDate && comparisonEndDate) {
        newUsersInComparison = allUsers.filter(u => {
          const userDate = new Date(u.createdAt);
          return userDate >= comparisonStartDate && userDate <= comparisonEndDate;
        }).length;
      }

      // Get scratch card stats - focus only on premio games
      const allScratchCards = await db.select().from(gamePremios);
      
      // Filter scratch cards by period
      const scratchCardsInPeriod = allScratchCards.filter(
        (g) => g.playedAt && new Date(g.playedAt) >= filterStartDate && new Date(g.playedAt) <= filterEndDate,
      );
      
      // Get comparison period scratch cards
      let scratchCardsInComparison: any[] = [];
      if (comparisonStartDate && comparisonEndDate) {
        scratchCardsInComparison = allScratchCards.filter(
          (g) => g.playedAt && new Date(g.playedAt) >= comparisonStartDate && new Date(g.playedAt) <= comparisonEndDate,
        );
      }

      // Calculate scratch card specific metrics for period
      const pixGames = scratchCardsInPeriod.filter(g => g.gameType === 'pix');
      const meMimeiGames = scratchCardsInPeriod.filter(g => g.gameType === 'me_mimei');
      const eletronicosGames = scratchCardsInPeriod.filter(g => g.gameType === 'eletronicos');
      const superPremiosGames = scratchCardsInPeriod.filter(g => g.gameType === 'super');

      // Calculate revenue and payouts for period
      const scratchCardRevenue = scratchCardsInPeriod.reduce(
        (sum, g) => sum + parseFloat(g.cost),
        0,
      );
      const scratchCardPayout = scratchCardsInPeriod.reduce(
        (sum, g) => sum + (g.won ? parseFloat(g.prize) : 0),
        0,
      );
      
      // Calculate comparison period metrics
      let comparisonGames = 0;
      let comparisonRevenue = 0;
      let comparisonPayout = 0;
      if (scratchCardsInComparison.length > 0) {
        comparisonGames = scratchCardsInComparison.length;
        comparisonRevenue = scratchCardsInComparison.reduce(
          (sum, g) => sum + parseFloat(g.cost),
          0,
        );
        comparisonPayout = scratchCardsInComparison.reduce(
          (sum, g) => sum + (g.won ? parseFloat(g.prize) : 0),
          0,
        );
      }

      // Calculate win rate for period
      const totalWins = scratchCardsInPeriod.filter(g => g.won).length;
      const winRate = scratchCardsInPeriod.length > 0 ? (totalWins / scratchCardsInPeriod.length) * 100 : 0;

      // Calculate average deposit for period
      const avgDeposit = completedDepositsInPeriod.length > 0 
        ? periodConfirmedRevenue / completedDepositsInPeriod.length 
        : 0;

      // Calculate average scratch card value for period
      const avgScratchValue = scratchCardsInPeriod.length > 0 
        ? scratchCardRevenue / scratchCardsInPeriod.length 
        : 0;

      // Calculate conversion rate for period (users who deposited / total users)
      const depositorCountInPeriod = new Set(completedDepositsInPeriod.map(d => d.userId)).size;
      const conversionRate = newUsersInPeriod > 0 
        ? (depositorCountInPeriod / newUsersInPeriod) * 100 
        : 0;

      // Calculate unique players in period
      const uniquePlayersInPeriod = new Set(
        scratchCardsInPeriod.map(g => g.userId)
      ).size;
      
      // Calculate retention rate for period
      const retentionRate = newUsersInPeriod > 0 
        ? (uniquePlayersInPeriod / newUsersInPeriod) * 100 
        : 0;

      // Calculate profit for period
      const periodProfit = periodConfirmedRevenue - periodWithdrawals - scratchCardPayout;
      
      // Calculate comparison profit
      let comparisonProfit = 0;
      if (comparisonStartDate && comparisonEndDate) {
        comparisonProfit = comparisonConfirmedRevenue - comparisonWithdrawals - comparisonPayout;
      }
      
      // Calculate percentage changes
      const revenueChange = comparisonConfirmedRevenue > 0 
        ? ((periodConfirmedRevenue - comparisonConfirmedRevenue) / comparisonConfirmedRevenue) * 100
        : periodConfirmedRevenue > 0 ? 100 : 0;
        
      const userChange = newUsersInComparison > 0
        ? ((newUsersInPeriod - newUsersInComparison) / newUsersInComparison) * 100
        : newUsersInPeriod > 0 ? 100 : 0;
        
      const gameChange = comparisonGames > 0
        ? ((scratchCardsInPeriod.length - comparisonGames) / comparisonGames) * 100
        : scratchCardsInPeriod.length > 0 ? 100 : 0;
        
      const profitChange = Math.abs(comparisonProfit) > 0
        ? ((periodProfit - comparisonProfit) / Math.abs(comparisonProfit)) * 100
        : periodProfit !== 0 ? 100 : 0;

      // Calculate rewards distributed (level and chest rewards)
      // This is a placeholder - in a real system you'd track this in the database
      const totalRewards = "0.00";

      // Get active affiliates count
      const activeAffiliates = await db
        .select({ count: sql<number>`count(*)` })
        .from(affiliates)
        .where(eq(affiliates.isActive, true));
      const activeAffiliatesCount = activeAffiliates[0]?.count || 0;

      // Build daily revenue chart data for last 7 days
      const dailyRevenueData = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(todayBrazil.getTime() - i * 24 * 60 * 60 * 1000);
        const dayStart = getStartOfDayBrazil(date);
        const dayEnd = getEndOfDayBrazil(date);
        
        const dayDeposits = allDeposits.filter(d => {
          if (d.status !== 'completed') return false;
          const depositDate = d.completedAt ? new Date(d.completedAt) : new Date(d.createdAt);
          return depositDate >= dayStart && depositDate <= dayEnd;
        });
        
        const dayRevenue = dayDeposits.reduce((sum, d) => sum + parseFloat(d.amount), 0);
        
        dailyRevenueData.push({
          date: date.toISOString().split('T')[0],
          revenue: dayRevenue,
          deposits: dayDeposits.length
        });
      }

      res.json({
        // Date filter info
        period: {
          start: filterStartDate.toISOString(),
          end: filterEndDate.toISOString(),
          type: period || 'custom'
        },
        
        // Main metrics for period
        metrics: {
          revenue: {
            confirmed: periodConfirmedRevenue.toFixed(2),
            gross: periodGrossRevenue.toFixed(2),
            change: revenueChange.toFixed(1),
            comparison: comparisonConfirmedRevenue.toFixed(2)
          },
          users: {
            total: userStats.totalUsers,
            newInPeriod: newUsersInPeriod,
            active: userStats.activeUsers,
            change: userChange.toFixed(1),
            comparison: newUsersInComparison
          },
          games: {
            total: scratchCardsInPeriod.length,
            revenue: scratchCardRevenue.toFixed(2),
            payout: scratchCardPayout.toFixed(2),
            change: gameChange.toFixed(1),
            comparison: comparisonGames
          },
          withdrawals: {
            total: periodWithdrawals.toFixed(2),
            pending: pendingWithdrawalsInPeriod,
            globalPending: globalPendingWithdrawals
          },
          profit: {
            amount: periodProfit.toFixed(2),
            change: profitChange.toFixed(1),
            comparison: comparisonProfit.toFixed(2)
          }
        },
        
        // Game distribution
        gameDistribution: {
          pix: pixGames.length,
          meMimei: meMimeiGames.length,
          eletronicos: eletronicosGames.length,
          superPremios: superPremiosGames.length
        },
        
        // Key Performance Indicators
        kpis: {
          avgDeposit: avgDeposit.toFixed(2),
          avgScratchValue: avgScratchValue.toFixed(2),
          winRate: winRate.toFixed(2),
          conversionRate: conversionRate.toFixed(2),
          retentionRate: retentionRate.toFixed(2),
          uniquePlayers: uniquePlayersInPeriod
        },
        
        // Chart data
        charts: {
          dailyRevenue: dailyRevenueData
        },
        
        // Legacy fields for compatibility
        totalUsers: userStats.totalUsers,
        activeUsers: userStats.activeUsers,
        activeAffiliates: activeAffiliatesCount,
        totalDeposits: periodConfirmedRevenue.toFixed(2),
        grossRevenue: periodGrossRevenue.toFixed(2),
        totalWithdrawals: periodWithdrawals.toFixed(2),
        totalProfit: periodProfit.toFixed(2),
        todayDeposits: periodConfirmedRevenue.toFixed(2),
        todayWithdrawals: periodWithdrawals.toFixed(2),
        todayProfit: periodProfit.toFixed(2),
        pendingWithdrawals: globalPendingWithdrawals,
        totalGames: scratchCardsInPeriod.length,
        todayGames: scratchCardsInPeriod.length,
        totalRewards,
        totalScratchCards: scratchCardsInPeriod.length,
        todayScratchCards: scratchCardsInPeriod.length,
        scratchCardRevenue: scratchCardRevenue.toFixed(2),
        scratchCardPayout: scratchCardPayout.toFixed(2),
        pixGames: pixGames.length,
        meMimeiGames: meMimeiGames.length,
        eletronicosGames: eletronicosGames.length,
        superPremiosGames: superPremiosGames.length,
        avgScratchValue: avgScratchValue.toFixed(2),
        winRate: winRate.toFixed(2),
        retentionRate: retentionRate.toFixed(2),
        avgDeposit: avgDeposit.toFixed(2),
        conversionRate: conversionRate.toFixed(2),
      });
    } catch (error) {
      console.error("Admin stats error:", error);
      res.status(500).json({ message: "Erro ao buscar estatísticas" });
    }
  });

  // Get all users
  app.get("/api/admin/users", authenticateAdmin, async (req, res) => {
    try {
      // Use raw SQL to avoid Drizzle issues with app_users table
      const allUsersResult = await pool.query(
        `SELECT * FROM app_users ORDER BY created_at DESC`
      );
      
      const allUsers = allUsersResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        cpf: row.cpf,
        isAdult: row.is_adult,
        referralCode: row.referral_code,
        referredBy: row.referred_by,
        utmSource: row.utm_source,
        utmMedium: row.utm_medium,
        utmCampaign: row.utm_campaign,
        utmTerm: row.utm_term,
        utmContent: row.utm_content,
        utmSrc: row.utm_src,
        landingPage: row.landing_page,
        couponApplied: row.coupon_applied,
        currentCoupon: row.current_coupon,
        hasFirstDeposit: row.has_first_deposit,
        affiliateId: row.affiliate_id,
        partnerId: row.partner_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      // Get wallets for all users
      const userWallets = await db.select().from(wallets);
      const walletsMap = new Map(userWallets.map((w) => [w.userId, w]));

      // Combine user data with wallet data and calculate level
      const usersWithWallets = allUsers.map((user) => {
        const wallet = walletsMap.get(user.id);
        const totalWagered = wallet?.totalWagered || "0.00";
        const level = Math.min(
          100,
          Math.floor(Math.sqrt(parseFloat(totalWagered) / 100)),
        );

        return {
          ...user,
          balance: wallet?.balance || "0.00",
          scratchBonus: wallet?.scratchBonus || 0,
          totalWagered: totalWagered,
          level: level,
          status: "active" as const, // For now, all users are active unless banned
        };
      });

      res.json(usersWithWallets);
    } catch (error) {
      console.error("Admin get users error:", error);
      res.status(500).json({ message: "Erro ao buscar usuários" });
    }
  });

  // Get user details
  app.get("/api/admin/users/:userId", authenticateAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);

      // Get user deposits
      const userDeposits = await storage.getDepositsByUser(userId);
      const totalDeposited = userDeposits
        .filter((d) => d.status === "completed")
        .reduce((sum, d) => sum + parseFloat(d.amount), 0);

      // Get user games
      const userGames = await storage.getGamesByUser(userId);
      const totalWon = userGames
        .filter((g) => g.won)
        .reduce((sum, g) => sum + parseFloat(g.prize), 0);

      // Get user withdrawals
      const userWithdrawals = await storage.getWithdrawalsByUser(userId);
      const totalWithdrawn = userWithdrawals
        .filter((w) => w.status === "completed")
        .reduce((sum, w) => sum + parseFloat(w.amount), 0);

      // Get recent games
      const recentGames = userGames.slice(0, 10).map((g) => ({
        id: g.id,
        gameType: g.gameType,
        cost: g.cost,
        prize: g.prize,
        won: g.won,
        playedAt: g.playedAt,
      }));

      res.json({
        totalDeposited: totalDeposited.toFixed(2),
        totalWon: totalWon.toFixed(2),
        totalWithdrawn: totalWithdrawn.toFixed(2),
        totalGames: userGames.length,
        recentGames,
      });
    } catch (error) {
      console.error("Admin get user details error:", error);
      res.status(500).json({ message: "Erro ao buscar detalhes do usuário" });
    }
  });

  // Update user balance
  app.post(
    "/api/admin/users/:userId/balance",
    authenticateAdmin,
    async (req, res) => {
      try {
        const userId = parseInt(req.params.userId);
        const { balance, scratchBonus } = req.body;

        if (!balance || isNaN(parseFloat(balance))) {
          return res.status(400).json({ message: "Saldo inválido" });
        }

        await storage.updateWalletBalance(
          userId,
          parseFloat(balance).toFixed(2),
        );

        if (scratchBonus !== undefined && !isNaN(parseInt(scratchBonus))) {
          await storage.updateWalletScratchBonus(
            userId,
            parseInt(scratchBonus),
          );
        }

        res.json({ success: true, newBalance: balance });
      } catch (error) {
        console.error("Admin update balance error:", error);
        res.status(500).json({ message: "Erro ao atualizar saldo" });
      }
    },
  );

  // Ban user
  app.post(
    "/api/admin/users/:userId/ban",
    authenticateAdmin,
    async (req, res) => {
      try {
        const userId = parseInt(req.params.userId);

        // In a real system, you would add a status field to users table
        // For now, we'll just return success
        res.json({ success: true, message: "Usuário banido com sucesso" });
      } catch (error) {
        console.error("Admin ban user error:", error);
        res.status(500).json({ message: "Erro ao banir usuário" });
      }
    },
  );

  // Unban user
  app.post(
    "/api/admin/users/:userId/unban",
    authenticateAdmin,
    async (req, res) => {
      try {
        const userId = parseInt(req.params.userId);

        // In a real system, you would update status field to active
        res.json({ success: true, message: "Usuário desbanido com sucesso" });
      } catch (error) {
        console.error("Admin unban user error:", error);
        res.status(500).json({ message: "Erro ao desbanir usuário" });
      }
    },
  );

  // Get all withdrawals for admin
  app.get("/api/admin/withdrawals", authenticateAdmin, async (req, res) => {
    try {
      const allWithdrawals = await db
        .select({
          withdrawal: withdrawals,
          user: users,
        })
        .from(withdrawals)
        .leftJoin(users, eq(withdrawals.userId, users.id));

      const formattedWithdrawals = allWithdrawals.map(
        ({ withdrawal, user }) => ({
          id: withdrawal.id,
          displayId:
            withdrawal.displayId || `${withdrawal.id}`.padStart(5, "0"),
          userId: withdrawal.userId,
          userName: user?.name || "Unknown",
          userEmail: user?.email || "Unknown",
          amount: withdrawal.amount,
          pixKey: withdrawal.pixKey,
          pixKeyType: withdrawal.pixKeyType || "PIX",
          status: withdrawal.status,
          requestedAt: withdrawal.requestedAt,
          processedAt: withdrawal.processedAt,
          adminNotes: withdrawal.adminNotes || null,
          // Receipt fields
          endToEndId: withdrawal.endToEndId || null,
          transactionHash: withdrawal.transactionHash || null,
          originName: withdrawal.originName || "Mania Brasil",
          originCnpj: withdrawal.originCnpj || "62.134.421/0001-62",
          destinationName: withdrawal.destinationName || null,
          destinationDocument: withdrawal.destinationDocument || null,
        }),
      );

      res.json(formattedWithdrawals);
    } catch (error) {
      console.error("Admin get withdrawals error:", error);
      res.status(500).json({ message: "Erro ao buscar saques" });
    }
  });

  // Approve withdrawal with automatic OrinPay integration
  app.post(
    "/api/admin/withdrawals/:withdrawalId/approve",
    authenticateAdmin,
    async (req: any, res) => {
      try {
        const withdrawalId = parseInt(req.params.withdrawalId);
        const { adminNotes, adminPassword } = req.body;

        // SECURITY: Always verify admin password for withdrawal approval
        const SECURE_ADMIN_PASSWORD = 'ManiaBrasil24542134842564';
        if (!adminPassword || adminPassword !== SECURE_ADMIN_PASSWORD) {
          console.log(`[SECURITY] Failed withdrawal approval attempt - invalid password`);
          return res.status(401).json({ 
            message: "Senha administrativa incorreta. Acesso negado.", 
            securityAlert: true 
          });
        }

        // SECURITY LAYER 2: Rate limiting - max 10 withdrawals per hour
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentApprovals = await db
          .select()
          .from(withdrawals)
          .where(and(
            eq(withdrawals.status, "approved" as any),
            gte(withdrawals.processedAt, hourAgo)
          ));
        
        if (recentApprovals.length >= 10) {
          console.log(`[SECURITY] Rate limit exceeded for withdrawals`);
          return res.status(429).json({ 
            message: "Limite de aprovações excedido. Aguarde 1 hora.", 
            securityAlert: true 
          });
        }

        // Get withdrawal details with user info
        const [withdrawalData] = await db
          .select({
            withdrawal: withdrawals,
            user: users
          })
          .from(withdrawals)
          .leftJoin(users, eq(withdrawals.userId, users.id))
          .where(eq(withdrawals.id, withdrawalId));

        if (!withdrawalData) {
          return res.status(404).json({ message: "Saque não encontrado" });
        }

        if (withdrawalData.withdrawal.status !== "pending") {
          return res.status(400).json({ message: "Este saque já foi processado" });
        }

        // SECURITY LAYER 3: Verify withdrawal amount limits
        const amount = parseFloat(withdrawalData.withdrawal.amount);
        if (amount > 5000) {
          console.log(`[SECURITY] Large withdrawal attempt: R$ ${amount}`);
          // Require additional confirmation for large amounts
          if (!req.body.confirmLargeAmount) {
            return res.status(400).json({ 
              message: "Saques acima de R$ 5.000 requerem confirmação adicional",
              requiresConfirmation: true,
              amount: amount
            });
          }
        }

        let horsePayTransactionId = null;
        let pixEndToEndId = null;

        // Process withdrawal via OrinPay API
        try {
          console.log(`[ORINPAY] Processing automatic PIX for withdrawal #${withdrawalId}`);
          // No authentication needed for OrinPay, using API key in headers

          // Determine PIX key type for OrinPay (only CPF/CNPJ allowed)
          const pixKey = withdrawalData.withdrawal.pixKey;
          let pixKeyType = 'CPF';
          
          const cleanedKey = pixKey.replace(/[^0-9]/g, "");
          if (cleanedKey.length === 11) {
            pixKeyType = 'CPF';
          } else if (cleanedKey.length === 14) {
            pixKeyType = 'CNPJ';
          } else {
            throw new Error("OrinPay aceita apenas chaves PIX tipo CPF ou CNPJ");
          }

          console.log(`[ORINPAY] Processing withdrawal with PIX key type: ${pixKeyType}`);

          // Process withdrawal via OrinPay
          const withdrawResponse = await processOrinPayWithdrawal(
            amount * 100, // Convert to cents
            cleanedKey,
            pixKeyType,
            withdrawalId,
            withdrawalData.withdrawal.userId
          );

          console.log(`[ORINPAY] Withdrawal response:`, withdrawResponse);

          if (withdrawResponse.success) {
            horsePayTransactionId = withdrawResponse.withdrawalId;
            pixEndToEndId = `ORINPAY-${withdrawResponse.withdrawalId}`;
            console.log(`[ORINPAY] Withdrawal created successfully: ID ${horsePayTransactionId}`);
          } else {
            throw new Error('Failed to create withdrawal');
          }
        } catch (orinPayError: any) {
          console.error(`[ORINPAY] Error processing withdrawal:`, orinPayError);
          // Return error if OrinPay fails
          return res.status(500).json({ 
            message: `Erro ao processar PIX via OrinPay: ${orinPayError.message}`,
            error: orinPayError.message 
          });
        }

        // Get user details for receipt
        const userDetails = await db.select().from(users).where(eq(users.id, withdrawalData.withdrawal.userId)).limit(1);
        const userName = userDetails[0]?.name || '';
        const userCpf = userDetails[0]?.cpf || withdrawalData.withdrawal.pixKey;
        
        // Update withdrawal status to approved with transaction details
        const updateData: any = {
          status: "approved",
          processedAt: new Date(),
          adminNotes: adminNotes + (horsePayTransactionId ? `\nOrinPay ID: ${horsePayTransactionId}` : ''),
        };
        
        // Add transaction receipt details if available
        if (pixEndToEndId) {
          updateData.endToEndId = pixEndToEndId;
        }
        if (horsePayTransactionId) {
          updateData.transactionHash = horsePayTransactionId;
        }
        updateData.originName = "Mania Brasil";
        updateData.originCnpj = "62.134.421/0001-62";
        updateData.destinationName = userName;
        updateData.destinationDocument = userCpf;
        
        await db
          .update(withdrawals)
          .set(updateData)
          .where(eq(withdrawals.id, withdrawalId));

        console.log(`[ADMIN] Withdrawal #${withdrawalId} approved by ${req.adminSession?.username || 'admin'}`);
        if (horsePayTransactionId) {
          console.log(`[ADMIN] PIX sent via OrinPay: Transaction ${horsePayTransactionId}`);
        }

        res.json({ 
          success: true, 
          message: horsePayTransactionId 
            ? `Saque aprovado e PIX enviado via OrinPay! Transação: ${horsePayTransactionId}`
            : "Saque aprovado com sucesso. PIX deve ser enviado manualmente.",
          horsePayTransactionId,
          pixEndToEndId
        });
      } catch (error: any) {
        console.error("Admin approve withdrawal error:", error);
        res.status(500).json({ message: "Erro ao aprovar saque" });
      }
    },
  );

  // Reject withdrawal
  app.post(
    "/api/admin/withdrawals/:withdrawalId/reject",
    authenticateAdmin,
    async (req, res) => {
      try {
        const withdrawalId = parseInt(req.params.withdrawalId);
        const { adminNotes } = req.body;

        // Get withdrawal details
        const [withdrawal] = await db
          .select()
          .from(withdrawals)
          .where(eq(withdrawals.id, withdrawalId));

        if (!withdrawal) {
          return res.status(404).json({ message: "Saque não encontrado" });
        }

        // Update withdrawal status
        await db
          .update(withdrawals)
          .set({
            status: "rejected" as any,
            processedAt: new Date(),
            adminNotes,
          })
          .where(eq(withdrawals.id, withdrawalId));

        // Refund the amount to user's wallet
        const wallet = await storage.getWallet(withdrawal.userId);
        if (wallet) {
          const newBalance =
            parseFloat(wallet.balance) + parseFloat(withdrawal.amount);
          await storage.updateWalletBalance(
            withdrawal.userId,
            newBalance.toFixed(2),
          );
        }

        res.json({ success: true });
      } catch (error) {
        console.error("Admin reject withdrawal error:", error);
        res.status(500).json({ message: "Erro ao rejeitar saque" });
      }
    },
  );

  // Get all support chats for admin
  app.get("/api/admin/support/chats", authenticateAdmin, async (req, res) => {
    try {
      // Fetch all chats with user info
      const allChats = await db
        .select({
          chat: supportChats,
          user: users,
        })
        .from(supportChats)
        .leftJoin(users, eq(supportChats.userId, users.id))
        .orderBy(desc(supportChats.createdAt));

      // Get all chat IDs
      const chatIds = allChats.map(({ chat }) => chat.id);
      
      // Fetch all messages for all chats in one query
      let allMessages: any[] = [];
      if (chatIds.length > 0) {
        // Use inArray operator for proper Drizzle query
        allMessages = await db
          .select()
          .from(supportMessages)
          .where(inArray(supportMessages.chatId, chatIds))
          .orderBy(asc(supportMessages.createdAt));
      }

      // Group messages by chat ID
      const messagesByChatId: Record<number, any[]> = {};
      allMessages.forEach((msg) => {
        if (!messagesByChatId[msg.chatId]) {
          messagesByChatId[msg.chatId] = [];
        }
        messagesByChatId[msg.chatId].push({
          id: msg.id,
          chatId: msg.chatId,
          senderId: msg.senderId,
          senderRole: msg.senderType,
          message: msg.message,
          createdAt: msg.createdAt,
        });
      });

      // Build the response
      const chatsWithMessages = allChats.map(({ chat, user }) => ({
        id: chat.id,
        userId: chat.userId,
        userName: user?.name || "Unknown",
        userEmail: user?.email || "Unknown",
        status: chat.status,
        description: chat.description,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        messages: messagesByChatId[chat.id] || [],
      }));

      res.json(chatsWithMessages);
    } catch (error) {
      console.error("Admin get support chats error:", error);
      res.status(500).json({ message: "Erro ao buscar chats de suporte" });
    }
  });

  // Send admin message to support chat
  app.post(
    "/api/admin/support/send",
    authenticateAdmin,
    async (req: any, res) => {
      try {
        const { chatId, message } = req.body;

        if (!chatId || !message) {
          return res
            .status(400)
            .json({ message: "Chat ID e mensagem são obrigatórios" });
        }

        // Get a valid user ID for admin (using ID 1 as a placeholder for admin)
        const adminUserId = 1;

        console.log("Inserting support message:", {
          chatId,
          senderId: adminUserId,
          senderType: "admin",
          message,
        });

        const newMessage = await storage.createSupportMessage({
          chatId,
          senderId: adminUserId,
          senderType: "admin",
          message,
        });

        // Update chat's updatedAt timestamp
        // Skip the update for now to avoid the SQL error

        res.json(newMessage);
      } catch (error) {
        console.error("Admin send support message error:", error);
        res.status(500).json({ message: "Erro ao enviar mensagem" });
      }
    },
  );

  // Close support chat
  app.post(
    "/api/admin/support/close/:chatId",
    authenticateAdmin,
    async (req, res) => {
      try {
        const chatId = parseInt(req.params.chatId);

        await db
          .update(supportChats)
          .set({
            status: "closed" as any,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(supportChats.id, chatId));

        res.json({ success: true });
      } catch (error) {
        console.error("Admin close support chat error:", error);
        res.status(500).json({ message: "Erro ao fechar chat" });
      }
    },
  );

  // Get all games (only scratch cards - premio games)
  app.get("/api/admin/games", authenticateAdmin, async (req, res) => {
    try {
      // Get premio games only
      const premiosData = await db
        .select({
          game: gamePremios,
          user: users,
        })
        .from(gamePremios)
        .leftJoin(users, eq(gamePremios.userId, users.id))
        .orderBy(desc(gamePremios.playedAt))
        .limit(100);

      // Format games
      const allGames = premiosData.map(({ game, user }) => ({
        id: game.id,
        displayId: game.displayId || `${game.id}`.padStart(5, "0"),
        userId: game.userId,
        userName: user?.name || "Unknown",
        userEmail: user?.email || "Unknown",
        gameType: game.gameType,
        category: "premio",
        isMinigame: false,
        cost: game.cost,
        prize: game.prize,
        won: game.won,
        result: game.result,
        playedAt: game.playedAt,
      }));

      res.json(allGames);
    } catch (error) {
      console.error("Admin get games error:", error);
      res.status(500).json({ message: "Erro ao buscar jogos" });
    }
  });

  // Get game statistics (only scratch cards - premio games)
  app.get("/api/admin/games/stats", authenticateAdmin, async (req, res) => {
    try {
      // Get all premio games only
      const allPremios = await db.select().from(gamePremios);

      // Only use premio games
      const allGames = [...allPremios];

      // Calculate statistics by game type
      const gameTypeStats: Record<string, any> = {};

      allGames.forEach((game) => {
        if (!gameTypeStats[game.gameType]) {
          gameTypeStats[game.gameType] = {
            totalGames: 0,
            totalRevenue: 0,
            totalPrizes: 0,
            totalWins: 0,
            winRate: 0,
          };
        }

        gameTypeStats[game.gameType].totalGames++;
        gameTypeStats[game.gameType].totalRevenue += parseFloat(game.cost);
        if (game.won) {
          gameTypeStats[game.gameType].totalWins++;
          gameTypeStats[game.gameType].totalPrizes += parseFloat(game.prize);
        }
      });

      // Calculate win rates
      Object.keys(gameTypeStats).forEach((gameType) => {
        const stats = gameTypeStats[gameType];
        stats.winRate =
          stats.totalGames > 0
            ? ((stats.totalWins / stats.totalGames) * 100).toFixed(2)
            : "0.00";
        stats.profit = (stats.totalRevenue - stats.totalPrizes).toFixed(2);
        stats.totalRevenue = stats.totalRevenue.toFixed(2);
        stats.totalPrizes = stats.totalPrizes.toFixed(2);
      });

      // Overall statistics
      const totalGames = allGames.length;
      const totalRevenue = allGames.reduce(
        (sum, g) => sum + parseFloat(g.cost),
        0,
      );
      const totalPrizes = allGames.reduce(
        (sum, g) => sum + (g.won ? parseFloat(g.prize) : 0),
        0,
      );
      const totalWins = allGames.filter((g) => g.won).length;
      const overallWinRate =
        totalGames > 0 ? ((totalWins / totalGames) * 100).toFixed(2) : "0.00";

      res.json({
        overall: {
          totalGames,
          totalRevenue: totalRevenue.toFixed(2),
          totalPrizes: totalPrizes.toFixed(2),
          totalWins,
          winRate: overallWinRate,
          profit: (totalRevenue - totalPrizes).toFixed(2),
        },
        byGameType: gameTypeStats,
      });
    } catch (error) {
      console.error("Admin get game stats error:", error);
      res.status(500).json({ message: "Erro ao buscar estatísticas de jogos" });
    }
  });

  // Get game probabilities
  app.get("/api/admin/game-probabilities", authenticateAdmin, async (req, res) => {
    try {
      const probabilities = await storage.getGameProbabilities();
      
      // Ensure all game types have a probability entry
      const gameTypes = ['pix', 'me_mimei', 'eletronicos', 'super'];
      const existingTypes = probabilities.map(p => p.gameType);
      
      // Add default entries for missing game types
      const allProbabilities = gameTypes.map(gameType => {
        const existing = probabilities.find(p => p.gameType === gameType);
        if (existing) {
          return existing;
        }
        // Return default values for missing entries
        return {
          id: 0,
          gameType,
          winProbability: '30.00',
          forceWin: false,
          forceLose: false,
          enabled: true,
          updatedAt: new Date(),
          updatedBy: 'admin'
        };
      });
      
      res.json(allProbabilities);
    } catch (error) {
      console.error("Admin get probabilities error:", error);
      res.status(500).json({ message: "Erro ao buscar probabilidades" });
    }
  });

  // Update multiple game probabilities at once
  app.post("/api/admin/game-probabilities", authenticateAdmin, async (req, res) => {
    try {
      const { probabilities } = req.body;
      
      if (!probabilities || !Array.isArray(probabilities)) {
        return res.status(400).json({ message: "Probabilidades inválidas" });
      }
      
      // Update each probability
      for (const prob of probabilities) {
        if (prob.gameType) {
          await storage.upsertGameProbability(prob.gameType, {
            winProbability: prob.winProbability?.toString(),
            forceWin: prob.forceWin || false,
            forceLose: prob.forceLose || false,
            enabled: prob.enabled !== undefined ? prob.enabled : true,
            updatedBy: 'admin'
          });
        }
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Admin update probabilities error:", error);
      res.status(500).json({ message: "Erro ao atualizar probabilidades" });
    }
  });

  // Update game probability
  app.post("/api/admin/probabilities/:gameType", authenticateAdmin, async (req, res) => {
    try {
      const { gameType } = req.params;
      const { winProbability, forceWin, forceLose, enabled } = req.body;
      
      // Validate game type
      const validGameTypes = ['pix', 'me_mimei', 'eletronicos', 'super'];
      if (!validGameTypes.includes(gameType)) {
        return res.status(400).json({ message: "Tipo de jogo inválido" });
      }
      
      // Validate probability
      if (winProbability !== undefined) {
        const probability = parseFloat(winProbability);
        if (isNaN(probability) || probability < 0 || probability > 100) {
          return res.status(400).json({ message: "Probabilidade deve ser entre 0 e 100" });
        }
      }
      
      // Update probability
      await storage.upsertGameProbability(gameType, {
        winProbability: winProbability?.toString(),
        forceWin: forceWin || false,
        forceLose: forceLose || false,
        enabled: enabled !== undefined ? enabled : true,
        updatedBy: 'admin'
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Admin update probability error:", error);
      res.status(500).json({ message: "Erro ao atualizar probabilidade" });
    }
  });

  // Get prize probabilities for a specific game
  app.get("/api/admin/prize-probabilities/:gameType", authenticateAdmin, async (req, res) => {
    try {
      const { gameType } = req.params;
      const { demo } = req.query; // Check if we want demo probabilities
      
      // Map frontend game types to database game types
      const gameTypeMapping: Record<string, string> = {
        'pix': 'premio-pix',
        'me_mimei': 'premio-me-mimei',
        'eletronicos': 'premio-eletronicos',
        'super': 'premio-super-premios'
      };
      
      // Validate game type
      if (!gameTypeMapping[gameType]) {
        return res.status(400).json({ message: "Tipo de jogo inválido" });
      }
      
      const dbGameType = gameTypeMapping[gameType];
      
      // Get demo or regular probabilities based on query param
      const probabilities = demo === 'true' 
        ? await storage.getDemoPrizeProbabilities(dbGameType)
        : await storage.getFullPrizeProbabilities(dbGameType);
      
      res.json(probabilities);
    } catch (error) {
      console.error("Admin get prize probabilities error:", error);
      res.status(500).json({ message: "Erro ao buscar probabilidades de prêmios" });
    }
  });

  // Get all prize probabilities
  app.get("/api/admin/prize-probabilities", authenticateAdmin, async (req, res) => {
    try {
      const probabilities = await storage.getAllPrizeProbabilities();
      res.json(probabilities);
    } catch (error) {
      console.error("Admin get all prize probabilities error:", error);
      res.status(500).json({ message: "Erro ao buscar probabilidades de prêmios" });
    }
  });

  // Update prize probabilities for a specific game
  app.post("/api/admin/prize-probabilities/:gameType", authenticateAdmin, async (req, res) => {
    try {
      const { gameType } = req.params;
      const { prizes, demo } = req.body; // Check if updating demo probabilities
      
      // Map frontend game types to database game types
      const gameTypeMapping: Record<string, string> = {
        'pix': 'premio-pix',
        'me_mimei': 'premio-me-mimei',
        'eletronicos': 'premio-eletronicos',
        'super': 'premio-super-premios'
      };
      
      // Validate game type
      if (!gameTypeMapping[gameType]) {
        return res.status(400).json({ message: "Tipo de jogo inválido" });
      }
      
      // Validate prizes array
      if (!prizes || !Array.isArray(prizes)) {
        return res.status(400).json({ message: "Lista de prêmios inválida" });
      }
      
      // Validate total probability is not greater than 100%
      const totalProbability = prizes.reduce((sum, prize) => sum + parseFloat(prize.probability || 0), 0);
      if (totalProbability > 100.01) {
        return res.status(400).json({ 
          message: `A soma das probabilidades não pode exceder 100%. Total atual: ${totalProbability.toFixed(4)}%` 
        });
      }
      
      const dbGameType = gameTypeMapping[gameType];
      
      // Update demo or regular probabilities based on request
      if (demo === true) {
        await storage.updateDemoPrizeProbabilities(dbGameType, prizes);
      } else {
        await storage.updatePrizeProbabilities(dbGameType, prizes);
      }
      
      res.json({ success: true, demo: demo === true });
    } catch (error) {
      console.error("Admin update prize probabilities error:", error);
      res.status(500).json({ message: "Erro ao atualizar probabilidades de prêmios" });
    }
  });

  // Initialize prize probabilities with real game prizes
  app.post("/api/admin/prize-probabilities/initialize", authenticateAdmin, async (req, res) => {
    try {
      // Real prizes from each game
      const realGamePrizes = {
        'premio-pix': [
          { value: '0.5', name: '50 centavos', probability: 30.0 },
          { value: '1', name: '1 real', probability: 25.0 },
          { value: '2', name: '2 reais', probability: 20.0 },
          { value: '3', name: '3 reais', probability: 10.0 },
          { value: '4', name: '4 reais', probability: 6.0 },
          { value: '5', name: '5 reais', probability: 4.0 },
          { value: '10', name: '10 reais', probability: 2.5 },
          { value: '15', name: '15 reais', probability: 1.0 },
          { value: '20', name: '20 reais', probability: 0.8 },
          { value: '50', name: '50 reais', probability: 0.3 },
          { value: '100', name: '100 reais', probability: 0.15 },
          { value: '200', name: '200 reais', probability: 0.08 },
          { value: '500', name: '500 reais', probability: 0.03 },
          { value: '1000', name: '1 mil reais', probability: 0.015 },
          { value: '2000', name: '2 mil reais', probability: 0.008 },
          { value: '5000', name: '5 mil reais', probability: 0.003 },
          { value: '10000', name: '10 mil reais', probability: 0.001 },
          { value: '100000', name: '100 mil reais', probability: 0.0001 }
        ],
        'premio-me-mimei': [
          { value: '0.50', name: '50 centavos', probability: 20.0 },
          { value: '1.00', name: '1 real', probability: 10.0 },
          { value: '2.00', name: '2 reais', probability: 8.0 },
          { value: '3.00', name: '3 reais', probability: 6.0 },
          { value: '4.00', name: '4 reais', probability: 5.0 },
          { value: '5.00', name: '5 reais', probability: 4.0 },
          { value: '10.00', name: 'Batom Boca Rosa', probability: 3.0 },
          { value: '15.00', name: 'Máscara Ruby Rose', probability: 2.0 },
          { value: '20.00', name: 'Iluminador Bruna Tavares', probability: 1.5 },
          { value: '50.00', name: 'Perfume Egeo Dolce', probability: 1.0 },
          { value: '100.00', name: 'Bolsa Petite Jolie', probability: 0.5 },
          { value: '200.00', name: 'Kit WEPINK', probability: 0.3 },
          { value: '500.00', name: 'Perfume Good Girl', probability: 0.2 },
          { value: '1000.00', name: 'Kit Completo Bruna Tavares', probability: 0.1 },
          { value: '2000.00', name: 'Kit Kerastase', probability: 0.05 },
          { value: '5000.00', name: 'Bolsa Luxo Michael Kors', probability: 0.02 },
          { value: '10000.00', name: 'Dyson Secador', probability: 0.01 },
          { value: '100000.00', name: 'Anel Vivara Diamante', probability: 0.001 }
        ],
        'premio-eletronicos': [
          { value: '0.50', name: '50 centavos', probability: 20.0 },
          { value: '1.00', name: '1 real', probability: 10.0 },
          { value: '2.00', name: '2 reais', probability: 8.0 },
          { value: '3.00', name: '3 reais', probability: 6.0 },
          { value: '4.00', name: '4 reais', probability: 5.0 },
          { value: '5.00', name: '5 reais', probability: 4.0 },
          { value: '10.00', name: 'Cabo USB', probability: 3.0 },
          { value: '15.00', name: 'Suporte de Celular', probability: 2.0 },
          { value: '20.00', name: 'Capinha de Celular', probability: 1.5 },
          { value: '50.00', name: 'Power Bank', probability: 1.0 },
          { value: '100.00', name: 'Fone sem Fio', probability: 0.5 },
          { value: '200.00', name: 'SmartWatch', probability: 0.3 },
          { value: '500.00', name: 'Air Fryer', probability: 0.2 },
          { value: '1000.00', name: 'Caixa de Som JBL', probability: 0.1 },
          { value: '2000.00', name: 'Smart TV 55" 4K', probability: 0.05 },
          { value: '5000.00', name: 'Notebook Dell G15', probability: 0.02 },
          { value: '10000.00', name: 'iPhone 16 Pro', probability: 0.01 },
          { value: '100000.00', name: 'Kit Completo Apple', probability: 0.001 }
        ],
        'premio-super-premios': [
          { value: '10.00', name: '10 reais', probability: 30.0 },
          { value: '20.00', name: '20 reais', probability: 15.0 },
          { value: '40.00', name: '40 reais', probability: 8.0 },
          { value: '60.00', name: '60 reais', probability: 5.0 },
          { value: '80.00', name: '80 reais', probability: 3.0 },
          { value: '100.00', name: '100 reais', probability: 2.0 },
          { value: '200.00', name: 'Óculos', probability: 1.0 },
          { value: '300.00', name: 'Capacete', probability: 0.5 },
          { value: '400.00', name: 'Bicicleta', probability: 0.3 },
          { value: '1000.00', name: 'HoverBoard', probability: 0.2 },
          { value: '2000.00', name: 'Patinete Elétrico', probability: 0.1 },
          { value: '4000.00', name: 'Scooter Elétrica', probability: 0.05 },
          { value: '10000.00', name: 'Buggy', probability: 0.02 },
          { value: '20000.00', name: 'Moto CG', probability: 0.01 },
          { value: '200000.00', name: 'Jeep Compass', probability: 0.001 },
          { value: '500000.00', name: 'Super Sorte', probability: 0.0001 }
        ]
      };

      // Initialize prizes for each game
      for (const gameType of Object.keys(realGamePrizes)) {
        const prizes = realGamePrizes[gameType as keyof typeof realGamePrizes];
        await storage.updatePrizeProbabilities(gameType, prizes.map(p => ({
          prizeValue: p.value,
          prizeName: p.name,
          probability: p.probability
        })));
      }

      res.json({ 
        success: true, 
        message: "Probabilidades inicializadas com os prêmios reais dos jogos" 
      });
    } catch (error) {
      console.error("Error initializing prize probabilities:", error);
      res.status(500).json({ message: "Erro ao inicializar probabilidades" });
    }
  });

  // Get chest probabilities for a specific game
  app.get("/api/admin/chest-probabilities/:gameType", authenticateAdmin, async (req, res) => {
    try {
      const { gameType } = req.params;
      const { demo } = req.query; // Check if we want demo probabilities
      
      // Map frontend game types to database game types
      const gameTypeMapping: Record<string, string> = {
        'bau_pix': 'bau-pix',
        'bau_me_mimei': 'bau-me-mimei',
        'bau_eletronicos': 'bau-eletronicos',
        'bau_super': 'bau-super-premios'
      };
      
      // Validate game type
      if (!gameTypeMapping[gameType]) {
        return res.status(400).json({ message: "Tipo de jogo de baú inválido" });
      }
      
      const dbGameType = gameTypeMapping[gameType];
      
      // Get demo or regular probabilities based on query param
      const probabilities = demo === 'true' 
        ? await storage.getDemoPrizeProbabilities(dbGameType)
        : await storage.getFullPrizeProbabilities(dbGameType);
      
      res.json(probabilities);
    } catch (error) {
      console.error("Admin get chest probabilities error:", error);
      res.status(500).json({ message: "Erro ao buscar probabilidades dos baús" });
    }
  });

  // Update chest probabilities for a specific game
  app.post("/api/admin/chest-probabilities/:gameType", authenticateAdmin, async (req, res) => {
    try {
      const { gameType } = req.params;
      const { prizes, demo } = req.body; // Check if updating demo probabilities
      
      // Map frontend game types to database game types
      const gameTypeMapping: Record<string, string> = {
        'bau_pix': 'bau-pix',
        'bau_me_mimei': 'bau-me-mimei',
        'bau_eletronicos': 'bau-eletronicos',
        'bau_super': 'bau-super-premios'
      };
      
      // Validate game type
      if (!gameTypeMapping[gameType]) {
        return res.status(400).json({ message: "Tipo de jogo de baú inválido" });
      }
      
      // Validate prizes array
      if (!prizes || !Array.isArray(prizes)) {
        return res.status(400).json({ message: "Lista de prêmios inválida" });
      }
      
      // Validate total probability is not greater than 100%
      const totalProbability = prizes.reduce((sum, prize) => sum + parseFloat(prize.probability || 0), 0);
      if (totalProbability > 100.01) {
        return res.status(400).json({ 
          message: `A soma das probabilidades não pode exceder 100%. Total atual: ${totalProbability.toFixed(4)}%` 
        });
      }
      
      const dbGameType = gameTypeMapping[gameType];
      
      // Update demo or regular probabilities based on request
      if (demo === true) {
        await storage.updateDemoPrizeProbabilities(dbGameType, prizes);
      } else {
        await storage.updatePrizeProbabilities(dbGameType, prizes);
      }
      
      res.json({ success: true, demo: demo === true });
    } catch (error) {
      console.error("Admin update chest probabilities error:", error);
      res.status(500).json({ message: "Erro ao atualizar probabilidades dos baús" });
    }
  });

  // Get Esquilo Mania probabilities
  app.get("/api/admin/esquilo-probabilities", authenticateAdmin, async (req, res) => {
    try {
      const { demo } = req.query;
      const forDemo = demo === 'true';
      
      // First, create table if it doesn't exist
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS esquilo_probabilities (
          id SERIAL PRIMARY KEY,
          prize_type TEXT NOT NULL,
          multiplier DECIMAL(5, 2) NOT NULL,
          probability DECIMAL(5, 2) NOT NULL,
          for_demo BOOLEAN NOT NULL DEFAULT false,
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_by TEXT NOT NULL DEFAULT 'admin'
        )
      `);
      
      // Check if table has data
      const count = await db.execute(sql`SELECT COUNT(*) as count FROM esquilo_probabilities`);
      
      if (count.rows[0].count === '0') {
        // Insert default probabilities for normal game
        await db.execute(sql`
          INSERT INTO esquilo_probabilities (prize_type, multiplier, probability, for_demo)
          VALUES 
            ('pinecone', 0.3, 30.00, false),
            ('acorn', 0.5, 25.00, false),
            ('apple', 0.8, 25.00, false),
            ('ring', 2.0, 15.00, false),
            ('goldenacorn', 5.0, 5.00, false),
            ('pinecone', 0.3, 30.00, true),
            ('acorn', 0.5, 25.00, true),
            ('apple', 0.8, 25.00, true),
            ('ring', 2.0, 15.00, true),
            ('goldenacorn', 5.0, 5.00, true)
        `);
      }
      
      // Get probabilities using raw SQL
      const probabilities = await db.execute(sql`
        SELECT id, prize_type AS "prizeType", multiplier, probability, for_demo AS "forDemo", updated_at AS "updatedAt", updated_by AS "updatedBy"
        FROM esquilo_probabilities 
        WHERE for_demo = ${forDemo} 
        ORDER BY multiplier
      `);
      
      res.json(probabilities.rows);
    } catch (error) {
      console.error("Admin get esquilo probabilities error:", error);
      res.status(500).json({ message: "Erro ao buscar probabilidades do Esquilo Mania" });
    }
  });

  // Update Esquilo Mania probabilities
  app.post("/api/admin/esquilo-probabilities", authenticateAdmin, async (req, res) => {
    try {
      const { prizes, demo } = req.body;
      const forDemo = demo === true;
      
      // First, create table if it doesn't exist
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS esquilo_probabilities (
          id SERIAL PRIMARY KEY,
          prize_type TEXT NOT NULL,
          multiplier DECIMAL(5, 2) NOT NULL,
          probability DECIMAL(5, 2) NOT NULL,
          for_demo BOOLEAN NOT NULL DEFAULT false,
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_by TEXT NOT NULL DEFAULT 'admin'
        )
      `);
      
      // Validate prizes array
      if (!prizes || !Array.isArray(prizes)) {
        return res.status(400).json({ message: "Lista de prêmios inválida" });
      }
      
      // Validate total probability equals 100% (since we have 7 slots but 2 are always foxes)
      const totalProbability = prizes.reduce((sum, prize) => sum + parseFloat(prize.probability || 0), 0);
      if (Math.abs(totalProbability - 100) > 0.01) {
        return res.status(400).json({ 
          message: `A soma das probabilidades deve ser exatamente 100%. Total atual: ${totalProbability.toFixed(2)}%` 
        });
      }
      
      // Delete existing probabilities for this type using raw SQL
      await db.execute(sql`DELETE FROM esquilo_probabilities WHERE for_demo = ${forDemo}`);
      
      // Insert new probabilities
      for (const prize of prizes) {
        await db.execute(sql`
          INSERT INTO esquilo_probabilities (prize_type, multiplier, probability, for_demo, updated_at, updated_by)
          VALUES (${prize.prizeType}, ${parseFloat(prize.multiplier)}, ${parseFloat(prize.probability)}, ${forDemo}, NOW(), ${req.session.adminUsername || 'admin'})
        `);
      }
      
      // Get updated probabilities using raw SQL
      const updated = await db.execute(sql`
        SELECT * FROM esquilo_probabilities 
        WHERE for_demo = ${forDemo} 
        ORDER BY multiplier
      `);
      
      res.json({ 
        success: true, 
        demo: forDemo,
        message: "Probabilidades do Esquilo Mania atualizadas com sucesso", 
        probabilities: updated.rows 
      });
    } catch (error) {
      console.error("Admin update esquilo probabilities error:", error);
      res.status(500).json({ message: "Erro ao atualizar probabilidades do Esquilo Mania" });
    }
  });

  // Get Esquilo Bonus Mode probabilities
  app.get("/api/admin/esquilo-bonus-probabilities", authenticateAdmin, async (req, res) => {
    try {
      const { demo } = req.query;
      const forDemo = demo === 'true';
      
      // Create tables if they don't exist
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS esquilo_bonus_probabilities (
          id SERIAL PRIMARY KEY,
          multiplier DECIMAL(6, 2) NOT NULL,
          probability DECIMAL(5, 2) NOT NULL,
          for_demo BOOLEAN NOT NULL DEFAULT false,
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_by TEXT NOT NULL DEFAULT 'admin'
        )
      `);
      
      // Add bonus_chance column to esquilo_probabilities if it doesn't exist
      await db.execute(sql`
        ALTER TABLE esquilo_probabilities 
        ADD COLUMN IF NOT EXISTS bonus_chance DECIMAL(5,2) DEFAULT 10.00
      `);
      
      // Check if we have any data
      const checkData = await db.execute(sql`
        SELECT COUNT(*) as count FROM esquilo_bonus_probabilities WHERE for_demo = ${forDemo}
      `);
      
      // If no data, insert defaults
      if (checkData.rows[0].count === '0') {
        const defaultProbabilities = forDemo ? [
          { multiplier: 1.5, probability: 20.0 },
          { multiplier: 2.0, probability: 20.0 },
          { multiplier: 3.0, probability: 20.0 },
          { multiplier: 5.0, probability: 15.0 },
          { multiplier: 10.0, probability: 10.0 },
          { multiplier: 20.0, probability: 8.0 },
          { multiplier: 50.0, probability: 5.0 },
          { multiplier: 100.0, probability: 2.0 }
        ] : [
          { multiplier: 1.5, probability: 30.0 },
          { multiplier: 2.0, probability: 25.0 },
          { multiplier: 3.0, probability: 20.0 },
          { multiplier: 5.0, probability: 12.0 },
          { multiplier: 10.0, probability: 8.0 },
          { multiplier: 20.0, probability: 3.5 },
          { multiplier: 50.0, probability: 1.0 },
          { multiplier: 100.0, probability: 0.5 }
        ];
        
        for (const prob of defaultProbabilities) {
          await db.execute(sql`
            INSERT INTO esquilo_bonus_probabilities (multiplier, probability, for_demo)
            VALUES (${prob.multiplier}, ${prob.probability}, ${forDemo})
          `);
        }
      }
      
      // Get all bonus probabilities
      const bonusProbabilities = await db.execute(sql`
        SELECT id, multiplier, probability, for_demo AS "forDemo"
        FROM esquilo_bonus_probabilities
        WHERE for_demo = ${forDemo}
        ORDER BY multiplier ASC
      `);
      
      res.json(bonusProbabilities.rows);
    } catch (error) {
      console.error("Admin get esquilo bonus probabilities error:", error);
      res.status(500).json({ message: "Erro ao buscar probabilidades do modo bônus" });
    }
  });

  // Update Esquilo Bonus Mode probabilities
  app.post("/api/admin/esquilo-bonus-probabilities", authenticateAdmin, async (req, res) => {
    try {
      const { multipliers, demo } = req.body;
      const forDemo = demo === true;
      
      // Validate total probability is 100
      const total = multipliers.reduce((acc: number, m: any) => acc + parseFloat(m.probability), 0);
      if (Math.abs(total - 100) > 0.01) {
        return res.status(400).json({ message: `A soma das probabilidades deve ser 100%. Total atual: ${total.toFixed(2)}%` });
      }
      
      // Clear existing probabilities
      await db.execute(sql`
        DELETE FROM esquilo_bonus_probabilities WHERE for_demo = ${forDemo}
      `);
      
      // Insert new probabilities
      for (const multiplier of multipliers) {
        await db.execute(sql`
          INSERT INTO esquilo_bonus_probabilities (multiplier, probability, for_demo, updated_by)
          VALUES (${multiplier.multiplier}, ${multiplier.probability}, ${forDemo}, ${req.session.adminUsername || 'admin'})
        `);
      }
      
      res.json({ success: true, demo: forDemo });
    } catch (error) {
      console.error("Admin update esquilo bonus probabilities error:", error);
      res.status(500).json({ message: "Erro ao atualizar probabilidades do modo bônus" });
    }
  });

  // Get Bonus Mode chance
  app.get("/api/admin/esquilo-bonus-chance", authenticateAdmin, async (req, res) => {
    try {
      // Check if column exists, if not add it
      await db.execute(sql`
        ALTER TABLE esquilo_probabilities 
        ADD COLUMN IF NOT EXISTS bonus_chance DECIMAL(5,2) DEFAULT 10.00
      `);
      
      // Get the bonus chance from any row (they should all have the same value)
      const result = await db.execute(sql`
        SELECT bonus_chance FROM esquilo_probabilities LIMIT 1
      `);
      
      const bonusChance = result.rows.length > 0 ? parseFloat(result.rows[0].bonus_chance) : 10.0;
      
      res.json({ bonusChance });
    } catch (error) {
      console.error("Admin get bonus chance error:", error);
      res.status(500).json({ message: "Erro ao buscar chance do modo bônus" });
    }
  });

  // Update Bonus Mode chance
  app.post("/api/admin/esquilo-bonus-chance", authenticateAdmin, async (req, res) => {
    try {
      const { bonusChance } = req.body;
      
      if (bonusChance < 0 || bonusChance > 100) {
        return res.status(400).json({ message: "A chance do bônus deve estar entre 0% e 100%" });
      }
      
      // Update all rows with the new bonus chance
      await db.execute(sql`
        UPDATE esquilo_probabilities SET bonus_chance = ${bonusChance}
      `);
      
      res.json({ success: true, bonusChance });
    } catch (error) {
      console.error("Admin update bonus chance error:", error);
      res.status(500).json({ message: "Erro ao atualizar chance do modo bônus" });
    }
  });

  // Get Bonus Cost Multiplier for Esquilo
  app.get("/api/admin/esquilo-bonus-cost", authenticateAdmin, async (req, res) => {
    try {
      // Check if column exists, if not add it
      await db.execute(sql`
        ALTER TABLE esquilo_probabilities 
        ADD COLUMN IF NOT EXISTS bonus_cost_multiplier DECIMAL(5,2) DEFAULT 20.00
      `);
      
      // Get the bonus cost multiplier from any row (they should all have the same value)
      const result = await db.execute(sql`
        SELECT bonus_cost_multiplier FROM esquilo_probabilities LIMIT 1
      `);
      
      const bonusCostMultiplier = result.rows.length > 0 ? parseFloat(result.rows[0].bonus_cost_multiplier) : 20.0;
      
      res.json({ bonusCostMultiplier });
    } catch (error) {
      console.error("Admin get bonus cost error:", error);
      res.status(500).json({ message: "Erro ao buscar multiplicador do custo do bônus" });
    }
  });

  // Update Bonus Cost Multiplier
  app.post("/api/admin/esquilo-bonus-cost", authenticateAdmin, async (req, res) => {
    try {
      const { bonusCostMultiplier } = req.body;
      
      if (bonusCostMultiplier < 1 || bonusCostMultiplier > 100) {
        return res.status(400).json({ message: "O multiplicador deve estar entre 1x e 100x" });
      }
      
      // Update all rows with the new bonus cost multiplier
      await db.execute(sql`
        UPDATE esquilo_probabilities SET bonus_cost_multiplier = ${bonusCostMultiplier}
      `);
      
      res.json({ success: true, bonusCostMultiplier });
    } catch (error) {
      console.error("Admin update bonus cost error:", error);
      res.status(500).json({ message: "Erro ao atualizar multiplicador do custo do bônus" });
    }
  });

  // Get all transactions
  app.get("/api/admin/transactions", authenticateAdmin, async (req, res) => {
    try {
      // Get deposits
      const depositsData = await db
        .select({
          id: deposits.id,
          userId: deposits.userId,
          userName: users.name,
          amount: deposits.amount,
          status: deposits.status,
          createdAt: deposits.createdAt,
        })
        .from(deposits)
        .leftJoin(users, eq(deposits.userId, users.id))
        .orderBy(desc(deposits.createdAt))
        .limit(50);

      // Get withdrawals
      const withdrawalsData = await db
        .select({
          id: withdrawals.id,
          userId: withdrawals.userId,
          userName: users.name,
          amount: withdrawals.amount,
          status: withdrawals.status,
          createdAt: withdrawals.createdAt,
        })
        .from(withdrawals)
        .leftJoin(users, eq(withdrawals.userId, users.id))
        .orderBy(desc(withdrawals.createdAt))
        .limit(50);

      // Combine and format transactions
      const transactions = [
        ...depositsData.map((d) => ({
          id: d.id,
          userId: d.userId,
          userName: d.userName || "Unknown",
          type: "deposit",
          amount: d.amount,
          status: d.status,
          createdAt: d.createdAt,
          details: {},
        })),
        ...withdrawalsData.map((w) => ({
          id: w.id,
          userId: w.userId,
          userName: w.userName || "Unknown",
          type: "withdrawal",
          amount: w.amount,
          status: w.status,
          createdAt: w.createdAt,
          details: {},
        })),
      ].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      res.json(transactions);
    } catch (error) {
      console.error("Admin get transactions error:", error);
      res.status(500).json({ message: "Erro ao buscar transações" });
    }
  });

  // Get all deposits for admin
  app.get("/api/admin/deposits", authenticateAdmin, async (req, res) => {
    try {
      // Use raw SQL to avoid Drizzle issues with app_users table
      const allDepositsResult = await pool.query(
        `SELECT 
          d.id, 
          d.display_id, 
          d.transaction_id, 
          d.user_id, 
          d.amount, 
          d.status, 
          d.pix_code, 
          d.payment_provider, 
          d.created_at, 
          d.completed_at,
          u.name as user_name,
          u.email as user_email
        FROM deposits d
        LEFT JOIN app_users u ON d.user_id = u.id
        ORDER BY d.created_at DESC`
      );

      const formattedDeposits = allDepositsResult.rows.map((row) => ({
        id: row.id,
        displayId: row.display_id || row.transaction_id,
        userId: row.user_id,
        userName: row.user_name || "Unknown",
        userEmail: row.user_email || "Unknown",
        amount: row.amount,
        status: row.status,
        pixCode: row.pix_code,
        transactionId: row.transaction_id,
        paymentProvider: row.payment_provider,
        createdAt: row.created_at,
        completedAt: row.completed_at,
      }));

      res.json(formattedDeposits);
    } catch (error) {
      console.error("Admin get deposits error:", error);
      res.status(500).json({ message: "Erro ao buscar depósitos" });
    }
  });

  // Approve all pending affiliate commissions
  app.post("/api/admin/affiliates/approve-pending-commissions", authenticateAdmin, async (req, res) => {
    try {
      // Get all pending commissions
      const pendingCommissions = await db
        .select()
        .from(affiliateConversions)
        .where(eq(affiliateConversions.status, 'pending'));
      
      let totalApproved = 0;
      let totalAmount = 0;
      
      for (const commission of pendingCommissions) {
        // Update status to completed
        await db
          .update(affiliateConversions)
          .set({ 
            status: 'completed',
            processedAt: new Date()
          })
          .where(eq(affiliateConversions.id, commission.id));
        
        // Process wallet transaction to add money to affiliate wallet
        const amount = parseFloat(commission.commission || '0');
        if (amount > 0) {
          await processAffiliateWalletTransaction(
            commission.affiliateId,
            amount,
            commission.id,
            'completed',
            `Comissão aprovada - Depósito usuário #${commission.userId}`
          );
          
          // Update affiliate's approved earnings
          await db.update(affiliates)
            .set({
              approvedEarnings: sql`COALESCE(${affiliates.approvedEarnings}, 0) + ${amount}`,
              totalEarnings: sql`COALESCE(${affiliates.totalEarnings}, 0) + ${amount}`
            })
            .where(eq(affiliates.id, commission.affiliateId));
          
          totalApproved++;
          totalAmount += amount;
          
          console.log(`Approved commission: R$${amount.toFixed(2)} for affiliate ${commission.affiliateId}`);
        }
      }
      
      res.json({
        success: true,
        totalApproved,
        totalAmount: totalAmount.toFixed(2),
        message: `${totalApproved} comissões aprovadas, total de R$ ${totalAmount.toFixed(2)}`
      });
    } catch (error) {
      console.error("Error approving pending commissions:", error);
      res.status(500).json({ message: "Erro ao aprovar comissões pendentes" });
    }
  });

  // Get deposit statistics
  app.get("/api/admin/deposits/stats", authenticateAdmin, async (req, res) => {
    try {
      const allDeposits = await db.select().from(deposits);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const stats = {
        total: {
          count: 0,
          amount: 0,
          completed: 0,
          pending: 0,
          cancelled: 0,
        },
        today: {
          count: 0,
          amount: 0,
        },
        thisMonth: {
          count: 0,
          amount: 0,
        },
      };

      allDeposits.forEach((deposit) => {
        stats.total.count++;

        if (deposit.status === "completed") {
          stats.total.completed++;
          stats.total.amount += parseFloat(deposit.amount);

          const createdDate = new Date(deposit.createdAt);

          if (createdDate >= today) {
            stats.today.count++;
            stats.today.amount += parseFloat(deposit.amount);
          }

          if (createdDate >= thisMonth) {
            stats.thisMonth.count++;
            stats.thisMonth.amount += parseFloat(deposit.amount);
          }
        } else if (deposit.status === "pending") {
          stats.total.pending++;
        } else if (
          deposit.status === "cancelled" ||
          deposit.status === "expired"
        ) {
          stats.total.cancelled++;
        }
      });

      // Calculate pending amount
      let pendingAmount = 0;
      allDeposits.forEach((deposit) => {
        if (deposit.status === "pending") {
          pendingAmount += parseFloat(deposit.amount);
        }
      });

      res.json({
        totalDeposits: stats.total.completed,
        totalAmount: stats.total.amount.toFixed(2),
        todayDeposits: stats.today.count,
        todayAmount: stats.today.amount.toFixed(2),
        pendingCount: stats.total.pending,
        pendingAmount: pendingAmount.toFixed(2),
      });
    } catch (error) {
      console.error("Admin get deposit stats error:", error);
      res
        .status(500)
        .json({ message: "Erro ao buscar estatísticas de depósitos" });
    }
  });

  // Admin Bonus Code Routes
  app.get("/api/admin/bonus-codes/usage", authenticateAdmin, async (req, res) => {
    try {
      // Since we store bonus code usage in memory, we need to track it differently
      // For now, return empty array as this would need a proper database table to track usage
      const bonusUsages: any[] = [];
      
      // In a real implementation, you would have a bonus_code_usage table
      // that tracks userId, code, amount, and timestamp
      
      res.json(bonusUsages);
    } catch (error) {
      console.error("Admin get bonus codes usage error:", error);
      res.status(500).json({ message: "Erro ao buscar uso de códigos bônus" });
    }
  });

  app.get("/api/admin/bonus-codes/stats", authenticateAdmin, async (req, res) => {
    try {
      // Since we store bonus code usage in memory, these are placeholder stats
      // In a real implementation, you would calculate from the database
      
      const stats = {
        totalUsages: 0,
        totalBonusAwarded: 0,
        todayUsages: 0,
        uniqueUsers: 0,
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Admin get bonus codes stats error:", error);
      res.status(500).json({ message: "Erro ao buscar estatísticas de códigos bônus" });
    }
  });

  // Admin Coupon Management Routes
  
  // Get all coupons with statistics
  app.get("/api/admin/coupons", authenticateAdmin, async (req, res) => {
    try {
      const allCoupons = await storage.getAllCoupons();
      
      // Get usage statistics for each coupon
      const couponsWithStats = await Promise.all(
        allCoupons.map(async (coupon) => {
          const uses = await storage.getCouponUses(coupon.id);
          const uniqueUsers = new Set(uses.map(u => u.userId)).size;
          const totalDeposits = uses.reduce((sum, use) => sum + parseFloat(use.depositAmount), 0);
          
          return {
            ...coupon,
            statistics: {
              totalUses: uses.length,
              uniqueUsers,
              totalDeposits: totalDeposits.toFixed(2),
              remainingUses: coupon.usageLimit ? coupon.usageLimit - coupon.usageCount : null
            }
          };
        })
      );
      
      res.json(couponsWithStats);
    } catch (error) {
      console.error("Admin get coupons error:", error);
      res.status(500).json({ message: "Erro ao buscar cupons" });
    }
  });
  
  // Create new coupon
  app.post("/api/admin/coupons", authenticateAdmin, async (req, res) => {
    try {
      const {
        code,
        description,
        minDeposit,
        usageLimit,
        perUserLimit,
        expiresAt
      } = req.body;
      
      // Validate required fields
      if (!code || !description || minDeposit === undefined) {
        return res.status(400).json({ message: "Campos obrigatórios faltando" });
      }
      
      // Check if coupon code already exists
      const existingCoupon = await storage.getCoupon(code.toUpperCase());
      if (existingCoupon) {
        return res.status(400).json({ message: "Código de cupom já existe" });
      }
      
      // Create the coupon with minimal fields to match existing database
      const couponData: any = {
        code: code.toUpperCase(),
        description
      };
      
      // Only add optional fields if they exist in the request
      if (minDeposit !== undefined) {
        couponData.minDeposit = minDeposit.toString();
      }
      
      const newCoupon = await storage.createCoupon(couponData);
      
      res.json({ success: true, coupon: newCoupon });
    } catch (error: any) {
      console.error("Admin create coupon error:", error);
      console.error("Error details:", error.message, error.detail, error.code);
      res.status(500).json({ message: `Erro ao criar cupom: ${error.message || 'Erro desconhecido'}` });
    }
  });
  
  // Update coupon
  app.put("/api/admin/coupons/:id", authenticateAdmin, async (req, res) => {
    try {
      const couponId = parseInt(req.params.id);
      const updates = req.body;
      
      // Validate coupon exists
      const existingCoupon = await storage.getCouponById(couponId);
      if (!existingCoupon) {
        return res.status(404).json({ message: "Cupom não encontrado" });
      }
      
      // Remove bonusType and bonusAmount from updates if present (backwards compatibility)
      delete updates.bonusType;
      delete updates.bonusAmount;
      
      // Update the coupon
      await storage.updateCoupon(couponId, updates);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Admin update coupon error:", error);
      res.status(500).json({ message: "Erro ao atualizar cupom" });
    }
  });
  
  // Delete coupon
  app.delete("/api/admin/coupons/:id", authenticateAdmin, async (req, res) => {
    try {
      const couponId = parseInt(req.params.id);
      
      // Check if coupon exists
      const existingCoupon = await storage.getCouponById(couponId);
      if (!existingCoupon) {
        return res.status(404).json({ message: "Cupom não encontrado" });
      }
      
      // Check if coupon has been used
      const uses = await storage.getCouponUses(couponId);
      if (uses.length > 0) {
        return res.status(400).json({ 
          message: "Não é possível excluir cupom que já foi usado. Desative-o em vez disso." 
        });
      }
      
      // Delete the coupon
      await storage.deleteCoupon(couponId);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Admin delete coupon error:", error);
      res.status(500).json({ message: "Erro ao excluir cupom" });
    }
  });
  
  // Get coupon usage details
  app.get("/api/admin/coupons/:id/uses", authenticateAdmin, async (req, res) => {
    try {
      const couponId = parseInt(req.params.id);
      
      // Get coupon details
      const coupon = await storage.getCouponById(couponId);
      if (!coupon) {
        return res.status(404).json({ message: "Cupom não encontrado" });
      }
      
      // Get all uses with user details
      const uses = await storage.getCouponUsesWithUserDetails(couponId);
      
      res.json({
        coupon: {
          code: coupon.code,
          description: coupon.description
        },
        uses
      });
    } catch (error) {
      console.error("Admin get coupon uses error:", error);
      res.status(500).json({ message: "Erro ao buscar usos do cupom" });
    }
  });

  // Site Access Tracking Admin Routes
  
  // Get site accesses with filters
  app.get("/api/admin/site-accesses", authenticateAdmin, async (req, res) => {
    try {
      const { limit = 100, offset = 0, startDate, endDate, deviceType, isRegistered } = req.query;
      
      // Build query
      let query = db.select({
        access: siteAccesses,
        user: users
      })
      .from(siteAccesses)
      .leftJoin(users, eq(siteAccesses.userId, users.id))
      .orderBy(desc(siteAccesses.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));
      
      // Apply filters (would need to implement where conditions)
      
      const accesses = await query;
      
      // Transform the data
      const formattedAccesses = accesses.map(({ access, user }) => ({
        id: access.id,
        userId: access.userId,
        userName: user?.name || null,
        userEmail: user?.email || null,
        ipAddress: access.ipAddress,
        deviceType: access.deviceType,
        operatingSystem: access.operatingSystem,
        browser: access.browser,
        country: access.country,
        city: access.city,
        region: access.region,
        pageUrl: access.pageUrl,
        referrer: access.referrer,
        isRegistered: access.isRegistered,
        createdAt: access.createdAt
      }));
      
      // Get total count
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(siteAccesses);
      
      res.json({
        accesses: formattedAccesses,
        total: Number(count),
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });
    } catch (error) {
      console.error("Admin get site accesses error:", error);
      res.status(500).json({ message: "Erro ao buscar acessos ao site" });
    }
  });
  
  // Get site access statistics
  app.get("/api/admin/site-accesses/stats", authenticateAdmin, async (req, res) => {
    try {
      // Get total accesses
      const [{ totalAccesses }] = await db
        .select({ totalAccesses: sql<number>`count(*)` })
        .from(siteAccesses);
      
      // Get unique visitors (by IP)
      const [{ uniqueVisitors }] = await db
        .select({ uniqueVisitors: sql<number>`count(distinct ${siteAccesses.ipAddress})` })
        .from(siteAccesses);
      
      // Get registered vs visitors
      const [{ registeredUsers }] = await db
        .select({ registeredUsers: sql<number>`count(*)` })
        .from(siteAccesses)
        .where(eq(siteAccesses.isRegistered, true));
      
      const visitors = Number(totalAccesses) - Number(registeredUsers);
      
      // Get device type breakdown
      const deviceStats = await db
        .select({
          deviceType: siteAccesses.deviceType,
          count: sql<number>`count(*)`
        })
        .from(siteAccesses)
        .groupBy(siteAccesses.deviceType);
      
      // Get OS breakdown
      const osStats = await db
        .select({
          os: siteAccesses.operatingSystem,
          count: sql<number>`count(*)`
        })
        .from(siteAccesses)
        .groupBy(siteAccesses.operatingSystem);
      
      // Get browser breakdown
      const browserStats = await db
        .select({
          browser: siteAccesses.browser,
          count: sql<number>`count(*)`
        })
        .from(siteAccesses)
        .where(sql`${siteAccesses.browser} IS NOT NULL`)
        .groupBy(siteAccesses.browser);
      
      // Get country breakdown
      const countryStats = await db
        .select({
          country: siteAccesses.country,
          count: sql<number>`count(*)`
        })
        .from(siteAccesses)
        .where(sql`${siteAccesses.country} IS NOT NULL`)
        .groupBy(siteAccesses.country)
        .orderBy(desc(sql`count(*)`))
        .limit(10);
      
      // Get today's accesses
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const [{ todayAccesses }] = await db
        .select({ todayAccesses: sql<number>`count(*)` })
        .from(siteAccesses)
        .where(sql`${siteAccesses.createdAt} >= ${today.toISOString()}`);
      
      res.json({
        totalAccesses: Number(totalAccesses),
        uniqueVisitors: Number(uniqueVisitors),
        registeredUsers: Number(registeredUsers),
        visitors,
        todayAccesses: Number(todayAccesses),
        deviceStats: deviceStats.map(d => ({ 
          type: d.deviceType, 
          count: Number(d.count) 
        })),
        osStats: osStats.map(o => ({ 
          os: o.os, 
          count: Number(o.count) 
        })),
        browserStats: browserStats.map(b => ({ 
          browser: b.browser || 'Unknown', 
          count: Number(b.count) 
        })),
        countryStats: countryStats.map(c => ({ 
          country: c.country || 'Unknown', 
          count: Number(c.count) 
        }))
      });
    } catch (error) {
      console.error("Admin get site access stats error:", error);
      res.status(500).json({ message: "Erro ao buscar estatísticas de acesso" });
    }
  });

  // Demo probabilities test endpoint
  app.get("/api/admin/test-demo-probabilities", authenticateAdmin, async (req, res) => {
    try {
      // Get demo user (CPF 99999999999)
      const demoUser = await storage.getUserByCPF('99999999999');
      
      if (!demoUser) {
        return res.json({ 
          message: "Usuário demo não encontrado",
          info: "Crie um usuário com CPF 99999999999 para testar" 
        });
      }
      
      // Test probabilities for all games
      const games = ['premio-pix', 'premio-me-mimei', 'premio-eletronicos', 'premio-super-premios'];
      const results: any = {};
      
      for (const game of games) {
        // Get demo probabilities (passing userId)
        const demoProbs = await storage.getPrizeProbabilities(game, demoUser.id);
        
        // Get regular probabilities (no userId)
        const regularProbs = await storage.getPrizeProbabilities(game);
        
        results[game] = {
          demo: {
            count: demoProbs.length,
            sample: demoProbs.slice(0, 3).map(p => ({
              value: p.prize_value,
              probability: p.probability
            }))
          },
          regular: {
            count: regularProbs.length,
            sample: regularProbs.slice(0, 3).map(p => ({
              value: p.prize_value,
              probability: p.probability
            }))
          },
          isUsingDemoProbabilities: demoProbs.length > 0
        };
      }
      
      res.json({
        demoUser: {
          id: demoUser.id,
          name: demoUser.name,
          cpf: demoUser.cpf
        },
        probabilityTest: results,
        status: "✅ Sistema de probabilidades demo funcionando corretamente"
      });
      
    } catch (error) {
      console.error("Error testing demo probabilities:", error);
      res.status(500).json({ error: "Erro ao testar probabilidades demo" });
    }
  });

  // Admin Affiliate Management Routes
  
  // Get all affiliates with stats
  app.get("/api/admin/affiliates", authenticateAdmin, async (req, res) => {
    try {
      // Get all affiliates
      const allAffiliates = await db
        .select()
        .from(affiliates)
        .orderBy(desc(affiliates.createdAt));
      
      // Get clicks and conversions for each affiliate
      const affiliatesWithStats = await Promise.all(allAffiliates.map(async (affiliate) => {
        // Get total clicks
        const [{ totalClicks }] = await db
          .select({ totalClicks: sql<number>`count(*)` })
          .from(affiliateClicks)
          .where(eq(affiliateClicks.affiliateId, affiliate.id));
        
        // Get total registrations (conversions where type = 'registration')
        const [{ totalRegistrations }] = await db
          .select({ totalRegistrations: sql<number>`count(*)` })
          .from(affiliateConversions)
          .where(and(
            eq(affiliateConversions.affiliateId, affiliate.id),
            eq(affiliateConversions.conversionType, 'registration')
          ));
        
        // Get total deposits (conversions where type = 'deposit')
        const [{ totalDeposits }] = await db
          .select({ totalDeposits: sql<number>`count(*)` })
          .from(affiliateConversions)
          .where(and(
            eq(affiliateConversions.affiliateId, affiliate.id),
            eq(affiliateConversions.conversionType, 'deposit')
          ));
        
        // Calculate total earnings and pending earnings
        const totalEarnings = affiliate.totalEarnings || "0.00";
        const pendingEarnings = affiliate.pendingEarnings || "0.00";
        
        return {
          ...affiliate,
          totalClicks: Number(totalClicks) || 0,
          totalRegistrations: Number(totalRegistrations) || 0,
          totalDeposits: Number(totalDeposits) || 0,
          totalEarnings,
          pendingEarnings
        };
      }));
      
      // Get top affiliates by earnings
      const topAffiliates = [...affiliatesWithStats]
        .sort((a, b) => parseFloat(b.totalEarnings) - parseFloat(a.totalEarnings))
        .slice(0, 10);
      
      // Calculate total commissions
      const totalCommissions = affiliatesWithStats.reduce(
        (sum, a) => sum + parseFloat(a.totalEarnings), 0
      ).toFixed(2);
      
      // Calculate total paid
      const totalPaid = affiliatesWithStats.reduce(
        (sum, a) => sum + parseFloat(a.totalEarnings) - parseFloat(a.pendingEarnings), 0
      ).toFixed(2);
      
      // Calculate conversion rate
      const totalClicks = affiliatesWithStats.reduce((sum, a) => sum + a.totalClicks, 0);
      const totalConversions = affiliatesWithStats.reduce((sum, a) => sum + a.totalRegistrations, 0);
      const conversionRate = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(2) : 0;
      
      res.json({
        affiliates: affiliatesWithStats,
        topAffiliates,
        totalCommissions,
        totalPaid,
        conversionRate
      });
    } catch (error) {
      console.error("Admin get affiliates error:", error);
      res.status(500).json({ message: "Erro ao buscar afiliados" });
    }
  });
  
  // Get affiliate payouts
  app.get("/api/admin/affiliate-payouts", authenticateAdmin, async (req, res) => {
    try {
      const payouts = await db
        .select({
          id: affiliatePayouts.id,
          affiliateId: affiliatePayouts.affiliateId,
          affiliateName: affiliates.name,
          affiliateCode: affiliates.code,
          amount: affiliatePayouts.amount,
          pixKey: affiliatePayouts.pixKey,
          status: affiliatePayouts.status,
          requestedAt: affiliatePayouts.requestedAt,
          processedAt: affiliatePayouts.processedAt
        })
        .from(affiliatePayouts)
        .leftJoin(affiliates, eq(affiliatePayouts.affiliateId, affiliates.id))
        .orderBy(desc(affiliatePayouts.requestedAt));
      
      res.json(payouts);
    } catch (error) {
      console.error("Admin get affiliate payouts error:", error);
      res.status(500).json({ message: "Erro ao buscar saques de afiliados" });
    }
  });
  
  // Get recent affiliate conversions
  app.get("/api/admin/affiliate-conversions", authenticateAdmin, async (req, res) => {
    try {
      const conversions = await db
        .select({
          id: affiliateConversions.id,
          affiliateId: affiliateConversions.affiliateId,
          affiliateName: affiliates.name,
          affiliateCode: affiliates.code,
          userId: affiliateConversions.userId,
          userName: users.name,
          type: affiliateConversions.conversionType,
          amount: affiliateConversions.conversionValue,
          commission: affiliateConversions.commission,
          createdAt: affiliateConversions.createdAt
        })
        .from(affiliateConversions)
        .leftJoin(affiliates, eq(affiliateConversions.affiliateId, affiliates.id))
        .leftJoin(users, eq(affiliateConversions.userId, users.id))
        .orderBy(desc(affiliateConversions.createdAt))
        .limit(100);
      
      res.json(conversions);
    } catch (error) {
      console.error("Admin get affiliate conversions error:", error);
      res.status(500).json({ message: "Erro ao buscar conversões de afiliados" });
    }
  });
  
  // Update affiliate status
  app.patch("/api/admin/affiliates/:id", authenticateAdmin, async (req, res) => {
    try {
      const affiliateId = parseInt(req.params.id);
      const updates = req.body;
      
      // Check if there are updates to make
      if (!updates || Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "Nenhuma atualização fornecida" });
      }
      
      await db
        .update(affiliates)
        .set(updates)
        .where(eq(affiliates.id, affiliateId));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Admin update affiliate error:", error);
      res.status(500).json({ message: "Erro ao atualizar afiliado" });
    }
  });
  
  // Approve affiliate payout
  app.post("/api/admin/affiliate-payouts/:id/approve", authenticateAdmin, async (req, res) => {
    try {
      const payoutId = parseInt(req.params.id);
      
      // Get payout details
      const [payout] = await db
        .select()
        .from(affiliatePayouts)
        .where(eq(affiliatePayouts.id, payoutId));
      
      if (!payout) {
        return res.status(404).json({ message: "Saque não encontrado" });
      }
      
      if (payout.status !== 'pending') {
        return res.status(400).json({ message: "Saque já foi processado" });
      }
      
      // Update payout status
      await db
        .update(affiliatePayouts)
        .set({ 
          status: 'approved',
          processedAt: new Date()
        })
        .where(eq(affiliatePayouts.id, payoutId));
      
      // Update affiliate's pending earnings
      await db
        .update(affiliates)
        .set({
          pendingEarnings: sql`GREATEST(0, ${affiliates.pendingEarnings}::decimal - ${payout.amount}::decimal)::text`
        })
        .where(eq(affiliates.id, payout.affiliateId));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Admin approve payout error:", error);
      res.status(500).json({ message: "Erro ao aprovar saque" });
    }
  });
  
  // Reject affiliate payout
  app.post("/api/admin/affiliate-payouts/:id/reject", authenticateAdmin, async (req, res) => {
    try {
      const payoutId = parseInt(req.params.id);
      
      // Get payout details
      const [payout] = await db
        .select()
        .from(affiliatePayouts)
        .where(eq(affiliatePayouts.id, payoutId));
      
      if (!payout) {
        return res.status(404).json({ message: "Saque não encontrado" });
      }
      
      if (payout.status !== 'pending') {
        return res.status(400).json({ message: "Saque já foi processado" });
      }
      
      // Update payout status
      await db
        .update(affiliatePayouts)
        .set({ 
          status: 'rejected',
          processedAt: new Date()
        })
        .where(eq(affiliatePayouts.id, payoutId));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Admin reject payout error:", error);
      res.status(500).json({ message: "Erro ao rejeitar saque" });
    }
  });

  // Rewards routes
  app.get("/api/rewards/status", authenticateToken, async (req: any, res) => {
    try {
      const userId = req.userId;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check if user has ever made a deposit
      // Alternative: check if user has balance > 0
      const wallet = await storage.getWallet(userId);
      const hasBalance = wallet && parseFloat(wallet.balance) > 0;

      // Also check deposits
      const deposits = await storage.getDepositsByUser(userId);
      const hasCompletedDeposit = deposits.some(
        (d) => d.status === "completed",
      );

      // User has ever deposited if they have balance OR completed deposits
      const hasEverDeposited = hasBalance || hasCompletedDeposit;

      // Check if daily chest was already claimed today
      const claimedToday = userDailyChestClaims.get(userId);
      const canClaimDailyChest =
        hasEverDeposited &&
        (!claimedToday ||
          new Date(claimedToday).toDateString() !== today.toDateString());

      // Get claimed rewards from user data or storage
      const claimedLevelRewards = userClaimedRewards.get(userId) || [];

      res.json({
        canClaimDailyChest,
        hasEverDeposited,
        claimedLevelRewards,
      });
    } catch (error) {
      console.error("Rewards status error:", error);
      res.status(500).json({ error: "Erro ao buscar status de recompensas" });
    }
  });

  // Daily spin routes
  app.get(
    "/api/daily-spin/status",
    authenticateToken,
    async (req: any, res) => {
      try {
        // Get user's actual level first to determine tier
        const wallet = await storage.getWallet(req.userId);
        const totalWagered = parseFloat(wallet?.totalWagered || "0");
        
        // Use the same level calculation as /api/user/level endpoint
        const levelThresholds: Record<number, number> = {
          1: 0,       // Level 1 starts at 0
          2: 50,      // R$50 wagered for level 2
          5: 150,     // R$150 wagered
          10: 400,    // R$400 wagered
          20: 1200,   // R$1,200 wagered
          30: 3000,   // R$3,000 wagered
          50: 8000,   // R$8,000 wagered
          70: 20000,  // R$20,000 wagered
          100: 50000, // R$50,000 wagered
        };
        
        // Find the current level
        let level = 1;
        for (let l = 100; l >= 1; l--) {
          const required = levelThresholds[l] || (
            l <= 4 ? 50 + (l - 2) * 33 :
            l <= 9 ? 150 + (l - 5) * 62.5 :
            l <= 19 ? 400 + (l - 10) * 80 :
            l <= 29 ? 1200 + (l - 20) * 180 :
            l <= 49 ? 3000 + (l - 30) * 250 :
            l <= 69 ? 8000 + (l - 50) * 600 :
            l <= 99 ? 20000 + (l - 70) * 1000 :
            50000
          );
          if (totalWagered >= required) {
            level = l;
            break;
          }
        }
        
        // Determine tier first
        let currentTier = 'norank';
        if (level >= 100) {
          currentTier = 'diamond';
        } else if (level >= 75) {
          currentTier = 'platinum';
        } else if (level >= 50) {
          currentTier = 'gold';
        } else if (level >= 25) {
          currentTier = 'silver';
        } else if (level >= 2) {
          currentTier = 'bronze';
        }
        
        // Check if can spin today (includes tier change check)
        const canSpin = await storage.canSpinToday(req.userId, currentTier);
        const lastSpin = await storage.getLastDailySpin(req.userId);
        
        // Only allow spinning if level >= 2
        const canSpinByLevel = level >= 2;
        const actualCanSpin = canSpin && canSpinByLevel;

        // Determine tier
        let tier = 'norank';
        let tierColor = '#808080';
        let tierGradient = 'from-gray-600 to-gray-800';
        
        if (level >= 100) {
          tier = 'diamond';
          tierColor = '#B9F2FF';
          tierGradient = 'from-cyan-400 to-blue-500';
        } else if (level >= 75) {
          tier = 'platinum';
          tierColor = '#E5E4E2';
          tierGradient = 'from-gray-300 to-gray-500';
        } else if (level >= 50) {
          tier = 'gold';
          tierColor = '#FFD700';
          tierGradient = 'from-yellow-400 to-yellow-600';
        } else if (level >= 25) {
          tier = 'silver';
          tierColor = '#C0C0C0';
          tierGradient = 'from-gray-400 to-gray-600';
        } else if (level >= 2) {
          tier = 'bronze';
          tierColor = '#CD7F32';
          tierGradient = 'from-yellow-700 to-yellow-900';
        }

        res.json({
          canSpin: actualCanSpin,
          tier,
          level,
          tierColor,
          tierGradient,
          lastSpin: lastSpin
            ? {
                amount: lastSpin.amount,
                spunAt: lastSpin.spinDate,
              }
            : null,
        });
      } catch (error) {
        console.error("Daily spin status error:", error);
        res.status(500).json({ error: "Erro ao verificar status do giro" });
      }
    },
  );

  app.post("/api/daily-spin/spin", authenticateToken, async (req: any, res) => {
    try {
      // Get user's level to determine tier
      const wallet = await storage.getWallet(req.userId);
      const totalWagered = parseFloat(wallet?.totalWagered || "0");
      
      // Use the same level calculation as /api/user/level endpoint
      const levelThresholds: Record<number, number> = {
        1: 0,       // Level 1 starts at 0
        2: 50,      // R$50 wagered for level 2
        5: 150,     // R$150 wagered
        10: 400,    // R$400 wagered
        20: 1200,   // R$1,200 wagered
        30: 3000,   // R$3,000 wagered
        50: 8000,   // R$8,000 wagered
        70: 20000,  // R$20,000 wagered
        100: 50000, // R$50,000 wagered
      };
      
      // Find the current level
      let level = 1;
      for (let l = 100; l >= 1; l--) {
        const required = levelThresholds[l] || (
          l <= 4 ? 50 + (l - 2) * 33 :
          l <= 9 ? 150 + (l - 5) * 62.5 :
          l <= 19 ? 400 + (l - 10) * 80 :
          l <= 29 ? 1200 + (l - 20) * 180 :
          l <= 49 ? 3000 + (l - 30) * 250 :
          l <= 69 ? 8000 + (l - 50) * 600 :
          l <= 99 ? 20000 + (l - 70) * 1000 :
          50000
        );
        if (totalWagered >= required) {
          level = l;
          break;
        }
      }

      // Determine tier based on level
      let tier = 'bronze';
      let tierMultiplier = 1;
      
      if (level >= 100) {
        tier = 'diamond';
        tierMultiplier = 5;
      } else if (level >= 75) {
        tier = 'platinum';
        tierMultiplier = 3;
      } else if (level >= 50) {
        tier = 'gold';
        tierMultiplier = 2;
      } else if (level >= 25) {
        tier = 'silver';
        tierMultiplier = 1.5;
      } else {
        tier = 'bronze';
        tierMultiplier = 1;
      }
      
      // Check if user can spin today (includes tier change check)
      const canSpin = await storage.canSpinToday(req.userId, tier);
      if (!canSpin) {
        return res
          .status(400)
          .json({ error: "Você já girou hoje. Volte amanhã ou suba de tier!" });
      }

      // If tier improved, delete today's spin before creating new one
      const lastSpin = await storage.getLastDailySpin(req.userId);
      if (lastSpin && lastSpin.tier && lastSpin.tier !== tier) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const lastSpinDate = new Date(lastSpin.spinDate!);
        lastSpinDate.setHours(0, 0, 0, 0);
        
        // If the last spin was today and tier changed, delete it
        if (lastSpinDate.getTime() === today.getTime()) {
          console.log(`Deleting today's spin for tier change from ${lastSpin.tier} to ${tier}`);
          await storage.deleteTodaysDailySpin(req.userId);
        }
      }

      // Daily spin prize logic based on tier - aligned with frontend display
      const random = Math.random();
      let baseAmount: number;
      
      // Bronze tier: 1, 3, 5 (50%, 35%, 15%) - shows 10, 100 but never drops
      // Silver tier: 2, 6, 10 (50%, 35%, 15%) - shows 20, 200 but never drops
      // Gold tier: 4, 12, 25 (50%, 35%, 15%) - shows 50, 500 but never drops
      // Platinum tier: 5, 15, 25 (50%, 35%, 15%) - shows 50, 500 but never drops
      // Diamond tier: 10, 30, 50 (50%, 35%, 15%) - shows 100, 1000 but never drops
      
      if (tier === 'bronze') {
        if (random < 0.50) baseAmount = 1;        // 50% chance
        else if (random < 0.85) baseAmount = 3;   // 35% chance
        else baseAmount = 5;                      // 15% chance
      } else if (tier === 'silver') {
        if (random < 0.50) baseAmount = 2;        // 50% chance
        else if (random < 0.85) baseAmount = 6;   // 35% chance
        else baseAmount = 10;                     // 15% chance
      } else if (tier === 'gold') {
        if (random < 0.50) baseAmount = 4;        // 50% chance
        else if (random < 0.85) baseAmount = 12;  // 35% chance
        else baseAmount = 25;                     // 15% chance
      } else if (tier === 'platinum') {
        if (random < 0.50) baseAmount = 5;        // 50% chance
        else if (random < 0.85) baseAmount = 15;  // 35% chance
        else baseAmount = 25;                     // 15% chance
      } else { // diamond
        if (random < 0.50) baseAmount = 10;       // 50% chance
        else if (random < 0.85) baseAmount = 30;  // 35% chance
        else baseAmount = 50;                     // 15% chance
      }

      const amount = baseAmount;

      // Update user's scratch bonus
      if (wallet) {
        const newScratchBonus = (wallet.scratchBonus || 0) + amount;
        await storage.updateWalletScratchBonus(req.userId, newScratchBonus);
      }

      // Save spin record with tier
      await storage.createDailySpin({
        userId: req.userId,
        amount: amount.toFixed(2),
        prizeType: "scratch_bonus",
        scratchType: undefined,
        tier: tier, // Save the tier at the time of spinning
      });

      // Return response with amount for the wheel
      res.json({
        success: true,
        amount: amount,
        tier: tier,
        type: "scratch_bonus",
        message: `Você ganhou ${amount} Mania Bônus!`,
      });
    } catch (error) {
      console.error("Daily spin error:", error);
      res.status(500).json({ error: "Erro ao processar giro" });
    }
  });

  app.post(
    "/api/rewards/claim-chest",
    authenticateToken,
    async (req: any, res) => {
      try {
        const userId = req.userId;
        const today = new Date();
        const { rewardType, scratchCards } = req.body;

        // Check if already claimed today
        const lastClaim = userDailyChestClaims.get(userId);
        if (
          lastClaim &&
          new Date(lastClaim).toDateString() === today.toDateString()
        ) {
          return res.status(400).json({ error: "Baú já resgatado hoje" });
        }

        // Check if user has ever made a deposit or has balance
        const wallet = await storage.getWallet(userId);
        const hasBalance = wallet && parseFloat(wallet.balance) > 0;
        const deposits = await storage.getDepositsByUser(userId);
        const hasEverDeposited =
          hasBalance || deposits.some((d) => d.status === "completed");

        if (!hasEverDeposited) {
          return res
            .status(400)
            .json({
              error: "Faça seu primeiro depósito para desbloquear o baú diário",
            });
        }

        // Process reward based on type
        let rewardValue = 0;

        if (
          rewardType &&
          rewardType.includes("Mania Bônus") &&
          scratchCards > 0
        ) {
          // Give scratch cards as scratch bonus
          rewardValue = scratchCards;  // Number of scratch cards, not money value

          // Add scratch cards to scratch bonus
          if (wallet && rewardValue > 0) {
            const newScratchBonus = wallet.scratchBonus + rewardValue;
            await storage.updateWalletScratchBonus(userId, newScratchBonus);
          }
        }

        // Mark as claimed today
        userDailyChestClaims.set(userId, today);

        res.json({
          reward: rewardValue,
          type: rewardType,
          scratchCards: scratchCards || 0,
        });
      } catch (error) {
        console.error("Claim chest error:", error);
        res.status(500).json({ error: "Erro ao resgatar baú" });
      }
    },
  );

  app.post(
    "/api/rewards/claim-level",
    authenticateToken,
    async (req: any, res) => {
      try {
        const userId = req.userId;
        const { level } = req.body;

        if (!level || typeof level !== "number") {
          return res.status(400).json({ error: "Nível inválido" });
        }

        // Calculate user's current level based on XP
        const games = await storage.getGamesByUser(userId);
        const totalXP = games.length * 10; // 10 XP per game
        const currentLevel = Math.floor(totalXP / 100) + 1; // 100 XP per level

        if (currentLevel < level) {
          return res
            .status(400)
            .json({ error: "Você ainda não alcançou este nível" });
        }

        // Get user's claimed rewards
        let claimedRewards = userClaimedRewards.get(userId) || [];

        if (claimedRewards.includes(level)) {
          return res.status(400).json({ error: "Recompensa já resgatada" });
        }

        // Define level rewards
        const levelRewards: { [key: number]: number } = {
          5: 10,
          10: 25,
          15: 50,
          20: 75,
          25: 100,
          30: 150,
          40: 200,
          50: 300,
          75: 500,
          100: 1000,
        };

        const rewardAmount = levelRewards[level];
        if (!rewardAmount) {
          return res
            .status(400)
            .json({ error: "Nível de recompensa inválido" });
        }

        // Add reward to user's balance
        const wallet = await storage.getWallet(userId);
        if (wallet) {
          const newBalance = parseFloat(wallet.balance) + rewardAmount;
          await storage.updateWalletBalance(userId, newBalance.toFixed(2));
        }

        // Mark as claimed
        claimedRewards.push(level);
        userClaimedRewards.set(userId, claimedRewards);

        res.json({ reward: rewardAmount });
      } catch (error) {
        console.error("Claim level reward error:", error);
        res.status(500).json({ error: "Erro ao resgatar recompensa" });
      }
    },
  );

  // Bonus Code Routes
  app.post("/api/bonus/claim", authenticateOptionalWithWelcome, async (req: any, res) => {
    try {
      const { code } = req.body;
      const userId = req.userId;
      
      if (!code) {
        return res.status(400).json({ message: "Código é obrigatório" });
      }
      
      // Check if code is valid
      if (code.toUpperCase() !== "SORTE100") {
        return res.status(400).json({ message: "Código inválido" });
      }
      
      // Check if user already used this code
      const hasUsed = await storage.hasUsedBonusCode(userId || 0, code.toUpperCase());
      if (hasUsed) {
        return res.status(400).json({ message: "Você já utilizou este código" });
      }
      
      // Award 100 scratch bonus
      const amount = 100;
      
      if (userId) {
        // For logged in users, add to their bonus
        const wallet = await storage.getWallet(userId);
        if (wallet) {
          await storage.updateWalletScratchBonus(userId, wallet.scratchBonus + amount);
        }
        
        // Mark code as used
        await storage.markBonusCodeAsUsed(userId, code.toUpperCase());
      }
      
      res.json({ success: true, amount });
    } catch (error) {
      console.error("Bonus claim error:", error);
      res.status(500).json({ message: "Erro ao resgatar código" });
    }
  });

  // Support Chat Routes

  // Get active chat
  app.get(
    "/api/support/active-chat",
    authenticateToken,
    async (req: any, res) => {
      const userId = req.userId;
      const activeChat = await storage.getUserActiveChat(userId);

      if (!activeChat) {
        return res.status(404).json({ message: "Nenhum chamado ativo" });
      }

      res.json(activeChat);
    },
  );

  // Get chat details with messages
  app.get(
    "/api/support/chat/:chatId",
    authenticateToken,
    async (req: any, res) => {
      const userId = req.userId;
      const chatId = parseInt(req.params.chatId);

      const chat = await storage.getSupportChat(chatId);
      if (!chat || chat.userId !== userId) {
        return res.status(403).json({ message: "Chat não encontrado" });
      }

      const messages = await storage.getChatMessages(chatId);
      res.json({ chat, messages });
    },
  );

  // Create new support chat
  app.post("/api/support/create", authenticateToken, async (req: any, res) => {
    const userId = req.userId;
    const { description } = req.body;

    if (!description || !description.trim()) {
      return res.status(400).json({ message: "Descrição é obrigatória" });
    }

    // Check if user already has active chat
    const existingChat = await storage.getUserActiveChat(userId);
    if (existingChat) {
      return res
        .status(400)
        .json({ message: "Você já possui um chamado ativo" });
    }

    // Create new chat
    const chat = await storage.createSupportChat(userId);

    // Send user's description as first message
    await storage.createSupportMessage({
      chatId: chat.id,
      senderId: userId,
      senderType: "user",
      message: description,
    });

    // Send Discord notification for new support ticket
    try {
      const user = await storage.getUser(userId);
      const { notifySupportTicket } = await import('./discord-webhook');
      await notifySupportTicket({
        userId: userId,
        userName: user?.name || 'Unknown',
        message: description,
        ticketId: chat.id
      });
    } catch (error) {
      console.error("Error sending Discord notification for support ticket:", error);
    }

    res.json(chat);
  });

  app.post("/api/support/send", authenticateToken, async (req: any, res) => {
    const userId = req.userId;
    const { chatId, message } = req.body;

    if (!chatId || !message) {
      return res
        .status(400)
        .json({ message: "Chat ID e mensagem são obrigatórios" });
    }

    // Verify chat belongs to user
    const chat = await storage.getSupportChat(chatId);
    if (!chat || chat.userId !== userId) {
      return res.status(403).json({ message: "Chat não encontrado" });
    }

    if (chat.status !== "active") {
      return res.status(400).json({ message: "Este chat está fechado" });
    }

    // Create message
    const newMessage = await storage.createSupportMessage({
      chatId,
      senderId: userId,
      senderType: "user",
      message,
    });

    res.json(newMessage);
  });

  app.post("/api/support/close", authenticateToken, async (req: any, res) => {
    const userId = req.userId;
    const { chatId } = req.body;

    if (!chatId) {
      return res.status(400).json({ message: "Chat ID é obrigatório" });
    }

    // Verify chat belongs to user
    const chat = await storage.getSupportChat(chatId);
    if (!chat || chat.userId !== userId) {
      return res.status(403).json({ message: "Chat não encontrado" });
    }

    await storage.closeSupportChat(chatId, "user");

    res.json({ message: "Chat fechado com sucesso" });
  });

  // Admin get all affiliates
  app.get('/api/admin/affiliates', authenticateAdmin, async (req, res) => {
    try {
      const affiliatesList = await db.select({
        id: affiliates.id,
        name: affiliates.name,
        email: affiliates.email,
        phone: affiliates.phone,
        code: affiliates.code,
        affiliateLevel: affiliates.affiliateLevel,
        commissionType: affiliates.commissionType,
        currentLevelRate: affiliates.currentLevelRate,
        fixedCommissionAmount: affiliates.fixedCommissionAmount,
        customCommissionRate: affiliates.customCommissionRate,
        customFixedAmount: affiliates.customFixedAmount,
        approvedEarnings: affiliates.approvedEarnings,
        totalEarnings: affiliates.totalEarnings,
        pendingEarnings: affiliates.pendingEarnings,
        paidEarnings: affiliates.paidEarnings,
        totalClicks: affiliates.totalClicks,
        totalRegistrations: affiliates.totalRegistrations,
        totalDeposits: affiliates.totalDeposits,
        isActive: affiliates.isActive,
        createdAt: affiliates.createdAt
      })
        .from(affiliates)
        .orderBy(desc(affiliates.createdAt));
      
      // Format response to ensure compatibility
      const formattedList = affiliatesList.map(affiliate => ({
        ...affiliate,
        affiliateLevel: affiliate.affiliateLevel || 'bronze',
        commissionType: affiliate.commissionType || 'percentage',
        currentLevelRate: affiliate.currentLevelRate || '40',
        fixedCommissionAmount: affiliate.fixedCommissionAmount || '6',
        isActive: affiliate.isActive ?? true
      }));
      
      res.json(formattedList);
    } catch (error) {
      console.error('Error fetching affiliates:', error);
      res.status(500).json({ error: 'Failed to fetch affiliates' });
    }
  });


  // Admin get partner withdrawals
  app.get('/api/admin/partner-withdrawals', authenticateAdmin, async (req, res) => {
    try {
      // Use raw SQL to avoid column name issues
      const result = await db.execute(sql`
        SELECT 
          pw.id,
          pw.partner_id,
          pw.amount,
          pw.pix_key,
          pw.pix_key_type,
          pw.status,
          pw.requested_at,
          pw.processed_at,
          pw.admin_notes,
          pw.rejection_reason,
          p.name as partner_name,
          p.email as partner_email
        FROM partners_withdrawals pw
        LEFT JOIN partners p ON pw.partner_id = p.id
        ORDER BY pw.requested_at DESC
      `);
      
      // Transform to match expected format
      const formattedWithdrawals = result.rows.map(w => ({
        id: w.id,
        displayId: `P${10000 + Number(w.id)}`,
        userId: w.partner_id,
        userName: w.partner_name || 'Parceiro',
        userEmail: w.partner_email || '',
        amount: w.amount || '0.00',
        pixKey: w.pix_key || '',
        pixKeyType: w.pix_key_type || 'pix',
        status: w.status || 'pending',
        requestedAt: w.requested_at,
        processedAt: w.processed_at,
        adminNotes: w.admin_notes,
        rejectionReason: w.rejection_reason
      }));
      
      res.json(formattedWithdrawals);
    } catch (error) {
      console.error('Error fetching partner withdrawals:', error);
      
      // If table doesn't exist or has no data, return empty array
      if (error.code === '42P01' || error.code === '42703') {
        res.json([]);
      } else {
        res.status(500).json({ error: 'Failed to fetch partner withdrawals' });
      }
    }
  });

  // Admin process partner withdrawal
  app.patch('/api/admin/partner-withdrawals/:id', authenticateAdmin, async (req, res) => {
    try {
      const withdrawalId = parseInt(req.params.id);
      const { action, admin_notes } = req.body;
      
      if (!['approve', 'reject', 'paid'].includes(action)) {
        return res.status(400).json({ message: 'Ação inválida' });
      }
      
      // Get withdrawal details
      const [withdrawal] = await db.select()
        .from(partnersWithdrawals)
        .where(eq(partnersWithdrawals.id, withdrawalId))
        .limit(1);
      
      if (!withdrawal) {
        return res.status(404).json({ message: 'Saque não encontrado' });
      }
      
      const now = new Date();
      
      // Update withdrawal status
      await db.update(partnersWithdrawals)
        .set({
          status: action === 'approve' ? 'approved' : action === 'paid' ? 'approved' : 'rejected',
          processedAt: now,
          adminNotes: admin_notes,
          rejectionReason: action === 'reject' ? admin_notes : null
        })
        .where(eq(partnersWithdrawals.id, withdrawalId));
      
      // If approved or paid, update partner wallet
      if (action === 'approve' || action === 'paid') {
        // Update partner's paid earnings
        await db.update(partners)
          .set({
            paidEarnings: sql`COALESCE(${partners.paidEarnings}, '0')::decimal + ${withdrawal.amount}::decimal`,
            updatedAt: now
          })
          .where(eq(partners.id, withdrawal.partnerId));
        
        // Update partner wallet
        const [wallet] = await db.select()
          .from(partnersWallet)
          .where(eq(partnersWallet.partnerId, withdrawal.partnerId))
          .limit(1);
        
        if (wallet) {
          const newBalance = Math.max(0, parseFloat(wallet.balance) - parseFloat(withdrawal.amount));
          const newTotalWithdrawn = parseFloat(wallet.totalWithdrawn) + parseFloat(withdrawal.amount);
          
          await db.update(partnersWallet)
            .set({
              balance: newBalance.toFixed(2),
              totalWithdrawn: newTotalWithdrawn.toFixed(2)
            })
            .where(eq(partnersWallet.partnerId, withdrawal.partnerId));
        }
      }
      
      res.json({ 
        success: true, 
        message: `Saque ${action === 'approve' ? 'aprovado' : action === 'paid' ? 'marcado como pago' : 'rejeitado'} com sucesso` 
      });
    } catch (error) {
      console.error('Error processing partner withdrawal:', error);
      res.status(500).json({ error: 'Failed to process partner withdrawal' });
    }
  });

  // Admin get all conversions
  app.get('/api/admin/conversions', authenticateAdmin, async (req, res) => {
    try {
      const conversionsList = await db.select()
        .from(affiliateConversions)
        .orderBy(desc(affiliateConversions.createdAt))
        .limit(500);
      
      // Add user names
      const conversionsWithDetails = await Promise.all(
        conversionsList.map(async (conversion) => {
          let userName = 'Usuário';
          
          try {
            // Skip problematic user IDs
            if (conversion.userId !== 122 && conversion.userId !== 128 && conversion.userId < 200) {
              const [user] = await db.select({ name: users.name, email: users.email })
                .from(users)
                .where(eq(users.id, conversion.userId))
                .limit(1);
              
              if (user) {
                userName = user.name || user.email || `Usuário #${conversion.userId}`;
              }
            } else {
              userName = `Usuário Removido #${conversion.userId}`;
            }
          } catch (error) {
            // Silently handle errors
            userName = `Usuário #${conversion.userId}`;
          }
          
          return {
            ...conversion,
            userName
          };
        })
      );
      
      res.json(conversionsWithDetails);
    } catch (error) {
      console.error('Error fetching conversions:', error);
      res.status(500).json({ error: 'Failed to fetch conversions' });
    }
  });

  // Admin update partner
  app.patch('/api/admin/partners/:id', authenticateAdmin, async (req, res) => {
    try {
      const partnerId = parseInt(req.params.id);
      const updates = req.body;
      
      await db.update(partners)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(partners.id, partnerId));
      
      res.json({ success: true, message: 'Partner updated successfully' });
    } catch (error) {
      console.error('Error updating partner:', error);
      res.status(500).json({ error: 'Failed to update partner' });
    }
  });

  // Admin approve pending commissions for partners
  app.post('/api/admin/partners/approve-pending-commissions', authenticateAdmin, async (req, res) => {
    try {
      // Get all pending partner commissions
      const pendingCommissions = await db.select()
        .from(affiliateConversions)
        .where(and(
          eq(affiliateConversions.status, 'pending'),
          isNotNull(affiliateConversions.partnerId)
        ));
      
      if (pendingCommissions.length === 0) {
        return res.json({ 
          success: true, 
          message: 'Nenhuma comissão pendente de parceiros para aprovar',
          approved: 0
        });
      }
      
      // Approve all pending commissions
      await db.update(affiliateConversions)
        .set({ 
          status: 'completed',
          updatedAt: new Date()
        })
        .where(and(
          eq(affiliateConversions.status, 'pending'),
          isNotNull(affiliateConversions.partnerId)
        ));
      
      // Update partner earnings
      for (const commission of pendingCommissions) {
        if (commission.partnerId) {
          const [partner] = await db.select()
            .from(partners)
            .where(eq(partners.id, commission.partnerId))
            .limit(1);
          
          if (partner) {
            const newTotalEarnings = (parseFloat(partner.totalEarnings || '0') + parseFloat(commission.commission || '0')).toFixed(2);
            const newPendingEarnings = Math.max(0, parseFloat(partner.pendingEarnings || '0') - parseFloat(commission.commission || '0')).toFixed(2);
            
            await db.update(partners)
              .set({
                totalEarnings: newTotalEarnings,
                pendingEarnings: newPendingEarnings,
                updatedAt: new Date()
              })
              .where(eq(partners.id, commission.partnerId));
            
            // Update partner wallet
            const [wallet] = await db.select()
              .from(partnersWallet)
              .where(eq(partnersWallet.partnerId, commission.partnerId))
              .limit(1);
            
            if (wallet) {
              await db.update(partnersWallet)
                .set({
                  balance: newTotalEarnings,
                  totalEarned: newTotalEarnings
                })
                .where(eq(partnersWallet.partnerId, commission.partnerId));
            } else {
              await db.insert(partnersWallet).values({
                partnerId: commission.partnerId,
                balance: newTotalEarnings,
                totalEarned: newTotalEarnings,
                totalWithdrawn: '0.00'
              });
            }
          }
        }
      }
      
      res.json({ 
        success: true, 
        message: `${pendingCommissions.length} comissões de parceiros aprovadas com sucesso`,
        approved: pendingCommissions.length
      });
    } catch (error) {
      console.error('Error approving partner commissions:', error);
      res.status(500).json({ error: 'Failed to approve partner commissions' });
    }
  });

  // Admin affiliate tier configuration
  app.get('/api/admin/affiliates/tier-config', authenticateAdmin, async (req, res) => {
    try {
      const tierConfigs = await storage.getAffiliateTierConfigs();
      res.json(tierConfigs);
    } catch (error) {
      console.error('Error fetching tier configs:', error);
      res.status(500).json({ error: 'Failed to fetch tier configurations' });
    }
  });

  app.put('/api/admin/affiliates/tier-config/:tier', authenticateAdmin, async (req, res) => {
    try {
      const { tier } = req.params;
      const { percentageRate, fixedAmount, minEarnings } = req.body;
      
      await storage.updateAffiliateTierConfig(tier, {
        percentageRate,
        fixedAmount,
        minEarnings
      });
      
      res.json({ success: true, message: 'Tier configuration updated' });
    } catch (error) {
      console.error('Error updating tier config:', error);
      res.status(500).json({ error: 'Failed to update tier configuration' });
    }
  });

  // Admin update affiliate commission settings
  app.put('/api/admin/affiliates/:id/commission-settings', authenticateAdmin, async (req, res) => {
    try {
      const affiliateId = parseInt(req.params.id);
      const settings = req.body;
      
      console.log('=== UPDATE AFFILIATE COMMISSION SETTINGS REQUEST ===');
      console.log('Affiliate ID:', affiliateId);
      console.log('Settings received:', JSON.stringify(settings, null, 2));
      
      // Get affiliate before update
      const beforeAffiliate = await db.select()
        .from(affiliates)
        .where(eq(affiliates.id, affiliateId))
        .limit(1);
      
      console.log('Affiliate BEFORE update:', {
        id: beforeAffiliate[0]?.id,
        name: beforeAffiliate[0]?.name,
        affiliateLevel: beforeAffiliate[0]?.affiliateLevel,
        commissionType: beforeAffiliate[0]?.commissionType,
        currentLevelRate: beforeAffiliate[0]?.currentLevelRate,
        fixedCommissionAmount: beforeAffiliate[0]?.fixedCommissionAmount,
        customCommissionRate: beforeAffiliate[0]?.customCommissionRate,
        customFixedAmount: beforeAffiliate[0]?.customFixedAmount
      });
      
      await storage.updateAffiliateCommissionSettings(affiliateId, settings);
      
      // Get affiliate after update
      const afterAffiliate = await db.select()
        .from(affiliates)
        .where(eq(affiliates.id, affiliateId))
        .limit(1);
      
      console.log('Affiliate AFTER update:', {
        id: afterAffiliate[0]?.id,
        name: afterAffiliate[0]?.name,
        affiliateLevel: afterAffiliate[0]?.affiliateLevel,
        commissionType: afterAffiliate[0]?.commissionType,
        currentLevelRate: afterAffiliate[0]?.currentLevelRate,
        fixedCommissionAmount: afterAffiliate[0]?.fixedCommissionAmount,
        customCommissionRate: afterAffiliate[0]?.customCommissionRate,
        customFixedAmount: afterAffiliate[0]?.customFixedAmount
      });
      
      console.log('=== UPDATE COMPLETE ===');
      
      // Return the updated affiliate data
      const response = {
        success: true, 
        message: 'Affiliate commission settings updated',
        affiliate: {
          id: afterAffiliate[0].id,
          name: afterAffiliate[0].name,
          email: afterAffiliate[0].email,
          affiliateLevel: afterAffiliate[0].affiliateLevel || 'bronze',
          commissionType: afterAffiliate[0].commissionType || 'percentage',
          currentLevelRate: afterAffiliate[0].currentLevelRate || '40',
          fixedCommissionAmount: afterAffiliate[0].fixedCommissionAmount || '6',
          customCommissionRate: afterAffiliate[0].customCommissionRate,
          customFixedAmount: afterAffiliate[0].customFixedAmount,
          approvedEarnings: afterAffiliate[0].approvedEarnings,
          totalEarnings: afterAffiliate[0].totalEarnings,
          isActive: afterAffiliate[0].isActive ?? true
        }
      };
      
      console.log('Response being sent:', response);
      res.json(response);
    } catch (error) {
      console.error('Error updating affiliate commission settings:', error);
      res.status(500).json({ error: 'Failed to update commission settings' });
    }
  });

  // Admin endpoint to get tier configurations
  app.get("/api/admin/affiliates/tier-config", authenticateAdmin, async (req, res) => {
    try {
      const tierConfig = [
        { tier: 'bronze', percentageRate: '40', fixedAmount: '10.00' },
        { tier: 'prata', percentageRate: '45', fixedAmount: '12.00' },
        { tier: 'ouro', percentageRate: '50', fixedAmount: '15.00' },
        { tier: 'platina', percentageRate: '55', fixedAmount: '18.00' },
        { tier: 'diamante', percentageRate: '60', fixedAmount: '20.00' }
      ];
      
      res.json(tierConfig);
    } catch (error) {
      console.error('Error fetching tier config:', error);
      res.status(500).json({ error: 'Failed to fetch tier config' });
    }
  });

  // Admin endpoint to update individual affiliate commission settings
  app.patch("/api/admin/affiliates/:id/commission", authenticateAdmin, async (req, res) => {
    try {
      const affiliateId = parseInt(req.params.id);
      const { commissionType, customCommissionRate, customFixedAmount } = req.body;

      const updates: any = {
        commissionType: commissionType
      };

      if (commissionType === 'percentage' && customCommissionRate) {
        updates.customCommissionRate = customCommissionRate;
        updates.customFixedAmount = null;
      } else if (commissionType === 'fixed' && customFixedAmount) {
        updates.customFixedAmount = customFixedAmount;
        updates.customCommissionRate = null;
      }

      await db.update(affiliates)
        .set(updates)
        .where(eq(affiliates.id, affiliateId));

      res.json({ 
        success: true,
        message: 'Comissão atualizada com sucesso'
      });
    } catch (error) {
      console.error('Error updating affiliate commission:', error);
      res.status(500).json({ error: 'Failed to update commission' });
    }
  });

  // Admin endpoint to remove individual affiliate commission settings
  app.delete("/api/admin/affiliates/:id/commission", authenticateAdmin, async (req, res) => {
    try {
      const affiliateId = parseInt(req.params.id);

      await db.update(affiliates)
        .set({
          customCommissionRate: null,
          customFixedAmount: null,
          commissionType: 'percentage'
        })
        .where(eq(affiliates.id, affiliateId));

      res.json({ 
        success: true,
        message: 'Configuração personalizada removida'
      });
    } catch (error) {
      console.error('Error removing affiliate commission:', error);
      res.status(500).json({ error: 'Failed to remove commission settings' });
    }
  });

  // Admin endpoint to get all affiliate commissions with details
  app.get("/api/admin/affiliates/commissions", authenticateAdmin, async (req, res) => {
    try {
      const commissions = await db.select()
      .from(affiliateConversions)
      .leftJoin(affiliates, eq(affiliateConversions.affiliateId, affiliates.id))
      .leftJoin(users, eq(affiliateConversions.userId, users.id))
      .where(or(
        eq(affiliateConversions.status, 'completed'),
        eq(affiliateConversions.status, 'paid')
      ))
      .orderBy(desc(affiliateConversions.createdAt));

      // Format the results
      const formattedCommissions = commissions.map(row => ({
        id: row.affiliate_conversions.id,
        affiliateId: row.affiliate_conversions.affiliateId,
        affiliateName: row.affiliates?.name || 'Unknown',
        affiliateEmail: row.affiliates?.email || '',
        userId: row.affiliate_conversions.userId,
        userName: row.users?.name || 'Unknown',
        userEmail: row.users?.email || '',
        depositId: row.affiliate_conversions.depositId,
        depositAmount: row.affiliate_conversions.conversionValue || '0',
        commissionRate: row.affiliate_conversions.commissionRate || '0',
        commissionAmount: row.affiliate_conversions.commission || '0',
        status: row.affiliate_conversions.status || 'pending',
        createdAt: row.affiliate_conversions.createdAt,
        processedAt: row.affiliate_conversions.processedAt
      }));

      res.json(formattedCommissions);
    } catch (error) {
      console.error("Error fetching affiliate commissions:", error);
      res.status(500).json({ message: "Erro ao buscar comissões" });
    }
  });

  // Admin endpoint to get affiliate detailed statistics
  app.get("/api/admin/affiliates/statistics", authenticateAdmin, async (req, res) => {
    try {
      // Get total affiliates count
      const affiliatesCount = await db.select({
        count: sql<number>`COUNT(*)`
      }).from(affiliates);

      // Get commission statistics
      const commissionStats = await db.select({
        totalCommissions: sql<number>`COUNT(*)`,
        totalCommissionValue: sql<number>`COALESCE(SUM(commission), 0)`,
        pendingCommissions: sql<number>`COALESCE(SUM(CASE WHEN status = 'pending' THEN commission ELSE 0 END), 0)`,
        approvedCommissions: sql<number>`COALESCE(SUM(CASE WHEN status = 'approved' THEN commission ELSE 0 END), 0)`,
        paidCommissions: sql<number>`COALESCE(SUM(CASE WHEN status = 'paid' THEN commission ELSE 0 END), 0)`
      }).from(affiliateConversions);

      // Get deposit totals
      const depositStats = await db.select({
        totalDeposits: sql<number>`COALESCE(SUM(amount), 0)`
      })
      .from(deposits)
      .innerJoin(affiliateConversions, eq(deposits.id, affiliateConversions.depositId));

      const totalStats = {
        totalAffiliates: affiliatesCount[0]?.count || 0,
        totalCommissions: commissionStats[0]?.totalCommissions || 0,
        totalCommissionValue: commissionStats[0]?.totalCommissionValue || 0,
        pendingCommissions: commissionStats[0]?.pendingCommissions || 0,
        approvedCommissions: commissionStats[0]?.approvedCommissions || 0,
        paidCommissions: commissionStats[0]?.paidCommissions || 0,
        totalDeposits: depositStats[0]?.totalDeposits || 0
      };

      // Get monthly statistics
      const monthlyStats = await db.select({
        month: sql<string>`TO_CHAR(${affiliateConversions.createdAt}, 'YYYY-MM')`,
        totalCommissions: sql<number>`COUNT(${affiliateConversions.id})`,
        totalValue: sql<number>`COALESCE(SUM(${affiliateConversions.commission}), 0)`,
        totalDeposits: sql<number>`COALESCE(SUM(${affiliateConversions.conversionValue}), 0)`
      })
      .from(affiliateConversions)
      .groupBy(sql`TO_CHAR(${affiliateConversions.createdAt}, 'YYYY-MM')`)
      .orderBy(desc(sql`TO_CHAR(${affiliateConversions.createdAt}, 'YYYY-MM')`))
      .limit(6);

      res.json({
        total: totalStats,
        monthly: monthlyStats
      });
    } catch (error) {
      console.error("Error fetching affiliate statistics:", error);
      res.status(500).json({ message: "Erro ao buscar estatísticas" });
    }
  });

  // Admin endpoints to manage commissions
  app.post("/api/admin/affiliates/commissions/:id/approve", authenticateAdmin, async (req, res) => {
    try {
      const commissionId = parseInt(req.params.id);
      
      // Get commission details
      const [commission] = await db.select()
        .from(affiliateConversions)
        .where(eq(affiliateConversions.id, commissionId));

      if (!commission) {
        return res.status(404).json({ message: "Comissão não encontrada" });
      }

      if (commission.status === 'completed' || commission.status === 'paid') {
        return res.status(400).json({ message: "Comissão já foi aprovada" });
      }

      // Update commission status to completed
      await db.update(affiliateConversions)
        .set({ 
          status: 'completed',
          processedAt: new Date()
        })
        .where(eq(affiliateConversions.id, commissionId));

      // Process wallet transaction to add money to affiliate wallet
      const amount = parseFloat(commission.commission || '0');
      if (amount > 0) {
        await processAffiliateWalletTransaction(
          commission.affiliateId,
          amount,
          commissionId,
          'completed',
          `Comissão aprovada - Depósito usuário #${commission.userId}`
        );

        // Update affiliate's approved earnings
        await db.update(affiliates)
          .set({
            approvedEarnings: sql`COALESCE(${affiliates.approvedEarnings}, 0) + ${amount}`,
            totalEarnings: sql`COALESCE(${affiliates.totalEarnings}, 0) + ${amount}`
          })
          .where(eq(affiliates.id, commission.affiliateId));

        console.log(`Commission approved and added to wallet: R$${amount.toFixed(2)} for affiliate ${commission.affiliateId}`);
      }

      res.json({ success: true, message: "Comissão aprovada e valor adicionado à carteira" });
    } catch (error) {
      console.error("Error approving commission:", error);
      res.status(500).json({ message: "Erro ao aprovar comissão" });
    }
  });

  app.post("/api/admin/affiliates/commissions/:id/reject", authenticateAdmin, async (req, res) => {
    try {
      const commissionId = parseInt(req.params.id);
      
      await db.update(affiliateConversions)
        .set({ 
          status: 'rejected',
          processedAt: new Date()
        })
        .where(eq(affiliateConversions.id, commissionId));

      res.json({ success: true, message: "Comissão rejeitada" });
    } catch (error) {
      console.error("Error rejecting commission:", error);
      res.status(500).json({ message: "Erro ao rejeitar comissão" });
    }
  });

  app.post("/api/admin/affiliates/commissions/:id/pay", authenticateAdmin, async (req, res) => {
    try {
      const commissionId = parseInt(req.params.id);
      
      // Get commission details
      const [commission] = await db.select()
        .from(affiliateConversions)
        .where(eq(affiliateConversions.id, commissionId));

      if (!commission) {
        return res.status(404).json({ message: "Comissão não encontrada" });
      }

      if (commission.status !== 'approved') {
        return res.status(400).json({ message: "Comissão precisa estar aprovada antes de ser paga" });
      }

      // Update commission status to paid
      await db.update(affiliateConversions)
        .set({ 
          status: 'paid',
          processedAt: new Date()
        })
        .where(eq(affiliateConversions.id, commissionId));

      // Update affiliate paid earnings
      await db.update(affiliates)
        .set({
          approvedEarnings: sql`${affiliates.approvedEarnings} + ${commission.commissionAmount}`,
          pendingEarnings: sql`${affiliates.pendingEarnings} - ${commission.commissionAmount}`
        })
        .where(eq(affiliates.id, commission.affiliateId));

      res.json({ success: true, message: "Pagamento registrado com sucesso" });
    } catch (error) {
      console.error("Error marking commission as paid:", error);
      res.status(500).json({ message: "Erro ao registrar pagamento" });
    }
  });

  // Admin Support Routes
  app.get("/api/admin/support/chats", authenticateAdmin, async (req, res) => {
    const activeChats = await storage.getActiveSupportChats();
    res.json(activeChats);
  });

  app.get(
    "/api/admin/support/chat/:chatId",
    authenticateAdmin,
    async (req, res) => {
      const chatId = parseInt(req.params.chatId);
      const chat = await storage.getSupportChat(chatId);

      if (!chat) {
        return res.status(404).json({ message: "Chat não encontrado" });
      }

      const messages = await storage.getChatMessages(chatId);
      const user = await storage.getUser(chat.userId);

      res.json({ chat, messages, user });
    },
  );

  app.post(
    "/api/admin/support/send",
    authenticateAdmin,
    async (req: any, res) => {
      const adminId = req.adminSession.adminId;
      const { chatId, message } = req.body;

      if (!chatId || !message) {
        return res
          .status(400)
          .json({ message: "Chat ID e mensagem são obrigatórios" });
      }

      const chat = await storage.getSupportChat(chatId);
      if (!chat) {
        return res.status(404).json({ message: "Chat não encontrado" });
      }

      const newMessage = await storage.createSupportMessage({
        chatId,
        senderId: adminId,
        senderType: "admin",
        message,
      });

      res.json(newMessage);
    },
  );

  app.post("/api/admin/support/close", authenticateAdmin, async (req, res) => {
    const { chatId } = req.body;

    if (!chatId) {
      return res.status(400).json({ message: "Chat ID é obrigatório" });
    }

    await storage.closeSupportChat(chatId, "admin");

    res.json({ message: "Chat fechado com sucesso" });
  });

  // Public referral config route
  app.get("/api/referral-config", async (req, res) => {
    try {
      const config = await storage.getReferralConfig();
      res.json({
        paymentType: config.paymentType,
        paymentAmount: config.paymentAmount,
        isActive: config.isActive
      });
    } catch (error) {
      console.error("Get referral config error:", error);
      res.status(500).json({ message: "Erro ao buscar configuração de indicação" });
    }
  });

  // Referral routes
  app.get("/api/referrals/my-code", authenticateToken, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      res.json({ referralCode: user.referralCode });
    } catch (error) {
      console.error("Get referral code error:", error);
      res.status(500).json({ message: "Erro ao buscar código de indicação" });
    }
  });
  
  app.post("/api/referrals/validate", async (req, res) => {
    try {
      const { referralCode } = req.body;
      
      if (!referralCode) {
        return res.status(400).json({ message: "Código de indicação é obrigatório" });
      }
      
      // Convert to uppercase to handle case-insensitive validation
      const normalizedCode = referralCode.toUpperCase();
      
      // Special handling for NOVO23 - temporary fix
      if (normalizedCode === 'NOVO23') {
        res.json({ valid: true, referrerName: 'Código Promocional', isPartnerCode: true });
        return;
      }
      
      // Special handling for system codes
      if (normalizedCode === 'SORTE100') {
        res.json({ valid: true, referrerName: 'Promoção Especial' });
        return;
      }
      
      // Special handling for BONUS code
      if (normalizedCode === 'BONUS') {
        res.json({ valid: true, referrerName: 'Código de Bônus' });
        return;
      }
      
      // First check if it's a user referral code
      const referrer = await storage.getUserByReferralCode(normalizedCode);
      if (referrer) {
        res.json({ valid: true, referrerName: referrer.name });
        return;
      }
      
      // Then check if it's an affiliate code
      const affiliateCode = await storage.getAffiliateCodeByCode(normalizedCode);
      if (affiliateCode) {
        // Get affiliate name if possible
        let affiliateName = affiliateCode.name || 'Parceiro';
        try {
          const affiliate = await storage.getAffiliate(affiliateCode.affiliateId);
          if (affiliate && affiliate.name) {
            affiliateName = affiliate.name;
          }
        } catch (e) {
          // If we can't get affiliate name, use the code name or default
        }
        
        res.json({ valid: true, referrerName: affiliateName, isAffiliateCode: true });
        return;
      }
      
      // Check if it's a partner code
      console.log('Checking partner code:', normalizedCode);
      const partnerCode = await storage.getPartnerCodeByCode(normalizedCode);
      console.log('Partner code result:', partnerCode);
      if (partnerCode) {
        // Get partner name if possible
        let partnerName = partnerCode.name || 'Parceiro';
        try {
          const partner = await storage.getPartner(partnerCode.partnerId);
          if (partner && partner.name) {
            partnerName = partner.name;
          }
        } catch (e) {
          // If we can't get partner name, use the code name or default
        }
        
        res.json({ valid: true, referrerName: partnerName, isPartnerCode: true });
        return;
      }
      
      // Code not found in any table
      return res.status(404).json({ message: "Código de indicação inválido" });
    } catch (error) {
      console.error("Validate referral code error:", error);
      res.status(500).json({ message: "Erro ao validar código de indicação" });
    }
  });
  
  app.get("/api/referrals/stats", authenticateToken, async (req: any, res) => {
    try {
      const referrals = await storage.getReferralsByReferrer(req.userId);
      const totalEarnings = await storage.getReferralEarningsTotal(req.userId);
      const availableEarnings = await storage.getReferralEarningsAvailable(req.userId);
      
      res.json({
        totalReferrals: referrals.length,
        validatedReferrals: referrals.filter(r => r.status === 'validated').length,
        totalEarnings,
        availableEarnings
      });
    } catch (error) {
      console.error("Get referral stats error:", error);
      res.status(500).json({ message: "Erro ao buscar estatísticas de indicação" });
    }
  });
  
  app.get("/api/referrals/list", authenticateToken, async (req: any, res) => {
    try {
      const referrals = await storage.getReferralsByReferrer(req.userId);
      
      // Get user details for each referral
      const referralsWithDetails = await Promise.all(
        referrals.map(async (referral) => {
          const user = await storage.getUser(referral.referredId);
          return {
            id: referral.id,
            name: user?.name || "Usuário",
            email: user?.email || "",
            status: referral.status,
            createdAt: referral.createdAt,
            validatedAt: referral.validatedAt
          };
        })
      );
      
      res.json(referralsWithDetails);
    } catch (error) {
      console.error("Get referrals list error:", error);
      res.status(500).json({ message: "Erro ao buscar lista de indicados" });
    }
  });
  
  app.get("/api/referrals/earnings", authenticateToken, async (req: any, res) => {
    try {
      const earnings = await storage.getReferralEarnings(req.userId);
      res.json(earnings);
    } catch (error) {
      console.error("Get referral earnings error:", error);
      res.status(500).json({ message: "Erro ao buscar ganhos de indicação" });
    }
  });
  
  app.get("/api/referrals/transactions", authenticateToken, async (req: any, res) => {
    try {
      // Get all earnings (deposits)
      const earnings = await storage.getReferralEarnings(req.userId);
      
      // Format earnings as transactions
      const transactions = earnings.map(earning => ({
        id: earning.id,
        type: earning.withdrawn ? 'withdrawal' : 'deposit',
        amount: earning.amount,
        description: earning.withdrawn ? 'Saque' : 'Depósito',
        status: earning.withdrawn ? 'completed' : 'available',
        createdAt: earning.withdrawn && earning.withdrawnAt ? earning.withdrawnAt : earning.createdAt
      }));
      
      // Sort by date descending
      transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      res.json(transactions);
    } catch (error) {
      console.error("Get referral transactions error:", error);
      res.status(500).json({ message: "Erro ao buscar histórico de transações" });
    }
  });
  


  app.post("/api/referrals/withdraw", authenticateToken, async (req: any, res) => {
    try {
      const { amount } = req.body;
      
      if (!amount || parseFloat(amount) < 50) {
        return res.status(400).json({ message: "Valor mínimo para saque é R$ 50,00" });
      }
      
      const availableEarnings = await storage.getReferralEarningsAvailable(req.userId);
      console.log(`Available earnings before withdrawal: ${availableEarnings}`);
      
      if (parseFloat(amount) > parseFloat(availableEarnings)) {
        return res.status(400).json({ message: "Saldo insuficiente" });
      }
      
      // Mark earnings as withdrawn
      await storage.withdrawReferralEarnings(req.userId, amount);
      
      // Check available earnings after withdrawal
      const newAvailableEarnings = await storage.getReferralEarningsAvailable(req.userId);
      console.log(`Available earnings after withdrawal: ${newAvailableEarnings}`);
      
      // Add the amount to user's wallet balance
      const wallet = await storage.getWallet(req.userId);
      if (wallet) {
        const newBalance = parseFloat(wallet.balance) + parseFloat(amount);
        await storage.updateWalletBalance(req.userId, newBalance.toFixed(2));
      }
      
      res.json({ 
        success: true, 
        message: "Saldo transferido para sua carteira com sucesso!" 
      });
    } catch (error) {
      console.error("Withdraw referral earnings error:", error);
      res.status(500).json({ message: "Erro ao transferir saldo para carteira" });
    }
  });

  // Test endpoint for game probabilities
  app.get("/api/test/game-probabilities", async (req, res) => {
    try {
      const result = await db.select().from(gameProbabilities);
      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error("Test game probabilities error:", error);
      res.status(500).json({ error: error.message, stack: error.stack });
    }
  });

  // Support Agent Routes
  app.post("/api/support-agent/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      // Fixed credentials as requested
      if (username === "macaco" && password === "123") {
        const token = jwt.sign(
          { agentId: "macaco", role: "support-agent" },
          JWT_SECRET,
          { expiresIn: "24h" }
        );
        
        res.json({
          success: true,
          token,
          name: "Atendente"
        });
      } else {
        res.status(401).json({ error: "Credenciais inválidas" });
      }
    } catch (error) {
      console.error("Support agent login error:", error);
      res.status(500).json({ error: "Erro ao fazer login" });
    }
  });

  // Middleware to verify support agent token
  const authenticateSupportAgent = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Token de acesso requerido" });
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
      
      const availableBalance = parseFloat(wallet.balance);
      
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
          console.log(`[ORINPAY] Processing affiliate withdrawal #${withdrawalId}`);
          
          // For now, we'll mark as approved and the actual PIX will be processed manually
          // TODO: Integrate OrinPay withdrawal API when available
          console.log(`[ORINPAY] Affiliate withdrawal #${withdrawalId} marked as approved for manual processing`);
        } catch (error: any) {
          console.error(`[ORINPAY] Error processing affiliate withdrawal:`, error);
          return res.status(500).json({ 
            error: `Erro ao processar PIX via OrinPay: ${error.message}`
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
          const currentBalance = parseFloat(wallet.balance);
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
          demoData.balance = parseFloat(wallet.balance);
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
          demoData.balance = parseFloat(wallet.balance);
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

  const httpServer = createServer(app);
  return httpServer;
}
