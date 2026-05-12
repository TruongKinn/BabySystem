INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:PUT:ROLE_UPDATE', 'Update role', 'API', 'PUT', '/auth/roles/{roleId}'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:PUT:ROLE_UPDATE');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:DELETE:ROLE_DELETE', 'Delete role', 'API', 'DELETE', '/auth/roles/{roleId}'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:DELETE:ROLE_DELETE');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:PUT:PERMISSION_UPDATE', 'Update permission', 'API', 'PUT', '/auth/roles/permissions/{permissionId}'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:PUT:PERMISSION_UPDATE');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:DELETE:PERMISSION_DELETE', 'Delete permission', 'API', 'DELETE', '/auth/roles/permissions/{permissionId}'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:DELETE:PERMISSION_DELETE');

INSERT INTO tbl_role_has_permission (role_id, permission_id)
SELECT 2, p.id
FROM tbl_permission p
WHERE p.name IN (
    'API:PUT:ROLE_UPDATE',
    'API:DELETE:ROLE_DELETE',
    'API:PUT:PERMISSION_UPDATE',
    'API:DELETE:PERMISSION_DELETE'
)
AND NOT EXISTS (
    SELECT 1
    FROM tbl_role_has_permission rhp
    WHERE rhp.role_id = 2
      AND rhp.permission_id = p.id
);

