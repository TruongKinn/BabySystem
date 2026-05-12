import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { LoginComponent } from './auth/login/login.component';
import { BabyComponent } from './baby/baby.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ExpensesComponent } from './expenses/expenses.component';
import { FamilyComponent } from './family/family.component';
import { InsightsComponent } from './insights/insights.component';
import { MealsComponent } from './meals/meals.component';
import { ProfileComponent } from './profile/profile.component';
import { SettingsComponent } from './settings/settings.component';
import { ShoppingComponent } from './shopping/shopping.component';
import { TasksComponent } from './tasks/tasks.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'baby', component: BabyComponent, canActivate: [authGuard] },
  { path: 'meals', component: MealsComponent, canActivate: [authGuard] },
  { path: 'expenses', component: ExpensesComponent, canActivate: [authGuard] },
  { path: 'tasks', component: TasksComponent, canActivate: [authGuard] },
  { path: 'shopping', component: ShoppingComponent, canActivate: [authGuard] },
  { path: 'insights', component: InsightsComponent, canActivate: [authGuard] },
  { path: 'family', component: FamilyComponent, canActivate: [authGuard] },
  { path: 'settings', component: SettingsComponent, canActivate: [authGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
  { path: 'login', component: LoginComponent },
  { path: '**', redirectTo: 'dashboard' }
];
