INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:BABY_CREATE', 'Create baby profile', 'API', 'POST', '/baby/babies'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:BABY_CREATE');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:BABY_LIST', 'Get baby list', 'API', 'GET', '/baby/babies'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:BABY_LIST');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:BABY_DETAIL', 'Get baby detail', 'API', 'GET', '/baby/babies/{id}'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:BABY_DETAIL');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:PUT:BABY_UPDATE', 'Update baby profile', 'API', 'PUT', '/baby/babies/{id}'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:PUT:BABY_UPDATE');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:DELETE:BABY_DELETE', 'Delete baby profile', 'API', 'DELETE', '/baby/babies/{id}'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:DELETE:BABY_DELETE');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:BABY_LOG_CREATE', 'Create baby log', 'API', 'POST', '/baby/babies/{id}/logs'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:BABY_LOG_CREATE');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:BABY_LOG_LIST', 'Get baby logs', 'API', 'GET', '/baby/babies/{id}/logs'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:BABY_LOG_LIST');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:BABY_VACCINATION_CREATE', 'Create vaccination record', 'API', 'POST', '/baby/babies/{id}/vaccinations'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:BABY_VACCINATION_CREATE');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:BABY_VACCINATION_LIST', 'Get vaccination records', 'API', 'GET', '/baby/babies/{id}/vaccinations'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:BABY_VACCINATION_LIST');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:BABY_GROWTH_CREATE', 'Create growth record', 'API', 'POST', '/baby/babies/{id}/growth-records'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:BABY_GROWTH_CREATE');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:BABY_GROWTH_LIST', 'Get growth records', 'API', 'GET', '/baby/babies/{id}/growth-records'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:BABY_GROWTH_LIST');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:BABY_SUMMARY', 'Get baby daily summary', 'API', 'GET', '/baby/babies/{id}/summary'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:BABY_SUMMARY');

INSERT INTO tbl_role_has_permission (role_id, permission_id)
SELECT roles.role_id, p.id
FROM tbl_permission p
CROSS JOIN (VALUES (1), (2), (3)) AS roles(role_id)
WHERE p.name IN (
    'API:POST:BABY_CREATE',
    'API:GET:BABY_LIST',
    'API:GET:BABY_DETAIL',
    'API:PUT:BABY_UPDATE',
    'API:DELETE:BABY_DELETE',
    'API:POST:BABY_LOG_CREATE',
    'API:GET:BABY_LOG_LIST',
    'API:POST:BABY_VACCINATION_CREATE',
    'API:GET:BABY_VACCINATION_LIST',
    'API:POST:BABY_GROWTH_CREATE',
    'API:GET:BABY_GROWTH_LIST',
    'API:GET:BABY_SUMMARY'
)
AND NOT EXISTS (
    SELECT 1
    FROM tbl_role_has_permission rhp
    WHERE rhp.role_id = roles.role_id
      AND rhp.permission_id = p.id
);
