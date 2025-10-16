import { ApplicationRef, ChangeDetectorRef, DestroyRef, Directive, OnInit, inject } from '@angular/core';
import { Hub } from 'aws-amplify/utils';
import { AuthenticatorService } from '@aws-amplify/ui-angular';

// Attribute directive to force Angular CD ticks when Amplify auth emits events.
// Useful with provideZonelessChangeDetection where async callbacks don't auto-trigger CD.
@Directive({
  selector: '[amplifyZonelessBridge]',
  standalone: true,
})
export class AmplifyZonelessBridgeDirective implements OnInit {
  private appRef = inject(ApplicationRef);
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);
  private authenticator = inject(AuthenticatorService);
  private pendingTick = false;

  ngOnInit(): void {
    // Initial tick to render authenticator on first paint
    this.queueTick();

    // Listen to Amplify Auth Hub channel and tick on changes
    const remove = Hub.listen('auth', () => {
      this.queueTick();
    });

    // Also subscribe to authenticator internal state updates
    const sub = this.authenticator.subscribe(() => {
      this.queueTick();
    });

    // Clean up listener on destroy
    this.destroyRef.onDestroy(() => {
      try { remove(); } catch {}
      try { sub.unsubscribe(); } catch {}
    });
  }

  private queueTick() {
    if (this.pendingTick) return;
    this.pendingTick = true;
    // Schedule after the current render cycle to avoid NG0100 in dev
    const raf = typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
      ? window.requestAnimationFrame.bind(window)
      : (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()));

    raf(() => {
      // microtask first, then macrotask, to ensure we are out of current CD
      Promise.resolve().then(() => {
        try {
          this.cdr.markForCheck();
          // attempt a local detect first (affects host view)
          this.cdr.detectChanges();
        } catch {
          // ignore
        }
      });

      setTimeout(() => {
        this.pendingTick = false;
        try {
          this.appRef.tick();
        } catch {
          // no-op
        }
      }, 0);
    });
  }
}
