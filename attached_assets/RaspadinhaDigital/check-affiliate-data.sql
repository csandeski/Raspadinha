-- Check affiliate ID 12 data
SELECT 
    id,
    name,
    affiliate_level,
    commission_type,
    custom_commission_rate,
    custom_fixed_amount,
    current_level_rate
FROM affiliates 
WHERE id = 12;

-- Check tier config for Prata
SELECT * FROM affiliate_tier_config 
WHERE tier = 'prata';

-- Check all tier configs
SELECT * FROM affiliate_tier_config 
ORDER BY min_earnings;