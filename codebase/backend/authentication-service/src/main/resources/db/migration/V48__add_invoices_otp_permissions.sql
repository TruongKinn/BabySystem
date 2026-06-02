-- Permission: POST /expense/invoices/otp/send
INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:EXPENSE_INVOICES_OTP_SEND', 'Send digital signature verification OTP for invoices', 'API', 'POST', '/expense/invoices/otp/send'
WHERE NOT EXISTS (
    SELECT 1 FROM tbl_permission WHERE name = 'API:POST:EXPENSE_INVOICES_OTP_SEND'
);

-- Permission: POST /expense/invoices/otp/verify
INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:EXPENSE_INVOICES_OTP_VERIFY', 'Verify digital signature OTP for invoices', 'API', 'POST', '/expense/invoices/otp/verify'
WHERE NOT EXISTS (
    SELECT 1 FROM tbl_permission WHERE name = 'API:POST:EXPENSE_INVOICES_OTP_VERIFY'
);

-- Assign permissions to roles (1, 2, 3)
INSERT INTO tbl_role_has_permission (role_id, permission_id)
SELECT roles.role_id, p.id
FROM tbl_permission p
CROSS JOIN (VALUES (1), (2), (3)) AS roles(role_id)
WHERE p.name IN (
    'API:POST:EXPENSE_INVOICES_OTP_SEND',
    'API:POST:EXPENSE_INVOICES_OTP_VERIFY'
)
AND NOT EXISTS (
    SELECT 1
    FROM tbl_role_has_permission rhp
    WHERE rhp.role_id = roles.role_id
      AND rhp.permission_id = p.id
);
