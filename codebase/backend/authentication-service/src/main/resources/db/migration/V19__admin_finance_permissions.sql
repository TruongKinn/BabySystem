-- Admin finance menu permission
INSERT INTO tbl_permission (name, description, type, menu_key)
SELECT 'MENU:ADMIN_FINANCE', 'Menu access for admin financial workspace', 'MENU', '/admin/finance'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'MENU:ADMIN_FINANCE');

-- Admin family list API permission
INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:ADMIN_FAMILY_LIST', 'Get all households list from admin workspace', 'API', 'GET', '/account/admin/families'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:ADMIN_FAMILY_LIST');

-- Map both permissions to ADMIN and OWNER roles
INSERT INTO tbl_role_has_permission (role_id, permission_id)
SELECT r.id, p.id
FROM tbl_role r
JOIN tbl_permission p
  ON p.name IN ('MENU:ADMIN_FINANCE', 'API:GET:ADMIN_FAMILY_LIST')
WHERE r.name IN ('ADMIN', 'OWNER')
AND NOT EXISTS (
    SELECT 1
    FROM tbl_role_has_permission rhp
    WHERE rhp.role_id = r.id
      AND rhp.permission_id = p.id
);
