/**
 * @file jwt.ts
 * @description JSON Web Token (JWT) Generation & Verification Utility
 *
 * This module handles signing and validating stateless JSON Web Tokens for user and guest authentication.
 * Tokens are used by the frontend to authenticate API requests via the `Authorization: Bearer <token>` header.
 */

import jwt, { SignOptions } from 'jsonwebtoken';

/**
 * Payload structure embedded inside every issued application JWT.
 */
export interface UserJwtPayload {
  /** Unique identifier for the user (or guest UUID if anonymous) */
  userId: string;
  /** User's primary email address (undefined for anonymous guests) */
  email?: string;
  /** User's display name */
  name?: string;
  /** Role string (e.g. 'user', 'guest', 'admin') */
  role: string;
  /** Boolean flag: true if the token belongs to an anonymous guest, false if a registered user */
  isGuest: boolean;
  /** Original guest UUID (retained even after linking or during guest sessions) */
  guestUuid?: string;
}

/** Fallback secret used during development if JWT_SECRET is not set in .env */
const DEFAULT_SECRET = 'charap_super_secret_jwt_key_2026_change_in_production_32chars';

/**
 * Retrieves the cryptographic secret used to sign and verify application JWTs.
 *
 * @returns {string} The secret key string from process.env.JWT_SECRET or fallback
 */
export function getJwtSecret(): string {
  return process.env.JWT_SECRET || DEFAULT_SECRET;
}

/**
 * Signs and issues a new JWT containing the provided user payload.
 *
 * @param {UserJwtPayload} payload - The user identity data to encode into the token
 * @param {string | number} [expiresIn='7d'] - Expiration time span (e.g., '7d', '30d', '1h' or seconds)
 * @returns {string} The signed JWT string
 *
 * @example
 * // Issue a 7-day token for a registered user:
 * const token = signAppToken({ userId: '123', email: 'user@example.com', role: 'user', isGuest: false }, '7d');
 */
export function signAppToken(payload: UserJwtPayload, expiresIn: string | number = '7d'): string {
  const secret = getJwtSecret();
  const options: SignOptions = {
    expiresIn: expiresIn as any,
    issuer: 'charap-api',
  };

  return jwt.sign(payload, secret, options);
}

/**
 * Decodes and cryptographically verifies an incoming JWT string.
 *
 * Checks:
 * 1. Cryptographic signature matches the server secret
 * 2. Token has not expired (based on `exp` claim)
 * 3. Issuer matches `charap-api`
 *
 * @param {string} token - The raw Bearer token string from HTTP Authorization header
 * @returns {UserJwtPayload | null} The verified payload object, or `null` if verification failed
 */
export function verifyAppToken(token: string): UserJwtPayload | null {
  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret, {
      issuer: 'charap-api',
    }) as UserJwtPayload;

    return decoded;
  } catch (error) {
    console.error('JWT Verification failed:', error instanceof Error ? error.message : error);
    return null;
  }
}

