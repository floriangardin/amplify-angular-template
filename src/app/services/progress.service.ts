import '../../amplify-config';
import { Injectable } from '@angular/core';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
export type UserScenarioProgress = Schema['UserScenarioProgress']['type'];
export type IndicatorScore = Schema['IndicatorScore']['type'];

export interface ProgressSummary {
  byScenario: Record<string, UserScenarioProgress>;
  totals: Record<string, number>;
}

@Injectable({ providedIn: 'root' })
export class ProgressService {
  private client = generateClient<Schema>();

  async getIdentity(): Promise<{ userId: string; username: string }> {
    const userId = localStorage.getItem('demo_guest_id') || '';
    const username = localStorage.getItem('demo_guest_name') || 'Anonymous';
    return { userId, username };
  }

  async listMyProgress(): Promise<ProgressSummary> {
    const { userId } = await this.getIdentity();
    if (!userId) return { byScenario: {}, totals: {} };

    // Query by GSI using the generated query field
    const res = await (this.client.models as any).UserScenarioProgress.listProgressByUser({ userId });
    const items: UserScenarioProgress[] = res?.data ?? [];

    const byScenario: Record<string, UserScenarioProgress> = {};
    const totals: Record<string, number> = {};

    for (const p of items) {
      if (!p?.scenarioNameId) continue;
      byScenario[p.scenarioNameId] = p;
      for (const s of (p.indicatorScores ?? [])) {
        if (!s?.indicatorNameId || typeof s.value !== 'number') continue;
        totals[s.indicatorNameId] = (totals[s.indicatorNameId] ?? 0) + s.value;
      }
    }
    return { byScenario, totals };
  }

  /** Upsert current user's progress for a scenario */
  async upsertMyScenarioProgress(params: {
    scenarioNameId: string;
    indicatorScores: IndicatorScore[];
    status?: 'in_progress' | 'completed';
    completed?: boolean;
    incrementRuns?: boolean;
  }): Promise<void> {
    const { scenarioNameId, indicatorScores } = params;
    const status = params.status ?? 'completed';
    const completed = params.completed ?? (status === 'completed');
    const { userId, username } = await this.getIdentity();
    if (!userId || !scenarioNameId) return;
    try {
      const existing = await this.client.models.UserScenarioProgress.get({ userId, scenarioNameId });
      if (existing?.data) {
        const previousIndicatorScores = existing.data.indicatorScores || [];
        // Merge indicator scores: keep the best (max) value for each indicator independently
        const mergedMap = new Map<string, number>();
        for (const s of previousIndicatorScores) {
          if (s?.indicatorNameId && typeof s.value === 'number') {
            mergedMap.set(s.indicatorNameId, s.value);
          }
        }
        for (const s of indicatorScores) {
          if (s?.indicatorNameId && typeof s.value === 'number') {
            const prev = mergedMap.get(s.indicatorNameId) ?? -Infinity;
            mergedMap.set(s.indicatorNameId, Math.max(prev, s.value));
          }
        }
        const chosenIndicators = Array.from(mergedMap.entries())
          .map(([indicatorNameId, value]) => ({ indicatorNameId, value }));
        const runs = (existing.data.runs ?? 0) + (params.incrementRuns === false ? 0 : 1);
        await this.client.models.UserScenarioProgress.update({
          userId,
          scenarioNameId,
          username,
          status: status as any,
          completed,
          runs,
          indicatorScores: chosenIndicators,
        });
      } else {
        await this.client.models.UserScenarioProgress.create({
          userId,
          username,
          scenarioNameId,
          status: status as any,
          completed,
          runs: params.incrementRuns === false ? 0 : 1,
          indicatorScores,
        });
      }
    } catch (err) {
      console.error('Failed to upsert user scenario progress', err);
    }
  }
}
