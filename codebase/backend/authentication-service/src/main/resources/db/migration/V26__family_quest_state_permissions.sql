-- Family quest state endpoints
INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:FAMILY_QUEST_STATE', 'Get family quest state by household', 'API', 'GET', '/account/families/{id}/quest-state'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:FAMILY_QUEST_STATE');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:FAMILY_QUEST_CLAIM', 'Claim family quest daily reward', 'API', 'POST', '/account/families/{id}/quest-state/claim'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:FAMILY_QUEST_CLAIM');

-- Assign to USER/ADMIN/OWNER
INSERT INTO tbl_role_has_permission (role_id, permission_id)
SELECT roles.role_id, p.id
FROM tbl_permission p
CROSS JOIN (VALUES (1), (2), (3)) AS roles(role_id)
WHERE p.name IN ('API:GET:FAMILY_QUEST_STATE', 'API:POST:FAMILY_QUEST_CLAIM')
AND NOT EXISTS (
    SELECT 1
    FROM tbl_role_has_permission rhp
    WHERE rhp.role_id = roles.role_id
      AND rhp.permission_id = p.id
);
