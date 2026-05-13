import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { map } from 'rxjs';
import { MockSuperAppService } from '../core/services/mock-super-app.service';

@Component({
  selector: 'app-insights',
  standalone: true,
  imports: [CommonModule, TranslateModule, NzCardModule, NzProgressModule],
  templateUrl: './insights.component.html',
  styleUrl: './insights.component.css'
})
export class InsightsComponent {
  private readonly data = inject(MockSuperAppService);

  readonly insight$ = this.data.getDashboard().pipe(
    map((snapshot) => {
      const budgetPercent =
        snapshot.expense.monthlyBudget > 0
          ? Math.round((snapshot.expense.monthlySpent / snapshot.expense.monthlyBudget) * 100)
          : 0;

      return {
        sleepScore: Math.max(0, Math.min(100, Math.round((snapshot.baby.sleepHours / 12) * 100))),
        budgetScore: Math.max(0, 100 - budgetPercent),
        workloadScore: Math.max(0, 100 - snapshot.pendingTasks * 8)
      };
    })
  );
}
