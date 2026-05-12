import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
        return router.createUrlTree(['/login']);
    }

    const requiredRoles = route.data?.['roles'] as string[] | undefined;
    if (!requiredRoles || requiredRoles.length === 0) {
        return true;
    }

    if (authService.hasAnyRole(requiredRoles)) {
        return true;
    }

    return router.createUrlTree(['/403']);
};
