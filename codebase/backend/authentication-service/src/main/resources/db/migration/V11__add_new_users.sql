-- Insert truongtv11 (ADMIN)
INSERT INTO tbl_user (username, password, email, first_name, last_name, status, type, is_two_factor_enabled) 
VALUES ('truongtv11', '$2a$10$nf2BhoHAOmzV4mznmP4SP.iLCksqnv8LdsBzOQOYZU4/zkIXy6bS.', 'truongtv11@local', 'Truong', 'TV11', 'ACTIVE', 'ADMIN', false)
ON CONFLICT (username) DO NOTHING;

-- Insert chinhntt (USER)
INSERT INTO tbl_user (username, password, email, first_name, last_name, status, type, is_two_factor_enabled) 
VALUES ('chinhntt', '$2a$10$nf2BhoHAOmzV4mznmP4SP.iLCksqnv8LdsBzOQOYZU4/zkIXy6bS.', 'chinhntt@local', 'Chinh', 'NTT', 'ACTIVE', 'USER', false)
ON CONFLICT (username) DO NOTHING;

-- Assign Admin role (id: 2) to truongtv11
INSERT INTO tbl_user_has_role (user_id, role_id) 
SELECT u.id, 2 FROM tbl_user u WHERE u.username = 'truongtv11'
AND NOT EXISTS (SELECT 1 FROM tbl_user_has_role ur WHERE ur.user_id = u.id AND ur.role_id = 2);

-- Assign User role (id: 1) to chinhntt
INSERT INTO tbl_user_has_role (user_id, role_id) 
SELECT u.id, 1 FROM tbl_user u WHERE u.username = 'chinhntt'
AND NOT EXISTS (SELECT 1 FROM tbl_user_has_role ur WHERE ur.user_id = u.id AND ur.role_id = 1);
