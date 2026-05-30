ALTER TABLE family_members ADD COLUMN is_host BOOLEAN DEFAULT FALSE;

-- Đồng bộ dữ liệu cũ: Đặt is_host = TRUE cho thành viên là người tạo ra gia đình
UPDATE family_members fm
SET is_host = TRUE
FROM families f
WHERE fm.family_id = f.id AND fm.user_id = f.created_by_user_id;
