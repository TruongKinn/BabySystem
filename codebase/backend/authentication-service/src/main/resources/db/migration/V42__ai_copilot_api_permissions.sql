-- AI Copilot API permissions
INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:AI_COPILOT_CHAT', 'Ask the OpenAI-powered family copilot', 'API', 'POST', '/ai/copilot/chat'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:AI_COPILOT_CHAT');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:AI_COPILOT_STATUS', 'Read AI copilot service status', 'API', 'GET', '/ai/copilot/status'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:AI_COPILOT_STATUS');

INSERT INTO tbl_role_has_permission (role_id, permission_id)
SELECT roles.role_id, p.id
FROM tbl_permission p
CROSS JOIN (VALUES (1), (2), (3)) AS roles(role_id)
WHERE p.name IN (
    'API:POST:AI_COPILOT_CHAT',
    'API:GET:AI_COPILOT_STATUS'
)
AND NOT EXISTS (
    SELECT 1
    FROM tbl_role_has_permission rhp
    WHERE rhp.role_id = roles.role_id
      AND rhp.permission_id = p.id
);
