-- Add password_raw column to insight_export_files to allow admins to view the actual export password
ALTER TABLE insight_export_files ADD COLUMN password_raw VARCHAR(128);

-- Backfill temporary password for existing legacy records to allow testing the "eye" view password button immediately
UPDATE insight_export_files SET password_raw = '12345678' WHERE password_raw IS NULL;
