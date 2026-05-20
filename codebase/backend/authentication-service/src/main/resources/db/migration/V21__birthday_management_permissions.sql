-- User-facing upcoming birthday notification endpoint
INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:FAMILY_BIRTHDAY_UPCOMING', 'Get upcoming birthdays for family members', 'API', 'GET', '/account/families/{id}/birthdays/upcoming'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:FAMILY_BIRTHDAY_UPCOMING');

-- Admin-facing upcoming birthday notification endpoint
INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:ADMIN_FAMILY_BIRTHDAY_UPCOMING', 'Get upcoming birthdays for a household in admin workspace', 'API', 'GET', '/account/admin/families/{id}/birthdays/upcoming'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:ADMIN_FAMILY_BIRTHDAY_UPCOMING');

-- Admin family detail endpoint (used in admin member management refresh flow)
INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:ADMIN_FAMILY_DETAIL', 'Get household details in admin workspace', 'API', 'GET', '/account/admin/families/{id}'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:ADMIN_FAMILY_DETAIL');

-- Assign user endpoint permission to USER/ADMIN/OWNER
INSERT INTO tbl_role_has_permission (role_id, permission_id)
SELECT roles.role_id, p.id
FROM tbl_permission p
CROSS JOIN (VALUES (1), (2), (3)) AS roles(role_id)
WHERE p.name IN ('API:GET:FAMILY_BIRTHDAY_UPCOMING')
AND NOT EXISTS (
    SELECT 1
    FROM tbl_role_has_permission rhp
    WHERE rhp.role_id = roles.role_id
      AND rhp.permission_id = p.id
);

-- Assign admin endpoints to ADMIN/OWNER only
INSERT INTO tbl_role_has_permission (role_id, permission_id)
SELECT r.id, p.id
FROM tbl_role r
JOIN tbl_permission p
  ON p.name IN ('API:GET:ADMIN_FAMILY_BIRTHDAY_UPCOMING', 'API:GET:ADMIN_FAMILY_DETAIL')
WHERE r.name IN ('ADMIN', 'OWNER')
AND NOT EXISTS (
    SELECT 1
    FROM tbl_role_has_permission rhp
    WHERE rhp.role_id = r.id
      AND rhp.permission_id = p.id
);
