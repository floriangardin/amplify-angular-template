import { Injectable } from '@angular/core';

/**
 * Ensures only one ScenarioCard flyout is open at a time across the app.
 * Registers the currently open card and automatically closes any previous one
 * when a new card requests to open.
 */
@Injectable({ providedIn: 'root' })
export class ScenarioFlyoutRegistryService {
  private current: { close: () => void } | null = null;

  /**
   * Request to open a flyout for the given component. If another flyout is
   * currently open, it will be closed first.
   */
  requestOpen(component: { close: () => void }): void {
    if (this.current && this.current !== component) {
      try { this.current.close(); } catch {}
    }
    this.current = component;
  }

  /**
   * Notify that a component has closed its flyout. Only clears the registry if
   * the notifying component is the one currently registered.
   */
  notifyClosed(component: { close: () => void }): void {
    if (this.current === component) {
      this.current = null;
    }
  }

  /** Force close any open flyout (if present). */
  closeAll(): void {
    if (this.current) {
      try { this.current.close(); } catch {}
      this.current = null;
    }
  }
}
