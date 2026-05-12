import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTableModule } from 'ng-zorro-antd/table';
import { MockSuperAppService } from '../core/services/mock-super-app.service';

@Component({
  selector: 'app-meals',
  standalone: true,
  imports: [CommonModule, NzCardModule, NzTableModule],
  templateUrl: './meals.component.html',
  styleUrl: './meals.component.css'
})
export class MealsComponent {
  private readonly data = inject(MockSuperAppService);

  readonly meals$ = this.data.getWeekMeals();
}
