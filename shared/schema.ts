import { 
  pgTable, 
  text, 
  serial, 
  integer, 
  boolean, 
  timestamp, 
  decimal, 
  varchar,
  pgEnum,
  jsonb,
  date,
  numeric
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  password: text("password").notNull(),
  cpf: text("cpf"), // CPF do usuário (permite duplicados para contas demo)
  isAdult: boolean("is_adult"), // Confirmação de ter mais de 18 anos
  referralCode: text("referral_code").unique(), // The user's own referral code (RAS + userId)
  referredBy: text("referred_by"), // The referral code used when registering
  // UTM tracking fields for Facebook campaigns
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  utmTerm: text("utm_term"),
  utmContent: text("utm_content"),
  utmSrc: text("utm_src"), // Additional 'src' parameter
  landingPage: text("landing_page"), // The page where user first landed
  couponApplied: integer("coupon_applied").default(0), // 0 = no coupon, 1 = coupon applied
  currentCoupon: text("current_coupon"), // The coupon code currently applied
  hasFirstDeposit: boolean("has_first_deposit").default(false), // Track if user made first deposit
  affiliateId: integer("affiliate_id"), // ID of the affiliate who referred this user
  partnerId: integer("partner_id"), // ID of the partner who referred this user (if any)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// SMS verification codes table
export const smsVerificationCodes = pgTable("sms_verification_codes", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull(),
  code: text("code").notNull(),
  type: text("type").notNull(), // 'password_reset' or 'phone_verification'
  used: boolean("used").default(false),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Wallets table
export const wallets = pgTable("wallets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  balance: decimal("balance", { precision: 10, scale: 2 }).default("0.00"),
  scratchBonus: integer("scratch_bonus").default(0),
  totalWagered: decimal("total_wagered", { precision: 10, scale: 2 }).default("0.00"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});



// Premio types enum  
export const premioTypeEnum = pgEnum("premio_type", [
  "pix",
  "me_mimei",
  "eletronicos",
  "super"
]);

// Game categories enum (kept for backwards compatibility)
export const gameTypeEnum = pgEnum("game_type", [
  "pix_na_conta",
  "sonho_consumo", 
  "me_mimei",
  "super_premios",
  "premio_pix_conta"
]);

// Games table (kept for backwards compatibility)
export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  gameType: gameTypeEnum("game_type").notNull(),
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull(),
  prize: decimal("prize", { precision: 10, scale: 2 }).default("0.00"),
  result: text("result").notNull(), // JSON string with scratch results
  won: boolean("won").default(false),
  gameData: text("game_data"), // Additional game-specific data
  playedAt: timestamp("played_at").defaultNow(),
});



// Game premios table
export const gamePremios = pgTable("game_premios", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  displayId: integer("display_id").notNull().unique(), // 5-digit display ID
  gameType: premioTypeEnum("game_type").notNull(),
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull(),
  prize: decimal("prize", { precision: 10, scale: 2 }).default("0.00"),
  result: text("result").notNull(), // JSON string with scratch results
  won: boolean("won").default(false),
  gameData: text("game_data"), // Additional game-specific data
  playedAt: timestamp("played_at").defaultNow(),
});

// Deposits table
export const deposits = pgTable("deposits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  displayId: integer("display_id").notNull().unique(), // 5-digit display ID
  transactionId: text("transaction_id").notNull().unique(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // pending, completed, failed
  pixCode: text("pix_code"),
  paymentProvider: text("payment_provider"), // ironpay or orinpay
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Withdrawals table
export const withdrawals = pgTable("withdrawals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  displayId: integer("display_id").notNull().unique(), // 5-digit display ID
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  pixKey: text("pix_key").notNull(),
  pixKeyType: text("pix_key_type").notNull(), // cpf, email, phone, random
  status: text("status").notNull().default("pending"), // pending, completed, failed, cancelled
  requestedAt: timestamp("requested_at").defaultNow(),
  processedAt: timestamp("processed_at"),
  // PIX Transaction Receipt Fields
  endToEndId: text("end_to_end_id"), // PIX transaction identifier
  transactionHash: text("transaction_hash"), // HorsePay transaction ID
  originName: text("origin_name").default("Mania Brasil"), // Sender name
  originCnpj: text("origin_cnpj").default("62.134.421/0001-62"), // Sender CNPJ
  destinationName: text("destination_name"), // Recipient name
  destinationDocument: text("destination_document"), // Recipient CPF/CNPJ
  receiptPdf: text("receipt_pdf"), // Path to PDF file
  adminNotes: text("admin_notes"), // Admin notes
});

// Admin users table
export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(), // Hashed password
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Admin sessions table
export const adminSessions = pgTable("admin_sessions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  username: text("username").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

// Active game sessions table for tracking ongoing minigames
export const activeGameSessions = pgTable("active_game_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  gameType: text("game_type").notNull(), // 'sorte', 'mines', 'double', 'infect'
  gameId: text("game_id").notNull().unique(),
  gameState: jsonb("game_state").notNull(), // Store entire game state as JSON
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Level rewards claimed by users
export const levelRewardsClaimed = pgTable("level_rewards_claimed", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  level: integer("level").notNull(),
  reward: decimal("reward", { precision: 10, scale: 2 }).notNull(),
  claimedAt: timestamp("claimed_at").defaultNow(),
});

// Daily spins table
export const dailySpins = pgTable("daily_spins", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  prizeType: text("prize_type").notNull().default("money"), // "money" or "scratch_cards"
  scratchType: text("scratch_type"), // "pix_kit", "me_mimei_kit", "eletronicos_kit", "super_kit"
  tier: text("tier"), // "bronze", "silver", "gold", "platinum", "diamond" - track tier at time of spin
  spinDate: date("spin_date").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Tier rewards claimed table
export const tierRewardsClaimed = pgTable("tier_rewards_claimed", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  tier: text("tier").notNull(), // 'Bronze', 'Prata', 'Ouro', 'Platina', 'Diamante'
  level: integer("level").notNull(), // 2, 25, 50, 75, 100
  amount: integer("amount").notNull(), // 50, 150, 300, 500, 1000
  claimedAt: timestamp("claimed_at").notNull().defaultNow(),
});

// Support chats table
export const supportChats = pgTable("support_chats", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  status: text("status").notNull().default("active"), // active, closed
  createdAt: timestamp("created_at").defaultNow().notNull(),
  closedAt: timestamp("closed_at"),
  closedBy: text("closed_by") // user or admin
});

// Support messages table
export const supportMessages = pgTable("support_messages", {
  id: serial("id").primaryKey(),
  chatId: integer("chat_id").notNull().references(() => supportChats.id),
  senderId: integer("sender_id").notNull().references(() => users.id),
  senderType: text("sender_type").notNull(), // user or admin
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  readAt: timestamp("read_at")
});

// Affiliate support chats table
export const affiliateSupportChats = pgTable("affiliate_support_chats", {
  id: serial("id").primaryKey(),
  affiliateId: integer("affiliate_id").notNull().references(() => affiliates.id),
  status: text("status").notNull().default("active"), // active, closed
  createdAt: timestamp("created_at").defaultNow().notNull(),
  closedAt: timestamp("closed_at"),
  closedBy: text("closed_by") // affiliate or admin
});

// Affiliate support messages table
export const affiliateSupportMessages = pgTable("affiliate_support_messages", {
  id: serial("id").primaryKey(),
  chatId: integer("chat_id").notNull().references(() => affiliateSupportChats.id),
  senderId: integer("sender_id").notNull(),
  senderType: text("sender_type").notNull(), // affiliate, admin or system
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  readAt: timestamp("read_at")
});

// Referrals table - tracks who was referred by whom
export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrer_id").notNull().references(() => users.id),
  referredId: integer("referred_id").notNull().references(() => users.id),
  status: text("status").notNull().default("pending"), // pending, validated, cancelled
  validatedAt: timestamp("validated_at"), // When the referred user made their first deposit
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Referral earnings table - tracks earnings from referrals
export const referralEarnings = pgTable("referral_earnings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  referralId: integer("referral_id").notNull().references(() => referrals.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  withdrawn: boolean("withdrawn").default(false),
  withdrawnAt: timestamp("withdrawn_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Referral configuration table - stores admin settings for referral system
export const referralConfig = pgTable("referral_config", {
  id: serial("id").primaryKey(),
  paymentType: text("payment_type").notNull().default("all_deposits"), // "first_deposit" or "all_deposits"
  paymentAmount: decimal("payment_amount", { precision: 10, scale: 2 }).notNull().default("12.00"), // Fixed amount in reais
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Payment provider configuration table - stores provider settings and priority
export const paymentProviderConfig = pgTable("payment_provider_config", {
  id: serial("id").primaryKey(),
  provider: text("provider").notNull().unique(), // 'ironpay', 'orinpay', or 'horsepay'
  isPrimary: boolean("is_primary").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  apiUrl: text("api_url"),
  apiToken: text("api_token"),
  clientKey: text("client_key"), // For HorsePay authentication
  clientSecret: text("client_secret"), // For HorsePay authentication
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }), // Percentage tax rate (4.49 for IronPay)
  fixedTax: decimal("fixed_tax", { precision: 10, scale: 2 }), // Fixed tax amount (1.00 for both, 0.65 for HorsePay)
  lastHealthCheck: timestamp("last_health_check"),
  healthStatus: text("health_status").default("unknown"), // 'healthy', 'unhealthy', 'unknown'
  failureCount: integer("failure_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Game probabilities table - tracks win probabilities for each game
export const gameProbabilities = pgTable("game_probabilities", {
  id: serial("id").primaryKey(),
  gameType: text("game_type").notNull().unique(), // 'pix', 'me_mimei', 'eletronicos', 'super'
  winProbability: decimal("win_probability", { precision: 5, scale: 2 }).notNull().default('30.00'), // 0-100%
  forceWin: boolean("force_win").notNull().default(false), // Always win
  forceLose: boolean("force_lose").notNull().default(false), // Always lose
  enabled: boolean("enabled").notNull().default(true),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: text("updated_by").notNull().default('admin'),
});

// Prize probabilities table - tracks individual prize probabilities
export const prizeProbabilities = pgTable("prize_probabilities", {
  id: serial("id").primaryKey(),
  gameType: text("game_type").notNull(),
  prizeValue: text("prize_value").notNull(),
  prizeName: text("prize_name"),
  probability: decimal("probability", { precision: 10, scale: 6 }).notNull(), // 0.000000 to 100.000000
  order: integer("order").notNull().default(0), // Display order
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: text("updated_by").notNull().default('admin'),
});

// Esquilo Mania probabilities table - tracks prize probabilities for Esquilo game
export const esquiloProbabilities = pgTable("esquilo_probabilities", {
  id: serial("id").primaryKey(),
  prizeType: text("prize_type").notNull(), // 'pinecone', 'acorn', 'apple', 'ring', 'goldenacorn'
  multiplier: decimal("multiplier", { precision: 5, scale: 2 }).notNull(), // 0.3, 0.5, 0.8, 2.0, 5.0
  probability: decimal("probability", { precision: 5, scale: 2 }).notNull(), // 0.00 to 100.00
  forDemo: boolean("for_demo").notNull().default(false), // Whether this is for demo accounts
  bonusChance: decimal("bonus_chance", { precision: 5, scale: 2 }).default("10.00"), // Chance to trigger bonus mode (10%)
  bonusCostMultiplier: decimal("bonus_cost_multiplier", { precision: 5, scale: 2 }).default("20.00"), // Cost to buy bonus (20x bet amount)
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: text("updated_by").notNull().default('admin'),
});

// Esquilo Bonus Mode Multiplier Probabilities
export const esquiloBonusProbabilities = pgTable("esquilo_bonus_probabilities", {
  id: serial("id").primaryKey(),
  multiplier: decimal("multiplier", { precision: 6, scale: 2 }).notNull(), // 1.5, 2, 3, 5, 10, 20, 50, 100
  probability: decimal("probability", { precision: 5, scale: 2 }).notNull(), // 0.00 to 100.00
  forDemo: boolean("for_demo").notNull().default(false), // Whether this is for demo accounts
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: text("updated_by").notNull().default('admin'),
});

// Coupons table
export const coupons = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // Coupon code (e.g. "SORTE", "BONUS10")
  description: text("description"), // Description of the coupon
  bonusType: text("bonus_type").notNull().default("scratchCards"), // Type of bonus (scratchCards, balance, percentage)
  bonusAmount: decimal("bonus_amount", { precision: 10, scale: 2 }), // Amount or number of scratch cards
  minDeposit: decimal("min_deposit", { precision: 10, scale: 2 }).notNull().default("0"), // Minimum deposit required
  usageLimit: integer("usage_limit"), // Total usage limit (null = unlimited)
  usageCount: integer("usage_count").notNull().default(0), // Current usage count
  perUserLimit: integer("per_user_limit").notNull().default(1), // Limit per user
  isActive: boolean("is_active").notNull().default(true), // Whether coupon is active
  expiresAt: timestamp("expires_at"), // Expiration date (null = never expires)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Coupon uses table - tracks who used which coupon
export const couponUses = pgTable("coupon_uses", {
  id: serial("id").primaryKey(),
  couponId: integer("coupon_id").references(() => coupons.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  depositId: integer("deposit_id").references(() => deposits.id), // Which deposit triggered the coupon
  usedAt: timestamp("used_at").defaultNow(),
});

// Site accesses table - tracks all visits to the site
export const siteAccesses = pgTable("site_accesses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id), // null if visitor
  ipAddress: text("ip_address").notNull(),
  userAgent: text("user_agent").notNull(),
  deviceType: text("device_type").notNull(), // mobile, desktop, tablet
  operatingSystem: text("operating_system").notNull(), // android, ios, windows, mac, linux
  browser: text("browser"),
  country: text("country"),
  city: text("city"),
  region: text("region"),
  pageUrl: text("page_url").notNull(),
  referrer: text("referrer"),
  isRegistered: boolean("is_registered").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Affiliates table with complete features
export const affiliates = pgTable("affiliates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }),
  password: varchar("password", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  partnerInviteCode: varchar("partner_invite_code", { length: 6 }).unique(), // Unique partner invite code (2 numbers + 4 letters)
  pixKeyType: varchar("pix_key_type", { length: 20 }), // cpf, cnpj, email, phone, random
  pixKey: varchar("pix_key", { length: 255 }), // The actual PIX key value
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).default("10.00"),
  affiliateLevel: varchar("affiliate_level", { length: 20 }).default("bronze"), // bronze, silver, gold, platinum, diamond, special
  currentLevelRate: decimal("current_level_rate", { precision: 5, scale: 2 }).default("40.00"), // Current level commission rate
  approvedEarnings: decimal("approved_earnings", { precision: 10, scale: 2 }).default("0.00"), // Total approved earnings for level calculation
  commissionType: varchar("commission_type", { length: 20 }).default("percentage"), // percentage or fixed
  fixedCommissionAmount: decimal("fixed_commission_amount", { precision: 10, scale: 2 }).default("6.00"), // Fixed amount per deposit
  customCommissionRate: decimal("custom_commission_rate", { precision: 5, scale: 2 }), // Custom rate for special tier
  customFixedAmount: decimal("custom_fixed_amount", { precision: 10, scale: 2 }), // Custom fixed amount for special tier
  totalEarnings: decimal("total_earnings", { precision: 10, scale: 2 }).default("0.00"),
  pendingEarnings: decimal("pending_earnings", { precision: 10, scale: 2 }).default("0.00"),
  totalClicks: integer("total_clicks").default(0),
  totalRegistrations: integer("total_registrations").default(0),
  totalDeposits: integer("total_deposits").default(0),
  avatar: varchar("avatar", { length: 100 }).default("avatar1"), // avatar1 to avatar10
  createdAt: timestamp("created_at").defaultNow(),
  isActive: boolean("is_active").default(true)
});

// Affiliate codes table - stores individual referral codes for each affiliate
export const affiliateCodes = pgTable("affiliate_codes", {
  id: serial("id").primaryKey(),
  affiliateId: integer("affiliate_id").references(() => affiliates.id).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }), // Optional name for the code
  facebookPixelId: varchar("facebook_pixel_id", { length: 50 }), // Facebook Pixel ID for tracking
  totalClicks: integer("total_clicks").default(0),
  totalRegistrations: integer("total_registrations").default(0),
  totalDeposits: integer("total_deposits").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Affiliates Wallet table - Professional balance management
export const affiliatesWallet = pgTable("affiliates_wallet", {
  id: serial("id").primaryKey(),
  affiliateId: integer("affiliate_id").references(() => affiliates.id).notNull().unique(),
  balance: decimal("balance", { precision: 10, scale: 2 }).default("0.00").notNull(),
  totalEarned: decimal("total_earned", { precision: 10, scale: 2 }).default("0.00").notNull(),
  totalWithdrawn: decimal("total_withdrawn", { precision: 10, scale: 2 }).default("0.00").notNull(),
  lastTransactionAt: timestamp("last_transaction_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wallet transaction types enum
export const walletTransactionTypeEnum = pgEnum("wallet_transaction_type", [
  "commission", // Commission from deposit
  "withdrawal", // Withdrawal request
  "adjustment", // Manual adjustment by admin
  "refund", // Refund of commission
  "bonus" // Bonus payment
]);

// Wallet transaction status enum
export const walletTransactionStatusEnum = pgEnum("wallet_transaction_status", [
  "pending",
  "completed",
  "cancelled",
  "failed"
]);

// Affiliates Wallet Transactions - Track all balance movements
export const affiliatesWalletTransactions = pgTable("affiliates_wallet_transactions", {
  id: serial("id").primaryKey(),
  walletId: integer("wallet_id").references(() => affiliatesWallet.id).notNull(),
  affiliateId: integer("affiliate_id").references(() => affiliates.id).notNull(),
  type: walletTransactionTypeEnum("type").notNull(),
  status: walletTransactionStatusEnum("status").notNull().default("pending"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  balanceBefore: decimal("balance_before", { precision: 10, scale: 2 }).notNull(),
  balanceAfter: decimal("balance_after", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  referenceId: integer("reference_id"), // ID of related deposit, withdrawal, etc
  referenceType: text("reference_type"), // 'deposit', 'withdrawal', etc
  metadata: jsonb("metadata"), // Additional data like deposit details, user info
  createdAt: timestamp("created_at").defaultNow(),
  processedAt: timestamp("processed_at"),
});

// Affiliate clicks tracking
export const affiliateClicks = pgTable("affiliate_clicks", {
  id: serial("id").primaryKey(),
  affiliateId: integer("affiliate_id").references(() => affiliates.id),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  referrerUrl: text("referrer_url"),
  clickedAt: timestamp("clicked_at").defaultNow()
});

// Affiliate conversions tracking
export const affiliateConversions = pgTable("affiliate_conversions", {
  id: serial("id").primaryKey(),
  affiliateId: integer("affiliate_id").references(() => affiliates.id),
  influencerId: integer("influencer_id"),
  userId: integer("user_id").references(() => users.id),
  partnerId: integer("partner_id").references(() => partners.id), // Track which partner generated this conversion
  conversionType: varchar("conversion_type", { length: 20 }).notNull(), // 'registration' or 'deposit'
  conversionValue: decimal("conversion_value", { precision: 10, scale: 2 }),
  commission: decimal("commission", { precision: 10, scale: 2 }),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }), // Store the rate used at conversion time
  status: varchar("status", { length: 20 }).default("pending"), // pending, approved, paid, cancelled
  createdAt: timestamp("created_at").defaultNow()
});

// Affiliate tier commission configuration
export const affiliateTierConfig = pgTable("affiliate_tier_config", {
  id: serial("id").primaryKey(),
  tier: varchar("tier", { length: 20 }).notNull().unique(), // bronze, silver, gold, platinum, diamond, special
  percentageRate: decimal("percentage_rate", { precision: 5, scale: 2 }).notNull(), // Percentage rate for this tier
  fixedAmount: decimal("fixed_amount", { precision: 10, scale: 2 }).notNull(), // Fixed amount for this tier
  minEarnings: decimal("min_earnings", { precision: 10, scale: 2 }).default("0.00"), // Minimum earnings to reach this tier
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Affiliate withdrawals - Sistema de saques dos afiliados
export const affiliatesWithdrawals = pgTable("affiliates_withdrawals", {
  id: serial("id").primaryKey(),
  affiliateId: integer("affiliate_id").references(() => affiliates.id).notNull(),
  displayId: integer("display_id").notNull().unique(), // 5-digit display ID
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  pixKey: varchar("pix_key", { length: 255 }).notNull(),
  pixKeyType: varchar("pix_key_type", { length: 20 }), // cpf, email, phone, random
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, processing, completed, rejected
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
  endToEndId: varchar("end_to_end_id", { length: 255 }), // HorsePay end-to-end ID
  adminNotes: text("admin_notes"),
  rejectionReason: text("rejection_reason")
});

// Legacy - mantém para compatibilidade
export const affiliatePayouts = pgTable("affiliate_payouts", {
  id: serial("id").primaryKey(),
  affiliateId: integer("affiliate_id").references(() => affiliates.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  pixKey: varchar("pix_key", { length: 255 }),
  status: varchar("status", { length: 20 }).default("pending"), // pending, processing, completed, failed
  requestedAt: timestamp("requested_at").defaultNow(),
  processedAt: timestamp("processed_at"),
  notes: text("notes")
});

// Partners (Sub-affiliates) table - Parceiros dos afiliados
export const partners = pgTable("partners", {
  id: serial("id").primaryKey(),
  affiliateId: integer("affiliate_id").references(() => affiliates.id).notNull(), // Affiliate who owns this partner
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }),
  password: varchar("password", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  pixKeyType: varchar("pix_key_type", { length: 20 }), // cpf, cnpj, email, phone, random
  pixKey: varchar("pix_key", { length: 255 }), // The actual PIX key value
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).default("5.00"), // Partner's commission rate
  commissionType: varchar("commission_type", { length: 20 }).default("percentage"), // percentage or fixed (inherited from affiliate)
  fixedCommissionAmount: decimal("fixed_commission_amount", { precision: 10, scale: 2 }).default("3.00"), // Fixed amount per deposit
  totalEarnings: decimal("total_earnings", { precision: 10, scale: 2 }).default("0.00"),
  pendingEarnings: decimal("pending_earnings", { precision: 10, scale: 2 }).default("0.00"),
  approvedEarnings: decimal("approved_earnings", { precision: 10, scale: 2 }).default("0.00"),
  totalClicks: integer("total_clicks").default(0),
  totalRegistrations: integer("total_registrations").default(0),
  totalDeposits: integer("total_deposits").default(0),
  avatar: varchar("avatar", { length: 100 }).default("avatar1"),
  rememberToken: varchar("remember_token", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  isActive: boolean("is_active").default(true),
  blockedAt: timestamp("blocked_at"),
  blockedReason: text("blocked_reason")
});

// Partner codes table - stores individual referral codes for each partner
export const partnerCodes = pgTable("partner_codes", {
  id: serial("id").primaryKey(),
  partnerId: integer("partner_id").references(() => partners.id).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }), // Optional name for the code
  clickCount: integer("click_count").default(0),
  registrationCount: integer("registration_count").default(0),
  depositCount: integer("deposit_count").default(0),
  totalRevenue: numeric("total_revenue", { precision: 15, scale: 2 }).default("0"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Partners Wallet table - Professional balance management
export const partnersWallet = pgTable("partners_wallet", {
  id: serial("id").primaryKey(),
  partnerId: integer("partner_id").references(() => partners.id).notNull().unique(),
  balance: decimal("balance", { precision: 10, scale: 2 }).default("0.00").notNull(),
  totalEarned: decimal("total_earned", { precision: 10, scale: 2 }).default("0.00").notNull(),
  totalWithdrawn: decimal("total_withdrawn", { precision: 10, scale: 2 }).default("0.00").notNull(),
  lastTransactionAt: timestamp("last_transaction_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Partners Wallet Transactions - Track all balance movements
export const partnersWalletTransactions = pgTable("partners_wallet_transactions", {
  id: serial("id").primaryKey(),
  walletId: integer("wallet_id").references(() => partnersWallet.id).notNull(),
  partnerId: integer("partner_id").references(() => partners.id).notNull(),
  type: walletTransactionTypeEnum("type").notNull(),
  status: walletTransactionStatusEnum("status").notNull().default("pending"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  balanceBefore: decimal("balance_before", { precision: 10, scale: 2 }).notNull(),
  balanceAfter: decimal("balance_after", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  referenceId: integer("reference_id"), // ID of related deposit, withdrawal, etc
  referenceType: text("reference_type"), // 'deposit', 'withdrawal', etc
  metadata: jsonb("metadata"), // Additional data like deposit details, user info
  createdAt: timestamp("created_at").defaultNow(),
  processedAt: timestamp("processed_at"),
});

// Partner clicks tracking
export const partnerClicks = pgTable("partner_clicks", {
  id: serial("id").primaryKey(),
  partnerId: integer("partner_id").references(() => partners.id),
  code: varchar("code", { length: 50 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  referrer: text("referrer"),
  landingPage: text("landing_page"),
  createdAt: timestamp("created_at").defaultNow()
});

// Partner conversions tracking
export const partnerConversions = pgTable("partner_conversions", {
  id: serial("id").primaryKey(),
  partnerId: integer("partner_id").references(() => partners.id),
  affiliateId: integer("affiliate_id").references(() => affiliates.id), // Parent affiliate
  userId: integer("user_id").references(() => users.id),
  type: varchar("type", { length: 50 }).notNull().default("commission"), // Type of conversion
  conversionType: varchar("conversion_type", { length: 20 }).notNull(), // 'registration' or 'deposit'
  conversionValue: decimal("conversion_value", { precision: 10, scale: 2 }),
  partnerCommission: decimal("partner_commission", { precision: 10, scale: 2 }), // Partner's commission
  affiliateCommission: decimal("affiliate_commission", { precision: 10, scale: 2 }), // Affiliate's remaining commission
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }), // Partner's rate
  commissionType: varchar("commission_type", { length: 20 }).default("percentage"), // 'fixed' or 'percentage' - stored historically
  status: varchar("status", { length: 20 }).default("pending"), // pending, approved, paid, cancelled
  createdAt: timestamp("created_at").defaultNow()
});

// Partner withdrawals - Sistema de saques dos parceiros
export const partnersWithdrawals = pgTable("partners_withdrawals", {
  id: serial("id").primaryKey(),
  partnerId: integer("partner_id").references(() => partners.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  pixKey: varchar("pix_key", { length: 255 }).notNull(),
  pixKeyType: varchar("pix_key_type", { length: 20 }), // cpf, email, phone, random
  status: varchar("status", { length: 20 }).default("pending").notNull(), // pending, processing, completed, rejected
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
  endToEndId: varchar("end_to_end_id", { length: 255 }), // HorsePay end-to-end ID
  adminNotes: text("admin_notes"),
  rejectionReason: text("rejection_reason")
});

// Marketing tracking links
export const marketingLinks = pgTable("marketing_links", {
  id: serial("id").primaryKey(),
  affiliateId: integer("affiliate_id").references(() => affiliates.id),
  partnerId: integer("partner_id").references(() => partners.id),
  linkName: text("link_name").notNull(), // Nome do link
  customPath: text("custom_path").unique(), // Custom path for short URL
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  utmContent: text("utm_content"),
  utmTerm: text("utm_term"),
  facebookPixelId: text("facebook_pixel_id"), // Facebook Pixel ID for tracking
  isActive: boolean("is_active").default(true),
  count: integer("count").default(0), // Click count
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Marketing link clicks tracking
export const marketingClicks = pgTable("marketing_clicks", {
  id: serial("id").primaryKey(),
  marketingLinkId: integer("marketing_link_id").references(() => marketingLinks.id).notNull(),
  ip: text("ip"),
  userAgent: text("user_agent"),
  referrer: text("referrer"),
  deviceType: text("device_type"), // mobile, desktop, tablet
  os: text("os"),
  browser: text("browser"),
  city: text("city"),
  country: text("country"),
  clickedAt: timestamp("clicked_at").defaultNow(),
});

// Marketing link conversions (registrations)
export const marketingConversions = pgTable("marketing_conversions", {
  id: serial("id").primaryKey(),
  marketingLinkId: integer("marketing_link_id").references(() => marketingLinks.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  registeredAt: timestamp("registered_at").defaultNow(),
  firstDepositAt: timestamp("first_deposit_at"),
  firstDepositAmount: decimal("first_deposit_amount", { precision: 10, scale: 2 }),
  totalDeposited: decimal("total_deposited", { precision: 10, scale: 2 }).default("0.00"),
  totalWagered: decimal("total_wagered", { precision: 10, scale: 2 }).default("0.00"),
});

// Daily cashback table
export const dailyCashback = pgTable("daily_cashback", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  calculationDate: date("calculation_date").notNull(), // The day being calculated
  tier: text("tier").notNull(), // bronze, silver, gold, platinum, diamond
  cashbackPercentage: decimal("cashback_percentage", { precision: 5, scale: 2 }).notNull(), // 1.5, 3, 6, 12, 24
  totalDeposits: decimal("total_deposits", { precision: 10, scale: 2 }).notNull(),
  totalWithdrawals: decimal("total_withdrawals", { precision: 10, scale: 2 }).notNull(),
  currentBalance: decimal("current_balance", { precision: 10, scale: 2 }).notNull(),
  netLoss: decimal("net_loss", { precision: 10, scale: 2 }).notNull(), // deposits - (withdrawals + balance)
  cashbackAmount: decimal("cashback_amount", { precision: 10, scale: 2 }).notNull(), // Actual cashback credited
  status: text("status").notNull().default("pending"), // pending, credited, failed
  creditedAt: timestamp("credited_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  wallet: one(wallets, {
    fields: [users.id],
    references: [wallets.userId],
  }),
  games: many(games),
  gamePremios: many(gamePremios),
  deposits: many(deposits),
  withdrawals: many(withdrawals),
  dailySpins: many(dailySpins),
  supportChats: many(supportChats),
  supportMessages: many(supportMessages),
  referralsMade: many(referrals, { relationName: "referrer" }),
  referralsReceived: many(referrals, { relationName: "referred" }),
  referralEarnings: many(referralEarnings),
  couponUses: many(couponUses),
  siteAccesses: many(siteAccesses),
  dailyCashbacks: many(dailyCashback),
}));

export const walletsRelations = relations(wallets, ({ one }) => ({
  user: one(users, {
    fields: [wallets.userId],
    references: [users.id],
  }),
}));

export const gamesRelations = relations(games, ({ one }) => ({
  user: one(users, {
    fields: [games.userId],
    references: [users.id],
  }),
}));



export const gamePremiosRelations = relations(gamePremios, ({ one }) => ({
  user: one(users, {
    fields: [gamePremios.userId],
    references: [users.id],
  }),
}));

export const depositsRelations = relations(deposits, ({ one }) => ({
  user: one(users, {
    fields: [deposits.userId],
    references: [users.id],
  }),
}));

export const withdrawalsRelations = relations(withdrawals, ({ one }) => ({
  user: one(users, {
    fields: [withdrawals.userId],
    references: [users.id],
  }),
}));

export const activeGameSessionsRelations = relations(activeGameSessions, ({ one }) => ({
  user: one(users, {
    fields: [activeGameSessions.userId],
    references: [users.id],
  }),
}));

export const supportChatsRelations = relations(supportChats, ({ one, many }) => ({
  user: one(users, {
    fields: [supportChats.userId],
    references: [users.id],
  }),
  messages: many(supportMessages),
}));

export const supportMessagesRelations = relations(supportMessages, ({ one }) => ({
  chat: one(supportChats, {
    fields: [supportMessages.chatId],
    references: [supportChats.id],
  }),
  sender: one(users, {
    fields: [supportMessages.senderId],
    references: [users.id],
  }),
}));

export const referralsRelations = relations(referrals, ({ one, many }) => ({
  referrer: one(users, {
    fields: [referrals.referrerId],
    references: [users.id],
    relationName: "referrer",
  }),
  referred: one(users, {
    fields: [referrals.referredId],
    references: [users.id],
    relationName: "referred",
  }),
  earnings: many(referralEarnings),
}));

export const referralEarningsRelations = relations(referralEarnings, ({ one }) => ({
  user: one(users, {
    fields: [referralEarnings.userId],
    references: [users.id],
  }),
  referral: one(referrals, {
    fields: [referralEarnings.referralId],
    references: [referrals.id],
  }),
}));

// Support types
export const insertSupportChatSchema = createInsertSchema(supportChats);
export type InsertSupportChat = z.infer<typeof insertSupportChatSchema>;
export type SupportChat = typeof supportChats.$inferSelect;

export const insertSupportMessageSchema = createInsertSchema(supportMessages);
export type InsertSupportMessage = z.infer<typeof insertSupportMessageSchema>;
export type SupportMessage = typeof supportMessages.$inferSelect;

export const insertAffiliateSupportChatSchema = createInsertSchema(affiliateSupportChats);
export type InsertAffiliateSupportChat = z.infer<typeof insertAffiliateSupportChatSchema>;
export type AffiliateSupportChat = typeof affiliateSupportChats.$inferSelect;

export const insertAffiliateSupportMessageSchema = createInsertSchema(affiliateSupportMessages);
export type InsertAffiliateSupportMessage = z.infer<typeof insertAffiliateSupportMessageSchema>;
export type AffiliateSupportMessage = typeof affiliateSupportMessages.$inferSelect;

export const levelRewardsClaimedRelations = relations(levelRewardsClaimed, ({ one }) => ({
  user: one(users, {
    fields: [levelRewardsClaimed.userId],
    references: [users.id],
  }),
}));

export const dailyCashbackRelations = relations(dailyCashback, ({ one }) => ({
  user: one(users, {
    fields: [dailyCashback.userId],
    references: [users.id],
  }),
}));

export const dailySpinsRelations = relations(dailySpins, ({ one }) => ({
  user: one(users, {
    fields: [dailySpins.userId],
    references: [users.id],
  }),
}));

export const tierRewardsClaimedRelations = relations(tierRewardsClaimed, ({ one }) => ({
  user: one(users, {
    fields: [tierRewardsClaimed.userId],
    references: [users.id],
  }),
}));

export const couponsRelations = relations(coupons, ({ many }) => ({
  uses: many(couponUses),
}));

export const couponUsesRelations = relations(couponUses, ({ one }) => ({
  coupon: one(coupons, {
    fields: [couponUses.couponId],
    references: [coupons.id],
  }),
  user: one(users, {
    fields: [couponUses.userId],
    references: [users.id],
  }),
  deposit: one(deposits, {
    fields: [couponUses.depositId],
    references: [deposits.id],
  }),
}));

export const siteAccessesRelations = relations(siteAccesses, ({ one }) => ({
  user: one(users, {
    fields: [siteAccesses.userId],
    references: [users.id],
  }),
}));

// Zod schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWalletSchema = createInsertSchema(wallets).omit({
  id: true,
  lastUpdated: true,
});

export const insertGameSchema = createInsertSchema(games).omit({
  id: true,
  playedAt: true,
});



export const insertGamePremioSchema = createInsertSchema(gamePremios).omit({
  id: true,
  playedAt: true,
});

export const insertDepositSchema = createInsertSchema(deposits).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertWithdrawalSchema = createInsertSchema(withdrawals).omit({
  id: true,
  requestedAt: true,
  processedAt: true,
});

export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertActiveGameSessionSchema = createInsertSchema(activeGameSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLevelRewardClaimedSchema = createInsertSchema(levelRewardsClaimed).omit({
  id: true,
  claimedAt: true,
});

export const insertDailySpinSchema = createInsertSchema(dailySpins).omit({
  id: true,
  spinDate: true,
  createdAt: true,
});

export const insertTierRewardClaimedSchema = createInsertSchema(tierRewardsClaimed).omit({
  id: true,
  claimedAt: true,
});

export const insertReferralSchema = createInsertSchema(referrals).omit({
  id: true,
  createdAt: true,
  validatedAt: true,
});

export const insertReferralEarningSchema = createInsertSchema(referralEarnings).omit({
  id: true,
  createdAt: true,
  withdrawnAt: true,
});

export const insertGameProbabilitySchema = createInsertSchema(gameProbabilities).omit({
  id: true,
  updatedAt: true,
});

export const insertCouponSchema = createInsertSchema(coupons).omit({
  id: true,
  usageCount: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCouponUseSchema = createInsertSchema(couponUses).omit({
  id: true,
  usedAt: true,
});

export const insertSiteAccessSchema = createInsertSchema(siteAccesses).omit({
  id: true,
  createdAt: true,
});

export const insertAffiliatesWalletSchema = createInsertSchema(affiliatesWallet).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastTransactionAt: true,
});

export const insertAffiliatesWalletTransactionSchema = createInsertSchema(affiliatesWalletTransactions).omit({
  id: true,
  createdAt: true,
  processedAt: true,
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const registerSchema = insertUserSchema;

export const adminLoginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type ReferralConfig = typeof referralConfig.$inferSelect;
export type Wallet = typeof wallets.$inferSelect;
export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type Game = typeof games.$inferSelect;
export type InsertGame = z.infer<typeof insertGameSchema>;

export type GamePremio = typeof gamePremios.$inferSelect;
export type InsertGamePremio = z.infer<typeof insertGamePremioSchema>;
export type Deposit = typeof deposits.$inferSelect;
export type InsertDeposit = z.infer<typeof insertDepositSchema>;
export type Withdrawal = typeof withdrawals.$inferSelect;
export type InsertWithdrawal = z.infer<typeof insertWithdrawalSchema>;
export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type AdminSession = typeof adminSessions.$inferSelect;
export type ActiveGameSession = typeof activeGameSessions.$inferSelect;
export type InsertActiveGameSession = z.infer<typeof insertActiveGameSessionSchema>;
export type LevelRewardClaimed = typeof levelRewardsClaimed.$inferSelect;
export type InsertLevelRewardClaimed = z.infer<typeof insertLevelRewardClaimedSchema>;
export type DailySpin = typeof dailySpins.$inferSelect;
export type InsertDailySpin = z.infer<typeof insertDailySpinSchema>;
export type TierRewardClaimed = typeof tierRewardsClaimed.$inferSelect;
export type InsertTierRewardClaimed = z.infer<typeof insertTierRewardClaimedSchema>;
export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type ReferralEarning = typeof referralEarnings.$inferSelect;
export type InsertReferralEarning = z.infer<typeof insertReferralEarningSchema>;
export type GameProbability = typeof gameProbabilities.$inferSelect;
export type InsertGameProbability = z.infer<typeof insertGameProbabilitySchema>;
export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = z.infer<typeof insertCouponSchema>;
export type CouponUse = typeof couponUses.$inferSelect;
export type InsertCouponUse = z.infer<typeof insertCouponUseSchema>;
export type SiteAccess = typeof siteAccesses.$inferSelect;
export type InsertSiteAccess = z.infer<typeof insertSiteAccessSchema>;
export type AffiliatesWallet = typeof affiliatesWallet.$inferSelect;
export type InsertAffiliatesWallet = z.infer<typeof insertAffiliatesWalletSchema>;
export type AffiliatesWalletTransaction = typeof affiliatesWalletTransactions.$inferSelect;
export type InsertAffiliatesWalletTransaction = z.infer<typeof insertAffiliatesWalletTransactionSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;
export type AdminLoginData = z.infer<typeof adminLoginSchema>;
export type DailyCashback = typeof dailyCashback.$inferSelect;

// Daily cashback insert schema
export const insertDailyCashbackSchema = createInsertSchema(dailyCashback).omit({
  id: true,
  createdAt: true,
  creditedAt: true,
});
export type InsertDailyCashback = z.infer<typeof insertDailyCashbackSchema>;

// Esquilo probabilities types
export type EsquiloProbability = typeof esquiloProbabilities.$inferSelect;
export const insertEsquiloProbabilitySchema = createInsertSchema(esquiloProbabilities).omit({
  id: true,
  updatedAt: true,
});
export type InsertEsquiloProbability = z.infer<typeof insertEsquiloProbabilitySchema>;

// Esquilo bonus probabilities types
export type EsquiloBonusProbability = typeof esquiloBonusProbabilities.$inferSelect;
export const insertEsquiloBonusProbabilitySchema = createInsertSchema(esquiloBonusProbabilities).omit({
  id: true,
  updatedAt: true,
});
export type InsertEsquiloBonusProbability = z.infer<typeof insertEsquiloBonusProbabilitySchema>;

// Payment audit logs table
export const paymentAuditLogs = pgTable("payment_audit_logs", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").references(() => adminUsers.id),
  adminUsername: varchar("admin_username", { length: 255 }),
  withdrawalId: integer("withdrawal_id").references(() => withdrawals.id),
  userId: integer("user_id").references(() => users.id),
  amount: varchar("amount", { length: 50 }),
  pixKey: varchar("pix_key", { length: 255 }),
  pixKeyType: varchar("pix_key_type", { length: 50 }),
  action: varchar("action", { length: 50 }), // 'approve', 'reject', 'process_payment'
  status: varchar("status", { length: 50 }), // 'success', 'failed'
  errorMessage: text("error_message"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  ironpayTransactionId: varchar("ironpay_transaction_id", { length: 255 }),
  ironpayResponse: jsonb("ironpay_response"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPaymentAuditLogSchema = createInsertSchema(paymentAuditLogs).omit({
  id: true,
  createdAt: true,
});
export type PaymentAuditLog = typeof paymentAuditLogs.$inferSelect;
export type InsertPaymentAuditLog = z.infer<typeof insertPaymentAuditLogSchema>;

// Esquilo Games History table
export const esquiloGames = pgTable("esquilo_games", {
  id: serial("id").primaryKey(),
  gameId: varchar("game_id", { length: 20 }).notNull().unique(),
  userId: integer("user_id").references(() => users.id).notNull(),
  betAmount: decimal("bet_amount", { precision: 10, scale: 2 }).notNull(),
  finalMultiplier: decimal("final_multiplier", { precision: 10, scale: 2 }).default("0.00"),
  winAmount: decimal("win_amount", { precision: 10, scale: 2 }).default("0.00"),
  usedBonus: boolean("used_bonus").default(false),
  status: varchar("status", { length: 20 }).notNull(), // 'playing', 'won', 'lost', 'cashed_out'
  boxes: jsonb("boxes").notNull(), // All box data including positions, multipliers, types
  openedBoxes: jsonb("opened_boxes").notNull(), // Array of opened box IDs
  bonusActivated: boolean("bonus_activated").default(false),
  bonusMultipliers: jsonb("bonus_multipliers"), // Bonus chest multipliers if bonus was activated
  bonusWinnerMultiplier: decimal("bonus_winner_multiplier", { precision: 10, scale: 2 }),
  activeBonusMultiplier: decimal("active_bonus_multiplier", { precision: 10, scale: 2 }),
  startedAt: timestamp("started_at").notNull(),
  completedAt: timestamp("completed_at"),
});

// Esquilo Game States table (for active/paused games)
export const esquiloGameStates = pgTable("esquilo_game_states", {
  id: serial("id").primaryKey(),
  gameId: varchar("game_id", { length: 20 }).notNull().unique(),
  userId: integer("user_id").references(() => users.id).notNull(),
  betAmount: decimal("bet_amount", { precision: 10, scale: 2 }).notNull(),
  currentMultiplier: decimal("current_multiplier", { precision: 10, scale: 2 }).default("0.00"),
  usedBonus: boolean("used_bonus").default(false),
  isActive: boolean("is_active").default(true),
  boxes: jsonb("boxes").notNull(), // All box data
  openedBoxes: jsonb("opened_boxes").notNull(), // Array of opened box IDs
  bonusActivated: boolean("bonus_activated").default(false),
  bonusUsed: boolean("bonus_used").default(false),
  bonusMultipliers: jsonb("bonus_multipliers"), // Bonus chest multipliers
  bonusWinnerMultiplier: decimal("bonus_winner_multiplier", { precision: 10, scale: 2 }),
  activeBonusMultiplier: decimal("active_bonus_multiplier", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Esquilo Games types
export type EsquiloGame = typeof esquiloGames.$inferSelect;
export const insertEsquiloGameSchema = createInsertSchema(esquiloGames).omit({
  id: true,
});
export type InsertEsquiloGame = z.infer<typeof insertEsquiloGameSchema>;

// Esquilo Game States types
export type EsquiloGameState = typeof esquiloGameStates.$inferSelect;
export const insertEsquiloGameStateSchema = createInsertSchema(esquiloGameStates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertEsquiloGameState = z.infer<typeof insertEsquiloGameStateSchema>;

// Discord webhook configuration table
export const discordWebhooks = pgTable("discord_webhooks", {
  id: serial("id").primaryKey(),
  webhookType: varchar("webhook_type", { length: 50 }).notNull(), // 'new_user', 'deposit_pending', 'deposit_paid', 'withdrawal', 'support'
  webhookUrl: text("webhook_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDiscordWebhookSchema = createInsertSchema(discordWebhooks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type DiscordWebhook = typeof discordWebhooks.$inferSelect;

// Partner types
export type Partner = typeof partners.$inferSelect;
export type InsertPartner = typeof partners.$inferInsert;
export type PartnerCode = typeof partnerCodes.$inferSelect;
export type InsertPartnerCode = typeof partnerCodes.$inferInsert;
export type PartnersWallet = typeof partnersWallet.$inferSelect;
export type InsertPartnersWallet = typeof partnersWallet.$inferInsert;
export type PartnersWalletTransaction = typeof partnersWalletTransactions.$inferSelect;
export type InsertPartnersWalletTransaction = typeof partnersWalletTransactions.$inferInsert;
export type PartnerClick = typeof partnerClicks.$inferSelect;
export type InsertPartnerClick = typeof partnerClicks.$inferInsert;
export type PartnerConversion = typeof partnerConversions.$inferSelect;
export type InsertPartnerConversion = typeof partnerConversions.$inferInsert;
export type PartnersWithdrawal = typeof partnersWithdrawals.$inferSelect;
export type InsertPartnersWithdrawal = typeof partnersWithdrawals.$inferInsert;
export type InsertDiscordWebhook = z.infer<typeof insertDiscordWebhookSchema>;
