import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type IconName =
  | 'logo'
  | 'sun'
  | 'moon'
  | 'reset'
  | 'mic'
  | 'pot'
  | 'bowl'
  | 'meat'
  | 'soup'
  | 'timer'
  | 'chef-hat'
  | 'user'
  | 'book'
  | 'close'
  | 'chevron-down'
  | 'send'
  | 'play'
  | 'pause'
  | 'trash'
  | 'info'
  | 'sparkles'
  | 'warning'
  | 'logout'
  | 'copy';

@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg
      [attr.width]="size || null"
      [attr.height]="size || null"
      [attr.viewBox]="getViewBox()"
      [attr.fill]="getFill()"
      [attr.stroke]="getStroke()"
      xmlns="http://www.w3.org/2000/svg"
    >
      <ng-container [ngSwitch]="name">
        <!-- Brand Logo -->
        <g *ngSwitchCase="'logo'">
          <ellipse cx="18" cy="24" rx="13" ry="5" fill="url(#bowlGrad)" opacity="0.9" />
          <path d="M5 18 Q5 28 18 28 Q31 28 31 18" fill="url(#bowlGrad2)" stroke="none" />
          <path
            d="M12 14 Q11 10 13 7 Q15 4 13 1"
            stroke="#FF8C42"
            stroke-width="1.8"
            stroke-linecap="round"
            fill="none"
            opacity="0.8"
          />
          <path
            d="M18 13 Q17 9 19 6 Q21 3 19 0"
            stroke="#FFB347"
            stroke-width="1.8"
            stroke-linecap="round"
            fill="none"
            opacity="0.6"
          />
          <path
            d="M24 14 Q23 10 25 7 Q27 4 25 1"
            stroke="#FF6B35"
            stroke-width="1.8"
            stroke-linecap="round"
            fill="none"
            opacity="0.8"
          />
          <line
            x1="27"
            y1="9"
            x2="33"
            y2="22"
            stroke="#C8A96E"
            stroke-width="2"
            stroke-linecap="round"
          />
          <line
            x1="29"
            y1="8"
            x2="35"
            y2="21"
            stroke="#A0845C"
            stroke-width="1.5"
            stroke-linecap="round"
          />
          <defs>
            <linearGradient id="bowlGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#FF8C42" />
              <stop offset="100%" stop-color="#E85D2F" />
            </linearGradient>
            <linearGradient id="bowlGrad2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#FF9B5C" />
              <stop offset="100%" stop-color="#D4522A" />
            </linearGradient>
          </defs>
        </g>

        <!-- Sun -->
        <path
          *ngSwitchCase="'sun'"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"
        />

        <!-- Moon -->
        <path
          *ngSwitchCase="'moon'"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
        />

        <!-- Reset -->
        <path
          *ngSwitchCase="'reset'"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />

        <!-- Mic -->
        <path
          *ngSwitchCase="'mic'"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
        />

        <!-- Pot -->
        <path
          *ngSwitchCase="'pot'"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 3v3m-7 4h14m-13 0a1 1 0 00-1 1v6a3 3 0 003 3h10a3 3 0 003-3v-6a1 1 0 00-1-1M5 11h14"
        />

        <!-- Bowl -->
        <path
          *ngSwitchCase="'bowl'"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4 11a8 8 0 0016 0H4zm4 8h8"
        />

        <!-- Meat -->
        <path
          *ngSwitchCase="'meat'"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M15 5a3 3 0 013 3c0 .5-.1 1-.3 1.4A4.5 4.5 0 1111 16c-.5 0-1-.1-1.4-.3A3 3 0 115 15a3 3 0 013-3c.5 0 1 .1 1.4.3A4.5 4.5 0 0116 9c.5 0 1-.1 1.4-.3A3 3 0 0115 5z"
        />

        <!-- Soup -->
        <path
          *ngSwitchCase="'soup'"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4 12h16s-1 7-8 7-8-7-8-7zm4-4q1-2 0-4m4 4q1-2 0-4m4 4q1-2 0-4"
        />

        <!-- Timer -->
        <path
          *ngSwitchCase="'timer'"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />

        <!-- Chef Hat -->
        <path
          *ngSwitchCase="'chef-hat'"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M6 19h12M6 19a2 2 0 00-2 2h16a2 2 0 00-2-2M6 19a4 4 0 01-2-7.5A5 5 0 0112 6a5 5 0 018 5.5A4 4 0 0118 19"
        />

        <!-- User -->
        <path
          *ngSwitchCase="'user'"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />

        <!-- Recipe Book -->
        <path
          *ngSwitchCase="'book'"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />

        <!-- Close X -->
        <path
          *ngSwitchCase="'close'"
          fill-rule="evenodd"
          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
          clip-rule="evenodd"
        />

        <!-- Chevron Down -->
        <path
          *ngSwitchCase="'chevron-down'"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 9l-7 7-7-7"
        />

        <!-- Send -->
        <path
          *ngSwitchCase="'send'"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
        />

        <!-- Play -->
        <path
          *ngSwitchCase="'play'"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
        />

        <!-- Pause -->
        <path
          *ngSwitchCase="'pause'"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M10 9v6m4-6v6"
        />

        <!-- Trash -->
        <path
          *ngSwitchCase="'trash'"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
        />

        <!-- Info -->
        <path
          *ngSwitchCase="'info'"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />

        <!-- Sparkles -->
        <path
          *ngSwitchCase="'sparkles'"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
        />
        <path
          *ngSwitchCase="'warning'"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
        <path
          *ngSwitchCase="'logout'"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
        />
        <path
          *ngSwitchCase="'copy'"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
        />
      </ng-container>
    </svg>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        vertical-align: middle;
      }
      svg {
        display: block;
        width: 100%;
        height: 100%;
      }
    `,
  ],
})
export class AppIconComponent {
  @Input() name: IconName = 'logo';
  @Input() size?: number | string;

  getViewBox(): string {
    if (this.name === 'logo') return '0 0 36 36';
    if (this.name === 'close') return '0 0 20 20';
    return '0 0 24 24';
  }

  getFill(): string {
    if (this.name === 'logo' || this.name === 'close') return 'currentColor';
    return 'none';
  }

  getStroke(): string {
    if (this.name === 'logo' || this.name === 'close') return 'none';
    return 'currentColor';
  }
}
