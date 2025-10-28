import { Component, ElementRef, HostListener, OnInit, output, signal, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { fetchAuthSession, fetchUserAttributes } from 'aws-amplify/auth';
import type { PlanName } from '../models/user';
import { PlanComponent } from '../ui/elements/plan.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, PlanComponent],
  template: `
    <header class="p-4 w-screen flex items-center justify-between bg-gray-800 text-white relative">
      <div class="flex flex-row items-center gap-3">
        <img src="/assets/maketools_logo.png" alt="Logo" class="h-12" />
        <app-plan [planName]="planName()" (goPro)="goPro.emit()"></app-plan>
      </div>

      <div class="relative" #menuWrapper>
        <button
          type="button"
          class="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          aria-haspopup="menu"
          [attr.aria-expanded]="menuOpen()"
          (click)="toggleMenu()"
        >
          <span class="truncate max-w-[180px]" title="{{ email() || 'Account' }}">{{ email() || 'Account' }}</span>
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

    signOut = output<void>();
    settings = output<void>();
    goPro = output<void>();

    // UI state
    menuOpen = signal(false);
    email = input<string>('');
    planName = input<PlanName>('');
    


    private host = inject(ElementRef<HTMLElement>);

    onSignOut() {
        this.signOut.emit();
    }

    onSettings() {
        this.settings.emit();
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
}
