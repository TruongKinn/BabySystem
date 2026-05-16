-- Add Permission for meal plan range search
INSERT INTO tbl_permission (name, description, type, api_method, api_path) 
SELECT 'API:GET:MEAL_PLAN_RANGE', 'Get meal plans by range', 'API', 'GET', '/meal/meal-plans/range' 
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:MEAL_PLAN_RANGE');

-- Assign to all roles
INSERT INTO tbl_role_has_permission (role_id, permission_id)
SELECT r.id, p.id
FROM tbl_role r, tbl_permission p
WHERE p.name = 'API:GET:MEAL_PLAN_RANGE'
AND NOT EXISTS (
    SELECT 1 FROM tbl_role_has_permission rhp 
    WHERE rhp.role_id = r.id AND rhp.permission_id = p.id
);
