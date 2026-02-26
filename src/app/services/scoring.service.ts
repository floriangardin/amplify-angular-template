import { Injectable } from '@angular/core';

export interface ScoreInputs {
  profit: number;
  dataQuality: number;
  clientRelationship: number;
}

export interface FinalScoreInputs extends ScoreInputs {
  hasWon: boolean;
}

export interface ScoreBreakdown {
  baseScore: number;
  finishBonus: number;
  weightedScore: number;
}

@Injectable({ providedIn: 'root' })
export class ScoringService {
  /**
   * Calculate weighted score from game stats.
   * When profit >= 0: round((1/100) * profit * (100 + dataQuality + clientRelationship))
   * When profit < 0: just profit (no indicator multiplier, to avoid penalizing good indicators)
   */
  calculateWeightedScore(inputs: ScoreInputs): number {
    const { profit, dataQuality, clientRelationship } = inputs;
    if (profit < 0) {
      return Math.round(profit);
    }
    return Math.round((1 / 100) * profit * (100 + dataQuality + clientRelationship));
  }

  /**
   * Calculate final weighted score with finish bonus.
   * If the player won, adds the profit as a bonus (clamped to 0 if negative).
   */
  calculateFinalScore(inputs: FinalScoreInputs): number {
    return this.calculateFinalScoreBreakdown(inputs).weightedScore;
  }

  /**
   * Calculate final score with full breakdown for display.
   * Returns baseScore, finishBonus, and total weightedScore.
   * Finish bonus is clamped to 0 when profit is negative.
   */
  calculateFinalScoreBreakdown(inputs: FinalScoreInputs): ScoreBreakdown {
    const { profit, hasWon } = inputs;
    const baseScore = this.calculateWeightedScore(inputs);
    const finishBonus = hasWon ? Math.max(0, profit) : 0;
    const weightedScore = Math.round(baseScore + finishBonus);
    return { baseScore, finishBonus, weightedScore };
  }

  /**
   * Format score with Pts & K Pts suffix for display.
   */
  formatScore(score: number): string {
    if (Math.abs(score) >= 1_000_000) {
      return (score / 1_000_000).toFixed(1) + 'K Pts';
    }
    if (Math.abs(score) >= 1_000) {
      return (score / 1_000).toFixed(0) + ' Pts';
    }
    return score.toFixed(0) + ' Pts';
  }
}