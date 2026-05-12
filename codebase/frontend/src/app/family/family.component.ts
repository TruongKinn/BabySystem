import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { MockSuperAppService } from '../core/services/mock-super-app.service';

@Component({
  selector: 'app-family',
  standalone: true,
  imports: [CommonModule, NzAvatarModule, NzCardModule, NzTagModule],
  templateUrl: './family.component.html',
  styleUrl: './family.component.css'
})
export class FamilyComponent {
  private readonly data = inject(MockSuperAppService);

  readonly members$ = this.data.getFamilyMembers();
}
