import { AuthConfig } from 'angular-oauth2-oidc';

export const authConfig: AuthConfig = {
    issuer: 'http://localhost:8080/realms/micro-services',
    redirectUri: (typeof window !== 'undefined') ? window.location.origin + '/login' : 'http://localhost:4200/login',
    clientId: 'frontend-app',
    responseType: 'code',
    strictDiscoveryDocumentValidation: true,
    scope: 'openid profile email',
    showDebugInformation: true,
};
