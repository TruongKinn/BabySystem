import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { MockSuperAppService } from '../core/services/mock-super-app.service';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, NzCardModule, NzTagModule],
  templateUrl: './tasks.component.html',
  styleUrl: './tasks.component.css'
})
export class TasksComponent {
  private readonly data = inject(MockSuperAppService);

  readonly tasks$ = this.data.getTasks();
}
