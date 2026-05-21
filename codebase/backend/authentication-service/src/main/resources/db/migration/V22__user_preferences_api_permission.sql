-- Create API permission for update preferences
INSERT INTO tbl_permission (name, description, type, api_method, api_path) 
SELECT 'API:PUT:USER_PREFERENCES', 'Update user preferences', 'API', 'PUT', '/account/api/users/{id}/preferences' 
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:PUT:USER_PREFERENCES');

-- Assign permissions to USER role (role_id = 1)
INSERT INTO tbl_role_has_permission (role_id, permission_id)
SELECT 1, p.id
FROM tbl_permission p
WHERE p.name IN (
    'API:PUT:USER_PREFERENCES',
    'API:POST:NOTIFICATION_CREATE',
    'API:GET:NOTIFICATION_LIST',
    'API:POST:NOTIFICATION_READ',
    'API:GET:NOTIFICATION_UNREAD_COUNT'
)
AND NOT EXISTS (
    SELECT 1
    FROM tbl_role_has_permission rhp
    WHERE rhp.role_id = 1
      AND rhp.permission_id = p.id
);
