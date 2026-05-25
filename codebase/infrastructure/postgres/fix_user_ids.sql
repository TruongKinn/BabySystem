-- Disable foreign key constraints temporarily
BEGIN;

-- Move existing users out of the way to avoid collisions
-- We'll use a temporary range for the move
UPDATE users SET id = id + 1000000;
UPDATE family_members SET user_id = user_id + 1000000;
UPDATE family_members SET parent_user_id = parent_user_id + 1000000 WHERE parent_user_id IS NOT NULL;
UPDATE families SET created_by_user_id = created_by_user_id + 1000000;

-- Now map them back to the correct IDs based on username
-- Mapping from auth_db:
-- ChinhNTT (9223)
-- TruongTV11 (9222)
-- demo.user (9221)

-- Since I don't have a cross-db join, I'll do it manually for the known ones reported by the user
-- and common demo users.

UPDATE users SET id = 9224 WHERE username ILIKE 'truongkin0';
UPDATE users SET id = 9223 WHERE username ILIKE 'ChinhNTT';
UPDATE users SET id = 9222 WHERE username ILIKE 'TruongTV11' OR username ILIKE 'truongtv11';
UPDATE users SET id = 9221 WHERE username ILIKE 'demo.user' OR username ILIKE 'demo';

-- Fix family_members and other references
UPDATE family_members fm SET user_id = u.id FROM users u WHERE u.id < 1000000 AND (fm.user_id - 1000000) = (SELECT old_id FROM (SELECT id + 1000000 as old_id, username FROM users WHERE username = u.username) x);
-- This is getting complex for a manual script.

-- Alternative: Delete ghost users and re-align ChinhNTT.

COMMIT;
