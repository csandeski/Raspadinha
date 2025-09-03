-- Add missing column to partners_wallet_transactions table
ALTER TABLE partners_wallet_transactions 
ADD COLUMN IF NOT EXISTS wallet_id INTEGER,
ADD COLUMN IF NOT EXISTS balance_before DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS balance_after DECIMAL(10,2);

-- Add foreign key constraint for wallet_id
ALTER TABLE partners_wallet_transactions
ADD CONSTRAINT fk_wallet_id 
FOREIGN KEY (wallet_id) REFERENCES partners_wallet(id)
ON DELETE CASCADE;

-- Show updated structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'partners_wallet_transactions'
ORDER BY ordinal_position;
