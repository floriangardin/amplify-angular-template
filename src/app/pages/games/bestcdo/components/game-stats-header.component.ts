import { Component, input, output, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../services/game-state.service';
import { GameStatsService } from '../services/game-stats.service';
import { StatDisplayComponent } from '../../../../ui/elements/stat-display.component';
import { ProgressStatComponent } from '../../../../ui/elements/progress-stat.component';
import { SoundToggleComponent } from '../../../../ui/elements/sound-toggle.component';
import { formatCurrency } from '../utils/game-formatters';
import { Email } from '../../../../models/email';

export interface DynamicMessage {
  text: string;
  color: 'red'| 'orange' | 'green';
}

@Component({
  selector: 'app-game-stats-header',
  standalone: true,
  imports: [CommonModule, StatDisplayComponent, ProgressStatComponent, SoundToggleComponent],
  template: `

    <div class="relative border text-white text-center p-1 hidden md:flex flex-row items-center justify-center transition-colors duration-300"
         [ngClass]="dynamicMessage().color === 'orange' ? 'bg-zinc-400 border-zinc-400' : dynamicMessage().color === 'green' ? 'bg-emerald-600 border-emerald-600' : 'bg-orange-500 border-red-500'">

        <span class="text-xs lg:text-sm font-medium" [innerHTML]="dynamicMessage().text"></span>


    </div>

    <div class="flex justify-start items-center px-2 py-1 md:px-4 md:py-2 bg-gray-100 border-b border-gray-300 flex-wrap gap-2 md:gap-3 shrink-0">

      
        
    @for (ind of displayedIndicators(); track ind.key) {
        @if (ind.type === 'percentage' || ind.type === 'points') {
          <app-progress-stat
             class="border-r-1 border-gray-300 pr-4 last:border-r-0 last:flex-1"
            [icon]="ind.emoji || '📊'"
            [label]="ind.name"
            [value]="valueAsPercent(ind.key)"
            [color]="ind.color || 'primary'"
          />
    } @else {
          <app-stat-display
          class="border-r-1 border-gray-300 pr-4 last:border-r-0 last:flex-1"
            [icon]="ind.emoji || '📈'"
            [label]="ind.name"
            [value]="statsService.value(ind.key)"
            [formatter]="ind.type === 'dollars' ? currencyFormatter : numberFormatter"
          />
        }
      }

            <!-- Chrono -->
      <app-stat-display
        class="border-r-1 border-gray-300 pr-4"
        [icon]="'⏱️'"
        [label]="'Time'"
        [doBump]="false"
        [value]="timeLeftSeconds()"
        [formatter]="timeFormatter"
      />

    </div>
  `
})
export class GameStatsHeaderComponent {
  private gameState = inject(GameStateService);
  protected statsService = inject(GameStatsService);
  isMusicMuted = input.required<boolean>();
  timeLeftSeconds = input.required<number>();
  lastEmail = input<Email | null>(null);

  isEditable = input<boolean>(false);
  soundToggled = output<void>();

  displayedIndicators = computed(() => {
    const defs = this.gameState.content()?.indicators || [];

    return defs
      .filter(def => def.displayed)
      .map(def => ({ key: def.nameId, ...def }))
      .sort((a, b) => (a.priority || 0) - (b.priority || 0));
  });

  scenarioTitle = computed(() => this.gameState.content().card.title);

  dynamicMessage = computed<DynamicMessage>(() => {
    const budget = this.statsService.value('cdoBudget');
    const dataQuality = this.statsService.value('dataQuality');
    const clientRelationship = this.statsService.value('clientRelationship');
    const defs = this.gameState.content()?.indicators || [];
    const dqDef = defs.find(d => d.nameId === 'dataQuality');
    const dqMax = dqDef?.max ?? 100;
    const crDef = defs.find(d => d.nameId === 'clientRelationship');
    const crMax = crDef?.max ?? 100;
    const email = this.lastEmail();

    // Priority 1: Last email is urgent AND has maxDataQuality below current data quality
    // (meaning it was triggered because data quality dropped below the threshold)
    if (email?.isUrgent && email.maxDataQuality !== undefined && email.maxDataQuality !== null && dataQuality < email.maxDataQuality) {
      return { text: '⚠️ You received an urgent email because your data quality is too low', color: 'red' };
    }

    // Priority 2: Last email was a budget email (triggered by high trust)
    if (email?.category === 'budget') {
      return { text: '💰 You received budget because your trust is high', color: 'green' };
    }

    // Priority 3: Default messages based on lowest metric
    // Normalize all to percentage: dq and cr are already 0-max, budget uses 100*budget/1e6
    const dqPct = dqMax > 0 ? (dataQuality / dqMax) * 100 : 100;
    const crPct = crMax > 0 ? (clientRelationship / crMax) * 100 : 100;
    const budgetPct = (100 * budget) / 1_000_000;

    // Check thresholds: only show message if metric is below threshold
    const candidates: { key: string; pct: number; msg: DynamicMessage }[] = [];
    if (crPct < 80) {
      candidates.push({ key: 'cr', pct: crPct, msg: { text: '⭐ Improve your trust to get more budget', color: 'orange' } });
    }
    if (dqPct < 50) {
      candidates.push({ key: 'dq', pct: dqPct, msg: { text: '📊 Data quality is critically low — incoming emails may reflect data issues', color: 'orange' } });
    }
    if (budgetPct < 20) { // 200k / 1e6 = 20%
      candidates.push({ key: 'budget', pct: budgetPct, msg: { text: '💰 Budget is very low, consider improving trust', color: 'orange' } });
    }

    if (candidates.length > 0) {
      // Show message for the lowest metric
      candidates.sort((a, b) => a.pct - b.pct);
      return candidates[0].msg;
    }

    // All metrics healthy
    return { text: '✅ You are doing well!', color: 'green' };
  });

  valueAsPercent = (key: string): number => {
    const defs = this.gameState.content()?.indicators || [];
    const def = defs.find(d => d.nameId === key);
    if (!def) return 0;
    const value = this.statsService.value(key);
    const min = def.min ?? 0;
    const max = def.max ?? 100;
    if (max === min) return 0;
    const pct = ((value - min) / (max - min)) * 100;
    return Math.max(0, Math.min(100, Math.round(pct)));
  }
  currencyFormatter = (v: number) => formatCurrency(v);
  numberFormatter = (v: number) => String(v);
  timeFormatter = (secs: number) => {
    const s = Math.max(0, Math.floor(secs));
    const m = Math.floor(s / 60);
    const rs = s % 60;
    return `${m}:${rs.toString().padStart(2, '0')}`;
  }
}
