-- Update affiliate ID 12 to have percentage commission for testing
UPDATE affiliates 
SET 
    commission_type = 'percentage',
    custom_commission_rate = 85,
    custom_fixed_amount = 10,
    current_level_rate = '85'
WHERE id = 12;

-- Verify the update
SELECT 
    id,
    name,
    email,
    commission_type,
    custom_commission_rate,
    custom_fixed_amount,
    current_level_rate
FROM affiliates 
WHERE id = 12;