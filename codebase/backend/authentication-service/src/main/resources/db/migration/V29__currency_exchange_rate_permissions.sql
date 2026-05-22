-- Currency exchange rate endpoints (premium feature)
INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:EXPENSE_EXCHANGE_RATES', 'Get live exchange rates from bank (premium)', 'API', 'GET', '/expense/api/exchange-rates'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:EXPENSE_EXCHANGE_RATES');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:EXPENSE_EXCHANGE_CONVERT', 'Convert foreign currency amount to VND (premium)', 'API', 'POST', '/expense/api/exchange-rates/convert'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:EXPENSE_EXCHANGE_CONVERT');

-- Assign to all non-admin roles
INSERT INTO tbl_role_has_permission (role_id, permission_id)
SELECT r.id, p.id
FROM tbl_role r
JOIN tbl_permission p
  ON p.name IN (
    'API:GET:EXPENSE_EXCHANGE_RATES',
    'API:POST:EXPENSE_EXCHANGE_CONVERT'
  )
WHERE r.name IN ('PARENT', 'CAREGIVER', 'USER', 'ADMIN', 'OWNER')
AND NOT EXISTS (
    SELECT 1
    FROM tbl_role_has_permission rhp
    WHERE rhp.role_id = r.id
      AND rhp.permission_id = p.id
);
