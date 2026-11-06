/**
 * @file chat.ts
 * @description AI Kitchen Assistant & Recipe Generator (Google Gemini API Endpoint)
 *
 * Endpoint: POST /api/chat
 *
 * This serverless endpoint handles interactive conversations with "Charap", an AI kitchen assistant.
 * It connects to Google's Gemini 2.5 Flash model and instructs it to output strictly structured JSON
 * containing:
 * - Conversational text responses (with markdown bolding for key terms)
 * - Complete recipe schemas (ingredients with metric/imperial units, preparation notes, substitutions)
 * - Full nutritional breakdowns (calories, macros, vitamins, minerals, water content)
 * - Scientific chemical elemental breakdowns (e.g., Oxygen, Carbon, Hydrogen, Potassium)
 * - Phytochemical compounds (antioxidants, polyphenols, etc.)
 * - Step-by-step plain text cooking directions
 * - Kitchen timer triggers (e.g. "set a timer for 5 minutes" -> duration & label)
 *
 * Security & Middleware:
 * - Wrapped with `withAuth({ allowGuest: true })` to allow both registered and guest users.
 * - Rate limited by IP / user ID to protect Gemini API quota.
 */

import type { VercelResponse } from '@vercel/node';
import { withAuth, AuthenticatedRequest } from './_lib/middleware';

/**
 * System instruction prompt provided to the Gemini model.
 * Directs the AI to act as Charap and enforces a strict raw JSON output schema.
 */
const SYSTEM_PROMPT = `You are Charap, a brilliant AI kitchen assistant. You provide real, accurate recipes with full nutritional calculations and chemical element breakdowns.

When asked for a recipe or how to cook something, respond with a JSON object in this format (raw JSON only, no markdown fences):
{
  "text": "A warm chat message describing the dish with **bold** key terms.",
  "recipe": {
    "title": "Exact dish name",
    "description": "Short description of the dish.",
    "ingredients": [
      {
        "name": "Ingredient name",
        "amount": "Quantity with unit (e.g., 500g, 2 tbsp)",
        "notes": "Preparation notes",
        "substitutions": ["Alternative 1", "Alternative 2"],
        "nutrients": {
          "calories": "100 kcal", "protein": "5g", "carbs": "10g", "fat": "2g", "fiber": "1g", "sugar": "1g", "water": "80g", "sodium": "50mg", "potassium": "200mg", "calcium": "20mg", "iron": "1mg", "zinc": "0.5mg", "magnesium": "15mg", "phosphorus": "30mg", "vitaminA": "100IU", "vitaminC": "10mg", "vitaminD": "0IU", "vitaminE": "0.5mg", "vitaminK": "5mcg", "vitaminB1": "0.1mg", "vitaminB2": "0.05mg", "vitaminB3": "1mg", "vitaminB6": "0.2mg", "vitaminB9": "20mcg", "vitaminB12": "0mcg",
          "elements": [{ "element": "Oxygen", "symbol": "O", "amount": "~70%", "note": "H2O & organic matrix" }],
          "phytochemicals": ["Bioactive compound"]
        }
      }
    ],
    "steps": ["Step 1: ...", "Step 2: ..."],
    "totalNutrients": {
      "calories": "500 kcal", "protein": "30g", "carbs": "40g", "fat": "20g", "fiber": "5g", "sugar": "4g", "water": "300g", "sodium": "600mg", "potassium": "800mg", "calcium": "100mg", "iron": "3mg", "zinc": "2mg", "magnesium": "60mg", "phosphorus": "200mg", "vitaminA": "500IU", "vitaminC": "25mg", "vitaminD": "10IU", "vitaminE": "2mg", "vitaminK": "15mcg", "vitaminB1": "0.4mg", "vitaminB2": "0.3mg", "vitaminB3": "5mg", "vitaminB6": "0.8mg", "vitaminB9": "80mcg", "vitaminB12": "1.2mcg",
      "elements": [{ "element": "Oxygen", "symbol": "O", "amount": "~70%", "note": "Mainly in water & carbs" }],
      "phytochemicals": ["Antioxidant matrix"]
    }
  }
}

When asked to set a timer (e.g. "set a timer for 5 minutes"):
{
  "text": "Confirming message.",
  "timerDuration": 300,
  "timerLabel": "5 Min Timer"
}

For general cooking advice or chat (no recipe needed):
{
  "text": "Your helpful answer. Use **bold** for key terms."
}

RULES:
- Always return valid raw JSON.
- Every ingredient mentioned in the steps must be listed with accurate quantities and nutritional/elemental values.
- Steps must be plain text without markdown formatting.
- Be warm and encouraging.`;

/**
 * Handles incoming POST requests to generate culinary AI responses using Google Gemini 2.5 Flash.
 *
 * @param {AuthenticatedRequest} req - HTTP request containing `{ prompt: string, history?: any[] }`
 * @param {VercelResponse} res - HTTP response object
 */
async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  // 1. Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { prompt, history } = req.body || {};

  // 2. Validate that either a prompt or history was provided
  if (!prompt && (!history || history.length === 0)) {
    return res.status(400).json({ error: 'Missing prompt in request body.' });
  }

  // 3. Verify server environment configuration
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is missing on server configuration.' });
  }

  try {
    // 4. Construct Gemini API endpoint URL
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    // 5. Prepare conversation contents array (combining past history with latest prompt)
    let contents = Array.isArray(history) && history.length > 0 ? [...history] : [];
    if (contents.length === 0 || contents[contents.length - 1]?.parts?.[0]?.text !== prompt) {
      if (prompt) {
        contents.push({
          role: 'user',
          parts: [{ text: prompt }],
        });
      }
    }

    // 6. Build the request body with system instructions and JSON MIME type enforcement
    const requestBody = {
      system_instruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      },
    };

    // 7. Send request to Google Gemini API
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API Error:', errText);
      return res
        .status(response.status)
        .json({ error: 'Gemini API returned an error.', details: errText });
    }

    // 8. Extract the generated candidate text from the response payload
    const data: any = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // 9. Return clean JSON response to frontend client
    return res.status(200).json({
      success: true,
      response: candidateText,
      raw: data,
    });
  } catch (err) {
    console.error('Error invoking Gemini API:', err);
    return res.status(500).json({ error: 'Failed to communicate with Gemini API.' });
  }
}

// Export wrapped with authentication & rate-limiting middleware
export default withAuth(handler, { allowGuest: true });

