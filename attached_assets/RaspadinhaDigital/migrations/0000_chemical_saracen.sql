CREATE TYPE "public"."game_type" AS ENUM('pix_na_conta', 'sonho_consumo', 'me_mimei', 'super_premios', 'premio_pix_conta');--> statement-breakpoint
CREATE TYPE "public"."premio_type" AS ENUM('pix', 'me_mimei', 'eletronicos', 'super');--> statement-breakpoint
CREATE TABLE "active_game_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"game_type" text NOT NULL,
	"game_id" text NOT NULL,
	"game_state" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "active_game_sessions_game_id_unique" UNIQUE("game_id")
);
--> statement-breakpoint
CREATE TABLE "admin_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"username" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "admin_sessions_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "affiliate_clicks" (
	"id" serial PRIMARY KEY NOT NULL,
	"affiliate_id" integer,
	"ip_address" varchar(45),
	"user_agent" text,
	"referrer_url" text,
	"clicked_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "affiliate_conversions" (
	"id" serial PRIMARY KEY NOT NULL,
	"affiliate_id" integer,
	"user_id" integer,
	"type" varchar(20) NOT NULL,
	"amount" numeric(10, 2),
	"commission" numeric(10, 2),
	"status" varchar(20) DEFAULT 'pending',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "affiliate_payouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"affiliate_id" integer,
	"amount" numeric(10, 2) NOT NULL,
	"pix_key" varchar(255),
	"status" varchar(20) DEFAULT 'pending',
	"requested_at" timestamp DEFAULT now(),
	"processed_at" timestamp,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "affiliates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(20),
	"password" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"pix_key" varchar(255),
	"commission_rate" numeric(5, 2) DEFAULT '10.00',
	"total_earnings" numeric(10, 2) DEFAULT '0.00',
	"pending_earnings" numeric(10, 2) DEFAULT '0.00',
	"paid_earnings" numeric(10, 2) DEFAULT '0.00',
	"total_clicks" integer DEFAULT 0,
	"total_registrations" integer DEFAULT 0,
	"total_deposits" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"is_active" boolean DEFAULT true,
	"is_approved" boolean DEFAULT true,
	CONSTRAINT "affiliates_email_unique" UNIQUE("email"),
	CONSTRAINT "affiliates_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "coupon_uses" (
	"id" serial PRIMARY KEY NOT NULL,
	"coupon_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"deposit_id" integer,
	"used_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"bonus_type" text DEFAULT 'scratchCards' NOT NULL,
	"bonus_amount" numeric(10, 2),
	"min_deposit" numeric(10, 2) DEFAULT '0' NOT NULL,
	"usage_limit" integer,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"per_user_limit" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "coupons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "daily_spins" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"prize_type" text DEFAULT 'money' NOT NULL,
	"scratch_type" text,
	"tier" text,
	"spin_date" date DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deposits" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"display_id" integer NOT NULL,
	"transaction_id" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"pix_code" text,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	CONSTRAINT "deposits_display_id_unique" UNIQUE("display_id"),
	CONSTRAINT "deposits_transaction_id_unique" UNIQUE("transaction_id")
);
--> statement-breakpoint
CREATE TABLE "game_premios" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"display_id" integer NOT NULL,
	"game_type" "premio_type" NOT NULL,
	"cost" numeric(10, 2) NOT NULL,
	"prize" numeric(10, 2) DEFAULT '0.00',
	"result" text NOT NULL,
	"won" boolean DEFAULT false,
	"game_data" text,
	"played_at" timestamp DEFAULT now(),
	CONSTRAINT "game_premios_display_id_unique" UNIQUE("display_id")
);
--> statement-breakpoint
CREATE TABLE "game_probabilities" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_type" text NOT NULL,
	"win_probability" numeric(5, 2) DEFAULT '30.00' NOT NULL,
	"force_win" boolean DEFAULT false NOT NULL,
	"force_lose" boolean DEFAULT false NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text DEFAULT 'admin' NOT NULL,
	CONSTRAINT "game_probabilities_game_type_unique" UNIQUE("game_type")
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"game_type" "game_type" NOT NULL,
	"cost" numeric(10, 2) NOT NULL,
	"prize" numeric(10, 2) DEFAULT '0.00',
	"result" text NOT NULL,
	"won" boolean DEFAULT false,
	"game_data" text,
	"played_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "level_rewards_claimed" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"level" integer NOT NULL,
	"reward" numeric(10, 2) NOT NULL,
	"claimed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "prize_probabilities" (
	"id" serial PRIMARY KEY NOT NULL,
	"game_type" text NOT NULL,
	"prize_value" text NOT NULL,
	"prize_name" text,
	"probability" numeric(10, 6) NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text DEFAULT 'admin' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_earnings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"referral_id" integer NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"withdrawn" boolean DEFAULT false,
	"withdrawn_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" serial PRIMARY KEY NOT NULL,
	"referrer_id" integer NOT NULL,
	"referred_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"validated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_accesses" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"ip_address" text NOT NULL,
	"user_agent" text NOT NULL,
	"device_type" text NOT NULL,
	"operating_system" text NOT NULL,
	"browser" text,
	"country" text,
	"city" text,
	"region" text,
	"page_url" text NOT NULL,
	"referrer" text,
	"is_registered" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "support_chats" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"closed_at" timestamp,
	"closed_by" text
);
--> statement-breakpoint
CREATE TABLE "support_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"chat_id" integer NOT NULL,
	"sender_id" integer NOT NULL,
	"sender_type" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"read_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "tier_rewards_claimed" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"tier" text NOT NULL,
	"level" integer NOT NULL,
	"amount" integer NOT NULL,
	"claimed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"password" text NOT NULL,
	"cpf" text,
	"is_adult" boolean,
	"referral_code" text,
	"referred_by" text,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"utm_term" text,
	"utm_content" text,
	"utm_src" text,
	"landing_page" text,
	"coupon_applied" integer DEFAULT 0,
	"current_coupon" text,
	"has_first_deposit" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_cpf_unique" UNIQUE("cpf"),
	CONSTRAINT "users_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"balance" numeric(10, 2) DEFAULT '0.00',
	"scratch_bonus" integer DEFAULT 0,
	"total_wagered" numeric(10, 2) DEFAULT '0.00',
	"last_updated" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "withdrawals" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"display_id" integer NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"pix_key" text NOT NULL,
	"pix_key_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"requested_at" timestamp DEFAULT now(),
	"processed_at" timestamp,
	CONSTRAINT "withdrawals_display_id_unique" UNIQUE("display_id")
);
--> statement-breakpoint
ALTER TABLE "active_game_sessions" ADD CONSTRAINT "active_game_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_affiliate_id_affiliates_id_fk" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_conversions" ADD CONSTRAINT "affiliate_conversions_affiliate_id_affiliates_id_fk" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_conversions" ADD CONSTRAINT "affiliate_conversions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_payouts" ADD CONSTRAINT "affiliate_payouts_affiliate_id_affiliates_id_fk" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_uses" ADD CONSTRAINT "coupon_uses_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_uses" ADD CONSTRAINT "coupon_uses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_uses" ADD CONSTRAINT "coupon_uses_deposit_id_deposits_id_fk" FOREIGN KEY ("deposit_id") REFERENCES "public"."deposits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_spins" ADD CONSTRAINT "daily_spins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_premios" ADD CONSTRAINT "game_premios_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "level_rewards_claimed" ADD CONSTRAINT "level_rewards_claimed_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_earnings" ADD CONSTRAINT "referral_earnings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_earnings" ADD CONSTRAINT "referral_earnings_referral_id_referrals_id_fk" FOREIGN KEY ("referral_id") REFERENCES "public"."referrals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_users_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_id_users_id_fk" FOREIGN KEY ("referred_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_accesses" ADD CONSTRAINT "site_accesses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_chats" ADD CONSTRAINT "support_chats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_chat_id_support_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."support_chats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tier_rewards_claimed" ADD CONSTRAINT "tier_rewards_claimed_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;