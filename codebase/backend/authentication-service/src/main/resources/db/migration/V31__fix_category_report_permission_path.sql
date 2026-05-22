-- V31: Fix category report permission path
-- Đồng bộ lại api_path của API:GET:EXPENSE_CATEGORY_REPORT đúng theo endpoint thực tế của frontend (/expense/expenses/reports/categories)

UPDATE tbl_permission
SET api_path = '/expense/expenses/reports/categories'
WHERE name = 'API:GET:EXPENSE_CATEGORY_REPORT';
