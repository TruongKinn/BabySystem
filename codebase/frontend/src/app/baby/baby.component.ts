import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { MockSuperAppService } from '../core/services/mock-super-app.service';

@Component({
  selector: 'app-baby',
  standalone: true,
  imports: [CommonModule, NzCardModule, NzDescriptionsModule],
  templateUrl: './baby.component.html',
  styleUrl: './baby.component.css'
})
export class BabyComponent {
  private readonly data = inject(MockSuperAppService);

  readonly snapshot$ = this.data.getDashboard();
}
