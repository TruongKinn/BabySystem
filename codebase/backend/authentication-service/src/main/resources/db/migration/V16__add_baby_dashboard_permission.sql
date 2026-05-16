-- Add permission for baby dashboard endpoint
INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:BABY_DASHBOARD', 'Get baby dashboard', 'API', 'GET', '/baby/babies/{id}/dashboard'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:BABY_DASHBOARD');

-- Assign only to USER role
INSERT INTO tbl_role_has_permission (role_id, permission_id)
SELECT r.id, p.id
FROM tbl_role r, tbl_permission p
WHERE r.name = 'USER'
  AND p.name = 'API:GET:BABY_DASHBOARD'
  AND NOT EXISTS (
      SELECT 1
      FROM tbl_role_has_permission rhp
      WHERE rhp.role_id = r.id
        AND rhp.permission_id = p.id
  );
