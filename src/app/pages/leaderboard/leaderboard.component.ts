import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../components/header.component';
import { ClientService } from '../../services/client.service';
import { LeaderboardService } from '../../services/leaderboard.service';
import { Scenario, Medal, Indicator } from '../../models/game-content';
import { EditableTextComponent } from '../../ui/fields/editable-text.component';
import type { Schema } from '../../../../amplify/data/resource';
import { EndResult, DefeatReason } from '../../models/stats';

@Component({
  selector: 'app-leaderboard-page',
  standalone: true,
  imports: [CommonModule, HeaderComponent, EditableTextComponent],
  styles: [`
  :host {
      width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: flex-start;
      align-items: center; 
    }
  `], 
  template: `
    <app-header class="w-full"></app-header>
    <div class="my-8 text-white md:w-md lg:w-xl">
      <button class=" my-4 py-2 rounded hover:underline text-white self-start" (click)="router.navigate(['/'])">← Back to Home</button>  
      <h1 class="text-2xl font-bold mb-2">Leaderboard</h1>
      @if (scenario()) {
        <app-editable-text
          class="text-sm text-gray-300 pb-32"
          [text]=" 'Scenario: ' + scenario()!.card.title "
          [isEditable]="false"
        ></app-editable-text>
      }

      @if (endResult()) {
        <section class="mt-4 bg-black/40 border border-white/10 rounded-xl px-6 py-5 space-y-4">
          <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p class="text-lg font-semibold"
                 [ngClass]="endResult()!.hasWon ? 'text-green-300' : 'text-red-300'">
                {{ verdictTitle() }}
              </p>
              <p class="text-sm text-gray-200 mt-1">
                {{ verdictMessage() }}
              </p>
            </div>
            <span class="inline-flex items-center justify-center self-start rounded-full border px-4 py-1 text-sm font-semibold"
                  [ngClass]="endResult()!.hasWon ? 'border-green-400/40 bg-green-500/20 text-green-200' : 'border-red-400/40 bg-red-500/20 text-red-200'">
              {{ endResult()!.hasWon ? 'Victory' : 'Defeat' }}
            </span>
          </div>
          @if (indicatorSummaries().length > 0) {
            <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ng-container *ngFor="let indicator of indicatorSummaries()">
                <div class="bg-white/5 border border-white/10 rounded-lg px-5 py-3">
                  <dt class="text-xs uppercase tracking-wide text-gray-300 flex items-center gap-2">
                    <span class="text-base" *ngIf="indicator.emoji">{{ indicator.emoji }}</span>
                    <span>{{ indicator.label }}</span>
                  </dt>
                  <dd class="mt-1 text-xl font-semibold text-white">{{ indicator.formattedValue }}</dd>
                </div>
              </ng-container>
            </dl>
          }
        </section>
      }

      <div class="bg-white text-gray-900 rounded-lg shadow overflow-hidden mt-8">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medal</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr *ngFor="let row of rows(); let i = index"
                [ngClass]="{ 'font-bold': row.userId === currentUserId() }">
              <td class="px-4 py-3">{{ (pageIndex() * pageSize) + i + 1 }}</td>
              <td class="px-4 py-3">{{ row.username }}</td>
              <td class="px-4 py-3 text-lg" [attr.title]="medalTitleForProfit(row.profit)">{{ medalEmojiForProfit(row.profit) }}</td>
              <td class="px-4 py-3">{{ row.profit | number:'1.0-0' }}</td>
            </tr>
            @if(rows().length === 0) {
              <tr >
                <td class="px-4 py-6 text-center text-gray-500" colspan="4">No scores yet. Be the first!</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <div class="flex items-center justify-between mt-4">
        <button class="px-3 py-2 rounded bg-gray-700 text-white disabled:opacity-50" [disabled]="!canPrev()" (click)="prev()">Previous</button>
        <div class="text-sm text-gray-300">Page {{ pageIndex() + 1 }}</div>
        <button class="px-3 py-2 rounded bg-primary-600 text-white disabled:opacity-50" [disabled]="!canNext()" (click)="next()">Next</button>
      </div>
    </div>
  `
})
export class LeaderboardPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  router = inject(Router);
  private client = inject(ClientService).client;
  private lb = inject(LeaderboardService);

  scenarioNameId = signal<string>('');
  scenario = signal<Scenario | null>(null);
  rows = signal<Schema['LeaderboardEntry']['type'][]>([] as any);
  endResult = signal<EndResult | null>(null);
  // pagination state
  pageSize = 20;
  pageIndex = signal(0);
  tokensStack: (string | null | undefined)[] = [null]; // token before each page
  nextToken: string | null | undefined = null;

  currentUserId = signal<string>('');
  private medals = signal<Medal[] | undefined>(undefined);
  verdictTitle = computed(() => {
    const result = this.endResult();
    if (!result) return null;
    if (result.hasWon) return 'Victory achieved';
    const reason = result.defeatReason;
    if (reason) return `Defeat – ${this.prettyLabel(reason)}`;
    return 'Defeat';
  });

  verdictMessage = computed(() => {
    const result = this.endResult();
    if (!result) return null;
    if (result.hasWon) {
  const profit = (result.stats ?? ({} as Record<string, number>))['profit'];
      return typeof profit === 'number'
        ? `You wrapped up with ${this.currencyFormatter.format(profit)} profit.`
        : 'You successfully completed the scenario.';
    }
    if (result.defeatReason) {
      return this.defeatReasonDescriptions[result.defeatReason] ?? 'The board ended the run.';
    }
    return 'The run ended before objectives were met.';
  });

  indicatorSummaries = computed<IndicatorSummary[]>(() => {
    const result = this.endResult();
    if (!result) return [];
    const stats = result.stats || {};
    const scenario = this.scenario();
    const indicators = scenario?.indicators || [];
    const indicatorMap = new Map<string, Indicator>(indicators.map(i => [i.nameId, i]));
    const keys = indicatorMap.size
      ? indicators.filter(i => i.displayed !== false).map(i => i.nameId)
      : Object.keys(stats);
    const summaries: IndicatorSummary[] = [];
    keys.forEach(key => {
      const value = stats[key];
      if (typeof value !== 'number') return;
      const indicator = indicatorMap.get(key);
      summaries.push({
        key,
        label: indicator?.name ?? this.prettyLabel(key),
        emoji: indicator?.emoji ?? '',
        formattedValue: this.formatIndicatorValue(indicator, value)
      });
    });
    return summaries;
  });

  private readonly defeatReasonDescriptions: Record<DefeatReason, string> = {
    dataBreach: 'Your defenses cracked and a breach forced the board to stop the program.',
    burnout: 'Critical emails were missed and the team burned out before objectives were met.',
    budget: 'Budget collapsed before you could finish the transformation.',
    dataQuality: 'Data quality slipped too low to justify continuing.',
    reputation: 'Stakeholders lost confidence after a reputation hit.'
  };

  private readonly currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  });

  private readonly numberFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0
  });

  async ngOnInit() {
    const nameId = this.route.snapshot.paramMap.get('scenarioNameId');
    if (!nameId) {
      // Try fallback from game state (if navigated from /last legacy)
      this.router.navigate(['/']);
      return;
    }
    this.scenarioNameId.set(nameId);
    this.captureEndResultFromNavigation();

    // Load scenario for title
    try {
      const res = await this.client.models.Scenario.get({ nameId });
      const rawScenario: any = res?.data;
      // Explicitly list indicators to avoid relying on relationship shape variations
      const indicatorsRes = await this.client.models.Indicator.list({ filter: { scenarioId: { eq: nameId } }, limit: 200 });
      const indicators: Indicator[] = (indicatorsRes?.data || []) as any;
      if (rawScenario) {
        const merged = { ...rawScenario, indicators };
        this.scenario.set(merged);
        this.medals.set((rawScenario?.medals as Medal[] | undefined) || undefined);
      }
    } catch {}

    // Get identity for highlight
    try {
      const ident = await this.lb.getIdentity();
      this.currentUserId.set(ident.userId);
    } catch {}

    await this.loadPage(0);
  }

  private async loadPage(page: number) {
    const token = this.tokensStack[page] ?? null;
    const pageRes = await this.lb.listTopByScenario(this.scenarioNameId(), this.pageSize, token);
    this.rows.set(pageRes.items as any);
    this.nextToken = pageRes.nextToken ?? null;
    this.pageIndex.set(page);
    // Ensure stack length
    if (this.tokensStack.length === page) {
      this.tokensStack.push(this.nextToken);
    } else {
      this.tokensStack[page + 1] = this.nextToken;
    }
  }

  canPrev = computed(() => this.pageIndex() > 0);
  canNext = computed(() => !!this.nextToken);

  async prev() {
    if (!this.canPrev()) return;
    await this.loadPage(this.pageIndex() - 1);
  }

  async next() {
    if (!this.canNext()) return;
    await this.loadPage(this.pageIndex() + 1);
  }

  // Compute medal emoji for a given profit based on this scenario's medals thresholds
  medalEmojiForProfit(profit: number | null | undefined): string {
    if (profit == null) return '';
    const medals = this.medals() || [];
    const sorted = [...medals].sort((a, b) => b.threshold - a.threshold);
    for (const m of sorted) {
      if (profit >= m.threshold) {
        switch (m.name) {
          case 'gold': return '🥇';
          case 'silver': return '🥈';
          case 'bronze': return '🥉';
        }
      }
    }
    return '';
  }

  medalTitleForProfit(profit: number | null | undefined): string | null {
    if (profit == null) return null;
    const medals = this.medals() || [];
    const sorted = [...medals].sort((a, b) => b.threshold - a.threshold);
    for (const m of sorted) {
      if (profit >= m.threshold) {
        return `${m.name.charAt(0).toUpperCase() + m.name.slice(1)} (≥ ${m.threshold.toLocaleString()})`;
      }
    }
    return null;
  }

  private captureEndResultFromNavigation(): void {
    const navState = this.router.currentNavigation()?.extras?.state as { endResult?: EndResult } | undefined;
    let payload = navState?.endResult;
    if (!payload && typeof window !== 'undefined') {
      payload = (window.history.state?.endResult ?? undefined) as EndResult | undefined;
    }
    if (payload) {
      this.endResult.set(payload);
    }
  }

  private formatIndicatorValue(indicator: Indicator | undefined, value: number): string {
    if (indicator?.type === 'dollars') {
      return this.currencyFormatter.format(value);
    }
    if (indicator?.type === 'percentage') {
      return `${Math.round(value)}%`;
    }
    return this.numberFormatter.format(value);
  }

  private prettyLabel(key: string): string {
    return key
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/_/g, ' ')
      .replace(/^\w/, (c) => c.toUpperCase());
  }

}

interface IndicatorSummary {
  key: string;
  label: string;
  emoji: string;
  formattedValue: string;
}
