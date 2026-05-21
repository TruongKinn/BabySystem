-- User-facing premium entitlement resolution endpoint
INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:FAMILY_FEATURES_RESOLVED', 'Resolve effective premium features for a household', 'API', 'GET', '/account/families/{id}/features/resolved'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:FAMILY_FEATURES_RESOLVED');

-- Admin premium feature catalog endpoint
INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:ADMIN_PREMIUM_FEATURES', 'Get premium feature catalog in admin workspace', 'API', 'GET', '/account/admin/premium/features'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:ADMIN_PREMIUM_FEATURES');

-- Admin family entitlement endpoints
INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:ADMIN_FAMILY_ENTITLEMENTS', 'Get premium entitlements by household in admin workspace', 'API', 'GET', '/account/admin/families/{id}/entitlements'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:ADMIN_FAMILY_ENTITLEMENTS');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:PUT:ADMIN_FAMILY_ENTITLEMENTS', 'Update premium entitlements by household in admin workspace', 'API', 'PUT', '/account/admin/families/{id}/entitlements'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:PUT:ADMIN_FAMILY_ENTITLEMENTS');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:ADMIN_FAMILY_ENTITLEMENT_AUDIT', 'Get premium entitlement audit logs by household in admin workspace', 'API', 'GET', '/account/admin/families/{id}/entitlements/audit'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:ADMIN_FAMILY_ENTITLEMENT_AUDIT');

-- Assign user endpoint permission to USER/ADMIN/OWNER
INSERT INTO tbl_role_has_permission (role_id, permission_id)
SELECT roles.role_id, p.id
FROM tbl_permission p
CROSS JOIN (VALUES (1), (2), (3)) AS roles(role_id)
WHERE p.name IN ('API:GET:FAMILY_FEATURES_RESOLVED')
AND NOT EXISTS (
    SELECT 1
    FROM tbl_role_has_permission rhp
    WHERE rhp.role_id = roles.role_id
      AND rhp.permission_id = p.id
);

-- Assign admin endpoints to ADMIN/OWNER only
INSERT INTO tbl_role_has_permission (role_id, permission_id)
SELECT r.id, p.id
FROM tbl_role r
JOIN tbl_permission p
  ON p.name IN (
    'API:GET:ADMIN_PREMIUM_FEATURES',
    'API:GET:ADMIN_FAMILY_ENTITLEMENTS',
    'API:PUT:ADMIN_FAMILY_ENTITLEMENTS',
    'API:GET:ADMIN_FAMILY_ENTITLEMENT_AUDIT'
  )
WHERE r.name IN ('ADMIN', 'OWNER')
AND NOT EXISTS (
    SELECT 1
    FROM tbl_role_has_permission rhp
    WHERE rhp.role_id = r.id
      AND rhp.permission_id = p.id
);
