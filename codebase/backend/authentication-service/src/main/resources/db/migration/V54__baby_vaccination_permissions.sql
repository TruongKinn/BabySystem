-- 1. Create permissions for Admin actions
INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:VACCINES_CREATE', 'Create vaccine category', 'API', 'POST', '/baby/vaccines'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:VACCINES_CREATE');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:PUT:VACCINES_UPDATE', 'Update vaccine category', 'API', 'PUT', '/baby/vaccines/{id}'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:PUT:VACCINES_UPDATE');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:VACCINE_CONFIGS_CREATE', 'Create vaccine schedule configuration', 'API', 'POST', '/baby/vaccines/{vaccineId}/schedule-configs'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:VACCINE_CONFIGS_CREATE');

-- 2. Create permissions for User actions
INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:BABY_VACCINATION_COMPLETE', 'Complete a baby vaccination dose', 'API', 'POST', '/baby/babies/{id}/vaccinations/{vaccinationId}/complete'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:BABY_VACCINATION_COMPLETE');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:BABY_VACCINATION_POSTPONE', 'Postpone a baby vaccination dose', 'API', 'POST', '/baby/babies/{id}/vaccinations/{vaccinationId}/postpone'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:BABY_VACCINATION_POSTPONE');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:BABY_VACCINATION_SCAN', 'AI scan baby vaccination record', 'API', 'POST', '/baby/babies/{id}/vaccinations/scan'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:BABY_VACCINATION_SCAN');

-- 3. Grant Admin permissions to ROLE_ADMIN (role_id = 2)
INSERT INTO tbl_role_has_permission (role_id, permission_id)
SELECT 2, p.id
FROM tbl_permission p
WHERE p.name IN (
    'API:POST:VACCINES_CREATE',
    'API:PUT:VACCINES_UPDATE',
    'API:POST:VACCINE_CONFIGS_CREATE'
)
AND NOT EXISTS (
    SELECT 1 FROM tbl_role_has_permission rhp
    WHERE rhp.role_id = 2 AND rhp.permission_id = p.id
);

-- 4. Grant User permissions to USER, ADMIN, OWNER (role_id = 1, 2, 3)
INSERT INTO tbl_role_has_permission (role_id, permission_id)
SELECT roles.role_id, p.id
FROM tbl_permission p
CROSS JOIN (VALUES (1), (2), (3)) AS roles(role_id)
WHERE p.name IN (
    'API:POST:BABY_VACCINATION_COMPLETE',
    'API:POST:BABY_VACCINATION_POSTPONE',
    'API:POST:BABY_VACCINATION_SCAN'
)
AND NOT EXISTS (
    SELECT 1 FROM tbl_role_has_permission rhp
    WHERE rhp.role_id = roles.role_id AND rhp.permission_id = p.id
);
