--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9
-- Dumped by pg_dump version 16.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'SQL_ASCII';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: drizzle; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA drizzle;


ALTER SCHEMA drizzle OWNER TO postgres;

--
-- Name: game_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.game_type AS ENUM (
    'pix_na_conta',
    'sonho_consumo',
    'me_mimei',
    'super_premios',
    'premio_pix_conta'
);


ALTER TYPE public.game_type OWNER TO postgres;

--
-- Name: premio_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.premio_type AS ENUM (
    'pix',
    'me_mimei',
    'eletronicos',
    'super'
);


ALTER TYPE public.premio_type OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: __drizzle_migrations; Type: TABLE; Schema: drizzle; Owner: postgres
--

CREATE TABLE drizzle.__drizzle_migrations (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);


ALTER TABLE drizzle.__drizzle_migrations OWNER TO postgres;

--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE; Schema: drizzle; Owner: postgres
--

CREATE SEQUENCE drizzle.__drizzle_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNER TO postgres;

--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: drizzle; Owner: postgres
--

ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNED BY drizzle.__drizzle_migrations.id;


--
-- Name: active_game_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.active_game_sessions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    game_type text NOT NULL,
    game_id text NOT NULL,
    game_state jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.active_game_sessions OWNER TO postgres;

--
-- Name: active_game_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.active_game_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.active_game_sessions_id_seq OWNER TO postgres;

--
-- Name: active_game_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.active_game_sessions_id_seq OWNED BY public.active_game_sessions.id;


--
-- Name: admin_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_sessions (
    id integer NOT NULL,
    session_id text NOT NULL,
    username text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    expires_at timestamp without time zone NOT NULL
);


ALTER TABLE public.admin_sessions OWNER TO postgres;

--
-- Name: admin_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.admin_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.admin_sessions_id_seq OWNER TO postgres;

--
-- Name: admin_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.admin_sessions_id_seq OWNED BY public.admin_sessions.id;


--
-- Name: affiliate_clicks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.affiliate_clicks (
    id integer NOT NULL,
    affiliate_id integer,
    ip_address character varying(45),
    user_agent text,
    referrer_url text,
    clicked_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.affiliate_clicks OWNER TO postgres;

--
-- Name: affiliate_clicks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.affiliate_clicks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.affiliate_clicks_id_seq OWNER TO postgres;

--
-- Name: affiliate_clicks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.affiliate_clicks_id_seq OWNED BY public.affiliate_clicks.id;


--
-- Name: affiliate_conversions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.affiliate_conversions (
    id integer NOT NULL,
    affiliate_id integer,
    user_id integer,
    type character varying(20) NOT NULL,
    amount numeric(10,2),
    commission numeric(10,2),
    status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.affiliate_conversions OWNER TO postgres;

--
-- Name: affiliate_conversions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.affiliate_conversions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.affiliate_conversions_id_seq OWNER TO postgres;

--
-- Name: affiliate_conversions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.affiliate_conversions_id_seq OWNED BY public.affiliate_conversions.id;


--
-- Name: affiliate_payouts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.affiliate_payouts (
    id integer NOT NULL,
    affiliate_id integer,
    amount numeric(10,2) NOT NULL,
    pix_key character varying(255),
    status character varying(20) DEFAULT 'pending'::character varying,
    requested_at timestamp without time zone DEFAULT now(),
    processed_at timestamp without time zone,
    notes text
);


ALTER TABLE public.affiliate_payouts OWNER TO postgres;

--
-- Name: affiliate_payouts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.affiliate_payouts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.affiliate_payouts_id_seq OWNER TO postgres;

--
-- Name: affiliate_payouts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.affiliate_payouts_id_seq OWNED BY public.affiliate_payouts.id;


--
-- Name: affiliates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.affiliates (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    phone character varying(20),
    password character varying(255) NOT NULL,
    code character varying(50) NOT NULL,
    pix_key character varying(255),
    commission_rate numeric(5,2) DEFAULT 10.00,
    total_earnings numeric(10,2) DEFAULT 0.00,
    pending_earnings numeric(10,2) DEFAULT 0.00,
    paid_earnings numeric(10,2) DEFAULT 0.00,
    total_clicks integer DEFAULT 0,
    total_registrations integer DEFAULT 0,
    total_deposits integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    is_approved boolean DEFAULT true
);


ALTER TABLE public.affiliates OWNER TO postgres;

--
-- Name: affiliates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.affiliates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.affiliates_id_seq OWNER TO postgres;

--
-- Name: affiliates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.affiliates_id_seq OWNED BY public.affiliates.id;


--
-- Name: coupon_uses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.coupon_uses (
    id integer NOT NULL,
    coupon_id integer NOT NULL,
    user_id integer NOT NULL,
    deposit_id integer,
    used_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.coupon_uses OWNER TO postgres;

--
-- Name: coupon_uses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.coupon_uses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.coupon_uses_id_seq OWNER TO postgres;

--
-- Name: coupon_uses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.coupon_uses_id_seq OWNED BY public.coupon_uses.id;


--
-- Name: coupons; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.coupons (
    id integer NOT NULL,
    code text NOT NULL,
    description text,
    bonus_type text DEFAULT 'scratchCards'::text NOT NULL,
    bonus_amount numeric(10,2),
    min_deposit numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    usage_limit integer,
    usage_count integer DEFAULT 0 NOT NULL,
    per_user_limit integer DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.coupons OWNER TO postgres;

--
-- Name: coupons_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.coupons_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.coupons_id_seq OWNER TO postgres;

--
-- Name: coupons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.coupons_id_seq OWNED BY public.coupons.id;


--
-- Name: daily_spins; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.daily_spins (
    id integer NOT NULL,
    user_id integer NOT NULL,
    amount numeric(10,2) NOT NULL,
    prize_type text DEFAULT 'money'::text NOT NULL,
    scratch_type text,
    tier text,
    spin_date date DEFAULT now() NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.daily_spins OWNER TO postgres;

--
-- Name: daily_spins_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.daily_spins_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.daily_spins_id_seq OWNER TO postgres;

--
-- Name: daily_spins_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.daily_spins_id_seq OWNED BY public.daily_spins.id;


--
-- Name: deposits; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.deposits (
    id integer NOT NULL,
    user_id integer NOT NULL,
    display_id integer NOT NULL,
    transaction_id text NOT NULL,
    amount numeric(10,2) NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    pix_code text,
    created_at timestamp without time zone DEFAULT now(),
    completed_at timestamp without time zone
);


ALTER TABLE public.deposits OWNER TO postgres;

--
-- Name: deposits_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.deposits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.deposits_id_seq OWNER TO postgres;

--
-- Name: deposits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.deposits_id_seq OWNED BY public.deposits.id;


--
-- Name: game_premios; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.game_premios (
    id integer NOT NULL,
    user_id integer NOT NULL,
    display_id integer NOT NULL,
    game_type public.premio_type NOT NULL,
    cost numeric(10,2) NOT NULL,
    prize numeric(10,2) DEFAULT 0.00,
    result text NOT NULL,
    won boolean DEFAULT false,
    game_data text,
    played_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.game_premios OWNER TO postgres;

--
-- Name: game_premios_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.game_premios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.game_premios_id_seq OWNER TO postgres;

--
-- Name: game_premios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.game_premios_id_seq OWNED BY public.game_premios.id;


--
-- Name: game_probabilities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.game_probabilities (
    id integer NOT NULL,
    game_type text NOT NULL,
    win_probability numeric(5,2) DEFAULT 30.00 NOT NULL,
    force_win boolean DEFAULT false NOT NULL,
    force_lose boolean DEFAULT false NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_by text DEFAULT 'admin'::text NOT NULL
);


ALTER TABLE public.game_probabilities OWNER TO postgres;

--
-- Name: game_probabilities_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.game_probabilities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.game_probabilities_id_seq OWNER TO postgres;

--
-- Name: game_probabilities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.game_probabilities_id_seq OWNED BY public.game_probabilities.id;


--
-- Name: games; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.games (
    id integer NOT NULL,
    user_id integer NOT NULL,
    game_type public.game_type NOT NULL,
    cost numeric(10,2) NOT NULL,
    prize numeric(10,2) DEFAULT 0.00,
    result text NOT NULL,
    won boolean DEFAULT false,
    game_data text,
    played_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.games OWNER TO postgres;

--
-- Name: games_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.games_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.games_id_seq OWNER TO postgres;

--
-- Name: games_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.games_id_seq OWNED BY public.games.id;


--
-- Name: level_rewards_claimed; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.level_rewards_claimed (
    id integer NOT NULL,
    user_id integer NOT NULL,
    level integer NOT NULL,
    reward numeric(10,2) NOT NULL,
    claimed_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.level_rewards_claimed OWNER TO postgres;

--
-- Name: level_rewards_claimed_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.level_rewards_claimed_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.level_rewards_claimed_id_seq OWNER TO postgres;

--
-- Name: level_rewards_claimed_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.level_rewards_claimed_id_seq OWNED BY public.level_rewards_claimed.id;


--
-- Name: prize_probabilities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.prize_probabilities (
    id integer NOT NULL,
    game_type text NOT NULL,
    prize_value text NOT NULL,
    prize_name text,
    probability numeric(10,6) NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_by text DEFAULT 'admin'::text NOT NULL
);


ALTER TABLE public.prize_probabilities OWNER TO postgres;

--
-- Name: prize_probabilities_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.prize_probabilities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.prize_probabilities_id_seq OWNER TO postgres;

--
-- Name: prize_probabilities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.prize_probabilities_id_seq OWNED BY public.prize_probabilities.id;


--
-- Name: referral_earnings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.referral_earnings (
    id integer NOT NULL,
    user_id integer NOT NULL,
    referral_id integer NOT NULL,
    amount numeric(10,2) NOT NULL,
    withdrawn boolean DEFAULT false,
    withdrawn_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.referral_earnings OWNER TO postgres;

--
-- Name: referral_earnings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.referral_earnings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.referral_earnings_id_seq OWNER TO postgres;

--
-- Name: referral_earnings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.referral_earnings_id_seq OWNED BY public.referral_earnings.id;


--
-- Name: referrals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.referrals (
    id integer NOT NULL,
    referrer_id integer NOT NULL,
    referred_id integer NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    validated_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.referrals OWNER TO postgres;

--
-- Name: referrals_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.referrals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.referrals_id_seq OWNER TO postgres;

--
-- Name: referrals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.referrals_id_seq OWNED BY public.referrals.id;


--
-- Name: site_accesses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.site_accesses (
    id integer NOT NULL,
    user_id integer,
    ip_address text NOT NULL,
    user_agent text NOT NULL,
    device_type text NOT NULL,
    operating_system text NOT NULL,
    browser text,
    country text,
    city text,
    region text,
    page_url text NOT NULL,
    referrer text,
    is_registered boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.site_accesses OWNER TO postgres;

--
-- Name: site_accesses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.site_accesses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.site_accesses_id_seq OWNER TO postgres;

--
-- Name: site_accesses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.site_accesses_id_seq OWNED BY public.site_accesses.id;


--
-- Name: support_chats; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.support_chats (
    id integer NOT NULL,
    user_id integer NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    closed_at timestamp without time zone,
    closed_by text
);


ALTER TABLE public.support_chats OWNER TO postgres;

--
-- Name: support_chats_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.support_chats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.support_chats_id_seq OWNER TO postgres;

--
-- Name: support_chats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.support_chats_id_seq OWNED BY public.support_chats.id;


--
-- Name: support_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.support_messages (
    id integer NOT NULL,
    chat_id integer NOT NULL,
    sender_id integer NOT NULL,
    sender_type text NOT NULL,
    message text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    read_at timestamp without time zone
);


ALTER TABLE public.support_messages OWNER TO postgres;

--
-- Name: support_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.support_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.support_messages_id_seq OWNER TO postgres;

--
-- Name: support_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.support_messages_id_seq OWNED BY public.support_messages.id;


--
-- Name: tier_rewards_claimed; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tier_rewards_claimed (
    id integer NOT NULL,
    user_id integer NOT NULL,
    tier text NOT NULL,
    level integer NOT NULL,
    amount integer NOT NULL,
    claimed_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.tier_rewards_claimed OWNER TO postgres;

--
-- Name: tier_rewards_claimed_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tier_rewards_claimed_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tier_rewards_claimed_id_seq OWNER TO postgres;

--
-- Name: tier_rewards_claimed_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tier_rewards_claimed_id_seq OWNED BY public.tier_rewards_claimed.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    password text NOT NULL,
    cpf text,
    is_adult boolean,
    referral_code text,
    referred_by text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    utm_term text,
    utm_content text,
    utm_src text,
    landing_page text,
    coupon_applied integer DEFAULT 0,
    current_coupon text,
    has_first_deposit boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: wallets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wallets (
    id integer NOT NULL,
    user_id integer NOT NULL,
    balance numeric(10,2) DEFAULT 0.00,
    scratch_bonus integer DEFAULT 0,
    total_wagered numeric(10,2) DEFAULT 0.00,
    last_updated timestamp without time zone DEFAULT now()
);


ALTER TABLE public.wallets OWNER TO postgres;

--
-- Name: wallets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.wallets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.wallets_id_seq OWNER TO postgres;

--
-- Name: wallets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.wallets_id_seq OWNED BY public.wallets.id;


--
-- Name: withdrawals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.withdrawals (
    id integer NOT NULL,
    user_id integer NOT NULL,
    display_id integer NOT NULL,
    amount numeric(10,2) NOT NULL,
    pix_key text NOT NULL,
    pix_key_type text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    requested_at timestamp without time zone DEFAULT now(),
    processed_at timestamp without time zone
);


ALTER TABLE public.withdrawals OWNER TO postgres;

--
-- Name: withdrawals_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.withdrawals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.withdrawals_id_seq OWNER TO postgres;

--
-- Name: withdrawals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.withdrawals_id_seq OWNED BY public.withdrawals.id;


--
-- Name: __drizzle_migrations id; Type: DEFAULT; Schema: drizzle; Owner: postgres
--

ALTER TABLE ONLY drizzle.__drizzle_migrations ALTER COLUMN id SET DEFAULT nextval('drizzle.__drizzle_migrations_id_seq'::regclass);


--
-- Name: active_game_sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.active_game_sessions ALTER COLUMN id SET DEFAULT nextval('public.active_game_sessions_id_seq'::regclass);


--
-- Name: admin_sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_sessions ALTER COLUMN id SET DEFAULT nextval('public.admin_sessions_id_seq'::regclass);


--
-- Name: affiliate_clicks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.affiliate_clicks ALTER COLUMN id SET DEFAULT nextval('public.affiliate_clicks_id_seq'::regclass);


--
-- Name: affiliate_conversions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.affiliate_conversions ALTER COLUMN id SET DEFAULT nextval('public.affiliate_conversions_id_seq'::regclass);


--
-- Name: affiliate_payouts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.affiliate_payouts ALTER COLUMN id SET DEFAULT nextval('public.affiliate_payouts_id_seq'::regclass);


--
-- Name: affiliates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.affiliates ALTER COLUMN id SET DEFAULT nextval('public.affiliates_id_seq'::regclass);


--
-- Name: coupon_uses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coupon_uses ALTER COLUMN id SET DEFAULT nextval('public.coupon_uses_id_seq'::regclass);


--
-- Name: coupons id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coupons ALTER COLUMN id SET DEFAULT nextval('public.coupons_id_seq'::regclass);


--
-- Name: daily_spins id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_spins ALTER COLUMN id SET DEFAULT nextval('public.daily_spins_id_seq'::regclass);


--
-- Name: deposits id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deposits ALTER COLUMN id SET DEFAULT nextval('public.deposits_id_seq'::regclass);


--
-- Name: game_premios id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_premios ALTER COLUMN id SET DEFAULT nextval('public.game_premios_id_seq'::regclass);


--
-- Name: game_probabilities id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_probabilities ALTER COLUMN id SET DEFAULT nextval('public.game_probabilities_id_seq'::regclass);


--
-- Name: games id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.games ALTER COLUMN id SET DEFAULT nextval('public.games_id_seq'::regclass);


--
-- Name: level_rewards_claimed id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.level_rewards_claimed ALTER COLUMN id SET DEFAULT nextval('public.level_rewards_claimed_id_seq'::regclass);


--
-- Name: prize_probabilities id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prize_probabilities ALTER COLUMN id SET DEFAULT nextval('public.prize_probabilities_id_seq'::regclass);


--
-- Name: referral_earnings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_earnings ALTER COLUMN id SET DEFAULT nextval('public.referral_earnings_id_seq'::regclass);


--
-- Name: referrals id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referrals ALTER COLUMN id SET DEFAULT nextval('public.referrals_id_seq'::regclass);


--
-- Name: site_accesses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.site_accesses ALTER COLUMN id SET DEFAULT nextval('public.site_accesses_id_seq'::regclass);


--
-- Name: support_chats id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_chats ALTER COLUMN id SET DEFAULT nextval('public.support_chats_id_seq'::regclass);


--
-- Name: support_messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_messages ALTER COLUMN id SET DEFAULT nextval('public.support_messages_id_seq'::regclass);


--
-- Name: tier_rewards_claimed id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tier_rewards_claimed ALTER COLUMN id SET DEFAULT nextval('public.tier_rewards_claimed_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: wallets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallets ALTER COLUMN id SET DEFAULT nextval('public.wallets_id_seq'::regclass);


--
-- Name: withdrawals id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.withdrawals ALTER COLUMN id SET DEFAULT nextval('public.withdrawals_id_seq'::regclass);


--
-- Name: __drizzle_migrations __drizzle_migrations_pkey; Type: CONSTRAINT; Schema: drizzle; Owner: postgres
--

ALTER TABLE ONLY drizzle.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);


--
-- Name: active_game_sessions active_game_sessions_game_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.active_game_sessions
    ADD CONSTRAINT active_game_sessions_game_id_unique UNIQUE (game_id);


--
-- Name: active_game_sessions active_game_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.active_game_sessions
    ADD CONSTRAINT active_game_sessions_pkey PRIMARY KEY (id);


--
-- Name: admin_sessions admin_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_sessions
    ADD CONSTRAINT admin_sessions_pkey PRIMARY KEY (id);


--
-- Name: admin_sessions admin_sessions_session_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_sessions
    ADD CONSTRAINT admin_sessions_session_id_unique UNIQUE (session_id);


--
-- Name: affiliate_clicks affiliate_clicks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.affiliate_clicks
    ADD CONSTRAINT affiliate_clicks_pkey PRIMARY KEY (id);


--
-- Name: affiliate_conversions affiliate_conversions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.affiliate_conversions
    ADD CONSTRAINT affiliate_conversions_pkey PRIMARY KEY (id);


--
-- Name: affiliate_payouts affiliate_payouts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.affiliate_payouts
    ADD CONSTRAINT affiliate_payouts_pkey PRIMARY KEY (id);


--
-- Name: affiliates affiliates_code_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.affiliates
    ADD CONSTRAINT affiliates_code_unique UNIQUE (code);


--
-- Name: affiliates affiliates_email_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.affiliates
    ADD CONSTRAINT affiliates_email_unique UNIQUE (email);


--
-- Name: affiliates affiliates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.affiliates
    ADD CONSTRAINT affiliates_pkey PRIMARY KEY (id);


--
-- Name: coupon_uses coupon_uses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coupon_uses
    ADD CONSTRAINT coupon_uses_pkey PRIMARY KEY (id);


--
-- Name: coupons coupons_code_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_code_unique UNIQUE (code);


--
-- Name: coupons coupons_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_pkey PRIMARY KEY (id);


--
-- Name: daily_spins daily_spins_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_spins
    ADD CONSTRAINT daily_spins_pkey PRIMARY KEY (id);


--
-- Name: deposits deposits_display_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deposits
    ADD CONSTRAINT deposits_display_id_unique UNIQUE (display_id);


--
-- Name: deposits deposits_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deposits
    ADD CONSTRAINT deposits_pkey PRIMARY KEY (id);


--
-- Name: deposits deposits_transaction_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deposits
    ADD CONSTRAINT deposits_transaction_id_unique UNIQUE (transaction_id);


--
-- Name: game_premios game_premios_display_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_premios
    ADD CONSTRAINT game_premios_display_id_unique UNIQUE (display_id);


--
-- Name: game_premios game_premios_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_premios
    ADD CONSTRAINT game_premios_pkey PRIMARY KEY (id);


--
-- Name: game_probabilities game_probabilities_game_type_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_probabilities
    ADD CONSTRAINT game_probabilities_game_type_unique UNIQUE (game_type);


--
-- Name: game_probabilities game_probabilities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_probabilities
    ADD CONSTRAINT game_probabilities_pkey PRIMARY KEY (id);


--
-- Name: games games_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.games
    ADD CONSTRAINT games_pkey PRIMARY KEY (id);


--
-- Name: level_rewards_claimed level_rewards_claimed_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.level_rewards_claimed
    ADD CONSTRAINT level_rewards_claimed_pkey PRIMARY KEY (id);


--
-- Name: prize_probabilities prize_probabilities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.prize_probabilities
    ADD CONSTRAINT prize_probabilities_pkey PRIMARY KEY (id);


--
-- Name: referral_earnings referral_earnings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_earnings
    ADD CONSTRAINT referral_earnings_pkey PRIMARY KEY (id);


--
-- Name: referrals referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_pkey PRIMARY KEY (id);


--
-- Name: site_accesses site_accesses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.site_accesses
    ADD CONSTRAINT site_accesses_pkey PRIMARY KEY (id);


--
-- Name: support_chats support_chats_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_chats
    ADD CONSTRAINT support_chats_pkey PRIMARY KEY (id);


--
-- Name: support_messages support_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_messages
    ADD CONSTRAINT support_messages_pkey PRIMARY KEY (id);


--
-- Name: tier_rewards_claimed tier_rewards_claimed_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tier_rewards_claimed
    ADD CONSTRAINT tier_rewards_claimed_pkey PRIMARY KEY (id);


--
-- Name: users users_cpf_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_cpf_unique UNIQUE (cpf);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_referral_code_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_referral_code_unique UNIQUE (referral_code);


--
-- Name: wallets wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_pkey PRIMARY KEY (id);


--
-- Name: withdrawals withdrawals_display_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.withdrawals
    ADD CONSTRAINT withdrawals_display_id_unique UNIQUE (display_id);


--
-- Name: withdrawals withdrawals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.withdrawals
    ADD CONSTRAINT withdrawals_pkey PRIMARY KEY (id);


--
-- Name: active_game_sessions active_game_sessions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.active_game_sessions
    ADD CONSTRAINT active_game_sessions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: affiliate_clicks affiliate_clicks_affiliate_id_affiliates_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.affiliate_clicks
    ADD CONSTRAINT affiliate_clicks_affiliate_id_affiliates_id_fk FOREIGN KEY (affiliate_id) REFERENCES public.affiliates(id);


--
-- Name: affiliate_conversions affiliate_conversions_affiliate_id_affiliates_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.affiliate_conversions
    ADD CONSTRAINT affiliate_conversions_affiliate_id_affiliates_id_fk FOREIGN KEY (affiliate_id) REFERENCES public.affiliates(id);


--
-- Name: affiliate_conversions affiliate_conversions_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.affiliate_conversions
    ADD CONSTRAINT affiliate_conversions_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: affiliate_payouts affiliate_payouts_affiliate_id_affiliates_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.affiliate_payouts
    ADD CONSTRAINT affiliate_payouts_affiliate_id_affiliates_id_fk FOREIGN KEY (affiliate_id) REFERENCES public.affiliates(id);


--
-- Name: coupon_uses coupon_uses_coupon_id_coupons_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coupon_uses
    ADD CONSTRAINT coupon_uses_coupon_id_coupons_id_fk FOREIGN KEY (coupon_id) REFERENCES public.coupons(id);


--
-- Name: coupon_uses coupon_uses_deposit_id_deposits_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coupon_uses
    ADD CONSTRAINT coupon_uses_deposit_id_deposits_id_fk FOREIGN KEY (deposit_id) REFERENCES public.deposits(id);


--
-- Name: coupon_uses coupon_uses_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.coupon_uses
    ADD CONSTRAINT coupon_uses_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: daily_spins daily_spins_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.daily_spins
    ADD CONSTRAINT daily_spins_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: deposits deposits_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deposits
    ADD CONSTRAINT deposits_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: game_premios game_premios_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_premios
    ADD CONSTRAINT game_premios_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: games games_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.games
    ADD CONSTRAINT games_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: level_rewards_claimed level_rewards_claimed_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.level_rewards_claimed
    ADD CONSTRAINT level_rewards_claimed_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: referral_earnings referral_earnings_referral_id_referrals_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_earnings
    ADD CONSTRAINT referral_earnings_referral_id_referrals_id_fk FOREIGN KEY (referral_id) REFERENCES public.referrals(id);


--
-- Name: referral_earnings referral_earnings_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_earnings
    ADD CONSTRAINT referral_earnings_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: referrals referrals_referred_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referred_id_users_id_fk FOREIGN KEY (referred_id) REFERENCES public.users(id);


--
-- Name: referrals referrals_referrer_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referrer_id_users_id_fk FOREIGN KEY (referrer_id) REFERENCES public.users(id);


--
-- Name: site_accesses site_accesses_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.site_accesses
    ADD CONSTRAINT site_accesses_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: support_chats support_chats_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_chats
    ADD CONSTRAINT support_chats_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: support_messages support_messages_chat_id_support_chats_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_messages
    ADD CONSTRAINT support_messages_chat_id_support_chats_id_fk FOREIGN KEY (chat_id) REFERENCES public.support_chats(id);


--
-- Name: support_messages support_messages_sender_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_messages
    ADD CONSTRAINT support_messages_sender_id_users_id_fk FOREIGN KEY (sender_id) REFERENCES public.users(id);


--
-- Name: tier_rewards_claimed tier_rewards_claimed_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tier_rewards_claimed
    ADD CONSTRAINT tier_rewards_claimed_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: wallets wallets_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: withdrawals withdrawals_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.withdrawals
    ADD CONSTRAINT withdrawals_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

