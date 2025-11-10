// src/app/services/responsive.service.ts
import { Injectable, signal, effect } from '@angular/core';

export type ScreenSize = 'mobile' | 'medium' | 'large';

@Injectable({ providedIn: 'root' })
export class ResponsiveService {
  private screenSize = signal<ScreenSize>(this.getScreenSize());
  
  // Public signal for components to read
  readonly currentScreenSize = this.screenSize.asReadonly();
  
  // Computed signal for carousel page size
  readonly carouselPageSize = signal<number>(this.getPageSizeForScreen(this.screenSize()));

  constructor() {
    // Listen to window resize events
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => this.updateScreenSize());
      this.updateScreenSize(); // Initial check
    }

    // Update page size when screen size changes
    effect(() => {
      const size = this.screenSize();
      this.carouselPageSize.set(this.getPageSizeForScreen(size));
    });
  }

  private updateScreenSize(): void {
    this.screenSize.set(this.getScreenSize());
  }

  private getScreenSize(): ScreenSize {
    if (typeof window === 'undefined') return 'large';
    
    const width = window.innerWidth;
    
    // Tailwind breakpoints: sm=640px, md=768px, lg=1024px
    if (width < 768) return 'mobile';
    if (width < 1024) return 'medium';
    return 'large';
  }

  private getPageSizeForScreen(size: ScreenSize): number {
    switch (size) {
      case 'mobile':
        return 2;
      case 'medium':
        return 4;
      case 'large':
        return 5;
    }
  }
}
