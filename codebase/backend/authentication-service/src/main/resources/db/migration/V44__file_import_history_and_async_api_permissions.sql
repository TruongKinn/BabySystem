INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:FILE_IMPORT_ASYNC', 'Upload and parse excel asynchronously', 'API', 'POST', '/file/files/import/async'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:FILE_IMPORT_ASYNC');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:FILE_IMPORT_HISTORY', 'Get background excel import history', 'API', 'GET', '/file/files/import/history'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:FILE_IMPORT_HISTORY');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:FILE_IMPORT_HISTORY_DETAIL', 'Get background excel import history detail', 'API', 'GET', '/file/files/import/history/{id}'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:FILE_IMPORT_HISTORY_DETAIL');

INSERT INTO tbl_role_has_permission (role_id, permission_id)
SELECT roles.role_id, p.id
FROM tbl_permission p
CROSS JOIN (VALUES (1), (2), (3)) AS roles(role_id)
WHERE p.name IN (
    'API:POST:FILE_IMPORT_ASYNC',
    'API:GET:FILE_IMPORT_HISTORY',
    'API:GET:FILE_IMPORT_HISTORY_DETAIL'
)
AND NOT EXISTS (
    SELECT 1
    FROM tbl_role_has_permission rhp
    WHERE rhp.role_id = roles.role_id
      AND rhp.permission_id = p.id
);
