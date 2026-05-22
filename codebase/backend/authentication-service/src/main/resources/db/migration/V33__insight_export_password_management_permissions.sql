INSERT INTO tbl_permission (name, description, type, menu_key)
SELECT 'MENU:ADMIN_EXPORT_PASSWORDS', 'Menu access for admin export password workspace', 'MENU', '/admin/export-passwords'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'MENU:ADMIN_EXPORT_PASSWORDS');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:ADMIN_INSIGHT_EXPORT_PASSWORDS', 'List protected insight export password records', 'API', 'GET', '/insight/admin/export-passwords'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:ADMIN_INSIGHT_EXPORT_PASSWORDS');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:DELETE:ADMIN_INSIGHT_EXPORT_PASSWORD', 'Delete protected insight export password metadata', 'API', 'DELETE', '/insight/admin/export-passwords/{id}'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:DELETE:ADMIN_INSIGHT_EXPORT_PASSWORD');

INSERT INTO tbl_role_has_permission (role_id, permission_id)
SELECT r.id, p.id
FROM tbl_role r
JOIN tbl_permission p
  ON p.name IN (
      'MENU:ADMIN_EXPORT_PASSWORDS',
      'API:GET:ADMIN_INSIGHT_EXPORT_PASSWORDS',
      'API:DELETE:ADMIN_INSIGHT_EXPORT_PASSWORD'
  )
WHERE r.name IN ('ADMIN', 'OWNER')
AND NOT EXISTS (
    SELECT 1
    FROM tbl_role_has_permission rhp
    WHERE rhp.role_id = r.id
      AND rhp.permission_id = p.id
);
