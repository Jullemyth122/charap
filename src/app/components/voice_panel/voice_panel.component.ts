import { Component, computed, input, output, ViewEncapsulation } from '@angular/core';
import { NgClass } from '@angular/common';
import { AppIconComponent } from '../app-icon';

@Component({
  selector: 'app-voice-panel',
  standalone: true,
  imports: [NgClass, AppIconComponent],
  templateUrl: './voice_panel.component.html',
  styleUrl: './voice_panel.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class VoicePanelComponent {
  readonly isDarkMode = input.required<boolean>();
  readonly isRecording = input.required<boolean>();
  readonly isBusy = input.required<boolean>();
  readonly visualizerData = input<Uint8Array | null>(null);

  readonly toggleRecording = output<void>();

  readonly getWaveformPoints = computed(() => {
    const data = this.visualizerData();
    if (!data) return '';

    const width = 300;
    const height = 60;
    const points: string[] = [];

    for (let i = 0; i < data.length; i += 2) {
      const x = (i / data.length) * width;
      const val = data[i] / 255;
      const y = height / 2 + (val - 0.5) * height * 1.5;
      points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }

    return points.join(' ');
  });
}
