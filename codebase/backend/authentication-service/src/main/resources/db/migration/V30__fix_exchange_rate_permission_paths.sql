-- V30: Fix exchange rate permission paths (V29 đã insert path sai /expense/api/...)
-- Gateway filter so sánh PATH TRƯỚC khi rewrite, nên phải dùng /expense/... không có /api/

-- Sửa path sai từ V29
UPDATE tbl_permission
SET api_path = '/expense/exchange-rates'
WHERE name = 'API:GET:EXPENSE_EXCHANGE_RATES'
  AND api_path = '/expense/api/exchange-rates';

UPDATE tbl_permission
SET api_path = '/expense/exchange-rates/convert'
WHERE name = 'API:POST:EXPENSE_EXCHANGE_CONVERT'
  AND api_path = '/expense/api/exchange-rates/convert';

-- Insert lại nếu chưa tồn tại (trường hợp V29 chưa chạy)
INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:EXPENSE_EXCHANGE_RATES', 'Get live exchange rates from bank (premium)', 'API', 'GET', '/expense/exchange-rates'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:EXPENSE_EXCHANGE_RATES');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:EXPENSE_EXCHANGE_CONVERT', 'Convert foreign currency amount to VND (premium)', 'API', 'POST', '/expense/exchange-rates/convert'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:EXPENSE_EXCHANGE_CONVERT');

-- Gán role (idempotent)
INSERT INTO tbl_role_has_permission (role_id, permission_id)
SELECT r.id, p.id
FROM tbl_role r
JOIN tbl_permission p ON p.name IN ('API:GET:EXPENSE_EXCHANGE_RATES', 'API:POST:EXPENSE_EXCHANGE_CONVERT')
WHERE r.name IN ('PARENT', 'CAREGIVER', 'USER', 'ADMIN', 'OWNER')
AND NOT EXISTS (
    SELECT 1 FROM tbl_role_has_permission rhp
    WHERE rhp.role_id = r.id AND rhp.permission_id = p.id
);

-- Gán role cho EXPENSE_CATEGORY_REPORT (V20 chỉ fix path, chưa gán role)
INSERT INTO tbl_role_has_permission (role_id, permission_id)
SELECT r.id, p.id
FROM tbl_role r
JOIN tbl_permission p ON p.name = 'API:GET:EXPENSE_CATEGORY_REPORT'
WHERE r.name IN ('PARENT', 'CAREGIVER', 'USER', 'ADMIN', 'OWNER')
AND NOT EXISTS (
    SELECT 1 FROM tbl_role_has_permission rhp
    WHERE rhp.role_id = r.id AND rhp.permission_id = p.id
);
