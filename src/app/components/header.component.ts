import { Component, ElementRef, HostListener, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { signOut } from 'aws-amplify/auth';
import type { PlanName } from '../models/user';
import { PlanComponent } from '../ui/elements/plan.component';
import { Router } from '@angular/router';
import { UserService } from '../services/user.service';
import { StripeService } from '../services/stripe.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, PlanComponent],
  template: `
    <header class="p-4 w-full flex items-center justify-between bg-gray-800 text-white relative">
      <div class="flex flex-row items-center gap-3">
        <img src="/assets/maketools_logo.png" alt="Logo" class="h-12" (click)="goHome()" />
        <app-plan [planName]="planName()" (goPro)="goPro()"></app-plan>
      </div>

      <div class="relative" #menuWrapper>
        <button
          type="button"
          class="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          aria-haspopup="menu"
          [attr.aria-expanded]="menuOpen()"
          (click)="toggleMenu()"
        >
          <span class="truncate max-w-[180px]" title="{{ displayName() }}">{{ displayName() }}</span>
          <i class="fa-solid" [ngClass]="{ 'fa-caret-up': menuOpen(), 'fa-caret-down': !menuOpen() }"></i>
        </button>

        @if (menuOpen()) {
          <div
            class="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50 text-gray-900"
            role="menu"
            aria-label="Profile menu"
          >
            <div class="py-1" role="none">
              <button
                type="button"
                class="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                role="menuitem"
                (click)="onSettings(); closeMenu()"
              >
                <i class="fa-solid fa-cog"></i>
                Settings
              </button>
              <button
                type="button"
                class="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-red-600 flex items-center gap-2"
                role="menuitem"
                (click)="onSignOut(); closeMenu()"
              >
                <i class="fa-solid fa-right-from-bracket"></i>
                Sign out
              </button>
            </div>
          </div>
        }
      </div>
    </header>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class HeaderComponent {
    private router = inject(Router);
    private userService = inject(UserService);
    private stripeService = inject(StripeService);
    private host = inject(ElementRef<HTMLElement>);

    // UI state
    menuOpen = signal(false);
    // Derive global state from services (no inputs)
  email = computed(() => this.userService.email());
  preferredUsername = computed(() => this.userService.preferredUsername());
  displayName = computed(() => this.preferredUsername() || this.email() || 'Account');
  planName = computed<PlanName>(() => this.userService.planName());

    async onSignOut() {
      try { await signOut(); } catch {}
    }

    onSettings() {
      this.router.navigate(['/settings']);
    }

    toggleMenu() {
      this.menuOpen.update(v => !v);
    }

    closeMenu() {
      this.menuOpen.set(false);
    }

    // Close on Escape
    @HostListener('document:keydown.escape')
    onEscape() {
      if (this.menuOpen()) this.closeMenu();
    }
    goHome() {
      this.router.navigate(['/']);
    }

    goPro() {
      this.stripeService.startCheckout().catch(err => {
        console.error('Stripe checkout failed', err);
      });
    }
}
