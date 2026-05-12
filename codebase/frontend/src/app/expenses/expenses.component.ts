import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { map } from 'rxjs';
import { MockSuperAppService } from '../core/services/mock-super-app.service';

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, NzCardModule, NzProgressModule],
  templateUrl: './expenses.component.html',
  styleUrl: './expenses.component.css'
})
export class ExpensesComponent {
  private readonly data = inject(MockSuperAppService);

  readonly expense$ = this.data.getDashboard().pipe(
    map((snapshot) => ({
      ...snapshot.expense,
      budgetPercent: Math.round((snapshot.expense.monthlySpent / snapshot.expense.monthlyBudget) * 100)
    }))
  );
}
