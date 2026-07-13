import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';

export interface Recipe {
  title: string;
  description: string;
  ingredients: string[];
  steps: string[];
}

export interface ChefResponse {
  text: string;
  timerDuration?: number; // in seconds
  timerLabel?: string;
  recipe?: Recipe;
}

const SYSTEM_PROMPT = `You are Charap, a brilliant and friendly AI kitchen assistant. You know every cuisine in the world — Filipino, Italian, Japanese, Mexican, French, and more. You give real, accurate, detailed recipes.

When a user asks for a recipe or how to cook something, you MUST respond with a JSON object in this EXACT format (no markdown fences, raw JSON only):
{
  "text": "A warm, enthusiastic chat message describing the dish. Use **bold** for key terms.",
  "recipe": {
    "title": "Exact dish name",
    "description": "One sentence description of the dish.",
    "ingredients": ["ingredient 1 with quantity", "ingredient 2 with quantity", "..."],
    "steps": ["Step 1: ...", "Step 2: ...", "Step 3: ...", "..."]
  }
}

When a user asks to set a timer (e.g. "set a timer for 5 minutes"), respond with:
{
  "text": "A confirming message about the timer.",
  "timerDuration": <number of seconds>,
  "timerLabel": "Short label like '5 Min Timer'"
}

For general cooking questions, tips, or conversation that does NOT need a recipe or timer, respond with:
{
  "text": "Your detailed, helpful answer. Use **bold** for key terms."
}

IMPORTANT RULES:
- Always output valid raw JSON — never wrap in markdown code fences or backticks
- Ingredients must be specific with real quantities (e.g. "500g pork belly, sliced" not "some pork")
- Steps must be detailed, numbered instructions (at least 4 steps, ideally 5-7)
- recipe.title must be the real dish name (e.g. "Paksiw na Isda", not "Dynamic Paksiw na Isda")
- Do NOT say "Chef Julle Myth" anywhere — you are Charap
- Be warm, energetic and knowledgeable. Use food emojis sparingly.`;

@Injectable({
  providedIn: 'root',
})
export class ChefService {
  private readonly apiKey = environment.geminiApiKey;
  private readonly apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.apiKey}`;

  // Conversation history for multi-turn context
  private conversationHistory: Array<{ role: string; parts: Array<{ text: string }> }> = [];

  /**
   * Sends a user query to Gemini 2.5 Flash and returns a structured ChefResponse.
   * Timer commands are parsed locally first for instant feedback.
   */
  async getResponse(query: string): Promise<ChefResponse> {
    const cleanQuery = query.toLowerCase().trim();

    // Fast-path: parse timer requests locally (no AI needed)
    const timerResponse = this.parseTimerRequest(cleanQuery);
    if (timerResponse) {
      return timerResponse;
    }

    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      parts: [{ text: query }],
    });

    try {
      const requestBody = {
        system_instruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        contents: this.conversationHistory,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
          responseMimeType: 'text/plain',
        },
      };

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('Gemini API error:', errText);
        throw new Error(`Gemini API returned ${response.status}`);
      }

      const data = await response.json();
      const rawText: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

      // Add assistant response to history for context
      this.conversationHistory.push({
        role: 'model',
        parts: [{ text: rawText }],
      });

      // Keep history manageable (last 10 turns = 20 entries)
      if (this.conversationHistory.length > 20) {
        this.conversationHistory = this.conversationHistory.slice(-20);
      }

      return this.parseGeminiResponse(rawText, query);
    } catch (err: any) {
      console.error('Error calling Gemini:', err);
      // Remove the failed user message from history
      this.conversationHistory.pop();
      return {
        text: `⚠️ I couldn't connect to the kitchen right now. Please check your connection and try again! *(${err.message})*`,
      };
    }
  }

  /**
   * Parses the raw Gemini text output into a structured ChefResponse.
   * Strips any accidental markdown fences and handles malformed JSON gracefully.
   */
  private parseGeminiResponse(raw: string, originalQuery: string): ChefResponse {
    // Strip markdown code fences if Gemini wraps in them anyway
    let cleaned = raw.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');

    try {
      const parsed = JSON.parse(cleaned);
      const result: ChefResponse = {
        text: this.markdownToBubbleHtml(parsed.text ?? 'Here you go! 🍽️'),
      };

      if (parsed.recipe && parsed.recipe.title) {
        result.recipe = {
          title: parsed.recipe.title,
          description: parsed.recipe.description ?? '',
          ingredients: Array.isArray(parsed.recipe.ingredients) ? parsed.recipe.ingredients : [],
          steps: Array.isArray(parsed.recipe.steps) ? parsed.recipe.steps : [],
        };
      }

      if (parsed.timerDuration && typeof parsed.timerDuration === 'number') {
        result.timerDuration = parsed.timerDuration;
        result.timerLabel = parsed.timerLabel ?? 'Cooking Timer';
      }

      return result;
    } catch {
      // If JSON parse fails, return the raw text as plain chat message
      console.warn('Gemini response was not valid JSON, using as plain text.');
      return {
        text: this.markdownToBubbleHtml(
          cleaned || `I heard you! Ask me about any recipe or dish — I know them all. 🍲`,
        ),
      };
    }
  }

  /**
   * Converts simple **bold** and *italic* markdown to HTML for bubble display.
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
   * Parses timer requests locally (e.g. "set a timer for 5 minutes").
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
