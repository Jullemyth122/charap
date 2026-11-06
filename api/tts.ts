/**
 * @file tts.ts
 * @description Text-to-Speech (TTS) Proxy Endpoint (ElevenLabs API)
 *
 * Endpoint: POST /api/tts
 *
 * Converts text (such as AI recipe steps, cooking instructions, or greeting messages)
 * into natural-sounding spoken audio using ElevenLabs Text-to-Speech API.
 *
 * Request Body:
 * - `text` (string, required): The text to be converted to speech.
 * - `voiceId` (string, optional): Specific ElevenLabs voice ID to use (defaults to '21m00Tcm4TlvDq8ikWAM' - Rachel).
 *
 * Response:
 * - Binary MP3 audio stream (`Content-Type: audio/mpeg`)
 *
 * Flow Comparison:
 * - `tts.ts`        → Text  → Audio  (reads recipe instructions aloud to the user)
 * - `transcribe.ts` → Audio → Text   (converts microphone speech into user queries)
 */

import type { VercelResponse } from '@vercel/node';
import { withAuth, AuthenticatedRequest } from './_lib/middleware';

/**
 * Handles incoming POST requests to synthesize speech audio from text.
 *
 * @param {AuthenticatedRequest} req - HTTP request with `{ text: string, voiceId?: string }` in body
 * @param {VercelResponse} res - HTTP response sending back binary audio/mpeg data
 */
async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  // 1. Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { text, voiceId } = req.body || {};

  // 2. Validate input text
  if (!text) {
    return res.status(400).json({ error: 'Missing text in request body.' });
  }

  // 3. Verify server environment configuration
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return res
      .status(500)
      .json({ error: 'ELEVENLABS_API_KEY is missing on server configuration.' });
  }

  // 4. Default to 'Rachel' (21m00Tcm4TlvDq8ikWAM) if no specific voiceId is provided
  const selectedVoiceId = voiceId || '21m00Tcm4TlvDq8ikWAM';

  try {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`;

    // 5. Send synthesis request to ElevenLabs API
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('ElevenLabs API Error:', errText);
      return res.status(response.status).json({ error: 'ElevenLabs API error', details: errText });
    }

    // 6. Receive raw audio array buffer and stream it back as audio/mpeg
    const audioBuffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    return res.status(200).send(Buffer.from(audioBuffer));
  } catch (err) {
    console.error('Error invoking ElevenLabs API:', err);
    return res.status(500).json({ error: 'Failed to communicate with ElevenLabs API.' });
  }
}

// Export wrapped with authentication & rate-limiting middleware
export default withAuth(handler, { allowGuest: true });

