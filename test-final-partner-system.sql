-- TESTE FINAL DO SISTEMA DE PARCEIROS REDESENHADO
-- ===============================================

-- 1. Verificar estrutura do sistema
SELECT 
    'Afiliados com código de convite' as metric,
    COUNT(*) as total
FROM affiliates 
WHERE partner_invite_code IS NOT NULL

UNION ALL

SELECT 
    'Total de parceiros cadastrados' as metric,
    COUNT(*) as total
FROM partners

UNION ALL

SELECT 
    'Parceiros ativos' as metric,
    COUNT(*) as total
FROM partners
WHERE is_active = true

UNION ALL

SELECT 
    'Carteiras de parceiros criadas' as metric,
    COUNT(*) as total
FROM partners_wallet;

-- 2. Listar últimos parceiros criados
SELECT 
    p.id,
    p.name,
    p.email,
    p.code as partner_code,
    a.name as affiliate_name,
    p.commission_type,
    p.commission_rate,
    p.created_at
FROM partners p
JOIN affiliates a ON p.affiliate_id = a.id
ORDER BY p.created_at DESC
LIMIT 5;

-- 3. Status do sistema de parceiros
SELECT 
    'SISTEMA DE PARCEIROS' as system,
    'REDESENHADO' as status,
    'Parceiros só podem ser criados por afiliados' as description,
    '/parceiros-login' as login_route,
    'Auto-geração de senhas' as security_feature;