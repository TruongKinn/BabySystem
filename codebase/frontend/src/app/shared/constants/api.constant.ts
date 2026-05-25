export const API_CONFIG = {
    GATEWAY_URL: 'http://localhost:4953',
    NOTIFICATION_WS_URL: 'http://localhost:8098/notification/ws/notifications',
    MINIO_URL: 'http://localhost:9000',
    DEFAULT_FAMILY_ID: 1,
    DEFAULT_BABY_ID: 1,
    GOOGLE_MAPS_API_KEY: '',
    GOOGLE_CLIENT_ID: (window as any).env?.GOOGLE_CLIENT_ID || '793208159346-4ucpps18skm5kcq7ppp4uke1ci38l85q.apps.googleusercontent.com',
    GITHUB_CLIENT_ID: (window as any).env?.GITHUB_CLIENT_ID || 'Ov23liwCFxVfCS2HTgbN'
};
