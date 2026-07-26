-- Create vaccines table
CREATE TABLE IF NOT EXISTS vaccines (
    id bigserial PRIMARY KEY,
    name varchar(160) NOT NULL UNIQUE,
    manufacturer varchar(120),
    disease_prevented varchar(255) NOT NULL,
    total_doses integer NOT NULL DEFAULT 1,
    description text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Create configs table
CREATE TABLE IF NOT EXISTS vaccine_schedule_configs (
    id bigserial PRIMARY KEY,
    vaccine_id bigint NOT NULL,
    dose_number integer NOT NULL,
    recommended_age_months integer NOT NULL,
    min_days_since_previous_dose integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_configs_vaccine FOREIGN KEY (vaccine_id) REFERENCES vaccines(id) ON DELETE CASCADE,
    CONSTRAINT uq_vaccine_dose UNIQUE (vaccine_id, dose_number)
);

-- Alter vaccinations table to add new columns
ALTER TABLE vaccinations ADD COLUMN IF NOT EXISTS vaccine_id bigint;
ALTER TABLE vaccinations ADD COLUMN IF NOT EXISTS dose_number integer NOT NULL DEFAULT 1;
ALTER TABLE vaccinations ADD COLUMN IF NOT EXISTS facility varchar(200);
ALTER TABLE vaccinations ADD COLUMN IF NOT EXISTS post_reaction varchar(500);
ALTER TABLE vaccinations ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'PENDING';

-- Create foreign key constraint
ALTER TABLE vaccinations ADD CONSTRAINT fk_vaccinations_vaccine FOREIGN KEY (vaccine_id) REFERENCES vaccines(id) ON DELETE SET NULL;

-- Create unique constraint to prevent duplicate entry
ALTER TABLE vaccinations ADD CONSTRAINT uq_baby_vaccine_dose UNIQUE (baby_id, vaccine_id, dose_number);

-- Insert sample vaccines
INSERT INTO vaccines (name, manufacturer, disease_prevented, total_doses, description) VALUES
('Lao (BCG)', 'IVAC (Việt Nam)', 'Lao phổi và lao màng não', 1, 'Tiêm trong vòng 30 ngày đầu sau sinh.'),
('Viêm gan B sơ sinh', 'Gene複 (Việt Nam)', 'Viêm gan virus B', 1, 'Tiêm trong vòng 24 giờ đầu sau sinh.'),
('6-trong-1 Hexaxim', 'Sanofi Pasteur (Pháp)', 'Bạch hầu, Ho gà, Uốn ván, Bại liệt, Viêm gan B, Hib', 3, 'Vắc-xin phối hợp thế hệ mới, tiêm 3 mũi chính.'),
('Phế cầu Synflorix', 'GSK (Bỉ)', 'Phế cầu khuẩn gây viêm phổi, viêm màng não, viêm tai giữa', 3, 'Phòng các bệnh do phế cầu khuẩn.');

-- Insert configs for Lao (BCG)
INSERT INTO vaccine_schedule_configs (vaccine_id, dose_number, recommended_age_months, min_days_since_previous_dose)
VALUES ((SELECT id FROM vaccines WHERE name = 'Lao (BCG)'), 1, 0, 0);

-- Insert configs for Viêm gan B sơ sinh
INSERT INTO vaccine_schedule_configs (vaccine_id, dose_number, recommended_age_months, min_days_since_previous_dose)
VALUES ((SELECT id FROM vaccines WHERE name = 'Viêm gan B sơ sinh'), 1, 0, 0);

-- Insert configs for 6-trong-1 Hexaxim
INSERT INTO vaccine_schedule_configs (vaccine_id, dose_number, recommended_age_months, min_days_since_previous_dose) VALUES
((SELECT id FROM vaccines WHERE name = '6-trong-1 Hexaxim'), 1, 2, 0),
((SELECT id FROM vaccines WHERE name = '6-trong-1 Hexaxim'), 2, 3, 28),
((SELECT id FROM vaccines WHERE name = '6-trong-1 Hexaxim'), 3, 4, 28);

-- Insert configs for Phế cầu Synflorix
INSERT INTO vaccine_schedule_configs (vaccine_id, dose_number, recommended_age_months, min_days_since_previous_dose) VALUES
((SELECT id FROM vaccines WHERE name = 'Phế cầu Synflorix'), 1, 2, 0),
((SELECT id FROM vaccines WHERE name = 'Phế cầu Synflorix'), 2, 4, 60),
((SELECT id FROM vaccines WHERE name = 'Phế cầu Synflorix'), 3, 6, 60);

-- Update existing vaccination records with first vaccine ID as a fallback (if any exist)
UPDATE vaccinations SET vaccine_id = (SELECT id FROM vaccines WHERE name = 'Lao (BCG)') WHERE vaccine_id IS NULL;
