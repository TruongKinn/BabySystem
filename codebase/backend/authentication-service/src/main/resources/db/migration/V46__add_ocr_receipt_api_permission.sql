-- AI Copilot OCR Receipt API permission
INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:AI_COPILOT_OCR_RECEIPT', 'Extract data from family receipts using AI OCR', 'API', 'POST', '/ai/copilot/ocr-receipt'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:AI_COPILOT_OCR_RECEIPT');

INSERT INTO tbl_role_has_permission (role_id, permission_id)
SELECT roles.role_id, p.id
FROM tbl_permission p
CROSS JOIN (VALUES (1), (2), (3)) AS roles(role_id)
WHERE p.name = 'API:POST:AI_COPILOT_OCR_RECEIPT'
AND NOT EXISTS (
    SELECT 1
    FROM tbl_role_has_permission rhp
    WHERE rhp.role_id = roles.role_id
      AND rhp.permission_id = p.id
);
