-- Add type column if it doesn't exist
ALTER TABLE partner_conversions 
ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'commission';

-- Update existing rows
UPDATE partner_conversions 
SET type = 'commission' 
WHERE type IS NULL;

-- Make it NOT NULL after updating
ALTER TABLE partner_conversions 
ALTER COLUMN type SET NOT NULL;

-- Verify
SELECT * FROM partner_conversions LIMIT 5;
