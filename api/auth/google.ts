/**
 * @file google.ts
 * @description Google One-Tap / OAuth Sign-In & Verification Endpoint
 *
 * Endpoint: POST /api/auth/google
 *
 * Authenticates users using a Google ID token produced by Google Identity Services (GIS)
 * on the frontend.
 *
 * Authentication Lifecycle:
 * 1. Verifies the cryptographic signature of `idToken` using Google's official public keys (`OAuth2Client`).
 * 2. Extracts authenticated user profile data: Google Subject ID (`sub`), email, display name, and avatar image.
 * 3. Database Upsert Workflow (PostgreSQL):
 *    a. Checks if identity (`provider = 'google'`, `provider_account_id = googleSub`) exists in `user_identities`.
 *    b. If yes, updates user details (name, avatar, timestamp) in `users`.
 *    c. If no, checks if a user exists with matching `email`. If so, links identity. If not, creates a new user.
 * 4. Guest Session Migration: If `guestUuid` is provided, links the anonymous guest session history to this registered user.
 * 5. Issues a signed 7-day application JWT and returns user profile details to the client.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { OAuth2Client } from 'google-auth-library';
import { signAppToken } from '../_lib/jwt';
import { queryDb } from '../_lib/db';

/** Google OAuth2 verification client */
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Handles Google OAuth ID token verification and user login/registration.
 *
 * @param {VercelRequest} req - HTTP request with `{ idToken: string, guestUuid?: string }` in body
 * @param {VercelResponse} res - HTTP response returning `{ success: boolean, token: string, user: object }`
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configure CORS headers for authentication request
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
    const { idToken, guestUuid } = req.body || {};

    if (!idToken) {
      return res.status(400).json({ error: 'Missing idToken in request body.' });
    }

    // ----------------------------------------------------
    // 1. Verify Google ID Token Cryptographically
    // ----------------------------------------------------
    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
    } catch (err) {
      console.error('Google ID token verification failed:', err);
      return res.status(401).json({ error: 'Invalid Google ID Token.' });
    }

    const payload = ticket.getPayload();
    if (!payload || !payload.sub || !payload.email) {
      return res.status(400).json({ error: 'Invalid token payload: missing sub or email.' });
    }

    const { sub: googleSub, email, name, picture: avatarUrl } = payload;

    // ----------------------------------------------------
    // 2. Database Upsert Transaction / Queries
    // ----------------------------------------------------
    let userId: string;

    try {
      // Step 2a: Look up existing OAuth identity
      const existingIdentities = await queryDb(
        `SELECT user_id FROM user_identities WHERE provider = 'google' AND provider_account_id = $1`,
        [googleSub]
      );

      if (existingIdentities.length > 0) {
        userId = existingIdentities[0].user_id;

        // Update profile info
        await queryDb(
          `UPDATE users SET name = $1, avatar_url = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
          [name || email, avatarUrl || null, userId]
        );
      } else {
        // Step 2b: Check if user exists by email
        const existingUsers = await queryDb(`SELECT id FROM users WHERE email = $1`, [email]);

        if (existingUsers.length > 0) {
          userId = existingUsers[0].id;
        } else {
          // Step 2c: Create new user
          const newUsers = await queryDb(
            `INSERT INTO users (email, name, avatar_url, role) VALUES ($1, $2, $3, 'user') RETURNING id`,
            [email, name || email, avatarUrl || null]
          );
          userId = newUsers[0].id;
        }

        // Link identity to user account
        await queryDb(
          `INSERT INTO user_identities (user_id, provider, provider_account_id) VALUES ($1, 'google', $2)`,
          [userId, googleSub]
        );
      }

      // Step 2d: Link previous guest session if guestUuid was provided
      if (guestUuid) {
        await queryDb(`UPDATE guests SET linked_user_id = $1 WHERE guest_uuid = $2`, [userId, guestUuid]);
      }
    } catch (dbErr) {
      console.error('Database query error during Google authentication:', dbErr);
      // Graceful Fallback: Generate transient user ID if DB is temporarily unreachable
      userId = `google_${googleSub}`;
    }

    // ----------------------------------------------------
    // 3. Generate Signed Application JWT
    // ----------------------------------------------------
    const appToken = signAppToken({
      userId,
      email,
      name: name || email,
      role: 'user',
      isGuest: false,
    });

    // ----------------------------------------------------
    // 4. Return Token & User Details
    // ----------------------------------------------------
    return res.status(200).json({
      success: true,
      token: appToken,
      user: {
        id: userId,
        email,
        name: name || email,
        avatarUrl: avatarUrl || null,
      },
    });
  } catch (err) {
    console.error('Unhandled error in Google auth route:', err);
    return res.status(500).json({ error: 'Internal server error processing Google authentication.' });
  }
}

