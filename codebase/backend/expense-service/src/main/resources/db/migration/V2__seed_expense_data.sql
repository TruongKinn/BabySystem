-- Seed categories for family 1, 2, and 9218
INSERT INTO expense_categories (family_id, name, color_code, is_default)
VALUES 
    (1, 'Meals', '#FF9F43', true),
    (1, 'Baby Care', '#4B7BEC', true),
    (1, 'Shopping', '#20BF6B', true),
    (1, 'Utilities', '#A55EEA', true),
    (1, 'Others', '#778CA3', false),

    (2, 'Meals', '#FF9F43', true),
    (2, 'Baby Care', '#4B7BEC', true),
    (2, 'Shopping', '#20BF6B', true),
    (2, 'Utilities', '#A55EEA', true),
    (2, 'Others', '#778CA3', false),

    (9218, 'Meals', '#FF9F43', true),
    (9218, 'Baby Care', '#4B7BEC', true),
    (9218, 'Shopping', '#20BF6B', true),
    (9218, 'Utilities', '#A55EEA', true),
    (9218, 'Others', '#778CA3', false)
ON CONFLICT (family_id, name) DO NOTHING;

-- Seed budgets for 2026-05
INSERT INTO budgets (family_id, month_key, limit_amount)
VALUES 
    (1, '2026-05', 15000000.00),
    (2, '2026-05', 10000000.00),
    (9218, '2026-05', 20000000.00)
ON CONFLICT (family_id, month_key) DO NOTHING;

-- Seed budgets for 2026-04 (so there's historical data)
INSERT INTO budgets (family_id, month_key, limit_amount)
VALUES 
    (1, '2026-04', 12000000.00),
    (2, '2026-04', 10000000.00),
    (9218, '2026-04', 20000000.00)
ON CONFLICT (family_id, month_key) DO NOTHING;

-- Seed expenses for 2026-05
-- Family 1: Budget 15M, Spent 11.25M (75% - Green/Warning)
INSERT INTO expenses (family_id, category_id, amount, currency, note, spent_at)
SELECT 1, id, 3500000.00, 'VND', 'Mua sữa bột và tã giấy cao cấp', '2026-05-02 10:00:00+07' FROM expense_categories WHERE family_id = 1 AND name = 'Baby Care'
ON CONFLICT DO NOTHING;
INSERT INTO expenses (family_id, category_id, amount, currency, note, spent_at)
SELECT 1, id, 1800000.00, 'VND', 'Đi chợ mua thực phẩm tươi sống tuần 1 & 2', '2026-05-05 17:30:00+07' FROM expense_categories WHERE family_id = 1 AND name = 'Meals'
ON CONFLICT DO NOTHING;
INSERT INTO expenses (family_id, category_id, amount, currency, note, spent_at)
SELECT 1, id, 2200000.00, 'VND', 'Thanh toán tiền điện và internet tháng 5', '2026-05-10 09:00:00+07' FROM expense_categories WHERE family_id = 1 AND name = 'Utilities'
ON CONFLICT DO NOTHING;
INSERT INTO expenses (family_id, category_id, amount, currency, note, spent_at)
SELECT 1, id, 2500000.00, 'VND', 'Mua nôi em bé và đồ chơi phát triển trí tuệ', '2026-05-12 15:00:00+07' FROM expense_categories WHERE family_id = 1 AND name = 'Shopping'
ON CONFLICT DO NOTHING;
INSERT INTO expenses (family_id, category_id, amount, currency, note, spent_at)
SELECT 1, id, 1250000.00, 'VND', 'Chi phí tiêm chủng định kỳ cho bé', '2026-05-15 08:30:00+07' FROM expense_categories WHERE family_id = 1 AND name = 'Others'
ON CONFLICT DO NOTHING;

-- Family 2: Budget 10M, Spent 10.5M (105% - Red OVER limit)
INSERT INTO expenses (family_id, category_id, amount, currency, note, spent_at)
SELECT 2, id, 4000000.00, 'VND', 'Sữa chua, bỉm bỉm và đồ ăn dặm organic', '2026-05-03 11:00:00+07' FROM expense_categories WHERE family_id = 2 AND name = 'Baby Care'
ON CONFLICT DO NOTHING;
INSERT INTO expenses (family_id, category_id, amount, currency, note, spent_at)
SELECT 2, id, 3000000.00, 'VND', 'Tiền ăn gia đình cả tháng', '2026-05-07 18:00:00+07' FROM expense_categories WHERE family_id = 2 AND name = 'Meals'
ON CONFLICT DO NOTHING;
INSERT INTO expenses (family_id, category_id, amount, currency, note, spent_at)
SELECT 2, id, 1500000.00, 'VND', 'Mua quần áo mùa hè cho bé', '2026-05-11 16:30:00+07' FROM expense_categories WHERE family_id = 2 AND name = 'Shopping'
ON CONFLICT DO NOTHING;
INSERT INTO expenses (family_id, category_id, amount, currency, note, spent_at)
SELECT 2, id, 2000000.00, 'VND', 'Đóng tiền điện sinh hoạt gia đình', '2026-05-14 10:00:00+07' FROM expense_categories WHERE family_id = 2 AND name = 'Utilities'
ON CONFLICT DO NOTHING;

-- Family 9218: Budget 20M, Spent 13.9M (69.5% - Safe Emerald Green)
INSERT INTO expenses (family_id, category_id, amount, currency, note, spent_at)
SELECT 9218, id, 4500000.00, 'VND', 'Sữa Meiji và tã Merries nội địa Nhật', '2026-05-01 09:30:00+07' FROM expense_categories WHERE family_id = 9218 AND name = 'Baby Care'
ON CONFLICT DO NOTHING;
INSERT INTO expenses (family_id, category_id, amount, currency, note, spent_at)
SELECT 9218, id, 2800000.00, 'VND', 'Mua sắm thực phẩm siêu thị Coopmart', '2026-05-04 19:00:00+07' FROM expense_categories WHERE family_id = 9218 AND name = 'Meals'
ON CONFLICT DO NOTHING;
INSERT INTO expenses (family_id, category_id, amount, currency, note, spent_at)
SELECT 9218, id, 3200000.00, 'VND', 'Mua máy hút sữa điện đôi Philips Avent', '2026-05-08 14:15:00+07' FROM expense_categories WHERE family_id = 9218 AND name = 'Shopping'
ON CONFLICT DO NOTHING;
INSERT INTO expenses (family_id, category_id, amount, currency, note, spent_at)
SELECT 9218, id, 1800000.00, 'VND', 'Thanh toán hóa đơn điện nước sinh hoạt', '2026-05-13 11:00:00+07' FROM expense_categories WHERE family_id = 9218 AND name = 'Utilities'
ON CONFLICT DO NOTHING;
INSERT INTO expenses (family_id, category_id, amount, currency, note, spent_at)
SELECT 9218, id, 1600000.00, 'VND', 'Đưa bé đi khám sức khỏe định kỳ & tiêm vaccine', '2026-05-16 10:30:00+07' FROM expense_categories WHERE family_id = 9218 AND name = 'Others'
ON CONFLICT DO NOTHING;
