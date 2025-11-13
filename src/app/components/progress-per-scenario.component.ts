import { Component, signal, inject, computed, input, effect, untracked, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Scenario, Medal } from '../models/game-content';
import { ProgressSummary } from '../services/progress.service';
import { LeaderboardService } from '../services/leaderboard.service';

@Component({
  selector: 'app-progress-per-scenario',
  standalone: true,
  imports: [CommonModule],
  template: `
      <!-- Leaderboards items only (no wrappers/titles) -->
      <ng-container>
        @for (item of viewModels(); track item.scenario.nameId) {
          <div (click)="clickedScenarioLeaderboard.emit(item.scenario)" class="bg-black/20 hover:bg-black/10 text-white rounded-lg px-4 py-3 shadow border border-black/30 cursor-pointer">
            <!-- Top row: title + your status -->
            <div class="flex items-center justify-between gap-3">
              <div class="min-w-0">
                <div class="text-lg text-gray-300 truncate">{{ item.scenario.card.title }}</div>
                @if(!item.done){
                  <div class="text-xs text-gray-400 truncate">Not played yet</div>
                }
              </div>
              <div class="flex items-center gap-2">
                @if(item.done) {
                  <div class="flex items-center gap-1">
                    <span class="text-xl" [title]="item.rank === 1 ? 'You are first!' : (item.rank ? 'Your rank' : 'Unranked')">
                      {{ item.rank ? ('#' + item.rank) : '—' }}
                    </span>
                    <span class="text-xl" [attr.title]="item.medalTitle">{{ item.trophy ? '🏆' : item.medalEmoji }}</span>
                    <span class="text-lg text-gray-200" [title]="'Your best profit'">{{ item.profit | number:'1.0-0' }}</span>
                  </div>
                } @else {
                  <div class="w-6 h-6 rounded-full border border-dashed border-gray-500" title="No result yet"></div>
                }
              </div>
            </div>

            <!-- Bottom row: Top 3 leaderboard (hidden on mobile) -->
            @if(item.top3?.length) {
              <div class="hidden md:block mt-3">
                <div class="flex flex-col items-stretch gap-3">
                  @for (t of item.top3; track t.userId) {
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-3 rounded-lg bg-black/30 border border-black/20 px-3 py-2 shadow-inner">
                        <div class="w-9 h-9 flex items-center justify-center rounded-full bg-black/40 border border-black/30 text-2xl">
                          {{ t.rank === 1 ? '🥇' : (t.rank === 2 ? '🥈' : '🥉') }}
                        </div>
                        <div class="min-w-0 flex-1">
                          <div class="flex items-baseline justify-between gap-3">
                            <div class="truncate text-base font-medium"
                                 [class.text-yellow-300]="t.rank===1"
                                 [class.text-slate-200]="t.rank===2"
                                 [class.text-amber-300]="t.rank===3">
                              {{ t.username || 'Anon' }}
                            </div>
                            <div class="text-base tabular-nums font-semibold"
                                 [class.text-yellow-300]="t.rank===1"
                                 [class.text-slate-200]="t.rank===2"
                                 [class.text-amber-300]="t.rank===3"
                                 [title]="'Profit'">
                              {{ t.profit | number:'1.0-0' }}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        }
      </ng-container>
  `,
  styles: [`
    :host { display: contents; }
  `]
})
export class ProgressPerScenarioComponent {
  private lb = inject(LeaderboardService);

  // Inputs
  scenarios = input<Scenario[] | null | undefined>(undefined);
  progressSummary = input<ProgressSummary | null | undefined>(undefined);
  currentUserId = input<string>('');
  clickedScenarioLeaderboard = output<Scenario>();

  // Identity

  // Internal store per scenario
  private byScenario = signal<Record<string, {
    rank?: number;
    profit?: number;
    medalEmoji?: string;
    medalTitle?: string | null;
    trophy?: boolean;
    top3?: Array<{ rank: number; userId?: string; username?: string; profit?: number }>;
    done: boolean;
    priority: number;
    scenario: Scenario;
  }>>({});

  constructor() {
    // React to inputs to compute and fetch ranks lazily, without tracking internal store writes
    effect((onCleanup) => {
      const scenarios = this.scenarios() ?? [];
      const progress = this.progressSummary();
      if (!scenarios || scenarios.length === 0) return;

      // Use untracked read to avoid creating a feedback loop on byScenario
      const previous = untracked(() => this.byScenario());

      // Prepare/update basic rows
      const map: typeof previous = { ...previous };
      for (const s of scenarios) {
        const nameId = s.nameId;
        const done = !!progress?.byScenario?.[nameId]?.completed;
        const profit = this.extractProfit(progress, nameId);
        const priority = (s as any)?.priority ?? Number.MAX_SAFE_INTEGER;
        // Initialize row if missing or update basic fields
        const existing = map[nameId];
        map[nameId] = {
          ...(existing ?? {} as any),
          done,
          profit: typeof profit === 'number' ? profit : existing?.profit,
          priority,
          scenario: s,
          // Medal depends on profit & scenario thresholds
          ...this.computeMedalFields(s, typeof profit === 'number' ? profit : undefined, existing)
        } as any;
      }
      this.byScenario.set(map);

      // Setup a cancellation flag to ignore stale async results on re-run/destroy
      let cancelled = false;
      onCleanup(() => { cancelled = true; });

      // Fetch ranks only for done scenarios where rank not yet computed
      for (const s of scenarios) {
        const row = untracked(() => this.byScenario()[s.nameId]);
        const needTop3 = !row?.top3;
        const needRank = !!row?.done && row?.rank == null;
        if (!needTop3 && !needRank) continue;
        // Launch without awaiting to avoid blocking and to reduce cascading re-runs
        this.loadRankForScenario(s, { isCancelled: () => cancelled });
      }
    });
  }

  // View models sorted by priority
  viewModels = computed(() => {
    const map = this.byScenario();
    return Object.values(map)
      .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
  });

  private extractProfit(progress: ProgressSummary | null | undefined, scenarioNameId: string): number | undefined {
    const entry = progress?.byScenario?.[scenarioNameId];
    const profitScore = entry?.indicatorScores?.find((s: any) => s?.indicatorNameId === 'profit');
    const val = profitScore?.value;
    return typeof val === 'number' ? val : undefined;
  }

  private computeMedalFields(s: Scenario, profit: number | undefined, existing?: any): { medalEmoji?: string; medalTitle?: string | null } {
    if (profit == null) return { medalEmoji: existing?.medalEmoji, medalTitle: existing?.medalTitle };
    const medals = (s.medals || []) as Medal[];
    const sorted = [...medals].sort((a, b) => b.threshold - a.threshold);
    for (const m of sorted) {
      if (profit >= m.threshold) {
        const emoji = m.name === 'gold' ? '🥇' : m.name === 'silver' ? '🥈' : m.name === 'bronze' ? '🥉' : '';
        const title = `${m.name.charAt(0).toUpperCase() + m.name.slice(1)} (≥ ${m.threshold.toLocaleString()})`;
        return { medalEmoji: emoji, medalTitle: title };
      }
    }
    return { medalEmoji: '', medalTitle: null };
  }

  private async loadRankForScenario(s: Scenario, opts?: { isCancelled?: () => boolean }) {
    try {
      const nameId = s.nameId;
      const userId = this.currentUserId();
      const res = await this.lb.listTopByScenario(nameId, 50);
      const items = res.items || [];
      const idx = items.findIndex(e => (e as any)?.userId === userId);
      const rank = idx >= 0 ? (idx + 1) : undefined;
      const topUserId = items[0]?.userId;
      const trophy = !!userId && userId === topUserId && rank === 1;
      const top3 = items.slice(0, 3).map((e, i) => ({ rank: i + 1, userId: (e as any)?.userId, username: (e as any)?.username, profit: (e as any)?.profit }));
      if (opts?.isCancelled?.()) return;
      const map = { ...this.byScenario() };
      const current = map[nameId] ?? { done: false, scenario: s, priority: (s as any)?.priority ?? 0 };
      // Prefer leaderboard profit if we found the row; else keep existing
      const profit = idx >= 0 ? items[idx]?.profit : current.profit;
      const medal = this.computeMedalFields(s, typeof profit === 'number' ? profit : undefined, current);
      map[nameId] = { ...current, rank, trophy, profit, ...medal, top3 };
      this.byScenario.set(map);
    } catch (err) {
      // Non-fatal: ignore rank on error
      // console.warn('Failed to load rank for', s.nameId, err);
    }
  }
}
