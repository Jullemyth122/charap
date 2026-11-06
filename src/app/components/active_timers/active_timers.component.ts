import { Component, input, output, ViewEncapsulation } from '@angular/core';
import { NgClass } from '@angular/common';
import { AppIconComponent } from '../app-icon';

export interface KitchenTimer {
  id: string;
  label: string;
  duration: number;
  max: number;
  intervalId?: any;
}

@Component({
  selector: 'app-active-timers',
  standalone: true,
  imports: [NgClass, AppIconComponent],
  templateUrl: './active_timers.component.html',
  styleUrl: './active_timers.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class ActiveTimersComponent {
  readonly isDarkMode = input.required<boolean>();
  readonly timers = input.required<KitchenTimer[]>();

  readonly deleteTimer = output<string>();

  protected formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
