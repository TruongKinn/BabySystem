INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:BABY_LOG_COMMENT_REACT', 'React to baby log comment', 'API', 'POST', '/baby/babies/logs/comments/{id}/react'
WHERE NOT EXISTS (
    SELECT 1 FROM tbl_permission WHERE name = 'API:POST:BABY_LOG_COMMENT_REACT'
);

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:DELETE:BABY_LOG_COMMENT_UNREACT', 'Remove reaction from baby log comment', 'API', 'DELETE', '/baby/babies/logs/comments/{id}/react'
WHERE NOT EXISTS (
    SELECT 1 FROM tbl_permission WHERE name = 'API:DELETE:BABY_LOG_COMMENT_UNREACT'
);

INSERT INTO tbl_role_has_permission (role_id, permission_id)
SELECT roles.role_id, p.id
FROM tbl_permission p
CROSS JOIN (VALUES (1), (2), (3)) AS roles(role_id)
WHERE p.name IN (
    'API:POST:BABY_LOG_COMMENT_REACT', 
    'API:DELETE:BABY_LOG_COMMENT_UNREACT'
)
AND NOT EXISTS (
    SELECT 1
    FROM tbl_role_has_permission rhp
    WHERE rhp.role_id = roles.role_id
      AND rhp.permission_id = p.id
);
