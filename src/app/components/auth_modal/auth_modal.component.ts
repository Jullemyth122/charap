import {
  Component,
  input,
  output,
  inject,
  signal,
  OnInit,
  AfterViewInit,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { AppIconComponent } from '../app-icon';
import { environment } from '../../../environments/environment';

// Declare global google variable provided by GSI script in index.html
declare const google: any;

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, AppIconComponent],
  templateUrl: './auth_modal.component.html',
  styleUrl: './auth_modal.component.scss',
})
export class AuthModalComponent implements AfterViewInit {
  protected readonly authService = inject(AuthService);
  private readonly clientId = environment.googleClientId;

  readonly isDarkMode = input<boolean>(true);
  readonly close = output<void>();

  protected readonly activeTab = signal<'login' | 'guest'>('login');
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly isSigningIn = signal<boolean>(false);
  protected readonly isCopied = signal<boolean>(false);

  @ViewChild('googleButtonContainer') googleButtonContainer?: ElementRef<HTMLDivElement>;

  ngAfterViewInit(): void {
    this.initGoogleSignIn();
  }

  /**
   * Initialize Google Identity Services and render the sign-in button.
   */
  private initGoogleSignIn(): void {
    if (typeof google === 'undefined' || !google?.accounts?.id) {
      console.warn('Google GSI script not loaded yet; will retry when user clicks tab.');
      return;
    }

    google.accounts.id.initialize({
      client_id: this.clientId,
      callback: (response: any) => this.handleGsiCallback(response),
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    this.renderGoogleButton();
  }

  /**
   * Render the styled Google Sign-In button into the container div.
   */
  renderGoogleButton(): void {
    const container = this.googleButtonContainer?.nativeElement;
    if (!container) return;

    if (typeof google === 'undefined' || !google?.accounts?.id) {
      console.warn('Google GSI not available yet.');
      return;
    }

    container.innerHTML = '';

    google.accounts.id.renderButton(container, {
      theme: this.isDarkMode() ? 'filled_black' : 'outline',
      size: 'large',
      type: 'standard',
      text: 'continue_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      width: container.offsetWidth || 360,
    });
  }

  /**
   * Handles the credential response from Google GSI callback.
   */
  private async handleGsiCallback(response: { credential: string }): Promise<void> {
    this.errorMessage.set(null);
    this.isSigningIn.set(true);
    try {
      const success = await this.authService.loginWithGoogle(response.credential);
      if (success) {
        this.close.emit();
      }
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Google Sign-In failed. Please try again.');
    } finally {
      this.isSigningIn.set(false);
    }
  }

  protected onTabChange(tab: 'login' | 'guest'): void {
    this.activeTab.set(tab);
    if (tab === 'login') {
      // Re-render Google button after tab switch (DOM may have changed)
      setTimeout(() => this.renderGoogleButton(), 50);
    }
  }

  protected async handleLogout(): Promise<void> {
    await this.authService.logout();
    this.close.emit();
  }

  protected async copyGuestUuid(): Promise<void> {
    const uuid = this.authService.guestUuid();
    if (!uuid) return;
    await navigator.clipboard.writeText(uuid);
    this.isCopied.set(true);
    setTimeout(() => this.isCopied.set(false), 2000);
  }
}
