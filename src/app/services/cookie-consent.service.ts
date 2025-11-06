import { Injectable, signal } from '@angular/core';

export interface CookieConsent {
  analytics: boolean;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class CookieConsentService {
  private readonly STORAGE_KEY = 'cookie-consent';
  
  // Signal to track consent state
  public hasConsent = signal<boolean | null>(null);
  
  constructor() {
    this.loadConsent();
  }
  
  /**
   * Load consent from localStorage
   */
  private loadConsent(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const consent: CookieConsent = JSON.parse(stored);
        this.hasConsent.set(consent.analytics);
      }
    } catch (error) {
      console.error('Error loading cookie consent:', error);
      this.hasConsent.set(null);
    }
  }
  
  /**
   * Accept cookies and enable analytics
   */
  public acceptCookies(): void {
    const consent: CookieConsent = {
      analytics: true,
      timestamp: Date.now()
    };
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(consent));
      this.hasConsent.set(true);
      this.initializeGoogleAnalytics();
    } catch (error) {
      console.error('Error saving cookie consent:', error);
    }
  }
  
  /**
   * Decline cookies
   */
  public declineCookies(): void {
    const consent: CookieConsent = {
      analytics: false,
      timestamp: Date.now()
    };
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(consent));
      this.hasConsent.set(false);
    } catch (error) {
      console.error('Error saving cookie consent:', error);
    }
  }
  
  /**
   * Reset consent (for testing or settings page)
   */
  public resetConsent(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.hasConsent.set(null);
  }
  
  /**
   * Initialize Google Analytics when consent is given
   */
  private initializeGoogleAnalytics(): void {
    if (typeof window === 'undefined') return;
    
    // Check if gtag is already loaded
    if ((window as any).gtag) {
      // Update consent
      (window as any).gtag('consent', 'update', {
        analytics_storage: 'granted'
      });
      return;
    }
    
    // Load Google Analytics script
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=G-HFMPT09EKH';
    document.head.appendChild(script);

    console.log('Google Analytics script added to document.');
    
    // Initialize dataLayer and gtag
    (window as any).dataLayer = (window as any).dataLayer || [];
    function gtag(...args: any[]) {
      (window as any).dataLayer.push(args);
    }
    (window as any).gtag = gtag;
    
    gtag('js', new Date());
    gtag('config', 'G-HFMPT09EKH', {
      anonymize_ip: true
    });
  }
}
