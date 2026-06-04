-- Travel Plans API Permissions
-- Permission: GET /baby/travel-plans/family/{familyId}
INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:TRAVEL_PLANS_LIST', 'Get travel plans for family', 'API', 'GET', '/baby/travel-plans/family/{familyId}'
WHERE NOT EXISTS (
    SELECT 1 FROM tbl_permission WHERE name = 'API:GET:TRAVEL_PLANS_LIST'
);

-- Permission: POST /baby/travel-plans
INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:TRAVEL_PLANS_CREATE', 'Create family travel plan', 'API', 'POST', '/baby/travel-plans'
WHERE NOT EXISTS (
    SELECT 1 FROM tbl_permission WHERE name = 'API:POST:TRAVEL_PLANS_CREATE'
);

-- Permission: PUT /baby/travel-plans/{planId}
INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:PUT:TRAVEL_PLANS_UPDATE', 'Update family travel plan', 'API', 'PUT', '/baby/travel-plans/{planId}'
WHERE NOT EXISTS (
    SELECT 1 FROM tbl_permission WHERE name = 'API:PUT:TRAVEL_PLANS_UPDATE'
);

-- Permission: DELETE /baby/travel-plans/{planId}
INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:DELETE:TRAVEL_PLANS_DELETE', 'Delete family travel plan', 'API', 'DELETE', '/baby/travel-plans/{planId}'
WHERE NOT EXISTS (
    SELECT 1 FROM tbl_permission WHERE name = 'API:DELETE:TRAVEL_PLANS_DELETE'
);

-- Assign permissions to family roles (1 = MOM, 2 = DAD, 3 = GRANDMA/CAREGIVER)
INSERT INTO tbl_role_has_permission (role_id, permission_id)
SELECT roles.role_id, p.id
FROM tbl_permission p
CROSS JOIN (VALUES (1), (2), (3)) AS roles(role_id)
WHERE p.name IN (
    'API:GET:TRAVEL_PLANS_LIST',
    'API:POST:TRAVEL_PLANS_CREATE',
    'API:PUT:TRAVEL_PLANS_UPDATE',
    'API:DELETE:TRAVEL_PLANS_DELETE'
)
AND NOT EXISTS (
    SELECT 1
    FROM tbl_role_has_permission rhp
    WHERE rhp.role_id = roles.role_id
      AND rhp.permission_id = p.id
);
