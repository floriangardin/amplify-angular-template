import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProgressSummary } from '../services/progress.service';

@Component({
  selector: 'app-progress',
  standalone: true,
  imports: [CommonModule],
  template: `
      <!-- Progress badges (no wrappers/titles) -->
      @if(totalRuns() > 0){
        <div class="inline-flex items-center rounded-full bg-black/20 px-4 py-1 text-sm md:text-lg font-medium text-white border border-black/20">
          🎮 Total games: &nbsp;<span class="font-bold">{{ totalRuns() | number:'1.0-0' }}</span>
        </div>
      }
      @if(totalProfit() !== null){
        <div class="inline-flex items-center rounded-full bg-black/20 px-4 py-1 text-sm md:text-lg font-medium text-white border border-black/20" title="Total profit across all games">
          📈 Total Profit: &nbsp;<span class="font-bold">\${{ totalProfit() | number:'1.0-0' }}</span>
        </div>
      }
  `,
  styles: [`
    :host { display: contents; }
  `]
})
export class ProgressComponent {
  progressSummary = input<ProgressSummary | null>(null);

  // Sum of runs across all scenarios (games finished)
  totalRuns = computed(() => {
    const summary = this.progressSummary();
    if (!summary) return 0;
    const entries = Object.values(summary.byScenario || {});
    return entries.reduce((acc, p: any) => acc + (Number(p?.runs) || 0), 0);
  });

  // Total profit aggregated across scenarios (indicator 'profit')
  totalProfit = computed(() => {
    const summary = this.progressSummary();
    const val = summary?.totals?.['profit'];
    return typeof val === 'number' ? val : null;
  });
}
