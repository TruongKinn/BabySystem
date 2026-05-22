-- Family quest reward endpoints
INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:FAMILY_QUEST_REWARDS_CATALOG', 'Get quest reward catalog by household', 'API', 'GET', '/account/families/{id}/quest-rewards/catalog'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:FAMILY_QUEST_REWARDS_CATALOG');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:FAMILY_QUEST_REWARDS_REDEMPTIONS', 'Get quest reward redemption history by household', 'API', 'GET', '/account/families/{id}/quest-rewards/redemptions'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:FAMILY_QUEST_REWARDS_REDEMPTIONS');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:FAMILY_QUEST_REWARDS_REDEEM', 'Redeem quest reward by household', 'API', 'POST', '/account/families/{id}/quest-rewards/redeem'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:FAMILY_QUEST_REWARDS_REDEEM');

-- Assign to USER/ADMIN/OWNER
INSERT INTO tbl_role_has_permission (role_id, permission_id)
SELECT roles.role_id, p.id
FROM tbl_permission p
CROSS JOIN (VALUES (1), (2), (3)) AS roles(role_id)
WHERE p.name IN (
    'API:GET:FAMILY_QUEST_REWARDS_CATALOG',
    'API:GET:FAMILY_QUEST_REWARDS_REDEMPTIONS',
    'API:POST:FAMILY_QUEST_REWARDS_REDEEM'
)
AND NOT EXISTS (
    SELECT 1
    FROM tbl_role_has_permission rhp
    WHERE rhp.role_id = roles.role_id
      AND rhp.permission_id = p.id
);
