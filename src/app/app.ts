import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ElevenlabsService } from './elevenlabs.service';
import { ChefService, Recipe } from './chef.service';

interface ChatMessage {
  sender: 'user' | 'chef';
  text: string;
  timestamp: Date;
  recipe?: Recipe;
}

interface KitchenTimer {
  id: string;
  label: string;
  duration: number; // current seconds remaining
  max: number; // initial duration in seconds
  intervalId?: any;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  private elevenlabsService = inject(ElevenlabsService);
  private chefService = inject(ChefService);

  // App States
  protected readonly isDarkMode = signal(true);
  protected readonly isRecording = signal(false);
  protected readonly isTranscribing = signal(false);
  protected readonly isThinking = signal(false);
  protected readonly chatHistory = signal<ChatMessage[]>([]);
  protected readonly timers = signal<KitchenTimer[]>([]);
  protected readonly visualizerData = signal<Uint8Array | null>(null);
  protected readonly typedMessage = signal('');
  protected readonly errorMessage = signal<string | null>(null);
  
  // Collapse States
  protected readonly isQuickPicksCollapsed = signal(false);
  protected readonly isChatCollapsed = signal(false);

  // Recipe Step-by-Step States
  protected readonly currentRecipe = signal<Recipe | null>(null);
  protected readonly currentStepIndex = signal<number>(0);
  protected readonly checkedIngredients = signal<Record<string, boolean>>({});

  // Quick culinary queries (Filipino Food Focused!)
  protected readonly quickPrompts = [
    { label: 'Chicken Tinola', query: 'How do I cook Chicken Tinola?', icon: 'pot' },
    { label: 'Beef Kaldereta', query: 'How to make Beef Kaldereta?', icon: 'bowl' },
    { label: 'Pork Adobo', query: 'Give me the Pork Adobo recipe.', icon: 'meat' },
    { label: 'Sinigang na Baboy', query: 'How do I make Sinigang na Baboy?', icon: 'soup' },
    { label: '10s Timer', query: 'set a timer for 10 seconds', icon: 'timer' }
  ];

  ngOnInit() {
    // Welcome message from Charap
    this.chatHistory.set([
      {
        sender: 'chef',
        text: "Welcome to **Charap**! I'm your AI kitchen companion. Ask me for a recipe, set a cooking timer, or just tap the mic and speak. Let's cook something amazing!",
        timestamp: new Date()
      }
    ]);
  }

  protected toggleTheme() {
    this.isDarkMode.set(!this.isDarkMode());
  }

  protected toggleQuickPicks() {
    this.isQuickPicksCollapsed.set(!this.isQuickPicksCollapsed());
  }

  protected toggleChat() {
    this.isChatCollapsed.set(!this.isChatCollapsed());
  }

  ngOnDestroy() {
    this.timers().forEach(t => {
      if (t.intervalId) {
        clearInterval(t.intervalId);
      }
    });
  }

  /**
   * Toggles microphone recording
   */
  async toggleRecording() {
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
        this.errorMessage.set("Could not access microphone. Please check system permissions.");
      }
    }
  }

  /**
   * Processes a typed query from the input field
   */
  submitTypedMessage() {
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
    this.processUserQuery(query);
  }

  /**
   * Core workflow: appends user message, calls Gemini AI, and initiates timers/recipes.
   */
  private async processUserQuery(text: string) {
    this.chatHistory.update(history => [
      ...history,
      { sender: 'user', text, timestamp: new Date() }
    ]);
    this.scrollToBottom();
    this.isThinking.set(true);
    this.scrollToBottom();

    try {
      const chefResponse = await this.chefService.getResponse(text);

      this.chatHistory.update(history => [
        ...history,
        { sender: 'chef', text: chefResponse.text, timestamp: new Date(), recipe: chefResponse.recipe }
      ]);
      this.scrollToBottom();

      // Trigger timer if one was requested
      if (chefResponse.timerDuration && chefResponse.timerDuration > 0) {
        this.startKitchenTimer(chefResponse.timerDuration, chefResponse.timerLabel || 'Culinary Timer');
      }

      // Populate interactive recipe if returned
      if (chefResponse.recipe) {
        this.currentRecipe.set(chefResponse.recipe);
        this.currentStepIndex.set(0);
        this.checkedIngredients.set({});
      }
    } finally {
      this.isThinking.set(false);
    }
  }

  /**
   * Interactive Recipe Guides helpers
   */
  protected prevStep() {
    const idx = this.currentStepIndex();
    if (idx > 0) {
      this.currentStepIndex.set(idx - 1);
    }
  }

  protected nextStep() {
    const recipe = this.currentRecipe();
    const idx = this.currentStepIndex();
    if (recipe && idx < recipe.steps.length - 1) {
      this.currentStepIndex.set(idx + 1);
    }
  }

  protected toggleIngredient(ing: string) {
    this.checkedIngredients.update(checked => {
      return {
        ...checked,
        [ing]: !checked[ing]
      };
    });
  }

  protected closeRecipe() {
    this.currentRecipe.set(null);
  }

  protected openRecipe(recipe: Recipe) {
    this.currentRecipe.set(recipe);
    this.currentStepIndex.set(0);
    this.checkedIngredients.set({});
  }

  protected goToStep(index: number) {
    const recipe = this.currentRecipe();
    if (recipe && index >= 0 && index < recipe.steps.length) {
      this.currentStepIndex.set(index);
    }
  }

  protected getCheckedCount(ingredients: string[]): number {
    const checked = this.checkedIngredients();
    return ingredients.filter(ing => checked[ing]).length;
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
      max: duration
    };

    newTimer.intervalId = setInterval(() => {
      this.timers.update(activeTimers => {
        return activeTimers.map(t => {
          if (t.id === timerId) {
            const nextDuration = t.duration - 1;
            if (nextDuration <= 0) {
              clearInterval(t.intervalId);
              this.playBeepAlarm();
              // Add chef warning that timer is up
              setTimeout(() => {
                this.chatHistory.update(history => [
                  ...history,
                  { 
                    sender: 'chef', 
                    text: `**BEEP BEEP!** Your timer for "${t.label}" is up! Check your food immediately so it does not burn!`, 
                    timestamp: new Date() 
                  }
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

    this.timers.update(t => [...t, newTimer]);
  }

  /**
   * Manually dismisses or stops a kitchen timer
   */
  protected deleteTimer(id: string) {
    this.timers.update(activeTimers => {
      const timer = activeTimers.find(t => t.id === id);
      if (timer && timer.intervalId) {
        clearInterval(timer.intervalId);
      }
      return activeTimers.filter(t => t.id !== id);
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
      console.warn("Failed to play alarm beep:", e);
    }
  }

  /**
   * Computes clean path for visualizer SVG waveform heights
   */
  protected getWaveformPoints = computed(() => {
    const data = this.visualizerData();
    if (!data) return '';
    
    // Scale 128 items into canvas points
    const width = 300;
    const height = 60;
    const points: string[] = [];
    
    for (let i = 0; i < data.length; i += 2) {
      const x = (i / data.length) * width;
      // Audio level fits in [0, 255], baseline is 128 (center)
      const val = data[i] / 255;
      const y = height / 2 + (val - 0.5) * height * 1.5;
      points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    
    return points.join(' ');
  });

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
        text: "<p>Chat cleared! Ready for a fresh start. What are we cooking today? 🍽️</p>",
        timestamp: new Date()
      }
    ]);
    this.currentRecipe.set(null);
    this.timers().forEach(t => { if (t.intervalId) clearInterval(t.intervalId); });
    this.timers.set([]);
  }
}
