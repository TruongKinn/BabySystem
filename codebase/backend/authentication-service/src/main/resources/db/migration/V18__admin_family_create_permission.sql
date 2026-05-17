-- Admin family create permission
INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:ADMIN_FAMILY_CREATE', 'Create household from admin workspace', 'API', 'POST', '/account/admin/families'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:ADMIN_FAMILY_CREATE');

INSERT INTO tbl_role_has_permission (role_id, permission_id)
SELECT r.id, p.id
FROM tbl_role r
JOIN tbl_permission p
  ON p.name = 'API:POST:ADMIN_FAMILY_CREATE'
WHERE r.name IN ('ADMIN', 'OWNER')
AND NOT EXISTS (
    SELECT 1
    FROM tbl_role_has_permission rhp
    WHERE rhp.role_id = r.id
      AND rhp.permission_id = p.id
);
