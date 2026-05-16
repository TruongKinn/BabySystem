INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:FILE_UPLOAD', 'Upload file to MinIO', 'API', 'POST', '/file/files/upload'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:FILE_UPLOAD');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:FILE_LIST', 'Get file list', 'API', 'GET', '/file/files'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:FILE_LIST');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:FILE_DETAIL', 'Get file detail', 'API', 'GET', '/file/files/{id}'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:FILE_DETAIL');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:FILE_DOWNLOAD_URL', 'Generate file download url', 'API', 'GET', '/file/files/{id}/download-url'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:FILE_DOWNLOAD_URL');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:DELETE:FILE_DELETE', 'Delete file metadata and object', 'API', 'DELETE', '/file/files/{id}'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:DELETE:FILE_DELETE');

INSERT INTO tbl_role_has_permission (role_id, permission_id)
SELECT roles.role_id, p.id
FROM tbl_permission p
CROSS JOIN (VALUES (1), (2), (3)) AS roles(role_id)
WHERE p.name IN (
    'API:POST:FILE_UPLOAD',
    'API:GET:FILE_LIST',
    'API:GET:FILE_DETAIL',
    'API:GET:FILE_DOWNLOAD_URL',
    'API:DELETE:FILE_DELETE'
)
AND NOT EXISTS (
    SELECT 1
    FROM tbl_role_has_permission rhp
    WHERE rhp.role_id = roles.role_id
      AND rhp.permission_id = p.id
);
