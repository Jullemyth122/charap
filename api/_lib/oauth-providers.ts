/**
 * @file oauth-providers.ts
 * @description OAuth 2.0 Provider Configuration Registry
 *
 * Defines authentication endpoints and API credentials for third-party OAuth providers
 * such as GitHub and Facebook. Used during OAuth code exchange and user profile retrieval.
 */

/**
 * Configuration options for an OAuth 2.0 provider.
 */
export interface OAuthProviderConfig {
  /** OAuth App Client ID from provider developer console */
  clientId: string;
  /** OAuth App Client Secret from provider developer console */
  clientSecret: string;
  /** Provider token URL used to exchange authorization code for an access token */
  tokenUrl: string;
  /** Provider API endpoint used to fetch the authenticated user's profile and email */
  userApiUrl: string;
}

/**
 * Retrieves the OAuth configuration for a specific provider name.
 *
 * @param {string} provider - Provider key (e.g., 'github', 'facebook')
 * @returns {OAuthProviderConfig | null} Provider configuration object, or null if unsupported
 */
export function getProviderConfig(provider: string): OAuthProviderConfig | null {
  switch (provider.toLowerCase()) {
    case 'github':
      return {
        clientId: process.env.GITHUB_CLIENT_ID || '',
        clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        userApiUrl: 'https://api.github.com/user',
      };

    case 'facebook':
      return {
        clientId: process.env.FACEBOOK_CLIENT_ID || '',
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '',
        tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
        userApiUrl: 'https://graph.facebook.com/me?fields=id,name,email,picture',
      };

    default:
      return null;
  }
}

