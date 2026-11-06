/**
 * @file guest.ts
 * @description Anonymous Guest Session & Token Provisioning Endpoint
 *
 * Endpoint: POST /api/auth/guest
 *
 * Provides friction-free onboarding by generating anonymous guest credentials.
 * Users can interact with Charap (chat, recipe generation, timer) immediately without logging in first.
 *
 * Lifecycle:
 * 1. Accepts an existing `guestUuid` (if refreshing/restoring session) or generates a new cryptographic UUID.
 * 2. Logs or updates the guest record in the `guests` table (recording IP address, request count, and last active timestamp).
 * 3. Issues a long-lived (30-day) application JWT with `role: 'guest'` and `isGuest: true`.
 * 4. When the guest later chooses to sign in with Google or OAuth, their guest UUID is migrated to their permanent user account.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'crypto';
import { signAppToken } from '../_lib/jwt';
import { queryDb } from '../_lib/db';

/**
 * Handles anonymous guest session creation and token issuance.
 *
 * @param {VercelRequest} req - HTTP request optionally containing `{ guestUuid?: string }`
 * @param {VercelResponse} res - HTTP response returning `{ success: boolean, guestUuid: string, token: string, expiresIn: string }`
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configure CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    // ----------------------------------------------------
    // 1. Identify or Generate Guest UUID
    // ----------------------------------------------------
    const { guestUuid: clientGuestUuid } = req.body || {};
    const guestUuid = clientGuestUuid || randomUUID();
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';

    // ----------------------------------------------------
    // 2. Upsert Guest Record in Database
    // ----------------------------------------------------
    try {
      await queryDb(
        `INSERT INTO guests (guest_uuid, ip_address, request_count, last_active)
         VALUES ($1, $2, 1, CURRENT_TIMESTAMP)
         ON CONFLICT (guest_uuid)
         DO UPDATE SET last_active = CURRENT_TIMESTAMP, request_count = guests.request_count + 1`,
        [guestUuid, ipAddress]
      );
    } catch (dbErr) {
      console.warn('Database logging warning for guest (proceeding):', dbErr);
    }

    // ----------------------------------------------------
    // 3. Issue Long-Lived 30-Day Guest JWT
    // ----------------------------------------------------
    const token = signAppToken(
      {
        userId: guestUuid,
        role: 'guest',
        isGuest: true,
        guestUuid,
      },
      '30d' // Guest token is valid for 30 days
    );

    // ----------------------------------------------------
    // 4. Return Session Data to Client
    // ----------------------------------------------------
    return res.status(200).json({
      success: true,
      guestUuid,
      token,
      expiresIn: '30d',
    });
  } catch (err) {
    console.error('Error handling guest authentication:', err);
    return res.status(500).json({ error: 'Internal server error processing guest token.' });
  }
}

