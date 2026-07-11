import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzLayoutModule } from 'ng-zorro-antd/layout';

@Component({
  selector: 'app-guest-footer',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, NzGridModule, NzLayoutModule],
  templateUrl: './guest-footer.component.html',
  styleUrl: './guest-footer.component.css'
})
export class GuestFooterComponent {}
