import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { map } from 'rxjs';
import { MockSuperAppService } from '../core/services/mock-super-app.service';

@Component({
  selector: 'app-insights',
  standalone: true,
  imports: [CommonModule, NzCardModule, NzProgressModule],
  templateUrl: './insights.component.html',
  styleUrl: './insights.component.css'
})
export class InsightsComponent {
  private readonly data = inject(MockSuperAppService);

  readonly insight$ = this.data.getDashboard().pipe(
    map((snapshot) => ({
      sleepScore: Math.min(100, Math.round((snapshot.baby.sleepHours / 12) * 100)),
      budgetScore: Math.max(0, 100 - Math.round((snapshot.expense.monthlySpent / snapshot.expense.monthlyBudget) * 100)),
      workloadScore: Math.max(0, 100 - snapshot.pendingTasks * 8)
    }))
  );
}
