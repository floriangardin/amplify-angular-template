import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../components/header.component';
import { ClientService } from '../../services/client.service';
import { LeaderboardService } from '../../services/leaderboard.service';
import { Scenario, Medal } from '../../models/game-content';
import { EditableTextComponent } from '../../ui/fields/editable-text.component';
import type { Schema } from '../../../../amplify/data/resource';

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
    <div class="my-8 text-white w-xl">
      <h1 class="text-2xl font-bold mb-2">Leaderboard</h1>
      @if (scenario()) {
        <app-editable-text
          class="text-sm text-gray-300 pb-32"
          [text]=" 'Scenario: ' + scenario()!.card.title "
          [isEditable]="false"
        ></app-editable-text>
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
            <tr *ngIf="rows().length === 0">
              <td class="px-4 py-6 text-center text-gray-500" colspan="4">No scores yet. Be the first!</td>
            </tr>
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
  private router = inject(Router);
  private client = inject(ClientService).client;
  private lb = inject(LeaderboardService);

  scenarioNameId = signal<string>('');
  scenario = signal<Scenario | null>(null);
  rows = signal<Schema['LeaderboardEntry']['type'][]>([] as any);
  // pagination state
  pageSize = 20;
  pageIndex = signal(0);
  tokensStack: (string | null | undefined)[] = [null]; // token before each page
  nextToken: string | null | undefined = null;

  currentUserId = signal<string>('');
  private medals = signal<Medal[] | undefined>(undefined);

  async ngOnInit() {
    const nameId = this.route.snapshot.paramMap.get('scenarioNameId');
    if (!nameId) {
      // Try fallback from game state (if navigated from /last legacy)
      this.router.navigate(['/']);
      return;
    }
    this.scenarioNameId.set(nameId);

    // Load scenario for title
    try {
      const res = await this.client.models.Scenario.get({ nameId });
      this.scenario.set(res?.data as any);
      this.medals.set((res?.data as any)?.medals as Medal[] | undefined);
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
}
