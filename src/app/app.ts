import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './services/theme.service';
import { AuthService } from './services/auth.service';
import { HeaderComponent } from './components/header/header.component';
import { AuthModalComponent } from './components/auth_modal/auth_modal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, HeaderComponent, AuthModalComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected themeService = inject(ThemeService);
  protected authService = inject(AuthService);
}
