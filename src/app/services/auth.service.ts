import { Injectable, signal, computed } from '@angular/core';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  role?: string;
}

export interface AuthState {
  user: UserProfile | null;
  guestUuid: string | null;
  token: string | null;
  isGuest: boolean;
  isLoading: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // Reactive Signals for State
  readonly currentUser = signal<UserProfile | null>(null);
  readonly guestUuid = signal<string | null>(null);
  readonly token = signal<string | null>(null);
  readonly isGuest = computed(() => !this.currentUser());
  readonly isLoading = signal<boolean>(false);
  readonly isAuthModalOpen = signal<boolean>(false);

  private readonly API_BASE = '/api/auth';

  constructor() {
    this.initializeAuth();
  }

  /**
   * Initializes session from localStorage or requests a new guest token.
   */
  async initializeAuth(): Promise<void> {
    const savedToken = localStorage.getItem('charap_token');
    const savedGuestUuid = localStorage.getItem('charap_guest_uuid');
    const savedUser = localStorage.getItem('charap_user');

    if (savedToken) {
      this.token.set(savedToken);
    }
    if (savedGuestUuid) {
      this.guestUuid.set(savedGuestUuid);
    }
    if (savedUser) {
      try {
        this.currentUser.set(JSON.parse(savedUser));
      } catch (e) {
        console.warn('Failed to parse cached user profile:', e);
      }
    }

    // If no token exists, initialize a guest session
    if (!savedToken) {
      await this.registerGuestSession();
    }
  }

  /**
   * Helper to safely parse JSON responses and throw readable errors if HTML/non-JSON is returned.
   */
  private async safeJsonParse(response: Response): Promise<any> {
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await response.text();
      console.warn(
        `[AuthService] Received non-JSON response (${response.status}) from ${response.url}:`,
        text.slice(0, 150),
      );
      throw new Error(
        `API server at ${response.url} returned HTML (${response.status}) instead of JSON. Ensure your API serverless backend is running.`,
      );
    }

    try {
      return await response.json();
    } catch (e) {
      throw new Error(`Failed to parse JSON response from ${response.url}`);
    }
  }

  /**
   * Registers or restores an anonymous guest session.
   */
  async registerGuestSession(): Promise<void> {
    this.isLoading.set(true);
    try {
      const response = await fetch(`${this.API_BASE}/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestUuid: this.guestUuid() }),
      });

      if (response.ok) {
        const data = await this.safeJsonParse(response);
        if (data.token) {
          this.token.set(data.token);
          this.guestUuid.set(data.guestUuid);
          localStorage.setItem('charap_token', data.token);
          localStorage.setItem('charap_guest_uuid', data.guestUuid);
        }
      }
    } catch (err) {
      console.warn('Backend guest auth unreachable (using local guest mode):', err);
      if (!this.guestUuid()) {
        const fallbackUuid = crypto.randomUUID();
        this.guestUuid.set(fallbackUuid);
        localStorage.setItem('charap_guest_uuid', fallbackUuid);
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Signs in with Google ID Token obtained from Google Identity Services / GIS.
   */
  async loginWithGoogle(idToken: string): Promise<boolean> {
    this.isLoading.set(true);
    try {
      const response = await fetch(`${this.API_BASE}/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken,
          guestUuid: this.guestUuid(),
        }),
      });

      const data = await this.safeJsonParse(response);

      if (!response.ok) {
        throw new Error(data.error || 'Google Sign-In failed');
      }

      if (data.token && data.user) {
        this.token.set(data.token);
        this.currentUser.set(data.user);
        localStorage.setItem('charap_token', data.token);
        localStorage.setItem('charap_user', JSON.stringify(data.user));
        this.isAuthModalOpen.set(false);
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('Error signing in with Google:', err);
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Links current guest UUID session to logged-in user account.
   */
  async linkGuestAccount(): Promise<boolean> {
    const currentToken = this.token();
    const currentGuestUuid = this.guestUuid();
    if (!currentToken || !currentGuestUuid || this.isGuest()) return false;

    try {
      const response = await fetch(`${this.API_BASE}/link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({ guestUuid: currentGuestUuid }),
      });

      return response.ok;
    } catch (err) {
      console.warn('Error linking guest session:', err);
      return false;
    }
  }

  /**
   * Signs out current user and restores guest mode.
   */
  async logout(): Promise<void> {
    this.currentUser.set(null);
    localStorage.removeItem('charap_user');
    localStorage.removeItem('charap_token');
    this.token.set(null);
    await this.registerGuestSession();
  }

  /**
   * Returns Authorization header object for HTTP API calls.
   */
  getAuthHeaders(): Record<string, string> {
    const token = this.token();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  openAuthModal() {
    this.isAuthModalOpen.set(true);
  }

  closeAuthModal() {
    this.isAuthModalOpen.set(false);
  }
}
