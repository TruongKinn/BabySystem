import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { HandbookComponent } from './handbook/handbook.component';
import { ShopComponent } from './shop/shop.component';
import { CommunityComponent } from './community/community.component';
import { HealthComponent } from './health/health.component';

export const guestRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  { path: 'home', component: HomeComponent },
  { path: 'handbook', component: HandbookComponent },
  { path: 'shop', component: ShopComponent },
  { path: 'community', component: CommunityComponent },
  { path: 'health', component: HealthComponent },
];
