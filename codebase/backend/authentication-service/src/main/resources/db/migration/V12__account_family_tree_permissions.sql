INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:USER_LOOKUP', 'Lookup user by username or email', 'API', 'GET', '/account/users/lookup'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:USER_LOOKUP');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:USER_FAMILIES', 'Get families by user', 'API', 'GET', '/account/users/{id}/families'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:USER_FAMILIES');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:PUT:FAMILY_MEMBER_ROLE', 'Update family member role', 'API', 'PUT', '/account/families/{id}/members/{userId}/role'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:PUT:FAMILY_MEMBER_ROLE');

INSERT INTO tbl_role_has_permission (role_id, permission_id)
SELECT roles.role_id, p.id
FROM tbl_permission p
CROSS JOIN (VALUES (1), (2), (3)) AS roles(role_id)
WHERE p.name IN (
    'API:GET:USER_LOOKUP',
    'API:GET:USER_FAMILIES',
    'API:PUT:FAMILY_MEMBER_ROLE'
)
AND NOT EXISTS (
    SELECT 1
    FROM tbl_role_has_permission rhp
    WHERE rhp.role_id = roles.role_id
      AND rhp.permission_id = p.id
);
