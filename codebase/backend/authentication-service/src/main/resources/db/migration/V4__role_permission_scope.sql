ALTER TABLE tbl_permission
    ADD COLUMN IF NOT EXISTS type CHARACTER VARYING(20) DEFAULT 'API';

ALTER TABLE tbl_permission
    ADD COLUMN IF NOT EXISTS menu_key CHARACTER VARYING(255);

ALTER TABLE tbl_permission
    ADD COLUMN IF NOT EXISTS api_method CHARACTER VARYING(16);

ALTER TABLE tbl_permission
    ADD COLUMN IF NOT EXISTS api_path CHARACTER VARYING(500);

UPDATE tbl_permission
SET type = 'API'
WHERE type IS NULL;

INSERT INTO tbl_permission (name, description, type, menu_key)
SELECT 'MENU:LOGISTICS_DASHBOARD', 'Menu access for Logistics Dashboard', 'MENU', '/'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'MENU:LOGISTICS_DASHBOARD');

INSERT INTO tbl_permission (name, description, type, menu_key)
SELECT 'MENU:SHIPMENTS', 'Menu access for Shipment list', 'MENU', '/shipments'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'MENU:SHIPMENTS');

INSERT INTO tbl_permission (name, description, type, menu_key)
SELECT 'MENU:CONTROL_TOWER', 'Menu access for Control Tower', 'MENU', '/control-tower'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'MENU:CONTROL_TOWER');

INSERT INTO tbl_permission (name, description, type, menu_key)
SELECT 'MENU:TRACKING', 'Menu access for Tracking view', 'MENU', '/tracking'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'MENU:TRACKING');

INSERT INTO tbl_permission (name, description, type, menu_key)
SELECT 'MENU:TODOS', 'Menu access for Todo workspace', 'MENU', '/todos'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'MENU:TODOS');

INSERT INTO tbl_permission (name, description, type, menu_key)
SELECT 'MENU:API_MANAGEMENT', 'Menu access for API Management', 'MENU', '/api-management'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'MENU:API_MANAGEMENT');

INSERT INTO tbl_permission (name, description, type, menu_key)
SELECT 'MENU:ACCESS_CONTROL', 'Menu access for Role & API Permission', 'MENU', '/access-control'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'MENU:ACCESS_CONTROL');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:ROLES_WORKSPACE', 'Get role permission workspace', 'API', 'GET', '/auth/roles/workspace'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:ROLES_WORKSPACE');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:ROLE_CREATE', 'Create role', 'API', 'POST', '/auth/roles'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:ROLE_CREATE');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:PUT:ROLE_ASSIGN_PERMISSION', 'Update role permissions', 'API', 'PUT', '/auth/roles/{roleId}/permissions'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:PUT:ROLE_ASSIGN_PERMISSION');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:PERMISSION_CREATE', 'Create permission', 'API', 'POST', '/auth/roles/permissions'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:PERMISSION_CREATE');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:USER_ACCESS', 'Get user access', 'API', 'GET', '/auth/roles/users/{userId}/access'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:USER_ACCESS');

INSERT INTO tbl_role_has_permission (role_id, permission_id)
SELECT 2, p.id
FROM tbl_permission p
WHERE p.name IN (
    'MENU:API_MANAGEMENT',
    'MENU:ACCESS_CONTROL',
    'API:GET:ROLES_WORKSPACE',
    'API:POST:ROLE_CREATE',
    'API:PUT:ROLE_ASSIGN_PERMISSION',
    'API:POST:PERMISSION_CREATE',
    'API:GET:USER_ACCESS'
)
AND NOT EXISTS (
    SELECT 1
    FROM tbl_role_has_permission rhp
    WHERE rhp.role_id = 2
      AND rhp.permission_id = p.id
);
