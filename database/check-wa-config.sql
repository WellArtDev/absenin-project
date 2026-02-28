-- ========================================
-- Check WhatsApp Configuration
-- ========================================

-- 1. Check all companies
SELECT id, name, plan, is_active FROM companies ORDER BY id;

-- 2. Check company_settings with WA config
SELECT
    cs.company_id,
    c.name as company_name,
    cs.wa_api_url,
    CASE WHEN cs.wa_api_token IS NOT NULL THEN SUBSTRING(cs.wa_api_token, 1, 10) || '...' ELSE 'NULL' END as wa_api_token,
    cs.wa_device_number
FROM company_settings cs
JOIN companies c ON c.id = cs.company_id
ORDER BY cs.company_id;

-- 3. Check employees with their phone numbers
SELECT
    e.id,
    e.name,
    e.phone_number,
    e.is_active,
    c.name as company_name
FROM employees e
JOIN companies c ON c.id = e.company_id
WHERE e.is_active = true
ORDER BY e.company_id, e.name
LIMIT 20;

-- 4. Check if employee exists for specific phone (change the phone number)
-- SELECT e.*, c.name as company_name, cs.wa_api_url IS NOT NULL as has_wa_config
-- FROM employees e
-- JOIN companies c ON c.id = e.company_id
-- LEFT JOIN company_settings cs ON cs.company_id = e.company_id
-- WHERE e.phone_number = '628123456789' OR e.phone_number = '08123456789';
