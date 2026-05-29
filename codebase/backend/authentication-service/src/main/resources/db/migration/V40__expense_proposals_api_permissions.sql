-- Permission: GET /expense/proposals
INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:EXPENSE_PROPOSALS', 'Get family expense proposals', 'API', 'GET', '/expense/proposals'
WHERE NOT EXISTS (
    SELECT 1 FROM tbl_permission WHERE name = 'API:GET:EXPENSE_PROPOSALS'
);

-- Permission: POST /expense/proposals
INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:EXPENSE_PROPOSALS', 'Create family expense proposal', 'API', 'POST', '/expense/proposals'
WHERE NOT EXISTS (
    SELECT 1 FROM tbl_permission WHERE name = 'API:POST:EXPENSE_PROPOSALS'
);

-- Permission: PUT /expense/proposals/{id}/approve
INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:PUT:EXPENSE_PROPOSAL_APPROVE', 'Approve expense proposal', 'API', 'PUT', '/expense/proposals/{id}/approve'
WHERE NOT EXISTS (
    SELECT 1 FROM tbl_permission WHERE name = 'API:PUT:EXPENSE_PROPOSAL_APPROVE'
);

-- Permission: PUT /expense/proposals/{id}/reject
INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:PUT:EXPENSE_PROPOSAL_REJECT', 'Reject expense proposal', 'API', 'PUT', '/expense/proposals/{id}/reject'
WHERE NOT EXISTS (
    SELECT 1 FROM tbl_permission WHERE name = 'API:PUT:EXPENSE_PROPOSAL_REJECT'
);

-- Permission: PUT /expense/proposals/{id}/resubmit
INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:PUT:EXPENSE_PROPOSAL_RESUBMIT', 'Resubmit rejected expense proposal', 'API', 'PUT', '/expense/proposals/{id}/resubmit'
WHERE NOT EXISTS (
    SELECT 1 FROM tbl_permission WHERE name = 'API:PUT:EXPENSE_PROPOSAL_RESUBMIT'
);

-- Assign permissions to roles (1, 2, 3)
INSERT INTO tbl_role_has_permission (role_id, permission_id)
SELECT roles.role_id, p.id
FROM tbl_permission p
CROSS JOIN (VALUES (1), (2), (3)) AS roles(role_id)
WHERE p.name IN (
    'API:GET:EXPENSE_PROPOSALS',
    'API:POST:EXPENSE_PROPOSALS',
    'API:PUT:EXPENSE_PROPOSAL_APPROVE',
    'API:PUT:EXPENSE_PROPOSAL_REJECT',
    'API:PUT:EXPENSE_PROPOSAL_RESUBMIT'
)
AND NOT EXISTS (
    SELECT 1
    FROM tbl_role_has_permission rhp
    WHERE rhp.role_id = roles.role_id
      AND rhp.permission_id = p.id
);
