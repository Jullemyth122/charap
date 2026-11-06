/**
 * @file transcribe.ts
 * @description Speech-to-Text (STT) Transcription Proxy Endpoint (ElevenLabs Scribe API)
 *
 * Endpoint: POST /api/transcribe
 *
 * Receives multipart/form-data audio recorded from the user's browser microphone
 * and proxies it directly to ElevenLabs Speech-to-Text (Scribe) API to convert speech into text.
 *
 * Request Format:
 * - Content-Type: `multipart/form-data; boundary=...`
 * - Body: Raw audio file buffer (e.g. webm/mp4/wav)
 *
 * Response Format:
 * - JSON: `{ text: "user spoken prompt" }`
 *
 * Flow Comparison:
 * - `transcribe.ts` → Audio → Text   (converts microphone speech into user queries)
 * - `tts.ts`        → Text  → Audio  (reads recipe instructions aloud to the user)
 */

import type { VercelResponse } from '@vercel/node';
import { withAuth, AuthenticatedRequest } from './_lib/middleware';

/**
 * Handles incoming POST requests containing multipart audio data and returns transcribed text.
 *
 * @param {AuthenticatedRequest} req - HTTP request with audio payload in multipart/form-data
 * @param {VercelResponse} res - HTTP response returning `{ text: string }`
 */
async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  // 1. Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  // 2. Verify server environment configuration
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ELEVENLABS_API_KEY is missing on server configuration.' });
  }

  // 3. Ensure incoming request is multipart/form-data (contains boundary)
  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('multipart/form-data')) {
    return res.status(400).json({ error: 'Expected multipart/form-data body with audio file.' });
  }

  try {
    // 4. Forward the raw multipart audio stream directly to ElevenLabs Scribe STT endpoint
    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'content-type': contentType, // preserves boundary for multipart stream parsing
      },
      body: req as any,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('ElevenLabs Transcribe Error:', errText);
      return res.status(response.status).json({ error: 'ElevenLabs transcription error', details: errText });
    }

    // 5. Extract transcribed text string from ElevenLabs response
    const data = await response.json();
    return res.status(200).json({ text: data.text || '' });
  } catch (err) {
    console.error('Error invoking ElevenLabs Speech-to-Text:', err);
    return res.status(500).json({ error: 'Failed to communicate with ElevenLabs Speech-to-Text API.' });
  }
}

// Export wrapped with authentication & rate-limiting middleware
export default withAuth(handler, { allowGuest: true });

