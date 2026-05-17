-- Admin family management permissions
INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:PUT:ADMIN_FAMILY_UPDATE', 'Update household profile from admin workspace', 'API', 'PUT', '/account/admin/families/{id}'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:PUT:ADMIN_FAMILY_UPDATE');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:DELETE:ADMIN_FAMILY_DELETE', 'Delete household from admin workspace', 'API', 'DELETE', '/account/admin/families/{id}'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:DELETE:ADMIN_FAMILY_DELETE');

INSERT INTO tbl_role_has_permission (role_id, permission_id)
SELECT r.id, p.id
FROM tbl_role r
JOIN tbl_permission p
  ON p.name IN ('API:PUT:ADMIN_FAMILY_UPDATE', 'API:DELETE:ADMIN_FAMILY_DELETE')
WHERE r.name IN ('ADMIN', 'OWNER')
AND NOT EXISTS (
    SELECT 1
    FROM tbl_role_has_permission rhp
    WHERE rhp.role_id = r.id
      AND rhp.permission_id = p.id
);
