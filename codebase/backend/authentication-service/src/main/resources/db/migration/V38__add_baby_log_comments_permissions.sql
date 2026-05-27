INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:BABY_LOG_COMMENT_CREATE', 'Create baby log comment', 'API', 'POST', '/baby/babies/logs/{id}/comments'
WHERE NOT EXISTS (
    SELECT 1 FROM tbl_permission WHERE name = 'API:POST:BABY_LOG_COMMENT_CREATE'
);

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:BABY_LOG_COMMENT_LIST', 'Get baby log comments', 'API', 'GET', '/baby/babies/logs/{id}/comments'
WHERE NOT EXISTS (
    SELECT 1 FROM tbl_permission WHERE name = 'API:GET:BABY_LOG_COMMENT_LIST'
);

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:DELETE:BABY_LOG_COMMENT_DELETE', 'Delete baby log comment', 'API', 'DELETE', '/baby/babies/logs/comments/{id}'
WHERE NOT EXISTS (
    SELECT 1 FROM tbl_permission WHERE name = 'API:DELETE:BABY_LOG_COMMENT_DELETE'
);

INSERT INTO tbl_role_has_permission (role_id, permission_id)
SELECT roles.role_id, p.id
FROM tbl_permission p
CROSS JOIN (VALUES (1), (2), (3)) AS roles(role_id)
WHERE p.name IN (
    'API:POST:BABY_LOG_COMMENT_CREATE', 
    'API:GET:BABY_LOG_COMMENT_LIST', 
    'API:DELETE:BABY_LOG_COMMENT_DELETE'
)
AND NOT EXISTS (
    SELECT 1
    FROM tbl_role_has_permission rhp
    WHERE rhp.role_id = roles.role_id
      AND rhp.permission_id = p.id
);
