-- 1. Insert MENU permission for admin permissions page
INSERT INTO tbl_permission (name, description, type, menu_key)
SELECT 'MENU:ADMIN_PERMISSIONS', 'Menu access for admin permissions workspace', 'MENU', '/admin/permissions'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'MENU:ADMIN_PERMISSIONS');

-- 2. Insert all missing API permissions
INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:PUT:ACCOUNT_USERS_PARAM_PREFERENCES', 'Auto generated for account-service - PUT /account/users/{id}/preferences', 'API', 'PUT', '/account/users/{id}/preferences'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:PUT:ACCOUNT_USERS_PARAM_PREFERENCES');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:ACCOUNT', 'Auto generated for account-service - GET /account', 'API', 'GET', '/account'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:ACCOUNT');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:ACCOUNT_ADMIN_FAMILIES_PARAM_QUEST_POINTS_GRANTS_PAGE', 'Auto generated for account-service - GET /account/admin/families/{id}/quest-points/grants/page', 'API', 'GET', '/account/admin/families/{id}/quest-points/grants/page'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:ACCOUNT_ADMIN_FAMILIES_PARAM_QUEST_POINTS_GRANTS_PAGE');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:ACCOUNT_ADMIN_FAMILIES_PAGE', 'Auto generated for account-service - GET /account/admin/families/page', 'API', 'GET', '/account/admin/families/page'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:ACCOUNT_ADMIN_FAMILIES_PAGE');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:ACCOUNT_ADMIN_USERS_PARAM_FAMILIES', 'Auto generated for account-service - GET /account/admin/users/{id}/families', 'API', 'GET', '/account/admin/users/{id}/families'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:ACCOUNT_ADMIN_USERS_PARAM_FAMILIES');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:PUT:ACCOUNT_FAMILIES_PARAM_MEMBERS_PARAM_HOST', 'Auto generated for account-service - PUT /account/families/{id}/members/{userId}/host', 'API', 'PUT', '/account/families/{id}/members/{userId}/host'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:PUT:ACCOUNT_FAMILIES_PARAM_MEMBERS_PARAM_HOST');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:PUT:ACCOUNT_FAMILIES_PARAM_MEMBERS_PARAM_DEMOTE_HOST', 'Auto generated for account-service - PUT /account/families/{id}/members/{userId}/demote-host', 'API', 'PUT', '/account/families/{id}/members/{userId}/demote-host'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:PUT:ACCOUNT_FAMILIES_PARAM_MEMBERS_PARAM_DEMOTE_HOST');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:PUT:ACCOUNT_ADMIN_FAMILIES_PARAM_MEMBERS_PARAM_HOST', 'Auto generated for account-service - PUT /account/admin/families/{id}/members/{userId}/host', 'API', 'PUT', '/account/admin/families/{id}/members/{userId}/host'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:PUT:ACCOUNT_ADMIN_FAMILIES_PARAM_MEMBERS_PARAM_HOST');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:PUT:ACCOUNT_ADMIN_FAMILIES_PARAM_MEMBERS_PARAM_DEMOTE_HOST', 'Auto generated for account-service - PUT /account/admin/families/{id}/members/{userId}/demote-host', 'API', 'PUT', '/account/admin/families/{id}/members/{userId}/demote-host'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:PUT:ACCOUNT_ADMIN_FAMILIES_PARAM_MEMBERS_PARAM_DEMOTE_HOST');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:AUTH_ACCOUNT_USER_PARAM', 'Auto generated for authentication-service - GET /auth/account/user/{id}', 'API', 'GET', '/auth/account/user/{id}'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:AUTH_ACCOUNT_USER_PARAM');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:AUTH_ACCOUNT_USER_LIST', 'Auto generated for authentication-service - GET /auth/account/user/list', 'API', 'GET', '/auth/account/user/list'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:AUTH_ACCOUNT_USER_LIST');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:AUTH_ACCOUNT_USER_ADD', 'Auto generated for authentication-service - POST /auth/account/user/add', 'API', 'POST', '/auth/account/user/add'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:AUTH_ACCOUNT_USER_ADD');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:PUT:AUTH_ACCOUNT_USER_UPD', 'Auto generated for authentication-service - PUT /auth/account/user/upd', 'API', 'PUT', '/auth/account/user/upd'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:PUT:AUTH_ACCOUNT_USER_UPD');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:DELETE:AUTH_ACCOUNT_USER_DEL_PARAM', 'Auto generated for authentication-service - DELETE /auth/account/user/del/{id}', 'API', 'DELETE', '/auth/account/user/del/{id}'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:DELETE:AUTH_ACCOUNT_USER_DEL_PARAM');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:PATCH:AUTH_ACCOUNT_USER_CHANGE_PWD', 'Auto generated for authentication-service - PATCH /auth/account/user/change-pwd', 'API', 'PATCH', '/auth/account/user/change-pwd'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:PATCH:AUTH_ACCOUNT_USER_CHANGE_PWD');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:AUTH_ACCOUNT_USER', 'Auto generated for authentication-service - POST /auth/account/user', 'API', 'POST', '/auth/account/user'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:AUTH_ACCOUNT_USER');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:AUTH_ACCOUNT_USER_AVATAR_PARAM', 'Auto generated for authentication-service - GET /auth/account/user/avatar/{id}', 'API', 'GET', '/auth/account/user/avatar/{id}'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:AUTH_ACCOUNT_USER_AVATAR_PARAM');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:AUTH_ACCESS_TOKEN', 'Auto generated for authentication-service - POST /auth/access-token', 'API', 'POST', '/auth/access-token'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:AUTH_ACCESS_TOKEN');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:AUTH_REFRESH_TOKEN', 'Auto generated for authentication-service - POST /auth/refresh-token', 'API', 'POST', '/auth/refresh-token'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:AUTH_REFRESH_TOKEN');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:AUTH_EXCHANGE_KEYCLOAK_TOKEN', 'Auto generated for authentication-service - POST /auth/exchange-keycloak-token', 'API', 'POST', '/auth/exchange-keycloak-token'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:AUTH_EXCHANGE_KEYCLOAK_TOKEN');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:AUTH_EXCHANGE_GOOGLE_TOKEN', 'Auto generated for authentication-service - POST /auth/exchange-google-token', 'API', 'POST', '/auth/exchange-google-token'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:AUTH_EXCHANGE_GOOGLE_TOKEN');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:AUTH_EXCHANGE_GITHUB_TOKEN', 'Auto generated for authentication-service - POST /auth/exchange-github-token', 'API', 'POST', '/auth/exchange-github-token'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:AUTH_EXCHANGE_GITHUB_TOKEN');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:AUTH_FORCE_CHANGE_PASSWORD', 'Auto generated for authentication-service - POST /auth/force-change-password', 'API', 'POST', '/auth/force-change-password'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:AUTH_FORCE_CHANGE_PASSWORD');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:AUTH_FORGOT_PASSWORD', 'Auto generated for authentication-service - POST /auth/forgot-password', 'API', 'POST', '/auth/forgot-password'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:AUTH_FORGOT_PASSWORD');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:AUTH_REGISTER', 'Auto generated for authentication-service - POST /auth/register', 'API', 'POST', '/auth/register'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:AUTH_REGISTER');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:AUTH_TEST_CORS', 'Auto generated for authentication-service - GET /auth/test-cors', 'API', 'GET', '/auth/test-cors'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:AUTH_TEST_CORS');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:AUTH_TEST_DELAY', 'Auto generated for authentication-service - GET /auth/test-delay', 'API', 'GET', '/auth/test-delay'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:AUTH_TEST_DELAY');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:AUTH_CAPTCHA', 'Auto generated for authentication-service - GET /auth/captcha', 'API', 'GET', '/auth/captcha'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:AUTH_CAPTCHA');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:AUTH_ROLES_PERMISSIONS_MISSING_APIS', 'Auto generated for authentication-service - GET /auth/roles/permissions/missing-apis', 'API', 'GET', '/auth/roles/permissions/missing-apis'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:AUTH_ROLES_PERMISSIONS_MISSING_APIS');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:AUTH_ROLES_PERMISSIONS', 'Auto generated for authentication-service - GET /auth/roles/permissions', 'API', 'GET', '/auth/roles/permissions'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:AUTH_ROLES_PERMISSIONS');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:AUTH_2FA', 'Auto generated for authentication-service - GET /auth/2fa', 'API', 'GET', '/auth/2fa'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:AUTH_2FA');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:AUTH_2FA_STATUS', 'Auto generated for authentication-service - GET /auth/2fa/status', 'API', 'GET', '/auth/2fa/status'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:AUTH_2FA_STATUS');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:AUTH_2FA_GENERATE', 'Auto generated for authentication-service - POST /auth/2fa/generate', 'API', 'POST', '/auth/2fa/generate'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:AUTH_2FA_GENERATE');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:AUTH_2FA_VERIFY', 'Auto generated for authentication-service - POST /auth/2fa/verify', 'API', 'POST', '/auth/2fa/verify'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:AUTH_2FA_VERIFY');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:AUTH_2FA_DISABLE', 'Auto generated for authentication-service - POST /auth/2fa/disable', 'API', 'POST', '/auth/2fa/disable'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:AUTH_2FA_DISABLE');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:PATCH:AUTH_USERS_PARAM_STATUS', 'Auto generated for authentication-service - PATCH /auth/users/{id}/status', 'API', 'PATCH', '/auth/users/{id}/status'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:PATCH:AUTH_USERS_PARAM_STATUS');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:AUTH_USERS_PARAM_RESET_PASSWORD', 'Auto generated for authentication-service - POST /auth/users/{id}/reset-password', 'API', 'POST', '/auth/users/{id}/reset-password'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:AUTH_USERS_PARAM_RESET_PASSWORD');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:PATCH:AUTH_USERS_PARAM_TYPE', 'Auto generated for authentication-service - PATCH /auth/users/{id}/type', 'API', 'PATCH', '/auth/users/{id}/type'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:PATCH:AUTH_USERS_PARAM_TYPE');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:BABY_BABIES_LOGS_PARAM_COMMENTS', 'Auto generated for baby-service - POST /baby/babies/logs/{logId}/comments', 'API', 'POST', '/baby/babies/logs/{logId}/comments'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:BABY_BABIES_LOGS_PARAM_COMMENTS');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:BABY_BABIES_LOGS_PARAM_COMMENTS', 'Auto generated for baby-service - GET /baby/babies/logs/{logId}/comments', 'API', 'GET', '/baby/babies/logs/{logId}/comments'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:BABY_BABIES_LOGS_PARAM_COMMENTS');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:DELETE:BABY_BABIES_LOGS_COMMENTS_PARAM', 'Auto generated for baby-service - DELETE /baby/babies/logs/comments/{commentId}', 'API', 'DELETE', '/baby/babies/logs/comments/{commentId}'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:DELETE:BABY_BABIES_LOGS_COMMENTS_PARAM');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:BABY_BABIES_LOGS_COMMENTS_PARAM_REACT', 'Auto generated for baby-service - POST /baby/babies/logs/comments/{commentId}/react', 'API', 'POST', '/baby/babies/logs/comments/{commentId}/react'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:BABY_BABIES_LOGS_COMMENTS_PARAM_REACT');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:DELETE:BABY_BABIES_LOGS_COMMENTS_PARAM_REACT', 'Auto generated for baby-service - DELETE /baby/babies/logs/comments/{commentId}/react', 'API', 'DELETE', '/baby/babies/logs/comments/{commentId}/react'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:DELETE:BABY_BABIES_LOGS_COMMENTS_PARAM_REACT');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:BABY_BABIES_BATCH', 'Auto generated for baby-service - POST /baby/babies/batch', 'API', 'POST', '/baby/babies/batch'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:BABY_BABIES_BATCH');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:EXPENSE_EXPENSES_REPORTS_CATEGORIES', 'Auto generated for expense-service - GET /expense/expenses/reports/categories', 'API', 'GET', '/expense/expenses/reports/categories'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:EXPENSE_EXPENSES_REPORTS_CATEGORIES');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:EXPENSE_EXPENSES_BATCH', 'Auto generated for expense-service - POST /expense/expenses/batch', 'API', 'POST', '/expense/expenses/batch'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:EXPENSE_EXPENSES_BATCH');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:FILE', 'Auto generated for file-service - POST /file', 'API', 'POST', '/file'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:FILE');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:FILE_FILES_PARAM_VIEW', 'Auto generated for file-service - GET /file/files/{id}/view', 'API', 'GET', '/file/files/{id}/view'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:FILE_FILES_PARAM_VIEW');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:FILE_FILES', 'Auto generated for file-service - POST /file/files', 'API', 'POST', '/file/files'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:FILE_FILES');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:FILE_FILES_IMPORT_EXPENSES', 'Auto generated for file-service - POST /file/files/import/expenses', 'API', 'POST', '/file/files/import/expenses'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:FILE_FILES_IMPORT_EXPENSES');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:FILE_FILES_IMPORT_BABIES', 'Auto generated for file-service - POST /file/files/import/babies', 'API', 'POST', '/file/files/import/babies'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:FILE_FILES_IMPORT_BABIES');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:FILE_FILES_IMPORT_SHOPPING', 'Auto generated for file-service - POST /file/files/import/shopping', 'API', 'POST', '/file/files/import/shopping'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:FILE_FILES_IMPORT_SHOPPING');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:FILE_FILES_IMPORT_VACCINATIONS', 'Auto generated for file-service - POST /file/files/import/vaccinations', 'API', 'POST', '/file/files/import/vaccinations'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:FILE_FILES_IMPORT_VACCINATIONS');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:FILE_FILES_IMPORT_GROWTH_RECORDS', 'Auto generated for file-service - POST /file/files/import/growth-records', 'API', 'POST', '/file/files/import/growth-records'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:FILE_FILES_IMPORT_GROWTH_RECORDS');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:FILE_FILES_TEMPLATE_EXCEL', 'Auto generated for file-service - GET /file/files/template/excel', 'API', 'GET', '/file/files/template/excel'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:FILE_FILES_TEMPLATE_EXCEL');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:INSIGHT', 'Auto generated for insight-service - POST /insight', 'API', 'POST', '/insight'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:POST:INSIGHT');

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:MEAL', 'Auto generated for meal-service - GET /meal', 'API', 'GET', '/meal'
WHERE NOT EXISTS (SELECT 1 FROM tbl_permission WHERE name = 'API:GET:MEAL');

-- 3. Assign all to ADMIN and OWNER roles
INSERT INTO tbl_role_has_permission (role_id, permission_id)
SELECT r.id, p.id
FROM tbl_role r
JOIN tbl_permission p
  ON p.name IN (
      'MENU:ADMIN_PERMISSIONS',
      'API:PUT:ACCOUNT_USERS_PARAM_PREFERENCES',
      'API:GET:ACCOUNT',
      'API:GET:ACCOUNT_ADMIN_FAMILIES_PARAM_QUEST_POINTS_GRANTS_PAGE',
      'API:GET:ACCOUNT_ADMIN_FAMILIES_PAGE',
      'API:GET:ACCOUNT_ADMIN_USERS_PARAM_FAMILIES',
      'API:PUT:ACCOUNT_FAMILIES_PARAM_MEMBERS_PARAM_HOST',
      'API:PUT:ACCOUNT_FAMILIES_PARAM_MEMBERS_PARAM_DEMOTE_HOST',
      'API:PUT:ACCOUNT_ADMIN_FAMILIES_PARAM_MEMBERS_PARAM_HOST',
      'API:PUT:ACCOUNT_ADMIN_FAMILIES_PARAM_MEMBERS_PARAM_DEMOTE_HOST',
      'API:GET:AUTH_ACCOUNT_USER_PARAM',
      'API:GET:AUTH_ACCOUNT_USER_LIST',
      'API:POST:AUTH_ACCOUNT_USER_ADD',
      'API:PUT:AUTH_ACCOUNT_USER_UPD',
      'API:DELETE:AUTH_ACCOUNT_USER_DEL_PARAM',
      'API:PATCH:AUTH_ACCOUNT_USER_CHANGE_PWD',
      'API:POST:AUTH_ACCOUNT_USER',
      'API:GET:AUTH_ACCOUNT_USER_AVATAR_PARAM',
      'API:POST:AUTH_ACCESS_TOKEN',
      'API:POST:AUTH_REFRESH_TOKEN',
      'API:POST:AUTH_EXCHANGE_KEYCLOAK_TOKEN',
      'API:POST:AUTH_EXCHANGE_GOOGLE_TOKEN',
      'API:POST:AUTH_EXCHANGE_GITHUB_TOKEN',
      'API:POST:AUTH_FORCE_CHANGE_PASSWORD',
      'API:POST:AUTH_FORGOT_PASSWORD',
      'API:POST:AUTH_REGISTER',
      'API:GET:AUTH_TEST_CORS',
      'API:GET:AUTH_TEST_DELAY',
      'API:GET:AUTH_CAPTCHA',
      'API:GET:AUTH_ROLES_PERMISSIONS_MISSING_APIS',
      'API:GET:AUTH_ROLES_PERMISSIONS',
      'API:GET:AUTH_2FA',
      'API:GET:AUTH_2FA_STATUS',
      'API:POST:AUTH_2FA_GENERATE',
      'API:POST:AUTH_2FA_VERIFY',
      'API:POST:AUTH_2FA_DISABLE',
      'API:PATCH:AUTH_USERS_PARAM_STATUS',
      'API:POST:AUTH_USERS_PARAM_RESET_PASSWORD',
      'API:PATCH:AUTH_USERS_PARAM_TYPE',
      'API:POST:BABY_BABIES_LOGS_PARAM_COMMENTS',
      'API:GET:BABY_BABIES_LOGS_PARAM_COMMENTS',
      'API:DELETE:BABY_BABIES_LOGS_COMMENTS_PARAM',
      'API:POST:BABY_BABIES_LOGS_COMMENTS_PARAM_REACT',
      'API:DELETE:BABY_BABIES_LOGS_COMMENTS_PARAM_REACT',
      'API:POST:BABY_BABIES_BATCH',
      'API:GET:EXPENSE_EXPENSES_REPORTS_CATEGORIES',
      'API:POST:EXPENSE_EXPENSES_BATCH',
      'API:POST:FILE',
      'API:GET:FILE_FILES_PARAM_VIEW',
      'API:POST:FILE_FILES',
      'API:POST:FILE_FILES_IMPORT_EXPENSES',
      'API:POST:FILE_FILES_IMPORT_BABIES',
      'API:POST:FILE_FILES_IMPORT_SHOPPING',
      'API:POST:FILE_FILES_IMPORT_VACCINATIONS',
      'API:POST:FILE_FILES_IMPORT_GROWTH_RECORDS',
      'API:GET:FILE_FILES_TEMPLATE_EXCEL',
      'API:POST:INSIGHT',
      'API:GET:MEAL'
  )
WHERE r.name IN ('ADMIN', 'OWNER')
AND NOT EXISTS (
    SELECT 1
    FROM tbl_role_has_permission rhp
    WHERE rhp.role_id = r.id
      AND rhp.permission_id = p.id
);
