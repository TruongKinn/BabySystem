-- Register API:DELETE:EXPENSE_CATEGORY_DELETE
INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:DELETE:EXPENSE_CATEGORY_DELETE', 'Delete expense category', 'API', 'DELETE', '/expense/categories/{id}'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:DELETE:EXPENSE_CATEGORY_DELETE');

-- Map permission to all roles
INSERT INTO tbl_role_has_permission (role_id, permission_id)
SELECT r.id, p.id
FROM tbl_role r
CROSS JOIN tbl_permission p
WHERE p.name = 'API:DELETE:EXPENSE_CATEGORY_DELETE'
AND NOT EXISTS (
    SELECT 1
    FROM tbl_role_has_permission rhp
    WHERE rhp.role_id = r.id
      AND rhp.permission_id = p.id
);

-- Correct typo in EXPENSE_CATEGORY_REPORT permission path
UPDATE tbl_permission
SET api_path = '/expense/expenses/reports/categories'
WHERE name = 'API:GET:EXPENSE_CATEGORY_REPORT';
