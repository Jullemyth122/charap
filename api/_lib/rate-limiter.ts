/**
 * @file rate-limiter.ts
 * @description API Rate Limiting Utility (Upstash Redis with In-Memory Fallback)
 *
 * Protects expensive backend endpoints (Gemini AI, ElevenLabs TTS, Transcription) from abuse,
 * DDoS attacks, and cost spikes by throttling requests based on client identity:
 *
 * Tier Limits:
 * - Guests (Anonymous): 10 requests per hour per IP / guest ID
 * - Registered Users:  100 requests per hour per user ID
 *
 * Implementation:
 * - Production: Uses Upstash Redis with a sliding window algorithm across serverless instances.
 * - Development / Fallback: Uses an in-memory sliding window Map if Redis environment variables are not configured.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/** Cached instance of Upstash Ratelimit for anonymous guest requests */
let ratelimitGuest: Ratelimit | null = null;
/** Cached instance of Upstash Ratelimit for registered user requests */
let ratelimitUser: Ratelimit | null = null;

/**
 * Local in-memory store used as a fallback when Upstash Redis is not connected.
 * Key structure: `guest:<identifier>` or `user:<identifier>`
 */
const inMemoryStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Initializes and caches Upstash Redis rate limiters if UPSTASH_REDIS_REST_URL and
 * UPSTASH_REDIS_REST_TOKEN environment variables are available.
 *
 * @returns {{ ratelimitGuest: Ratelimit | null, ratelimitUser: Ratelimit | null }}
 */
function getUpstashRatelimiters() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token && !ratelimitGuest) {
    const redis = new Redis({ url, token });

    // Anonymous guests: 10 requests per 1 hour sliding window
    ratelimitGuest = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 h'),
      analytics: true,
      prefix: '@upstash/ratelimit/guest',
    });

    // Registered users: 100 requests per 1 hour sliding window
    ratelimitUser = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '1 h'),
      analytics: true,
      prefix: '@upstash/ratelimit/user',
    });
  }

  return { ratelimitGuest, ratelimitUser };
}

/**
 * Result returned by the rate limit check.
 */
export interface RateLimitResult {
  /** True if the request is permitted; false if rate limit has been exceeded */
  success: boolean;
  /** The maximum number of allowed requests in the current window */
  limit: number;
  /** The number of remaining allowed requests in the current window */
  remaining: number;
  /** Unix timestamp (in milliseconds) when the current window resets */
  reset: number;
}

/**
 * Checks whether a given identifier (User ID or IP address) is within their allowed rate limit.
 *
 * @param {string} identifier - Unique client identifier (User ID or Client IP address)
 * @param {boolean} isGuest - Flag indicating if client is an anonymous guest (strict limit) or registered user
 * @returns {Promise<RateLimitResult>} Rate limit check status including remaining tokens and reset time
 */
export async function checkRateLimit(identifier: string, isGuest: boolean): Promise<RateLimitResult> {
  const { ratelimitGuest, ratelimitUser } = getUpstashRatelimiters();
  const limiter = isGuest ? ratelimitGuest : ratelimitUser;

  // 1. Primary: If Upstash Redis is configured, use its distributed sliding window
  if (limiter) {
    const res = await limiter.limit(identifier);
    return {
      success: res.success,
      limit: res.limit,
      remaining: res.remaining,
      reset: res.reset,
    };
  }

  // 2. Fallback: Local in-memory sliding window for development
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour window in milliseconds
  const limit = isGuest ? 10 : 100;
  const key = `${isGuest ? 'guest' : 'user'}:${identifier}`;

  const current = inMemoryStore.get(key);

  // If new client or current window has expired, reset window
  if (!current || now > current.resetAt) {
    const resetAt = now + windowMs;
    inMemoryStore.set(key, { count: 1, resetAt });
    return { success: true, limit, remaining: limit - 1, reset: resetAt };
  }

  // If client reached or exceeded max limit
  if (current.count >= limit) {
    return { success: false, limit, remaining: 0, reset: current.resetAt };
  }

  // Increment request counter
  current.count += 1;
  return { success: true, limit, remaining: limit - current.count, reset: current.resetAt };
}

