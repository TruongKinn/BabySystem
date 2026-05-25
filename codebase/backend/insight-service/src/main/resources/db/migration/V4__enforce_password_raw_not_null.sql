-- Ensure password_raw is never null for any existing record.
-- Records created before V3 migration (or records that slipped through with null)
-- are assigned a masked placeholder so the admin UI can display them without crashing.
UPDATE insight_export_files
SET password_raw = password_masked
WHERE password_raw IS NULL OR trim(password_raw) = '';

-- Enforce NOT NULL at the database level going forward.
ALTER TABLE insight_export_files
    ALTER COLUMN password_raw SET NOT NULL;
