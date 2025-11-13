import { Component, input, output, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../services/game-state.service';
import { GameStatsService } from '../services/game-stats.service';
import { StatDisplayComponent } from '../../../../ui/elements/stat-display.component';
import { ProgressStatComponent } from '../../../../ui/elements/progress-stat.component';
import { SoundToggleComponent } from '../../../../ui/elements/sound-toggle.component';
import { EditableTextComponent } from '../../../../ui/fields/editable-text.component';
import { formatCurrency } from '../utils/game-formatters';

@Component({
  selector: 'app-game-stats-header',
  standalone: true,
  imports: [CommonModule, StatDisplayComponent, ProgressStatComponent, SoundToggleComponent, EditableTextComponent],
  template: `

    <div class="relative bg-gray-100 border border-gray-300 text-black text-center p-1 hidden md:flex flex-row  items-center justify-center">
      
        <app-editable-text 
        [text]="scenarioTitle()"
        [isEditable]="isEditable()"
        [contentClass]="'text-xs lg:text-sm'"
        [isMarkdown]="true"
        (newText)="{}"
      ></app-editable-text>

      <app-sound-toggle
        class="hidden md:block absolute right-2"
        [isMuted]="isMusicMuted()"
        (toggle)="soundToggled.emit()"
      />

    </div>

    <div class="flex justify-start items-center px-2 py-2 md:p-4 lg:p-4 bg-gray-100 border-b border-gray-300 flex-wrap gap-2 md:gap-4 shrink-0">

      
        
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
  
  isEditable = input<boolean>(false);
  soundToggled = output<void>();

  displayedIndicators = computed(() => {
    const defs = this.gameState.content()?.indicators || [];

    return defs
      .filter(def => def.displayed)
      .map(def => ({ key: def.nameId, ...def }));
  });

  scenarioTitle = computed(() => this.gameState.content().card.title);
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
