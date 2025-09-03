-- Create missing tables that are in schema but not in database

-- 1. Create referral_config table
CREATE TABLE IF NOT EXISTS referral_config (
  id SERIAL PRIMARY KEY,
  payment_type TEXT NOT NULL DEFAULT 'all_deposits',
  payment_amount DECIMAL(10, 2) NOT NULL DEFAULT 12.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 2. Create daily_cashback table  
CREATE TABLE IF NOT EXISTS daily_cashback (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  calculation_date DATE NOT NULL,
  tier TEXT NOT NULL,
  cashback_percentage DECIMAL(5, 2) NOT NULL,
  total_deposits DECIMAL(10, 2) NOT NULL,
  total_withdrawals DECIMAL(10, 2) NOT NULL,
  current_balance DECIMAL(10, 2) NOT NULL,
  net_loss DECIMAL(10, 2) NOT NULL,
  cashback_amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  credited_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Add missing column to users table (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' 
                 AND column_name = 'affiliate_id') THEN
    ALTER TABLE users ADD COLUMN affiliate_id INTEGER REFERENCES affiliates(id);
  END IF;
END $$;

-- 4. Add missing column to affiliates table (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'affiliates' 
                 AND column_name = 'partner_invite_code') THEN
    ALTER TABLE affiliates ADD COLUMN partner_invite_code TEXT UNIQUE;
  END IF;
END $$;

-- 5. Insert initial referral config if not exists
INSERT INTO referral_config (payment_type, payment_amount, is_active)
SELECT 'all_deposits', 12.00, true
WHERE NOT EXISTS (SELECT 1 FROM referral_config);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_cashback_user_id ON daily_cashback(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_cashback_calculation_date ON daily_cashback(calculation_date);
CREATE INDEX IF NOT EXISTS idx_users_affiliate_id ON users(affiliate_id);

COMMIT;