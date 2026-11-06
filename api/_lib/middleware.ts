/**
 * @file middleware.ts
 * @description Serverless Function Middleware Wrapper (CORS, Authentication & Rate Limiting)
 *
 * This higher-order function wraps Vercel serverless function handlers to enforce:
 * 1. CORS Headers: Enables cross-origin communication with appropriate allowed methods and headers.
 * 2. HTTP OPTIONS Preflight: Automatically answers browser CORS preflight requests with 200 OK.
 * 3. JWT Authentication: Extracts and verifies Bearer tokens from the `Authorization` header.
 * 4. Access Control: Allows or blocks anonymous guests based on endpoint security configuration.
 * 5. Rate Limiting: Attaches rate limit headers and rejects spam/DDoS requests with HTTP 429 Too Many Requests.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAppToken, UserJwtPayload } from './jwt';
import { checkRateLimit } from './rate-limiter';

/**
 * Extended VercelRequest interface that includes the decoded user payload if authenticated.
 */
export interface AuthenticatedRequest extends VercelRequest {
  /** The verified user payload extracted from the Bearer token (if present) */
  user?: UserJwtPayload;
}

/**
 * Type signature for wrapped Vercel serverless function handlers.
 */
export type VercelHandler = (
  req: AuthenticatedRequest,
  res: VercelResponse
) => Promise<void | VercelResponse> | void | VercelResponse;

/**
 * Options for configuring the `withAuth` middleware.
 */
export interface WithAuthOptions {
  /**
   * If true, anonymous requests or requests with guest tokens are permitted.
   * If false, requests without a valid registered user token receive a 401 Unauthorized.
   * @default true
   */
  allowGuest?: boolean;
}

/**
 * Middleware Higher-Order Function (HoF) that decorates a Vercel serverless function handler.
 *
 * @param {VercelHandler} handler - The route handler function to wrap
 * @param {WithAuthOptions} [options={ allowGuest: true }] - Middleware configuration options
 * @returns {Function} Wrapped Vercel serverless request handler
 *
 * @example
 * // Public or guest-accessible endpoint:
 * export default withAuth(chatHandler, { allowGuest: true });
 *
 * // User-only protected endpoint:
 * export default withAuth(linkAccountHandler, { allowGuest: false });
 */
export function withAuth(handler: VercelHandler, options: WithAuthOptions = { allowGuest: true }) {
  return async (req: AuthenticatedRequest, res: VercelResponse) => {
    // ----------------------------------------------------
    // 1. Configure CORS Headers
    // ----------------------------------------------------
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );

    // Respond immediately to browser preflight OPTIONS requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    // ----------------------------------------------------
    // 2. Extract & Validate Bearer Token
    // ----------------------------------------------------
    const authHeader = req.headers?.authorization;
    let token: string | undefined;

    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (!token) {
      // If no token was sent and guests are not allowed on this route -> 401
      if (!options.allowGuest) {
        return res.status(401).json({ error: 'Unauthorized: Missing Bearer authentication token.' });
      }
    } else {
      // Verify token authenticity and signature
      const decoded = verifyAppToken(token);
      if (!decoded) {
        return res.status(401).json({ error: 'Unauthorized: Invalid or expired Bearer authentication token.' });
      }
      req.user = decoded;
    }

    // ----------------------------------------------------
    // 3. Enforce Rate Limiting
    // ----------------------------------------------------
    const forwardedFor = req.headers ? req.headers['x-forwarded-for'] : undefined;
    const identifier =
      req.user?.userId ||
      (typeof forwardedFor === 'string' ? forwardedFor : Array.isArray(forwardedFor) ? forwardedFor[0] : undefined) ||
      req.socket?.remoteAddress ||
      'anonymous';

    const isGuest = req.user?.isGuest ?? true;

    try {
      const rateLimitRes = await checkRateLimit(identifier, isGuest);

      // Expose standard rate limit headers to client
      res.setHeader('X-RateLimit-Limit', rateLimitRes.limit.toString());
      res.setHeader('X-RateLimit-Remaining', rateLimitRes.remaining.toString());
      res.setHeader('X-RateLimit-Reset', rateLimitRes.reset.toString());

      if (!rateLimitRes.success) {
        return res.status(429).json({
          error: 'Too Many Requests: Rate limit exceeded. Please try again later.',
          reset: rateLimitRes.reset,
        });
      }
    } catch (err) {
      console.error('Rate limiting error (continuing request):', err);
    }

    // ----------------------------------------------------
    // 4. Delegate to Target Route Handler
    // ----------------------------------------------------
    return handler(req, res);
  };
}

