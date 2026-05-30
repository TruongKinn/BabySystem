INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:DOCUMENT_CATEGORY_LIST', 'Get document categories list', 'API', 'GET', '/file/document-categories'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:DOCUMENT_CATEGORY_LIST');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:DOCUMENT_CATEGORY_CREATE', 'Create document category', 'API', 'POST', '/file/document-categories'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:DOCUMENT_CATEGORY_CREATE');

INSERT INTO tbl_role_has_permission (role_id, permission_id)
SELECT roles.role_id, p.id
FROM tbl_permission p
CROSS JOIN (VALUES (1), (2), (3)) AS roles(role_id)
WHERE p.name IN (
    'API:GET:DOCUMENT_CATEGORY_LIST',
    'API:POST:DOCUMENT_CATEGORY_CREATE'
)
AND NOT EXISTS (
    SELECT 1
    FROM tbl_role_has_permission rhp
    WHERE rhp.role_id = roles.role_id
      AND rhp.permission_id = p.id
);
