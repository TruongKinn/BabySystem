INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:BABY_FORECAST_LATEST_READ', 'Read latest baby forecast', 'API', 'GET', '/baby/babies/{id}/forecast/latest'
WHERE NOT EXISTS (
    SELECT 1 FROM tbl_permission WHERE name = 'API:GET:BABY_FORECAST_LATEST_READ'
);

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:BABY_FORECAST_HISTORY_READ', 'Read baby forecast history', 'API', 'GET', '/baby/babies/{id}/forecast/history'
WHERE NOT EXISTS (
    SELECT 1 FROM tbl_permission WHERE name = 'API:GET:BABY_FORECAST_HISTORY_READ'
);

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:GET:BABY_FORECAST_ANOMALY_LIST', 'Read baby forecast anomalies', 'API', 'GET', '/baby/babies/{id}/forecast/anomalies'
WHERE NOT EXISTS (
    SELECT 1 FROM tbl_permission WHERE name = 'API:GET:BABY_FORECAST_ANOMALY_LIST'
);

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:POST:BABY_FORECAST_REFRESH', 'Queue baby forecast refresh', 'API', 'POST', '/baby/babies/{id}/forecast/refresh'
WHERE NOT EXISTS (
    SELECT 1 FROM tbl_permission WHERE name = 'API:POST:BABY_FORECAST_REFRESH'
);

INSERT INTO tbl_permission (name, description, type, api_method, api_path)
SELECT 'API:PATCH:BABY_FORECAST_ANOMALY_RESOLVE', 'Resolve baby forecast anomaly', 'API', 'PATCH', '/baby/babies/{id}/forecast/anomalies/{anomalyId}/resolve'
WHERE NOT EXISTS (
    SELECT 1 FROM tbl_permission WHERE name = 'API:PATCH:BABY_FORECAST_ANOMALY_RESOLVE'
);

INSERT INTO tbl_role_has_permission (role_id, permission_id)
SELECT roles.role_id, p.id
FROM tbl_permission p
CROSS JOIN (VALUES (1), (2), (3)) AS roles(role_id)
WHERE p.name IN (
    'API:GET:BABY_FORECAST_LATEST_READ',
    'API:GET:BABY_FORECAST_HISTORY_READ',
    'API:GET:BABY_FORECAST_ANOMALY_LIST',
    'API:POST:BABY_FORECAST_REFRESH',
    'API:PATCH:BABY_FORECAST_ANOMALY_RESOLVE'
)
AND NOT EXISTS (
    SELECT 1
    FROM tbl_role_has_permission rhp
    WHERE rhp.role_id = roles.role_id
      AND rhp.permission_id = p.id
);
