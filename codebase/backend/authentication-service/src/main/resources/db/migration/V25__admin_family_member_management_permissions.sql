-- Admin family member management permissions
INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:ADMIN_FAMILY_MEMBER_INVITE', 'Invite family member from admin workspace', 'API', 'POST', '/account/admin/families/{id}/members/invite'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:ADMIN_FAMILY_MEMBER_INVITE');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:PUT:ADMIN_FAMILY_MEMBER_ROLE', 'Update member role from admin workspace', 'API', 'PUT', '/account/admin/families/{id}/members/{userId}/role'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:PUT:ADMIN_FAMILY_MEMBER_ROLE');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:DELETE:ADMIN_FAMILY_MEMBER', 'Remove family member from admin workspace', 'API', 'DELETE', '/account/admin/families/{id}/members/{userId}'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:DELETE:ADMIN_FAMILY_MEMBER');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:PUT:ADMIN_FAMILY_MEMBER', 'Update family member from admin workspace', 'API', 'PUT', '/account/admin/families/{id}/members/{userId}'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:PUT:ADMIN_FAMILY_MEMBER');

INSERT INTO tbl_role_has_permission (role_id, permission_id)
SELECT r.id, p.id
FROM tbl_role r
JOIN tbl_permission p
  ON p.name IN (
      'API:POST:ADMIN_FAMILY_MEMBER_INVITE',
      'API:PUT:ADMIN_FAMILY_MEMBER_ROLE',
      'API:DELETE:ADMIN_FAMILY_MEMBER',
      'API:PUT:ADMIN_FAMILY_MEMBER'
  )
WHERE r.name IN ('ADMIN', 'OWNER')
AND NOT EXISTS (
    SELECT 1
    FROM tbl_role_has_permission rhp
    WHERE rhp.role_id = r.id
      AND rhp.permission_id = p.id
);
