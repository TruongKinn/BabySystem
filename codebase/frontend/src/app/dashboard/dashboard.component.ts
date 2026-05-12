import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { map } from 'rxjs';
import { MockSuperAppService } from '../core/services/mock-super-app.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    NzCardModule,
    NzGridModule,
    NzIconModule,
    NzListModule,
    NzProgressModule,
    NzStatisticModule,
    NzTagModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  private readonly data = inject(MockSuperAppService);

  readonly vm$ = this.data.getDashboard().pipe(
    map((snapshot) => ({
      snapshot,
      budgetPercent: Math.round((snapshot.expense.monthlySpent / snapshot.expense.monthlyBudget) * 100)
    }))
  );
}
