import { Component, input, output, model, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppIconComponent } from '../app-icon';
import { Recipe } from '../../chef.service';

export interface ChatMessage {
  sender: 'user' | 'chef';
  text: string;
  timestamp: Date;
  recipe?: Recipe;
}

@Component({
  selector: 'app-chat-log',
  standalone: true,
  imports: [CommonModule, FormsModule, AppIconComponent],
  templateUrl: './chat_log.component.html',
  styleUrl: './chat_log.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class ChatLogComponent {
  readonly isDarkMode = input.required<boolean>();
  readonly isChatCollapsed = input.required<boolean>();
  readonly chatHistory = input.required<ChatMessage[]>();
  readonly isTranscribing = input.required<boolean>();
  readonly isThinking = input.required<boolean>();
  readonly isBusy = input.required<boolean>();

  readonly typedMessage = model<string>('');

  readonly toggleChat = output<void>();
  readonly openRecipe = output<Recipe>();
  readonly submitTypedMessage = output<void>();
}
