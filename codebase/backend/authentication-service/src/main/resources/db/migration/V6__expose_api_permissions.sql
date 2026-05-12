INSERT INTO tbl_permission (name, description, type, menu_key)
SELECT 'MENU:EXPOSE_API_WORKSPACE', 'Menu access for Expose API workspace', 'MENU', '/expose-api'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'MENU:EXPOSE_API_WORKSPACE');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:EXPOSE_API_LIST', 'List expose API configs', 'API', 'GET', '/common/api/v1/expose/apis'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:EXPOSE_API_LIST');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:EXPOSE_API_CREATE', 'Create expose API config', 'API', 'POST', '/common/api/v1/expose/apis'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:EXPOSE_API_CREATE');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:PUT:EXPOSE_API_UPDATE', 'Update expose API config', 'API', 'PUT', '/common/api/v1/expose/apis/{apiCode}'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:PUT:EXPOSE_API_UPDATE');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:DELETE:EXPOSE_API_DELETE', 'Delete expose API config', 'API', 'DELETE', '/common/api/v1/expose/apis/{apiCode}'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:DELETE:EXPOSE_API_DELETE');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:PUT:EXPOSE_API_VAULT_SECRET', 'Upsert expose API vault secret', 'API', 'PUT', '/common/api/v1/expose/apis/{apiCode}/vault-secret'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:PUT:EXPOSE_API_VAULT_SECRET');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:EXPOSE_API_TEST', 'Test expose API execution', 'API', 'POST', '/common/api/v1/expose/test'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:EXPOSE_API_TEST');

INSERT INTO tbl_role_has_permission (role_id, permission_id)
SELECT 2, p.id
FROM tbl_permission p
WHERE p.name IN (
    'MENU:EXPOSE_API_WORKSPACE',
    'API:GET:EXPOSE_API_LIST',
    'API:POST:EXPOSE_API_CREATE',
    'API:PUT:EXPOSE_API_UPDATE',
    'API:DELETE:EXPOSE_API_DELETE',
    'API:PUT:EXPOSE_API_VAULT_SECRET',
    'API:POST:EXPOSE_API_TEST'
)
AND NOT EXISTS (
    SELECT 1
    FROM tbl_role_has_permission rhp
    WHERE rhp.role_id = 2
      AND rhp.permission_id = p.id
);
