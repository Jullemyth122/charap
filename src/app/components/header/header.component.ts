import { Component, inject, computed, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { AppIconComponent } from '../app-icon';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { ChefService } from '../../chef.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, AppIconComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent implements OnInit, OnDestroy {
  protected readonly authService = inject(AuthService);
  protected readonly themeService = inject(ThemeService);
  private readonly chefService = inject(ChefService);
  private readonly router = inject(Router);

  /** Reactive dark-mode state */
  protected readonly isDark = computed(() => this.themeService.isDarkMode());

  /** Mobile drawer open state */
  readonly mobileMenuOpen = signal<boolean>(false);

  private routerSub?: Subscription;

  ngOnInit(): void {
    // Automatically close mobile menu when navigating to another route
    this.routerSub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        this.closeMobileMenu();
      });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  protected handleThemeToggle(): void {
    this.themeService.toggleTheme();
  }

  protected openAccountModal(): void {
    this.closeMobileMenu();
    this.authService.openAuthModal();
  }

  protected handleResetChat(): void {
    this.chefService.clearHistory();
  }

  protected toggleMobileMenu(): void {
    this.mobileMenuOpen.update(prev => !prev);
  }

  protected closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }
}
