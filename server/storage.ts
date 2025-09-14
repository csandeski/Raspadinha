import {
  users,
  wallets,
  games,

  gamePremios,
  deposits,
  withdrawals,
  adminUsers,
  adminSessions,
  activeGameSessions,
  levelRewardsClaimed,
  dailySpins,
  tierRewardsClaimed,
  supportChats,
  supportMessages,
  referrals,
  referralEarnings,
  gameProbabilities,
  prizeProbabilities,
  coupons,
  couponUses,
  affiliates,
  affiliateCodes,
  affiliateClicks,
  affiliateConversions,
  affiliatePayouts,
  partners,
  partnerCodes,
  partnerClicks,
  partnerConversions,
  partnersWallet,
  partnersWalletTransactions,
  partnersWithdrawals,
  smsVerificationCodes,
  dailyCashback,
  paymentProviderConfig,
  discordWebhooks,
  type User,
  type InsertUser,
  type Wallet,
  type InsertWallet,
  type Game,
  type InsertGame,

  type GamePremio,
  type InsertGamePremio,
  type Deposit,
  type InsertDeposit,
  type Withdrawal,
  type InsertWithdrawal,
  type AdminUser,
  type InsertAdminUser,
  type AdminSession,
  type ActiveGameSession,
  type InsertActiveGameSession,
  type LevelRewardClaimed,
  type InsertLevelRewardClaimed,
  type DailySpin,
  type InsertDailySpin,
  type TierRewardClaimed,
  type InsertTierRewardClaimed,
  type SupportChat,
  type InsertSupportChat,
  type SupportMessage,
  type InsertSupportMessage,
  type Referral,
  type InsertReferral,
  type ReferralEarning,
  type InsertReferralEarning,
  type GameProbability,
  type InsertGameProbability,
  type Coupon,
  type InsertCoupon,
  type CouponUse,
  type InsertCouponUse,
  type DailyCashback,
  type InsertDailyCashback,
  type Partner,
  type InsertPartner,
  type PartnerCode,
  type InsertPartnerCode,
  type PartnersWallet,
  type InsertPartnersWallet,
  type PartnersWalletTransaction,
  type InsertPartnersWalletTransaction,
  type PartnerClick,
  type InsertPartnerClick,
  type PartnerConversion,
  type InsertPartnerConversion,
  type PartnersWithdrawal,
  type InsertPartnersWithdrawal,
  esquiloGames,
  esquiloGameStates,
  type EsquiloGame,
  type InsertEsquiloGame,
  type EsquiloGameState,
  type InsertEsquiloGameState,
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, desc, and, sql, gte, lt, count, asc, inArray } from "drizzle-orm";

export interface IStorage {
  // Prize Probability Management
  listScratchGames(): Promise<{ game_key: string; name: string; cost: string; image_url: string; is_active: boolean; probabilities?: any[] }[]>;
  getGameProbabilities(gameKey: string): Promise<{ probabilities: any[] }>;
  updateGameProbabilities(gameKey: string, probabilities: { value: string; name: string; probability: number; order: number }[]): Promise<void>;
  distributeEqually(gameKey: string): Promise<void>;
  resetToDefaults(gameKey: string): Promise<void>;
  
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  getUserByCPF(cpf: string): Promise<User | undefined>;
  createUser(user: InsertUser & { affiliateId?: number | null; partnerId?: number | null }): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  updateUserProfile(id: number, profile: { name: string; email: string; phone: string }): Promise<void>;
  updateUserPassword(id: number, hashedPassword: string): Promise<void>;

  // Wallet operations
  getWallet(userId: number): Promise<Wallet | undefined>;
  createWallet(wallet: InsertWallet): Promise<Wallet>;
  updateWalletBalance(userId: number, newBalance: string): Promise<void>;
  updateWalletScratchBonus(userId: number, newScratchBonus: number): Promise<void>;
  incrementTotalWagered(userId: number, amount: string): Promise<void>;
  
  // Game operations
  createGame(game: InsertGame): Promise<Game>;
  getGamesByUser(userId: number): Promise<Game[]>;
  getGames(): Promise<Game[]>;
  

  
  // Game premios operations
  createGamePremio(game: InsertGamePremio): Promise<GamePremio>;
  getGamePremiosByUser(userId: number): Promise<GamePremio[]>;
  getGamePremios(): Promise<GamePremio[]>;
  
  // Deposit operations
  createDeposit(deposit: InsertDeposit): Promise<Deposit>;
  getDepositByTransactionId(transactionId: string): Promise<Deposit | undefined>;
  updateDepositStatus(transactionId: string, status: string): Promise<void>;
  getDepositsByUser(userId: number): Promise<Deposit[]>;
  getDeposits(): Promise<Deposit[]>;
  
  // Withdrawal operations
  createWithdrawal(withdrawal: InsertWithdrawal): Promise<Withdrawal>;
  getWithdrawal(id: number): Promise<Withdrawal | undefined>;
  getWithdrawalsByUser(userId: number): Promise<Withdrawal[]>;
  getWithdrawals(): Promise<Withdrawal[]>;
  updateWithdrawalStatus(id: number, status: string): Promise<void>;
  
  // Admin operations
  getAdminUserByUsername(username: string): Promise<AdminUser | undefined>;
  createAdminUser(admin: InsertAdminUser): Promise<AdminUser>;
  createAdminSession(sessionId: string, username: string): Promise<AdminSession>;
  getAdminSession(sessionId: string): Promise<AdminSession | undefined>;
  deleteAdminSession(sessionId: string): Promise<void>;
  
  // Stats operations
  getUserStats(): Promise<{ totalUsers: number; activeUsers: number }>;
  getRevenueStats(): Promise<{ totalRevenue: string; todayRevenue: string }>;
  getGameStats(): Promise<{ totalGames: number; todayGames: number }>;
  getWithdrawalStats(): Promise<{ pendingWithdrawals: number }>;
  
  // Active game session operations
  createActiveGameSession(session: InsertActiveGameSession): Promise<ActiveGameSession>;
  getActiveGameSession(userId: number, gameType: string): Promise<ActiveGameSession | undefined>;
  updateActiveGameSession(gameId: string, gameState: any): Promise<void>;
  deleteActiveGameSession(gameId: string): Promise<void>;
  getUserActiveGameSessions(userId: number): Promise<ActiveGameSession[]>;
  
  // Level rewards operations
  createLevelRewardClaimed(reward: InsertLevelRewardClaimed): Promise<LevelRewardClaimed>;
  getLevelRewardsClaimed(userId: number): Promise<LevelRewardClaimed[]>;
  hasClaimedLevelReward(userId: number, level: number): Promise<boolean>;
  
  // Daily spin operations
  createDailySpin(spin: InsertDailySpin): Promise<DailySpin>;
  getLastDailySpin(userId: number): Promise<DailySpin | undefined>;
  canSpinToday(userId: number): Promise<boolean>;
  
  // Tier rewards operations
  createTierRewardClaimed(reward: InsertTierRewardClaimed): Promise<TierRewardClaimed>;
  getTierRewardsClaimed(userId: number): Promise<TierRewardClaimed[]>;
  
  // Esquilo game operations
  createEsquiloGame(game: InsertEsquiloGame): Promise<EsquiloGame>;
  getEsquiloGame(gameId: string): Promise<EsquiloGame | undefined>;
  updateEsquiloGame(gameId: string, updates: Partial<InsertEsquiloGame>): Promise<void>;
  getEsquiloGamesByUser(userId: number): Promise<EsquiloGame[]>;
  
  // Esquilo game state operations
  createEsquiloGameState(state: InsertEsquiloGameState): Promise<EsquiloGameState>;
  getEsquiloGameState(gameId: string): Promise<EsquiloGameState | undefined>;
  getActiveEsquiloGameState(userId: number): Promise<EsquiloGameState | undefined>;
  updateEsquiloGameState(gameId: string, updates: Partial<InsertEsquiloGameState>): Promise<void>;
  deleteEsquiloGameState(gameId: string): Promise<void>;
  hasClaimedTierReward(userId: number, tier: string, level: number): Promise<boolean>;
  
  // Support operations
  createSupportChat(userId: number): Promise<SupportChat>;
  getSupportChat(chatId: number): Promise<SupportChat | undefined>;
  getUserActiveChat(userId: number): Promise<SupportChat | undefined>;
  getActiveSupportChats(): Promise<SupportChat[]>;
  getOpenSupportChats(): Promise<SupportChat[]>;
  closeSupportChat(chatId: number): Promise<void>;
  updateSupportChat(chatId: number, updates: any): Promise<void>;
  createSupportMessage(message: InsertSupportMessage): Promise<SupportMessage>;
  getChatMessages(chatId: number): Promise<SupportMessage[]>;
  getSupportChatMessages(chatId: number): Promise<SupportMessage[]>;
  markMessageAsRead(messageId: number): Promise<void>;
  
  // Referral operations
  getUserByReferralCode(referralCode: string): Promise<User | undefined>;
  createReferral(referral: InsertReferral): Promise<Referral>;
  getReferralsByReferrer(referrerId: number): Promise<Referral[]>;
  getReferralsByReferred(referredId: number): Promise<Referral | undefined>;
  validateReferral(referralId: number): Promise<void>;
  createReferralEarning(earning: InsertReferralEarning): Promise<ReferralEarning>;
  getReferralEarnings(userId: number): Promise<ReferralEarning[]>;
  getReferralEarningsTotal(userId: number): Promise<string>;
  getReferralEarningsAvailable(userId: number): Promise<string>;
  withdrawReferralEarnings(userId: number, amount: string): Promise<void>;

  // Bonus code operations
  hasUsedBonusCode(userId: number, code: string): Promise<boolean>;
  markBonusCodeAsUsed(userId: number, code: string): Promise<void>;

  // Game probability operations
  getGameProbability(gameType: string): Promise<GameProbability | undefined>;
  getGameProbabilities(): Promise<GameProbability[]>;
  upsertGameProbability(gameType: string, probability: Partial<InsertGameProbability>): Promise<void>;
  
  // Coupon operations
  getCoupon(code: string): Promise<Coupon | undefined>;
  getCouponById(id: number): Promise<Coupon | undefined>;
  getCoupons(): Promise<Coupon[]>;
  getAllCoupons(): Promise<Coupon[]>;
  createCoupon(coupon: InsertCoupon): Promise<Coupon>;
  updateCoupon(id: number, updates: Partial<InsertCoupon>): Promise<void>;
  deleteCoupon(id: number): Promise<void>;
  incrementCouponUsage(id: number): Promise<void>;
  incrementCouponUsageCount(id: number): Promise<void>;
  getCouponUses(couponId: number): Promise<CouponUse[]>;
  getCouponUsesWithUserDetails(couponId: number): Promise<any[]>;
  getUserCouponUses(userId: number, couponId: number): Promise<CouponUse[]>;
  createCouponUse(use: InsertCouponUse): Promise<CouponUse>;
  applyCouponToUser(userId: number, couponCode: string): Promise<void>;
  removeCouponFromUser(userId: number): Promise<void>;
  updateUserFirstDeposit(userId: number): Promise<void>;

  // Affiliates
  createAffiliate(data: any): Promise<any>;
  getAffiliateById(id: number): Promise<any>;
  getAffiliateByEmail(email: string): Promise<any>;
  getAffiliateByCode(code: string): Promise<any>;
  
  // Demo Account Operations
  getDemoAccountByAffiliateId(affiliateId: number): Promise<User | undefined>;
  getDemoAccountByPartnerId(partnerId: number): Promise<User | undefined>;
  createDemoAccount(affiliateId: number, name: string, balance: number, scratchBonus: number): Promise<{ user: User; password: string }>;
  createPartnerDemoAccount(partnerId: number, name: string, balance: number, scratchBonus: number): Promise<{ user: User; password: string }>;
  updateDemoAccount(userId: number, name: string, balance: number, scratchBonus: number): Promise<void>;
  deleteDemoAccount(userId: number): Promise<void>;
  getAffiliateStats(affiliateId: number): Promise<any>;
  trackAffiliateClick(data: any): Promise<void>;
  trackAffiliateConversion(data: any): Promise<void>;
  createAffiliateConversion(data: any): Promise<any>;
  setUserAffiliate(userId: number, affiliateId: number): Promise<void>;
  getUserAffiliate(userId: number): Promise<number | null>;
  getUsersByAffiliateId(affiliateId: number): Promise<any[]>;
  getUsersByReferralCode(referralCode: string): Promise<any[]>;
  processAffiliateCommission(userId: number, depositAmount: string): Promise<void>;
  updateAffiliateStats(affiliateId: number, stats: any): Promise<void>;
  requestAffiliatePayout(affiliateId: number, amount: string, pixKey: string): Promise<any>;
  getAffiliatePayouts(affiliateId: number): Promise<any[]>;
  updateAffiliate(id: number, data: any): Promise<any>;

  // SMS Verification
  createSmsVerificationCode(phone: string, code: string, type: string): Promise<void>;
  getValidSmsCode(phone: string, type: string): Promise<any | undefined>;
  markSmsCodeAsUsed(id: number): Promise<void>;

  // Marketing Links
  getMarketingLinks(): Promise<any[]>;
  getMarketingLinkById(id: number): Promise<any>;
  getMarketingLinkByShortCode(shortCode: string): Promise<any>;
  createMarketingLink(data: any): Promise<any>;
  updateMarketingLink(id: number, data: any): Promise<any>;
  deleteMarketingLink(id: number): Promise<void>;
  trackMarketingClick(linkId: number, data: any): Promise<void>;
  trackMarketingConversion(linkId: number, userId: number): Promise<void>;
  getMarketingStats(linkId?: number): Promise<any>;
  getMarketingLinkStats(linkId: number): Promise<any>;

  // Daily cashback operations
  calculateDailyCashback(userId: number, date: Date): Promise<DailyCashback | null>;
  getDailyCashbackHistory(userId: number): Promise<DailyCashback[]>;
  getAllPendingCashbacks(): Promise<DailyCashback[]>;
  creditCashback(cashbackId: number): Promise<void>;
  processDailyCashbackForAllUsers(date: Date): Promise<void>;
  getTodaysCashback(userId: number, date?: string): Promise<DailyCashback | undefined>;
  getCashbackStats(): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // Default probabilities for each game
  private readonly DEFAULT_PROBABILITIES: Record<string, { value: string; name: string; probability: number; order: number }[]> = {
    'premio_pix_conta': [
      { value: '0.5', name: 'R$ 0,50', probability: 35, order: 1 },
      { value: '1', name: 'R$ 1,00', probability: 25, order: 2 },
      { value: '2', name: 'R$ 2,00', probability: 15, order: 3 },
      { value: '3', name: 'R$ 3,00', probability: 10, order: 4 },
      { value: '4', name: 'R$ 4,00', probability: 5, order: 5 },
      { value: '5', name: 'R$ 5,00', probability: 4, order: 6 },
      { value: '10', name: 'R$ 10,00', probability: 3, order: 7 },
      { value: '15', name: 'R$ 15,00', probability: 1.5, order: 8 },
      { value: '20', name: 'R$ 20,00', probability: 1, order: 9 },
      { value: '50', name: 'R$ 50,00', probability: 0.4, order: 10 },
      { value: '100', name: 'R$ 100,00', probability: 0.1, order: 11 }
    ],
    'premio_me_mimei': [
      { value: '0.5', name: 'Perfume', probability: 20, order: 1 },
      { value: '1', name: 'Batom', probability: 18, order: 2 },
      { value: '2', name: 'Esmalte', probability: 15, order: 3 },
      { value: '3', name: 'Creme', probability: 12, order: 4 },
      { value: '4', name: 'Maquiagem', probability: 10, order: 5 },
      { value: '5', name: 'Shampoo', probability: 8, order: 6 },
      { value: '10', name: 'Condicionador', probability: 6, order: 7 },
      { value: '15', name: 'Hidratante', probability: 5, order: 8 },
      { value: '20', name: 'Protetor Solar', probability: 3, order: 9 },
      { value: '50', name: 'Kit Skincare', probability: 2, order: 10 },
      { value: '100', name: 'Vale Presente', probability: 1, order: 11 }
    ],
    'premio_eletronicos': [
      { value: '0.5', name: 'Fone Bluetooth', probability: 25, order: 1 },
      { value: '1', name: 'Carregador', probability: 20, order: 2 },
      { value: '2', name: 'Caixa de Som', probability: 15, order: 3 },
      { value: '3', name: 'Smartwatch', probability: 12, order: 4 },
      { value: '4', name: 'Tablet', probability: 10, order: 5 },
      { value: '5', name: 'Console', probability: 8, order: 6 },
      { value: '10', name: 'Notebook', probability: 5, order: 7 },
      { value: '15', name: 'iPhone', probability: 3, order: 8 },
      { value: '20', name: 'TV 55"', probability: 1.5, order: 9 },
      { value: '50', name: 'PS5', probability: 0.4, order: 10 },
      { value: '100', name: 'MacBook', probability: 0.1, order: 11 }
    ],
    'premio_super_premios': [
      { value: '10', name: 'Vale Compras R$100', probability: 25, order: 1 },
      { value: '20', name: 'Vale Combustível', probability: 20, order: 2 },
      { value: '40', name: 'Jantar Romântico', probability: 15, order: 3 },
      { value: '60', name: 'Dia no Spa', probability: 12, order: 4 },
      { value: '80', name: 'Ingresso Cinema', probability: 10, order: 5 },
      { value: '100', name: 'Assinatura Streaming', probability: 8, order: 6 },
      { value: '200', name: 'Viagem Nacional', probability: 5, order: 7 },
      { value: '500', name: 'Cruzeiro', probability: 3, order: 8 },
      { value: '1000', name: 'Carro 0KM', probability: 1.5, order: 9 },
      { value: '10000', name: 'Casa Própria', probability: 0.4, order: 10 },
      { value: '100000', name: 'R$ 1 Milhão', probability: 0.1, order: 11 }
    ]
  };
  
  // Game configurations
  private readonly SCRATCH_GAMES = [
    {
      game_key: 'premio_pix_conta',
      name: 'PIX na Conta',
      cost: '0.50',
      image_url: '/premios/banner-pix.webp',
      is_active: true
    },
    {
      game_key: 'premio_me_mimei',
      name: 'Me Mimei',
      cost: '0.50', 
      image_url: '/premios/banner-me-mimei.webp',
      is_active: true
    },
    {
      game_key: 'premio_eletronicos',
      name: 'Eletrônicos',
      cost: '0.50',
      image_url: '/premios/banner-eletronicos.webp',
      is_active: true
    },
    {
      game_key: 'premio_super_premios',
      name: 'Super Prêmios',
      cost: '0.50',
      image_url: '/premios/banner-super-premios.webp',
      is_active: true
    }
  ];
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    // Use raw SQL to avoid Drizzle issue with app_users table
    const result = await pool.query(
      `SELECT * FROM app_users WHERE id = $1 LIMIT 1`,
      [id]
    );
    
    if (result.rows.length > 0) {
      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        password: row.password,
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
        // firstDepositCompleted: row.first_deposit_completed, // Column doesn't exist in DB
        affiliateId: row.affiliate_id,
        partnerId: row.partner_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      } as User;
    }
    return undefined;
  }

  async getUserById(id: number): Promise<User | undefined> {
    // Use the same method as getUser since they do the same thing
    return this.getUser(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    // Temporary workaround - use raw SQL to avoid Drizzle issue
    const result = await pool.query(
      `SELECT * FROM app_users WHERE email = $1 LIMIT 1`,
      [email]
    );
    
    if (result.rows.length > 0) {
      const row = result.rows[0];
      // Map database snake_case to camelCase for TypeScript types
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        password: row.password,
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
        // firstDepositCompleted: row.first_deposit_completed, // Column doesn't exist in DB
        affiliateId: row.affiliate_id,
        partnerId: row.partner_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      } as User;
    }
    
    return undefined;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    // Temporary workaround - use raw SQL to avoid Drizzle issue
    const result = await pool.query(
      `SELECT * FROM app_users WHERE phone = $1 LIMIT 1`,
      [phone]
    );
    
    if (result.rows.length > 0) {
      const row = result.rows[0];
      // Map database snake_case to camelCase for TypeScript types
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        password: row.password,
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
        // firstDepositCompleted: row.first_deposit_completed, // Column doesn't exist in DB
        affiliateId: row.affiliate_id,
        partnerId: row.partner_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      } as User;
    }
    
    return undefined;
  }
  
  async getUserByCPF(cpf: string): Promise<User | undefined> {
    // Temporary workaround - use raw SQL to avoid Drizzle issue
    const result = await pool.query(
      `SELECT * FROM app_users WHERE cpf = $1 LIMIT 1`,
      [cpf]
    );
    
    if (result.rows.length > 0) {
      const row = result.rows[0];
      // Map database snake_case to camelCase for TypeScript types
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        password: row.password,
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
        // firstDepositCompleted: row.first_deposit_completed, // Column doesn't exist in DB
        affiliateId: row.affiliate_id,
        partnerId: row.partner_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      } as User;
    }
    
    return undefined;
  }

  async createUser(insertUser: InsertUser & { affiliateId?: number | null; partnerId?: number | null }): Promise<User> {
    try {
      console.log("[createUser] Attempting to insert user with data:", {
        ...insertUser,
        password: "[HIDDEN]"
      });
      
      // Generate referral code if not provided
      const referralCode = insertUser.referralCode || `RAS${Date.now()}${Math.floor(Math.random() * 1000)}`;
      const hasFirstDeposit = insertUser.hasFirstDeposit ?? false;
      
      // Use raw SQL to avoid Drizzle issue with column names
      // Temporarily remove first_deposit_completed to test
      const result = await pool.query(
        `INSERT INTO app_users (
          name, email, phone, password, cpf, is_adult, 
          referral_code, referred_by, utm_source, utm_medium, 
          utm_campaign, utm_term, utm_content, utm_src, 
          landing_page, coupon_applied, current_coupon, 
          has_first_deposit,
          affiliate_id, partner_id
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
        ) RETURNING *`,
        [
          insertUser.name,
          insertUser.email,
          insertUser.phone,
          insertUser.password,
          insertUser.cpf || null,
          insertUser.isAdult || null,
          referralCode,
          insertUser.referredBy || null,
          insertUser.utmSource || null,
          insertUser.utmMedium || null,
          insertUser.utmCampaign || null,
          insertUser.utmTerm || null,
          insertUser.utmContent || null,
          insertUser.utmSrc || null,
          insertUser.landingPage || null,
          insertUser.couponApplied || 0,
          insertUser.currentCoupon || null,
          hasFirstDeposit,
          insertUser.affiliateId || null,
          insertUser.partnerId || null
        ]
      );
      
      const row = result.rows[0];
      const user = {
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        password: row.password,
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
        // firstDepositCompleted: row.first_deposit_completed, // Column doesn't exist in DB
        affiliateId: row.affiliate_id,
        partnerId: row.partner_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      } as User;
      
      console.log("[createUser] User inserted successfully with ID:", user.id);
      
      // Create wallet for new user with more detailed error handling
      try {
        const walletData = {
          userId: user.id,
          balance: "0.00",
          bonusBalance: "0.00",
          scratchBonus: 3,
          totalDeposited: "0.00",
          totalWithdrawn: "0.00",
          totalWagered: "0.00",
        };
        
        console.log("[createUser] Creating wallet with data:", walletData);
        
        await db.insert(wallets).values(walletData);
        console.log("[createUser] Wallet created for user:", user.id);
      } catch (walletError: any) {
        console.error("[createUser] Error creating wallet - Details:", {
          message: walletError.message,
          code: walletError.code,
          detail: walletError.detail,
          stack: walletError.stack
        });
        // Continue even if wallet creation fails
      }
      
      return user;
    } catch (error: any) {
      console.error("[createUser] Error inserting user into database - Full details:", {
        message: error.message,
        code: error.code, 
        detail: error.detail,
        constraint: error.constraint,
        table: error.table,
        stack: error.stack
      });
      throw error;
    }
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({ ...user, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async updateUserProfile(id: number, profile: { name: string; email: string; phone: string }): Promise<void> {
    await db
      .update(users)
      .set({ ...profile, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async updateUserPassword(id: number, hashedPassword: string): Promise<void> {
    await db
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  // Wallet operations
  async getWallet(userId: number): Promise<Wallet | undefined> {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, userId));
    return wallet;
  }

  async createWallet(insertWallet: InsertWallet): Promise<Wallet> {
    const [wallet] = await db.insert(wallets).values(insertWallet).returning();
    return wallet;
  }

  async updateWalletBalance(userId: number, newBalance: string): Promise<void> {
    await db
      .update(wallets)
      .set({ balance: newBalance, lastUpdated: new Date() })
      .where(eq(wallets.userId, userId));
  }

  async updateWalletScratchBonus(userId: number, newScratchBonus: number): Promise<void> {
    await db
      .update(wallets)
      .set({ scratchBonus: newScratchBonus, lastUpdated: new Date() })
      .where(eq(wallets.userId, userId));
  }

  async incrementTotalWagered(userId: number, amount: string): Promise<void> {
    const wallet = await this.getWallet(userId);
    if (wallet) {
      const currentTotal = parseFloat(wallet.totalWagered || '0');
      const amountToAdd = parseFloat(amount);
      const newTotal = (currentTotal + amountToAdd).toFixed(2);
      
      await db
        .update(wallets)
        .set({ totalWagered: newTotal, lastUpdated: new Date() })
        .where(eq(wallets.userId, userId));
    }
  }

  // Game operations (deprecated - use gamePremios instead)
  async createGame(insertGame: InsertGame): Promise<Game> {
    // This method is deprecated, returning a dummy game
    // All game operations should use gamePremios table now
    throw new Error("createGame is deprecated - use createGamePremio instead");
  }

  async getGamesByUser(userId: number): Promise<Game[]> {
    return await db
      .select()
      .from(gamePremios)
      .where(eq(gamePremios.userId, userId))
      .orderBy(desc(gamePremios.playedAt));
  }

  async getGames(): Promise<Game[]> {
    return await db
      .select()
      .from(gamePremios)
      .orderBy(desc(gamePremios.playedAt));
  }



  // Game premios operations
  async createGamePremio(insertGame: InsertGamePremio): Promise<GamePremio> {
    // Generate a random 5-digit display ID
    let displayId = Math.floor(10000 + Math.random() * 90000);
    
    // Check if it already exists (unlikely but possible)
    let existingGame = await db.select().from(gamePremios).where(eq(gamePremios.displayId, displayId));
    while (existingGame.length > 0) {
      displayId = Math.floor(10000 + Math.random() * 90000);
      existingGame = await db.select().from(gamePremios).where(eq(gamePremios.displayId, displayId));
    }
    
    const [game] = await db.insert(gamePremios).values({
      ...insertGame,
      displayId
    }).returning();
    return game;
  }

  async getGamePremiosByUser(userId: number): Promise<GamePremio[]> {
    return await db
      .select()
      .from(gamePremios)
      .where(eq(gamePremios.userId, userId))
      .orderBy(desc(gamePremios.playedAt));
  }

  async getGamePremios(): Promise<GamePremio[]> {
    return await db
      .select()
      .from(gamePremios)
      .orderBy(desc(gamePremios.playedAt));
  }

  // Deposit operations
  async createDeposit(insertDeposit: InsertDeposit): Promise<Deposit> {
    // Generate a random 5-digit display ID
    let displayId = Math.floor(10000 + Math.random() * 90000);
    
    // Check if it already exists (unlikely but possible)
    let existingDeposit = await db.select().from(deposits).where(eq(deposits.displayId, displayId));
    while (existingDeposit.length > 0) {
      displayId = Math.floor(10000 + Math.random() * 90000);
      existingDeposit = await db.select().from(deposits).where(eq(deposits.displayId, displayId));
    }
    
    const [deposit] = await db.insert(deposits).values({
      ...insertDeposit,
      displayId
    }).returning();
    return deposit;
  }

  async getDepositByTransactionId(transactionId: string): Promise<Deposit | undefined> {
    const [deposit] = await db
      .select()
      .from(deposits)
      .where(eq(deposits.transactionId, transactionId));
    return deposit;
  }

  async updateDepositStatus(transactionId: string, status: string): Promise<void> {
    await db
      .update(deposits)
      .set({ 
        status,
        completedAt: status === "completed" ? new Date() : null
      })
      .where(eq(deposits.transactionId, transactionId));
  }

  async getDepositsByUser(userId: number): Promise<Deposit[]> {
    return await db
      .select()
      .from(deposits)
      .where(eq(deposits.userId, userId))
      .orderBy(desc(deposits.createdAt));
  }

  async getDeposits(): Promise<Deposit[]> {
    return await db
      .select()
      .from(deposits)
      .orderBy(desc(deposits.createdAt));
  }

  // Withdrawal operations
  async createWithdrawal(insertWithdrawal: InsertWithdrawal): Promise<Withdrawal> {
    // Generate a random 5-digit display ID
    let displayId = Math.floor(10000 + Math.random() * 90000);
    
    // Check if it already exists (unlikely but possible)
    let existingWithdrawal = await db.select().from(withdrawals).where(eq(withdrawals.displayId, displayId));
    while (existingWithdrawal.length > 0) {
      displayId = Math.floor(10000 + Math.random() * 90000);
      existingWithdrawal = await db.select().from(withdrawals).where(eq(withdrawals.displayId, displayId));
    }
    
    const [withdrawal] = await db.insert(withdrawals).values({
      ...insertWithdrawal,
      displayId
    }).returning();
    return withdrawal;
  }

  async getWithdrawal(id: number): Promise<Withdrawal | undefined> {
    const [withdrawal] = await db
      .select()
      .from(withdrawals)
      .where(eq(withdrawals.id, id));
    return withdrawal;
  }

  async getWithdrawalsByUser(userId: number): Promise<Withdrawal[]> {
    return await db
      .select()
      .from(withdrawals)
      .where(eq(withdrawals.userId, userId))
      .orderBy(desc(withdrawals.requestedAt));
  }

  async getWithdrawals(): Promise<Withdrawal[]> {
    return await db
      .select()
      .from(withdrawals)
      .orderBy(desc(withdrawals.requestedAt));
  }

  async updateWithdrawalStatus(id: number, status: string): Promise<void> {
    await db
      .update(withdrawals)
      .set({ 
        status,
        processedAt: status === "completed" ? new Date() : null
      })
      .where(eq(withdrawals.id, id));
  }

  // Admin operations
  async getAdminUserByUsername(username: string): Promise<AdminUser | undefined> {
    const [admin] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.username, username));
    return admin;
  }

  async createAdminUser(admin: InsertAdminUser): Promise<AdminUser> {
    const [newAdmin] = await db
      .insert(adminUsers)
      .values(admin)
      .returning();
    return newAdmin;
  }

  async createAdminSession(sessionId: string, username: string): Promise<AdminSession> {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const [session] = await db
      .insert(adminSessions)
      .values({ sessionId, username, expiresAt })
      .returning();
    return session;
  }

  async getAdminSession(sessionId: string): Promise<AdminSession | undefined> {
    const [session] = await db
      .select()
      .from(adminSessions)
      .where(
        and(
          eq(adminSessions.sessionId, sessionId),
          sql`${adminSessions.expiresAt} > NOW()`
        )
      );
    return session;
  }

  async deleteAdminSession(sessionId: string): Promise<void> {
    await db.delete(adminSessions).where(eq(adminSessions.sessionId, sessionId));
  }

  // Stats operations
  async getUserStats(): Promise<{ totalUsers: number; activeUsers: number }> {
    // Use raw SQL to count users from app_users table
    const totalResult = await pool.query(
      `SELECT COUNT(*) as count FROM app_users`
    );
    
    const [activeResult] = await db
      .select({ count: sql<number>`count(distinct ${gamePremios.userId})` })
      .from(gamePremios)
      .where(sql`${gamePremios.playedAt} > NOW() - INTERVAL '30 days'`);
    
    return {
      totalUsers: parseInt(totalResult.rows[0].count),
      activeUsers: activeResult.count || 0,
    };
  }

  async getRevenueStats(): Promise<{ totalRevenue: string; todayRevenue: string }> {
    const [totalResult] = await db
      .select({ sum: sql<string>`COALESCE(SUM(${gamePremios.cost}), 0)` })
      .from(gamePremios);
    
    const [todayResult] = await db
      .select({ sum: sql<string>`COALESCE(SUM(${gamePremios.cost}), 0)` })
      .from(gamePremios)
      .where(sql`DATE(${gamePremios.playedAt}) = CURRENT_DATE`);
    
    return {
      totalRevenue: totalResult.sum || "0.00",
      todayRevenue: todayResult.sum || "0.00",
    };
  }

  async getGameStats(): Promise<{ totalGames: number; todayGames: number }> {
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(gamePremios);
    
    const [todayResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(gamePremios)
      .where(sql`DATE(${gamePremios.playedAt}) = CURRENT_DATE`);
    
    return {
      totalGames: totalResult.count,
      todayGames: todayResult.count,
    };
  }

  async getWithdrawalStats(): Promise<{ pendingWithdrawals: number }> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(withdrawals)
      .where(eq(withdrawals.status, "pending"));
    
    return {
      pendingWithdrawals: result.count,
    };
  }

  // Active game session operations
  async createActiveGameSession(session: InsertActiveGameSession): Promise<ActiveGameSession> {
    const [newSession] = await db
      .insert(activeGameSessions)
      .values(session)
      .returning();
    return newSession;
  }

  async getActiveGameSession(userId: number, gameType: string): Promise<ActiveGameSession | undefined> {
    const [session] = await db
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
    return session;
  }

  async updateActiveGameSession(gameId: string, gameState: any): Promise<void> {
    await db
      .update(activeGameSessions)
      .set({ gameState, updatedAt: new Date() })
      .where(eq(activeGameSessions.gameId, gameId));
  }

  async deleteActiveGameSession(gameId: string): Promise<void> {
    await db.delete(activeGameSessions).where(eq(activeGameSessions.gameId, gameId));
  }

  async getUserActiveGameSessions(userId: number): Promise<ActiveGameSession[]> {
    return await db
      .select()
      .from(activeGameSessions)
      .where(eq(activeGameSessions.userId, userId))
      .orderBy(desc(activeGameSessions.createdAt));
  }

  // Level rewards operations
  async createLevelRewardClaimed(reward: InsertLevelRewardClaimed): Promise<LevelRewardClaimed> {
    const [claimed] = await db.insert(levelRewardsClaimed).values(reward).returning();
    return claimed;
  }

  async getLevelRewardsClaimed(userId: number): Promise<LevelRewardClaimed[]> {
    return await db
      .select()
      .from(levelRewardsClaimed)
      .where(eq(levelRewardsClaimed.userId, userId))
      .orderBy(desc(levelRewardsClaimed.claimedAt));
  }

  async hasClaimedLevelReward(userId: number, level: number): Promise<boolean> {
    const [claimed] = await db
      .select()
      .from(levelRewardsClaimed)
      .where(and(
        eq(levelRewardsClaimed.userId, userId),
        eq(levelRewardsClaimed.level, level)
      ));
    return !!claimed;
  }

  // Daily spin operations
  async createDailySpin(spin: InsertDailySpin): Promise<DailySpin> {
    const [dailySpin] = await db.insert(dailySpins).values(spin).returning();
    return dailySpin;
  }
  
  async deleteTodaysDailySpin(userId: number): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    console.log("Deleting today's spin for tier change:", {
      userId,
      today: today.toISOString(),
      tomorrow: tomorrow.toISOString()
    });
    
    await db
      .delete(dailySpins)
      .where(
        and(
          eq(dailySpins.userId, userId),
          gte(dailySpins.spinDate, today.toISOString()),
          lt(dailySpins.spinDate, tomorrow.toISOString())
        )
      );
  }

  async getLastDailySpin(userId: number): Promise<DailySpin | undefined> {
    const [lastSpin] = await db
      .select()
      .from(dailySpins)
      .where(eq(dailySpins.userId, userId))
      .orderBy(desc(dailySpins.createdAt))
      .limit(1);
    return lastSpin;
  }

  async canSpinToday(userId: number, currentTier?: string): Promise<boolean> {
    const lastSpin = await this.getLastDailySpin(userId);
    if (!lastSpin) return true;
    
    // Debug logs
    console.log("canSpinToday check:", {
      userId,
      currentTier,
      lastSpinTier: lastSpin.tier,
      lastSpinDate: lastSpin.spinDate
    });
    
    // Special case: If lastSpin has no tier (old data) and user has a tier now
    // Delete today's spin to allow re-spin with tier tracking
    if (currentTier && !lastSpin.tier) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const lastSpinDate = new Date(lastSpin.spinDate!);
      lastSpinDate.setHours(0, 0, 0, 0);
      
      // If the spin was today and has no tier, delete it to allow re-spin
      if (lastSpinDate.getTime() === today.getTime()) {
        console.log("Deleting today's spin without tier to allow re-spin with tier tracking");
        await this.deleteTodaysDailySpin(userId);
        return true;
      }
    }
    
    // Check if tier has changed (tier upgrade allows immediate re-spin)
    if (currentTier && lastSpin.tier && lastSpin.tier !== currentTier) {
      // Only allow re-spin if the tier improved
      const tierOrder = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
      const lastTierIndex = tierOrder.indexOf(lastSpin.tier);
      const currentTierIndex = tierOrder.indexOf(currentTier);
      
      console.log("Tier comparison:", {
        lastTier: lastSpin.tier,
        currentTier,
        lastTierIndex,
        currentTierIndex,
        tierImproved: currentTierIndex > lastTierIndex
      });
      
      // Allow spin if tier improved
      if (currentTierIndex > lastTierIndex) {
        console.log("Tier improved! Allowing re-spin");
        return true;
      }
    }
    
    // Regular daily check
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lastSpinDate = new Date(lastSpin.spinDate!);
    lastSpinDate.setHours(0, 0, 0, 0);
    
    const canSpinDaily = lastSpinDate < today;
    console.log("Daily check:", {
      today: today.toISOString(),
      lastSpinDate: lastSpinDate.toISOString(),
      canSpinDaily
    });
    
    return canSpinDaily;
  }
  
  // Tier rewards operations
  async createTierRewardClaimed(reward: InsertTierRewardClaimed): Promise<TierRewardClaimed> {
    const [tierReward] = await db.insert(tierRewardsClaimed).values(reward).returning();
    return tierReward;
  }
  
  async getTierRewardsClaimed(userId: number): Promise<TierRewardClaimed[]> {
    return await db
      .select()
      .from(tierRewardsClaimed)
      .where(eq(tierRewardsClaimed.userId, userId));
  }
  
  async hasClaimedTierReward(userId: number, tier: string, level: number): Promise<boolean> {
    const [claimed] = await db
      .select()
      .from(tierRewardsClaimed)
      .where(
        and(
          eq(tierRewardsClaimed.userId, userId),
          eq(tierRewardsClaimed.tier, tier),
          eq(tierRewardsClaimed.level, level)
        )
      );
    return !!claimed;
  }
  
  // Esquilo game operations
  async createEsquiloGame(game: InsertEsquiloGame): Promise<EsquiloGame> {
    const [esquiloGame] = await db.insert(esquiloGames).values(game).returning();
    return esquiloGame;
  }
  
  async getEsquiloGame(gameId: string): Promise<EsquiloGame | undefined> {
    const [game] = await db
      .select()
      .from(esquiloGames)
      .where(eq(esquiloGames.gameId, gameId));
    return game;
  }
  
  async updateEsquiloGame(gameId: string, updates: Partial<InsertEsquiloGame>): Promise<void> {
    await db
      .update(esquiloGames)
      .set(updates)
      .where(eq(esquiloGames.gameId, gameId));
  }
  
  async getEsquiloGamesByUser(userId: number): Promise<EsquiloGame[]> {
    return await db
      .select()
      .from(esquiloGames)
      .where(eq(esquiloGames.userId, userId))
      .orderBy(desc(esquiloGames.startedAt));
  }
  
  // Esquilo game state operations
  async createEsquiloGameState(state: InsertEsquiloGameState): Promise<EsquiloGameState> {
    const [gameState] = await db.insert(esquiloGameStates).values(state).returning();
    return gameState;
  }
  
  async getEsquiloGameState(gameId: string): Promise<EsquiloGameState | undefined> {
    const [state] = await db
      .select()
      .from(esquiloGameStates)
      .where(eq(esquiloGameStates.gameId, gameId));
    return state;
  }
  
  async getActiveEsquiloGameState(userId: number): Promise<EsquiloGameState | undefined> {
    const [state] = await db
      .select()
      .from(esquiloGameStates)
      .where(
        and(
          eq(esquiloGameStates.userId, userId),
          eq(esquiloGameStates.isActive, true)
        )
      )
      .orderBy(desc(esquiloGameStates.createdAt));
    return state;
  }
  
  async updateEsquiloGameState(gameId: string, updates: Partial<InsertEsquiloGameState>): Promise<void> {
    await db
      .update(esquiloGameStates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(esquiloGameStates.gameId, gameId));
  }
  
  async deleteEsquiloGameState(gameId: string): Promise<void> {
    await db
      .delete(esquiloGameStates)
      .where(eq(esquiloGameStates.gameId, gameId));
  }
  
  // Support operations
  async createSupportChat(userId: number): Promise<SupportChat> {
    const [chat] = await db.insert(supportChats).values({ userId }).returning();
    return chat;
  }

  async getSupportChat(chatId: number): Promise<SupportChat | undefined> {
    const [chat] = await db
      .select()
      .from(supportChats)
      .where(eq(supportChats.id, chatId));
    return chat;
  }

  async getUserActiveChat(userId: number): Promise<SupportChat | undefined> {
    const [chat] = await db
      .select()
      .from(supportChats)
      .where(and(
        eq(supportChats.userId, userId),
        eq(supportChats.status, 'active')
      ))
      .orderBy(desc(supportChats.createdAt))
      .limit(1);
    return chat;
  }

  async getActiveSupportChats(): Promise<SupportChat[]> {
    return await db
      .select()
      .from(supportChats)
      .where(eq(supportChats.status, 'active'))
      .orderBy(desc(supportChats.createdAt));
  }

  async getOpenSupportChats(): Promise<SupportChat[]> {
    return await db
      .select()
      .from(supportChats)
      .where(eq(supportChats.status, 'active'))
      .orderBy(desc(supportChats.createdAt));
  }

  async closeSupportChat(chatId: number): Promise<void> {
    await db
      .update(supportChats)
      .set({
        status: 'closed',
        closedAt: new Date()
      })
      .where(eq(supportChats.id, chatId));
  }

  async updateSupportChat(chatId: number, updates: any): Promise<void> {
    await db
      .update(supportChats)
      .set(updates)
      .where(eq(supportChats.id, chatId));
  }

  async createSupportMessage(message: InsertSupportMessage): Promise<SupportMessage> {
    const [msg] = await db.insert(supportMessages).values(message).returning();
    return msg;
  }

  async getChatMessages(chatId: number): Promise<SupportMessage[]> {
    return await db
      .select()
      .from(supportMessages)
      .where(eq(supportMessages.chatId, chatId))
      .orderBy(supportMessages.createdAt);
  }

  async getSupportChatMessages(chatId: number): Promise<SupportMessage[]> {
    return await db
      .select()
      .from(supportMessages)
      .where(eq(supportMessages.chatId, chatId))
      .orderBy(supportMessages.createdAt);
  }

  async markMessageAsRead(messageId: number): Promise<void> {
    await db
      .update(supportMessages)
      .set({ readAt: new Date() })
      .where(eq(supportMessages.id, messageId));
  }
  
  // Affiliate Support operations
  async createAffiliateSupportChat(affiliateId: number): Promise<any> {
    const { affiliateSupportChats } = await import("@shared/schema");
    const [chat] = await db.insert(affiliateSupportChats).values({ 
      affiliateId,
      status: 'open'
    }).returning();
    return chat;
  }

  async getAffiliateSupportChat(chatId: number): Promise<any> {
    const { affiliateSupportChats } = await import("@shared/schema");
    const [chat] = await db
      .select()
      .from(affiliateSupportChats)
      .where(eq(affiliateSupportChats.id, chatId));
    return chat;
  }

  async getAffiliateActiveChat(affiliateId: number): Promise<any> {
    const { affiliateSupportChats } = await import("@shared/schema");
    const [chat] = await db
      .select()
      .from(affiliateSupportChats)
      .where(and(
        eq(affiliateSupportChats.affiliateId, affiliateId),
        eq(affiliateSupportChats.status, 'open')
      ))
      .orderBy(desc(affiliateSupportChats.createdAt))
      .limit(1);
    return chat;
  }

  async getActiveAffiliateSupportChats(): Promise<any[]> {
    const { affiliateSupportChats } = await import("@shared/schema");
    return await db
      .select()
      .from(affiliateSupportChats)
      .where(eq(affiliateSupportChats.status, 'active'))
      .orderBy(desc(affiliateSupportChats.createdAt));
  }

  async closeAffiliateSupportChat(chatId: number): Promise<void> {
    const { affiliateSupportChats } = await import("@shared/schema");
    await db
      .update(affiliateSupportChats)
      .set({
        status: 'closed',
        closedAt: new Date()
      })
      .where(eq(affiliateSupportChats.id, chatId));
  }

  async createAffiliateSupportMessage(message: any): Promise<any> {
    const { affiliateSupportMessages } = await import("@shared/schema");
    const [msg] = await db.insert(affiliateSupportMessages).values(message).returning();
    return msg;
  }

  async getAffiliateChatMessages(chatId: number): Promise<any[]> {
    const { affiliateSupportMessages } = await import("@shared/schema");
    return await db
      .select()
      .from(affiliateSupportMessages)
      .where(eq(affiliateSupportMessages.chatId, chatId))
      .orderBy(affiliateSupportMessages.createdAt);
  }
  
  // Referral operations
  async getUserByReferralCode(referralCode: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(
      sql`UPPER(${users.referralCode}) = UPPER(${referralCode})`
    );
    return user;
  }
  
  // Referral configuration
  async getReferralConfig(): Promise<any> {
    const { referralConfig } = await import("@shared/schema");
    const configs = await db.select().from(referralConfig).limit(1);
    if (configs.length === 0) {
      // Create default config if none exists
      const [newConfig] = await db.insert(referralConfig).values({
        paymentType: "all_deposits",
        paymentAmount: "12.00",
        isActive: true
      }).returning();
      return newConfig;
    }
    return configs[0];
  }

  async updateReferralConfig(config: any): Promise<any> {
    const { referralConfig } = await import("@shared/schema");
    const existing = await this.getReferralConfig();
    const [updated] = await db.update(referralConfig)
      .set({
        ...config,
        updatedAt: new Date()
      })
      .where(eq(referralConfig.id, existing.id))
      .returning();
    return updated;
  }

  async createReferral(referral: InsertReferral): Promise<Referral> {
    const [ref] = await db.insert(referrals).values(referral).returning();
    return ref;
  }
  
  async getReferralsByReferrer(referrerId: number): Promise<Referral[]> {
    return await db
      .select()
      .from(referrals)
      .where(eq(referrals.referrerId, referrerId))
      .orderBy(desc(referrals.createdAt));
  }
  
  async getReferralsByReferred(referredId: number): Promise<Referral | undefined> {
    const [referral] = await db
      .select()
      .from(referrals)
      .where(eq(referrals.referredId, referredId));
    return referral;
  }
  
  async validateReferral(referralId: number): Promise<void> {
    await db
      .update(referrals)
      .set({
        status: 'validated',
        validatedAt: new Date()
      })
      .where(eq(referrals.id, referralId));
  }
  
  async createReferralEarning(earning: InsertReferralEarning): Promise<ReferralEarning> {
    const [refEarning] = await db.insert(referralEarnings).values(earning).returning();
    return refEarning;
  }
  
  async getReferralEarnings(userId: number): Promise<ReferralEarning[]> {
    return await db
      .select()
      .from(referralEarnings)
      .where(eq(referralEarnings.userId, userId))
      .orderBy(desc(referralEarnings.createdAt));
  }
  
  async getReferralEarningsTotal(userId: number): Promise<string> {
    const result = await db
      .select({
        total: sql<string>`COALESCE(SUM(${referralEarnings.amount}), 0)`
      })
      .from(referralEarnings)
      .where(eq(referralEarnings.userId, userId));
    
    return result[0]?.total || "0.00";
  }
  
  async getReferralEarningsAvailable(userId: number): Promise<string> {
    const result = await db
      .select({
        total: sql<string>`COALESCE(SUM(${referralEarnings.amount}), 0)`
      })
      .from(referralEarnings)
      .where(and(
        eq(referralEarnings.userId, userId),
        eq(referralEarnings.withdrawn, false)
      ));
    
    return result[0]?.total || "0.00";
  }
  
  async withdrawReferralEarnings(userId: number, amount: string): Promise<void> {
    // Mark earnings as withdrawn up to the specified amount
    const earnings = await db
      .select()
      .from(referralEarnings)
      .where(and(
        eq(referralEarnings.userId, userId),
        eq(referralEarnings.withdrawn, false)
      ))
      .orderBy(referralEarnings.createdAt);
      
    console.log(`Found ${earnings.length} earnings to process for withdrawal`);
    
    let remainingAmount = parseFloat(amount);
    let withdrawnCount = 0;
    
    for (const earning of earnings) {
      if (remainingAmount <= 0) break;
      
      const earningAmount = parseFloat(earning.amount);
      console.log(`Processing earning ID ${earning.id}: amount ${earningAmount}, remaining to withdraw: ${remainingAmount}`);
      
      // Mark this earning as withdrawn
      const result = await db
        .update(referralEarnings)
        .set({
          withdrawn: true,
          withdrawnAt: new Date()
        })
        .where(eq(referralEarnings.id, earning.id))
        .returning();
        
      console.log(`Update result: ${result.length} rows updated`);
      withdrawnCount++;
      
      remainingAmount -= earningAmount;
    }
    
    console.log(`Withdrawal complete: ${withdrawnCount} earnings marked as withdrawn`);
  }

  // Bonus code tracking (in-memory)
  async hasUsedBonusCode(userId: number, code: string): Promise<boolean> {
    const key = `${userId}-${code}`;
    return bonusCodesUsed.has(key);
  }

  async markBonusCodeAsUsed(userId: number, code: string): Promise<void> {
    const key = `${userId}-${code}`;
    bonusCodesUsed.add(key);
  }

  // Game probability operations
  async getGameProbability(gameType: string): Promise<GameProbability | undefined> {
    const [probability] = await db
      .select()
      .from(gameProbabilities)
      .where(eq(gameProbabilities.gameType, gameType));
    return probability;
  }

  async getGameProbabilities(): Promise<GameProbability[]> {
    return await db.select().from(gameProbabilities);
  }

  async upsertGameProbability(gameType: string, probability: Partial<InsertGameProbability>): Promise<void> {
    const existing = await this.getGameProbability(gameType);
    
    if (existing) {
      await db
        .update(gameProbabilities)
        .set({
          ...probability,
          updatedAt: new Date()
        })
        .where(eq(gameProbabilities.gameType, gameType));
    } else {
      await db
        .insert(gameProbabilities)
        .values({
          gameType,
          ...probability,
          updatedAt: new Date()
        });
    }
  }


  
  // Coupon operations
  async getCoupon(code: string): Promise<Coupon | undefined> {
    // Use raw SQL to avoid schema mismatches
    const result = await db.execute(sql`
      SELECT id, code, description, min_deposit as "minDeposit", is_active as "isActive", created_at as "createdAt"
      FROM coupons 
      WHERE code = ${code}
      LIMIT 1
    `);
    return result.rows[0] as Coupon | undefined;
  }
  
  async getCouponById(id: number): Promise<Coupon | undefined> {
    // Use raw SQL to avoid schema mismatches
    const result = await db.execute(sql`
      SELECT id, code, description, min_deposit as "minDeposit", is_active as "isActive", created_at as "createdAt"
      FROM coupons 
      WHERE id = ${id}
      LIMIT 1
    `);
    return result.rows[0] as Coupon | undefined;
  }
  
  async getCoupons(): Promise<Coupon[]> {
    // Use raw SQL to avoid schema mismatches
    const result = await db.execute(sql`
      SELECT id, code, description, min_deposit as "minDeposit", is_active as "isActive", created_at as "createdAt"
      FROM coupons 
      ORDER BY created_at DESC
    `);
    return result.rows as Coupon[];
  }
  
  async getAllCoupons(): Promise<Coupon[]> {
    return this.getCoupons();
  }
  
  async createCoupon(coupon: InsertCoupon): Promise<Coupon> {
    // Use raw SQL to avoid schema mismatches - include all required fields
    const result = await db.execute(sql`
      INSERT INTO coupons (code, description, min_deposit, is_active, type, value)
      VALUES (${coupon.code}, ${coupon.description || null}, ${coupon.minDeposit || '0'}, ${true}, ${'fixed'}, ${0})
      RETURNING id, code, description, min_deposit as "minDeposit", is_active as "isActive", created_at as "createdAt"
    `);
    return result.rows[0] as Coupon;
  }
  
  async updateCoupon(id: number, updates: Partial<InsertCoupon>): Promise<void> {
    await db.update(coupons)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(coupons.id, id));
  }
  
  async deleteCoupon(id: number): Promise<void> {
    await db.delete(coupons).where(eq(coupons.id, id));
  }
  
  async incrementCouponUsage(id: number): Promise<void> {
    // Use raw SQL to avoid schema mismatches - only update fields that exist
    await db.execute(sql`
      UPDATE coupons 
      SET updated_at = NOW()
      WHERE id = ${id}
    `);
  }
  
  async incrementCouponUsageCount(id: number): Promise<void> {
    return this.incrementCouponUsage(id);
  }
  
  async getCouponUses(couponId: number): Promise<CouponUse[]> {
    return await db.select()
      .from(couponUses)
      .where(eq(couponUses.couponId, couponId))
      .orderBy(desc(couponUses.usedAt));
  }
  
  async getCouponUsesWithUserDetails(couponId: number): Promise<any[]> {
    const uses = await db.select({
      use: couponUses,
      user: users
    })
    .from(couponUses)
    .leftJoin(users, eq(couponUses.userId, users.id))
    .where(eq(couponUses.couponId, couponId))
    .orderBy(desc(couponUses.usedAt));
    
    return uses.map(({ use, user }) => ({
      id: use.id,
      userId: use.userId,
      userName: user?.name || 'Unknown',
      userEmail: user?.email || 'Unknown',
      depositId: use.depositId,
      usedAt: use.usedAt
    }));
  }
  
  async getUserCouponUses(userId: number, couponId: number): Promise<CouponUse[]> {
    return await db.select()
      .from(couponUses)
      .where(and(
        eq(couponUses.userId, userId),
        eq(couponUses.couponId, couponId)
      ))
      .orderBy(desc(couponUses.usedAt));
  }
  
  async createCouponUse(use: InsertCouponUse): Promise<CouponUse> {
    const [newUse] = await db.insert(couponUses).values(use).returning();
    return newUse;
  }
  
  async applyCouponToUser(userId: number, couponCode: string): Promise<void> {
    await db.update(users)
      .set({
        couponApplied: 1,
        currentCoupon: couponCode,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }
  
  async removeCouponFromUser(userId: number): Promise<void> {
    await db.update(users)
      .set({
        couponApplied: 0,
        currentCoupon: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }
  
  async updateUserFirstDeposit(userId: number): Promise<void> {
    await db.update(users)
      .set({
        hasFirstDeposit: true,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  // Prize probabilities methods
  async getPrizeProbabilities(gameType: string, userId?: number): Promise<any[]> {
    // Check if user is a demo account (CPF 99999999999)
    let isDemo = false;
    if (userId) {
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (user && user.cpf === '99999999999') {
        isDemo = true;
        console.log(`🎮 Usando probabilidades DEMO para usuário ${user.name} (CPF: 99999999999)`);
      }
    }
    
    // Use demo probabilities for demo accounts
    if (isDemo) {
      const demoGameType = `demo_${gameType}`;
      const probabilities = await db.execute(sql`
        SELECT * FROM demo_prize_probabilities 
        WHERE game_type = ${demoGameType}
        ORDER BY "order"
      `);
      
      // Map to expected format for game creation endpoints
      return probabilities.rows.map((p: any) => ({
        prize_value: p.prize_value,
        probability: p.probability
      }));
    }
    
    // Regular probabilities for normal users
    const probabilities = await db.select()
      .from(prizeProbabilities)
      .where(eq(prizeProbabilities.gameType, gameType))
      .orderBy(prizeProbabilities.order);
    
    // Map to expected format for game creation endpoints
    return probabilities.map(p => ({
      prize_value: p.prizeValue,
      probability: p.probability
    }));
  }

  // Get full prize probabilities for admin panel
  async getFullPrizeProbabilities(gameType: string): Promise<any[]> {
    // Use pool directly with correct column names based on actual DB structure
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT 
          id,
          game_type,
          prize_value,
          prize_type as prize_name,
          probability,
          0 as "order"
        FROM prize_probabilities
        WHERE game_type = $1
        ORDER BY probability DESC, prize_value`,
        [gameType]
      );
      
      // Return full objects for admin panel, mapping to expected format
      return result.rows.map((p: any) => ({
        id: p.id,
        game_type: p.game_type,
        prize_value: p.prize_value || '0',
        prize_name: p.prize_name || `R$ ${parseFloat(p.prize_value || '0').toFixed(2).replace('.', ',')}`,
        probability: parseFloat(p.probability || '0'),
        order: p.order || 0
      }));
    } finally {
      client.release();
    }
  }

  // Get all prize probabilities from all games
  async getAllPrizeProbabilities(): Promise<any[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT 
          id,
          game_type,
          prize_value,
          prize_type as prize_name,
          probability,
          0 as "order"
        FROM prize_probabilities
        ORDER BY game_type, probability DESC, prize_value`
      );
      
      return result.rows.map((p: any) => ({
        id: p.id,
        game_type: p.game_type,
        prize_value: p.prize_value || '0',
        prize_name: p.prize_name || `R$ ${parseFloat(p.prize_value || '0').toFixed(2).replace('.', ',')}`,
        probability: parseFloat(p.probability || '0'),
        order: p.order || 0
      }));
    } finally {
      client.release();
    }
  }

  // Get demo prize probabilities for admin panel
  // List all scratch games
  async listScratchGames(): Promise<{ game_key: string; name: string; cost: string; image_url: string; is_active: boolean; probabilities?: any[] }[]> {
    return this.SCRATCH_GAMES.map(game => ({ ...game }));
  }

  // Get game probabilities from database or defaults
  async getGameProbabilities(gameKey: string): Promise<{ probabilities: any[] }> {
    const client = await pool.connect();
    try {
      // Try to get from database first
      const result = await client.query(
        'SELECT id, game_type, prize_value, prize_name, probability, "order", updated_at, updated_by ' +
        'FROM prize_probabilities ' +
        'WHERE game_type = $1 ' +
        'ORDER BY "order" ASC',
        [gameKey]
      );
      
      if (result.rows.length > 0) {
        const probabilities = result.rows.map((row: any) => ({
          value: row.prize_value,
          name: row.prize_name || `R$ ${parseFloat(row.prize_value).toFixed(2).replace('.', ',')}`,
          probability: parseFloat(row.probability),
          order: row["order"] || 0
        }));
        return { probabilities };
      }
      
      // Return defaults if no data in database
      const defaults = this.DEFAULT_PROBABILITIES[gameKey] || [];
      return { probabilities: defaults };
    } finally {
      client.release();
    }
  }

  // Update game probabilities with validation
  async updateGameProbabilities(gameKey: string, probabilities: { value: string; name: string; probability: number; order: number }[]): Promise<void> {
    // Validate that sum is approximately 100%
    const sum = probabilities.reduce((acc, p) => acc + p.probability, 0);
    if (Math.abs(sum - 100) > 0.01) {
      throw new Error(`A soma das probabilidades deve ser 100%. Soma atual: ${sum.toFixed(2)}%`);
    }
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Delete existing probabilities
      await client.query(
        'DELETE FROM prize_probabilities WHERE game_type = $1',
        [gameKey]
      );
      
      // Insert new probabilities
      for (const [index, p] of probabilities.entries()) {
        await client.query(
          `INSERT INTO prize_probabilities (game_type, prize_value, prize_name, probability, "order", updated_at, updated_by)
           VALUES ($1, $2, $3, $4, $5, NOW(), $6)`,
          [gameKey, p.value, p.name, p.probability, p.order || index, 'admin']
        );
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Distribute probability equally among all prizes
  async distributeEqually(gameKey: string): Promise<void> {
    const defaults = this.DEFAULT_PROBABILITIES[gameKey];
    if (!defaults) {
      throw new Error(`Jogo não encontrado: ${gameKey}`);
    }
    
    const equalProbability = 100 / defaults.length;
    const equallyDistributed = defaults.map((p, index) => ({
      ...p,
      probability: equalProbability,
      order: index + 1
    }));
    
    await this.updateGameProbabilities(gameKey, equallyDistributed);
  }

  // Reset to default probabilities
  async resetToDefaults(gameKey: string): Promise<void> {
    const defaults = this.DEFAULT_PROBABILITIES[gameKey];
    if (!defaults) {
      throw new Error(`Jogo não encontrado: ${gameKey}`);
    }
    
    await this.updateGameProbabilities(gameKey, defaults);
  }

  async getDemoPrizeProbabilities(gameType: string): Promise<any[]> {
    const demoGameType = `demo_${gameType}`;
    const probabilities = await db.execute(sql`
      SELECT * FROM demo_prize_probabilities 
      WHERE game_type = ${demoGameType}
      ORDER BY "order"
    `);
    
    // Return full objects for admin panel
    return probabilities.rows.map((p: any) => ({
      id: p.id,
      game_type: p.game_type,
      prize_value: p.prize_value,
      prize_name: p.prize_name || '',
      probability: p.probability,
      order: p.order
    }));
  }

  // Update demo prize probabilities
  async updateDemoPrizeProbabilities(gameType: string, probabilities: any[]): Promise<void> {
    const demoGameType = `demo_${gameType}`;
    
    // Delete existing demo probabilities for this game type
    await db.execute(sql`
      DELETE FROM demo_prize_probabilities 
      WHERE game_type = ${demoGameType}
    `);
    
    // Insert new demo probabilities
    if (probabilities.length > 0) {
      const values = probabilities.map((p, index) => ({
        game_type: demoGameType,
        prize_value: p.prizeValue || p.prize_value,
        prize_name: p.prizeName || p.prize_name || null,
        probability: p.probability,
        order: index,
        updated_at: new Date().toISOString(),
        updated_by: 'admin'
      }));
      
      for (const value of values) {
        await db.execute(sql`
          INSERT INTO demo_prize_probabilities 
          (game_type, prize_value, prize_name, probability, "order", updated_at, updated_by)
          VALUES (${value.game_type}, ${value.prize_value}, ${value.prize_name}, 
                  ${value.probability}, ${value.order}, ${value.updated_at}, ${value.updated_by})
        `);
      }
    }
  }

  async updatePrizeProbabilities(gameType: string, probabilities: any[]): Promise<void> {
    // Use pool directly with correct column names based on actual DB structure
    const client = await pool.connect();
    try {
      // Start transaction for atomic operation
      await client.query('BEGIN');
      
      // Delete existing probabilities for this game type
      await client.query(
        'DELETE FROM prize_probabilities WHERE game_type = $1',
        [gameType]
      );
      
      // Insert new probabilities with correct column names
      if (probabilities.length > 0) {
        for (const [index, p] of probabilities.entries()) {
          const prizeValue = (p.prizeValue || p.prize_value || '0').toString();
          const prizeName = p.prizeName || p.prize_name || `R$ ${parseFloat(prizeValue).toFixed(2)}`;
          const probabilityValue = p.probability || 0; // Keep as decimal, don't convert to integer
          const amount = parseFloat(prizeValue);
          
          await client.query(
            `INSERT INTO prize_probabilities (game_type, prize_value, prize_type, probability, updated_at, updated_by)
             VALUES ($1, $2, $3, $4, NOW(), $5)`,
            [gameType, prizeValue, prizeName, probabilityValue, 'admin']
          );
        }
      }
      
      // Commit transaction
      await client.query('COMMIT');
    } catch (error) {
      // Rollback on error
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Affiliate operations
  // Affiliate tier config methods
  async getAffiliateTierConfigs(): Promise<any[]> {
    const { affiliateTierConfig } = await import("@shared/schema");
    const configs = await db.select().from(affiliateTierConfig).orderBy(affiliateTierConfig.minEarnings);
    return configs;
  }

  async updateAffiliateTierConfig(tier: string, data: {
    percentageRate?: string;
    fixedAmount?: string;
    minEarnings?: string;
  }): Promise<void> {
    const { affiliateTierConfig } = await import("@shared/schema");
    await db.update(affiliateTierConfig)
      .set({
        percentageRate: data.percentageRate,
        fixedAmount: data.fixedAmount,
        minEarnings: data.minEarnings,
        updatedAt: new Date()
      })
      .where(eq(affiliateTierConfig.tier, tier));
  }

  async updateAffiliateCommissionSettings(affiliateId: number, settings: {
    affiliateLevel?: string;
    commissionType?: string;
    fixedCommissionAmount?: string;
    customCommissionRate?: string;
    customFixedAmount?: string;
  }): Promise<void> {
    try {
      const { affiliateTierConfig } = await import("@shared/schema");
      
      console.log('=== UPDATE AFFILIATE COMMISSION SETTINGS ===');
      console.log('Affiliate ID:', affiliateId);
      console.log('Settings received:', settings);
      
      // Build update data object
      const updateData: any = {};
      
      // Always update level and type if provided
      if (settings.affiliateLevel !== undefined && settings.affiliateLevel !== '') {
        updateData.affiliateLevel = settings.affiliateLevel;
      }
      
      if (settings.commissionType !== undefined && settings.commissionType !== '') {
        updateData.commissionType = settings.commissionType;
      }
      
      // Get tier configuration if level is provided
      if (settings.affiliateLevel) {
        const [tierConfig] = await db.select()
          .from(affiliateTierConfig)
          .where(eq(affiliateTierConfig.tier, settings.affiliateLevel));
        
        if (tierConfig) {
          console.log('Found tier config:', tierConfig);
          updateData.currentLevelRate = tierConfig.percentageRate;
          updateData.fixedCommissionAmount = tierConfig.fixedAmount;
        } else {
          console.log('No tier config found for:', settings.affiliateLevel);
          // Default values if no tier config
          updateData.currentLevelRate = '40'; // Bronze default
          updateData.fixedCommissionAmount = '6'; // Bronze default
        }
      }
      
      // Handle custom values - can be for any tier now
      // Check if custom values are explicitly provided
      if (settings.customCommissionRate !== undefined) {
        // If explicitly set to null or empty, clear the custom rate
        updateData.customCommissionRate = settings.customCommissionRate === '' || settings.customCommissionRate === null 
          ? null 
          : settings.customCommissionRate;
      }
      
      if (settings.customFixedAmount !== undefined) {
        // If explicitly set to null or empty, clear the custom amount
        updateData.customFixedAmount = settings.customFixedAmount === '' || settings.customFixedAmount === null 
          ? null 
          : settings.customFixedAmount;
      }
      
      // Update current rate to custom value if custom is set
      if (settings.commissionType === 'percentage' && updateData.customCommissionRate && updateData.customCommissionRate !== null) {
        updateData.currentLevelRate = updateData.customCommissionRate;
      }
      if (settings.commissionType === 'fixed' && updateData.customFixedAmount && updateData.customFixedAmount !== null) {
        updateData.fixedCommissionAmount = updateData.customFixedAmount;
      }
      
      console.log('Update data to be applied:', updateData);
      
      // Only update if there's data to update
      if (Object.keys(updateData).length > 0) {
        // Perform the update
        const [updatedAffiliate] = await db.update(affiliates)
          .set(updateData)
          .where(eq(affiliates.id, affiliateId))
          .returning();
        
        console.log('Update result:', {
          id: updatedAffiliate.id,
          name: updatedAffiliate.name,
          affiliateLevel: updatedAffiliate.affiliateLevel,
          commissionType: updatedAffiliate.commissionType,
          currentLevelRate: updatedAffiliate.currentLevelRate,
          fixedCommissionAmount: updatedAffiliate.fixedCommissionAmount,
          customCommissionRate: updatedAffiliate.customCommissionRate,
          customFixedAmount: updatedAffiliate.customFixedAmount
        });
        
        console.log('=== UPDATE SUCCESSFUL ===');
      } else {
        console.log('No data to update');
      }
    } catch (error) {
      console.error('Error updating affiliate commission settings:', error);
      throw error;
    }
  }

  async createAffiliate(data: any): Promise<any> {
    const [affiliate] = await db.insert(affiliates).values(data).returning();
    return affiliate;
  }

  async getAffiliateById(id: number): Promise<any> {
    const [affiliate] = await db.select().from(affiliates).where(eq(affiliates.id, id));
    return affiliate;
  }

  async getAffiliate(id: number): Promise<any> {
    const [affiliate] = await db.select().from(affiliates).where(eq(affiliates.id, id));
    return affiliate;
  }

  async getAffiliateByEmail(email: string): Promise<any> {
    const [affiliate] = await db.select().from(affiliates).where(eq(affiliates.email, email));
    return affiliate;
  }

  async getAffiliateByCode(code: string): Promise<any> {
    const [affiliate] = await db.select().from(affiliates).where(eq(affiliates.code, code));
    return affiliate;
  }



  async getAffiliateStats(affiliateId: number): Promise<any> {
    const affiliate = await this.getAffiliateById(affiliateId);
    if (!affiliate) return null;
    
    // Get click count
    const clicks = await db.select().from(affiliateClicks).where(eq(affiliateClicks.affiliateId, affiliateId));
    
    // Get conversions
    const conversions = await db.select().from(affiliateConversions).where(eq(affiliateConversions.affiliateId, affiliateId));
    
    const registrations = conversions.filter(c => c.conversionType === 'registration').length;
    const deposits = conversions.filter(c => c.conversionType === 'deposit');
    const totalDeposits = deposits.reduce((sum, d) => sum + parseFloat(d.conversionValue || '0'), 0);
    const totalCommissions = conversions.reduce((sum, c) => sum + parseFloat(c.commission || '0'), 0);
    
    return {
      clicks: clicks.length,
      registrations,
      deposits: deposits.length,
      totalDeposits: totalDeposits.toFixed(2),
      commissions: totalCommissions.toFixed(2),
      pendingEarnings: affiliate.pendingEarnings || '0.00',
      paidEarnings: affiliate.paidEarnings || '0.00',
      totalEarnings: affiliate.totalEarnings || '0.00',
      code: affiliate.code
    };
  }

  async trackAffiliateClick(data: any): Promise<void> {
    await db.insert(affiliateClicks).values(data);
    
    // Update click count in affiliates table
    if (data.affiliateId) {
      await db.update(affiliates)
        .set({ totalClicks: sql`${affiliates.totalClicks} + 1` })
        .where(eq(affiliates.id, data.affiliateId));
    }
  }

  async trackAffiliateConversion(data: any): Promise<void> {
    await db.insert(affiliateConversions).values(data);
    
    // Update affiliate stats
    if (data.affiliateId) {
      const affiliate = await this.getAffiliateById(data.affiliateId);
      if (affiliate) {
        const updates: any = {};
        
        if (data.conversionType === 'registration') {
          updates.totalRegistrations = sql`${affiliates.totalRegistrations} + 1`;
        } else if (data.conversionType === 'deposit') {
          updates.totalDeposits = sql`${affiliates.totalDeposits} + 1`;
          updates.totalEarnings = sql`${affiliates.totalEarnings} + ${data.commission || 0}`;
          updates.pendingEarnings = sql`${affiliates.pendingEarnings} + ${data.commission || 0}`;
        }
        
        if (Object.keys(updates).length > 0) {
          await db.update(affiliates)
            .set(updates)
            .where(eq(affiliates.id, data.affiliateId));
        }
      }
    }
  }

  async createAffiliateConversion(data: any): Promise<any> {
    const [conversion] = await db.insert(affiliateConversions).values(data).returning();
    
    // Update affiliate stats
    if (data.affiliateId) {
      const affiliate = await this.getAffiliateById(data.affiliateId);
      if (affiliate) {
        const updates: any = {};
        
        if (data.conversionType === 'registration') {
          updates.totalRegistrations = sql`${affiliates.totalRegistrations} + 1`;
        } else if (data.conversionType === 'deposit') {
          updates.totalDeposits = sql`${affiliates.totalDeposits} + 1`;
          // For new conversions, add to pending earnings only
          updates.pendingEarnings = sql`${affiliates.pendingEarnings} + ${data.commission || 0}`;
        }
        
        if (Object.keys(updates).length > 0) {
          await db.update(affiliates)
            .set(updates)
            .where(eq(affiliates.id, data.affiliateId));
        }
      }
    }
    
    return conversion;
  }

  async setUserAffiliate(userId: number, affiliateId: number): Promise<void> {
    await db.update(users)
      .set({ affiliateId })
      .where(eq(users.id, userId));
  }

  async getUserAffiliate(userId: number): Promise<number | null> {
    const [user] = await db.select({ affiliateId: users.affiliateId })
      .from(users)
      .where(eq(users.id, userId));
    return user?.affiliateId || null;
  }

  async getUsersByAffiliateId(affiliateId: number): Promise<any[]> {
    return await db.select()
      .from(users)
      .where(eq(users.affiliateId, affiliateId));
  }

  async getUsersByReferralCode(referralCode: string): Promise<any[]> {
    return await db.select()
      .from(users)
      .where(eq(users.referredBy, referralCode));
  }

  // DEPRECATED - Use processAffiliateCommission from routes.ts instead
  // This method is kept for backward compatibility but should not be used
  async processAffiliateCommission(userId: number, depositAmount: string): Promise<void> {
    console.warn('DEPRECATED: processAffiliateCommission in storage.ts is deprecated. Use the version in routes.ts instead.');
    return;
  }

  async updateAffiliateStats(affiliateId: number, stats: any): Promise<void> {
    await db.update(affiliates)
      .set(stats)
      .where(eq(affiliates.id, affiliateId));
  }

  async requestAffiliatePayout(affiliateId: number, amount: string, pixKey: string): Promise<any> {
    const [payout] = await db.insert(affiliatePayouts).values({
      affiliateId,
      amount,
      pixKey,
      status: 'pending'
    }).returning();
    
    // Update affiliate pending earnings
    await db.update(affiliates)
      .set({ 
        pendingEarnings: sql`${affiliates.pendingEarnings} - ${amount}` 
      })
      .where(eq(affiliates.id, affiliateId));
    
    return payout;
  }

  async getAffiliatePayouts(affiliateId: number): Promise<any[]> {
    return await db.select()
      .from(affiliatePayouts)
      .where(eq(affiliatePayouts.affiliateId, affiliateId))
      .orderBy(desc(affiliatePayouts.requestedAt));
  }

  async updateAffiliate(id: number, data: any): Promise<any> {
    const [updated] = await db.update(affiliates)
      .set(data)
      .where(eq(affiliates.id, id))
      .returning();
    return updated;
  }

  // Demo Account Operations
  async getDemoAccountByAffiliateId(affiliateId: number): Promise<User | undefined> {
    const [user] = await db.select()
      .from(users)
      .where(and(
        eq(users.cpf, '99999999999'), // Fixed CPF for demo accounts
        eq(users.affiliateId, affiliateId)
      ));
    return user;
  }

  async getDemoAccountByPartnerId(partnerId: number): Promise<User | undefined> {
    // First get the partner's code
    const [partner] = await db.select()
      .from(partners)
      .where(eq(partners.id, partnerId));
    
    if (!partner || !partner.code) {
      return undefined;
    }
    
    // Find demo account using partner's code as referredBy
    const [user] = await db.select()
      .from(users)
      .where(and(
        eq(users.cpf, '99999999999'), // Fixed CPF for demo accounts
        eq(users.referredBy, partner.code)
      ));
    return user;
  }

  async createDemoAccount(affiliateId: number, name: string, balance: number, scratchBonus: number): Promise<{ user: User; password: string }> {
    // Generate random email
    const randomId = Math.random().toString(36).substring(2, 12);
    const email = `demo_${randomId}@demo.com`;
    
    // Generate deterministic password based on email (so we can recreate it later)
    const password = `Demo${randomId}2025`;
    
    // Fixed CPF for all demo accounts
    const demoCpf = '99999999999'; // Fixed CPF for demo accounts
    const demoPhone = '11999999999'; // Fixed phone for demo accounts
    
    // Hash password for storage
    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user with unique demo CPF
    const [user] = await db.insert(users).values({
      name,
      email,
      password: hashedPassword,
      phone: demoPhone,
      cpf: demoCpf,
      affiliateId,
      hasFirstDeposit: true // Prevent first deposit bonus
    }).returning();
    
    // Create wallet with specified balances
    await db.insert(wallets).values({
      userId: user.id,
      balance: balance.toFixed(2),
      scratchBonus: Math.floor(scratchBonus),
      totalWagered: '0.00'
    });
    
    return { user, password };
  }

  async createPartnerDemoAccount(partnerId: number, name: string, balance: number, scratchBonus: number): Promise<{ user: User; password: string }> {
    // First get the partner's code to use as partnerInviteCode
    const [partner] = await db.select()
      .from(partners)
      .where(eq(partners.id, partnerId));
    
    if (!partner || !partner.code) {
      throw new Error("Partner not found or has no code");
    }
    
    // Generate random email
    const randomId = Math.random().toString(36).substring(2, 12);
    const email = `demo_${randomId}@demo.com`;
    
    // Generate deterministic password based on email (so we can recreate it later)
    const password = `Demo${randomId}2025`;
    
    // Fixed CPF for all demo accounts
    const demoCpf = '99999999999'; // Fixed CPF for demo accounts
    const demoPhone = '11999999999'; // Fixed phone for demo accounts
    
    // Hash password for storage
    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user with unique demo CPF
    const [user] = await db.insert(users).values({
      name,
      email,
      password: hashedPassword,
      phone: demoPhone,
      cpf: demoCpf,
      referredBy: partner.code, // Link to partner via their code
      hasFirstDeposit: true // Prevent first deposit bonus
    }).returning();
    
    // Create wallet with specified balances
    await db.insert(wallets).values({
      userId: user.id,
      balance: balance.toFixed(2),
      scratchBonus: Math.floor(scratchBonus),
      totalWagered: '0.00'
    });
    
    return { user, password };
  }

  async updateDemoAccount(userId: number, name: string, balance: number, scratchBonus: number): Promise<void> {
    // Update user name
    await db.update(users)
      .set({ name })
      .where(eq(users.id, userId));
    
    // Update wallet balances
    await db.update(wallets)
      .set({
        balance: balance.toFixed(2),
        scratchBonus: Math.floor(scratchBonus)
      })
      .where(eq(wallets.userId, userId));
  }

  async deleteDemoAccount(userId: number): Promise<void> {
    // Delete all related data in the correct order to avoid foreign key constraints
    
    // Delete game premios
    await db.delete(gamePremios).where(eq(gamePremios.userId, userId));
    
    // Delete games played by the user
    await db.delete(gamePremios).where(eq(gamePremios.userId, userId));
    
    // Delete deposits
    await db.delete(deposits).where(eq(deposits.userId, userId));
    
    // Delete withdrawals
    await db.delete(withdrawals).where(eq(withdrawals.userId, userId));
    
    // Delete referral earnings
    await db.delete(referralEarnings).where(eq(referralEarnings.userId, userId));
    
    // Delete wallet (foreign key constraint)
    await db.delete(wallets).where(eq(wallets.userId, userId));
    
    // Finally, delete the user
    await db.delete(users).where(eq(users.id, userId));
  }



  async getAffiliateConversions(affiliateId: number): Promise<any[]> {
    return await db.select()
      .from(affiliateConversions)
      .where(eq(affiliateConversions.affiliateId, affiliateId))
      .orderBy(desc(affiliateConversions.createdAt));
  }
  
  async getAffiliateConversionsByUser(userId: number): Promise<any[]> {
    return await db.select()
      .from(affiliateConversions)
      .where(eq(affiliateConversions.userId, userId))
      .orderBy(desc(affiliateConversions.createdAt));
  }



  async updateAffiliateConversionStatus(id: number, status: string): Promise<void> {
    const [conversion] = await db.select()
      .from(affiliateConversions)
      .where(eq(affiliateConversions.id, id));
    
    if (conversion) {
      await db.update(affiliateConversions)
        .set({ status })
        .where(eq(affiliateConversions.id, id));
      
      // Update affiliate earnings based on status change
      const commissionAmount = parseFloat(conversion.commission || '0');
      
      if (conversion.affiliateId && status === 'completed' && conversion.status === 'pending') {
        // Move from pending to completed
        await db.update(affiliates)
          .set({ 
            pendingEarnings: sql`GREATEST(COALESCE(${affiliates.pendingEarnings}, 0) - ${commissionAmount}, 0)`,
            totalEarnings: sql`COALESCE(${affiliates.totalEarnings}, 0) + ${commissionAmount}`
          })
          .where(eq(affiliates.id, conversion.affiliateId));
      } else if (conversion.affiliateId && status === 'cancelled' && conversion.status === 'pending') {
        // Remove from pending
        await db.update(affiliates)
          .set({ 
            pendingEarnings: sql`GREATEST(COALESCE(${affiliates.pendingEarnings}, 0) - ${commissionAmount}, 0)`
          })
          .where(eq(affiliates.id, conversion.affiliateId));
      }
    }
  }

  // SMS Verification methods
  async createSmsVerificationCode(phone: string, code: string, type: string): Promise<void> {
    // Delete old codes for this phone and type
    await db.delete(smsVerificationCodes)
      .where(and(
        eq(smsVerificationCodes.phone, phone),
        eq(smsVerificationCodes.type, type),
        eq(smsVerificationCodes.used, false)
      ));

    // Create new code with 10 minute expiry
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await db.insert(smsVerificationCodes).values({
      phone,
      code,
      type,
      expiresAt,
      used: false
    });
  }

  async getValidSmsCode(phone: string, type: string): Promise<any | undefined> {
    const now = new Date();
    const [code] = await db.select()
      .from(smsVerificationCodes)
      .where(and(
        eq(smsVerificationCodes.phone, phone),
        eq(smsVerificationCodes.type, type),
        eq(smsVerificationCodes.used, false),
        gte(smsVerificationCodes.expiresAt, now)
      ))
      .orderBy(desc(smsVerificationCodes.createdAt))
      .limit(1);
    return code;
  }

  async markSmsCodeAsUsed(id: number): Promise<void> {
    await db.update(smsVerificationCodes)
      .set({ used: true })
      .where(eq(smsVerificationCodes.id, id));
  }

  // Marketing Links implementation
  async getMarketingLinks(): Promise<any[]> {
    const { marketingLinks } = await import("@shared/schema");
    return await db.select().from(marketingLinks).orderBy(desc(marketingLinks.createdAt));
  }

  async getMarketingLinkById(id: number): Promise<any> {
    const { marketingLinks } = await import("@shared/schema");
    const [link] = await db.select().from(marketingLinks).where(eq(marketingLinks.id, id));
    return link;
  }

  async getMarketingLinkByShortCode(shortCode: string): Promise<any> {
    const { marketingLinks } = await import("@shared/schema");
    const [link] = await db.select().from(marketingLinks).where(eq(marketingLinks.shortCode, shortCode));
    return link;
  }

  async createMarketingLink(data: any): Promise<any> {
    const { marketingLinks } = await import("@shared/schema");
    
    // Generate a unique short code
    const shortCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Build the full URL with UTM parameters
    const baseUrl = "https://mania-brasil.com";
    const params = new URLSearchParams();
    
    if (data.utmSource) params.append("utm_source", data.utmSource);
    if (data.utmMedium) params.append("utm_medium", data.utmMedium);
    if (data.utmCampaign) params.append("utm_campaign", data.utmCampaign);
    if (data.utmContent) params.append("utm_content", data.utmContent);
    params.append("src", shortCode);
    
    const fullUrl = `${baseUrl}?${params.toString()}`;
    
    const [link] = await db.insert(marketingLinks).values({
      ...data,
      shortCode,
      url: fullUrl,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    return link;
  }

  async updateMarketingLink(id: number, data: any): Promise<any> {
    const { marketingLinks } = await import("@shared/schema");
    
    // If UTM params changed, rebuild the URL
    if (data.utmSource !== undefined || data.utmMedium !== undefined || 
        data.utmCampaign !== undefined || data.utmContent !== undefined) {
      
      const existingLink = await this.getMarketingLinkById(id);
      if (existingLink) {
        const baseUrl = "https://mania-brasil.com";
        const params = new URLSearchParams();
        
        const utmSource = data.utmSource ?? existingLink.utmSource;
        const utmMedium = data.utmMedium ?? existingLink.utmMedium;
        const utmCampaign = data.utmCampaign ?? existingLink.utmCampaign;
        const utmContent = data.utmContent ?? existingLink.utmContent;
        
        if (utmSource) params.append("utm_source", utmSource);
        if (utmMedium) params.append("utm_medium", utmMedium);
        if (utmCampaign) params.append("utm_campaign", utmCampaign);
        if (utmContent) params.append("utm_content", utmContent);
        params.append("src", existingLink.shortCode);
        
        data.url = `${baseUrl}?${params.toString()}`;
      }
    }
    
    const [updated] = await db.update(marketingLinks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(marketingLinks.id, id))
      .returning();
    
    return updated;
  }

  async deleteMarketingLink(id: number): Promise<void> {
    const { marketingLinks } = await import("@shared/schema");
    await db.delete(marketingLinks).where(eq(marketingLinks.id, id));
  }

  async trackMarketingClick(linkId: number, data: any): Promise<void> {
    const { marketingClicks, marketingLinks } = await import("@shared/schema");
    
    // Save click data
    await db.insert(marketingClicks).values({
      marketingLinkId: linkId,
      ip: data.ip,
      userAgent: data.userAgent,
      referrer: data.referrer,
      deviceType: data.deviceType,
      os: data.os,
      browser: data.browser,
      city: data.city,
      country: data.country,
      clickedAt: new Date()
    });
    
    // Update total clicks counter
    await db.update(marketingLinks)
      .set({ 
        totalClicks: sql`${marketingLinks.totalClicks} + 1`
      })
      .where(eq(marketingLinks.id, linkId));
  }

  async trackMarketingConversion(linkId: number, userId: number): Promise<void> {
    const { marketingConversions, marketingLinks } = await import("@shared/schema");
    
    // Check if conversion already exists
    const [existing] = await db.select()
      .from(marketingConversions)
      .where(and(
        eq(marketingConversions.marketingLinkId, linkId),
        eq(marketingConversions.userId, userId)
      ));
    
    if (!existing) {
      // Create conversion record
      await db.insert(marketingConversions).values({
        marketingLinkId: linkId,
        userId: userId,
        registeredAt: new Date()
      });
      
      // Update registration counter
      await db.update(marketingLinks)
        .set({ 
          totalRegistrations: sql`${marketingLinks.totalRegistrations} + 1`
        })
        .where(eq(marketingLinks.id, linkId));
    }
  }

  // Affiliate Withdrawals - Sistema de saques dos afiliados
  async getAffiliateWithdrawals(affiliateId?: number): Promise<any[]> {
    const { affiliatesWithdrawals, affiliates } = await import("@shared/schema");
    const WITHDRAWAL_FEE = 3.00;
    
    if (affiliateId) {
      const results = await db.select({
        id: affiliatesWithdrawals.id,
        displayId: affiliatesWithdrawals.displayId,
        affiliateId: affiliatesWithdrawals.affiliateId,
        affiliateName: affiliates.name,
        amount: affiliatesWithdrawals.amount,
        pixKey: affiliatesWithdrawals.pixKey,
        pixKeyType: affiliatesWithdrawals.pixKeyType,
        status: affiliatesWithdrawals.status,
        requestedAt: affiliatesWithdrawals.requestedAt,
        processedAt: affiliatesWithdrawals.processedAt,
        endToEndId: affiliatesWithdrawals.endToEndId,
        adminNotes: affiliatesWithdrawals.adminNotes,
        rejectionReason: affiliatesWithdrawals.rejectionReason
      })
        .from(affiliatesWithdrawals)
        .leftJoin(affiliates, eq(affiliatesWithdrawals.affiliateId, affiliates.id))
        .where(eq(affiliatesWithdrawals.affiliateId, affiliateId))
        .orderBy(desc(affiliatesWithdrawals.requestedAt));
      
      // The amount in DB is NET (after fee), so we calculate the gross amount
      return results.map(withdrawal => ({
        ...withdrawal,
        amount: withdrawal.amount, // Keep as net amount for compatibility
        netAmount: withdrawal.amount, // Explicit net amount
        grossAmount: parseFloat(withdrawal.amount) + WITHDRAWAL_FEE, // Calculate gross amount
        fee: WITHDRAWAL_FEE // Include fee amount
      }));
    }
    
    const allResults = await db.select({
      id: affiliatesWithdrawals.id,
      displayId: affiliatesWithdrawals.displayId,
      affiliateId: affiliatesWithdrawals.affiliateId,
      affiliateName: affiliates.name,
      affiliateEmail: affiliates.email,
      amount: affiliatesWithdrawals.amount,
      pixKey: affiliatesWithdrawals.pixKey,
      pixKeyType: affiliatesWithdrawals.pixKeyType,
      status: affiliatesWithdrawals.status,
      requestedAt: affiliatesWithdrawals.requestedAt,
      processedAt: affiliatesWithdrawals.processedAt,
      endToEndId: affiliatesWithdrawals.endToEndId,
      adminNotes: affiliatesWithdrawals.adminNotes,
      rejectionReason: affiliatesWithdrawals.rejectionReason
    })
      .from(affiliatesWithdrawals)
      .leftJoin(affiliates, eq(affiliatesWithdrawals.affiliateId, affiliates.id))
      .orderBy(desc(affiliatesWithdrawals.requestedAt));
    
    // The amount in DB is NET (after fee), so we calculate the gross amount
    return allResults.map(withdrawal => ({
      ...withdrawal,
      amount: withdrawal.amount, // Keep as net amount for compatibility
      netAmount: withdrawal.amount, // Explicit net amount
      grossAmount: parseFloat(withdrawal.amount) + WITHDRAWAL_FEE, // Calculate gross amount
      fee: WITHDRAWAL_FEE // Include fee amount
    }));
  }

  async createAffiliateWithdrawal(data: {
    affiliateId: number;
    amount: number;
    pixKey: string;
    pixKeyType?: string;
  }): Promise<any> {
    const { affiliatesWithdrawals } = await import("@shared/schema");
    
    // Generate a random 5-digit display ID
    let displayId = Math.floor(10000 + Math.random() * 90000);
    
    // Check if it already exists (unlikely but possible)
    let existingWithdrawal = await db.select().from(affiliatesWithdrawals).where(eq(affiliatesWithdrawals.displayId, displayId));
    while (existingWithdrawal.length > 0) {
      displayId = Math.floor(10000 + Math.random() * 90000);
      existingWithdrawal = await db.select().from(affiliatesWithdrawals).where(eq(affiliatesWithdrawals.displayId, displayId));
    }
    
    const [withdrawal] = await db.insert(affiliatesWithdrawals)
      .values({
        affiliateId: data.affiliateId,
        displayId: displayId,
        amount: data.amount.toString(),
        pixKey: data.pixKey,
        pixKeyType: data.pixKeyType,
        status: 'pending',
        requestedAt: new Date()
      })
      .returning();
    
    return withdrawal;
  }

  async updateAffiliateWithdrawal(id: number, data: {
    status?: string;
    adminNotes?: string;
    rejectionReason?: string;
    endToEndId?: string;
    processedAt?: Date;
  }): Promise<any> {
    const { affiliatesWithdrawals } = await import("@shared/schema");
    
    const updateData: any = {};
    if (data.status) updateData.status = data.status;
    if (data.adminNotes !== undefined) updateData.adminNotes = data.adminNotes;
    if (data.rejectionReason !== undefined) updateData.rejectionReason = data.rejectionReason;
    if (data.endToEndId !== undefined) updateData.endToEndId = data.endToEndId;
    
    if (data.processedAt !== undefined) {
      updateData.processedAt = data.processedAt;
    } else if (data.status === 'completed' || data.status === 'rejected' || data.status === 'approved') {
      updateData.processedAt = new Date();
    }
    
    const [updated] = await db.update(affiliatesWithdrawals)
      .set(updateData)
      .where(eq(affiliatesWithdrawals.id, id))
      .returning();
    
    return updated;
  }

  async deleteAffiliateWithdrawal(id: number): Promise<void> {
    const { affiliatesWithdrawals } = await import("@shared/schema");
    await db.delete(affiliatesWithdrawals).where(eq(affiliatesWithdrawals.id, id));
  }

  async getMarketingStats(linkId?: number): Promise<any> {
    const { marketingLinks, marketingClicks, marketingConversions } = await import("@shared/schema");
    
    if (linkId) {
      const link = await this.getMarketingLinkById(linkId);
      if (!link) return null;
      
      const clicks = await db.select({ count: count() })
        .from(marketingClicks)
        .where(eq(marketingClicks.marketingLinkId, linkId));
      
      const conversions = await db.select({ count: count() })
        .from(marketingConversions)
        .where(eq(marketingConversions.marketingLinkId, linkId));
      
      return {
        ...link,
        totalClicks: clicks[0]?.count || 0,
        totalConversions: conversions[0]?.count || 0,
        conversionRate: clicks[0]?.count > 0 
          ? ((conversions[0]?.count || 0) / clicks[0].count * 100).toFixed(2) + '%'
          : '0%'
      };
    } else {
      // Get all links with stats
      const links = await this.getMarketingLinks();
      const stats = await Promise.all(links.map(link => this.getMarketingStats(link.id)));
      return stats;
    }
  }

  async getMarketingLinkStats(linkId: number): Promise<any> {
    return this.getMarketingStats(linkId);
  }

  // Daily cashback operations
  async calculateDailyCashback(userId: number, date: Date): Promise<DailyCashback | null> {
    // Get user's tier
    const wallet = await this.getWallet(userId);
    if (!wallet) return null;
    
    const totalWagered = parseFloat(wallet.totalWagered || '0');
    const tier = this.getUserTier(totalWagered);
    
    // Get cashback percentage based on tier - matching what rewards page shows
    const cashbackPercentages: Record<string, number> = {
      bronze: 1.5,
      silver: 3,
      gold: 6,
      platinum: 12,
      diamond: 24
    };
    
    const cashbackPercentage = cashbackPercentages[tier.toLowerCase()] || 1.5;
    
    // Set start and end of the day (Brazil time - GMT-3)
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    
    // Get deposits for the day
    const dayDeposits = await db.select()
      .from(deposits)
      .where(and(
        eq(deposits.userId, userId),
        eq(deposits.status, 'completed'),
        gte(deposits.completedAt, startDate),
        lt(deposits.completedAt, endDate)
      ));
    
    const totalDeposits = dayDeposits.reduce((sum, d) => sum + parseFloat(d.amount), 0);
    
    // Get withdrawals for the day (only completed ones)
    const dayWithdrawals = await db.select()
      .from(withdrawals)
      .where(and(
        eq(withdrawals.userId, userId),
        eq(withdrawals.status, 'completed'),
        gte(withdrawals.processedAt, startDate),
        lt(withdrawals.processedAt, endDate)
      ));
    
    const totalWithdrawals = dayWithdrawals.reduce((sum, w) => sum + parseFloat(w.amount), 0);
    
    // Get current balance
    const currentBalance = wallet.balance ? parseFloat(wallet.balance) : 0;
    
    // Calculate net loss: deposits - (withdrawals + current balance)
    const netLoss = totalDeposits - (totalWithdrawals + currentBalance);
    
    // Only give cashback if there's a net loss
    if (netLoss <= 0) return null;
    
    // Calculate cashback amount
    let cashbackAmount = (netLoss * cashbackPercentage) / 100;
    
    // Minimum cashback is R$ 0.50
    if (cashbackAmount < 0.50) {
      cashbackAmount = 0.50;
    }
    
    // Check if cashback for this date already exists
    const [existingCashback] = await db.select()
      .from(dailyCashback)
      .where(and(
        eq(dailyCashback.userId, userId),
        eq(dailyCashback.calculationDate, date.toISOString().split('T')[0])
      ));
    
    if (existingCashback) {
      return existingCashback;
    }
    
    // Expire all previous pending cashbacks for this user
    await db.update(dailyCashback)
      .set({ status: 'expired' })
      .where(and(
        eq(dailyCashback.userId, userId),
        eq(dailyCashback.status, 'pending'),
        sql`${dailyCashback.calculationDate} < ${date.toISOString().split('T')[0]}`
      ));
    
    // Create cashback record
    const [newCashback] = await db.insert(dailyCashback).values({
      userId,
      calculationDate: date.toISOString().split('T')[0],
      tier,
      cashbackPercentage: cashbackPercentage.toFixed(2),
      totalDeposits: totalDeposits.toFixed(2),
      totalWithdrawals: totalWithdrawals.toFixed(2),
      currentBalance: currentBalance.toFixed(2),
      netLoss: netLoss.toFixed(2),
      cashbackAmount: cashbackAmount.toFixed(2),
      status: 'pending'
    }).returning();
    
    return newCashback;
  }

  async getDailyCashbackHistory(userId: number): Promise<DailyCashback[]> {
    return await db.select()
      .from(dailyCashback)
      .where(eq(dailyCashback.userId, userId))
      .orderBy(desc(dailyCashback.calculationDate));
  }

  async getAllPendingCashbacks(): Promise<DailyCashback[]> {
    return await db.select()
      .from(dailyCashback)
      .where(eq(dailyCashback.status, 'pending'))
      .orderBy(desc(dailyCashback.createdAt));
  }

  async creditCashback(cashbackId: number): Promise<void> {
    // Get the cashback record
    const [cashback] = await db.select()
      .from(dailyCashback)
      .where(eq(dailyCashback.id, cashbackId));
    
    if (!cashback || cashback.status !== 'pending') return;
    
    // Credit the amount to user's wallet
    const wallet = await this.getWallet(cashback.userId);
    if (!wallet) return;
    
    const currentBalance = wallet.balance ? parseFloat(wallet.balance) : 0;
    const cashbackAmount = parseFloat(cashback.cashbackAmount);
    const newBalance = (currentBalance + cashbackAmount).toFixed(2);
    
    // Update wallet balance
    await this.updateWalletBalance(cashback.userId, newBalance);
    
    // Mark cashback as credited
    await db.update(dailyCashback)
      .set({ 
        status: 'credited',
        creditedAt: new Date()
      })
      .where(eq(dailyCashback.id, cashbackId));
  }

  async processDailyCashbackForAllUsers(date: Date): Promise<void> {
    // Get all active users who made deposits
    const activeUsers = await db.selectDistinct({ userId: deposits.userId })
      .from(deposits)
      .where(eq(deposits.status, 'completed'));
    
    for (const { userId } of activeUsers) {
      try {
        const cashback = await this.calculateDailyCashback(userId, date);
        if (cashback && cashback.status === 'pending') {
          await this.creditCashback(cashback.id);
        }
      } catch (error) {
        console.error(`Error processing cashback for user ${userId}:`, error);
      }
    }
  }

  async getTodaysCashback(userId: number, date?: string): Promise<DailyCashback | undefined> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    console.log('getTodaysCashback - Looking for cashback:', { userId, targetDate });
    
    const [cashback] = await db.select()
      .from(dailyCashback)
      .where(and(
        eq(dailyCashback.userId, userId),
        eq(dailyCashback.calculationDate, targetDate)
      ));
    
    console.log('getTodaysCashback - Found:', cashback);
    
    return cashback;
  }

  async getCashbackStats(): Promise<any> {
    const totalCashbacks = await db.select({ 
      count: count(),
      totalAmount: sql`SUM(${dailyCashback.cashbackAmount})`
    }).from(dailyCashback);
    
    const pendingCashbacks = await db.select({ 
      count: count(),
      totalAmount: sql`SUM(${dailyCashback.cashbackAmount})`
    }).from(dailyCashback).where(eq(dailyCashback.status, 'pending'));
    
    const creditedCashbacks = await db.select({ 
      count: count(),
      totalAmount: sql`SUM(${dailyCashback.cashbackAmount})`
    }).from(dailyCashback).where(eq(dailyCashback.status, 'credited'));
    
    return {
      total: {
        count: totalCashbacks[0]?.count || 0,
        amount: totalCashbacks[0]?.totalAmount || '0.00'
      },
      pending: {
        count: pendingCashbacks[0]?.count || 0,
        amount: pendingCashbacks[0]?.totalAmount || '0.00'
      },
      credited: {
        count: creditedCashbacks[0]?.count || 0,
        amount: creditedCashbacks[0]?.totalAmount || '0.00'
      }
    };
  }

  async getUserCashbackHistory(userId: number): Promise<DailyCashback[]> {
    const cashbacks = await db.select()
      .from(dailyCashback)
      .where(eq(dailyCashback.userId, userId))
      .orderBy(desc(dailyCashback.calculationDate));

    // Mark expired cashbacks
    const today = new Date().toISOString().split('T')[0];
    
    return cashbacks.map((cashback) => {
      // If it's not today's cashback and it's still pending, mark as expired
      if (cashback.calculationDate !== today && cashback.status === 'pending') {
        return { ...cashback, status: 'expired' as const };
      }
      return cashback;
    });
  }

  // Helper function to get user tier based on total wagered
  getUserTier(totalWagered: string | number): string {
    const wagered = typeof totalWagered === 'string' ? parseFloat(totalWagered) : totalWagered;
    
    // Using same thresholds as the level system
    if (wagered >= 50000) return 'diamond';  // Level 100+
    if (wagered >= 20000) return 'platinum'; // Level 70+
    if (wagered >= 8000) return 'gold';      // Level 50+
    if (wagered >= 3000) return 'silver';    // Level 30+
    return 'bronze';                         // Below level 30
  }

  // Payment provider configuration methods
  async getPaymentProviderConfig(): Promise<any[]> {
    const providers = await db.select()
      .from(paymentProviderConfig)
      .orderBy(desc(paymentProviderConfig.isPrimary));
    
    return providers;
  }

  async updatePrimaryPaymentProvider(provider: string): Promise<void> {
    // First, set all providers to secondary
    await db.update(paymentProviderConfig)
      .set({ isPrimary: false, updatedAt: new Date() });
    
    // Then set the selected provider as primary
    await db.update(paymentProviderConfig)
      .set({ isPrimary: true, updatedAt: new Date() })
      .where(eq(paymentProviderConfig.provider, provider));
  }

  async updateOrinpayConfig(token: string): Promise<void> {
    await db.update(paymentProviderConfig)
      .set({ 
        apiToken: token,
        isActive: !!token,
        updatedAt: new Date()
      })
      .where(eq(paymentProviderConfig.provider, 'orinpay'));
  }

  async getPrimaryPaymentProvider(): Promise<any> {
    const [primary] = await db.select()
      .from(paymentProviderConfig)
      .where(and(
        eq(paymentProviderConfig.isPrimary, true),
        eq(paymentProviderConfig.isActive, true)
      ));
    
    return primary;
  }

  async getSecondaryPaymentProvider(): Promise<any> {
    const [secondary] = await db.select()
      .from(paymentProviderConfig)
      .where(and(
        eq(paymentProviderConfig.isPrimary, false),
        eq(paymentProviderConfig.isActive, true)
      ));
    
    return secondary;
  }
  
  // ===== AFFILIATE CODES METHODS =====
  
  async getAffiliateCodes(affiliateId: number): Promise<any[]> {
    const codes = await db.select()
      .from(affiliateCodes)
      .where(eq(affiliateCodes.affiliateId, affiliateId))
      .orderBy(desc(affiliateCodes.createdAt));
    
    return codes;
  }
  
  // ===== PARTNER CODES METHODS =====
  
  async getPartnerCodeByCode(code: string): Promise<any> {
    try {
      // First try to get the code with a simple query
      const result = await db.execute(sql`
        SELECT * FROM partner_codes
        WHERE UPPER(code) = UPPER(${code})
        LIMIT 1
      `);
      
      if (result.rows.length > 0) {
        const row = result.rows[0];
        // Return with camelCase field names for consistency
        return {
          id: row.id,
          partnerId: row.partner_id,
          code: row.code,
          name: row.name || 'Código Promocional',
          status: row.status || 'active'
        };
      }
      
      return undefined;
    } catch (error) {
      console.error('Error getting partner code:', error);
      return undefined;
    }
  }
  
  async getPartner(partnerId: number): Promise<any> {
    const { partners } = await import("@shared/schema");
    const [partner] = await db.select()
      .from(partners)
      .where(eq(partners.id, partnerId));
    
    return partner;
  }
  
  async getAffiliateCodeById(id: number): Promise<any> {
    const [code] = await db.select()
      .from(affiliateCodes)
      .where(eq(affiliateCodes.id, id));
    
    return code;
  }
  
  async getAffiliateCodeByCode(code: string): Promise<any> {
    const [affiliateCode] = await db.select()
      .from(affiliateCodes)
      .where(sql`UPPER(${affiliateCodes.code}) = UPPER(${code})`);
    
    return affiliateCode;
  }
  
  async createAffiliateCode(data: {
    affiliateId: number;
    code: string;
    name: string | null;
    totalClicks: number;
    totalRegistrations: number;
    totalDeposits: number;
    isActive: boolean;
  }): Promise<any> {
    const [newCode] = await db.insert(affiliateCodes)
      .values(data)
      .returning();
    
    return newCode;
  }
  
  async updateAffiliateCodeStats(code: string, field: 'totalClicks' | 'totalRegistrations' | 'totalDeposits'): Promise<void> {
    const existingCode = await this.getAffiliateCodeByCode(code);
    if (existingCode) {
      await db.update(affiliateCodes)
        .set({ 
          [field]: (existingCode[field] || 0) + 1,
          updatedAt: new Date()
        })
        .where(eq(affiliateCodes.code, code));
    }
  }
  
  async updateAffiliateCodePixel(id: number, pixelId: string | null): Promise<void> {
    await db.update(affiliateCodes)
      .set({ 
        facebookPixelId: pixelId,
        updatedAt: new Date()
      })
      .where(eq(affiliateCodes.id, id));
  }

  async deleteAffiliateCode(id: number): Promise<void> {
    await db.delete(affiliateCodes)
      .where(eq(affiliateCodes.id, id));
  }
  
  async getUsersByAffiliateCodes(codes: string[]): Promise<any[]> {
    if (codes.length === 0) {
      return [];
    }
    
    // Get affiliate codes data one by one to avoid issues
    const affiliateCodesData = [];
    for (const code of codes) {
      try {
        const codeData = await this.getAffiliateCodeByCode(code);
        if (codeData) {
          affiliateCodesData.push(codeData);
        }
      } catch (error) {
        console.error('Error getting code data for', code, ':', error);
        throw error;
      }
    }
    
    if (affiliateCodesData.length === 0) {
      return [];
    }
    
    // Get users who registered using these affiliate codes
    const allUsers = [];
    
    for (const code of codes) {
      const usersWithCode = await db
        .select()
        .from(users)
        .where(eq(users.referredBy, code));
      
      for (const user of usersWithCode) {
        allUsers.push({
          ...user,
          affiliateCode: code,
          conversionDate: user.createdAt
        });
      }
    }
    
    // Sort by creation date (most recent first) - handle null dates
    return allUsers.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }
  
  async getDepositsByUserId(userId: number): Promise<any[]> {
    return db
      .select()
      .from(deposits)
      .where(eq(deposits.userId, userId));
  }
  
  // Discord webhook methods
  async getDiscordWebhook(webhookType: string): Promise<any> {
    const webhook = await db
      .select()
      .from(discordWebhooks)
      .where(and(
        eq(discordWebhooks.webhookType, webhookType),
        eq(discordWebhooks.isActive, true)
      ))
      .limit(1);
    return webhook[0];
  }
  
  async getDiscordWebhooks(): Promise<any[]> {
    return db.select().from(discordWebhooks);
  }
  
  async saveDiscordWebhook(webhookType: string, webhookUrl: string | null): Promise<void> {
    const existing = await db
      .select()
      .from(discordWebhooks)
      .where(eq(discordWebhooks.webhookType, webhookType))
      .limit(1);
    
    if (existing.length > 0) {
      await db.update(discordWebhooks)
        .set({ 
          webhookUrl,
          isActive: !!webhookUrl,
          updatedAt: new Date()
        })
        .where(eq(discordWebhooks.webhookType, webhookType));
    } else {
      await db.insert(discordWebhooks).values({
        webhookType,
        webhookUrl,
        isActive: !!webhookUrl
      });
    }
  }
  
  // Partner tracking methods - match affiliate functionality exactly
  async updatePartnerCodeStats(code: string, field: 'clickCount' | 'registrationCount' | 'depositCount'): Promise<void> {
    const [existingCode] = await db.select()
      .from(partnerCodes)
      .where(sql`UPPER(${partnerCodes.code}) = UPPER(${code})`);
    
    if (existingCode) {
      await db.update(partnerCodes)
        .set({ 
          [field]: (existingCode[field] || 0) + 1,
          updatedAt: new Date()
        })
        .where(eq(partnerCodes.id, existingCode.id));
    }
  }
  
  async trackPartnerClick(data: {
    partnerId: number;
    code: string;
    ipAddress: string;
    userAgent: string;
    referrer: string;
    landingPage: string;
  }): Promise<void> {
    // Insert into partner_clicks table
    await db.insert(partnerClicks).values({
      ...data,
      createdAt: new Date()
    });
    
    // Update click count in partners table (if they have totalClicks field)
    await db.update(partners)
      .set({ 
        totalClicks: sql`COALESCE(${partners.totalClicks}, 0) + 1` 
      })
      .where(eq(partners.id, data.partnerId));
    
    // Also update the partner_codes table
    await this.updatePartnerCodeStats(data.code, 'clickCount');
  }
}

// In-memory storage for bonus codes
const bonusCodesUsed = new Set<string>();

export const storage = new DatabaseStorage();
