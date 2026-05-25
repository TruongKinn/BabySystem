INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:USER_PREFERENCES', 'Get user preferences', 'API', 'GET', '/account/users/{id}/preferences'
WHERE NOT EXISTS (
    SELECT 1 FROM tbl_permission WHERE name = 'API:GET:USER_PREFERENCES'
);

INSERT INTO tbl_role_has_permission (role_id, permission_id)
SELECT roles.role_id, p.id
FROM tbl_permission p
CROSS JOIN (VALUES (1), (2), (3)) AS roles(role_id)
WHERE p.name = 'API:GET:USER_PREFERENCES'
AND NOT EXISTS (
    SELECT 1
    FROM tbl_role_has_permission rhp
    WHERE rhp.role_id = roles.role_id
      AND rhp.permission_id = p.id
);
