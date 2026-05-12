import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSwitchModule } from 'ng-zorro-antd/switch';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [FormsModule, NzCardModule, NzInputModule, NzSwitchModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent {
  notificationEnabled = true;
  reminderHour = '20:30';
}
