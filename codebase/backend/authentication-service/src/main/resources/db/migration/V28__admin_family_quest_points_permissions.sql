-- Admin family quest points endpoints
INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:ADMIN_FAMILY_QUEST_STATE', 'Get family quest state in admin workspace', 'API', 'GET', '/account/admin/families/{id}/quest-state'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:ADMIN_FAMILY_QUEST_STATE');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:ADMIN_FAMILY_QUEST_POINTS_GRANTS', 'Get family quest point grant logs in admin workspace', 'API', 'GET', '/account/admin/families/{id}/quest-points/grants'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:ADMIN_FAMILY_QUEST_POINTS_GRANTS');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:ADMIN_FAMILY_QUEST_POINTS_GRANT', 'Grant quest points to family in admin workspace', 'API', 'POST', '/account/admin/families/{id}/quest-points/grant'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:ADMIN_FAMILY_QUEST_POINTS_GRANT');

-- Assign admin endpoints to ADMIN/OWNER only
INSERT INTO tbl_role_has_permission (role_id, permission_id)
SELECT r.id, p.id
FROM tbl_role r
JOIN tbl_permission p
  ON p.name IN (
    'API:GET:ADMIN_FAMILY_QUEST_STATE',
    'API:GET:ADMIN_FAMILY_QUEST_POINTS_GRANTS',
    'API:POST:ADMIN_FAMILY_QUEST_POINTS_GRANT'
  )
WHERE r.name IN ('ADMIN', 'OWNER')
AND NOT EXISTS (
    SELECT 1
    FROM tbl_role_has_permission rhp
    WHERE rhp.role_id = r.id
      AND rhp.permission_id = p.id
);
