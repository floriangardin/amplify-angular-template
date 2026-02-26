import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProgressSummary } from '../services/progress.service';
import { Scenario } from '../models/game-content';

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
      @if(bestProfit() !== null){
        <div class="inline-flex items-center rounded-full bg-black/20 px-4 py-1 text-sm md:text-lg font-medium text-white border border-black/20" title="Best profit achieved">
          📈 All time best Profit: &nbsp;<span class="font-bold">\${{ bestProfit() | number:'1.0-0' }}</span>
        </div>
      }
      @if(bestDataQuality() !== null){
        <div class="inline-flex items-center rounded-full bg-black/20 px-4 py-1 text-sm md:text-lg font-medium text-white border border-black/20" title="Best data quality achieved">
          📊 All time best Data Quality: &nbsp;<span class="font-bold">{{ bestDataQuality() | number:'1.0-0' }}%</span>
        </div>
      }
      @if(bestClientRelationship() !== null){
        <div class="inline-flex items-center rounded-full bg-black/20 px-4 py-1 text-sm md:text-lg font-medium text-white border border-black/20" title="Best trust achieved">
          ⭐ All time best Trust: &nbsp;<span class="font-bold">{{ bestClientRelationship() | number:'1.0-0' }}%</span>
        </div>
      }
      @for (badge of allBadges(); track badge) {
        <span class="inline-flex items-center rounded-full bg-yellow-500/20 border border-yellow-400/30 px-4 py-1 text-sm md:text-lg font-semibold text-yellow-200">
          {{ badge }}
        </span>
      }
  `,
  styles: [`
    :host { display: contents; }
  `]
})
export class ProgressComponent {
  progressSummary = input<ProgressSummary | null>(null);
  scenarios = input<Scenario[]>([]);

  // Sum of runs across all scenarios (games finished)
  totalRuns = computed(() => {
    const summary = this.progressSummary();
    if (!summary) return 0;
    const entries = Object.values(summary.byScenario || {});
    return entries.reduce((acc, p: any) => acc + (Number(p?.runs) || 0), 0);
  });

  // Best profit achieved across all scenarios (maximum value)
  bestProfit = computed(() => {
    const summary = this.progressSummary();
    if (!summary) return null;
    let best: number | null = null;
    for (const entry of Object.values(summary.byScenario || {})) {
      const score = entry?.indicatorScores?.find(s => s?.indicatorNameId === 'profit');
      if (score && typeof score.value === 'number') {
        if (best === null || score.value > best) {
          best = score.value;
        }
      }
    }
    return best;
  });

  // Best data quality achieved across all scenarios (maximum value)
  bestDataQuality = computed(() => {
    const summary = this.progressSummary();
    if (!summary) return null;
    let best: number | null = null;
    for (const entry of Object.values(summary.byScenario || {})) {
      const score = entry?.indicatorScores?.find(s => s?.indicatorNameId === 'dataQuality');
      if (score && typeof score.value === 'number') {
        if (best === null || score.value > best) {
          best = score.value;
        }
      }
    }
    return best;
  });

  // Best trust achieved across all scenarios (maximum value)
  bestClientRelationship = computed(() => {
    const summary = this.progressSummary();
    if (!summary) return null;
    let best: number | null = null;
    for (const entry of Object.values(summary.byScenario || {})) {
      const score = entry?.indicatorScores?.find(s => s?.indicatorNameId === 'clientRelationship');
      if (score && typeof score.value === 'number') {
        if (best === null || score.value > best) {
          best = score.value;
        }
      }
    }
    return best;
  });

  // Collect all unique badges across all scenarios
  allBadges = computed(() => {
    const summary = this.progressSummary();
    const scenarioList = this.scenarios();
    if (!summary || !scenarioList?.length) return [];

    const badgeSet = new Set<string>();

    for (const scenario of scenarioList) {
      const entry = summary.byScenario?.[scenario.nameId];
      if (!entry?.indicatorScores) continue;

      const indicators = scenario.indicators || [];
      for (const score of entry.indicatorScores) {
        if (!score?.indicatorNameId || typeof score.value !== 'number') continue;
        const def = indicators.find(i => i.nameId === score.indicatorNameId);
        if (!def) continue;

        if (score.indicatorNameId === 'dataQuality' && score.value >= def.max) {
          badgeSet.add('📊 Data Quality Champion');
        }
        if (score.indicatorNameId === 'clientRelationship' && score.value >= def.max) {
          badgeSet.add('⭐ Trust Master');
        }
      }
    }

    return Array.from(badgeSet);
  });
}
