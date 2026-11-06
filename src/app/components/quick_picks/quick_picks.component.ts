import { Component, input, output, ViewEncapsulation } from '@angular/core';
import { NgClass } from '@angular/common';
import { AppIconComponent } from '../app-icon';

export interface QuickPrompt {
  label: string;
  query: string;
  icon: string;
}

@Component({
  selector: 'app-quick-picks',
  standalone: true,
  imports: [NgClass, AppIconComponent],
  templateUrl: './quick_picks.component.html',
  styleUrl: './quick_picks.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class QuickPicksComponent {
  readonly isDarkMode = input.required<boolean>();
  readonly isBusy = input.required<boolean>();
  readonly isQuickPicksCollapsed = input.required<boolean>();
  readonly quickPrompts = input.required<QuickPrompt[]>();

  readonly toggleQuickPicks = output<void>();
  readonly useQuickPrompt = output<string>();
}
