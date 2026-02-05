import { Injectable } from '@angular/core';

export interface ScoreInputs {
  profit: number;
  dataQuality: number;
  clientRelationship: number;
}

export interface FinalScoreInputs extends ScoreInputs {
  hasWon: boolean;
}

@Injectable({ providedIn: 'root' })
export class ScoringService {
  /**
   * Calculate weighted score from game stats.
   * Formula: floor((1/100) * profit * (100 + dataQuality + clientRelationship))
   */
  calculateWeightedScore(inputs: ScoreInputs): number {
    const { profit, dataQuality, clientRelationship } = inputs;
    return Math.round((1 / 100) * profit * (100 + dataQuality + clientRelationship));
  }

  /**
   * Calculate final weighted score with finish bonus.
   * If the player won, adds the profit as a bonus.
   * Formula: floor((1/100) * profit * (100 + dataQuality + clientRelationship) + finishBonus)
   */
  calculateFinalScore(inputs: FinalScoreInputs): number {
    const { profit, hasWon } = inputs;
    const baseScore = this.calculateWeightedScore(inputs);
    const finishBonus = hasWon ? profit : 0;
    return Math.round(baseScore + finishBonus);
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