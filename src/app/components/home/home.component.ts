import { Component, inject, computed, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { gsap } from 'gsap';

@Component({
  selector: 'home-component',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home-component.html',
  styleUrl: './home-component.scss',
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  protected readonly authService = inject(AuthService);
  protected readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);

  protected readonly isDarkMode = computed(() => this.themeService.isDarkMode());
  private ctx?: gsap.Context;

  ngAfterViewInit(): void {
    this.ctx = gsap.context(() => {
      // 1. Entrance timeline
      const tl = gsap.timeline({
        defaults: { ease: 'power3.out' },
      });

      tl.from('.glass-card', {
        y: 60,
        opacity: 0,
        duration: 1,
        stagger: 0.15,
      })
        .from('.pill-tag', { y: 20, opacity: 0, duration: 0.6 }, '-=0.6')
        .from('.hero-title', { y: 30, opacity: 0, duration: 0.8 }, '-=0.5')
        .from('.hero-subtitle', { y: 20, opacity: 0, duration: 0.6 }, '-=0.6')
        .from(
          '.metric',
          {
            y: 20,
            opacity: 0,
            duration: 0.5,
            stagger: 0.1,
          },
          '-=0.4',
        )
        .from('.hero-statement-block', { opacity: 0, x: -20, duration: 0.8 }, '-=0.4')
        .from('.hero-actions-row', { y: 20, opacity: 0, duration: 0.5 }, '-=0.6')
        .from(
          '.cta-btn',
          {
            y: 20,
            opacity: 0,
            duration: 0.5,
            stagger: 0.1,
          },
          '-=0.6',
        )
        .from(
          '.svg-wrapper',
          {
            scale: 0.8,
            opacity: 0,
            duration: 1,
            ease: 'back.out(1.2)',
          },
          '-=0.8',
        )
        .from(
          '.float-badge',
          {
            scale: 0,
            opacity: 0,
            duration: 0.6,
            stagger: 0.15,
            ease: 'back.out(1.7)',
          },
          '-=0.6',
        )
        .from(
          '.orbit-layer-1',
          {
            scale: 0.6,
            opacity: 0,
            duration: 0.9,
            ease: 'back.out(1.4)',
          },
          '-=0.7',
        )
        .from(
          '.orbit-layer-2',
          {
            scale: 0.5,
            opacity: 0,
            duration: 0.9,
            ease: 'back.out(1.2)',
          },
          '-=0.6',
        )
        .from(
          '.orbit-layer-3',
          {
            scale: 0.4,
            opacity: 0,
            duration: 1.0,
            ease: 'back.out(1.1)',
          },
          '-=0.6',
        );

      // 2. Continuous SVG character, fire & cooking animations
      this.initSvgAnimations();
    });
  }

  private initSvgAnimations(): void {
    // ── 1. Character & Pan (Synchronized breathing so hands stay on the pan) ──
    gsap.to('.cook', {
      y: -2,
      duration: 2.2,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });

    gsap.to('.float-pan', {
      y: -2,
      duration: 2.2,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });

    // Natural blinking eyes every ~4s
    gsap.timeline({ repeat: -1, repeatDelay: 3.8 }).to('.face-detail', {
      scaleY: 0.1,
      transformOrigin: '50% 50%',
      duration: 0.08,
      yoyo: true,
      repeat: 1,
    });

    // ── 2. Realistic Multi-Layer Cooking Fire (Rendered in front of pan) ──
    gsap.to('.flame-outer', {
      scaleY: 1.05,
      scaleX: 0.98,
      transformOrigin: '50% 100%',
      duration: 0.45,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });

    gsap.to('.flame-mid', {
      scaleY: 1.08,
      scaleX: 0.96,
      transformOrigin: '50% 100%',
      duration: 0.36,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });

    gsap.to('.flame-inner', {
      scaleY: 1.11,
      scaleX: 0.94,
      transformOrigin: '50% 100%',
      duration: 0.28,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });

    gsap.to('.flame-hot', {
      scaleY: 1.15,
      scaleX: 0.92,
      opacity: 0.95,
      transformOrigin: '50% 100%',
      duration: 0.2,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });

    gsap.to('.fire-glow', {
      scale: 1.08,
      opacity: 0.3,
      transformOrigin: '50% 50%',
      duration: 0.75,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });

    // Floating embers / sparks
    gsap.utils.toArray<SVGElement>('.fire-spark').forEach((spark, index) => {
      gsap
        .timeline({ repeat: -1, delay: index * 0.4 })
        .fromTo(
          spark,
          { y: 0, opacity: 0, scale: 0.6 },
          { y: -12, opacity: 0.85, scale: 1, duration: 0.5, ease: 'sine.out' },
        )
        .to(spark, { y: -24, opacity: 0, scale: 0.3, duration: 0.5, ease: 'sine.in' });
    });

    // ── 3. Sizzling Egg & Steam ──
    gsap.to('.egg', {
      scale: 1.012,
      transformOrigin: '50% 50%',
      duration: 0.35,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });

    gsap.to('.yolk', {
      scale: 1.035,
      transformOrigin: '50% 50%',
      duration: 0.7,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });

    // Graceful rising steam trails
    gsap.utils.toArray<SVGElement>('.steam').forEach((steamEl, i) => {
      gsap
        .timeline({ repeat: -1, delay: i * 0.7 })
        .fromTo(
          steamEl,
          { y: 4, opacity: 0, scale: 0.9, transformOrigin: '50% 100%' },
          { y: -8, opacity: 0.55, scale: 1.02, duration: 1.1, ease: 'sine.out' },
        )
        .to(steamEl, { y: -22, opacity: 0, scale: 1.12, duration: 1.1, ease: 'sine.in' });
    });

    // ── 4. Ambient Rings & Sparkles ──
    gsap.to('.pulse-ring', {
      scale: 1.03,
      opacity: 0.9,
      transformOrigin: '50% 50%',
      duration: 2.5,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });

    gsap.to('.spin-ring', {
      rotation: 360,
      transformOrigin: '50% 50%',
      duration: 35,
      repeat: -1,
      ease: 'none',
    });

    gsap.to('.sparkle-blink', {
      opacity: 0.3,
      scale: 0.7,
      transformOrigin: '50% 50%',
      duration: 1.4,
      repeat: -1,
      yoyo: true,
      stagger: 0.3,
      ease: 'sine.inOut',
    });

    gsap.to('.star-spin', {
      opacity: 0.4,
      scale: 0.85,
      transformOrigin: '50% 50%',
      duration: 1.8,
      repeat: -1,
      yoyo: true,
      stagger: 0.5,
      ease: 'sine.inOut',
    });
  }

  ngOnDestroy(): void {
    this.ctx?.revert();
  }

  /** Navigate directly to the AI Kitchen */
  handleStartCooking(): void {
    this.router.navigate(['/kitchen']);
  }

  /** Open auth modal if not logged in, otherwise go to kitchen */
  handleJoinCommunity(): void {
    if (this.authService.currentUser()) {
      this.router.navigate(['/kitchen']);
    } else {
      this.authService.openAuthModal();
    }
  }

  /** Trigger waitlist flow or navigation */
  handleJoinWaitlist(): void {
    this.router.navigate(['/kitchen'], { queryParams: { mode: 'waitlist' } });
  }
}
