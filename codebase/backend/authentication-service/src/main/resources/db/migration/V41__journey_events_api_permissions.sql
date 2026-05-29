-- Journey Events API Permissions
INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:JOURNEY_EVENT_CREATE', 'Create journey event', 'API', 'POST', '/baby/babies/{babyId}/journey-events'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:JOURNEY_EVENT_CREATE');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:JOURNEY_EVENT_LIST', 'Get journey events', 'API', 'GET', '/baby/babies/{babyId}/journey-events'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:JOURNEY_EVENT_LIST');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:DELETE:JOURNEY_EVENT_DELETE', 'Delete journey event', 'API', 'DELETE', '/baby/babies/{babyId}/journey-events/{eventId}'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:DELETE:JOURNEY_EVENT_DELETE');

-- Grant to all family roles (1 = MOM, 2 = DAD, 3 = GRANDMA/CAREGIVER)
INSERT INTO tbl_role_has_permission (role_id, permission_id)
SELECT roles.role_id, p.id
FROM tbl_permission p
CROSS JOIN (VALUES (1), (2), (3)) AS roles(role_id)
WHERE p.name IN (
    'API:POST:JOURNEY_EVENT_CREATE',
    'API:GET:JOURNEY_EVENT_LIST',
    'API:DELETE:JOURNEY_EVENT_DELETE'
)
AND NOT EXISTS (
    SELECT 1
    FROM tbl_role_has_permission rhp
    WHERE rhp.role_id = roles.role_id
      AND rhp.permission_id = p.id
);
