import '../../amplify-config';
import { Injectable } from '@angular/core';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { fetchAuthSession } from 'aws-amplify/auth';

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
    const { tokens } = await fetchAuthSession();
    const userId = (tokens?.idToken?.payload?.sub as string) || '';
    const preferred = (tokens?.idToken?.payload?.['preferred_username'] as string | undefined)
      || (tokens?.idToken?.payload?.['nickname'] as string | undefined)
      || ((tokens?.idToken?.payload?.['email'] as string | undefined)?.split('@')[0] ?? '');
    return { userId, username: preferred };
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
      console.log('Existing progress:', existing);
      if (existing?.data) {
        const runs = (existing.data.runs ?? 0) + (params.incrementRuns === false ? 0 : 1);
        await this.client.models.UserScenarioProgress.update({
          userId,
          scenarioNameId,
          username,
          status: status as any,
          completed,
          runs,
          indicatorScores,
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
