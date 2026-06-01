import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { AdminDashboardComponent } from './admin/dashboard/admin-dashboard.component';
import { AdminAccessComponent } from './admin/access/admin-access.component';
import { AdminExportPasswordsComponent } from './admin/export-passwords/admin-export-passwords.component';
import { AdminFamiliesComponent } from './admin/families/admin-families.component';
import { AdminPermissionsComponent } from './admin/permissions/admin-permissions.component';
import { AdminUsersComponent } from './admin/users/admin-users.component';
import { AdminFinanceComponent } from './admin/finance/admin-finance.component';
import { AdminPremiumComponent } from './admin/premium/admin-premium.component';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { BabyComponent } from './baby/baby.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ExpensesComponent } from './expenses/expenses.component';
import { FamilyComponent } from './family/family.component';
import { InsightsComponent } from './insights/insights.component';
import { JourneyComponent } from './journey/journey.component';
import { MealsComponent } from './meals/meals.component';
import { ProfileComponent } from './profile/profile.component';
import { SettingsComponent } from './settings/settings.component';
import { ShoppingComponent } from './shopping/shopping.component';
import { ForbiddenComponent } from './shared/forbidden/forbidden.component';
import { TasksComponent } from './tasks/tasks.component';
import { DocumentsComponent } from './documents/documents.component';
import { AiCopilotComponent } from './ai-copilot/ai-copilot.component';
import { InvoicesComponent } from './invoices/invoices.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'admin/login' },
  { path: 'login', pathMatch: 'full', redirectTo: 'admin/login' },

  { path: 'app/login', component: LoginComponent, data: { portal: 'user' } },
  { path: 'app/register', component: RegisterComponent },
  { path: 'admin/login', component: LoginComponent, data: { portal: 'admin' } },

  {
    path: 'app',
    canActivate: [authGuard],
    data: { portal: 'user' },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'baby', component: BabyComponent },
      { path: 'journey', component: JourneyComponent },
      { path: 'meals', component: MealsComponent },
      { path: 'expenses', component: ExpensesComponent },
      { path: 'tasks', component: TasksComponent },
      { path: 'shopping', component: ShoppingComponent },
      { path: 'insights', component: InsightsComponent },
      { path: 'family', component: FamilyComponent },
      { path: 'settings/theme', component: SettingsComponent },
      { path: 'settings', component: SettingsComponent },
      { path: 'profile', component: ProfileComponent },
      { path: 'documents', component: DocumentsComponent },
      { path: 'copilot', component: AiCopilotComponent },
      { path: 'invoices', component: InvoicesComponent }
    ]
  },

  {
    path: 'admin',
    canActivate: [authGuard],
    data: { portal: 'admin', roles: ['ADMIN', 'OWNER'] },
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: AdminDashboardComponent },
      { path: 'users', component: AdminUsersComponent },
      { path: 'families', component: AdminFamiliesComponent },
      { path: 'premium', component: AdminPremiumComponent },
      { path: 'finance', component: AdminFinanceComponent },
      { path: 'export-passwords', component: AdminExportPasswordsComponent },
      { path: 'settings/theme', component: SettingsComponent },
      { path: 'access', component: AdminAccessComponent },
      { path: 'permissions', component: AdminPermissionsComponent }
    ]
  },

  { path: '403', component: ForbiddenComponent },

  { path: 'dashboard', redirectTo: 'app/dashboard', pathMatch: 'full' },
  { path: 'baby', redirectTo: 'app/baby', pathMatch: 'full' },
  { path: 'journey', redirectTo: 'app/journey', pathMatch: 'full' },
  { path: 'meals', redirectTo: 'app/meals', pathMatch: 'full' },
  { path: 'expenses', redirectTo: 'app/expenses', pathMatch: 'full' },
  { path: 'tasks', redirectTo: 'app/tasks', pathMatch: 'full' },
  { path: 'shopping', redirectTo: 'app/shopping', pathMatch: 'full' },
  { path: 'insights', redirectTo: 'app/insights', pathMatch: 'full' },
  { path: 'family', redirectTo: 'app/family', pathMatch: 'full' },
  { path: 'settings/theme', redirectTo: 'app/settings/theme', pathMatch: 'full' },
  { path: 'settings', redirectTo: 'app/settings', pathMatch: 'full' },
  { path: 'profile', redirectTo: 'app/profile', pathMatch: 'full' },
  { path: 'documents', redirectTo: 'app/documents', pathMatch: 'full' },
  { path: 'copilot', redirectTo: 'app/copilot', pathMatch: 'full' },
  { path: 'invoices', redirectTo: 'app/invoices', pathMatch: 'full' },

  { path: '**', redirectTo: 'admin/login' }
];
