-- Permission: POST /expense/invoices
INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:EXPENSE_INVOICES_CREATE', 'Create family invoice generator document metadata', 'API', 'POST', '/expense/invoices'
WHERE NOT EXISTS (
    SELECT 1 FROM tbl_permission WHERE name = 'API:POST:EXPENSE_INVOICES_CREATE'
);

-- Permission: GET /expense/invoices
INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:EXPENSE_INVOICES_LIST', 'Get family invoices list with pagination and search', 'API', 'GET', '/expense/invoices'
WHERE NOT EXISTS (
    SELECT 1 FROM tbl_permission WHERE name = 'API:GET:EXPENSE_INVOICES_LIST'
);

-- Permission: GET /expense/invoices/{id}
INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:EXPENSE_INVOICES_DETAIL', 'Get family invoice document metadata detail by ID', 'API', 'GET', '/expense/invoices/{id}'
WHERE NOT EXISTS (
    SELECT 1 FROM tbl_permission WHERE name = 'API:GET:EXPENSE_INVOICES_DETAIL'
);

-- Permission: DELETE /expense/invoices/{id}
INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:DELETE:EXPENSE_INVOICES_DELETE', 'Delete family invoice document metadata by ID', 'API', 'DELETE', '/expense/invoices/{id}'
WHERE NOT EXISTS (
    SELECT 1 FROM tbl_permission WHERE name = 'API:DELETE:EXPENSE_INVOICES_DELETE'
);

-- Assign permissions to roles (1, 2, 3)
INSERT INTO tbl_role_has_permission (role_id, permission_id)
SELECT roles.role_id, p.id
FROM tbl_permission p
CROSS JOIN (VALUES (1), (2), (3)) AS roles(role_id)
WHERE p.name IN (
    'API:POST:EXPENSE_INVOICES_CREATE',
    'API:GET:EXPENSE_INVOICES_LIST',
    'API:GET:EXPENSE_INVOICES_DETAIL',
    'API:DELETE:EXPENSE_INVOICES_DELETE'
)
AND NOT EXISTS (
    SELECT 1
    FROM tbl_role_has_permission rhp
    WHERE rhp.role_id = roles.role_id
      AND rhp.permission_id = p.id
);
