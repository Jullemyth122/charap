import { Injectable, inject } from '@angular/core';
import { AuthService } from './services/auth.service';

export interface ElementComposition {
  element: string;
  symbol?: string;
  amount?: string;
  note?: string;
}

export interface NutrientDetails {
  // Common macros for optional autocomplete (optional)
  calories?: string;
  protein?: string;
  carbs?: string;
  fat?: string;

  // Non-string nested structures
  elements?: ElementComposition[];
  phytochemicals?: string[];

  // Accepts any key-value pairs passed down dynamically by backend
  [key: string]: any;
}
export interface Ingredient {
  name: string;
  amount: string;
  notes?: string;
  substitutions?: string[];
  nutrients?: NutrientDetails;
}

export interface Recipe {
  title: string;
  description: string;
  ingredients: Ingredient[];
  steps: string[];
  totalNutrients?: NutrientDetails;
}

export interface ChefResponse {
  text: string;
  timerDuration?: number; // in seconds
  timerLabel?: string;
  recipe?: Recipe;
}

@Injectable({
  providedIn: 'root',
})
export class ChefService {
  private authService = inject(AuthService);

  // Conversation history for multi-turn context
  private conversationHistory: Array<{ role: string; parts: Array<{ text: string }> }> = [];

  /**
   * Sends a user query to the Vercel serverless /api/chat endpoint.
   * All AI logic, system prompts, and API keys live server-side.
   */
  async getResponse(query: string): Promise<ChefResponse> {
    const cleanQuery = query.toLowerCase().trim();

    // Fast-path: parse timer requests locally (no AI round-trip needed)
    const timerResponse = this.parseTimerRequest(cleanQuery);
    if (timerResponse) {
      return timerResponse;
    }

    // Add user message to history before the request
    this.conversationHistory.push({
      role: 'user',
      parts: [{ text: query }],
    });

    try {
      const authHeaders = this.authService.getAuthHeaders();
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          prompt: query,
          history: this.conversationHistory,
        }),
      });

      const contentType = res.headers.get('content-type') || '';

      // Handle rate limiting
      if (res.status === 429 && contentType.includes('application/json')) {
        const limitErr = await res.json();
        this.conversationHistory.pop();
        return {
          text: `⏱️ **Rate Limit Reached**: ${limitErr.error || 'You have exceeded the query limit.'} Please sign in or try again later!`,
        };
      }

      if (!res.ok) {
        const errText = await res.text();
        console.error('API chat error:', errText);
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      const rawText: string = data.response ?? '';

      // Add assistant response to history for multi-turn context
      this.conversationHistory.push({
        role: 'model',
        parts: [{ text: rawText }],
      });

      // Keep history manageable (last 10 turns = 20 entries)
      if (this.conversationHistory.length > 20) {
        this.conversationHistory = this.conversationHistory.slice(-20);
      }

      return this.parseChefResponse(rawText);
    } catch (err: any) {
      console.error('Error calling /api/chat:', err);
      // Remove the failed user message from history
      this.conversationHistory.pop();
      return {
        text: `⚠️ I couldn't connect to the kitchen right now. Please check your connection and try again! *(${err.message})*`,
      };
    }
  }

  /**
   * Parses the raw JSON string from the server into a typed ChefResponse.
   * Tries multiple extraction strategies before falling back gracefully.
   */
  private parseChefResponse(raw: string): ChefResponse {
    const parsed = this.tryParseJson(raw);

    if (parsed) {
      const result: ChefResponse = {
        text: this.markdownToBubbleHtml(parsed.text ?? 'Here you go! 🍽️'),
      };

      if (parsed.recipe?.title) {
        const rawSteps = Array.isArray(parsed.recipe.steps) ? parsed.recipe.steps : [];
        const cleanedSteps = rawSteps.map((step: string) =>
          typeof step === 'string'
            ? step
                .replace(/\*\*(.*?)\*\*/g, '$1')
                .replace(/\*(.*?)\*/g, '$1')
                .trim()
            : String(step),
        );

        result.recipe = {
          title: parsed.recipe.title,
          description: parsed.recipe.description ?? '',
          ingredients: Array.isArray(parsed.recipe.ingredients) ? parsed.recipe.ingredients : [],
          steps: cleanedSteps,
          totalNutrients: parsed.recipe.totalNutrients,
        };
      }

      if (parsed.timerDuration && typeof parsed.timerDuration === 'number') {
        result.timerDuration = parsed.timerDuration;
        result.timerLabel = parsed.timerLabel ?? 'Cooking Timer';
      }

      return result;
    }

    console.warn('Chef API response could not be parsed as JSON.');
    return {
      text: `<p>I got a bit tangled up there! Could you try asking again? 🍲</p>`,
    };
  }

  /**
   * Attempts multiple strategies to extract valid JSON from the raw response string.
   * Strategy 1: Direct parse.
   * Strategy 2: Strip markdown fences, then parse.
   * Strategy 3: Regex-extract the outermost { ... } block, then parse.
   */
  private tryParseJson(raw: string): any | null {
    const direct = raw.trim();
    const attempts: string[] = [direct];

    // Strip markdown fences
    const stripped = direct
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();
    if (stripped !== direct) attempts.push(stripped);

    // Extract outermost { ... } block
    const firstBrace = direct.indexOf('{');
    const lastBrace = direct.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      attempts.push(direct.slice(firstBrace, lastBrace + 1));
    }

    for (const attempt of attempts) {
      try {
        return JSON.parse(attempt);
      } catch {
        // try next
      }
    }
    return null;
  }

  /**
   * Converts **bold** and *italic* markdown to HTML for chat bubble display.
   */
  private markdownToBubbleHtml(text: string): string {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');
  }

  /**
   * Parses common timer phrases locally (e.g. "set a timer for 5 minutes")
   * so we don't make an unnecessary AI round-trip for simple timer requests.
   * Returns null if the query is not a timer request.
   */
  private parseTimerRequest(query: string): ChefResponse | null {
    if (!query.includes('timer') && !query.includes('time') && !query.includes('set')) {
      return null;
    }

    const numberRegex = /(\d+)\s*(minute|second|min|sec|hour)/gi;
    const match = numberRegex.exec(query);

    if (match) {
      const value = parseInt(match[1], 10);
      const unit = match[2].toLowerCase();

      let durationInSeconds = 0;
      let label = 'Cooking Timer';

      if (unit.startsWith('min')) {
        durationInSeconds = value * 60;
        label = `${value} Min Timer`;
      } else if (unit.startsWith('sec')) {
        durationInSeconds = value;
        label = `${value} Sec Timer`;
      } else if (unit.startsWith('hour')) {
        durationInSeconds = value * 3600;
        label = `${value} Hour Timer`;
      }

      if (durationInSeconds > 0) {
        return {
          text: `<p>Got it! I've started a <strong>${label}</strong> for you. ⏱️ I'll beep when it's done!</p>`,
          timerDuration: durationInSeconds,
          timerLabel: label,
        };
      }
    }

    if (query.includes('set a timer') || query.includes('start a timer')) {
      return {
        text: `<p>Sure! How long should I set the timer for? Try something like <strong>"5 minutes"</strong> or <strong>"30 seconds"</strong>. ⏱️</p>`,
      };
    }

    return null;
  }

  /** Clears conversation context (called on chat reset) */
  clearHistory() {
    this.conversationHistory = [];
  }
}
