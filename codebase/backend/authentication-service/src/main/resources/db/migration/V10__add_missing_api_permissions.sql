-- Meal Service Permissions
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:POST:MEAL_CREATE', 'Create meal', 'API', 'POST', '/meal/meals' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:MEAL_CREATE');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:GET:MEAL_LIST', 'Get meals', 'API', 'GET', '/meal/meals' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:MEAL_LIST');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:GET:MEAL_DETAIL', 'Get meal detail', 'API', 'GET', '/meal/meals/{id}' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:MEAL_DETAIL');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:PUT:MEAL_UPDATE', 'Update meal', 'API', 'PUT', '/meal/meals/{id}' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:PUT:MEAL_UPDATE');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:DELETE:MEAL_DELETE', 'Delete meal', 'API', 'DELETE', '/meal/meals/{id}' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:DELETE:MEAL_DELETE');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:POST:MEAL_PLAN_CREATE', 'Create meal plan', 'API', 'POST', '/meal/meal-plans' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:MEAL_PLAN_CREATE');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:GET:MEAL_PLAN_LIST', 'Get meal plans', 'API', 'GET', '/meal/meal-plans' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:MEAL_PLAN_LIST');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:GET:MEAL_PLAN_TODAY', 'Get today meal plans', 'API', 'GET', '/meal/meal-plans/today' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:MEAL_PLAN_TODAY');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:GET:MEAL_PLAN_WEEKLY', 'Get weekly meal plans', 'API', 'GET', '/meal/meal-plans/weekly' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:MEAL_PLAN_WEEKLY');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:PUT:MEAL_PLAN_UPDATE', 'Update meal plan', 'API', 'PUT', '/meal/meal-plans/{id}' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:PUT:MEAL_PLAN_UPDATE');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:DELETE:MEAL_PLAN_DELETE', 'Delete meal plan', 'API', 'DELETE', '/meal/meal-plans/{id}' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:DELETE:MEAL_PLAN_DELETE');

-- Task Service Permissions
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:POST:TASK_CATEGORY_CREATE', 'Create task category', 'API', 'POST', '/task/task-categories' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:TASK_CATEGORY_CREATE');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:GET:TASK_CATEGORY_LIST', 'Get task categories', 'API', 'GET', '/task/task-categories' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:TASK_CATEGORY_LIST');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:POST:TASK_CREATE', 'Create task', 'API', 'POST', '/task/tasks' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:TASK_CREATE');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:GET:TASK_LIST', 'Get tasks', 'API', 'GET', '/task/tasks' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:TASK_LIST');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:GET:TASK_DETAIL', 'Get task detail', 'API', 'GET', '/task/tasks/{id}' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:TASK_DETAIL');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:PUT:TASK_UPDATE', 'Update task', 'API', 'PUT', '/task/tasks/{id}' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:PUT:TASK_UPDATE');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:POST:TASK_COMPLETE', 'Complete task', 'API', 'POST', '/task/tasks/{id}/complete' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:TASK_COMPLETE');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:DELETE:TASK_DELETE', 'Delete task', 'API', 'DELETE', '/task/tasks/{id}' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:DELETE:TASK_DELETE');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:GET:TASK_PENDING_COUNT', 'Get task pending count', 'API', 'GET', '/task/tasks/pending/count' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:TASK_PENDING_COUNT');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:GET:TASK_OVERVIEW', 'Get task overview', 'API', 'GET', '/task/tasks/overview' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:TASK_OVERVIEW');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:POST:RECURRING_TASK_CREATE', 'Create recurring task', 'API', 'POST', '/task/recurring-tasks' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:RECURRING_TASK_CREATE');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:GET:RECURRING_TASK_LIST', 'Get recurring tasks', 'API', 'GET', '/task/recurring-tasks' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:RECURRING_TASK_LIST');

-- Shopping Service Permissions
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:POST:SHOPPING_LIST_CREATE', 'Create shopping list', 'API', 'POST', '/shopping/shopping-lists' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:SHOPPING_LIST_CREATE');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:GET:SHOPPING_LIST_LIST', 'Get shopping lists', 'API', 'GET', '/shopping/shopping-lists' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:SHOPPING_LIST_LIST');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:GET:SHOPPING_LIST_DETAIL', 'Get shopping list detail', 'API', 'GET', '/shopping/shopping-lists/{id}' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:SHOPPING_LIST_DETAIL');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:PUT:SHOPPING_LIST_UPDATE', 'Update shopping list', 'API', 'PUT', '/shopping/shopping-lists/{id}' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:PUT:SHOPPING_LIST_UPDATE');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:DELETE:SHOPPING_LIST_DELETE', 'Delete shopping list', 'API', 'DELETE', '/shopping/shopping-lists/{id}' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:DELETE:SHOPPING_LIST_DELETE');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:POST:SHOPPING_ITEM_CREATE', 'Create shopping item', 'API', 'POST', '/shopping/shopping-lists/{id}/items' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:SHOPPING_ITEM_CREATE');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:GET:SHOPPING_ITEM_LIST', 'Get shopping list items', 'API', 'GET', '/shopping/shopping-lists/{id}/items' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:SHOPPING_ITEM_LIST');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:GET:SHOPPING_FAMILY_ITEMS', 'Get family shopping items', 'API', 'GET', '/shopping/shopping-items' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:SHOPPING_FAMILY_ITEMS');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:PUT:SHOPPING_ITEM_UPDATE', 'Update shopping item', 'API', 'PUT', '/shopping/shopping-items/{id}' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:PUT:SHOPPING_ITEM_UPDATE');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:POST:SHOPPING_ITEM_CHECK', 'Check shopping item', 'API', 'POST', '/shopping/shopping-items/{id}/check' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:SHOPPING_ITEM_CHECK');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:DELETE:SHOPPING_ITEM_DELETE', 'Delete shopping item', 'API', 'DELETE', '/shopping/shopping-items/{id}' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:DELETE:SHOPPING_ITEM_DELETE');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:GET:SHOPPING_PENDING_COUNT', 'Get shopping pending count', 'API', 'GET', '/shopping/shopping-items/pending/count' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:SHOPPING_PENDING_COUNT');

-- Expense Service Permissions
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:POST:EXPENSE_CATEGORY_CREATE', 'Create expense category', 'API', 'POST', '/expense/categories' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:EXPENSE_CATEGORY_CREATE');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:GET:EXPENSE_CATEGORY_LIST', 'Get expense categories', 'API', 'GET', '/expense/categories' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:EXPENSE_CATEGORY_LIST');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:POST:EXPENSE_BUDGET_CREATE', 'Create budget', 'API', 'POST', '/expense/budgets' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:EXPENSE_BUDGET_CREATE');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:GET:EXPENSE_BUDGET_LIST', 'Get budgets', 'API', 'GET', '/expense/budgets' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:EXPENSE_BUDGET_LIST');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:PUT:EXPENSE_BUDGET_UPDATE', 'Update budget', 'API', 'PUT', '/expense/budgets/{id}' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:PUT:EXPENSE_BUDGET_UPDATE');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:POST:EXPENSE_CREATE', 'Create expense', 'API', 'POST', '/expense/expenses' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:EXPENSE_CREATE');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:GET:EXPENSE_DETAIL', 'Get expense detail', 'API', 'GET', '/expense/expenses/{id}' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:EXPENSE_DETAIL');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:GET:EXPENSE_LIST', 'Get expenses', 'API', 'GET', '/expense/expenses' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:EXPENSE_LIST');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:PUT:EXPENSE_UPDATE', 'Update expense', 'API', 'PUT', '/expense/expenses/{id}' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:PUT:EXPENSE_UPDATE');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:DELETE:EXPENSE_DELETE', 'Delete expense', 'API', 'DELETE', '/expense/expenses/{id}' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:DELETE:EXPENSE_DELETE');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:GET:EXPENSE_SUMMARY', 'Get expense summary', 'API', 'GET', '/expense/expenses/summary' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:EXPENSE_SUMMARY');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:GET:EXPENSE_DAILY_SUMMARY', 'Get expense daily summary', 'API', 'GET', '/expense/expenses/summary/daily' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:EXPENSE_DAILY_SUMMARY');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:GET:EXPENSE_CATEGORY_REPORT', 'Get expense category report', 'API', 'GET', '/expense/reports/categories' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:EXPENSE_CATEGORY_REPORT');

-- Insight Service Permissions
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:GET:INSIGHT_DAILY', 'Get daily insight', 'API', 'GET', '/insight/insights/daily' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:INSIGHT_DAILY');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:GET:INSIGHT_DASHBOARD', 'Get insight dashboard', 'API', 'GET', '/insight/insights/dashboard' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:INSIGHT_DASHBOARD');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:GET:INSIGHT_MONTHLY', 'Get monthly insight', 'API', 'GET', '/insight/insights/monthly' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:INSIGHT_MONTHLY');

-- Notification Service Permissions
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:POST:NOTIFICATION_CREATE', 'Create notification', 'API', 'POST', '/notification/api/notifications' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:NOTIFICATION_CREATE');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:GET:NOTIFICATION_LIST', 'Get notifications', 'API', 'GET', '/notification/api/notifications' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:NOTIFICATION_LIST');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:POST:NOTIFICATION_READ', 'Mark notification as read', 'API', 'POST', '/notification/api/notifications/{id}/read' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:NOTIFICATION_READ');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:GET:NOTIFICATION_UNREAD_COUNT', 'Get unread notification count', 'API', 'GET', '/notification/api/notifications/unread/count' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:NOTIFICATION_UNREAD_COUNT');

-- Account Service Permissions
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:POST:USER_CREATE', 'Create user', 'API', 'POST', '/account/users' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:USER_CREATE');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:GET:USER_DETAIL', 'Get user detail', 'API', 'GET', '/account/users/{id}' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:USER_DETAIL');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:POST:FAMILY_CREATE', 'Create family', 'API', 'POST', '/account/families' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:FAMILY_CREATE');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:GET:FAMILY_DETAIL', 'Get family detail', 'API', 'GET', '/account/families/{id}' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:FAMILY_DETAIL');
INSERT INTO tbl_permission (name, description, type, api_method, api_path) SELECT 'API:POST:FAMILY_MEMBER_ADD', 'Add family member', 'API', 'POST', '/account/families/{id}/members' WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:FAMILY_MEMBER_ADD');

-- Assign to Roles (1=USER, 2=ADMIN, 3=OWNER)
INSERT INTO tbl_role_has_permission (role_id, permission_id)
SELECT roles.role_id, p.id
FROM tbl_permission p
CROSS JOIN (VALUES (1), (2), (3)) AS roles(role_id)
WHERE p.name LIKE 'API:%'
AND NOT EXISTS (
    SELECT 1
    FROM tbl_role_has_permission rhp
    WHERE rhp.role_id = roles.role_id
      AND rhp.permission_id = p.id
);
