\set ON_ERROR_STOP on

-- ============================================================
-- Seed account login + 20 records/service baseline
-- Login account:
--   username: baby.demo20
--   password: admin123
-- ============================================================

-- =============================================
-- AUTH DB
-- =============================================
\connect auth_db

INSERT INTO tbl_user (
    id, username, password, email, first_name, last_name,
    status, type, is_two_factor_enabled, require_password_change, avatar_url
)
VALUES
    (
        9201,
        'baby.demo20',
        '$2a$10$0zfDuSov6Wv1QL88wTv.9enhPaJMdQd4RUdRqVN7AeURV3xPInoMC',
        'baby.demo20@local',
        'Baby',
        'Demo',
        'ACTIVE',
        'USER',
        false,
        false,
        null
    )
ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    password = EXCLUDED.password,
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    status = EXCLUDED.status,
    type = EXCLUDED.type,
    is_two_factor_enabled = EXCLUDED.is_two_factor_enabled,
    require_password_change = EXCLUDED.require_password_change,
    avatar_url = EXCLUDED.avatar_url;

INSERT INTO tbl_user (
    id, username, password, email, first_name, last_name,
    status, type, is_two_factor_enabled, require_password_change, avatar_url
)
SELECT
    gs,
    format('baby.member.%s', gs),
    '$2a$10$0zfDuSov6Wv1QL88wTv.9enhPaJMdQd4RUdRqVN7AeURV3xPInoMC',
    format('baby.member.%s@local', gs),
    'Baby',
    format('Member %s', gs),
    'ACTIVE',
    'USER',
    false,
    false,
    null
FROM generate_series(9202, 9220) AS gs
ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    password = EXCLUDED.password,
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    status = EXCLUDED.status,
    type = EXCLUDED.type,
    is_two_factor_enabled = EXCLUDED.is_two_factor_enabled,
    require_password_change = EXCLUDED.require_password_change,
    avatar_url = EXCLUDED.avatar_url;

INSERT INTO tbl_user_has_role (user_id, role_id)
SELECT u.id, r.id
FROM tbl_user u
JOIN tbl_role r ON r.name IN ('USER', 'ADMIN')
WHERE u.id BETWEEN 9201 AND 9220
  AND NOT EXISTS (
      SELECT 1
      FROM tbl_user_has_role ur
      WHERE ur.user_id = u.id
        AND ur.role_id = r.id
  );

SELECT setval(pg_get_serial_sequence('tbl_user', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM tbl_user), 1), true);
SELECT setval(pg_get_serial_sequence('tbl_user_has_role', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM tbl_user_has_role), 1), true);

-- =============================================
-- ACCOUNT DB
-- =============================================
\connect account_db

INSERT INTO users (id, username, email, display_name, created_at)
VALUES (9201, 'baby.demo20', 'baby.demo20@family.local', 'Baby Demo 20', now() - interval '20 days')
ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    display_name = EXCLUDED.display_name;

INSERT INTO users (id, username, email, display_name, created_at)
SELECT
    gs,
    format('baby.member.%s', gs),
    format('baby.member.%s@family.local', gs),
    format('Baby Member %s', gs),
    now() - (gs - 9200) * interval '1 day'
FROM generate_series(9202, 9220) AS gs
ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    display_name = EXCLUDED.display_name;

INSERT INTO families (id, name, created_by_user_id, created_at)
VALUES (9201, 'Demo Family 20', 9201, now() - interval '20 days')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    created_by_user_id = EXCLUDED.created_by_user_id;

INSERT INTO family_members (family_id, user_id, role, joined_at)
SELECT
    9201,
    u.id,
    CASE
        WHEN u.id = 9201 THEN 'MOM'
        WHEN u.id = 9202 THEN 'DAD'
        WHEN (u.id % 5) = 0 THEN 'GRANDMA'
        ELSE 'CAREGIVER'
    END,
    now() - (u.id - 9200) * interval '1 day'
FROM users u
WHERE u.id BETWEEN 9201 AND 9220
  AND NOT EXISTS (
      SELECT 1
      FROM family_members fm
      WHERE fm.family_id = 9201
        AND fm.user_id = u.id
  );

SELECT setval(pg_get_serial_sequence('users', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM users), 1), true);
SELECT setval(pg_get_serial_sequence('families', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM families), 1), true);
SELECT setval(pg_get_serial_sequence('family_members', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM family_members), 1), true);

-- =============================================
-- EXPENSE DB
-- =============================================
\connect expense_db

INSERT INTO expense_categories (family_id, name, color_code, is_default, created_at)
SELECT
    9201,
    format('Demo Category %s', lpad(gs::text, 2, '0')),
    '#' || substr(md5(format('cat-%s', gs)), 1, 6),
    gs = 1,
    now() - gs * interval '1 day'
FROM generate_series(1, 20) AS gs
ON CONFLICT (family_id, name) DO UPDATE SET
    color_code = EXCLUDED.color_code,
    is_default = EXCLUDED.is_default;

INSERT INTO budgets (family_id, month_key, limit_amount, created_at, updated_at)
SELECT
    9201,
    to_char(date_trunc('month', current_date) - (gs - 1) * interval '1 month', 'YYYY-MM'),
    (15000000 + gs * 250000)::numeric(14,2),
    now(),
    now()
FROM generate_series(1, 20) AS gs
ON CONFLICT (family_id, month_key) DO UPDATE SET
    limit_amount = EXCLUDED.limit_amount,
    updated_at = now();

WITH category_pool AS (
    SELECT id, row_number() OVER (ORDER BY id) AS rn
    FROM expense_categories
    WHERE family_id = 9201
    ORDER BY id
    LIMIT 20
)
INSERT INTO expenses (family_id, category_id, amount, currency, note, spent_at, created_at, updated_at)
SELECT
    9201,
    cp.id,
    (50000 + gs * 10000)::numeric(14,2),
    'VND',
    format('Demo expense %s', lpad(gs::text, 2, '0')),
    now() - gs * interval '1 day',
    now() - gs * interval '1 day',
    now() - gs * interval '1 day'
FROM generate_series(1, 20) AS gs
JOIN category_pool cp ON cp.rn = gs
WHERE NOT EXISTS (
    SELECT 1
    FROM expenses e
    WHERE e.family_id = 9201
      AND e.note = format('Demo expense %s', lpad(gs::text, 2, '0'))
);

SELECT setval(pg_get_serial_sequence('expense_categories', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM expense_categories), 1), true);
SELECT setval(pg_get_serial_sequence('budgets', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM budgets), 1), true);
SELECT setval(pg_get_serial_sequence('expenses', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM expenses), 1), true);

-- =============================================
-- MEAL DB
-- =============================================
\connect meal_db

INSERT INTO meals (family_id, name, meal_type, description, created_at)
SELECT
    9201,
    format('Demo Meal %s', lpad(gs::text, 2, '0')),
    (ARRAY['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'])[1 + ((gs - 1) % 4)],
    format('Demo meal description %s', lpad(gs::text, 2, '0')),
    now() - gs * interval '1 day'
FROM generate_series(1, 20) AS gs
ON CONFLICT (family_id, name) DO UPDATE SET
    meal_type = EXCLUDED.meal_type,
    description = EXCLUDED.description;

WITH meal_pool AS (
    SELECT id, row_number() OVER (ORDER BY id) AS rn
    FROM meals
    WHERE family_id = 9201
    ORDER BY id
    LIMIT 20
)
INSERT INTO meal_plans (family_id, meal_id, plan_date, notes, created_at, updated_at)
SELECT
    9201,
    mp.id,
    current_date + (gs - 1),
    format('Demo meal plan %s', lpad(gs::text, 2, '0')),
    now(),
    now()
FROM generate_series(1, 20) AS gs
JOIN meal_pool mp ON mp.rn = gs
ON CONFLICT (family_id, meal_id, plan_date) DO UPDATE SET
    notes = EXCLUDED.notes,
    updated_at = now();

SELECT setval(pg_get_serial_sequence('meals', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM meals), 1), true);
SELECT setval(pg_get_serial_sequence('meal_plans', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM meal_plans), 1), true);

-- =============================================
-- BABY DB
-- =============================================
\connect baby_db

INSERT INTO babies (family_id, name, birth_date, gender, notes, created_at, updated_at)
SELECT
    9201,
    format('Demo Baby %s', lpad(gs::text, 2, '0')),
    current_date - (300 + gs),
    (ARRAY['MALE', 'FEMALE', 'OTHER'])[1 + ((gs - 1) % 3)],
    format('Seed note for demo baby %s', lpad(gs::text, 2, '0')),
    now() - gs * interval '1 day',
    now()
FROM generate_series(1, 20) AS gs
WHERE NOT EXISTS (
    SELECT 1
    FROM babies b
    WHERE b.family_id = 9201
      AND b.name = format('Demo Baby %s', lpad(gs::text, 2, '0'))
);

WITH target_baby AS (
    SELECT id
    FROM babies
    WHERE family_id = 9201
    ORDER BY id
    LIMIT 1
)
INSERT INTO baby_logs (baby_id, log_type, value, note, logged_at, created_at)
SELECT
    tb.id,
    (ARRAY['FEEDING', 'SLEEP', 'DIAPER'])[1 + ((gs - 1) % 3)],
    (2.5 + gs * 0.3)::numeric(10,2),
    format('Demo baby log %s', lpad(gs::text, 2, '0')),
    now() - gs * interval '1 hour',
    now() - gs * interval '1 hour'
FROM generate_series(1, 20) AS gs
CROSS JOIN target_baby tb
WHERE NOT EXISTS (
    SELECT 1
    FROM baby_logs bl
    WHERE bl.baby_id = tb.id
      AND bl.note = format('Demo baby log %s', lpad(gs::text, 2, '0'))
);

WITH target_baby AS (
    SELECT id
    FROM babies
    WHERE family_id = 9201
    ORDER BY id
    LIMIT 1
)
INSERT INTO vaccinations (baby_id, vaccine_name, due_date, completed, completed_at, notes, created_at)
SELECT
    tb.id,
    format('Demo Vaccine %s', lpad(gs::text, 2, '0')),
    current_date + gs,
    (gs % 4) = 0,
    CASE WHEN (gs % 4) = 0 THEN now() - gs * interval '2 day' ELSE null END,
    format('Demo vaccination note %s', lpad(gs::text, 2, '0')),
    now() - gs * interval '1 day'
FROM generate_series(1, 20) AS gs
CROSS JOIN target_baby tb
WHERE NOT EXISTS (
    SELECT 1
    FROM vaccinations v
    WHERE v.baby_id = tb.id
      AND v.vaccine_name = format('Demo Vaccine %s', lpad(gs::text, 2, '0'))
);

WITH target_baby AS (
    SELECT id
    FROM babies
    WHERE family_id = 9201
    ORDER BY id
    LIMIT 1
)
INSERT INTO growth_records (
    baby_id, measured_at, weight_kg, height_cm, head_circumference_cm, notes, created_at
)
SELECT
    tb.id,
    current_date - gs,
    (6.0 + gs * 0.12)::numeric(5,2),
    (58.0 + gs * 0.45)::numeric(5,2),
    (37.0 + gs * 0.18)::numeric(5,2),
    format('Demo growth record %s', lpad(gs::text, 2, '0')),
    now() - gs * interval '1 day'
FROM generate_series(1, 20) AS gs
CROSS JOIN target_baby tb
WHERE NOT EXISTS (
    SELECT 1
    FROM growth_records gr
    WHERE gr.baby_id = tb.id
      AND gr.measured_at = current_date - gs
);

SELECT setval(pg_get_serial_sequence('babies', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM babies), 1), true);
SELECT setval(pg_get_serial_sequence('baby_logs', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM baby_logs), 1), true);
SELECT setval(pg_get_serial_sequence('vaccinations', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM vaccinations), 1), true);
SELECT setval(pg_get_serial_sequence('growth_records', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM growth_records), 1), true);

-- =============================================
-- TASK DB
-- =============================================
\connect task_db

INSERT INTO task_categories (family_id, name, color_code, created_at)
SELECT
    9201,
    format('Demo Task Category %s', lpad(gs::text, 2, '0')),
    '#' || substr(md5(format('task-cat-%s', gs)), 1, 6),
    now() - gs * interval '1 day'
FROM generate_series(1, 20) AS gs
ON CONFLICT (family_id, name) DO UPDATE SET
    color_code = EXCLUDED.color_code;

WITH category_pool AS (
    SELECT id, row_number() OVER (ORDER BY id) AS rn
    FROM task_categories
    WHERE family_id = 9201
    ORDER BY id
    LIMIT 20
)
INSERT INTO tasks (
    family_id, title, description, category_id, status, assignee_user_id, due_at, completed_at, created_at, updated_at
)
SELECT
    9201,
    format('Demo Task %s', lpad(gs::text, 2, '0')),
    format('Demo task description %s', lpad(gs::text, 2, '0')),
    cp.id,
    (ARRAY['PENDING', 'IN_PROGRESS', 'DONE'])[1 + ((gs - 1) % 3)],
    9200 + ((gs - 1) % 20) + 1,
    now() + gs * interval '2 hour',
    CASE WHEN (gs % 3) = 0 THEN now() - gs * interval '1 hour' ELSE null END,
    now() - gs * interval '1 day',
    now()
FROM generate_series(1, 20) AS gs
JOIN category_pool cp ON cp.rn = gs
WHERE NOT EXISTS (
    SELECT 1
    FROM tasks t
    WHERE t.family_id = 9201
      AND t.title = format('Demo Task %s', lpad(gs::text, 2, '0'))
);

WITH category_pool AS (
    SELECT id, row_number() OVER (ORDER BY id) AS rn
    FROM task_categories
    WHERE family_id = 9201
    ORDER BY id
    LIMIT 20
)
INSERT INTO recurring_tasks (
    family_id, title, description, category_id, assignee_user_id,
    recurrence_rule, next_run_at, is_active, created_at, updated_at
)
SELECT
    9201,
    format('Demo Recurring Task %s', lpad(gs::text, 2, '0')),
    format('Demo recurring task description %s', lpad(gs::text, 2, '0')),
    cp.id,
    9200 + ((gs - 1) % 20) + 1,
    format('FREQ=DAILY;INTERVAL=%s', 1 + ((gs - 1) % 3)),
    now() + gs * interval '6 hour',
    true,
    now() - gs * interval '1 day',
    now()
FROM generate_series(1, 20) AS gs
JOIN category_pool cp ON cp.rn = gs
WHERE NOT EXISTS (
    SELECT 1
    FROM recurring_tasks rt
    WHERE rt.family_id = 9201
      AND rt.title = format('Demo Recurring Task %s', lpad(gs::text, 2, '0'))
);

SELECT setval(pg_get_serial_sequence('task_categories', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM task_categories), 1), true);
SELECT setval(pg_get_serial_sequence('tasks', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM tasks), 1), true);
SELECT setval(pg_get_serial_sequence('recurring_tasks', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM recurring_tasks), 1), true);

-- =============================================
-- SHOPPING DB
-- =============================================
\connect shopping_db

INSERT INTO shopping_lists (family_id, name, is_active, created_at, updated_at)
SELECT
    9201,
    format('Demo Shopping List %s', lpad(gs::text, 2, '0')),
    true,
    now() - gs * interval '1 day',
    now()
FROM generate_series(1, 20) AS gs
WHERE NOT EXISTS (
    SELECT 1
    FROM shopping_lists sl
    WHERE sl.family_id = 9201
      AND sl.name = format('Demo Shopping List %s', lpad(gs::text, 2, '0'))
);

WITH list_pool AS (
    SELECT id, row_number() OVER (ORDER BY id) AS rn
    FROM shopping_lists
    WHERE family_id = 9201
    ORDER BY id
    LIMIT 20
)
INSERT INTO shopping_items (list_id, item_name, quantity, is_checked, note, created_at, updated_at)
SELECT
    lp.id,
    format('Demo Item %s', lpad(gs::text, 2, '0')),
    format('%s pcs', gs + 1),
    (gs % 4) = 0,
    format('Demo shopping note %s', lpad(gs::text, 2, '0')),
    now() - gs * interval '1 day',
    now()
FROM generate_series(1, 20) AS gs
JOIN list_pool lp ON lp.rn = gs
WHERE NOT EXISTS (
    SELECT 1
    FROM shopping_items si
    WHERE si.list_id = lp.id
      AND si.item_name = format('Demo Item %s', lpad(gs::text, 2, '0'))
);

SELECT setval(pg_get_serial_sequence('shopping_lists', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM shopping_lists), 1), true);
SELECT setval(pg_get_serial_sequence('shopping_items', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM shopping_items), 1), true);

-- =============================================
-- INSIGHT DB
-- =============================================
\connect insight_db

INSERT INTO insight_daily_stats (
    family_id, stat_date, expense_total, expense_count,
    meals_planned, tasks_created, tasks_completed,
    baby_sleep_hours, baby_feedings, diaper_changes,
    created_at, updated_at
)
SELECT
    9201,
    current_date - (gs - 1),
    (750000 + gs * 50000)::numeric(14,2),
    (2 + (gs % 6))::bigint,
    (2 + (gs % 4))::bigint,
    (1 + (gs % 5))::bigint,
    (1 + (gs % 4))::bigint,
    (7.0 + gs * 0.15)::numeric(10,2),
    (3 + (gs % 5))::bigint,
    (2 + (gs % 4))::bigint,
    now(),
    now()
FROM generate_series(1, 20) AS gs
ON CONFLICT (family_id, stat_date) DO UPDATE SET
    expense_total = EXCLUDED.expense_total,
    expense_count = EXCLUDED.expense_count,
    meals_planned = EXCLUDED.meals_planned,
    tasks_created = EXCLUDED.tasks_created,
    tasks_completed = EXCLUDED.tasks_completed,
    baby_sleep_hours = EXCLUDED.baby_sleep_hours,
    baby_feedings = EXCLUDED.baby_feedings,
    diaper_changes = EXCLUDED.diaper_changes,
    updated_at = now();

SELECT setval(pg_get_serial_sequence('insight_daily_stats', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM insight_daily_stats), 1), true);

-- =============================================
-- NOTIFICATION DB
-- =============================================
\connect notification_db

INSERT INTO notifications (
    family_id, user_id, channel, type, title, message, metadata_json,
    scheduled_at, sent_at, read_at, status, error_message, created_at, updated_at
)
SELECT
    9201,
    9200 + ((gs - 1) % 20) + 1,
    (ARRAY['PUSH', 'EMAIL'])[1 + ((gs - 1) % 2)],
    (ARRAY['REMINDER', 'EVENT', 'INFO'])[1 + ((gs - 1) % 3)],
    format('Demo Notification %s', lpad(gs::text, 2, '0')),
    format('Demo notification message %s', lpad(gs::text, 2, '0')),
    format('{"seed":"demo20","index":%s}', gs),
    now() + (gs - 10) * interval '1 hour',
    CASE WHEN (gs % 4) = 2 THEN now() - gs * interval '30 minute' ELSE null END,
    CASE WHEN (gs % 4) = 2 THEN now() - gs * interval '20 minute' ELSE null END,
    (ARRAY['PENDING', 'SENT', 'FAILED', 'CANCELED'])[1 + ((gs - 1) % 4)],
    CASE WHEN (gs % 4) = 3 THEN 'Synthetic send failure' ELSE null END,
    now() - gs * interval '1 day',
    now()
FROM generate_series(1, 20) AS gs
WHERE NOT EXISTS (
    SELECT 1
    FROM notifications n
    WHERE n.family_id = 9201
      AND n.title = format('Demo Notification %s', lpad(gs::text, 2, '0'))
);

SELECT setval(pg_get_serial_sequence('notifications', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM notifications), 1), true);

-- =============================================
-- FILE DB
-- =============================================
\connect file_db

INSERT INTO file_metadata (
    family_id, user_id, bucket_name, object_key, original_file_name,
    content_type, size_bytes, file_tag, is_deleted, created_at, updated_at
)
SELECT
    9201,
    9200 + ((gs - 1) % 20) + 1,
    (ARRAY['avatars', 'expenses', 'babies', 'documents'])[1 + ((gs - 1) % 4)],
    format('families/9201/seed/file-%s.txt', lpad(gs::text, 2, '0')),
    format('demo-file-%s.txt', lpad(gs::text, 2, '0')),
    'text/plain',
    (2048 + gs * 128)::bigint,
    (ARRAY['avatar', 'expense_receipt', 'baby_photo', 'document'])[1 + ((gs - 1) % 4)],
    false,
    now() - gs * interval '1 day',
    now()
FROM generate_series(1, 20) AS gs
ON CONFLICT (object_key) DO UPDATE SET
    bucket_name = EXCLUDED.bucket_name,
    original_file_name = EXCLUDED.original_file_name,
    content_type = EXCLUDED.content_type,
    size_bytes = EXCLUDED.size_bytes,
    file_tag = EXCLUDED.file_tag,
    is_deleted = EXCLUDED.is_deleted,
    updated_at = now();

SELECT setval(pg_get_serial_sequence('file_metadata', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM file_metadata), 1), true);
