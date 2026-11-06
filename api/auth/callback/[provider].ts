/**
 * @file [provider].ts
 * @description Dynamic OAuth 2.0 Authorization Code Callback Handler
 *
 * Endpoint: GET /api/auth/callback/:provider (e.g. /api/auth/callback/github, /api/auth/callback/facebook)
 *
 * Handles the OAuth 2.0 Authorization Code Grant exchange when a user completes third-party
 * authentication on GitHub or Facebook.
 *
 * OAuth Flow Steps:
 * 1. Provider Redirect: Provider redirects user back to this URL with an authorization `code` in the query params.
 * 2. Token Exchange: Server exchanges the authorization `code` with the provider's token endpoint for an `access_token`.
 * 3. User Profile Fetch: Server calls the provider's User API with the `access_token` to retrieve identity info.
 * 4. Database Upsert:
 *    - Looks up existing account in `user_identities` table.
 *    - If found, reuses existing user ID.
 *    - If not, finds or creates corresponding record in `users` table and registers the identity link.
 * 5. JWT Generation: Signs a new 7-day application JWT.
 * 6. Frontend Redirect: Redirects the browser back to the Angular app (`/auth/callback?token=...`) so the client can save the token.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getProviderConfig } from '../../_lib/oauth-providers';
import { signAppToken } from '../../_lib/jwt';
import { queryDb } from '../../_lib/db';

/**
 * Handles dynamic OAuth 2.0 authorization callbacks.
 *
 * @param {VercelRequest} req - HTTP request with `:provider` in path params and `code` in query string
 * @param {VercelResponse} res - HTTP response issuing a 302 redirect back to frontend
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const provider = (req.query.provider as string) || '';
  const { code, state } = req.query;

  // 1. Resolve configuration for requested OAuth provider
  const config = getProviderConfig(provider);
  if (!config) {
    return res.status(400).json({ error: `Unsupported or unconfigured OAuth provider: ${provider}` });
  }

  // 2. Validate authorization code
  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code from OAuth provider redirect.' });
  }

  try {
    // ----------------------------------------------------
    // Step 1: Exchange Authorization Code for Access Token
    // ----------------------------------------------------
    const tokenParams = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code: code as string,
    });

    const tokenRes = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams.toString(),
    });

    const tokenData: any = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return res.status(400).json({ error: 'Failed to retrieve access_token from provider.', details: tokenData });
    }

    // ----------------------------------------------------
    // Step 2: Fetch User Profile from Provider API
    // ----------------------------------------------------
    const userRes = await fetch(config.userApiUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'Charap-App',
      },
    });

    const profile: any = await userRes.json();
    const providerAccountId = profile.id ? String(profile.id) : profile.sub;
    const email = profile.email || `${providerAccountId}@${provider}.oauth.local`;
    const name = profile.name || profile.login || email;
    const avatarUrl = profile.avatar_url || profile.picture?.data?.url || null;

    // ----------------------------------------------------
    // Step 3: Database Upsert (Users & User Identities)
    // ----------------------------------------------------
    let userId: string;
    try {
      const existingIdentities = await queryDb(
        `SELECT user_id FROM user_identities WHERE provider = $1 AND provider_account_id = $2`,
        [provider, providerAccountId]
      );

      if (existingIdentities.length > 0) {
        userId = existingIdentities[0].user_id;
      } else {
        const existingUsers = await queryDb(`SELECT id FROM users WHERE email = $1`, [email]);
        if (existingUsers.length > 0) {
          userId = existingUsers[0].id;
        } else {
          const newUsers = await queryDb(
            `INSERT INTO users (email, name, avatar_url, role) VALUES ($1, $2, $3, 'user') RETURNING id`,
            [email, name, avatarUrl]
          );
          userId = newUsers[0].id;
        }

        await queryDb(
          `INSERT INTO user_identities (user_id, provider, provider_account_id) VALUES ($1, $2, $3)`,
          [userId, provider, providerAccountId]
        );
      }
    } catch (dbErr) {
      console.error('Database query error in OAuth callback:', dbErr);
      userId = `${provider}_${providerAccountId}`;
    }

    // ----------------------------------------------------
    // Step 4: Issue Signed Application JWT
    // ----------------------------------------------------
    const appToken = signAppToken({
      userId,
      email,
      name,
      role: 'user',
      isGuest: false,
    });

    // ----------------------------------------------------
    // Step 5: Redirect User Back to Frontend Application
    // ----------------------------------------------------
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    return res.redirect(`${frontendUrl}/auth/callback?token=${encodeURIComponent(appToken)}`);
  } catch (err) {
    console.error(`Error processing ${provider} OAuth callback:`, err);
    return res.status(500).json({ error: `Failed to complete ${provider} authentication.` });
  }
}

