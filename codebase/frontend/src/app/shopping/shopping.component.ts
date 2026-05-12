import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { MockSuperAppService } from '../core/services/mock-super-app.service';

@Component({
  selector: 'app-shopping',
  standalone: true,
  imports: [CommonModule, NzCardModule, NzTagModule],
  templateUrl: './shopping.component.html',
  styleUrl: './shopping.component.css'
})
export class ShoppingComponent {
  private readonly data = inject(MockSuperAppService);

  readonly items$ = this.data.getShoppingItems();
}
