# Mania Brasil

## Overview
"Mania Brasil" is a mobile-first raspadinha (scratch card) gambling application for the Brazilian market. It allows users to register, deposit funds via PIX, play various raspadinha games, and manage winnings. The platform includes a comprehensive admin panel for user, game, and financial management, and features a complete affiliate marketing system with automatic tracking, multi-tier commission processing, and a modern dashboard. The project aims to be a leading platform in Brazil, focusing on user engagement, real-time payment processing, and robust affiliate management.

## User Preferences
Preferred communication style: Simple, everyday language.
UI Preferences: Icon-only bottom navigation menu with larger, elevated center button.
Color scheme preference: All icons should use the site's green color (#00E880) for consistency, except password/security-related icons which should be purple.
Design quality: Modern, sophisticated design required - never "simple" or "ugly". User is very particular about aesthetic quality. Prefers clean, minimal designs without excessive decorative elements or visual clutter.
Multiplier buttons: Use consistent theme colors for each game without variations (blue for PIX, pink for Me Mimei, orange for Eletrônicos, green for Super Prêmios)
Registration promo modal: Only shows on home page (/) and 4 raspadinha game pages (/game/premio-pix, /game/premio-me-mimei, /game/premio-eletronicos, /game/premio-super-premios) - never on admin or other pages
Rewards page design: No emojis, use modern Lucide icons only. Show attractive high prize values for display purposes at all tier levels to attract users
Landing page design: Clean, professional aesthetic without decorative corner icons or excessive animations. Simplified testimonials section without star ratings or badges. No icons in section titles - only clean text headers
Avatar selector: Mobile-optimized with smaller avatars (48x48px), 3-column grid, compact spacing, and no scale effects on mobile for easier selection
Mobile panel headers: Affiliate and partner panels show user avatar on left and logo on right in mobile view (no commission display)
Mobile menu design: Both affiliate and partner panels have identical mobile menu structure with user profile section at bottom including avatar, email, and action buttons (help, settings, logout)

## Recent Changes (2025-08-25)
- **Mobile Panel Headers Unified**: Affiliate and partner panels now both display avatar + logo in mobile header instead of commission
  - Left side: Menu button + user avatar (clickable to change avatar)
  - Right side: Mania Brasil logo
  - Desktop headers remain unchanged with all original features
- **Mobile Menu Standardization**: Partner panel mobile menu now matches affiliate panel structure
  - Added user profile section at bottom with avatar, name, and email
  - Added action buttons row with help, settings, and logout icons
  - Maintains consistent design and interaction patterns across both panels

## Recent Changes (2025-08-22)
- **Partner Dashboard Complete Redesign**: Made partner dashboard (/parceiros/dashboard) 100% identical to affiliate dashboard
  - Replaced basic stats cards with enhanced KPI cards featuring gradient effects and growth indicators
  - Added Professional Analytics Section with dual charts:
    - Revenue Evolution Chart with area charts showing approved, pending, and cancelled deposits
    - Deposit Statistics with progress bars showing commission status breakdown
  - Added comprehensive Tutorial Section with 6-step guide for partner success
  - Removed secondary stats and simple performance chart to match affiliate design exactly
  - Fixed backend API endpoints for partner performance data and dashboard stats
  - Added missing `lt` import to drizzle-orm for proper date comparisons
  - Fixed SQL syntax errors in partner dashboard queries using proper partner marketing links
- **Complete Partner Panel System**: Implemented full partner dashboard with all features
  - Login system with "Remember Me" functionality and session persistence
  - Complete set of pages: Dashboard, Links, Network, Earnings, Withdrawals, History, Support
  - QR Code generation for marketing links
  - Professional UI/UX with consistent design patterns
  - Proper logout handling with session flags
- **Affiliate Panel UI Standardization**: 
  - Standardized page headers across all affiliate pages with compact design
  - Updated stats cards to use consistent modern design (bg-[#1a1f2e]/95, rounded-2xl, p-6)
  - Changed Demo Account icon from Users to TestTube for consistency
- **404 Page Enhancement**: Created custom 404 page with responsive design for PC and mobile
  - Beautiful animated design with gradient backgrounds and floating elements  
  - Clear navigation options: "Go to Home" and "Back" buttons
  - No more automatic redirects to home page on invalid routes
  - Consistent with site's dark theme and green accent colors
- **WhatsApp Support Number Fix**: Corrected to (11) 5196-4120 across all support pages
- **Support Pages UI**: Standardized card heights and removed FAQ sections for cleaner appearance

## Recent Changes (2025-08-21)
- **Partner System Redesign**: Complete overhaul - partners can ONLY be created by affiliates through their panel (no self-registration)
- **Partner Creation Flow**: Affiliates create partner accounts with auto-generated credentials
- **Routes Updated**: Removed /parceiros (self-registration), partners now login via /parceiros-login
- **API Endpoints**: Added /api/affiliate/partners/create for affiliate-only partner creation
- **Security Enhancement**: Partners receive auto-generated passwords from affiliates
- **Commission Limits System**: Advanced validation ensuring partners cannot exceed affiliate's commission
  - Percentage affiliate: Partner max = affiliate's percentage or equivalent fixed value
  - Fixed affiliate: Partner max = affiliate's fixed amount or calculated percentage
  - Real-time validation in frontend with visual limits display
  - Backend enforcement with detailed error messages
- **Database Updates**: Added all missing columns, indexes for optimization
- **Domain Corrections**: All links use mania-brasil.com domain

## System Architecture

### Frontend
- **Framework**: React with TypeScript, using Vite.
- **Routing**: Wouter.
- **UI Components**: Radix UI primitives with shadcn/ui.
- **Styling**: Tailwind CSS with custom CSS variables.
- **State Management**: React Context for authentication, TanStack React Query for server state.
- **Design Principles**: Mobile-first, responsive, and touch-friendly interfaces emphasizing clean, professional aesthetics with dark themes, green accents, and glass-morphism effects. Features standardized button designs, consistent icon usage, visual balance change indicators, unified game visual design, rarity animation system, winning line connection animations, and standardized page headers/footers.

### Backend
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript with ES modules.
- **API Design**: RESTful API.
- **Authentication**: JWT tokens for user sessions, separate admin session management with database-stored credentials.
- **Security**: bcrypt for password hashing, Zod for input validation, secure database authentication for admin panel. Rate limiting is handled externally (e.g., Cloudflare).

### Database
- **Database**: PostgreSQL (Supabase).
- **ORM**: Drizzle ORM.
- **Schema**: Relational design supporting users (with affiliate_id), wallets, games, deposits, withdrawals, admin sessions, referral earnings, prize probabilities, site access tracking, affiliates (with detailed tracking metrics), influencers, marketing links, and configurable referral commission settings.

### Key Features
- **Authentication**: Email/phone and password registration/login with JWT-based sessions, and separate admin authentication. Password recovery via SMS with cooldown. Supports user referral codes and affiliate promotional codes. Affiliate login includes "remember me" functionality.
- **Payments**: Triple PIX payment provider system with automatic failover (IronPay, OrinPay, HorsePay) ensuring seamless processing. User-initiated withdrawals with admin approval, and automatic withdrawal approval via HorsePay API. Includes a configurable referral commission system (fixed amount, pay on first deposit or all deposits). Comprehensive payment provider tracking.
- **Coupon System**: Coupons persist after deposits, applying bonuses on qualifying deposits based on a tier-based bonus system.
- **Affiliate Commission System**: Professional tracking with historical rate preservation, calculated as a percentage of deposit value, requiring admin approval.
- **Game Engine**: Interactive 3x3 raspadinhas with configurable odds, multipliers, and prize pools, focused on specific premio games (PIX, Me Mimei, Eletrônicos, Super Prêmios).
- **Tier-Based Rewards System**: Five tiers with progressively better daily spin rewards, designed to attract users with high display values.
- **Level Progression System**: Accessible wagering requirements for player progression, focusing on tier ranks.
- **Admin Dashboard**: Comprehensive management of users, finances, game analytics, and prize probabilities. Includes advanced affiliate individual configuration with custom commission rates.
- **User Experience**: Live game activity feed, welcome bonuses, rewards system, and comprehensive settings.
- **Support System**: Two-step support ticket creation and live chat, with a mobile-optimized agent panel.
- **Analytics & Tracking**: Complete site access tracking system capturing visitor data.
- **Affiliate Marketing System**: Advanced affiliate panel with a 5-tier level system (Bronze to Diamante) based on approved earnings, modern layout with fixed sidebar navigation, enhanced dashboard with real earnings data and performance charts, detailed level management, custom tracking link creation with QR codes, affiliate code generation with detailed statistics, and a materials center for promotional assets. Features glassmorphism effects and Framer Motion animations.

## External Dependencies

-   **IronPay API**: Primary PIX payment processor.
-   **OrinPay API**: Alternative PIX payment processor.
-   **HorsePay API**: Third PIX payment processor, also used for automatic withdrawals.
-   **Supabase**: PostgreSQL database hosting.
-   **JWT**: JSON Web Tokens for authentication.
-   **bcrypt**: Password hashing library.
-   **Radix UI**: Accessible UI component primitives.
-   **Tailwind CSS**: Utility-first CSS framework.
-   **Lucide Icons**: Icon library.
-   **Cloudflare**: For rate limiting and security protection.