/**
 * @file link.ts
 * @description Guest Account Migration & Linking Endpoint
 *
 * Endpoint: POST /api/auth/link
 *
 * Links an anonymous guest session (identified by `guestUuid`) to an authenticated,
 * registered user's account in PostgreSQL.
 *
 * Use Case:
 * When a user uses the application as a guest (generating chat history, favorite recipes, etc.)
 * and subsequently logs in or registers via OAuth, this endpoint attaches their prior guest
 * interactions to their permanent user ID.
 *
 * Security:
 * - Protected by `withAuth(handler, { allowGuest: false })` (only authenticated registered users are allowed).
 */

import type { VercelResponse } from '@vercel/node';
import { withAuth, AuthenticatedRequest } from '../_lib/middleware';
import { queryDb } from '../_lib/db';

/**
 * Handles linking a guest UUID session to the currently logged-in user.
 *
 * @param {AuthenticatedRequest} req - HTTP request with `{ guestUuid: string }` and authenticated user token
 * @param {VercelResponse} res - HTTP response returning success status
 */
async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  // 1. Verify that the caller is a registered (non-guest) user
  const user = req.user;
  if (!user || user.isGuest) {
    return res.status(401).json({ error: 'Only authenticated registered users can link guest sessions.' });
  }

  // 2. Validate input guestUuid
  const { guestUuid } = req.body || {};
  if (!guestUuid) {
    return res.status(400).json({ error: 'Missing guestUuid in request body.' });
  }

  try {
    // 3. Update the guest record with the permanent user ID
    await queryDb(`UPDATE guests SET linked_user_id = $1 WHERE guest_uuid = $2`, [user.userId, guestUuid]);

    return res.status(200).json({
      success: true,
      message: `Guest session ${guestUuid} successfully linked to user ${user.userId}`,
    });
  } catch (err) {
    console.error('Error linking guest account:', err);
    return res.status(500).json({ error: 'Failed to link guest account in database.' });
  }
}

// Protected route: Anonymous guests are NOT allowed to invoke this endpoint
export default withAuth(handler, { allowGuest: false });

