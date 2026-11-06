import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly THEME_KEY = 'charap_theme_mode';

  readonly isDarkMode = signal<boolean>(true);

  constructor() {
    this.initTheme();
  }

  private initTheme(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(this.THEME_KEY);
      if (saved !== null) {
        this.isDarkMode.set(saved === 'dark');
      } else {
        // Default to dark mode for rich aesthetics
        this.isDarkMode.set(true);
      }
    }
  }

  toggleTheme(): void {
    const next = !this.isDarkMode();
    this.isDarkMode.set(next);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(this.THEME_KEY, next ? 'dark' : 'light');
    }
  }

  setTheme(isDark: boolean): void {
    this.isDarkMode.set(isDark);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(this.THEME_KEY, isDark ? 'dark' : 'light');
    }
  }
}
