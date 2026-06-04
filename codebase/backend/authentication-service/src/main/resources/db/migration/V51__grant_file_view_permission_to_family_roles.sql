-- Grant API:GET:FILE_FILES_PARAM_VIEW to family roles (1 = MOM, 2 = DAD, 3 = GRANDMA/CAREGIVER)
INSERT INTO tbl_role_has_permission (role_id, permission_id)
SELECT roles.role_id, p.id
FROM tbl_permission p
CROSS JOIN (VALUES (1), (2), (3)) AS roles(role_id)
WHERE p.name = 'API:GET:FILE_FILES_PARAM_VIEW'
AND NOT EXISTS (
    SELECT 1
    FROM tbl_role_has_permission rhp
    WHERE rhp.role_id = roles.role_id
      AND rhp.permission_id = p.id
);
