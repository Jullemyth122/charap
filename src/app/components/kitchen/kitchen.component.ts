import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ElevenlabsService } from '../../elevenlabs.service';
import { ChefService, Recipe } from '../../chef.service';
import { ThemeService } from '../../services/theme.service';
import { VoicePanelComponent } from '../voice_panel/voice_panel.component';
import { QuickPicksComponent } from '../quick_picks/quick_picks.component';
import { ActiveTimersComponent, KitchenTimer } from '../active_timers/active_timers.component';
import { ChatLogComponent, ChatMessage } from '../chat_log/chat_log.component';
import { RecipeModalComponent } from '../recipe_modal/recipe_modal.component';

@Component({
  selector: 'app-kitchen',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    VoicePanelComponent,
    QuickPicksComponent,
    ActiveTimersComponent,
    ChatLogComponent,
    RecipeModalComponent,
  ],
  templateUrl: './kitchen.component.html',
  styleUrl: './kitchen.component.scss',
})
export class KitchenComponent implements OnInit, OnDestroy {
  private elevenlabsService = inject(ElevenlabsService);
  private chefService = inject(ChefService);
  protected themeService = inject(ThemeService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // App States
  protected readonly isRecording = signal(false);
  protected readonly isTranscribing = signal(false);
  protected readonly isThinking = signal(false);
  protected readonly chatHistory = signal<ChatMessage[]>([]);
  protected readonly timers = signal<KitchenTimer[]>([]);
  protected readonly visualizerData = signal<Uint8Array | null>(null);
  protected readonly typedMessage = signal('');
  protected readonly errorMessage = signal<string | null>(null);

  /** True whenever the AI or voice pipeline is busy — blocks all new input */
  protected readonly isBusy = computed(() => this.isThinking() || this.isTranscribing());

  // Collapse States
  protected readonly isQuickPicksCollapsed = signal(false);
  protected readonly isChatCollapsed = signal(false);

  // Recipe Modal State
  protected readonly currentRecipe = signal<Recipe | null>(null);

  // Quick culinary queries (Filipino Food Focused!)
  protected readonly quickPrompts = [
    { label: 'Chicken Tinola', query: 'How do I cook Chicken Tinola?', icon: 'pot' },
    { label: 'Beef Kaldereta', query: 'How to make Beef Kaldereta?', icon: 'bowl' },
    { label: 'Pork Adobo', query: 'Give me the Pork Adobo recipe.', icon: 'meat' },
    { label: 'Sinigang na Baboy', query: 'How do I make Sinigang na Baboy?', icon: 'soup' },
    { label: '10s Timer', query: 'set a timer for 10 seconds', icon: 'timer' },
  ];

  ngOnInit() {
    // Welcome message from Charap
    if (this.chatHistory().length === 0) {
      this.chatHistory.set([
        {
          sender: 'chef',
          text: "Welcome to **Charap**! I'm your AI kitchen companion. Ask me for a recipe, set a cooking timer, or just tap the mic and speak. Let's cook something amazing!",
          timestamp: new Date(),
        },
      ]);
    }

    // Check for query parameters passed from the Home page (e.g., /kitchen?q=...)
    this.route.queryParamMap.subscribe((params) => {
      const query = params.get('q');
      if (query && query.trim().length > 0) {
        // Clear the query parameter from URL so refreshing won't re-trigger
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: {},
          replaceUrl: true,
        });
        this.processUserQuery(query);
      }
    });
  }

  protected toggleQuickPicks() {
    this.isQuickPicksCollapsed.set(!this.isQuickPicksCollapsed());
  }

  protected toggleChat() {
    this.isChatCollapsed.set(!this.isChatCollapsed());
  }

  ngOnDestroy() {
    this.timers().forEach((t) => {
      if (t.intervalId) {
        clearInterval(t.intervalId);
      }
    });
  }

  /**
   * Toggles microphone recording
   */
  async toggleRecording() {
    // Don't allow starting a new recording while AI is processing a response
    if (!this.isRecording() && this.isBusy()) return;
    this.errorMessage.set(null);
    if (this.isRecording()) {
      this.isRecording.set(false);
      this.isTranscribing.set(true);
      try {
        const text = await this.elevenlabsService.stopRecording();
        this.visualizerData.set(null);
        if (text && text.trim().length > 0) {
          this.processUserQuery(text);
        } else {
          this.errorMessage.set("I couldn't catch that. Please try speaking closer to your mic.");
        }
      } catch (err: any) {
        console.error(err);
        this.errorMessage.set(`Speech transcription failed: ${err.message || err}`);
        this.visualizerData.set(null);
      } finally {
        this.isTranscribing.set(false);
      }
    } else {
      try {
        this.errorMessage.set(null);
        await this.elevenlabsService.startRecording((data) => {
          this.visualizerData.set(new Uint8Array(data));
        });
        this.isRecording.set(true);
      } catch (err: any) {
        console.error(err);
        this.errorMessage.set('Could not access microphone. Please check system permissions.');
      }
    }
  }

  /**
   * Processes a typed query from the input field
   */
  submitTypedMessage() {
    if (this.isBusy()) return; // block spam while AI is responding
    const text = this.typedMessage().trim();
    if (text) {
      this.processUserQuery(text);
      this.typedMessage.set('');
    }
  }

  /**
   * Processes a prompt click
   */
  useQuickPrompt(query: string) {
    if (this.isBusy()) return; // block spam while AI is responding
    this.processUserQuery(query);
  }

  /**
   * Core workflow: appends user message, calls Gemini AI, and initiates timers/recipes.
   */
  async processUserQuery(text: string) {
    this.chatHistory.update((history) => [
      ...history,
      { sender: 'user', text, timestamp: new Date() },
    ]);
    this.scrollToBottom();
    this.isThinking.set(true);
    this.scrollToBottom();

    try {
      const chefResponse = await this.chefService.getResponse(text);

      this.chatHistory.update((history) => [
        ...history,
        {
          sender: 'chef',
          text: chefResponse.text,
          timestamp: new Date(),
          recipe: chefResponse.recipe,
        },
      ]);
      this.scrollToBottom();

      // Trigger timer if one was requested
      if (chefResponse.timerDuration && chefResponse.timerDuration > 0) {
        this.startKitchenTimer(
          chefResponse.timerDuration,
          chefResponse.timerLabel || 'Culinary Timer',
        );
      }

      // Populate interactive recipe if returned
      if (chefResponse.recipe) {
        this.currentRecipe.set(chefResponse.recipe);
      }
    } finally {
      this.isThinking.set(false);
    }
  }

  /**
   * Recipe modal — open/close only.
   */
  protected closeRecipe() {
    this.currentRecipe.set(null);
  }

  protected openRecipe(recipe: Recipe) {
    this.currentRecipe.set(recipe);
  }

  /**
   * Initializes and starts a ticking countdown timer
   */
  private startKitchenTimer(duration: number, label: string) {
    const timerId = Math.random().toString(36).substring(2, 9);

    const newTimer: KitchenTimer = {
      id: timerId,
      label,
      duration,
      max: duration,
    };

    newTimer.intervalId = setInterval(() => {
      this.timers.update((activeTimers) => {
        return activeTimers.map((t) => {
          if (t.id === timerId) {
            const nextDuration = t.duration - 1;
            if (nextDuration <= 0) {
              clearInterval(t.intervalId);
              this.playBeepAlarm();
              // Add chef warning that timer is up
              setTimeout(() => {
                this.chatHistory.update((history) => [
                  ...history,
                  {
                    sender: 'chef',
                    text: `**BEEP BEEP!** Your timer for "${t.label}" is up! Check your food immediately so it does not burn!`,
                    timestamp: new Date(),
                  },
                ]);
                this.scrollToBottom();
              }, 100);
              return { ...t, duration: 0 };
            }
            return { ...t, duration: nextDuration };
          }
          return t;
        });
      });
    }, 1000);

    this.timers.update((t) => [...t, newTimer]);
  }

  /**
   * Manually dismisses or stops a kitchen timer
   */
  protected deleteTimer(id: string) {
    this.timers.update((activeTimers) => {
      const timer = activeTimers.find((t) => t.id === id);
      if (timer && timer.intervalId) {
        clearInterval(timer.intervalId);
      }
      return activeTimers.filter((t) => t.id !== id);
    });
  }

  /**
   * Synthesizes a kitchen alarm beep using Web Audio API
   */
  private playBeepAlarm() {
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = context.createOscillator();
      const gain = context.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, context.currentTime); // A5 note

      // Beep pulse pattern
      gain.gain.setValueAtTime(0, context.currentTime);
      gain.gain.linearRampToValueAtTime(0.5, context.currentTime + 0.1);
      gain.gain.setValueAtTime(0.5, context.currentTime + 0.4);
      gain.gain.linearRampToValueAtTime(0, context.currentTime + 0.5);

      gain.gain.setValueAtTime(0, context.currentTime + 0.6);
      gain.gain.linearRampToValueAtTime(0.5, context.currentTime + 0.7);
      gain.gain.setValueAtTime(0.5, context.currentTime + 1.0);
      gain.gain.linearRampToValueAtTime(0, context.currentTime + 1.1);

      osc.connect(gain);
      gain.connect(context.destination);
      osc.start();
      osc.stop(context.currentTime + 1.5);
    } catch (e) {
      console.warn('Failed to play alarm beep:', e);
    }
  }

  /**
   * Formats duration into a MM:SS string
   */
  protected formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  /**
   * Automatically scrolls chat display container to the bottom
   */
  private scrollToBottom() {
    setTimeout(() => {
      const container = document.getElementById('chat-history-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 50);
  }

  /**
   * Clear chat messages
   */
  protected clearChat() {
    this.chefService.clearHistory();
    this.chatHistory.set([
      {
        sender: 'chef',
        text: '<p>Chat cleared! Ready for a fresh start. What are we cooking today? 🍽️</p>',
        timestamp: new Date(),
      },
    ]);
    this.currentRecipe.set(null); // dismiss any open recipe modal
    this.timers().forEach((t) => {
      if (t.intervalId) clearInterval(t.intervalId);
    });
    this.timers.set([]);
  }
}
