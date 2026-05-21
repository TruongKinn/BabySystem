UPDATE tbl_permission 
SET api_path = '/account/users/{id}/preferences' 
WHERE name = 'API:PUT:USER_PREFERENCES';
