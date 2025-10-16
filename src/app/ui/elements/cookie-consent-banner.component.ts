import { Component, inject, effect, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-cookie-consent-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if(showBanner){
      <div 
        class="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-gray-200 shadow-2xl"
        role="dialog"
        aria-labelledby="cookie-consent-title"
        aria-describedby="cookie-consent-description"
      >
      <div class="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div class="flex-1">
            <h2 id="cookie-consent-title" class="text-lg font-bold text-gray-900 mb-2">
              🍪 Cookie Consent
            </h2>
            <p id="cookie-consent-description" class="text-sm text-gray-600">
              We use cookies to enhance your browsing experience and analyze our traffic. 
              By clicking "Accept", you consent to our use of cookies for analytics purposes.
              <a 
                href="https://policies.google.com/technologies/partner-sites" 
                target="_blank" 
                rel="noopener noreferrer"
                class="text-secondary-600 hover:text-secondary-800 underline ml-1"
              >
                Learn more about Google Analytics
              </a>
            </p>
          </div>
          
          <div class="flex gap-3 w-full sm:w-auto">
            <button
              (click)="decline()"
              class="flex-1 sm:flex-none px-6 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
              type="button"
            >
              Decline
            </button>
            <button
              (click)="accept()"
              class="flex-1 sm:flex-none px-6 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
              type="button"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
      </div>
    }
  `,
  styles: [`
    :host {
      display: contents;
    }
  `]
})
export class CookieConsentBannerComponent {

  hasConsent = input<boolean | null>(null);
  acceptCookie = output<void>();
  declineCookie = output<void>();
  showBanner = false;
  
  constructor() {
    // Watch for consent changes
    effect(() => {
      const consent = this.hasConsent();
      this.showBanner = consent === null;
    });
  }
  
  accept(): void {
    this.acceptCookie.emit();
  }
  
  decline(): void {
    this.declineCookie.emit();
  }
}
