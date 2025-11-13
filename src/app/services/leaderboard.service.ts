import '../../amplify-config';
import { Injectable, signal } from '@angular/core';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { fetchAuthSession } from 'aws-amplify/auth';

export interface LeaderboardPage {
  items: Array<Schema['LeaderboardEntry']['type']>;
  nextToken?: string | null;
}

@Injectable({ providedIn: 'root' })
export class LeaderboardService {
  private client = generateClient<Schema>();

  // Cached last saved score for UI highlight
  public lastSaved = signal<{ scenarioNameId: string; userId: string } | null>(null);

  async getIdentity(): Promise<{ userId: string; username: string }> {
    const { tokens } = await fetchAuthSession();
    const userId = (tokens?.idToken?.payload?.sub as string) || '';
    const preferred = (tokens?.idToken?.payload?.['preferred_username'] as string | undefined)
      || (tokens?.idToken?.payload?.['nickname'] as string | undefined)
      || ((tokens?.idToken?.payload?.['email'] as string | undefined)?.split('@')[0] ?? '');
    return { userId, username: preferred };
  }

  /**
   * Save best score for current user for a scenario.
   * - Creates entry if none
   * - Updates only if profit improved OR username changed
   */
  async saveMyBestScore(scenarioNameId: string, profit: number): Promise<void> {
    const { userId, username } = await this.getIdentity();
    if (!userId) return;

    try {
      const existing = await this.client.models.LeaderboardEntry.get({ userId, scenarioNameId });
      if (existing?.data) {
        const current = existing.data;
        const bestProfit = Math.max(current.profit, profit);
        const needsUpdate = (bestProfit !== current.profit) || (current.username !== username);
        if (needsUpdate) {
          await this.client.models.LeaderboardEntry.update({
            userId,
            scenarioNameId,
            profit: bestProfit,
            username,
          });
        }
      } else {
        await this.client.models.LeaderboardEntry.create({ userId, username, scenarioNameId, profit });
      }
      this.lastSaved.set({ scenarioNameId, userId });
    } catch (err) {
      console.error('Failed to save leaderboard score', err);
    }
  }

  /**
   * List leaderboard entries for a scenario, using the secondary index on (scenarioId, profit)
   * We request in descending order (if supported); if not, we reverse client-side.
   */
  async listTopByScenario(
    scenarioNameId: string,
    limit = 20,
    nextToken?: string | null
  ): Promise<LeaderboardPage> {
    // Try query with sort direction if available
    try {
      // @ts-ignore - some client versions support sortDirection
      const res = await this.client.models.LeaderboardEntry.listLeaderboardByScenario({
        scenarioNameId,
        limit,
        sortDirection: 'DESC',
        nextToken: nextToken || undefined,
      } as any);
      const items = res?.data ?? [];
      // If API ignored sortDirection, reverse client-side to ensure top first
      const normalized = items.length > 1 && items[0].profit < items[items.length - 1].profit
        ? [...items].reverse()
        : items;
      return { items: normalized, nextToken: (res as any)?.nextToken ?? undefined };
    } catch (e) {
      // Fallback without sortDirection
      const res = await this.client.models.LeaderboardEntry.listLeaderboardByScenario({
        scenarioNameId,
        limit,
        nextToken: nextToken || undefined,
      } as any);
      const items = res?.data ?? [];
      const normalized = [...items].sort((a, b) => b.profit - a.profit);
      return { items: normalized, nextToken: (res as any)?.nextToken ?? undefined };
    }
  }
}
