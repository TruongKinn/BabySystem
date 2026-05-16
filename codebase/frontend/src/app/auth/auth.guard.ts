import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

const ADMIN_ROLES = ['ADMIN', 'OWNER'];

const normalizeRole = (value: string): string => value.trim().toUpperCase().replace(/^ROLE_/, '');

const isAdminRoute = (route: Parameters<CanActivateFn>[0]): boolean => {
    const portal = route.data?.['portal'];
    if (portal === 'admin') {
        return true;
    }

    const requiredRoles = route.data?.['roles'] as string[] | undefined;
    if (!requiredRoles || requiredRoles.length === 0) {
        return false;
    }

    return requiredRoles.map(normalizeRole).some((role) => ADMIN_ROLES.includes(role));
};

export const authGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
        const loginPath = isAdminRoute(route) ? '/admin/login' : '/app/login';
        return router.createUrlTree([loginPath], { queryParams: { redirect: state.url } });
    }

    const requiredRoles = route.data?.['roles'] as string[] | undefined;
    const portal = route.data?.['portal'] as 'admin' | 'user' | undefined;

    if (requiredRoles && requiredRoles.length > 0 && !authService.hasAnyRole(requiredRoles)) {
        return router.createUrlTree(['/403']);
    }

    if (portal === 'admin' && !authService.isAdminUser()) {
        return router.createUrlTree(['/403']);
    }

    if (portal === 'user' && authService.isAdminUser()) {
        return router.createUrlTree(['/admin/users']);
    }

    return true;
};

export const landingGuard: CanActivateFn = () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
        return router.createUrlTree(['/app/login']);
    }

    return router.createUrlTree([authService.getDefaultRouteByRole()]);
};
