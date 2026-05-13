\set ON_ERROR_STOP on

-- =============================================
-- AUTH DB
-- =============================================
\connect auth_db

INSERT INTO tbl_user (
    id, username, password, email, first_name, last_name,
    status, type, is_two_factor_enabled, require_password_change, avatar_url
)
VALUES
    (9001, 'mom.sample', '$2a$10$0zfDuSov6Wv1QL88wTv.9enhPaJMdQd4RUdRqVN7AeURV3xPInoMC', 'mom.sample@local', 'Linh', 'Nguyen', 'ACTIVE', 'USER', false, false, null),
    (9002, 'dad.sample', '$2a$10$0zfDuSov6Wv1QL88wTv.9enhPaJMdQd4RUdRqVN7AeURV3xPInoMC', 'dad.sample@local', 'Minh', 'Tran', 'ACTIVE', 'USER', false, false, null)
ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    status = EXCLUDED.status,
    type = EXCLUDED.type,
    is_two_factor_enabled = EXCLUDED.is_two_factor_enabled,
    require_password_change = EXCLUDED.require_password_change,
    avatar_url = EXCLUDED.avatar_url;

INSERT INTO tbl_user_has_role (user_id, role_id)
SELECT 9001, r.id
FROM tbl_role r
WHERE r.name = 'USER'
  AND NOT EXISTS (
      SELECT 1 FROM tbl_user_has_role ur
      WHERE ur.user_id = 9001 AND ur.role_id = r.id
  );

INSERT INTO tbl_user_has_role (user_id, role_id)
SELECT 9002, r.id
FROM tbl_role r
WHERE r.name IN ('USER', 'ADMIN')
  AND NOT EXISTS (
      SELECT 1 FROM tbl_user_has_role ur
      WHERE ur.user_id = 9002 AND ur.role_id = r.id
  );

SELECT setval(pg_get_serial_sequence('tbl_user', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM tbl_user), 1), true);
SELECT setval(pg_get_serial_sequence('tbl_user_has_role', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM tbl_user_has_role), 1), true);

-- =============================================
-- ACCOUNT DB
-- =============================================
\connect account_db

INSERT INTO users (id, username, email, display_name, created_at)
VALUES
    (9001, 'mom.sample', 'mom.sample@family.local', 'Linh Nguyen', now() - interval '35 days'),
    (9002, 'dad.sample', 'dad.sample@family.local', 'Minh Tran', now() - interval '35 days'),
    (9003, 'grandma.sample', 'grandma.sample@family.local', 'Huong Pham', now() - interval '34 days'),
    (9004, 'caregiver.sample', 'caregiver.sample@family.local', 'An Le', now() - interval '20 days')
ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    display_name = EXCLUDED.display_name;

INSERT INTO families (id, name, created_by_user_id, created_at)
VALUES (9001, 'Sample Family 9001', 9001, now() - interval '35 days')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    created_by_user_id = EXCLUDED.created_by_user_id;

INSERT INTO family_members (id, family_id, user_id, role, joined_at)
SELECT 9001, 9001, 9001, 'MOM', now() - interval '35 days'
WHERE NOT EXISTS (SELECT 1 FROM family_members WHERE family_id = 9001 AND user_id = 9001);

INSERT INTO family_members (id, family_id, user_id, role, joined_at)
SELECT 9002, 9001, 9002, 'DAD', now() - interval '35 days'
WHERE NOT EXISTS (SELECT 1 FROM family_members WHERE family_id = 9001 AND user_id = 9002);

INSERT INTO family_members (id, family_id, user_id, role, joined_at)
SELECT 9003, 9001, 9003, 'GRANDMA', now() - interval '34 days'
WHERE NOT EXISTS (SELECT 1 FROM family_members WHERE family_id = 9001 AND user_id = 9003);

INSERT INTO family_members (id, family_id, user_id, role, joined_at)
SELECT 9004, 9001, 9004, 'CAREGIVER', now() - interval '20 days'
WHERE NOT EXISTS (SELECT 1 FROM family_members WHERE family_id = 9001 AND user_id = 9004);

SELECT setval(pg_get_serial_sequence('users', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM users), 1), true);
SELECT setval(pg_get_serial_sequence('families', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM families), 1), true);
SELECT setval(pg_get_serial_sequence('family_members', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM family_members), 1), true);

-- =============================================
-- EXPENSE DB
-- =============================================
\connect expense_db

INSERT INTO expense_categories (id, family_id, name, color_code, is_default, created_at)
VALUES
    (9001, 9001, 'Groceries', '#22C55E', true, now() - interval '30 days'),
    (9002, 9001, 'Baby Care', '#F59E0B', false, now() - interval '30 days'),
    (9003, 9001, 'Healthcare', '#EF4444', false, now() - interval '29 days'),
    (9004, 9001, 'Transport', '#3B82F6', false, now() - interval '29 days')
ON CONFLICT (id) DO UPDATE SET
    family_id = EXCLUDED.family_id,
    name = EXCLUDED.name,
    color_code = EXCLUDED.color_code,
    is_default = EXCLUDED.is_default;

INSERT INTO budgets (id, family_id, month_key, limit_amount, created_at, updated_at)
SELECT 9001, 9001, to_char(date_trunc('month', current_date), 'YYYY-MM'), 25000000, now(), now()
WHERE NOT EXISTS (
    SELECT 1 FROM budgets
    WHERE family_id = 9001 AND month_key = to_char(date_trunc('month', current_date), 'YYYY-MM')
);

INSERT INTO budgets (id, family_id, month_key, limit_amount, created_at, updated_at)
SELECT 9002, 9001, to_char(date_trunc('month', current_date - interval '1 month'), 'YYYY-MM'), 24000000, now(), now()
WHERE NOT EXISTS (
    SELECT 1 FROM budgets
    WHERE family_id = 9001 AND month_key = to_char(date_trunc('month', current_date - interval '1 month'), 'YYYY-MM')
);

INSERT INTO expenses (id, family_id, category_id, amount, currency, note, spent_at, created_at, updated_at)
VALUES
    (9001, 9001, 9001, 320000, 'VND', 'Weekly supermarket', now() - interval '6 days', now() - interval '6 days', now() - interval '6 days'),
    (9002, 9001, 9002, 450000, 'VND', 'Diapers and wipes', now() - interval '5 days', now() - interval '5 days', now() - interval '5 days'),
    (9003, 9001, 9003, 780000, 'VND', 'Pediatric check-up', now() - interval '3 days', now() - interval '3 days', now() - interval '3 days'),
    (9004, 9001, 9001, 280000, 'VND', 'Milk and fruit', now() - interval '2 days', now() - interval '2 days', now() - interval '2 days'),
    (9005, 9001, 9004, 120000, 'VND', 'Taxi to clinic', now() - interval '1 day', now() - interval '1 day', now() - interval '1 day'),
    (9006, 9001, 9002, 265000, 'VND', 'Baby formula', now() - interval '6 hours', now() - interval '6 hours', now() - interval '6 hours')
ON CONFLICT (id) DO UPDATE SET
    family_id = EXCLUDED.family_id,
    category_id = EXCLUDED.category_id,
    amount = EXCLUDED.amount,
    currency = EXCLUDED.currency,
    note = EXCLUDED.note,
    spent_at = EXCLUDED.spent_at,
    updated_at = now();

SELECT setval(pg_get_serial_sequence('expense_categories', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM expense_categories), 1), true);
SELECT setval(pg_get_serial_sequence('budgets', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM budgets), 1), true);
SELECT setval(pg_get_serial_sequence('expenses', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM expenses), 1), true);

-- =============================================
-- MEAL DB
-- =============================================
\connect meal_db

INSERT INTO meals (id, family_id, name, meal_type, description, created_at)
VALUES
    (9001, 9001, 'Oatmeal Banana', 'BREAKFAST', 'Soft oatmeal with banana puree', now() - interval '20 days'),
    (9002, 9001, 'Chicken Soup', 'LUNCH', 'Chicken soup with vegetables', now() - interval '20 days'),
    (9003, 9001, 'Salmon Rice Bowl', 'DINNER', 'Steamed salmon with rice and broccoli', now() - interval '19 days'),
    (9004, 9001, 'Yogurt Snack', 'SNACK', 'Greek yogurt and berries', now() - interval '19 days')
ON CONFLICT (id) DO UPDATE SET
    family_id = EXCLUDED.family_id,
    name = EXCLUDED.name,
    meal_type = EXCLUDED.meal_type,
    description = EXCLUDED.description;

INSERT INTO meal_plans (id, family_id, meal_id, plan_date, notes, created_at, updated_at)
SELECT 9001, 9001, 9001, current_date, 'Breakfast plan for today', now(), now()
WHERE NOT EXISTS (SELECT 1 FROM meal_plans WHERE family_id = 9001 AND meal_id = 9001 AND plan_date = current_date);

INSERT INTO meal_plans (id, family_id, meal_id, plan_date, notes, created_at, updated_at)
SELECT 9002, 9001, 9002, current_date, 'Lunch plan for today', now(), now()
WHERE NOT EXISTS (SELECT 1 FROM meal_plans WHERE family_id = 9001 AND meal_id = 9002 AND plan_date = current_date);

INSERT INTO meal_plans (id, family_id, meal_id, plan_date, notes, created_at, updated_at)
SELECT 9003, 9001, 9003, current_date + interval '1 day', 'Dinner plan for tomorrow', now(), now()
WHERE NOT EXISTS (SELECT 1 FROM meal_plans WHERE family_id = 9001 AND meal_id = 9003 AND plan_date = current_date + interval '1 day');

INSERT INTO meal_plans (id, family_id, meal_id, plan_date, notes, created_at, updated_at)
SELECT 9004, 9001, 9004, current_date + interval '1 day', 'Healthy snack', now(), now()
WHERE NOT EXISTS (SELECT 1 FROM meal_plans WHERE family_id = 9001 AND meal_id = 9004 AND plan_date = current_date + interval '1 day');

SELECT setval(pg_get_serial_sequence('meals', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM meals), 1), true);
SELECT setval(pg_get_serial_sequence('meal_plans', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM meal_plans), 1), true);

-- =============================================
-- BABY DB
-- =============================================
\connect baby_db

INSERT INTO babies (id, family_id, name, birth_date, gender, notes, created_at, updated_at)
VALUES
    (9001, 9001, 'Mia Tran', current_date - interval '14 months', 'FEMALE', 'Allergic to peanut products', now() - interval '14 months', now())
ON CONFLICT (id) DO UPDATE SET
    family_id = EXCLUDED.family_id,
    name = EXCLUDED.name,
    birth_date = EXCLUDED.birth_date,
    gender = EXCLUDED.gender,
    notes = EXCLUDED.notes,
    updated_at = now();

INSERT INTO baby_logs (id, baby_id, log_type, value, note, logged_at, created_at)
VALUES
    (9001, 9001, 'SLEEP', 9.50, 'Night sleep', now() - interval '12 hours', now() - interval '12 hours'),
    (9002, 9001, 'FEEDING', 3.00, 'Morning feeding sessions', now() - interval '6 hours', now() - interval '6 hours'),
    (9003, 9001, 'DIAPER', 5.00, 'Diaper changes today', now() - interval '2 hours', now() - interval '2 hours')
ON CONFLICT (id) DO UPDATE SET
    baby_id = EXCLUDED.baby_id,
    log_type = EXCLUDED.log_type,
    value = EXCLUDED.value,
    note = EXCLUDED.note,
    logged_at = EXCLUDED.logged_at;

INSERT INTO vaccinations (id, baby_id, vaccine_name, due_date, completed, completed_at, notes, created_at)
VALUES
    (9001, 9001, 'MMR', current_date + interval '21 days', false, null, 'Upcoming vaccination', now() - interval '15 days'),
    (9002, 9001, 'Hepatitis B', current_date - interval '90 days', true, now() - interval '88 days', 'Completed on schedule', now() - interval '95 days')
ON CONFLICT (id) DO UPDATE SET
    baby_id = EXCLUDED.baby_id,
    vaccine_name = EXCLUDED.vaccine_name,
    due_date = EXCLUDED.due_date,
    completed = EXCLUDED.completed,
    completed_at = EXCLUDED.completed_at,
    notes = EXCLUDED.notes;

INSERT INTO growth_records (id, baby_id, measured_at, weight_kg, height_cm, head_circumference_cm, notes, created_at)
VALUES
    (9001, 9001, current_date - interval '60 days', 9.10, 74.20, 45.10, 'Monthly check', now() - interval '60 days'),
    (9002, 9001, current_date - interval '30 days', 9.45, 75.40, 45.60, 'Steady growth', now() - interval '30 days'),
    (9003, 9001, current_date - interval '7 days', 9.70, 76.00, 45.90, 'Recent clinic visit', now() - interval '7 days')
ON CONFLICT (id) DO UPDATE SET
    baby_id = EXCLUDED.baby_id,
    measured_at = EXCLUDED.measured_at,
    weight_kg = EXCLUDED.weight_kg,
    height_cm = EXCLUDED.height_cm,
    head_circumference_cm = EXCLUDED.head_circumference_cm,
    notes = EXCLUDED.notes;

SELECT setval(pg_get_serial_sequence('babies', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM babies), 1), true);
SELECT setval(pg_get_serial_sequence('baby_logs', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM baby_logs), 1), true);
SELECT setval(pg_get_serial_sequence('vaccinations', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM vaccinations), 1), true);
SELECT setval(pg_get_serial_sequence('growth_records', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM growth_records), 1), true);

-- =============================================
-- TASK DB
-- =============================================
\connect task_db

INSERT INTO task_categories (id, family_id, name, color_code, created_at)
VALUES
    (9001, 9001, 'Home Chores', '#6366F1', now() - interval '20 days'),
    (9002, 9001, 'Baby Care', '#F43F5E', now() - interval '20 days')
ON CONFLICT (id) DO UPDATE SET
    family_id = EXCLUDED.family_id,
    name = EXCLUDED.name,
    color_code = EXCLUDED.color_code;

INSERT INTO tasks (id, family_id, title, description, category_id, status, assignee_user_id, due_at, completed_at, created_at, updated_at)
VALUES
    (9001, 9001, 'Prepare daycare bag', 'Pack diapers, clothes and snacks', 9002, 'PENDING', 9001, now() + interval '4 hours', null, now() - interval '1 day', now() - interval '1 day'),
    (9002, 9001, 'Pay electricity bill', 'Monthly utility payment', 9001, 'IN_PROGRESS', 9002, now() + interval '1 day', null, now() - interval '12 hours', now() - interval '6 hours'),
    (9003, 9001, 'Clean baby room', 'Vacuum and organize toys', 9001, 'DONE', 9004, now() - interval '1 day', now() - interval '18 hours', now() - interval '2 days', now() - interval '18 hours')
ON CONFLICT (id) DO UPDATE SET
    family_id = EXCLUDED.family_id,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    category_id = EXCLUDED.category_id,
    status = EXCLUDED.status,
    assignee_user_id = EXCLUDED.assignee_user_id,
    due_at = EXCLUDED.due_at,
    completed_at = EXCLUDED.completed_at,
    updated_at = now();

INSERT INTO recurring_tasks (id, family_id, title, description, category_id, assignee_user_id, recurrence_rule, next_run_at, is_active, created_at, updated_at)
VALUES
    (9001, 9001, 'Sterilize baby bottles', 'Night routine', 9002, 9001, 'FREQ=DAILY;INTERVAL=1', now() + interval '10 hours', true, now() - interval '15 days', now()),
    (9002, 9001, 'Weekly grocery planning', 'Plan list for weekend shopping', 9001, 9002, 'FREQ=WEEKLY;BYDAY=FR', now() + interval '2 days', true, now() - interval '15 days', now())
ON CONFLICT (id) DO UPDATE SET
    family_id = EXCLUDED.family_id,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    category_id = EXCLUDED.category_id,
    assignee_user_id = EXCLUDED.assignee_user_id,
    recurrence_rule = EXCLUDED.recurrence_rule,
    next_run_at = EXCLUDED.next_run_at,
    is_active = EXCLUDED.is_active,
    updated_at = now();

SELECT setval(pg_get_serial_sequence('task_categories', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM task_categories), 1), true);
SELECT setval(pg_get_serial_sequence('tasks', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM tasks), 1), true);
SELECT setval(pg_get_serial_sequence('recurring_tasks', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM recurring_tasks), 1), true);

-- =============================================
-- SHOPPING DB
-- =============================================
\connect shopping_db

INSERT INTO shopping_lists (id, family_id, name, is_active, created_at, updated_at)
VALUES
    (9001, 9001, 'Weekly Grocery', true, now() - interval '10 days', now()),
    (9002, 9001, 'Baby Essentials', true, now() - interval '9 days', now())
ON CONFLICT (id) DO UPDATE SET
    family_id = EXCLUDED.family_id,
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    updated_at = now();

INSERT INTO shopping_items (id, list_id, item_name, quantity, is_checked, note, created_at, updated_at)
VALUES
    (9001, 9001, 'Rice', '5 kg', false, 'Low stock', now() - interval '5 days', now()),
    (9002, 9001, 'Chicken breast', '2 kg', true, 'Bought yesterday', now() - interval '3 days', now()),
    (9003, 9002, 'Diaper size M', '3 packs', false, 'Need sensitive skin type', now() - interval '2 days', now()),
    (9004, 9002, 'Baby wipes', '6 packs', false, 'Fragrance free', now() - interval '1 day', now())
ON CONFLICT (id) DO UPDATE SET
    list_id = EXCLUDED.list_id,
    item_name = EXCLUDED.item_name,
    quantity = EXCLUDED.quantity,
    is_checked = EXCLUDED.is_checked,
    note = EXCLUDED.note,
    updated_at = now();

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
    9001,
    (current_date - gs.day_offset),
    (1200000 + gs.day_offset * 75000)::numeric(14,2),
    (4 + gs.day_offset)::bigint,
    (2 + (gs.day_offset % 3))::bigint,
    (3 + gs.day_offset)::bigint,
    (2 + (gs.day_offset % 2))::bigint,
    (8.5 + gs.day_offset * 0.2)::numeric(10,2),
    (5 + gs.day_offset)::bigint,
    (4 + gs.day_offset)::bigint,
    now(),
    now()
FROM generate_series(0, 6) AS gs(day_offset)
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
    id, family_id, user_id, channel, type, title, message,
    metadata_json, scheduled_at, sent_at, read_at, status,
    error_message, created_at, updated_at
)
VALUES
    (9001, 9001, 9001, 'PUSH', 'REMINDER', 'Meal planning reminder', 'Remember to confirm tomorrow meal plan.', '{"module":"meal"}', now() + interval '2 hours', null, null, 'PENDING', null, now() - interval '1 hour', now()),
    (9002, 9001, 9002, 'EMAIL', 'INFO', 'Budget alert', 'You have used 78% of this month budget.', '{"module":"expense"}', now() - interval '5 hours', now() - interval '5 hours', now() - interval '4 hours', 'SENT', null, now() - interval '6 hours', now() - interval '4 hours'),
    (9003, 9001, 9004, 'PUSH', 'EVENT', 'Task overdue', 'Electricity bill task is overdue.', '{"module":"task"}', now() - interval '1 day', null, null, 'FAILED', 'Push provider timeout', now() - interval '1 day', now() - interval '23 hours')
ON CONFLICT (id) DO UPDATE SET
    family_id = EXCLUDED.family_id,
    user_id = EXCLUDED.user_id,
    channel = EXCLUDED.channel,
    type = EXCLUDED.type,
    title = EXCLUDED.title,
    message = EXCLUDED.message,
    metadata_json = EXCLUDED.metadata_json,
    scheduled_at = EXCLUDED.scheduled_at,
    sent_at = EXCLUDED.sent_at,
    read_at = EXCLUDED.read_at,
    status = EXCLUDED.status,
    error_message = EXCLUDED.error_message,
    updated_at = now();

SELECT setval(pg_get_serial_sequence('notifications', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM notifications), 1), true);

-- =============================================
-- FILE DB
-- =============================================
\connect file_db

INSERT INTO file_metadata (
    id, family_id, user_id, bucket_name, object_key,
    original_file_name, content_type, size_bytes,
    file_tag, is_deleted, created_at, updated_at
)
VALUES
    (9001, 9001, 9001, 'avatars', 'families/9001/users/9001/avatar.png', 'avatar-linh.png', 'image/png', 245123, 'avatar', false, now() - interval '12 days', now() - interval '12 days'),
    (9002, 9001, 9002, 'expenses', 'families/9001/expenses/receipt-2026-05-01.jpg', 'receipt-may-01.jpg', 'image/jpeg', 514322, 'expense_receipt', false, now() - interval '7 days', now() - interval '7 days'),
    (9003, 9001, 9001, 'babies', 'families/9001/babies/9001/photo-park.jpg', 'mia-park.jpg', 'image/jpeg', 783204, 'baby_photo', false, now() - interval '3 days', now() - interval '3 days'),
    (9004, 9001, 9004, 'documents', 'families/9001/documents/vaccine-card.pdf', 'vaccine-card.pdf', 'application/pdf', 128030, 'medical_document', false, now() - interval '2 days', now() - interval '2 days')
ON CONFLICT (id) DO UPDATE SET
    family_id = EXCLUDED.family_id,
    user_id = EXCLUDED.user_id,
    bucket_name = EXCLUDED.bucket_name,
    object_key = EXCLUDED.object_key,
    original_file_name = EXCLUDED.original_file_name,
    content_type = EXCLUDED.content_type,
    size_bytes = EXCLUDED.size_bytes,
    file_tag = EXCLUDED.file_tag,
    is_deleted = EXCLUDED.is_deleted,
    updated_at = now();

SELECT setval(pg_get_serial_sequence('file_metadata', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM file_metadata), 1), true);
