import { Injectable, signal, computed, inject } from '@angular/core';
import { Stats } from '../../../../models/stats';
import { Choice } from '../../../../models/email';
import { GameStateService } from './game-state.service';
import { Indicator } from '../../../../models/game-content';

export interface ValidationResult {
  canSelect: boolean;
  reason?: string;
}

@Injectable()
export class GameStatsService {
  private gameState = inject(GameStateService);
  private stats = signal<Stats>({});
  private indicatorsDef = computed<Indicator[]>(() => this.gameState.content()?.indicators || []);

  // Exposed computed stats
  readonly allStats = computed(() => this.stats());

  // Helper to get a specific indicator value
  value(key: string): number {
    return this.stats()[key] ?? 0;
  }

  /**
   * Initialize stats with custom values
   */
  initialize(initialBudget: number): void {
    const defs = this.indicatorsDef();
    const init: Stats = {};
    // Seed from content-defined indicators
    defs.forEach(def => {
      init[def.nameId] = def.initial ?? 0;
    });
    // If a separate initial budget is provided, map it to 'budget' if present
    if (typeof initialBudget === 'number' && 'budget' in defs) {
      init['budget'] = initialBudget;
    }
    this.stats.set(init);
  }

  /**
   * Reset all stats to initial values
   */
  reset(initialBudget: number): void {
    this.initialize(initialBudget);
  }

  /**
   * Apply outcome from a choice
   */
  applyOutcome(outcome: Choice['outcome']): void {
    const defs = this.indicatorsDef();
    this.stats.update(s => {
      const next: Stats = { ...s };
      Object.entries(outcome.impact || {}).forEach(([impactKey, delta]) => {
        // Map impact keys directly to indicator keys if they exist
        const key = impactKey; // expecting keys like 'profit', 'reputation', 'dataQuality', 'stakeholderTrust', 'budget'
        const def = defs.find(d => d.nameId === key);
        if (!def) return;
        if (def !== undefined && typeof delta === 'number') {

          const current = s[key] ?? def.initial ?? 0;
          const min = def.min ?? -Infinity;
          const max = def.max ?? Infinity;
          next[key] = this.clamp(current + delta, min, max);
        }
      });
      return next;
    });
  }

  /**
   * Check if a choice can be selected based on current stats
   */
  canAfford(choice: Choice): ValidationResult {
    const s = this.stats();
    const defs = this.indicatorsDef();
    for (const [key, delta] of Object.entries(choice.outcome.impact || {})) {
      if (!(key in defs) || typeof delta !== 'number') continue;
      const def = defs[key as any];
      const current = s[key] ?? def.initial ?? 0;
      const min = def.min ?? -Infinity;
      if (delta < 0 && current + delta < min) {
        return { canSelect: false, reason: `Not enough ${def.name.toLowerCase()}` };
      }
    }
    return { canSelect: true };
  }

  /**
   * Get a snapshot of current stats
   */
  snapshot(): Stats {
    return { ...this.stats() };
  }

  /**
   * Clamp a value between min and max
   */
  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
