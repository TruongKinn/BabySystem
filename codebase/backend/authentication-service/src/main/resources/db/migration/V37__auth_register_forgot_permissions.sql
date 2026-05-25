INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:FORGOT_PASSWORD', 'Forgot password reset', 'API', 'POST', '/forgot-password'
WHERE NOT EXISTS (
    SELECT 1 FROM tbl_permission WHERE name = 'API:POST:FORGOT_PASSWORD'
);

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:REGISTER', 'User self registration', 'API', 'POST', '/register'
WHERE NOT EXISTS (
    SELECT 1 FROM tbl_permission WHERE name = 'API:POST:REGISTER'
);

INSERT INTO tbl_role_has_permission (role_id, permission_id)
SELECT roles.role_id, p.id
FROM tbl_permission p
CROSS JOIN (VALUES (1), (2), (3)) AS roles(role_id)
WHERE p.name IN ('API:POST:FORGOT_PASSWORD', 'API:POST:REGISTER')
AND NOT EXISTS (
    SELECT 1
    FROM tbl_role_has_permission rhp
    WHERE rhp.role_id = roles.role_id
      AND rhp.permission_id = p.id
);
