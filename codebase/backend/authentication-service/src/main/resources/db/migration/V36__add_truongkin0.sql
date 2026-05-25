-- Insert truongkin0 (ADMIN)
INSERT INTO tbl_user (username, password, email, first_name, last_name, status, type, is_two_factor_enabled) 
VALUES ('truongkin0', '$2a$10$nf2BhoHAOmzV4mznmP4SP.iLCksqnv8LdsBzOQOYZU4/zkIXy6bS.', 'truongkin0@local', 'Truong', 'Kinn', 'ACTIVE', 'ADMIN', false)
ON CONFLICT (username) DO NOTHING;

-- Assign Admin role (id: 2) to truongkin0
INSERT INTO tbl_user_has_role (user_id, role_id) 
SELECT u.id, 2 FROM tbl_user u WHERE u.username = 'truongkin0'
AND NOT EXISTS (SELECT 1 FROM tbl_user_has_role ur WHERE ur.user_id = u.id AND ur.role_id = 2);
